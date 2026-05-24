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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RidersController = void 0;
const common_1 = require("@nestjs/common");
const riders_service_1 = require("./riders.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const client_1 = require("@prisma/client");
let RidersController = class RidersController {
    ridersService;
    constructor(ridersService) {
        this.ridersService = ridersService;
    }
    async getProfile(req) {
        return this.ridersService.getRiderProfile(req.user.id);
    }
    async toggleStatus(req, isOnline) {
        return this.ridersService.toggleOnlineStatus(req.user.id, isOnline);
    }
    async updateLocation(req, latitude, longitude) {
        return this.ridersService.updateLocation(req.user.id, latitude, longitude);
    }
    async getAssignedOrders(req) {
        return this.ridersService.getAssignedOrders(req.user.id);
    }
    async updateOrderStatus(req, orderId, status, note) {
        return this.ridersService.updateOrderStatus(req.user.id, orderId, status, note);
    }
};
exports.RidersController = RidersController;
__decorate([
    (0, common_1.Get)('profile'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RidersController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Post)('status'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)('isOnline')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Boolean]),
    __metadata("design:returntype", Promise)
], RidersController.prototype, "toggleStatus", null);
__decorate([
    (0, common_1.Post)('location'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)('latitude')),
    __param(2, (0, common_1.Body)('longitude')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number]),
    __metadata("design:returntype", Promise)
], RidersController.prototype, "updateLocation", null);
__decorate([
    (0, common_1.Get)('orders'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RidersController.prototype, "getAssignedOrders", null);
__decorate([
    (0, common_1.Post)('orders/:id/status'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('status')),
    __param(3, (0, common_1.Body)('note')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], RidersController.prototype, "updateOrderStatus", null);
exports.RidersController = RidersController = __decorate([
    (0, common_1.Controller)('riders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_guard_1.Roles)('RIDER', 'ADMIN', 'SUPER_ADMIN'),
    __metadata("design:paramtypes", [riders_service_1.RidersService])
], RidersController);
//# sourceMappingURL=riders.controller.js.map