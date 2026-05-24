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
exports.RidersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const orders_service_1 = require("../orders/orders.service");
const client_1 = require("@prisma/client");
let RidersService = class RidersService {
    prisma;
    ordersService;
    constructor(prisma, ordersService) {
        this.prisma = prisma;
        this.ordersService = ordersService;
    }
    async getRiderProfile(userId) {
        const profile = await this.prisma.riderProfile.findUnique({
            where: { userId },
            include: {
                user: { select: { name: true, phone: true } }
            }
        });
        if (!profile) {
            throw new common_1.NotFoundException('Rider profile not found');
        }
        return profile;
    }
    async toggleOnlineStatus(userId, isOnline) {
        const profile = await this.getRiderProfile(userId);
        return this.prisma.riderProfile.update({
            where: { id: profile.id },
            data: { isOnline, lastSeenAt: new Date() }
        });
    }
    async updateLocation(userId, latitude, longitude) {
        const profile = await this.getRiderProfile(userId);
        return this.prisma.riderProfile.update({
            where: { id: profile.id },
            data: {
                lastLatitude: latitude,
                lastLongitude: longitude,
                lastSeenAt: new Date()
            }
        });
    }
    async getAssignedOrders(userId) {
        const profile = await this.getRiderProfile(userId);
        return this.prisma.order.findMany({
            where: {
                riderId: profile.id,
                status: {
                    in: [
                        client_1.OrderStatus.CONFIRMED,
                        client_1.OrderStatus.PREPARING,
                        client_1.OrderStatus.READY,
                        client_1.OrderStatus.OUT_FOR_DELIVERY
                    ]
                }
            },
            include: {
                items: true,
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    async updateOrderStatus(userId, orderId, status, note) {
        const profile = await this.getRiderProfile(userId);
        const order = await this.prisma.order.findUnique({
            where: { id: orderId }
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (order.riderId !== profile.id) {
            throw new common_1.BadRequestException('Order is not assigned to you');
        }
        return this.ordersService.updateOrderStatus(orderId, status, userId, note || `Status updated by rider`);
    }
};
exports.RidersService = RidersService;
exports.RidersService = RidersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        orders_service_1.OrdersService])
], RidersService);
//# sourceMappingURL=riders.service.js.map