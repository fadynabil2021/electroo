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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var EventsGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const common_1 = require("@nestjs/common");
let EventsGateway = EventsGateway_1 = class EventsGateway {
    jwtService;
    server;
    logger = new common_1.Logger(EventsGateway_1.name);
    constructor(jwtService) {
        this.jwtService = jwtService;
    }
    async handleConnection(client) {
        const token = client.handshake.auth?.token || client.handshake.query?.token;
        try {
            if (!token) {
                client.data.userId = 'guest';
                client.data.role = 'CUSTOMER';
                this.logger.log(`Guest connected: ${client.id}`);
                return;
            }
            const payload = this.jwtService.verify(token, {
                secret: process.env.JWT_ACCESS_SECRET || 'super-secret-access-token-key-256-bit-long-value-for-security',
            });
            client.data.userId = payload.sub;
            client.data.role = payload.role;
            this.logger.log(`Authenticated connection: ${client.id} (User: ${payload.sub}, Role: ${payload.role})`);
        }
        catch (err) {
            this.logger.warn(`Auth failed for socket: ${client.id}. Error: ${err.message}`);
        }
    }
    handleDisconnect(client) {
        this.logger.log(`Socket disconnected: ${client.id}`);
    }
    handleJoinOrderRoom(client, data) {
        if (!data?.orderId)
            return { error: 'OrderId is required' };
        client.join(`order:${data.orderId}`);
        this.logger.log(`Socket ${client.id} joined order room: order:${data.orderId}`);
        return { event: 'joined', room: `order:${data.orderId}` };
    }
    handleLeaveOrderRoom(client, data) {
        if (!data?.orderId)
            return { error: 'OrderId is required' };
        client.leave(`order:${data.orderId}`);
        this.logger.log(`Socket ${client.id} left order room: order:${data.orderId}`);
        return { event: 'left', room: `order:${data.orderId}` };
    }
    handleJoinAdminRoom(client) {
        if (client.data.role !== 'ADMIN' && client.data.role !== 'SUPER_ADMIN') {
            return { error: 'Unauthorized' };
        }
        client.join('admin_room');
        this.logger.log(`Admin ${client.id} joined admin_room`);
        return { event: 'joined', room: 'admin_room' };
    }
    async handleRiderLocation(client, data) {
        if (client.data.role !== 'RIDER' && client.data.role !== 'ADMIN') {
            return { error: 'Unauthorized' };
        }
        this.logger.log(`Rider location update for order ${data.orderId}: ${data.latitude}, ${data.longitude}`);
        this.server.to(`order:${data.orderId}`).emit('rider_location', {
            latitude: data.latitude,
            longitude: data.longitude,
            timestamp: new Date().toISOString(),
        });
    }
    emitOrderStatusUpdate(orderId, payload) {
        this.server.to(`order:${orderId}`).emit('order:status_updated', payload);
        this.server.to('admin_room').emit('order:status_updated', payload);
        this.logger.log(`Broadcasted order status update for ${orderId}: ${payload.newStatus}`);
    }
    emitNewOrder(payload) {
        this.server.to('admin_room').emit('order:new', payload);
        this.logger.log(`Broadcasted new order event for ${payload.orderId}`);
    }
};
exports.EventsGateway = EventsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], EventsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_order_room'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleJoinOrderRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave_order_room'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleLeaveOrderRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_admin_room'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleJoinAdminRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('rider_location_update'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], EventsGateway.prototype, "handleRiderLocation", null);
exports.EventsGateway = EventsGateway = EventsGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: { origin: '*', credentials: true },
        namespace: '/events',
        transports: ['websocket', 'polling'],
    }),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], EventsGateway);
//# sourceMappingURL=events.gateway.js.map