import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../gateways/events.gateway';
import { OrderStatus, PaymentStatus, FulfillmentType, PaymentMethod, Prisma } from '@prisma/client';
import Decimal from 'decimal.js';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async validateCoupon(code: string, userId?: string, subtotalAmount: number = 0) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase().trim() }
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    if (!coupon.isActive) {
      throw new BadRequestException('Coupon is inactive');
    }
    const now = new Date();
    if (now < coupon.validFrom) {
      throw new BadRequestException('Coupon is not active yet');
    }
    if (coupon.validUntil && now > coupon.validUntil) {
      throw new BadRequestException('Coupon has expired');
    }
    if (coupon.maxUsages && coupon.usageCount >= coupon.maxUsages) {
      throw new BadRequestException('Coupon maximum usage reached');
    }
    if (coupon.minOrderAmount && new Decimal(subtotalAmount).lt(coupon.minOrderAmount)) {
      throw new BadRequestException(`Minimum order amount of EGP ${coupon.minOrderAmount} required`);
    }

    if (userId) {
      const userUsage = await this.prisma.order.count({
        where: {
          userId,
          couponId: coupon.id,
          paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.PENDING] }
        }
      });
      if (userUsage >= coupon.perUserLimit) {
        throw new BadRequestException('You have reached the usage limit for this coupon');
      }
    }

    return coupon;
  }

  async placeOrder(dto: any, userId?: string) {
    const items = dto.items;
    if (!items || items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    // Calculate subtotal
    let subtotal = new Decimal(0);
    const orderItemsData: any[] = [];

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
        throw new BadRequestException(`Item ${item.itemNameEn || 'unknown'} is unavailable`);
      }

      let itemPrice = new Decimal(menuItem.basePrice);
      const modifierSnapshot: any[] = [];

      if (item.modifiers && item.modifiers.length > 0) {
        for (const selectedMod of item.modifiers) {
          // Find option
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
            throw new BadRequestException(`Invalid modifier option: ${selectedMod.optionId}`);
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

    // Apply coupon if exists
    let discountAmount = new Decimal(0);
    let couponId: string | null = null;
    if (dto.couponCode) {
      try {
        const coupon = await this.validateCoupon(dto.couponCode, userId, subtotal.toNumber());
        couponId = coupon.id;
        if (coupon.type === 'PERCENTAGE') {
          discountAmount = subtotal.times(new Decimal(coupon.value).div(100));
        } else if (coupon.type === 'FIXED_AMOUNT') {
          discountAmount = new Decimal(coupon.value);
        } else if (coupon.type === 'FREE_DELIVERY') {
          // Handled during delivery fee calculation
        }
        if (discountAmount.gt(subtotal)) {
          discountAmount = subtotal;
        }
      } catch (err) {
        throw new BadRequestException(err.message);
      }
    }

    // Fees configuration
    const fulfillmentType: FulfillmentType = dto.fulfillmentType || 'DELIVERY';
    let deliveryFee = new Decimal(fulfillmentType === 'DELIVERY' ? 15 : 0);
    if (dto.couponCode) {
      const coupon = await this.prisma.coupon.findUnique({ where: { code: dto.couponCode.toUpperCase() } });
      if (coupon && coupon.type === 'FREE_DELIVERY') {
        deliveryFee = new Decimal(0);
      }
    }

    const serviceFee = new Decimal(5); // Flat 5 EGP service fee
    const taxRate = new Decimal(0.14); // 14% VAT
    const taxableAmount = subtotal.plus(serviceFee).minus(discountAmount);
    const taxAmount = taxableAmount.gt(0) ? taxableAmount.times(taxRate) : new Decimal(0);
    const totalAmount = subtotal
      .plus(deliveryFee)
      .plus(serviceFee)
      .plus(taxAmount)
      .minus(discountAmount);

    // Save address snapshot if delivery
    let deliveryAddress: any = null;
    let addressId: string | null = null;
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
      } else if (dto.guestAddress) {
        deliveryAddress = dto.guestAddress; // { fullAddress, latitude, longitude, landmark }
      } else {
        throw new BadRequestException('Delivery address is required for delivery order');
      }
    }

    const paymentMethod: PaymentMethod = dto.paymentMethod || 'CASH_ON_DELIVERY';
    const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        userId: userId || null,
        guestName: userId ? null : dto.guestName || 'Guest User',
        guestPhone: userId ? null : dto.guestPhone || '',
        guestEmail: userId ? null : dto.guestEmail || '',
        addressId,
        deliveryAddress: deliveryAddress ? (deliveryAddress as Prisma.InputJsonValue) : Prisma.DbNull,
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

    // Update coupon usages
    if (couponId) {
      await this.prisma.coupon.update({
        where: { id: couponId },
        data: { usageCount: { increment: 1 } }
      });
    }

    // Broadcast WebSocket
    this.eventsGateway.emitNewOrder({
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      fulfillmentType: order.fulfillmentType,
      createdAt: order.createdAt,
    });

    return order;
  }

  async getOrderHistory(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getOrderDetail(orderId: string, userId?: string) {
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
      throw new NotFoundException('Order not found');
    }

    if (userId && order.userId !== userId && order.userId !== null) {
      // Guest orders can be tracked by any user who has the ID (or we can block if registered and not matching)
      throw new ForbiddenException('You do not have permission to view this order');
    }

    return order;
  }

  async updateOrderStatus(orderId: string, toStatus: OrderStatus, changedById?: string, note?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { statusHistory: true }
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const currentStatus = order.status;

    // Validate transitions
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      PLACED: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
      READY: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED, OrderStatus.CANCELLED], // DELIVERED directly if pickup/dine-in
      OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      DELIVERED: [],
      CANCELLED: [],
    };

    if (!validTransitions[currentStatus].includes(toStatus)) {
      throw new BadRequestException(`Invalid status transition from ${currentStatus} to ${toStatus}`);
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: toStatus,
        deliveredAt: toStatus === OrderStatus.DELIVERED ? new Date() : undefined,
        cancelledAt: toStatus === OrderStatus.CANCELLED ? new Date() : undefined,
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

    // Notify user and admins
    this.eventsGateway.emitOrderStatusUpdate(orderId, {
      orderId,
      orderNumber: updatedOrder.orderNumber,
      oldStatus: currentStatus,
      newStatus: toStatus,
      note,
    });

    return updatedOrder;
  }

  async cancelOrder(orderId: string, userId?: string, reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (userId && order.userId !== userId) {
      throw new ForbiddenException('Unauthorized to cancel this order');
    }

    if (order.status !== 'PLACED' && order.status !== 'CONFIRMED') {
      throw new BadRequestException(`Cannot cancel order in status: ${order.status}`);
    }

    return this.updateOrderStatus(orderId, OrderStatus.CANCELLED, userId, reason || 'Cancelled by user');
  }
}
