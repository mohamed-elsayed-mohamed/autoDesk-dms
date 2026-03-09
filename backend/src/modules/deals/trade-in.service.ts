import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DealsService } from './deals.service';
import { UpsertTradeInDto } from './dto/upsert-trade-in.dto';
import { TradeIn, DealStatus } from '@prisma/client';

const EDIT_LOCKED_STATUSES: DealStatus[] = [DealStatus.Delivered, DealStatus.Funded, DealStatus.Unwound];

@Injectable()
export class TradeInService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dealsService: DealsService,
  ) {}

  private async guardEditAccess(dealId: string): Promise<void> {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId }, select: { status: true } });
    if (!deal) throw new NotFoundException(`Deal ${dealId} not found.`);
    if (EDIT_LOCKED_STATUSES.includes(deal.status)) {
      throw new ForbiddenException(`Trade-in editing is locked when deal is in ${deal.status} status.`);
    }
  }

  async upsertTradeIn(dealId: string, dto: UpsertTradeInDto): Promise<TradeIn> {
    await this.guardEditAccess(dealId);
    const existing = await this.prisma.tradeIn.findUnique({ where: { dealId } });
    if (existing) {
      throw new ConflictException({ error: 'TRADE_IN_EXISTS', message: 'Use PATCH to update the existing trade-in.' });
    }
    const tradeIn = await this.prisma.tradeIn.create({
      data: { dealId, ...dto },
    });
    await this.dealsService.recalculateAndPersist(dealId);
    return tradeIn;
  }

  async updateTradeIn(dealId: string, dto: Partial<UpsertTradeInDto>): Promise<TradeIn> {
    await this.guardEditAccess(dealId);
    const existing = await this.prisma.tradeIn.findUnique({ where: { dealId } });
    if (!existing) throw new NotFoundException(`No trade-in found for deal ${dealId}.`);
    const tradeIn = await this.prisma.tradeIn.update({ where: { dealId }, data: { ...dto } });
    await this.dealsService.recalculateAndPersist(dealId);
    return tradeIn;
  }

  async removeTradeIn(dealId: string): Promise<void> {
    await this.guardEditAccess(dealId);
    const existing = await this.prisma.tradeIn.findUnique({ where: { dealId } });
    if (!existing) throw new NotFoundException(`No trade-in found for deal ${dealId}.`);
    await this.prisma.tradeIn.delete({ where: { dealId } });
    await this.dealsService.recalculateAndPersist(dealId);
  }
}
