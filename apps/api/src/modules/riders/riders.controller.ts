import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { RidersService } from './riders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { OrderStatus } from '@prisma/client';

@Controller('riders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('RIDER', 'ADMIN', 'SUPER_ADMIN')
export class RidersController {
  constructor(private readonly ridersService: RidersService) {}

  @Get('profile')
  async getProfile(@Req() req: any) {
    return this.ridersService.getRiderProfile(req.user.id);
  }

  @Post('status')
  async toggleStatus(@Req() req: any, @Body('isOnline') isOnline: boolean) {
    return this.ridersService.toggleOnlineStatus(req.user.id, isOnline);
  }

  @Post('location')
  async updateLocation(
    @Req() req: any,
    @Body('latitude') latitude: number,
    @Body('longitude') longitude: number,
  ) {
    return this.ridersService.updateLocation(req.user.id, latitude, longitude);
  }

  @Get('orders')
  async getAssignedOrders(@Req() req: any) {
    return this.ridersService.getAssignedOrders(req.user.id);
  }

  @Post('orders/:id/status')
  async updateOrderStatus(
    @Req() req: any,
    @Param('id') orderId: string,
    @Body('status') status: OrderStatus,
    @Body('note') note?: string,
  ) {
    return this.ridersService.updateOrderStatus(req.user.id, orderId, status, note);
  }
}
