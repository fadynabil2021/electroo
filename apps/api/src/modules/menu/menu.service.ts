import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../prisma/redis.service';

@Injectable()
export class MenuService {
  private readonly MENU_CACHE_KEY = 'menu:full:v1';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async getFullMenu() {
    const cached = await this.redisService.get(this.MENU_CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (err) {
        // Fall through on JSON parse error
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
    await this.redisService.set(this.MENU_CACHE_KEY, JSON.stringify(result), 300); // 5 mins cache
    return result;
  }

  async getCategories() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' }
    });
  }

  async getCategoryBySlug(slug: string) {
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
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async getItemBySlug(slug: string) {
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
      throw new NotFoundException('Menu item not found');
    }
    return item;
  }

  async searchItems(query: string) {
    if (!query) return [];
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
}
