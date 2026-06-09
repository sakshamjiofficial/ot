import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('home_sections')
export class HomeSectionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ name: 'section_type', type: 'varchar', length: 50 })
  sectionType: string;

  @Column({ name: 'query_config', type: 'jsonb', nullable: true })
  queryConfig: any;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
