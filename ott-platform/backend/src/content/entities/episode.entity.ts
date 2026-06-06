import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { ContentEntity } from './content.entity';
import { SeasonEntity } from './season.entity';
import { VideoAssetEntity } from './video-asset.entity';
import { ContentStatus } from '../content.types';

@Entity('episodes')
@Unique(['seasonId', 'episodeNumber'])
export class EpisodeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'content_id' })
  @Index()
  contentId: string;

  @ManyToOne(() => ContentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'content_id' })
  content: ContentEntity;

  @Column({ name: 'season_id', nullable: true })
  @Index()
  seasonId: string;

  @ManyToOne(() => SeasonEntity, (season) => season.episodes, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'season_id' })
  season: SeasonEntity;

  @Column({ name: 'episode_number', type: 'smallint' })
  episodeNumber: number;

  @Column({ length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'duration_seconds', type: 'int', nullable: true })
  durationSeconds: number;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl: string;

  @Column({
    type: 'enum',
    enum: ContentStatus,
    default: ContentStatus.DRAFT,
  })
  status: ContentStatus;

  @Column({ name: 'is_premium', default: false })
  isPremium: boolean;

  @Column({ name: 'intro_start_sec', type: 'int', nullable: true })
  introStartSec: number;

  @Column({ name: 'intro_end_sec', type: 'int', nullable: true })
  introEndSec: number;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => VideoAssetEntity, (asset) => asset.episode)
  videoAssets: VideoAssetEntity[];
}
