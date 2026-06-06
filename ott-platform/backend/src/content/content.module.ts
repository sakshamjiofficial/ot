import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentService }     from './content.service';
import { ContentController }  from './content.controller';
import { ContentEntity }      from './entities/content.entity';
import { SeasonEntity }       from './entities/season.entity';
import { EpisodeEntity }      from './entities/episode.entity';
import { GenreEntity }        from './entities/genre.entity';
import { WatchHistoryEntity } from './entities/watch-history.entity';
import {
  VideoAssetEntity,
  VideoRenditionEntity,
  SubtitleEntity,
  AudioTrackEntity,
} from './entities/video-asset.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContentEntity,
      SeasonEntity,
      EpisodeEntity,
      GenreEntity,
      WatchHistoryEntity,
      VideoAssetEntity,
      VideoRenditionEntity,
      SubtitleEntity,
      AudioTrackEntity,
    ]),
  ],
  providers:   [ContentService],
  controllers: [ContentController],
  exports:     [ContentService],
})
export class ContentModule {}
