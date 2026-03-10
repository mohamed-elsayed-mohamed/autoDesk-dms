import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { FiProductStatus, FiProductType, Prisma } from '@prisma/client';
import Decimal from 'decimal.js';

@Injectable()
export class FiProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByDealId(dealId: string) {
    return this.prisma.fIProduct.findMany({
      where: { dealId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.fIProduct.findUnique({ where: { id } });
  }

  async create(
    data: {
      dealId: string;
      productType: FiProductType;
      providerName: string;
      cost: Decimal;
      sellingPrice: Decimal;
      termMonths: number;
      deductible?: Decimal;
      contractNumber?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.fIProduct.create({ data });
  }

  async update(
    id: string,
    data: Partial<{
      productType: FiProductType;
      providerName: string;
      cost: Decimal;
      sellingPrice: Decimal;
      termMonths: number;
      deductible: Decimal | null;
      contractNumber: string | null;
      status: FiProductStatus;
      chargebackAmount: Decimal | null;
      chargebackDate: Date | null;
      chargebackRecordedById: string | null;
    }>,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.fIProduct.update({ where: { id }, data });
  }

  async softDelete(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.fIProduct.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
