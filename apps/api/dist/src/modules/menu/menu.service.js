"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const redis_service_1 = require("../../prisma/redis.service");
let MenuService = class MenuService {
    prisma;
    redisService;
    MENU_CACHE_KEY = 'menu:full:v1';
    constructor(prisma, redisService) {
        this.prisma = prisma;
        this.redisService = redisService;
    }
    async getFullMenu() {
        const cached = await this.redisService.get(this.MENU_CACHE_KEY);
        if (cached) {
            try {
                return JSON.parse(cached);
            }
            catch (err) {
            }
        }
        const categories = await this.prisma.category.findMany({
            where: { isActive: true },
            include: {
                menuItems: {
                    where: { isAvailable: true, deletedAt: null },
                    include: {
                        modifierGroups: {
                            include: {
                                options: {
                                    where: { isAvailable: true }
                                }
                            }
                        }
                    },
                    orderBy: { displayOrder: 'asc' }
                }
            },
            orderBy: { displayOrder: 'asc' }
        });
        const result = { categories };
        await this.redisService.set(this.MENU_CACHE_KEY, JSON.stringify(result), 300);
        return result;
    }
    async getCategories() {
        return this.prisma.category.findMany({
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' }
        });
    }
    async getCategoryBySlug(slug) {
        const category = await this.prisma.category.findUnique({
            where: { slug },
            include: {
                menuItems: {
                    where: { isAvailable: true, deletedAt: null },
                    include: {
                        modifierGroups: {
                            include: {
                                options: {
                                    where: { isAvailable: true }
                                }
                            }
                        }
                    }
                }
            }
        });
        if (!category) {
            throw new common_1.NotFoundException('Category not found');
        }
        return category;
    }
    async getItemBySlug(slug) {
        const item = await this.prisma.menuItem.findUnique({
            where: { slug },
            include: {
                modifierGroups: {
                    include: {
                        options: {
                            where: { isAvailable: true }
                        }
                    }
                }
            }
        });
        if (!item || item.deletedAt) {
            throw new common_1.NotFoundException('Menu item not found');
        }
        return item;
    }
    async searchItems(query) {
        if (!query)
            return [];
        return this.prisma.menuItem.findMany({
            where: {
                isAvailable: true,
                deletedAt: null,
                OR: [
                    { nameEn: { contains: query, mode: 'insensitive' } },
                    { nameAr: { contains: query, mode: 'insensitive' } },
                    { descriptionEn: { contains: query, mode: 'insensitive' } },
                    { descriptionAr: { contains: query, mode: 'insensitive' } }
                ]
            },
            include: {
                modifierGroups: {
                    include: {
                        options: {
                            where: { isAvailable: true }
                        }
                    }
                }
            }
        });
    }
    async invalidateMenuCache() {
        await this.redisService.del(this.MENU_CACHE_KEY);
    }
};
exports.MenuService = MenuService;
exports.MenuService = MenuService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], MenuService);
//# sourceMappingURL=menu.service.js.map