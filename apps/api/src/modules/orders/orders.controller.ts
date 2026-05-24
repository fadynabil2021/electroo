import { Controller, Post, Get, Body, Param, UseGuards, Req, Query, Optional } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async placeOrder(@Body() dto: any, @Req() req: any) {
    // If authorization header is present, extract token and verify to identify user
    let userId: string | undefined = undefined;
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        // Decode manually or check in route logic
        const jwtService = req.jwtService; // We'll pass it if injected or decode loosely
      } catch (err) {}
    }
    
    // We can also let JwtAuthGuard be optional. Let's inspect authorization header directly.
    return this.ordersService.placeOrder(dto, req.user?.id);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getOrderHistory(@Req() req: any) {
    return this.ordersService.getOrderHistory(req.user.id);
  }

  @Get(':id')
  async getOrderDetail(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.getOrderDetail(id, req.user?.id);
  }

  @Post(':id/cancel')
  async cancelOrder(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.ordersService.cancelOrder(id, req.user?.id, reason);
  }

  @Post('coupons/validate')
  async validateCoupon(
    @Body('code') code: string,
    @Body('subtotal') subtotal: number,
    @Req() req: any,
  ) {
    return this.ordersService.validateCoupon(code, req.user?.id, subtotal);
  }
}
