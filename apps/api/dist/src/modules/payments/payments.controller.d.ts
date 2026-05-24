import { PaymentsService } from './payments.service';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    initiatePayment(orderId: string): Promise<{
        paymentUrl: string;
        gatewayOrderId: string;
        isMock: boolean;
        fawryReferenceNum: string | null;
    }>;
    handleWebhook(query: any, body: any): Promise<{
        status: string;
        message?: undefined;
    } | {
        status: string;
        message: string;
    }>;
    simulatePayment(orderId: string, success: boolean): Promise<{
        success: boolean;
    }>;
}
