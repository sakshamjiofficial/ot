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
import { EpisodeEntity } from './episode.entity';

@Entity('seasons')
@Unique(['contentId', 'seasonNumber'])
export class SeasonEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'content_id' })
  @Index()
  contentId: string;

  @ManyToOne(() => ContentEntity, (content) => content.seasons, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'content_id' })
  content: ContentEntity;

  @Column({ name: 'season_number', type: 'smallint' })
  seasonNumber: number;

  @Column({ length: 300, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'poster_url', type: 'text', nullable: true })
  posterUrl: string;

  @Column({ name: 'release_year', type: 'smallint', nullable: true })
  releaseYear: number;

  @Column({ name: 'total_episodes', type: 'smallint', default: 0 })
  totalEpisodes: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => EpisodeEntity, (ep) => ep.season)
  episodes: EpisodeEntity[];
}
