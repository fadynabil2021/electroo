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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const menu_service_1 = require("../menu/menu.service");
const orders_service_1 = require("../orders/orders.service");
const client_1 = require("@prisma/client");
let AdminService = class AdminService {
    prisma;
    menuService;
    ordersService;
    constructor(prisma, menuService, ordersService) {
        this.prisma = prisma;
        this.menuService = menuService;
        this.ordersService = ordersService;
    }
    async getAdminOrders(status) {
        return this.prisma.order.findMany({
            where: status ? { status } : undefined,
            include: {
                items: true,
                user: { select: { name: true, phone: true } },
                rider: { include: { user: { select: { name: true } } } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async updateOrderStatus(orderId, toStatus, adminId, note) {
        return this.ordersService.updateOrderStatus(orderId, toStatus, adminId, note);
    }
    async assignRider(orderId, riderId, adminId) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        const rider = await this.prisma.riderProfile.findUnique({
            where: { id: riderId },
            include: { user: true }
        });
        if (!rider) {
            throw new common_1.NotFoundException('Rider profile not found');
        }
        return this.prisma.order.update({
            where: { id: orderId },
            data: {
                riderId,
                status: client_1.OrderStatus.CONFIRMED,
                statusHistory: {
                    create: {
                        fromStatus: order.status,
                        toStatus: client_1.OrderStatus.CONFIRMED,
                        changedById: adminId,
                        note: `Rider ${rider.user.name} assigned to order.`,
                    }
                }
            },
            include: { items: true, statusHistory: true }
        });
    }
    async createCategory(dto) {
        const category = await this.prisma.category.create({
            data: {
                nameEn: dto.nameEn,
                nameAr: dto.nameAr,
                slug: dto.slug.toLowerCase().trim(),
                description: dto.description || null,
                imageUrl: dto.imageUrl || null,
                displayOrder: dto.displayOrder || 0,
                parentId: dto.parentId || null,
            }
        });
        await this.menuService.invalidateMenuCache();
        return category;
    }
    async updateCategory(id, dto) {
        const category = await this.prisma.category.update({ where: { id }, data: dto });
        await this.menuService.invalidateMenuCache();
        return category;
    }
    async deleteCategory(id) {
        await this.prisma.category.delete({ where: { id } });
        await this.menuService.invalidateMenuCache();
        return { success: true };
    }
    async createMenuItem(dto) {
        const item = await this.prisma.menuItem.create({
            data: {
                categoryId: dto.categoryId,
                nameEn: dto.nameEn,
                nameAr: dto.nameAr,
                slug: dto.slug.toLowerCase().trim(),
                descriptionEn: dto.descriptionEn || null,
                descriptionAr: dto.descriptionAr || null,
                basePrice: Number(dto.basePrice),
                imageUrl: dto.imageUrl || null,
                isAvailable: dto.isAvailable !== undefined ? dto.isAvailable : true,
                isFeatured: dto.isFeatured || false,
                displayOrder: dto.displayOrder || 0,
                calories: dto.calories || null,
                allergens: dto.allergens || [],
            }
        });
        await this.menuService.invalidateMenuCache();
        return item;
    }
    async updateMenuItem(id, dto) {
        if (dto.basePrice)
            dto.basePrice = Number(dto.basePrice);
        const item = await this.prisma.menuItem.update({ where: { id }, data: dto });
        await this.menuService.invalidateMenuCache();
        return item;
    }
    async deleteMenuItem(id) {
        await this.prisma.menuItem.update({
            where: { id },
            data: { deletedAt: new Date(), isAvailable: false }
        });
        await this.menuService.invalidateMenuCache();
        return { success: true };
    }
    async getCoupons() {
        return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    }
    async createCoupon(dto) {
        return this.prisma.coupon.create({
            data: {
                code: dto.code.toUpperCase().trim(),
                type: dto.type,
                value: Number(dto.value),
                minOrderAmount: dto.minOrderAmount ? Number(dto.minOrderAmount) : null,
                maxUsages: dto.maxUsages || null,
                perUserLimit: dto.perUserLimit || 1,
                validFrom: new Date(dto.validFrom),
                validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
                isActive: dto.isActive !== undefined ? dto.isActive : true,
            }
        });
    }
    async updateCoupon(id, dto) {
        if (dto.value)
            dto.value = Number(dto.value);
        if (dto.minOrderAmount)
            dto.minOrderAmount = Number(dto.minOrderAmount);
        if (dto.validFrom)
            dto.validFrom = new Date(dto.validFrom);
        if (dto.validUntil)
            dto.validUntil = new Date(dto.validUntil);
        return this.prisma.coupon.update({ where: { id }, data: dto });
    }
    async deleteCoupon(id) {
        await this.prisma.coupon.delete({ where: { id } });
        return { success: true };
    }
    async getUsers() {
        return this.prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                isActive: true,
                authProvider: true,
                createdAt: true,
            }
        });
    }
    async updateUserStatus(id, isActive) {
        return this.prisma.user.update({
            where: { id },
            data: { isActive },
            select: { id: true, name: true, isActive: true }
        });
    }
    async getRiders() {
        return this.prisma.riderProfile.findMany({
            include: {
                user: { select: { name: true, phone: true, isActive: true } }
            }
        });
    }
    async getAnalyticsSummary() {
        const orders = await this.prisma.order.findMany({
            where: {
                status: { in: [client_1.OrderStatus.DELIVERED, client_1.OrderStatus.CONFIRMED, client_1.OrderStatus.PREPARING, client_1.OrderStatus.READY, client_1.OrderStatus.OUT_FOR_DELIVERY] },
            }
        });
        const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
        const totalOrders = orders.length;
        const averageOrderValue = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;
        const orderItems = await this.prisma.orderItem.findMany({
            select: { itemNameEn: true, quantity: true, lineTotal: true }
        });
        const itemSales = {};
        orderItems.forEach(it => {
            if (!itemSales[it.itemNameEn]) {
                itemSales[it.itemNameEn] = { quantity: 0, revenue: 0 };
            }
            itemSales[it.itemNameEn].quantity += it.quantity;
            itemSales[it.itemNameEn].revenue += Number(it.lineTotal);
        });
        const topItems = Object.entries(itemSales)
            .map(([name, data]) => ({ name, quantity: data.quantity, revenue: Math.round(data.revenue * 100) / 100 }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
        const chartData = [];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const startOfDay = new Date(d.setHours(0, 0, 0, 0));
            const endOfDay = new Date(d.setHours(23, 59, 59, 999));
            const dailyOrders = await this.prisma.order.findMany({
                where: {
                    createdAt: { gte: startOfDay, lte: endOfDay },
                    status: { in: [client_1.OrderStatus.DELIVERED, client_1.OrderStatus.CONFIRMED, client_1.OrderStatus.PREPARING, client_1.OrderStatus.READY, client_1.OrderStatus.OUT_FOR_DELIVERY] }
                }
            });
            const revenue = dailyOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
            chartData.push({
                date: startOfDay.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
                revenue: Math.round(revenue * 100) / 100,
                orders: dailyOrders.length
            });
        }
        return { totalRevenue, totalOrders, averageOrderValue, topItems, chartData };
    }
    async exportReportsCsv() {
        const orders = await this.prisma.order.findMany({
            include: { user: { select: { email: true } } },
            orderBy: { createdAt: 'desc' }
        });
        let csv = 'Order Number,Customer,Date,Fulfillment,Method,Status,Payment,Total Amount (EGP)\n';
        orders.forEach(o => {
            const customer = o.userId ? o.user?.email : o.guestPhone || 'Guest';
            const date = o.createdAt.toISOString().split('T')[0];
            csv += `${o.orderNumber},${customer},${date},${o.fulfillmentType},${o.paymentMethod},${o.status},${o.paymentStatus},${o.totalAmount}\n`;
        });
        return csv;
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        menu_service_1.MenuService,
        orders_service_1.OrdersService])
], AdminService);
//# sourceMappingURL=admin.service.js.map