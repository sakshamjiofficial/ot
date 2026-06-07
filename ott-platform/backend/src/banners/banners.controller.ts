import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { BannersService } from './banners.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, Role } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Public()
  @Get('banners')
  async getBanners(@Query('active') activeOnly?: boolean) {
    if (activeOnly === true || String(activeOnly) === 'true') {
      return this.bannersService.findAllActive();
    }
    return this.bannersService.findAll();
  }

  @Post('admin/banners')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async createBanner(@Body() body: any) {
    return this.bannersService.create(body);
  }

  @Put('admin/banners/:id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async updateBanner(@Param('id', ParseUUIDPipe) id: string, @Body() body: any) {
    return this.bannersService.update(id, body);
  }

  @Delete('admin/banners/:id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBanner(@Param('id', ParseUUIDPipe) id: string) {
    return this.bannersService.delete(id);
  }
}
