import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, Res } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { OrderStatus } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── KANBAN / ORDERS ──────────────────────────────────────────

  @Get('orders')
  async getOrders(@Query('status') status?: OrderStatus) {
    return this.adminService.getAdminOrders(status);
  }

  @Post('orders/:id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @Body('note') note: string,
    @Req() req: any,
  ) {
    return this.adminService.updateOrderStatus(id, status, req.user.id, note);
  }

  @Post('orders/:id/assign-rider')
  async assignRider(
    @Param('id') id: string,
    @Body('riderId') riderId: string,
    @Req() req: any,
  ) {
    return this.adminService.assignRider(id, riderId, req.user.id);
  }

  // ─── MENU CRUD ───────────────────────────────────────────────

  @Post('menu/categories')
  async createCategory(@Body() dto: any) {
    return this.adminService.createCategory(dto);
  }

  @Put('menu/categories/:id')
  async updateCategory(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.updateCategory(id, dto);
  }

  @Delete('menu/categories/:id')
  async deleteCategory(@Param('id') id: string) {
    return this.adminService.deleteCategory(id);
  }

  @Post('menu/items')
  async createMenuItem(@Body() dto: any) {
    return this.adminService.createMenuItem(dto);
  }

  @Put('menu/items/:id')
  async updateMenuItem(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.updateMenuItem(id, dto);
  }

  @Delete('menu/items/:id')
  async deleteMenuItem(@Param('id') id: string) {
    return this.adminService.deleteMenuItem(id);
  }

  // ─── COUPONS CRUD ────────────────────────────────────────────

  @Get('coupons')
  async getCoupons() {
    return this.adminService.getCoupons();
  }

  @Post('coupons')
  async createCoupon(@Body() dto: any) {
    return this.adminService.createCoupon(dto);
  }

  @Put('coupons/:id')
  async updateCoupon(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.updateCoupon(id, dto);
  }

  @Delete('coupons/:id')
  async deleteCoupon(@Param('id') id: string) {
    return this.adminService.deleteCoupon(id);
  }

  // ─── USER & RIDER MANAGEMENT ─────────────────────────────────

  @Get('users')
  async getUsers() {
    return this.adminService.getUsers();
  }

  @Put('users/:id/status')
  async updateUserStatus(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.adminService.updateUserStatus(id, isActive);
  }

  @Get('riders')
  async getRiders() {
    return this.adminService.getRiders();
  }

  // ─── REPORTS & ANALYTICS ─────────────────────────────────────

  @Get('reports/summary')
  async getReportsSummary() {
    return this.adminService.getAnalyticsSummary();
  }

  @Get('reports/export')
  async exportReports(@Res() res: import('express').Response) {
    const csv = await this.adminService.exportReportsCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=orders-report.csv');
    return res.status(200).send(csv);
  }
}
