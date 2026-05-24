"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const events_gateway_1 = require("../../gateways/events.gateway");
const client_1 = require("@prisma/client");
const decimal_js_1 = __importDefault(require("decimal.js"));
let OrdersService = class OrdersService {
    prisma;
    eventsGateway;
    constructor(prisma, eventsGateway) {
        this.prisma = prisma;
        this.eventsGateway = eventsGateway;
    }
    async validateCoupon(code, userId, subtotalAmount = 0) {
        const coupon = await this.prisma.coupon.findUnique({
            where: { code: code.toUpperCase().trim() }
        });
        if (!coupon) {
            throw new common_1.NotFoundException('Coupon not found');
        }
        if (!coupon.isActive) {
            throw new common_1.BadRequestException('Coupon is inactive');
        }
        const now = new Date();
        if (now < coupon.validFrom) {
            throw new common_1.BadRequestException('Coupon is not active yet');
        }
        if (coupon.validUntil && now > coupon.validUntil) {
            throw new common_1.BadRequestException('Coupon has expired');
        }
        if (coupon.maxUsages && coupon.usageCount >= coupon.maxUsages) {
            throw new common_1.BadRequestException('Coupon maximum usage reached');
        }
        if (coupon.minOrderAmount && new decimal_js_1.default(subtotalAmount).lt(coupon.minOrderAmount)) {
            throw new common_1.BadRequestException(`Minimum order amount of EGP ${coupon.minOrderAmount} required`);
        }
        if (userId) {
            const userUsage = await this.prisma.order.count({
                where: {
                    userId,
                    couponId: coupon.id,
                    paymentStatus: { in: [client_1.PaymentStatus.PAID, client_1.PaymentStatus.PENDING] }
                }
            });
            if (userUsage >= coupon.perUserLimit) {
                throw new common_1.BadRequestException('You have reached the usage limit for this coupon');
            }
        }
        return coupon;
    }
    async placeOrder(dto, userId) {
        const items = dto.items;
        if (!items || items.length === 0) {
            throw new common_1.BadRequestException('Order must contain at least one item');
        }
        let subtotal = new decimal_js_1.default(0);
        const orderItemsData = [];
        for (const item of items) {
            const menuItem = await this.prisma.menuItem.findUnique({
                where: { id: item.menuItemId },
                include: {
                    modifierGroups: {
                        include: { options: true }
                    }
                }
            });
            if (!menuItem || !menuItem.isAvailable || menuItem.deletedAt) {
                throw new common_1.BadRequestException(`Item ${item.itemNameEn || 'unknown'} is unavailable`);
            }
            let itemPrice = new decimal_js_1.default(menuItem.basePrice);
            const modifierSnapshot = [];
            if (item.modifiers && item.modifiers.length > 0) {
                for (const selectedMod of item.modifiers) {
                    let foundOption = null;
                    let foundGroup = null;
                    for (const group of menuItem.modifierGroups) {
                        const opt = group.options.find(o => o.id === selectedMod.optionId);
                        if (opt) {
                            foundOption = opt;
                            foundGroup = group;
                            break;
                        }
                    }
                    if (!foundOption || !foundGroup) {
                        throw new common_1.BadRequestException(`Invalid modifier option: ${selectedMod.optionId}`);
                    }
                    itemPrice = itemPrice.plus(foundOption.additionalPrice);
                    modifierSnapshot.push({
                        optionId: foundOption.id,
                        optionNameEn: foundOption.nameEn,
                        optionNameAr: foundOption.nameAr,
                        groupNameEn: foundGroup.nameEn,
                        groupNameAr: foundGroup.nameAr,
                        additionalPrice: foundOption.additionalPrice.toNumber(),
                    });
                }
            }
            const quantity = item.quantity || 1;
            const lineTotal = itemPrice.times(quantity);
            subtotal = subtotal.plus(lineTotal);
            orderItemsData.push({
                menuItemId: menuItem.id,
                itemNameEn: menuItem.nameEn,
                itemNameAr: menuItem.nameAr,
                unitPrice: itemPrice.toNumber(),
                quantity,
                modifierSnapshot,
                itemNotes: item.notes || null,
                lineTotal: lineTotal.toNumber(),
            });
        }
        let discountAmount = new decimal_js_1.default(0);
        let couponId = null;
        if (dto.couponCode) {
            try {
                const coupon = await this.validateCoupon(dto.couponCode, userId, subtotal.toNumber());
                couponId = coupon.id;
                if (coupon.type === 'PERCENTAGE') {
                    discountAmount = subtotal.times(new decimal_js_1.default(coupon.value).div(100));
                }
                else if (coupon.type === 'FIXED_AMOUNT') {
                    discountAmount = new decimal_js_1.default(coupon.value);
                }
                else if (coupon.type === 'FREE_DELIVERY') {
                }
                if (discountAmount.gt(subtotal)) {
                    discountAmount = subtotal;
                }
            }
            catch (err) {
                throw new common_1.BadRequestException(err.message);
            }
        }
        const fulfillmentType = dto.fulfillmentType || 'DELIVERY';
        let deliveryFee = new decimal_js_1.default(fulfillmentType === 'DELIVERY' ? 15 : 0);
        if (dto.couponCode) {
            const coupon = await this.prisma.coupon.findUnique({ where: { code: dto.couponCode.toUpperCase() } });
            if (coupon && coupon.type === 'FREE_DELIVERY') {
                deliveryFee = new decimal_js_1.default(0);
            }
        }
        const serviceFee = new decimal_js_1.default(5);
        const taxRate = new decimal_js_1.default(0.14);
        const taxableAmount = subtotal.plus(serviceFee).minus(discountAmount);
        const taxAmount = taxableAmount.gt(0) ? taxableAmount.times(taxRate) : new decimal_js_1.default(0);
        const totalAmount = subtotal
            .plus(deliveryFee)
            .plus(serviceFee)
            .plus(taxAmount)
            .minus(discountAmount);
        let deliveryAddress = null;
        let addressId = null;
        if (fulfillmentType === 'DELIVERY') {
            if (dto.addressId) {
                const addr = await this.prisma.address.findUnique({ where: { id: dto.addressId } });
                if (addr) {
                    addressId = addr.id;
                    deliveryAddress = {
                        label: addr.label,
                        fullAddress: addr.fullAddress,
                        landmark: addr.landmark,
                        latitude: addr.latitude.toString(),
                        longitude: addr.longitude.toString(),
                    };
                }
            }
            else if (dto.guestAddress) {
                deliveryAddress = dto.guestAddress;
            }
            else {
                throw new common_1.BadRequestException('Delivery address is required for delivery order');
            }
        }
        const paymentMethod = dto.paymentMethod || 'CASH_ON_DELIVERY';
        const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
        const order = await this.prisma.order.create({
            data: {
                orderNumber,
                userId: userId || null,
                guestName: userId ? null : dto.guestName || 'Guest User',
                guestPhone: userId ? null : dto.guestPhone || '',
                guestEmail: userId ? null : dto.guestEmail || '',
                addressId,
                deliveryAddress: deliveryAddress ? deliveryAddress : client_1.Prisma.DbNull,
                fulfillmentType,
                scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
                tableNumber: dto.tableNumber || null,
                notes: dto.notes || null,
                subtotal: subtotal.toNumber(),
                deliveryFee: deliveryFee.toNumber(),
                taxAmount: taxAmount.toDecimalPlaces(2).toNumber(),
                serviceFee: serviceFee.toNumber(),
                discountAmount: discountAmount.toDecimalPlaces(2).toNumber(),
                totalAmount: totalAmount.toDecimalPlaces(2).toNumber(),
                paymentMethod,
                paymentStatus: paymentMethod === 'CASH_ON_DELIVERY' || paymentMethod === 'CASH_AT_PICKUP' ? 'PENDING' : 'PENDING',
                couponId,
                items: {
                    create: orderItemsData,
                },
                statusHistory: {
                    create: {
                        fromStatus: null,
                        toStatus: 'PLACED',
                        note: 'Order placed successfully',
                    }
                }
            },
            include: {
                items: true,
                statusHistory: true,
            }
        });
        if (couponId) {
            await this.prisma.coupon.update({
                where: { id: couponId },
                data: { usageCount: { increment: 1 } }
            });
        }
        this.eventsGateway.emitNewOrder({
            orderId: order.id,
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
            fulfillmentType: order.fulfillmentType,
            createdAt: order.createdAt,
        });
        return order;
    }
    async getOrderHistory(userId) {
        return this.prisma.order.findMany({
            where: { userId },
            include: {
                items: true,
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    async getOrderDetail(orderId, userId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: true,
                statusHistory: { orderBy: { createdAt: 'asc' } },
                payment: true,
                rider: {
                    include: {
                        user: {
                            select: { name: true, phone: true }
                        }
                    }
                }
            }
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (userId && order.userId !== userId && order.userId !== null) {
            throw new common_1.ForbiddenException('You do not have permission to view this order');
        }
        return order;
    }
    async updateOrderStatus(orderId, toStatus, changedById, note) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { statusHistory: true }
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        const currentStatus = order.status;
        const validTransitions = {
            PLACED: [client_1.OrderStatus.CONFIRMED, client_1.OrderStatus.CANCELLED],
            CONFIRMED: [client_1.OrderStatus.PREPARING, client_1.OrderStatus.CANCELLED],
            PREPARING: [client_1.OrderStatus.READY, client_1.OrderStatus.CANCELLED],
            READY: [client_1.OrderStatus.OUT_FOR_DELIVERY, client_1.OrderStatus.DELIVERED, client_1.OrderStatus.CANCELLED],
            OUT_FOR_DELIVERY: [client_1.OrderStatus.DELIVERED, client_1.OrderStatus.CANCELLED],
            DELIVERED: [],
            CANCELLED: [],
        };
        if (!validTransitions[currentStatus].includes(toStatus)) {
            throw new common_1.BadRequestException(`Invalid status transition from ${currentStatus} to ${toStatus}`);
        }
        const updatedOrder = await this.prisma.order.update({
            where: { id: orderId },
            data: {
                status: toStatus,
                deliveredAt: toStatus === client_1.OrderStatus.DELIVERED ? new Date() : undefined,
                cancelledAt: toStatus === client_1.OrderStatus.CANCELLED ? new Date() : undefined,
                statusHistory: {
                    create: {
                        fromStatus: currentStatus,
                        toStatus,
                        changedById,
                        note: note || `Status updated from ${currentStatus} to ${toStatus}`,
                    }
                }
            },
            include: {
                items: true,
                statusHistory: true,
            }
        });
        this.eventsGateway.emitOrderStatusUpdate(orderId, {
            orderId,
            orderNumber: updatedOrder.orderNumber,
            oldStatus: currentStatus,
            newStatus: toStatus,
            note,
        });
        return updatedOrder;
    }
    async cancelOrder(orderId, userId, reason) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId }
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (userId && order.userId !== userId) {
            throw new common_1.ForbiddenException('Unauthorized to cancel this order');
        }
        if (order.status !== 'PLACED' && order.status !== 'CONFIRMED') {
            throw new common_1.BadRequestException(`Cannot cancel order in status: ${order.status}`);
        }
        return this.updateOrderStatus(orderId, client_1.OrderStatus.CANCELLED, userId, reason || 'Cancelled by user');
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        events_gateway_1.EventsGateway])
], OrdersService);
//# sourceMappingURL=orders.service.js.map