import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GenerateDocumentDto } from './dto/generate-document.dto';
import { DocumentType, GeneratedDocument } from '@prisma/client';
import { RequestingUser } from './deals.service';
import * as fs from 'fs';
import * as path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import puppeteer from 'puppeteer';

const TEMPLATES_DIR = path.join(__dirname, 'templates');

/** Replace all {{token}} placeholders in an HTML template string with data values. */
function renderTemplate(templatePath: string, data: Record<string, string>): string {
  const html = fs.readFileSync(templatePath, 'utf-8');
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? '');
}

/** Convert an HTML string to a PDF buffer using Puppeteer headless Chrome. */
async function generatePdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'Letter', printBackground: true });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const fmtPct = (n: number) => `${(n * 100).toFixed(2)}`;

@Injectable()
export class DealDocumentsService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly prisma: PrismaService) {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION ?? 'us-east-1',
    });
    this.bucket = process.env.S3_BUCKET ?? 'autodesk-dms';
  }

  private async uploadToS3(buffer: Buffer, key: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: 'application/pdf',
      }),
    );
  }

  async getPresignedDownloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn: 3600 });
  }

  async generateDocument(
    dealId: string,
    dto: GenerateDocumentDto,
    _actor: RequestingUser,
  ): Promise<GeneratedDocument> {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        customer: true,
        vehicle: true,
        fees: { orderBy: { createdAt: 'asc' } },
        tradeIn: true,
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!deal) throw new NotFoundException(`Deal ${dealId} not found.`);

    if (Number(deal.taxRate) === 0) {
      throw new UnprocessableEntityException({
        error: 'MISSING_TAX_RATE',
        message: 'A tax rate must be set before generating documents.',
      });
    }

    // Build template data map
    const feeRows = (deal.fees ?? [])
      .map(
        (f) =>
          `<tr><td>${f.name}</td><td>${f.taxable ? 'Yes' : 'No'}</td><td class="amount">${fmt.format(Number(f.amount))}</td></tr>`,
      )
      .join('\n');

    const totalFees = (deal.fees ?? []).reduce((s, f) => s + Number(f.amount), 0);

    const tradeInSection = deal.tradeIn
      ? `<div class="section">
          <div class="section-title">Trade-In Vehicle</div>
          <div class="grid-3">
            <div><div class="label">Vehicle</div><div class="value">${deal.tradeIn.year} ${deal.tradeIn.make} ${deal.tradeIn.model}</div></div>
            <div><div class="label">VIN</div><div class="value">${deal.tradeIn.vin ?? '—'}</div></div>
            <div><div class="label">Condition</div><div class="value">${deal.tradeIn.condition}</div></div>
            <div><div class="label">ACV</div><div class="value">${fmt.format(Number(deal.tradeIn.acv))}</div></div>
            <div><div class="label">Allowance</div><div class="value">${fmt.format(Number(deal.tradeIn.allowance))}</div></div>
            <div><div class="label">Payoff</div><div class="value">${fmt.format(Number(deal.tradeIn.payoff))}</div></div>
          </div>
        </div>`
      : '';

    const netTrade = deal.tradeIn
      ? Number(deal.tradeIn.allowance) - Number(deal.tradeIn.payoff)
      : 0;
    const netTradeRow = deal.tradeIn
      ? `<tr><td>Net Trade-In</td><td class="amount">(${fmt.format(netTrade)})</td></tr>`
      : '';

    const isCash = deal.dealType === 'Cash';
    const cashHide = isCash ? 'none' : 'block';

    const customerAddress = [
      deal.customer.street,
      deal.customer.city,
      deal.customer.state,
      deal.customer.zip,
    ]
      .filter(Boolean)
      .join(', ');

    const data: Record<string, string> = {
      deal_number: String(deal.dealNumber),
      date: new Date().toLocaleDateString('en-US'),
      dealership_name: 'AutoDesk DMS',
      customer_name: `${deal.customer.firstName} ${deal.customer.lastName}`,
      customer_email: deal.customer.email ?? '—',
      customer_phone: deal.customer.phone ?? '—',
      customer_address: customerAddress || '—',
      vehicle_year_make_model: `${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model}`,
      vehicle_vin: deal.vehicle.vin,
      vehicle_stock_number: String(deal.vehicle.stockNumber),
      vehicle_trim: deal.vehicle.trim ?? '—',
      vehicle_condition: deal.vehicle.condition,
      vehicle_mileage: `${deal.vehicle.mileage.toLocaleString()} mi`,
      sale_price: fmt.format(Number(deal.salePrice)),
      fee_rows: feeRows,
      total_fees: fmt.format(totalFees),
      tax_rate: fmtPct(Number(deal.taxRate)),
      total_tax: fmt.format(Number(deal.totalTax)),
      down_payment: fmt.format(Number(deal.downPayment)),
      rebates: fmt.format(Number(deal.rebates)),
      net_trade_row: netTradeRow,
      amount_financed: fmt.format(Number(deal.amountFinanced)),
      apr: fmtPct(Number(deal.apr)),
      term: String(deal.term),
      monthly_payment: fmt.format(Number(deal.monthlyPayment)),
      trade_in_section: tradeInSection,
      cash_hide: cashHide,
      sales_consultant_name: deal.createdBy
        ? `${deal.createdBy.firstName} ${deal.createdBy.lastName}`
        : '—',
    };

    const templateFile =
      dto.documentType === DocumentType.BuyersOrder
        ? 'buyers-order.template.html'
        : 'bill-of-sale.template.html';

    const templatePath = path.join(TEMPLATES_DIR, templateFile);
    const html = renderTemplate(templatePath, data);
    const pdfBuffer = await generatePdf(html);

    const timestamp = Date.now();
    const s3Key = `deals/${dealId}/documents/${dto.documentType.toLowerCase()}-${timestamp}.pdf`;

    await this.uploadToS3(pdfBuffer, s3Key);

    return this.prisma.generatedDocument.create({
      data: {
        dealId,
        documentType: dto.documentType,
        fileUrl: s3Key,
      },
    });
  }

  async listDocuments(dealId: string): Promise<GeneratedDocument[]> {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId }, select: { id: true } });
    if (!deal) throw new NotFoundException(`Deal ${dealId} not found.`);

    return this.prisma.generatedDocument.findMany({
      where: { dealId },
      orderBy: { generatedAt: 'desc' },
    });
  }

  async getDownloadUrl(dealId: string, documentId: string): Promise<{ url: string }> {
    const doc = await this.prisma.generatedDocument.findFirst({
      where: { id: documentId, dealId },
    });
    if (!doc) throw new NotFoundException(`Document ${documentId} not found on deal ${dealId}.`);

    const url = await this.getPresignedDownloadUrl(doc.fileUrl);
    return { url };
  }
}
