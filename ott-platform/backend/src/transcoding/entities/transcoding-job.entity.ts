import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('transcoding_jobs')
export class TranscodingJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'video_asset_id', type: 'uuid' })
  videoAssetId: string;

  @Column({ name: 'bullmq_job_id', type: 'varchar', length: 100, nullable: true })
  bullmqJobId: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;  // pending | processing | completed | failed | retrying

  @Column({ type: 'smallint', default: 5 })
  priority: number;

  @Column({ type: 'smallint', default: 0 })
  progress: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'retry_count', type: 'smallint', default: 0 })
  retryCount: number;

  @Column({ name: 'max_retries', type: 'smallint', default: 3 })
  maxRetries: number;

  @Column({ name: 'worker_id', type: 'varchar', length: 100, nullable: true })
  workerId: string;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
