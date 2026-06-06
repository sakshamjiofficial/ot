import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { ContentEntity } from './content.entity';
import { EpisodeEntity } from './episode.entity';

@Entity('watch_history')
@Unique(['userId', 'contentId', 'episodeId'])
export class WatchHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'content_id', nullable: true })
  @Index()
  contentId: string;

  @ManyToOne(() => ContentEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'content_id' })
  content: ContentEntity;

  @Column({ name: 'episode_id', nullable: true })
  episodeId: string;

  @ManyToOne(() => EpisodeEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'episode_id' })
  episode: EpisodeEntity;

  @Column({ name: 'device_id', nullable: true })
  deviceId: string;

  @Column({ name: 'watched_seconds', type: 'int', default: 0 })
  watchedSeconds: number;

  @Column({ name: 'total_seconds', type: 'int', nullable: true })
  totalSeconds: number;

  @Column({ default: false })
  completed: boolean;

  @Column({ name: 'last_watched_at', type: 'timestamptz', default: () => 'NOW()' })
  lastWatchedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
