import { Module }          from '@nestjs/common';
import { TypeOrmModule }   from '@nestjs/typeorm';
import { BullModule }      from '@nestjs/bull';
import { UploadService }   from './upload.service';
import { UploadController } from './upload.controller';
import { R2ApiService }    from './r2.service';
import { TranscodingService } from '../transcoding/transcoding.service';
import { VideoAssetEntity } from '../content/entities/video-asset.entity';
import { ContentEntity }   from '../content/entities/content.entity';
import { EpisodeEntity }   from '../content/entities/episode.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([VideoAssetEntity, ContentEntity, EpisodeEntity]),
    BullModule.registerQueue({ name: 'transcode' }),
  ],
  providers:   [UploadService, R2ApiService, TranscodingService],
  controllers: [UploadController],
  exports:     [R2ApiService, TranscodingService],
})
export class UploadModule {}
