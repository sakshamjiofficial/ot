import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

export enum SubscriptionPlanType {
  FREE    = 'free',
  BASIC   = 'basic',
  PREMIUM = 'premium',
  FAMILY  = 'family',
}

export enum SubscriptionStatus {
  ACTIVE    = 'active',
  EXPIRED   = 'expired',
  CANCELLED = 'cancelled',
  TRIAL     = 'trial',
}

// ─── Plan ─────────────────────────────────────────────────────

@Entity('subscription_plans')
export class SubscriptionPlanEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'plan_type', type: 'enum', enum: SubscriptionPlanType })
  planType: SubscriptionPlanType;

  @Column({ name: 'price_inr', type: 'numeric', precision: 10, scale: 2 })
  priceInr: number;

  @Column({ name: 'duration_days' })
  durationDays: number;

  @Column({ name: 'max_devices', type: 'smallint', default: 1 })
  maxDevices: number;

  @Column({ name: 'max_quality', length: 10, default: '1080p' })
  maxQuality: string;

  @Column({ type: 'jsonb', default: '{}' })
  features: Record<string, any>;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'razorpay_plan_id', length: 100, nullable: true })
  razorpayPlanId: string;
}

// ─── Subscription ─────────────────────────────────────────────

@Entity('subscriptions')
export class SubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'plan_id' })
  planId: number;

  @ManyToOne(() => SubscriptionPlanEntity)
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlanEntity;

  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.TRIAL })
  status: SubscriptionStatus;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  @Index()
  expiresAt: Date;

  @Column({ name: 'auto_renew', default: true })
  autoRenew: boolean;

  @Column({ name: 'razorpay_sub_id', length: 100, nullable: true })
  razorpaySubId: string;

  @Column({ name: 'play_purchase_token', type: 'text', nullable: true })
  playPurchaseToken: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
