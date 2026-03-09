import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Deal, DealStatus, Prisma, UserRole } from '@prisma/client';

export interface CreateDealInput {
  customerId: string;
  vehicleId: string;
  dealType: Prisma.DealCreateInput['dealType'];
  createdById: string;
}

export interface UpdateDeskingInput {
  salePrice?: number;
  downPayment?: number;
  rebates?: number;
  apr?: number;
  term?: number;
  taxRate?: number;
  backEndGross?: number | null;
  dealType?: Prisma.DealUpdateInput['dealType'];
  // Recalculated values to persist
  totalTax?: number;
  amountFinanced?: number;
  monthlyPayment?: number;
  frontEndGross?: number;
}

export interface FindAllOptions {
  /** When provided, restricts results to deals created by this user (Sales Consultant scope) */
  scopedToUserId?: string;
  status?: DealStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

const DEAL_WITH_RELATIONS = {
  customer: true,
  vehicle: true,
  createdBy: { select: { id: true, firstName: true, lastName: true, role: true } },
  fees: { orderBy: { createdAt: 'asc' as const } },
  tradeIn: true,
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
  documents: { orderBy: { generatedAt: 'desc' as const } },
} satisfies Prisma.DealInclude;

@Injectable()
export class DealsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Atomically fetch the next deal number from the PostgreSQL sequence. */
  async nextDealNumber(): Promise<number> {
    const result = await this.prisma.$queryRaw<[{ nextval: bigint }]>`
      SELECT nextval('deal_number_seq')
    `;
    return Number(result[0].nextval);
  }

  /**
   * Guard against linking the same vehicle to multiple active deals.
   * Any deal not in Unwound status is considered "committed."
   */
  async checkVehicleCommitment(vehicleId: string, excludeDealId?: string): Promise<void> {
    const where: Prisma.DealWhereInput = {
      vehicleId,
      status: { not: DealStatus.Unwound },
    };
    if (excludeDealId) {
      where.id = { not: excludeDealId };
    }
    const existing = await this.prisma.deal.findFirst({ where, select: { id: true, dealNumber: true } });
    if (existing) {
      throw new ConflictException({
        error: 'VEHICLE_COMMITTED',
        message: `Vehicle is already committed to deal #${existing.dealNumber}.`,
        existingDealId: existing.id,
      });
    }
  }

  async create(input: CreateDealInput, dealNumber: number): Promise<Deal> {
    return this.prisma.deal.create({
      data: {
        dealNumber,
        customerId: input.customerId,
        vehicleId: input.vehicleId,
        dealType: input.dealType,
        createdById: input.createdById,
        status: DealStatus.Pending,
      },
    });
  }

  async findAll(options: FindAllOptions = {}): Promise<{ data: Deal[]; total: number }> {
    const { scopedToUserId, status, startDate, endDate, page = 1, pageSize = 25 } = options;

    const where: Prisma.DealWhereInput = {};
    if (scopedToUserId) where.createdById = scopedToUserId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.deal.findMany({
        where,
        include: DEAL_WITH_RELATIONS,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.deal.count({ where }),
    ]);

    return { data, total };
  }

  async findOneById(id: string): Promise<Deal & Record<string, unknown>> {
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      include: DEAL_WITH_RELATIONS,
    });
    if (!deal) {
      throw new NotFoundException(`Deal ${id} not found.`);
    }
    return deal as Deal & Record<string, unknown>;
  }

  async updateDesking(
    id: string,
    input: UpdateDeskingInput,
    expectedUpdatedAt: Date,
  ): Promise<Deal> {
    // Optimistic concurrency check — compare client's updatedAt with DB value
    const current = await this.prisma.deal.findUnique({ where: { id }, select: { updatedAt: true } });
    if (!current) throw new NotFoundException(`Deal ${id} not found.`);

    if (current.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      const latest = await this.findOneById(id);
      // Attach the current deal payload so the client can show a conflict warning
      const err = new ConflictException({
        error: 'CONFLICT',
        message: 'Deal was modified by another user. Please review the latest version.',
        currentDeal: latest,
      });
      throw err;
    }

    return this.prisma.deal.update({
      where: { id },
      data: { ...input },
      include: DEAL_WITH_RELATIONS,
    });
  }

  async updateStatus(
    id: string,
    status: DealStatus,
    extra: Partial<{ fundedAt: Date }> = {},
  ): Promise<Deal> {
    return this.prisma.deal.update({
      where: { id },
      data: { status, ...extra },
    });
  }
}
