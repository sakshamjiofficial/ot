import {
  Injectable, Logger, BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto       from 'crypto';
import Razorpay          from 'razorpay';

export interface RazorpayOrder {
  id:       string;
  amount:   number;    // paise (INR × 100)
  currency: string;
  receipt:  string;
  keyId:    string;
}

export interface RazorpayVerifyResult {
  isValid:       boolean;
  paymentId:     string;
  paymentMethod: string;
}

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly rzp:   Razorpay;
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor(private configService: ConfigService) {
    this.keyId        = this.configService.get<string>('app.razorpay.keyId');
    this.keySecret    = this.configService.get<string>('app.razorpay.secret');
    this.webhookSecret = this.configService.get<string>('app.razorpay.webhook');

    this.rzp = new Razorpay({
      key_id:     this.keyId,
      key_secret: this.keySecret,
    });
  }

  // ─── Create Order ─────────────────────────────────────────

  async createOrder(
    amountInr:  number,
    receipt:    string,
    notes?:     Record<string, string>,
  ): Promise<RazorpayOrder> {
    try {
      const order = await this.rzp.orders.create({
        amount:   Math.round(amountInr * 100),   // rupees → paise
        currency: 'INR',
        receipt,
        notes:    notes || {},
        payment_capture: true,
      });

      this.logger.log(`Razorpay order created: ${order.id} for ₹${amountInr}`);

      return {
        id:       order.id,
        amount:   order.amount as number,
        currency: order.currency,
        receipt:  order.receipt,
        keyId:    this.keyId,
      };
    } catch (err) {
      this.logger.error('Razorpay order creation failed', err);
      throw new InternalServerErrorException('Payment service unavailable. Please try again.');
    }
  }

  // ─── Verify Payment Signature ─────────────────────────────

  verifyPaymentSignature(
    orderId:   string,
    paymentId: string,
    signature: string,
  ): boolean {
    // Razorpay signature = HMAC_SHA256(orderId + "|" + paymentId, keySecret)
    const body     = `${orderId}|${paymentId}`;
    const expected = crypto
      .createHmac('sha256', this.keySecret)
      .update(body)
      .digest('hex');

    // Constant-time comparison
    const expectedBuf = Buffer.from(expected, 'hex');
    const receivedBuf = Buffer.from(signature, 'hex');

    if (expectedBuf.length !== receivedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  }

  // ─── Fetch Payment Details ────────────────────────────────

  async fetchPayment(paymentId: string): Promise<{
    method:  string;
    status:  string;
    amount:  number;
    email:   string;
    contact: string;
  }> {
    try {
      const payment = await this.rzp.payments.fetch(paymentId);
      return {
        method:  payment.method    as string,
        status:  payment.status,
        amount:  (payment.amount as number) / 100,
        email:   payment.email     as string,
        contact: payment.contact   as string,
      };
    } catch (err) {
      this.logger.error(`Failed to fetch payment ${paymentId}`, err);
      throw new InternalServerErrorException('Could not verify payment details');
    }
  }

  // ─── Verify Webhook Signature ─────────────────────────────

  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!this.webhookSecret) return false;
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(body)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature),
    );
  }

  // ─── Refund ───────────────────────────────────────────────

  async refund(paymentId: string, amountInr: number): Promise<string> {
    try {
      const refund = await this.rzp.payments.refund(paymentId, {
        amount: Math.round(amountInr * 100),
        speed:  'normal',
        notes:  { reason: 'Customer requested refund' },
      });
      this.logger.log(`Refund created: ${refund.id} for payment ${paymentId}`);
      return refund.id;
    } catch (err) {
      this.logger.error(`Refund failed for ${paymentId}`, err);
      throw new InternalServerErrorException('Refund processing failed');
    }
  }
}
