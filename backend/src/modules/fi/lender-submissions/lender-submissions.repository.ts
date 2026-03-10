import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { LenderDecision, Prisma } from '@prisma/client';
import Decimal from 'decimal.js';

@Injectable()
export class LenderSubmissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(
    records: Array<{
      dealId: string;
      creditApplicationId: string;
      lenderId: string;
      decision: LenderDecision;
      approvedAmount: Decimal | null;
      buyRate: Decimal | null;
      maxTerm: number | null;
      stipulations: string | null;
    }>,
  ) {
    const created = await Promise.all(
      records.map((r) => this.prisma.lenderSubmission.create({ data: r })),
    );
    return created;
  }

  async findByDealId(dealId: string) {
    return this.prisma.lenderSubmission.findMany({
      where: { dealId },
      include: { lender: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.lenderSubmission.findUnique({
      where: { id },
      include: { lender: true },
    });
  }

  async getSelectedDecision(dealId: string) {
    return this.prisma.selectedLenderDecision.findUnique({
      where: { dealId },
      include: { lenderSubmission: { include: { lender: true } } },
    });
  }

  async upsertSelectedDecision(
    dealId: string,
    data: {
      lenderSubmissionId: string;
      buyRate: Decimal;
      rateMarkup: Decimal;
      sellRate: Decimal;
      selectedTerm: number;
      selectedById: string;
    },
    tx: Prisma.TransactionClient,
  ) {
    return tx.selectedLenderDecision.upsert({
      where: { dealId },
      create: {
        dealId,
        ...data,
      },
      update: {
        ...data,
        selectedAt: new Date(),
      },
    });
  }

  async markAsSelected(id: string, tx: Prisma.TransactionClient) {
    // Unselect all for this deal first, then select this one
    const submission = await tx.lenderSubmission.findUnique({ where: { id } });
    if (submission) {
      await tx.lenderSubmission.updateMany({
        where: { dealId: submission.dealId },
        data: { isSelected: false },
      });
    }
    return tx.lenderSubmission.update({
      where: { id },
      data: { isSelected: true },
    });
  }
}
