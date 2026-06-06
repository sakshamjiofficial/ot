import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

export enum DiscountType {
  PERCENT = 'percent',
  FLAT    = 'flat',
}

@Entity('coupons')
export class CouponEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 50 })
  code: string;

  @Column({ name: 'discount_type', type: 'enum', enum: DiscountType })
  discountType: DiscountType;

  @Column({ name: 'discount_value', type: 'numeric', precision: 10, scale: 2 })
  discountValue: number;

  @Column({ name: 'max_uses', nullable: true })
  maxUses: number;

  @Column({ name: 'used_count', default: 0 })
  usedCount: number;

  @Column({ name: 'min_amount_inr', type: 'numeric', precision: 10, scale: 2, default: 0 })
  minAmountInr: number;

  // null = applies to all plans
  @Column({ name: 'plan_id', nullable: true })
  planId: number;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
