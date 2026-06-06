import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, Role } from '../common/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('analytics')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPERADMIN)
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get overall analytics metrics' })
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('trends/playback')
  @ApiOperation({ summary: 'Get play count trends over past 14 days' })
  getPlaybackTrends() {
    return this.analyticsService.getPlaybackTrends();
  }

  @Get('breakdown/subscriptions')
  @ApiOperation({ summary: 'Get active subscriptions breakdown by plan' })
  getSubscriptionBreakdown() {
    return this.analyticsService.getSubscriptionBreakdown();
  }

  @Get('trends/revenue')
  @ApiOperation({ summary: 'Get daily revenue trends over past 30 days' })
  getRevenueTrends() {
    return this.analyticsService.getRevenueTrends();
  }

  @Get('breakdown/devices')
  @ApiOperation({ summary: 'Get users device type breakdown' })
  getDeviceBreakdown() {
    return this.analyticsService.getDeviceBreakdown();
  }

  @Get('top-content')
  @ApiOperation({ summary: 'Get top 10 played contents' })
  getTopContent() {
    return this.analyticsService.getTopContent();
  }

  @Get('searches')
  @ApiOperation({ summary: 'Get top search queries with results' })
  getSearchAnalytics() {
    return this.analyticsService.getSearchAnalytics();
  }

  @Get('genres')
  @ApiOperation({ summary: 'Get play metrics and watch time per genre' })
  getGenrePerformance() {
    return this.analyticsService.getGenrePerformance();
  }
}
