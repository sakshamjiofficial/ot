import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  ParseUUIDPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StreamingService } from './streaming.service';
import { JwtAuthGuard }    from '../common/guards/jwt-auth.guard';
import { CurrentUser }     from '../common/decorators/current-user.decorator';
import { Public }          from '../common/decorators/public.decorator';
import { SignedUrlService } from './signed-url.service';

@ApiTags('streaming')
@UseGuards(JwtAuthGuard)
@Controller('stream')
export class StreamingController {
  constructor(
    private readonly streamingService: StreamingService,
    private readonly signedUrlService: SignedUrlService,
  ) {}

  /**
   * GET /api/v1/stream/content/:id/master.m3u8
   * Returns signed + rewritten HLS master playlist for a movie.
   */
  @Get('content/:id/master.m3u8')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get signed HLS master playlist for movie' })
  async getMoviePlaylist(
    @Param('id', ParseUUIDPipe) contentId: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const { playlist, contentType } =
      await this.streamingService.getSignedMasterPlaylist(
        contentId,
        undefined,
        user.id,
        user.hasActiveSubscription,
      );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, no-store');  // never cache signed playlists
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(playlist);
  }

  /**
   * GET /api/v1/stream/episodes/:id/master.m3u8
   * Returns signed HLS master playlist for an episode.
   */
  @Get('episodes/:id/master.m3u8')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get signed HLS master playlist for episode' })
  async getEpisodePlaylist(
    @Param('id', ParseUUIDPipe) episodeId: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const { playlist, contentType } =
      await this.streamingService.getSignedMasterPlaylist(
        undefined,
        episodeId,
        user.id,
        user.hasActiveSubscription,
      );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(playlist);
  }

  /**
   * GET /api/v1/stream/content/:id/info
   * Stream metadata: renditions, subtitles, audio tracks.
   */
  @Get('content/:id/info')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get stream info (renditions, subtitles, audio)' })
  getStreamInfo(@Param('id', ParseUUIDPipe) contentId: string) {
    return this.streamingService.getStreamInfo(contentId);
  }

  @Get('episodes/:id/info')
  @ApiBearerAuth('access-token')
  getEpisodeStreamInfo(@Param('id', ParseUUIDPipe) episodeId: string) {
    return this.streamingService.getStreamInfo(undefined, episodeId);
  }

  /**
   * GET /api/v1/stream/verify
   * Token validation endpoint — called by Nginx auth_request or CF Worker
   * to verify segment requests before proxying to R2.
   */
  @Public()
  @Get('verify')
  @ApiOperation({
    summary: 'Verify signed stream token (used by Nginx auth_request)',
  })
  verifyToken(
    @Query('path')    path: string,
    @Query('token')   token: string,
    @Query('expires') expires: string,
    @Res() res: Response,
  ) {
    if (!path || !token || !expires) {
      return res.sendStatus(401);
    }

    const valid = this.streamingService.validateStreamToken(path, token, expires);
    return res.sendStatus(valid ? 200 : 401);
  }
}
