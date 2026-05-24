"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const orders_service_1 = require("../orders/orders.service");
const client_1 = require("@prisma/client");
const crypto = __importStar(require("crypto"));
let PaymentsService = class PaymentsService {
    prisma;
    ordersService;
    constructor(prisma, ordersService) {
        this.prisma = prisma;
        this.ordersService = ordersService;
    }
    async initiatePayment(orderId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { user: true }
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (order.paymentStatus === 'PAID') {
            throw new common_1.BadRequestException('Order is already paid');
        }
        const amountInCents = Math.round(Number(order.totalAmount) * 100);
        const isMock = process.env.PAYMOB_API_KEY === 'mock_paymob_key' || !process.env.PAYMOB_API_KEY;
        if (isMock) {
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
            const mockUrl = `/payment/simulate?orderId=${order.id}&amount=${order.totalAmount}&method=${order.paymentMethod}&orderNumber=${order.orderNumber}`;
            return {
                paymentUrl: mockUrl,
                gatewayOrderId: mockPaymobOrderId,
                isMock: true,
                fawryReferenceNum: order.paymentMethod === 'FAWRY' ? `FW-${Math.floor(10000000 + Math.random() * 90000000)}` : null
            };
        }
        return {
            paymentUrl: `/payment/simulate?orderId=${order.id}&amount=${order.totalAmount}&method=${order.paymentMethod}&orderNumber=${order.orderNumber}`,
            gatewayOrderId: `PM-REAL-${order.id.slice(0, 8)}`,
            isMock: true,
            fawryReferenceNum: order.paymentMethod === 'FAWRY' ? `FW-${Math.floor(10000000 + Math.random() * 90000000)}` : null
        };
    }
    async verifyWebhookHmac(query, body) {
        const hmacSecret = process.env.PAYMOB_HMAC_SECRET;
        if (!hmacSecret)
            return true;
        try {
            const obj = body.obj;
            if (!obj)
                return false;
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
        }
        catch (err) {
            return false;
        }
    }
    async processWebhook(body) {
        const obj = body.obj;
        if (!obj)
            return { status: 'error', message: 'Invalid payload' };
        const gatewayOrderId = String(obj.order?.id);
        const success = obj.success === true && obj.pending === false;
        const payment = await this.prisma.payment.findFirst({
            where: { gatewayOrderId }
        });
        if (!payment) {
            return { status: 'ignored', message: 'Payment record not found' };
        }
        const orderStatus = success ? client_1.PaymentStatus.PAID : client_1.PaymentStatus.FAILED;
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
                        paymentStatus: client_1.PaymentStatus.PAID,
                        status: client_1.OrderStatus.CONFIRMED,
                        statusHistory: {
                            create: {
                                fromStatus: client_1.OrderStatus.PLACED,
                                toStatus: client_1.OrderStatus.CONFIRMED,
                                note: 'Payment completed successfully. Order confirmed.',
                            }
                        }
                    }
                });
            }
            else {
                await tx.order.update({
                    where: { id: payment.orderId },
                    data: {
                        paymentStatus: client_1.PaymentStatus.FAILED,
                        statusHistory: {
                            create: {
                                fromStatus: client_1.OrderStatus.PLACED,
                                toStatus: client_1.OrderStatus.PLACED,
                                note: 'Payment attempt failed.',
                            }
                        }
                    }
                });
            }
        });
        return { status: 'success' };
    }
    async handleSimulatedPayment(orderId, success) {
        const payment = await this.prisma.payment.findFirst({
            where: { orderId }
        });
        if (!payment) {
            throw new common_1.NotFoundException('Payment not found');
        }
        const newPaymentStatus = success ? client_1.PaymentStatus.PAID : client_1.PaymentStatus.FAILED;
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
                    status: success ? client_1.OrderStatus.CONFIRMED : client_1.OrderStatus.PLACED,
                    statusHistory: {
                        create: {
                            fromStatus: client_1.OrderStatus.PLACED,
                            toStatus: success ? client_1.OrderStatus.CONFIRMED : client_1.OrderStatus.PLACED,
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
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        orders_service_1.OrdersService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map