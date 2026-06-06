import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { ContentEntity, ContentType, ContentStatus } from './entities/content.entity';
import { SeasonEntity } from './entities/season.entity';
import { EpisodeEntity } from './entities/episode.entity';
import { GenreEntity } from './entities/genre.entity';
import { WatchHistoryEntity } from './entities/watch-history.entity';
import {
  CreateContentDto,
  UpdateContentDto,
  CreateSeasonDto,
  CreateEpisodeDto,
  UpdateWatchProgressDto,
} from './dto/content.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    @InjectRepository(ContentEntity)
    private contentRepo: Repository<ContentEntity>,

    @InjectRepository(SeasonEntity)
    private seasonRepo: Repository<SeasonEntity>,

    @InjectRepository(EpisodeEntity)
    private episodeRepo: Repository<EpisodeEntity>,

    @InjectRepository(GenreEntity)
    private genreRepo: Repository<GenreEntity>,

    @InjectRepository(WatchHistoryEntity)
    private watchHistoryRepo: Repository<WatchHistoryEntity>,

    private dataSource: DataSource,
  ) {}

  // ─── Slug Generation ──────────────────────────────────────

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .substring(0, 490);
  }

  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug    = this.generateSlug(base);
    let attempt = 0;

    while (true) {
      const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
      const qb = this.contentRepo
        .createQueryBuilder('c')
        .where('c.slug = :candidate', { candidate });
      if (excludeId) qb.andWhere('c.id != :excludeId', { excludeId });

      const exists = await qb.getOne();
      if (!exists) return candidate;
      attempt++;
    }
  }

  // ─── Create Content ───────────────────────────────────────

  async createContent(dto: CreateContentDto, createdBy: string): Promise<ContentEntity> {
    const slug = await this.uniqueSlug(dto.title);

    const content = this.contentRepo.create({
      ...dto,
      slug,
      createdBy,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      status: dto.status || ContentStatus.DRAFT,
    });

    if (dto.genreIds?.length) {
      content.genres = await this.genreRepo.findBy({ id: In(dto.genreIds) });
    }

    const saved = await this.contentRepo.save(content);

    if (dto.status === ContentStatus.PUBLISHED) {
      saved.publishedAt = new Date();
      await this.contentRepo.save(saved);
    }

    return this.findContentById(saved.id);
  }

  // ─── List Content ─────────────────────────────────────────

  async findAllContent(
    type: ContentType,
    pagination: PaginationDto & { genreId?: number; isPremium?: boolean },
  ) {
    const { page = 1, limit = 20, search, genreId, isPremium } = pagination;
    const skip = (page - 1) * limit;

    const qb = this.contentRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.genres', 'genre')
      .where('c.type = :type', { type })
      .andWhere('c.status = :status', { status: ContentStatus.PUBLISHED })
      .orderBy('c.publishedAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (search) {
      qb.andWhere(
        `(c.title ILIKE :search OR c.description ILIKE :search)`,
        { search: `%${search}%` },
      );
    }

    if (genreId) {
      qb.andWhere('genre.id = :genreId', { genreId });
    }

    if (isPremium !== undefined) {
      qb.andWhere('c.isPremium = :isPremium', { isPremium });
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Find By ID ───────────────────────────────────────────

  async findContentById(id: string): Promise<ContentEntity> {
    const content = await this.contentRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.genres', 'genre')
      .leftJoinAndSelect('c.seasons', 'season')
      .leftJoinAndSelect('season.episodes', 'episode')
      .leftJoinAndSelect('c.videoAssets', 'asset')
      .leftJoinAndSelect('asset.renditions', 'rendition')
      .leftJoinAndSelect('asset.subtitles', 'subtitle')
      .leftJoinAndSelect('asset.audioTracks', 'audio')
      .where('c.id = :id', { id })
      .orderBy('season.seasonNumber', 'ASC')
      .addOrderBy('episode.episodeNumber', 'ASC')
      .getOne();

    if (!content) throw new NotFoundException('Content not found');
    return content;
  }

  async findContentBySlug(slug: string): Promise<ContentEntity> {
    const content = await this.contentRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.genres', 'genre')
      .leftJoinAndSelect('c.seasons', 'season')
      .leftJoinAndSelect('season.episodes', 'episode')
      .leftJoinAndSelect('c.videoAssets', 'asset')
      .leftJoinAndSelect('asset.renditions', 'rendition')
      .leftJoinAndSelect('asset.subtitles', 'subtitle')
      .leftJoinAndSelect('asset.audioTracks', 'audio')
      .where('c.slug = :slug', { slug })
      .andWhere('c.status = :status', { status: ContentStatus.PUBLISHED })
      .orderBy('season.seasonNumber', 'ASC')
      .addOrderBy('episode.episodeNumber', 'ASC')
      .getOne();

    if (!content) throw new NotFoundException('Content not found');
    return content;
  }

  // ─── Update Content ───────────────────────────────────────

  async updateContent(id: string, dto: UpdateContentDto): Promise<ContentEntity> {
    const content = await this.findContentById(id);

    if (dto.title && dto.title !== content.title) {
      content.slug = await this.uniqueSlug(dto.title, id);
    }

    Object.assign(content, {
      ...dto,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : content.scheduledAt,
    });

    if (dto.genreIds !== undefined) {
      content.genres = dto.genreIds.length
        ? await this.genreRepo.findBy({ id: In(dto.genreIds) })
        : [];
    }

    if (dto.status === ContentStatus.PUBLISHED && !content.publishedAt) {
      content.publishedAt = new Date();
    }

    return this.contentRepo.save(content);
  }

  async deleteContent(id: string): Promise<void> {
    const content = await this.findContentById(id);
    await this.contentRepo.remove(content);
  }

  // ─── Seasons ──────────────────────────────────────────────

  async createSeason(contentId: string, dto: CreateSeasonDto): Promise<SeasonEntity> {
    const content = await this.contentRepo.findOne({ where: { id: contentId } });
    if (!content) throw new NotFoundException('Content not found');
    if (content.type !== ContentType.SERIES) {
      throw new BadRequestException('Seasons only apply to series');
    }

    const season = this.seasonRepo.create({ ...dto, contentId });
    return this.seasonRepo.save(season);
  }

  async getSeasons(contentId: string): Promise<SeasonEntity[]> {
    return this.seasonRepo.find({
      where: { contentId },
      relations: ['episodes'],
      order: { seasonNumber: 'ASC' },
    });
  }

  // ─── Episodes ─────────────────────────────────────────────

  async createEpisode(
    contentId: string,
    seasonId: string,
    dto: CreateEpisodeDto,
  ): Promise<EpisodeEntity> {
    const season = await this.seasonRepo.findOne({
      where: { id: seasonId, contentId },
    });
    if (!season) throw new NotFoundException('Season not found');

    const episode = this.episodeRepo.create({
      ...dto,
      contentId,
      seasonId,
    });

    const saved = await this.episodeRepo.save(episode);

    // Update total episodes count
    const count = await this.episodeRepo.count({ where: { seasonId } });
    await this.seasonRepo.update(seasonId, { totalEpisodes: count });

    return saved;
  }

  async findEpisodeById(episodeId: string): Promise<EpisodeEntity> {
    const episode = await this.episodeRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.videoAssets', 'asset')
      .leftJoinAndSelect('asset.renditions', 'rendition')
      .leftJoinAndSelect('asset.subtitles', 'subtitle')
      .leftJoinAndSelect('asset.audioTracks', 'audio')
      .where('e.id = :episodeId', { episodeId })
      .getOne();

    if (!episode) throw new NotFoundException('Episode not found');
    return episode;
  }

  async updateEpisode(id: string, dto: Partial<CreateEpisodeDto>): Promise<EpisodeEntity> {
    const episode = await this.findEpisodeById(id);
    Object.assign(episode, dto);
    return this.episodeRepo.save(episode);
  }

  async deleteEpisode(id: string): Promise<void> {
    const episode = await this.episodeRepo.findOne({ where: { id } });
    if (!episode) throw new NotFoundException('Episode not found');
    await this.episodeRepo.remove(episode);
  }

  // ─── Watch History & Continue Watching ───────────────────

  async updateWatchProgress(
    userId: string,
    contentId: string,
    dto: UpdateWatchProgressDto,
  ): Promise<WatchHistoryEntity> {
    const completed =
      dto.totalSeconds && dto.watchedSeconds >= dto.totalSeconds * 0.9;

    // Upsert: update on conflict (user_id, content_id, episode_id)
    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(WatchHistoryEntity)
      .values({
        userId,
        contentId,
        episodeId:      dto.episodeId || null,
        deviceId:       dto.deviceId,
        watchedSeconds: dto.watchedSeconds,
        totalSeconds:   dto.totalSeconds,
        completed:      !!completed,
        lastWatchedAt:  new Date(),
      })
      .orUpdate(
        ['watched_seconds', 'total_seconds', 'completed', 'last_watched_at', 'device_id'],
        ['user_id', 'content_id', 'episode_id'],
      )
      .execute();

    // Increment play count on first meaningful watch (>10s)
    if (dto.watchedSeconds > 10) {
      await this.contentRepo
        .createQueryBuilder()
        .update()
        .set({ totalPlays: () => '"total_plays" + 1' })
        .where('id = :contentId', { contentId })
        .execute();
    }

    return this.watchHistoryRepo.findOne({
      where: { userId, contentId, episodeId: dto.episodeId || null },
    });
  }

  async getContinueWatching(userId: string, limit = 10) {
    return this.watchHistoryRepo
      .createQueryBuilder('wh')
      .leftJoinAndSelect('wh.content', 'content')
      .leftJoinAndSelect('wh.episode', 'episode')
      .where('wh.userId = :userId', { userId })
      .andWhere('wh.completed = false')
      .andWhere('wh.watchedSeconds > 10')
      .orderBy('wh.lastWatchedAt', 'DESC')
      .take(limit)
      .getMany();
  }

  async getWatchHistory(userId: string, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [items, total] = await this.watchHistoryRepo
      .createQueryBuilder('wh')
      .leftJoinAndSelect('wh.content', 'content')
      .leftJoinAndSelect('wh.episode', 'episode')
      .where('wh.userId = :userId', { userId })
      .orderBy('wh.lastWatchedAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ─── Watchlist ────────────────────────────────────────────

  async addToWatchlist(userId: string, contentId: string): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO watchlist (user_id, content_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, contentId],
    );
  }

  async removeFromWatchlist(userId: string, contentId: string): Promise<void> {
    await this.dataSource.query(
      `DELETE FROM watchlist WHERE user_id = $1 AND content_id = $2`,
      [userId, contentId],
    );
  }

  async getWatchlist(userId: string, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [rows, total]: [any[], number] = await this.dataSource.query(
      `SELECT c.*, w.added_at
       FROM watchlist w
       JOIN content c ON c.id = w.content_id
       WHERE w.user_id = $1
         AND c.status = 'published'
       ORDER BY w.added_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, skip],
    );

    const countRow = await this.dataSource.query(
      `SELECT COUNT(*) FROM watchlist WHERE user_id = $1`,
      [userId],
    );

    return {
      items: rows,
      meta: {
        total: parseInt(countRow[0]?.count || '0'),
        page, limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Homepage Sections ────────────────────────────────────

  async getTrending(limit = 20): Promise<ContentEntity[]> {
    return this.contentRepo.find({
      where: { isTrending: true, status: ContentStatus.PUBLISHED },
      relations: ['genres'],
      order: { totalPlays: 'DESC' },
      take: limit,
    });
  }

  async getFeatured(): Promise<ContentEntity[]> {
    return this.contentRepo.find({
      where: { isFeatured: true, status: ContentStatus.PUBLISHED },
      relations: ['genres'],
      order: { publishedAt: 'DESC' },
      take: 10,
    });
  }

  async getRecentlyAdded(limit = 20): Promise<ContentEntity[]> {
    return this.contentRepo.find({
      where: { status: ContentStatus.PUBLISHED },
      relations: ['genres'],
      order: { publishedAt: 'DESC' },
      take: limit,
    });
  }

  async getByGenre(genreId: number, limit = 20): Promise<ContentEntity[]> {
    return this.contentRepo
      .createQueryBuilder('c')
      .innerJoin('c.genres', 'genre', 'genre.id = :genreId', { genreId })
      .leftJoinAndSelect('c.genres', 'allGenres')
      .where('c.status = :status', { status: ContentStatus.PUBLISHED })
      .orderBy('c.totalPlays', 'DESC')
      .take(limit)
      .getMany();
  }

  // ─── Genres ───────────────────────────────────────────────

  async getAllGenres(): Promise<GenreEntity[]> {
    return this.genreRepo.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  async createGenre(name: string): Promise<GenreEntity> {
    const slug  = name.toLowerCase().replace(/\s+/g, '-');
    const genre = this.genreRepo.create({ name, slug });
    return this.genreRepo.save(genre);
  }

  async updateGenre(id: number, name: string, sortOrder?: number): Promise<GenreEntity> {
    const genre = await this.genreRepo.findOneBy({ id });
    if (!genre) {
      throw new NotFoundException(`Genre with ID ${id} not found`);
    }
    genre.name = name;
    genre.slug = name.toLowerCase().replace(/\s+/g, '-');
    if (sortOrder !== undefined) {
      genre.sortOrder = sortOrder;
    }
    return this.genreRepo.save(genre);
  }

  async deleteGenre(id: number): Promise<void> {
    const genre = await this.genreRepo.findOneBy({ id });
    if (!genre) {
      throw new NotFoundException(`Genre with ID ${id} not found`);
    }
    await this.genreRepo.remove(genre);
  }


  // ─── Play count helper ────────────────────────────────────

  async incrementPlayCount(contentId: string): Promise<void> {
    await this.contentRepo.increment({ id: contentId }, 'totalPlays', 1);
  }

  // ─── Admin stats ──────────────────────────────────────────

  async getContentStats(): Promise<Record<string, number>> {
    const [totalMovies, totalSeries, published, processing] = await Promise.all([
      this.contentRepo.count({ where: { type: ContentType.MOVIE } }),
      this.contentRepo.count({ where: { type: ContentType.SERIES } }),
      this.contentRepo.count({ where: { status: ContentStatus.PUBLISHED } }),
      this.contentRepo.count({ where: { status: ContentStatus.PROCESSING } }),
    ]);

    return { totalMovies, totalSeries, published, processing };
  }
}
