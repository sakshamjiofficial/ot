import { Module }           from '@nestjs/common';
import { TypeOrmModule }    from '@nestjs/typeorm';
import { BullModule }       from '@nestjs/bull';
import { TranscodingService } from './transcoding.service';
import { VideoAssetEntity }  from '../content/entities/video-asset.entity';
import { R2ApiService }      from '../upload/r2.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([VideoAssetEntity]),
    BullModule.registerQueue({ name: 'transcode' }),
  ],
  providers: [TranscodingService, R2ApiService],
  exports:   [TranscodingService],
})
export class TranscodingModule {}
