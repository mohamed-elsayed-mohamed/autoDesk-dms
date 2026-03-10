import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DealsService } from './deals.service';
import { CreateDealFeeDto } from './dto/create-deal-fee.dto';
import { UpdateDealFeeDto } from './dto/update-deal-fee.dto';
import { DealFee, DealStatus } from '@prisma/client';

/** Statuses where fee editing is no longer allowed. */
const EDIT_LOCKED_STATUSES: DealStatus[] = [DealStatus.Funded, DealStatus.Unwound];

@Injectable()
export class DealFeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dealsService: DealsService,
  ) {}

  private async guardEditAccess(dealId: string): Promise<void> {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      select: { status: true },
    });
    if (!deal) throw new NotFoundException(`Deal ${dealId} not found.`);
    if (EDIT_LOCKED_STATUSES.includes(deal.status)) {
      throw new ForbiddenException(`Fee editing is locked when deal is in ${deal.status} status.`);
    }
  }

  async addFee(dealId: string, dto: CreateDealFeeDto): Promise<DealFee> {
    await this.guardEditAccess(dealId);

    const fee = await this.prisma.dealFee.create({
      data: {
        dealId,
        name: dto.name,
        amount: dto.amount,
        taxable: dto.taxable,
      },
    });

    await this.dealsService.recalculateAndPersist(dealId);
    return fee;
  }

  async updateFee(dealId: string, feeId: string, dto: UpdateDealFeeDto): Promise<DealFee> {
    await this.guardEditAccess(dealId);

    const existing = await this.prisma.dealFee.findFirst({ where: { id: feeId, dealId } });
    if (!existing) throw new NotFoundException(`Fee ${feeId} not found on deal ${dealId}.`);

    const fee = await this.prisma.dealFee.update({
      where: { id: feeId },
      data: { ...dto },
    });

    await this.dealsService.recalculateAndPersist(dealId);
    return fee;
  }

  async removeFee(dealId: string, feeId: string): Promise<void> {
    await this.guardEditAccess(dealId);

    const existing = await this.prisma.dealFee.findFirst({ where: { id: feeId, dealId } });
    if (!existing) throw new NotFoundException(`Fee ${feeId} not found on deal ${dealId}.`);

    await this.prisma.dealFee.delete({ where: { id: feeId } });
    await this.dealsService.recalculateAndPersist(dealId);
  }
}
