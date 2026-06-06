import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StreamingService }    from './streaming.service';
import { StreamingController } from './streaming.controller';
import { SignedUrlService }    from './signed-url.service';
import { VideoAssetEntity }    from '../content/entities/video-asset.entity';
import { ContentEntity }       from '../content/entities/content.entity';
import { EpisodeEntity }       from '../content/entities/episode.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([VideoAssetEntity, ContentEntity, EpisodeEntity]),
  ],
  providers:   [StreamingService, SignedUrlService],
  controllers: [StreamingController],
  exports:     [SignedUrlService],
})
export class StreamingModule {}
