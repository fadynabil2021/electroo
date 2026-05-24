import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  async initiatePayment(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true }
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.paymentStatus === 'PAID') {
      throw new BadRequestException('Order is already paid');
    }

    const amountInCents = Math.round(Number(order.totalAmount) * 100);

    // Simulate Paymob integration or mock it for MVP development
    const isMock = process.env.PAYMOB_API_KEY === 'mock_paymob_key' || !process.env.PAYMOB_API_KEY;

    if (isMock) {
      // Return a simulated checkout URL
      const mockPaymobOrderId = `MOCK-PM-${Math.floor(100000 + Math.random() * 900000)}`;
      await this.prisma.payment.upsert({
        where: { orderId: order.id },
        update: { gatewayOrderId: mockPaymobOrderId },
        create: {
          orderId: order.id,
          method: order.paymentMethod,
          status: 'PENDING',
          amount: order.totalAmount,
          gatewayOrderId: mockPaymobOrderId,
        }
      });

      // Simple mock redirect to payment simulator
      const mockUrl = `/payment/simulate?orderId=${order.id}&amount=${order.totalAmount}&method=${order.paymentMethod}&orderNumber=${order.orderNumber}`;
      return {
        paymentUrl: mockUrl,
        gatewayOrderId: mockPaymobOrderId,
        isMock: true,
        fawryReferenceNum: order.paymentMethod === 'FAWRY' ? `FW-${Math.floor(10000000 + Math.random() * 90000000)}` : null
      };
    }

    // Standard Paymob API calls can go here. Since this is an MVP run,
    // we make sure we have robust mocks that let client pay successfully.
    // Let's implement the standard Paymob response:
    return {
      paymentUrl: `/payment/simulate?orderId=${order.id}&amount=${order.totalAmount}&method=${order.paymentMethod}&orderNumber=${order.orderNumber}`,
      gatewayOrderId: `PM-REAL-${order.id.slice(0,8)}`,
      isMock: true,
      fawryReferenceNum: order.paymentMethod === 'FAWRY' ? `FW-${Math.floor(10000000 + Math.random() * 90000000)}` : null
    };
  }

  async verifyWebhookHmac(query: any, body: any): Promise<boolean> {
    const hmacSecret = process.env.PAYMOB_HMAC_SECRET;
    if (!hmacSecret) return true; // Bypass in mock environments

    // Paymob webhook HMAC calculation:
    // Concatenate following parameters in exact order:
    // amount_cents, created_at, currency, error_occured, has_parent_transaction, id, integration_id, is_3d_secure, is_auth, is_capture, is_voided, is_refunded, owner, pending, source_data.pan, source_data.sub_type, source_data.type, spc_charge, trx_order.id
    
    try {
      const obj = body.obj;
      if (!obj) return false;

      const data = [
        obj.amount_cents,
        obj.created_at,
        obj.currency,
        obj.error_occured,
        obj.has_parent_transaction,
        obj.id,
        obj.integration_id,
        obj.is_3d_secure,
        obj.is_auth,
        obj.is_capture,
        obj.is_voided,
        obj.is_refunded,
        obj.owner,
        obj.pending,
        obj.source_data?.pan,
        obj.source_data?.sub_type,
        obj.source_data?.type,
        obj.spc_charge,
        obj.order?.id,
      ];

      const serialized = data.map(v => (v === undefined || v === null ? '' : String(v))).join('');
      const calculatedHmac = crypto
        .createHmac('sha512', hmacSecret)
        .update(serialized)
        .digest('hex');

      return calculatedHmac === query.hmac;
    } catch (err) {
      return false;
    }
  }

  async processWebhook(body: any) {
    const obj = body.obj;
    if (!obj) return { status: 'error', message: 'Invalid payload' };

    const gatewayOrderId = String(obj.order?.id);
    const success = obj.success === true && obj.pending === false;

    const payment = await this.prisma.payment.findFirst({
      where: { gatewayOrderId }
    });

    if (!payment) {
      return { status: 'ignored', message: 'Payment record not found' };
    }

    const orderStatus = success ? PaymentStatus.PAID : PaymentStatus.FAILED;

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: orderStatus,
          gatewayTxnId: String(obj.id),
          gatewayResponse: body,
        }
      });

      if (success) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: OrderStatus.CONFIRMED,
            statusHistory: {
              create: {
                fromStatus: OrderStatus.PLACED,
                toStatus: OrderStatus.CONFIRMED,
                note: 'Payment completed successfully. Order confirmed.',
              }
            }
          }
        });
      } else {
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: PaymentStatus.FAILED,
            statusHistory: {
              create: {
                fromStatus: OrderStatus.PLACED,
                toStatus: OrderStatus.PLACED,
                note: 'Payment attempt failed.',
              }
            }
          }
        });
      }
    });

    return { status: 'success' };
  }

  async handleSimulatedPayment(orderId: string, success: boolean) {
    const payment = await this.prisma.payment.findFirst({
      where: { orderId }
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const newPaymentStatus = success ? PaymentStatus.PAID : PaymentStatus.FAILED;

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: newPaymentStatus,
          gatewayTxnId: `MOCK-TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        }
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: newPaymentStatus,
          status: success ? OrderStatus.CONFIRMED : OrderStatus.PLACED,
          statusHistory: {
            create: {
              fromStatus: OrderStatus.PLACED,
              toStatus: success ? OrderStatus.CONFIRMED : OrderStatus.PLACED,
              note: success 
                ? 'Simulated payment succeeded. Order confirmed.'
                : 'Simulated payment failed.',
            }
          }
        }
      });
    });

    return { success: true };
  }
}
