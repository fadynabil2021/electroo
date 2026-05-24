import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../prisma/redis.service';
export declare class MenuService {
    private readonly prisma;
    private readonly redisService;
    private readonly MENU_CACHE_KEY;
    constructor(prisma: PrismaService, redisService: RedisService);
    getFullMenu(): Promise<any>;
    getCategories(): Promise<{
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
    }[]>;
    getCategoryBySlug(slug: string): Promise<{
        menuItems: ({
            modifierGroups: ({
                options: {
                    id: string;
                    nameEn: string;
                    nameAr: string;
                    displayOrder: number;
                    isAvailable: boolean;
                    additionalPrice: import("@prisma/client/runtime/library").Decimal;
                    isDefault: boolean;
                    modifierGroupId: string;
                }[];
            } & {
                id: string;
                nameEn: string;
                nameAr: string;
                displayOrder: number;
                minSelection: number;
                maxSelection: number;
                isRequired: boolean;
                menuItemId: string;
            })[];
        } & {
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
        })[];
    } & {
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
    getItemBySlug(slug: string): Promise<{
        modifierGroups: ({
            options: {
                id: string;
                nameEn: string;
                nameAr: string;
                displayOrder: number;
                isAvailable: boolean;
                additionalPrice: import("@prisma/client/runtime/library").Decimal;
                isDefault: boolean;
                modifierGroupId: string;
            }[];
        } & {
            id: string;
            nameEn: string;
            nameAr: string;
            displayOrder: number;
            minSelection: number;
            maxSelection: number;
            isRequired: boolean;
            menuItemId: string;
        })[];
    } & {
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
    searchItems(query: string): Promise<({
        modifierGroups: ({
            options: {
                id: string;
                nameEn: string;
                nameAr: string;
                displayOrder: number;
                isAvailable: boolean;
                additionalPrice: import("@prisma/client/runtime/library").Decimal;
                isDefault: boolean;
                modifierGroupId: string;
            }[];
        } & {
            id: string;
            nameEn: string;
            nameAr: string;
            displayOrder: number;
            minSelection: number;
            maxSelection: number;
            isRequired: boolean;
            menuItemId: string;
        })[];
    } & {
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
    })[]>;
    invalidateMenuCache(): Promise<void>;
}
