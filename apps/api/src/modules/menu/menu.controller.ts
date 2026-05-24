import { Controller, Get, Param, Query } from '@nestjs/common';
import { MenuService } from './menu.service';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  async getFullMenu() {
    return this.menuService.getFullMenu();
  }

  @Get('categories')
  async getCategories() {
    return this.menuService.getCategories();
  }

  @Get('categories/:slug')
  async getCategoryBySlug(@Param('slug') slug: string) {
    return this.menuService.getCategoryBySlug(slug);
  }

  @Get('items/:slug')
  async getItemBySlug(@Param('slug') slug: string) {
    return this.menuService.getItemBySlug(slug);
  }

  @Get('search')
  async searchItems(@Query('q') query: string) {
    return this.menuService.searchItems(query);
  }
}
