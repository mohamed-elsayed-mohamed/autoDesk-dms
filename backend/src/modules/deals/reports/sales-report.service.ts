import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { SalesReportQueryDto } from '../dto/sales-report-query.dto';
import { DealStatus } from '@prisma/client';
import * as fastCsv from 'fast-csv';

interface SalespersonBreakdown {
  userId: string;
  name: string;
  totalUnits: number;
  totalFrontEndGross: number;
  avgFrontEndGross: number;
  totalBackEndGross: number;
  avgBackEndGross: number;
}

export interface SalesReportData {
  startDate: string;
  endDate: string;
  totalUnits: number;
  totalFrontEndGross: number;
  avgFrontEndGross: number;
  totalBackEndGross: number;
  avgBackEndGross: number;
  bySalesperson: SalespersonBreakdown[];
}

const fmt = (n: number) => Number(n.toFixed(2));

@Injectable()
export class SalesReportService {
  constructor(private readonly prisma: PrismaService) {}

  async aggregateReport(dto: SalesReportQueryDto): Promise<SalesReportData> {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    // Include the entire end date
    end.setHours(23, 59, 59, 999);

    const deals = await this.prisma.deal.findMany({
      where: {
        status: DealStatus.Funded,
        fundedAt: { gte: start, lte: end },
      },
      select: {
        createdById: true,
        frontEndGross: true,
        backEndGross: true,
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    const byUser = new Map<string, { name: string; frontEnds: number[]; backEnds: number[] }>();

    for (const deal of deals) {
      const entry = byUser.get(deal.createdById) ?? {
        name: `${deal.createdBy.firstName} ${deal.createdBy.lastName}`,
        frontEnds: [],
        backEnds: [],
      };
      entry.frontEnds.push(Number(deal.frontEndGross));
      entry.backEnds.push(Number(deal.backEndGross ?? 0));
      byUser.set(deal.createdById, entry);
    }

    const bySalesperson: SalespersonBreakdown[] = Array.from(byUser.entries()).map(
      ([userId, { name, frontEnds, backEnds }]) => {
        const totalFrontEndGross = frontEnds.reduce((s, v) => s + v, 0);
        const totalBackEndGross = backEnds.reduce((s, v) => s + v, 0);
        return {
          userId,
          name,
          totalUnits: frontEnds.length,
          totalFrontEndGross: fmt(totalFrontEndGross),
          avgFrontEndGross: fmt(frontEnds.length > 0 ? totalFrontEndGross / frontEnds.length : 0),
          totalBackEndGross: fmt(totalBackEndGross),
          avgBackEndGross: fmt(backEnds.length > 0 ? totalBackEndGross / backEnds.length : 0),
        };
      },
    );

    const totalUnits = deals.length;
    const totalFrontEndGross = deals.reduce((s, d) => s + Number(d.frontEndGross), 0);
    const totalBackEndGross = deals.reduce((s, d) => s + Number(d.backEndGross ?? 0), 0);

    return {
      startDate: dto.startDate,
      endDate: dto.endDate,
      totalUnits,
      totalFrontEndGross: fmt(totalFrontEndGross),
      avgFrontEndGross: fmt(totalUnits > 0 ? totalFrontEndGross / totalUnits : 0),
      totalBackEndGross: fmt(totalBackEndGross),
      avgBackEndGross: fmt(totalUnits > 0 ? totalBackEndGross / totalUnits : 0),
      bySalesperson,
    };
  }

  async generateCsv(dto: SalesReportQueryDto): Promise<Buffer> {
    const report = await this.aggregateReport(dto);

    const rows = [
      {
        Salesperson: 'ALL CONSULTANTS',
        'Total Units': report.totalUnits,
        'Total Front-End Gross': report.totalFrontEndGross,
        'Avg Front-End Gross': report.avgFrontEndGross,
        'Total Back-End Gross': report.totalBackEndGross,
        'Avg Back-End Gross': report.avgBackEndGross,
      },
      ...report.bySalesperson.map((sp) => ({
        Salesperson: sp.name,
        'Total Units': sp.totalUnits,
        'Total Front-End Gross': sp.totalFrontEndGross,
        'Avg Front-End Gross': sp.avgFrontEndGross,
        'Total Back-End Gross': sp.totalBackEndGross,
        'Avg Back-End Gross': sp.avgBackEndGross,
      })),
    ];

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = fastCsv.format({ headers: true });
      stream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
      rows.forEach((row) => stream.write(row));
      stream.end();
    });
  }
}
