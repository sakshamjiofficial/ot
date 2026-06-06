import {
  IsInt, IsString, IsOptional, IsEnum,
  IsBoolean, Min, Max, IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({ description: 'Subscription plan ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  planId: number;

  @ApiPropertyOptional({ description: 'Coupon code for discount' })
  @IsOptional()
  @IsString()
  couponCode?: string;
}

export class VerifyRazorpayDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  razorpayOrderId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  razorpayPaymentId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  razorpaySignature: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  couponCode?: string;
}

export class VerifyPlayBillingDto {
  @ApiProperty({ description: 'Google Play purchase token' })
  @IsString()
  @IsNotEmpty()
  purchaseToken: string;

  @ApiProperty({ description: 'Google Play product / subscription ID' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({ description: 'Internal plan ID to map to' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  planId?: number;
}

export class ValidateCouponDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  planId: number;
}

export class CreatePlanDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  planType: string;

  @ApiProperty()
  @Type(() => Number)
  priceInr: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  durationDays: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxDevices?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maxQuality?: string;
}

export class StartFreeTrialDto {
  @ApiProperty({ description: 'Plan ID to trial (usually premium)' })
  @Type(() => Number)
  @IsInt()
  planId: number;
}

export class UpdatePlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  planType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  priceInr?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  durationDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxDevices?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maxQuality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
