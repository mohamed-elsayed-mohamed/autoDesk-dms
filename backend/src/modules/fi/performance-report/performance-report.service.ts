import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { FiProductStatus } from '@prisma/client';
import Decimal from 'decimal.js';
import { format as formatCsv } from 'fast-csv';
import { Readable } from 'stream';

export interface PerformanceReport {
  from: string;
  to: string;
  fundedUnits: number;
  grossFiRevenue: string;
  totalChargebacks: string;
  netFiRevenue: string;
  pvr: string | null;
  deals: Array<{
    dealId: string;
    dealNumber: number;
    fundedAt: Date | null;
    products: Array<{
      id: string;
      productType: string;
      providerName: string;
      status: string;
      cost: string;
      sellingPrice: string;
      gross: string;
    }>;
    chargebacks: Array<{
      id: string;
      productType: string;
      chargebackAmount: string;
      chargebackDate: Date | null;
    }>;
    dealFiRevenue: string;
    dealChargebacks: string;
    dealNetRevenue: string;
  }>;
}

@Injectable()
export class PerformanceReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getReport(from: Date, to: Date): Promise<PerformanceReport> {
    // Revenue query: funded deals with active/cancelled products
    const fundedDeals = await this.prisma.deal.findMany({
      where: {
        fundedAt: { gte: from, lte: to },
      },
      include: {
        fiProducts: {
          where: {
            deletedAt: null,
            status: { in: [FiProductStatus.Active, FiProductStatus.Cancelled] },
          },
        },
      },
      orderBy: { fundedAt: 'asc' },
    });

    // Chargeback query: products with chargebackDate in range
    const chargebackProducts = await this.prisma.fIProduct.findMany({
      where: {
        chargebackDate: { gte: from, lte: to },
        status: FiProductStatus.ChargedBack,
        deletedAt: null,
      },
      include: { deal: { select: { id: true, dealNumber: true, fundedAt: true } } },
    });

    // Build chargeback map by dealId
    const chargebacksByDeal = new Map<string, typeof chargebackProducts>();
    for (const cb of chargebackProducts) {
      const list = chargebacksByDeal.get(cb.dealId) ?? [];
      list.push(cb);
      chargebacksByDeal.set(cb.dealId, list);
    }

    let grossFiRevenue = new Decimal(0);
    let totalChargebacks = new Decimal(0);

    const deals = fundedDeals.map((deal) => {
      const dealFiRevenue = deal.fiProducts.reduce(
        (sum, p) =>
          sum.plus(new Decimal(p.sellingPrice.toString()).minus(new Decimal(p.cost.toString()))),
        new Decimal(0),
      );

      const dealChargebacksList = chargebacksByDeal.get(deal.id) ?? [];
      const dealChargebacks = dealChargebacksList.reduce(
        (sum, p) => sum.plus(new Decimal(p.chargebackAmount?.toString() ?? '0')),
        new Decimal(0),
      );

      grossFiRevenue = grossFiRevenue.plus(dealFiRevenue);
      totalChargebacks = totalChargebacks.plus(dealChargebacks);

      return {
        dealId: deal.id,
        dealNumber: deal.dealNumber,
        fundedAt: deal.fundedAt,
        products: deal.fiProducts.map((p) => ({
          id: p.id,
          productType: p.productType,
          providerName: p.providerName,
          status: p.status,
          cost: p.cost.toString(),
          sellingPrice: p.sellingPrice.toString(),
          gross: new Decimal(p.sellingPrice.toString())
            .minus(new Decimal(p.cost.toString()))
            .toString(),
        })),
        chargebacks: dealChargebacksList.map((p) => ({
          id: p.id,
          productType: p.productType,
          chargebackAmount: p.chargebackAmount?.toString() ?? '0',
          chargebackDate: p.chargebackDate,
        })),
        dealFiRevenue: dealFiRevenue.toString(),
        dealChargebacks: dealChargebacks.toString(),
        dealNetRevenue: dealFiRevenue.minus(dealChargebacks).toString(),
      };
    });

    const fundedUnits = fundedDeals.length;
    const netFiRevenue = grossFiRevenue.minus(totalChargebacks);
    const pvr = fundedUnits > 0 ? netFiRevenue.dividedBy(fundedUnits).toFixed(2) : null;

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      fundedUnits,
      grossFiRevenue: grossFiRevenue.toFixed(2),
      totalChargebacks: totalChargebacks.toFixed(2),
      netFiRevenue: netFiRevenue.toFixed(2),
      pvr,
      deals,
    };
  }

  async generateCsv(from: Date, to: Date): Promise<Readable> {
    const report = await this.getReport(from, to);

    const rows: Record<string, any>[] = [];

    for (const deal of report.deals) {
      if (deal.products.length === 0 && deal.chargebacks.length === 0) {
        rows.push({
          dealId: deal.dealId,
          dealNumber: deal.dealNumber,
          fundedAt: deal.fundedAt?.toISOString() ?? '',
          productType: '',
          providerName: '',
          productStatus: '',
          cost: '',
          sellingPrice: '',
          gross: '',
          chargebackAmount: '',
          chargebackDate: '',
          rowType: 'deal',
        });
      }

      for (const p of deal.products) {
        rows.push({
          dealId: deal.dealId,
          dealNumber: deal.dealNumber,
          fundedAt: deal.fundedAt?.toISOString() ?? '',
          productType: p.productType,
          providerName: p.providerName,
          productStatus: p.status,
          cost: p.cost,
          sellingPrice: p.sellingPrice,
          gross: p.gross,
          chargebackAmount: '',
          chargebackDate: '',
          rowType: 'product',
        });
      }

      for (const cb of deal.chargebacks) {
        rows.push({
          dealId: deal.dealId,
          dealNumber: deal.dealNumber,
          fundedAt: deal.fundedAt?.toISOString() ?? '',
          productType: cb.productType,
          providerName: '',
          productStatus: 'ChargedBack',
          cost: '',
          sellingPrice: '',
          gross: '',
          chargebackAmount: cb.chargebackAmount,
          chargebackDate: cb.chargebackDate?.toISOString() ?? '',
          rowType: 'chargeback',
        });
      }
    }

    // Summary row
    rows.push({
      dealId: 'SUMMARY',
      dealNumber: '',
      fundedAt: '',
      productType: '',
      providerName: '',
      productStatus: '',
      cost: '',
      sellingPrice: '',
      gross: report.grossFiRevenue,
      chargebackAmount: report.totalChargebacks,
      chargebackDate: '',
      rowType: 'summary',
    });

    const csvStream = formatCsv({ headers: true });
    const passThrough = new Readable({ read() {} });

    let csvData = '';
    csvStream.on('data', (chunk: Buffer) => {
      csvData += chunk.toString();
    });
    csvStream.on('end', () => {
      passThrough.push(csvData);
      passThrough.push(null);
    });

    for (const row of rows) {
      csvStream.write(row);
    }
    csvStream.end();

    return passThrough;
  }
}
