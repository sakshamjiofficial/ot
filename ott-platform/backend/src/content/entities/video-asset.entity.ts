import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  Check,
} from 'typeorm';
import { ContentEntity } from './content.entity';
import { EpisodeEntity } from './episode.entity';

export enum Resolution {
  P360  = '360p',
  P480  = '480p',
  P720  = '720p',
  P1080 = '1080p',
}

@Entity('video_assets')
@Check(`"content_id" IS NOT NULL OR "episode_id" IS NOT NULL`)
export class VideoAssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'content_id', nullable: true })
  contentId: string;

  @ManyToOne(() => ContentEntity, (c) => c.videoAssets, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'content_id' })
  content: ContentEntity;

  @Column({ name: 'episode_id', nullable: true })
  episodeId: string;

  @ManyToOne(() => EpisodeEntity, (e) => e.videoAssets, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'episode_id' })
  episode: EpisodeEntity;

  @Column({ name: 'r2_base_path', type: 'text' })
  r2BasePath: string;

  @Column({ name: 'master_url', type: 'text', nullable: true })
  masterUrl: string;

  @Column({ name: 'duration_seconds', type: 'int', nullable: true })
  durationSeconds: number;

  @Column({ name: 'file_size_bytes', type: 'bigint', nullable: true })
  fileSizeBytes: number;

  @Column({ name: 'original_filename', type: 'text', nullable: true })
  originalFilename: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => VideoRenditionEntity, (r) => r.videoAsset, { cascade: true })
  renditions: VideoRenditionEntity[];

  @OneToMany(() => SubtitleEntity, (s) => s.videoAsset, { cascade: true })
  subtitles: SubtitleEntity[];

  @OneToMany(() => AudioTrackEntity, (a) => a.videoAsset, { cascade: true })
  audioTracks: AudioTrackEntity[];
}

// ─── Rendition ────────────────────────────────────────────

@Entity('video_renditions')
export class VideoRenditionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'video_asset_id' })
  videoAssetId: string;

  @ManyToOne(() => VideoAssetEntity, (va) => va.renditions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'video_asset_id' })
  videoAsset: VideoAssetEntity;

  @Column({ type: 'enum', enum: Resolution })
  resolution: Resolution;

  @Column({ name: 'bitrate_kbps', type: 'int', nullable: true })
  bitrateKbps: number;

  @Column({ name: 'playlist_url', type: 'text' })
  playlistUrl: string;

  @Column({ name: 'file_size_bytes', type: 'bigint', nullable: true })
  fileSizeBytes: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

// ─── Subtitle ─────────────────────────────────────────────

@Entity('subtitles')
export class SubtitleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'video_asset_id' })
  videoAssetId: string;

  @ManyToOne(() => VideoAssetEntity, (va) => va.subtitles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'video_asset_id' })
  videoAsset: VideoAssetEntity;

  @Column({ name: 'language_code', length: 10 })
  languageCode: string;

  @Column({ name: 'language_name', length: 100, nullable: true })
  languageName: string;

  @Column({ name: 'vtt_url', type: 'text' })
  vttUrl: string;

  @Column({ length: 10, default: 'vtt' })
  format: string;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;
}

// ─── Audio Track ──────────────────────────────────────────

@Entity('audio_tracks')
export class AudioTrackEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'video_asset_id' })
  videoAssetId: string;

  @ManyToOne(() => VideoAssetEntity, (va) => va.audioTracks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'video_asset_id' })
  videoAsset: VideoAssetEntity;

  @Column({ name: 'language_code', length: 10 })
  languageCode: string;

  @Column({ name: 'language_name', length: 100, nullable: true })
  languageName: string;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ length: 20, default: 'aac' })
  codec: string;
}
