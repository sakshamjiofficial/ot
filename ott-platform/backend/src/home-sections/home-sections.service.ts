import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HomeSectionEntity } from './entities/home-section.entity';

@Injectable()
export class HomeSectionsService {
  constructor(
    @InjectRepository(HomeSectionEntity)
    private readonly homeSectionRepo: Repository<HomeSectionEntity>,
  ) {}

  async findAll(): Promise<HomeSectionEntity[]> {
    return this.homeSectionRepo.find({
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<HomeSectionEntity> {
    const section = await this.homeSectionRepo.findOne({ where: { id } });
    if (!section) throw new NotFoundException('Home section not found');
    return section;
  }

  async create(dto: any): Promise<HomeSectionEntity> {
    const section = this.homeSectionRepo.create(dto);
    return this.homeSectionRepo.save(section) as any;
  }

  async update(id: number, dto: any): Promise<HomeSectionEntity> {
    const section = await this.findOne(id);
    Object.assign(section, dto);
    return this.homeSectionRepo.save(section) as any;
  }

  async delete(id: number): Promise<void> {
    const section = await this.findOne(id);
    await this.homeSectionRepo.remove(section);
  }

  async reorder(sectionIds: number[]): Promise<void> {
    await this.homeSectionRepo.manager.transaction(async (manager) => {
      for (let index = 0; index < sectionIds.length; index++) {
        const id = sectionIds[index];
        await manager.update(HomeSectionEntity, id, { sortOrder: index + 1 });
      }
    });
  }
}
