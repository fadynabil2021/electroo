import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
export declare class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwtService;
    server: Server;
    private readonly logger;
    constructor(jwtService: JwtService);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    handleJoinOrderRoom(client: Socket, data: {
        orderId: string;
    }): {
        error: string;
        event?: undefined;
        room?: undefined;
    } | {
        event: string;
        room: string;
        error?: undefined;
    };
    handleLeaveOrderRoom(client: Socket, data: {
        orderId: string;
    }): {
        error: string;
        event?: undefined;
        room?: undefined;
    } | {
        event: string;
        room: string;
        error?: undefined;
    };
    handleJoinAdminRoom(client: Socket): {
        error: string;
        event?: undefined;
        room?: undefined;
    } | {
        event: string;
        room: string;
        error?: undefined;
    };
    handleRiderLocation(client: Socket, data: {
        orderId: string;
        latitude: number;
        longitude: number;
    }): Promise<{
        error: string;
    } | undefined>;
    emitOrderStatusUpdate(orderId: string, payload: any): void;
    emitNewOrder(payload: any): void;
}
