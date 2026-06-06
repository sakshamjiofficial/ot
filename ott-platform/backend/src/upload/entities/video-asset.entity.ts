import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('video_assets')
export class VideoAssetEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'content_id', type: 'uuid', nullable: true })
  contentId: string;

  @Column({ name: 'episode_id', type: 'uuid', nullable: true })
  episodeId: string;

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

  // Not in original schema — added as nullable for upload tracking
  @Column({ name: 'r2_upload_id', type: 'text', nullable: true })
  r2UploadId: string;

  @Column({ name: 'raw_key', type: 'text', nullable: true })
  rawKey: string;

  @Column({ name: 'upload_status', type: 'varchar', length: 20, default: 'pending' })
  uploadStatus: string;  // pending | uploading | uploaded | aborted

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
