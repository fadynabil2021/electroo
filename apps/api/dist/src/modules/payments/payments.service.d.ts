import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
export declare class PaymentsService {
    private readonly prisma;
    private readonly ordersService;
    constructor(prisma: PrismaService, ordersService: OrdersService);
    initiatePayment(orderId: string): Promise<{
        paymentUrl: string;
        gatewayOrderId: string;
        isMock: boolean;
        fawryReferenceNum: string | null;
    }>;
    verifyWebhookHmac(query: any, body: any): Promise<boolean>;
    processWebhook(body: any): Promise<{
        status: string;
        message: string;
    } | {
        status: string;
        message?: undefined;
    }>;
    handleSimulatedPayment(orderId: string, success: boolean): Promise<{
        success: boolean;
    }>;
}
