import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Req,
  Res,
  Header,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { ContentService } from './content.service';
import {
  CreateContentDto,
  UpdateContentDto,
  CreateSeasonDto,
  CreateEpisodeDto,
  UpdateWatchProgressDto,
  GetMoviesDto,
  GetSeriesDto,
  GetAdminContentDto,
} from './dto/content.dto';
import { JwtAuthGuard }  from '../common/guards/jwt-auth.guard';
import { RolesGuard }    from '../common/guards/roles.guard';
import { Roles, Role }   from '../common/decorators/roles.decorator';
import { CurrentUser }   from '../common/decorators/current-user.decorator';
import { Public }        from '../common/decorators/public.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ContentType, ContentStatus } from './entities/content.entity';

@ApiTags('content')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // ─────────────────────────────────────────────────────────
  // PUBLIC — Movies
  // ─────────────────────────────────────────────────────────

  @Public()
  @Get('movies')
  @ApiOperation({ summary: 'List published movies' })
  @ApiQuery({ name: 'genreId', required: false, type: Number })
  @ApiQuery({ name: 'isPremium', required: false, type: Boolean })
  getMovies(
    @Query() query: GetMoviesDto,
  ) {
    const { genreId, isPremium, ...pagination } = query;
    return this.contentService.findAllContent(ContentType.MOVIE, {
      ...pagination,
      genreId,
      isPremium,
    });
  }

  @Public()
  @Get('movies/:id')
  @ApiOperation({ summary: 'Get movie detail by ID' })
  getMovie(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.findContentById(id);
  }

  // ─────────────────────────────────────────────────────────
  // PUBLIC — Series
  // ─────────────────────────────────────────────────────────

  @Public()
  @Get('series')
  @ApiOperation({ summary: 'List published series' })
  getSeries(
    @Query() query: GetSeriesDto,
  ) {
    const { genreId, ...pagination } = query;
    return this.contentService.findAllContent(ContentType.SERIES, {
      ...pagination,
      genreId,
    });
  }

  @Public()
  @Get('series/:id')
  @ApiOperation({ summary: 'Get series detail with seasons and episodes' })
  getOneSeries(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.findContentById(id);
  }

  @Public()
  @Get('series/:id/seasons')
  @ApiOperation({ summary: 'Get all seasons for a series' })
  getSeasons(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.getSeasons(id);
  }

  @Public()
  @Get('episodes/:id')
  @ApiOperation({ summary: 'Get episode detail' })
  getEpisode(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.findEpisodeById(id);
  }

  // ─────────────────────────────────────────────────────────
  // PUBLIC — Homepage feeds
  // ─────────────────────────────────────────────────────────

  @Public()
  @Get('home/feed')
  async getHomeFeed(@Req() req: Request) {
    let userId: string | undefined = undefined;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          userId = payload?.sub;
        }
      } catch (e) {
        // Ignore invalid token
      }
    }
    return this.contentService.getHomeFeed(userId);
  }

  @Public()
  @Get('home/trending')
  getTrending() {
    return this.contentService.getTrending(20);
  }

  @Public()
  @Get('home/featured')
  getFeatured() {
    return this.contentService.getFeatured();
  }

  @Public()
  @Get('home/recent')
  getRecentlyAdded() {
    return this.contentService.getRecentlyAdded(20);
  }

  @Public()
  @Get('genres')
  getAllGenres() {
    return this.contentService.getAllGenres();
  }

  @Public()
  @Get('genres/:id/content')
  getByGenre(
    @Param('id', ParseIntPipe) genreId: number,
    @Query('limit') limit = 20,
  ) {
    return this.contentService.getByGenre(genreId, limit);
  }

  // ─────────────────────────────────────────────────────────
  // AUTH REQUIRED — Watch progress, watchlist
  // ─────────────────────────────────────────────────────────

  @Post('content/:id/progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update watch progress (continue watching)' })
  updateProgress(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) contentId: string,
    @Body() dto: UpdateWatchProgressDto,
  ) {
    return this.contentService.updateWatchProgress(userId, contentId, dto);
  }

  @Get('me/continue-watching')
  @ApiOperation({ summary: 'Get continue watching list' })
  getContinueWatching(@CurrentUser('id') userId: string) {
    return this.contentService.getContinueWatching(userId);
  }

  @Get('me/watch-history')
  @ApiOperation({ summary: 'Get full watch history' })
  getWatchHistory(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.contentService.getWatchHistory(userId, pagination);
  }

  @Post('me/watchlist/:contentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Add to watchlist' })
  addToWatchlist(
    @CurrentUser('id') userId: string,
    @Param('contentId', ParseUUIDPipe) contentId: string,
  ) {
    return this.contentService.addToWatchlist(userId, contentId);
  }

  @Delete('me/watchlist/:contentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove from watchlist' })
  removeFromWatchlist(
    @CurrentUser('id') userId: string,
    @Param('contentId', ParseUUIDPipe) contentId: string,
  ) {
    return this.contentService.removeFromWatchlist(userId, contentId);
  }

  @Get('me/watchlist')
  @ApiOperation({ summary: 'Get watchlist' })
  getWatchlist(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.contentService.getWatchlist(userId, pagination);
  }

  // ─────────────────────────────────────────────────────────
  // ADMIN — Content CRUD
  // ─────────────────────────────────────────────────────────

  @Get('admin/content')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: '[Admin] List movies or series' })
  @ApiQuery({ name: 'type', required: true, enum: ContentType })
  @ApiQuery({ name: 'status', required: false, enum: ContentStatus })
  @ApiQuery({ name: 'genreId', required: false, type: Number })
  getAdminContent(
    @Query() query: GetAdminContentDto,
  ) {
    const { type, status, genreId, ...pagination } = query;
    return this.contentService.findAllContentAdmin(type, {
      ...pagination,
      status,
      genreId,
    });
  }

  @Post('admin/content')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: '[Admin] Create movie or series' })
  createContent(
    @Body() dto: CreateContentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.contentService.createContent(dto, userId);
  }

  @Get('admin/content/:id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: '[Admin] Get content by ID' })
  getContentById(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.findContentById(id);
  }

  @Put('admin/content/:id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: '[Admin] Update content' })
  updateContent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContentDto,
  ) {
    return this.contentService.updateContent(id, dto);
  }

  @Delete('admin/content/:id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Admin] Delete content' })
  deleteContent(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.deleteContent(id);
  }

  // Seasons
  @Post('admin/series/:id/seasons')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  createSeason(
    @Param('id', ParseUUIDPipe) contentId: string,
    @Body() dto: CreateSeasonDto,
  ) {
    return this.contentService.createSeason(contentId, dto);
  }

  // Episodes
  @Post('admin/seasons/:seasonId/episodes')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: '[Admin] Add episode to season' })
  createEpisode(
    @Param('seasonId', ParseUUIDPipe) seasonId: string,
    @Body() dto: CreateEpisodeDto,
    @Query('contentId', ParseUUIDPipe) contentId: string,
  ) {
    return this.contentService.createEpisode(contentId, seasonId, dto);
  }

  @Put('admin/episodes/:id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  updateEpisode(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateEpisodeDto>,
  ) {
    return this.contentService.updateEpisode(id, dto);
  }

  @Delete('admin/episodes/:id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteEpisode(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.deleteEpisode(id);
  }

  // Genres
  @Post('admin/genres')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  createGenre(@Body('name') name: string) {
    return this.contentService.createGenre(name);
  }

  @Put('admin/genres/:id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  updateGenre(
    @Param('id', ParseIntPipe) id: number,
    @Body('name') name: string,
    @Body('sortOrder') sortOrder?: number,
  ) {
    return this.contentService.updateGenre(id, name, sortOrder);
  }

  @Delete('admin/genres/:id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteGenre(@Param('id', ParseIntPipe) id: number) {
    return this.contentService.deleteGenre(id);
  }


  // Stats
  @Get('admin/content/stats')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  getContentStats() {
    return this.contentService.getContentStats();
  }

  @Public()
  @Get('download-apk')
  @Header('Content-Type', 'application/vnd.android.package-archive')
  @Header('Content-Disposition', 'attachment; filename="app-debug.apk"')
  downloadApk(@Res() res: Response) {
    const file = '/workspaces/Kaler/ott-platform/android/app/build/outputs/apk/debug/app-debug.apk';
    return res.sendFile(file);
  }
}
