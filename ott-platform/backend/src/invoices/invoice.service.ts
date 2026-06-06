import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }       from '@nestjs/config';
import { InjectRepository }    from '@nestjs/typeorm';
import { Repository }          from 'typeorm';
import { PaymentEntity }       from '../payments/entities/payment.entity';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomBytes }         from 'crypto';

export interface InvoiceData {
  invoiceNumber:   string;
  date:            string;
  customerName:    string;
  customerEmail:   string;
  planName:        string;
  planDuration:    string;
  amountInr:       number;
  discountAmount:  number;
  finalAmount:     number;
  paymentMethod:   string;
  razorpayOrderId?: string;
  transactionId:   string;
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);
  private readonly s3:     S3Client;
  private readonly bucket: string;
  private readonly cdnBase: string;

  constructor(
    @InjectRepository(PaymentEntity)
    private paymentRepo: Repository<PaymentEntity>,
    private configService: ConfigService,
  ) {
    this.bucket  = this.configService.get('app.cloudflare.r2Bucket', 'ott-media');
    this.cdnBase = this.configService.get('CF_R2_PUBLIC_URL', `https://${this.bucket}.r2.dev`);

    this.s3 = new S3Client({
      region:   'auto',
      endpoint: this.configService.get('app.cloudflare.r2Endpoint'),
      credentials: {
        accessKeyId:     this.configService.get('app.cloudflare.r2AccessKey'),
        secretAccessKey: this.configService.get('app.cloudflare.r2SecretKey'),
      },
    });
  }

  // ─── Generate invoice number ──────────────────────────────

  generateInvoiceNumber(): string {
    const date   = new Date();
    const year   = date.getFullYear();
    const month  = String(date.getMonth() + 1).padStart(2, '0');
    const random = randomBytes(3).toString('hex').toUpperCase();
    return `OTT-${year}${month}-${random}`;
  }

  // ─── Build HTML invoice ───────────────────────────────────

  private buildInvoiceHtml(data: InvoiceData): string {
    const logoColor = '#E50914';
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a1a; font-size: 14px; }
  .container { max-width: 680px; margin: 0 auto; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
  .logo { display: flex; align-items: center; gap: 10px; }
  .logo-box { background: ${logoColor}; width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 22px; font-weight: 900; }
  .logo-text { font-size: 22px; font-weight: 800; color: #0a0a0a; letter-spacing: -0.5px; }
  .invoice-title { text-align: right; }
  .invoice-title h1 { font-size: 28px; font-weight: 300; color: #555; letter-spacing: 2px; text-transform: uppercase; }
  .invoice-title p { color: #888; margin-top: 4px; font-size: 13px; }
  .divider { border: none; border-top: 2px solid #f0f0f0; margin: 24px 0; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 8px; }
  .info-row { display: flex; justify-content: space-between; padding: 6px 0; }
  .info-label { color: #666; }
  .info-value { font-weight: 500; }
  .table { width: 100%; border-collapse: collapse; }
  .table th { background: #f8f8f8; padding: 12px 16px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; border-bottom: 2px solid #eee; }
  .table td { padding: 14px 16px; border-bottom: 1px solid #f0f0f0; }
  .totals { margin-top: 20px; }
  .total-row { display: flex; justify-content: space-between; padding: 6px 0; }
  .total-final { font-size: 18px; font-weight: 700; color: #0a0a0a; border-top: 2px solid #0a0a0a; padding-top: 10px; margin-top: 6px; }
  .paid-badge { display: inline-block; background: #22c55e; color: white; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .footer { margin-top: 48px; text-align: center; color: #aaa; font-size: 12px; }
  .footer a { color: ${logoColor}; text-decoration: none; }
  .highlight { color: ${logoColor}; font-weight: 600; }
</style>
</head>
<body>
<div class="container">

  <!-- Header -->
  <div class="header">
    <div class="logo">
      <div class="logo-box">▶</div>
      <div class="logo-text">OTT Platform</div>
    </div>
    <div class="invoice-title">
      <h1>Invoice</h1>
      <p class="highlight">${data.invoiceNumber}</p>
      <p>${data.date}</p>
    </div>
  </div>

  <hr class="divider">

  <!-- Billing info -->
  <div style="display: flex; justify-content: space-between; margin-bottom: 32px;">
    <div class="section">
      <div class="section-title">Billed To</div>
      <div style="font-weight: 600; font-size: 15px;">${data.customerName}</div>
      <div style="color: #666;">${data.customerEmail}</div>
    </div>
    <div class="section" style="text-align: right;">
      <div class="section-title">Payment Status</div>
      <div class="paid-badge">Paid</div>
      <div style="margin-top: 8px; color: #666; font-size: 13px;">Via ${data.paymentMethod}</div>
    </div>
  </div>

  <!-- Line items -->
  <table class="table">
    <thead>
      <tr>
        <th>Description</th>
        <th>Duration</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <strong>${data.planName} Subscription</strong><br>
          <span style="color: #888; font-size: 13px;">OTT Platform · Full access</span>
        </td>
        <td>${data.planDuration}</td>
        <td style="text-align: right;">₹${data.amountInr.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals" style="max-width: 280px; margin-left: auto; margin-top: 20px;">
    <div class="total-row">
      <span style="color: #666;">Subtotal</span>
      <span>₹${data.amountInr.toFixed(2)}</span>
    </div>
    ${data.discountAmount > 0 ? `
    <div class="total-row" style="color: #22c55e;">
      <span>Discount</span>
      <span>−₹${data.discountAmount.toFixed(2)}</span>
    </div>` : ''}
    <div class="total-row">
      <span style="color: #666;">Tax (0% GST)</span>
      <span>₹0.00</span>
    </div>
    <div class="total-row total-final">
      <span>Total Paid</span>
      <span class="highlight">₹${data.finalAmount.toFixed(2)}</span>
    </div>
  </div>

  <hr class="divider" style="margin-top: 32px;">

  <!-- Transaction details -->
  <div class="section">
    <div class="section-title">Transaction Details</div>
    <div class="info-row">
      <span class="info-label">Transaction ID</span>
      <span class="info-value" style="font-family: monospace;">${data.transactionId}</span>
    </div>
    ${data.razorpayOrderId ? `
    <div class="info-row">
      <span class="info-label">Razorpay Order</span>
      <span class="info-value" style="font-family: monospace;">${data.razorpayOrderId}</span>
    </div>` : ''}
    <div class="info-row">
      <span class="info-label">Date</span>
      <span class="info-value">${data.date}</span>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>Thank you for subscribing to OTT Platform!</p>
    <p style="margin-top: 4px;">
      Questions? Contact us at <a href="mailto:support@ssooss.store">support@ssooss.store</a>
    </p>
    <p style="margin-top: 12px; color: #ccc;">
      ssooss.store · This is a computer-generated invoice.
    </p>
  </div>

</div>
</body>
</html>`;
  }

  // ─── Generate and upload invoice ──────────────────────────

  async generateAndUpload(
    paymentId: string,
    data:      InvoiceData,
  ): Promise<string> {
    const html   = this.buildInvoiceHtml(data);
    const r2Key  = `invoices/${data.invoiceNumber}.html`;

    // Upload HTML invoice to R2 (serves as the invoice URL)
    await this.s3.send(
      new PutObjectCommand({
        Bucket:       this.bucket,
        Key:          r2Key,
        Body:         Buffer.from(html, 'utf-8'),
        ContentType:  'text/html; charset=utf-8',
        CacheControl: 'private, no-cache',    // invoices are personal
      }),
    );

    const invoiceUrl = `${this.cdnBase}/${r2Key}`;
    this.logger.log(`Invoice uploaded: ${invoiceUrl}`);

    // Update payment record
    await this.paymentRepo.update(paymentId, {
      invoiceNumber: data.invoiceNumber,
      invoiceUrl,
    });

    return invoiceUrl;
  }

  // ─── Get invoice for a payment ────────────────────────────

  async getInvoiceUrl(paymentId: string): Promise<string | null> {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    return payment?.invoiceUrl ?? null;
  }
}
