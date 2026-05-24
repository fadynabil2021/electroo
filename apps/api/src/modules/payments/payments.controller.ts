import { Controller, Post, Body, Param, Query, Req, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate/:orderId')
  async initiatePayment(@Param('orderId') orderId: string) {
    return this.paymentsService.initiatePayment(orderId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Query() query: any,
    @Body() body: any,
  ) {
    const isValid = await this.paymentsService.verifyWebhookHmac(query, body);
    if (!isValid) {
      return { status: 'error', message: 'HMAC signature verification failed' };
    }
    return this.paymentsService.processWebhook(body);
  }

  @Post('simulate')
  async simulatePayment(
    @Body('orderId') orderId: string,
    @Body('success') success: boolean,
  ) {
    return this.paymentsService.handleSimulatedPayment(orderId, success);
  }
}
