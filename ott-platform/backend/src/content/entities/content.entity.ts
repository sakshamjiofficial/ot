import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
  Index,
} from 'typeorm';
import { GenreEntity } from './genre.entity';
import { SeasonEntity } from './season.entity';
import { VideoAssetEntity } from './video-asset.entity';

import { ContentType, ContentStatus } from '../content.types';
export { ContentType, ContentStatus };

@Entity('content')
export class ContentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ContentType })
  type: ContentType;

  @Column({ length: 500 })
  title: string;

  @Index({ unique: true })
  @Column({ length: 500 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'short_description', length: 300, nullable: true })
  shortDescription: string;

  @Column({ length: 10, default: 'en' })
  language: string;

  @Column({ name: 'release_year', type: 'smallint', nullable: true })
  releaseYear: number;

  @Column({ name: 'duration_seconds', type: 'int', nullable: true })
  durationSeconds: number;

  @Column({ name: 'age_rating', length: 10, nullable: true })
  ageRating: string;

  @Column({
    type: 'enum',
    enum: ContentStatus,
    default: ContentStatus.DRAFT,
  })
  status: ContentStatus;

  @Column({ name: 'is_premium', default: false })
  isPremium: boolean;

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ name: 'is_trending', default: false })
  isTrending: boolean;

  @Column({ name: 'imdb_rating', type: 'numeric', precision: 3, scale: 1, nullable: true })
  imdbRating: number;

  @Column({ name: 'trailer_url', type: 'text', nullable: true })
  trailerUrl: string;

  @Column({ name: 'poster_url', type: 'text', nullable: true })
  posterUrl: string;

  @Column({ name: 'banner_url', type: 'text', nullable: true })
  bannerUrl: string;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl: string;

  @Column({ name: 'feature_poster_url', type: 'text', nullable: true })
  featurePosterUrl: string;

  @Column({ name: 'feature_text_image_url', type: 'text', nullable: true })
  featureTextImageUrl: string;

  @Column({ name: 'total_plays', type: 'bigint', default: 0 })
  totalPlays: number;

  @Column({ name: 'total_watch_seconds', type: 'bigint', default: 0 })
  totalWatchSeconds: number;

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // ─── Relations ────────────────────────────────────────────

  @ManyToMany(() => GenreEntity, { eager: false })
  @JoinTable({
    name: 'content_genres',
    joinColumn:        { name: 'content_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'genre_id',   referencedColumnName: 'id' },
  })
  genres: GenreEntity[];

  @OneToMany(() => SeasonEntity, (season) => season.content, { cascade: true })
  seasons: SeasonEntity[];

  @OneToMany(() => VideoAssetEntity, (asset) => asset.content)
  videoAssets: VideoAssetEntity[];
}
