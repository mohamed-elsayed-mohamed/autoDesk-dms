import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import Decimal from 'decimal.js';

@Injectable()
export class LendersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(includeInactive = false) {
    return this.prisma.lender.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findActive() {
    return this.prisma.lender.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.lender.findUnique({ where: { id } });
  }

  async create(data: { name: string; isActive?: boolean; maxMarkupCap?: Decimal }) {
    return this.prisma.lender.create({ data });
  }

  async update(
    id: string,
    data: Partial<{ name: string; isActive: boolean; maxMarkupCap: Decimal | null }>,
  ) {
    return this.prisma.lender.update({ where: { id }, data });
  }
}
