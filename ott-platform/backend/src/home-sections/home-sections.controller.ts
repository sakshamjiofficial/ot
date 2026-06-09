import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus, ParseIntPipe,
} from '@nestjs/common';
import { HomeSectionsService } from './home-sections.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, Role } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class HomeSectionsController {
  constructor(private readonly homeSectionsService: HomeSectionsService) {}

  @Public()
  @Get('home-sections')
  async getSections() {
    return this.homeSectionsService.findAll();
  }

  @Post('admin/home-sections')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async createSection(@Body() body: any) {
    return this.homeSectionsService.create(body);
  }

  @Put('admin/home-sections/reorder')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  async reorderSections(@Body('ids') ids: number[]) {
    await this.homeSectionsService.reorder(ids);
    return { success: true };
  }

  @Put('admin/home-sections/:id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async updateSection(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.homeSectionsService.update(id, body);
  }

  @Delete('admin/home-sections/:id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSection(@Param('id', ParseIntPipe) id: number) {
    return this.homeSectionsService.delete(id);
  }
}
