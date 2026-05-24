import { RidersService } from './riders.service';
import { OrderStatus } from '@prisma/client';
export declare class RidersController {
    private readonly ridersService;
    constructor(ridersService: RidersService);
    getProfile(req: any): Promise<{
        user: {
            phone: string | null;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        vehicleType: string | null;
        plateNumber: string | null;
        isOnline: boolean;
        lastLatitude: import("@prisma/client/runtime/library").Decimal | null;
        lastLongitude: import("@prisma/client/runtime/library").Decimal | null;
        lastSeenAt: Date | null;
    }>;
    toggleStatus(req: any, isOnline: boolean): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        vehicleType: string | null;
        plateNumber: string | null;
        isOnline: boolean;
        lastLatitude: import("@prisma/client/runtime/library").Decimal | null;
        lastLongitude: import("@prisma/client/runtime/library").Decimal | null;
        lastSeenAt: Date | null;
    }>;
    updateLocation(req: any, latitude: number, longitude: number): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        vehicleType: string | null;
        plateNumber: string | null;
        isOnline: boolean;
        lastLatitude: import("@prisma/client/runtime/library").Decimal | null;
        lastLongitude: import("@prisma/client/runtime/library").Decimal | null;
        lastSeenAt: Date | null;
    }>;
    getAssignedOrders(req: any): Promise<({
        items: {
            id: string;
            menuItemId: string | null;
            itemNameEn: string;
            itemNameAr: string;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            quantity: number;
            modifierSnapshot: import("@prisma/client/runtime/library").JsonValue;
            itemNotes: string | null;
            lineTotal: import("@prisma/client/runtime/library").Decimal;
            orderId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        couponId: string | null;
        orderNumber: string;
        guestName: string | null;
        guestPhone: string | null;
        guestEmail: string | null;
        deliveryAddress: import("@prisma/client/runtime/library").JsonValue | null;
        status: import(".prisma/client").$Enums.OrderStatus;
        fulfillmentType: import(".prisma/client").$Enums.FulfillmentType;
        scheduledFor: Date | null;
        tableNumber: string | null;
        notes: string | null;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        deliveryFee: import("@prisma/client/runtime/library").Decimal;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        serviceFee: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
        paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
        cancelledAt: Date | null;
        cancelReason: string | null;
        deliveredAt: Date | null;
        addressId: string | null;
        riderId: string | null;
    })[]>;
    updateOrderStatus(req: any, orderId: string, status: OrderStatus, note?: string): Promise<{
        items: {
            id: string;
            menuItemId: string | null;
            itemNameEn: string;
            itemNameAr: string;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            quantity: number;
            modifierSnapshot: import("@prisma/client/runtime/library").JsonValue;
            itemNotes: string | null;
            lineTotal: import("@prisma/client/runtime/library").Decimal;
            orderId: string;
        }[];
        statusHistory: {
            id: string;
            createdAt: Date;
            fromStatus: import(".prisma/client").$Enums.OrderStatus | null;
            toStatus: import(".prisma/client").$Enums.OrderStatus;
            changedById: string | null;
            note: string | null;
            orderId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        couponId: string | null;
        orderNumber: string;
        guestName: string | null;
        guestPhone: string | null;
        guestEmail: string | null;
        deliveryAddress: import("@prisma/client/runtime/library").JsonValue | null;
        status: import(".prisma/client").$Enums.OrderStatus;
        fulfillmentType: import(".prisma/client").$Enums.FulfillmentType;
        scheduledFor: Date | null;
        tableNumber: string | null;
        notes: string | null;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        deliveryFee: import("@prisma/client/runtime/library").Decimal;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        serviceFee: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
        paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
        cancelledAt: Date | null;
        cancelReason: string | null;
        deliveredAt: Date | null;
        addressId: string | null;
        riderId: string | null;
    }>;
}
