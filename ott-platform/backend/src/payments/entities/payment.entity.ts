import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { SubscriptionEntity } from '../../subscriptions/entities/subscription.entity';

export enum PaymentStatus {
  PENDING  = 'pending',
  SUCCESS  = 'success',
  FAILED   = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentGateway {
  RAZORPAY   = 'razorpay',
  GOOGLE_PLAY = 'google_play',
  FREE        = 'free',
}

@Entity('payments')
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'subscription_id', nullable: true })
  subscriptionId: string;

  @ManyToOne(() => SubscriptionEntity, { nullable: true })
  @JoinColumn({ name: 'subscription_id' })
  subscription: SubscriptionEntity;

  @Column({ name: 'plan_id', nullable: true })
  planId: number;

  @Column({
    type:    'enum',
    enum:    PaymentGateway,
    default: PaymentGateway.RAZORPAY,
  })
  gateway: PaymentGateway;

  @Column({ name: 'razorpay_order_id',   length: 100, unique: true, nullable: true })
  razorpayOrderId: string;

  @Column({ name: 'razorpay_payment_id', length: 100, unique: true, nullable: true })
  razorpayPaymentId: string;

  @Column({ name: 'razorpay_signature',  type: 'text', nullable: true })
  razorpaySignature: string;

  @Column({ name: 'play_order_id', length: 200, nullable: true })
  playOrderId: string;

  @Column({ name: 'play_purchase_token', type: 'text', nullable: true })
  playPurchaseToken: string;

  @Column({ name: 'amount_inr', type: 'numeric', precision: 10, scale: 2 })
  amountInr: number;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ name: 'payment_method', length: 50, nullable: true })
  paymentMethod: string;

  @Column({ name: 'coupon_code', length: 50, nullable: true })
  couponCode: string;

  @Column({ name: 'discount_amount', type: 'numeric', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ name: 'invoice_number', length: 50, nullable: true })
  invoiceNumber: string;

  @Column({ name: 'invoice_url', type: 'text', nullable: true })
  invoiceUrl: string;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
