import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class RidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  async getRiderProfile(userId: string) {
    const profile = await this.prisma.riderProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { name: true, phone: true } }
      }
    });

    if (!profile) {
      throw new NotFoundException('Rider profile not found');
    }
    return profile;
  }

  async toggleOnlineStatus(userId: string, isOnline: boolean) {
    const profile = await this.getRiderProfile(userId);
    return this.prisma.riderProfile.update({
      where: { id: profile.id },
      data: { isOnline, lastSeenAt: new Date() }
    });
  }

  async updateLocation(userId: string, latitude: number, longitude: number) {
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

  async getAssignedOrders(userId: string) {
    const profile = await this.getRiderProfile(userId);
    return this.prisma.order.findMany({
      where: {
        riderId: profile.id,
        status: {
          in: [
            OrderStatus.CONFIRMED,
            OrderStatus.PREPARING,
            OrderStatus.READY,
            OrderStatus.OUT_FOR_DELIVERY
          ]
        }
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateOrderStatus(userId: string, orderId: string, status: OrderStatus, note?: string) {
    const profile = await this.getRiderProfile(userId);
    const order = await this.prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.riderId !== profile.id) {
      throw new BadRequestException('Order is not assigned to you');
    }

    return this.ordersService.updateOrderStatus(orderId, status, userId, note || `Status updated by rider`);
  }
}
