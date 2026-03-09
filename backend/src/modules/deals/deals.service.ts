import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DealsRepository } from './deals.repository';
import { DealCalculationService } from './calculation/deal-calculation.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { Deal, DealStatus, DealType, UserRole } from '@prisma/client';

/** Roles that may view all deals (not scoped to their own). */
const ALL_DEALS_ROLES: UserRole[] = [
  UserRole.SalesManager,
  UserRole.GeneralManager,
  UserRole.FniManager,
];

/** Statuses that lock financial editing. */
const EDIT_LOCKED_STATUSES: DealStatus[] = [
  DealStatus.Funded,
  DealStatus.Unwound,
];

export interface RequestingUser {
  id: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dealsRepository: DealsRepository,
    private readonly calculationService: DealCalculationService,
  ) {}

  async createDeal(dto: CreateDealDto, actor: RequestingUser): Promise<Deal> {
    // Vehicle double-commitment guard
    await this.dealsRepository.checkVehicleCommitment(dto.vehicleId);

    return this.prisma.$transaction(async (tx) => {
      // Atomically fetch the next deal number
      const dealNumberResult = await tx.$queryRaw<[{ nextval: bigint }]>`
        SELECT nextval('deal_number_seq')
      `;
      const dealNumber = Number(dealNumberResult[0].nextval);

      const deal = await tx.deal.create({
        data: {
          dealNumber,
          customerId: dto.customerId,
          vehicleId: dto.vehicleId,
          dealType: dto.dealType,
          createdById: actor.id,
          status: DealStatus.Pending,
        },
      });

      // Insert initial status history entry
      await tx.dealStatusHistory.create({
        data: {
          dealId: deal.id,
          previousStatus: null,
          newStatus: DealStatus.Pending,
          actorId: actor.id,
          actorName: `${actor.firstName} ${actor.lastName}`,
          actorRole: actor.role,
        },
      });

      return deal;
    });
  }

  async findAll(actor: RequestingUser, query: {
    status?: DealStatus;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
  }) {
    const scopedToUserId = ALL_DEALS_ROLES.includes(actor.role) ? undefined : actor.id;
    return this.dealsRepository.findAll({ scopedToUserId, ...query });
  }

  async findOneOrFail(id: string): Promise<Deal> {
    return this.dealsRepository.findOneById(id);
  }

  async updateDesking(id: string, dto: UpdateDealDto, actor: RequestingUser): Promise<Deal> {
    const deal = await this.dealsRepository.findOneById(id) as any;

    // Only the creator can edit (for SalesConsultant)
    if (actor.role === UserRole.SalesConsultant && deal.createdById !== actor.id) {
      throw new ForbiddenException('You can only edit your own deals.');
    }

    if (EDIT_LOCKED_STATUSES.includes(deal.status)) {
      throw new ForbiddenException(`Deal editing is locked in ${deal.status} status.`);
    }

    // Fetch vehicle cost for front-end gross calculation
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: deal.vehicleId },
      select: { invoicePrice: true },
    });
    const vehicleCost = vehicle?.invoicePrice ? Number(vehicle.invoicePrice) : 0;

    // Merge incoming fields with current deal values
    const mergedDeal = {
      dealType: (dto.dealType ?? deal.dealType) as DealType,
      salePrice: dto.salePrice ?? Number(deal.salePrice),
      downPayment: dto.downPayment ?? Number(deal.downPayment),
      rebates: dto.rebates ?? Number(deal.rebates),
      apr: dto.apr ?? Number(deal.apr),
      term: dto.term ?? deal.term,
      taxRate: dto.taxRate ?? Number(deal.taxRate),
    };

    const fees = (deal.fees ?? []).map((f: any) => ({
      amount: Number(f.amount),
      taxable: f.taxable,
    }));

    const tradeIn = deal.tradeIn
      ? { allowance: Number(deal.tradeIn.allowance), payoff: Number(deal.tradeIn.payoff) }
      : null;

    const calculated = this.calculationService.recalculate({
      ...mergedDeal,
      fees,
      tradeIn,
      vehicleCost,
    });

    return this.dealsRepository.updateDesking(
      id,
      {
        ...dto,
        totalTax: calculated.totalTax,
        amountFinanced: calculated.amountFinanced,
        monthlyPayment: calculated.monthlyPayment,
        frontEndGross: calculated.frontEndGross,
      },
      new Date(dto.updatedAt),
    );
  }

  /** Recalculate deal totals after any mutating sub-resource change (fees, trade-in). */
  async recalculateAndPersist(dealId: string): Promise<void> {
    const deal = await this.dealsRepository.findOneById(dealId) as any;

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: deal.vehicleId },
      select: { invoicePrice: true },
    });
    const vehicleCost = vehicle?.invoicePrice ? Number(vehicle.invoicePrice) : 0;

    const fees = (deal.fees ?? []).map((f: any) => ({
      amount: Number(f.amount),
      taxable: f.taxable,
    }));

    const tradeIn = deal.tradeIn
      ? { allowance: Number(deal.tradeIn.allowance), payoff: Number(deal.tradeIn.payoff) }
      : null;

    const calculated = this.calculationService.recalculate({
      dealType: deal.dealType as DealType,
      salePrice: Number(deal.salePrice),
      downPayment: Number(deal.downPayment),
      rebates: Number(deal.rebates),
      apr: Number(deal.apr),
      term: deal.term,
      taxRate: Number(deal.taxRate),
      fees,
      tradeIn,
      vehicleCost,
    });

    await this.prisma.deal.update({
      where: { id: dealId },
      data: {
        totalTax: calculated.totalTax,
        amountFinanced: calculated.amountFinanced,
        monthlyPayment: calculated.monthlyPayment,
        frontEndGross: calculated.frontEndGross,
      },
    });
  }
}
