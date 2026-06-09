import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HomeSectionEntity } from './entities/home-section.entity';
import { HomeSectionsService } from './home-sections.service';
import { HomeSectionsController } from './home-sections.controller';

@Module({
  imports: [TypeOrmModule.forFeature([HomeSectionEntity])],
  controllers: [HomeSectionsController],
  providers: [HomeSectionsService],
  exports: [HomeSectionsService],
})
export class HomeSectionsModule {}
