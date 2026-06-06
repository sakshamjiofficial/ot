import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CouponEntity, DiscountType } from './entities/coupon.entity';

export interface CouponValidation {
  isValid:       boolean;
  coupon?:       CouponEntity;
  discountAmount: number;
  finalAmount:   number;
  message:       string;
}

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(
    @InjectRepository(CouponEntity)
    private couponRepo: Repository<CouponEntity>,
  ) {}

  // ─── Validate without redeeming ──────────────────────────

  async validate(
    code:        string,
    planId:      number,
    priceInr:    number,
  ): Promise<CouponValidation> {
    const coupon = await this.couponRepo.findOne({
      where: { code: code.toUpperCase().trim(), isActive: true },
    });

    if (!coupon) {
      return { isValid: false, discountAmount: 0, finalAmount: priceInr, message: 'Invalid coupon code' };
    }

    // Expiry check
    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return { isValid: false, discountAmount: 0, finalAmount: priceInr, message: 'Coupon has expired' };
    }

    // Usage limit check
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return { isValid: false, discountAmount: 0, finalAmount: priceInr, message: 'Coupon usage limit reached' };
    }

    // Plan restriction check
    if (coupon.planId !== null && coupon.planId !== planId) {
      return { isValid: false, discountAmount: 0, finalAmount: priceInr, message: 'Coupon not valid for this plan' };
    }

    // Minimum amount check
    if (priceInr < coupon.minAmountInr) {
      return {
        isValid: false, discountAmount: 0, finalAmount: priceInr,
        message: `Minimum order value ₹${coupon.minAmountInr} required`,
      };
    }

    // Calculate discount
    let discountAmount: number;
    if (coupon.discountType === DiscountType.PERCENT) {
      discountAmount = Math.round((priceInr * coupon.discountValue) / 100 * 100) / 100;
    } else {
      discountAmount = Math.min(coupon.discountValue, priceInr);
    }

    const finalAmount = Math.max(0, priceInr - discountAmount);

    return {
      isValid: true,
      coupon,
      discountAmount,
      finalAmount,
      message: `${coupon.discountType === DiscountType.PERCENT ? coupon.discountValue + '%' : '₹' + coupon.discountValue} discount applied`,
    };
  }

  // ─── Redeem (increment usage) ─────────────────────────────

  async redeem(code: string): Promise<void> {
    await this.couponRepo
      .createQueryBuilder()
      .update(CouponEntity)
      .set({ usedCount: () => '"used_count" + 1' })
      .where('code = :code', { code: code.toUpperCase().trim() })
      .execute();
    this.logger.log(`Coupon redeemed: ${code}`);
  }

  // ─── Admin CRUD ───────────────────────────────────────────

  async createCoupon(data: Partial<CouponEntity>): Promise<CouponEntity> {
    const existing = await this.couponRepo.findOne({
      where: { code: data.code.toUpperCase() },
    });
    if (existing) throw new BadRequestException('Coupon code already exists');

    const coupon = this.couponRepo.create({
      ...data,
      code: data.code.toUpperCase(),
    });
    return this.couponRepo.save(coupon);
  }

  async listCoupons(): Promise<CouponEntity[]> {
    return this.couponRepo.find({ order: { createdAt: 'DESC' } });
  }

  async toggleCoupon(id: string): Promise<CouponEntity> {
    const coupon = await this.couponRepo.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    coupon.isActive = !coupon.isActive;
    return this.couponRepo.save(coupon);
  }

  async deleteCoupon(id: string): Promise<void> {
    await this.couponRepo.delete(id);
  }
}
