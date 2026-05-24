import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const status = 
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = 
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorDetails = typeof message === 'object' ? (message as any) : { message };

    response.status(status).json({
      type: `https://httpstatuses.com/${status}`,
      title: errorDetails.error || 'Server Error',
      status,
      detail: errorDetails.message || exception.message || 'An unexpected error occurred',
      instance: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
