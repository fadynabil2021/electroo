import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable, Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/events',
  transports: ['websocket', 'polling'],
})
@Injectable()
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    try {
      if (!token) {
        // Allow anonymous connections for guest tracking, but restrict rooms if needed
        client.data.userId = 'guest';
        client.data.role = 'CUSTOMER';
        this.logger.log(`Guest connected: ${client.id}`);
        return;
      }
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_ACCESS_SECRET || 'super-secret-access-token-key-256-bit-long-value-for-security',
      });
      client.data.userId = payload.sub;
      client.data.role = payload.role;
      this.logger.log(`Authenticated connection: ${client.id} (User: ${payload.sub}, Role: ${payload.role})`);
    } catch (err) {
      this.logger.warn(`Auth failed for socket: ${client.id}. Error: ${err.message}`);
      // Don't disconnect immediately, allow guest usage, or we can disconnect if strictly authenticated
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_order_room')
  handleJoinOrderRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    if (!data?.orderId) return { error: 'OrderId is required' };
    client.join(`order:${data.orderId}`);
    this.logger.log(`Socket ${client.id} joined order room: order:${data.orderId}`);
    return { event: 'joined', room: `order:${data.orderId}` };
  }

  @SubscribeMessage('leave_order_room')
  handleLeaveOrderRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    if (!data?.orderId) return { error: 'OrderId is required' };
    client.leave(`order:${data.orderId}`);
    this.logger.log(`Socket ${client.id} left order room: order:${data.orderId}`);
    return { event: 'left', room: `order:${data.orderId}` };
  }

  @SubscribeMessage('join_admin_room')
  handleJoinAdminRoom(@ConnectedSocket() client: Socket) {
    if (client.data.role !== 'ADMIN' && client.data.role !== 'SUPER_ADMIN') {
      return { error: 'Unauthorized' };
    }
    client.join('admin_room');
    this.logger.log(`Admin ${client.id} joined admin_room`);
    return { event: 'joined', room: 'admin_room' };
  }

  @SubscribeMessage('rider_location_update')
  async handleRiderLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string; latitude: number; longitude: number },
  ) {
    if (client.data.role !== 'RIDER' && client.data.role !== 'ADMIN') {
      return { error: 'Unauthorized' };
    }

    this.logger.log(`Rider location update for order ${data.orderId}: ${data.latitude}, ${data.longitude}`);

    // Broadcast to the customer room
    this.server.to(`order:${data.orderId}`).emit('rider_location', {
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: new Date().toISOString(),
    });
  }

  emitOrderStatusUpdate(orderId: string, payload: any) {
    this.server.to(`order:${orderId}`).emit('order:status_updated', payload);
    this.server.to('admin_room').emit('order:status_updated', payload);
    this.logger.log(`Broadcasted order status update for ${orderId}: ${payload.newStatus}`);
  }

  emitNewOrder(payload: any) {
    this.server.to('admin_room').emit('order:new', payload);
    this.logger.log(`Broadcasted new order event for ${payload.orderId}`);
  }
}
