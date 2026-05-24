import { PrismaService } from '../../prisma/prisma.service';
import { MenuService } from '../menu/menu.service';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '@prisma/client';
export declare class AdminService {
    private readonly prisma;
    private readonly menuService;
    private readonly ordersService;
    constructor(prisma: PrismaService, menuService: MenuService, ordersService: OrdersService);
    getAdminOrders(status?: OrderStatus): Promise<({
        user: {
            phone: string | null;
            name: string;
        } | null;
        rider: ({
            user: {
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
        }) | null;
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
    updateOrderStatus(orderId: string, toStatus: OrderStatus, adminId: string, note?: string): Promise<{
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
    assignRider(orderId: string, riderId: string, adminId: string): Promise<{
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
    createCategory(dto: any): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        nameEn: string;
        nameAr: string;
        description: string | null;
        imageUrl: string | null;
        displayOrder: number;
        parentId: string | null;
    }>;
    updateCategory(id: string, dto: any): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        nameEn: string;
        nameAr: string;
        description: string | null;
        imageUrl: string | null;
        displayOrder: number;
        parentId: string | null;
    }>;
    deleteCategory(id: string): Promise<{
        success: boolean;
    }>;
    createMenuItem(dto: any): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        nameEn: string;
        nameAr: string;
        imageUrl: string | null;
        displayOrder: number;
        categoryId: string;
        descriptionEn: string | null;
        descriptionAr: string | null;
        basePrice: import("@prisma/client/runtime/library").Decimal;
        isAvailable: boolean;
        isFeatured: boolean;
        calories: number | null;
        allergens: string[];
    }>;
    updateMenuItem(id: string, dto: any): Promise<{
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        nameEn: string;
        nameAr: string;
        imageUrl: string | null;
        displayOrder: number;
        categoryId: string;
        descriptionEn: string | null;
        descriptionAr: string | null;
        basePrice: import("@prisma/client/runtime/library").Decimal;
        isAvailable: boolean;
        isFeatured: boolean;
        calories: number | null;
        allergens: string[];
    }>;
    deleteMenuItem(id: string): Promise<{
        success: boolean;
    }>;
    getCoupons(): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        code: string;
        type: import(".prisma/client").$Enums.CouponType;
        value: import("@prisma/client/runtime/library").Decimal;
        minOrderAmount: import("@prisma/client/runtime/library").Decimal | null;
        maxUsages: number | null;
        perUserLimit: number;
        usageCount: number;
        validFrom: Date;
        validUntil: Date | null;
    }[]>;
    createCoupon(dto: any): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        code: string;
        type: import(".prisma/client").$Enums.CouponType;
        value: import("@prisma/client/runtime/library").Decimal;
        minOrderAmount: import("@prisma/client/runtime/library").Decimal | null;
        maxUsages: number | null;
        perUserLimit: number;
        usageCount: number;
        validFrom: Date;
        validUntil: Date | null;
    }>;
    updateCoupon(id: string, dto: any): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        code: string;
        type: import(".prisma/client").$Enums.CouponType;
        value: import("@prisma/client/runtime/library").Decimal;
        minOrderAmount: import("@prisma/client/runtime/library").Decimal | null;
        maxUsages: number | null;
        perUserLimit: number;
        usageCount: number;
        validFrom: Date;
        validUntil: Date | null;
    }>;
    deleteCoupon(id: string): Promise<{
        success: boolean;
    }>;
    getUsers(): Promise<{
        id: string;
        email: string | null;
        phone: string | null;
        name: string;
        authProvider: import(".prisma/client").$Enums.AuthProvider;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        createdAt: Date;
    }[]>;
    updateUserStatus(id: string, isActive: boolean): Promise<{
        id: string;
        name: string;
        isActive: boolean;
    }>;
    getRiders(): Promise<({
        user: {
            phone: string | null;
            name: string;
            isActive: boolean;
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
    })[]>;
    getAnalyticsSummary(): Promise<{
        totalRevenue: number;
        totalOrders: number;
        averageOrderValue: number;
        topItems: {
            name: string;
            quantity: number;
            revenue: number;
        }[];
        chartData: {
            date: string;
            revenue: number;
            orders: number;
        }[];
    }>;
    exportReportsCsv(): Promise<string>;
}
