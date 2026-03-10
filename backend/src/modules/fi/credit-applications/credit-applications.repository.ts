import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreditApplicationStatus, Prisma } from '@prisma/client';
import Decimal from 'decimal.js';

@Injectable()
export class CreditApplicationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByDealId(dealId: string) {
    return this.prisma.creditApplication.findFirst({
      where: {
        dealId,
        status: { in: [CreditApplicationStatus.Draft, CreditApplicationStatus.Submitted] },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.creditApplication.findUnique({ where: { id } });
  }

  async create(data: {
    dealId: string;
    customerId: string;
    annualIncome: Decimal;
    employerName: string;
    employmentLengthMonths: number;
    housingType: Prisma.CreditApplicationCreateInput['housingType'];
    monthlyHousingPayment: Decimal;
    ssnEncrypted: string;
    ssnIv: string;
    ssnLastFour: string;
    dateOfBirth: Date;
    createdById: string;
  }) {
    return this.prisma.creditApplication.create({ data });
  }

  async update(
    id: string,
    data: Partial<{
      annualIncome: Decimal;
      employerName: string;
      employmentLengthMonths: number;
      housingType: Prisma.CreditApplicationUpdateInput['housingType'];
      monthlyHousingPayment: Decimal;
      dateOfBirth: Date;
      status: CreditApplicationStatus;
      submittedById: string;
      submittedAt: Date;
    }>,
  ) {
    return this.prisma.creditApplication.update({ where: { id }, data });
  }

  async archiveById(id: string, tx: Prisma.TransactionClient) {
    return tx.creditApplication.update({
      where: { id },
      data: { status: CreditApplicationStatus.Archived },
    });
  }
}
