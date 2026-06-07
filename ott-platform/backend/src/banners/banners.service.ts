import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BannerEntity } from './entities/banner.entity';

@Injectable()
export class BannersService {
  constructor(
    @InjectRepository(BannerEntity)
    private readonly bannerRepo: Repository<BannerEntity>,
  ) {}

  async findAllActive(): Promise<BannerEntity[]> {
    const now = new Date();
    return this.bannerRepo
      .createQueryBuilder('b')
      .where('b.is_active = true')
      .andWhere('(b.starts_at IS NULL OR b.starts_at <= :now)', { now })
      .andWhere('(b.ends_at IS NULL OR b.ends_at >= :now)', { now })
      .orderBy('b.sort_order', 'ASC')
      .getMany();
  }

  async findAll(): Promise<BannerEntity[]> {
    return this.bannerRepo.find({
      order: { sortOrder: 'ASC' },
    });
  }

  async findOne(id: string): Promise<BannerEntity> {
    const banner = await this.bannerRepo.findOne({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    return banner;
  }

  async create(dto: any): Promise<BannerEntity> {
    const banner = this.bannerRepo.create(dto);
    return this.bannerRepo.save(banner) as any;
  }

  async update(id: string, dto: any): Promise<BannerEntity> {
    const banner = await this.findOne(id);
    Object.assign(banner, dto);
    return this.bannerRepo.save(banner) as any;
  }

  async delete(id: string): Promise<void> {
    const banner = await this.findOne(id);
    await this.bannerRepo.remove(banner);
  }
}
