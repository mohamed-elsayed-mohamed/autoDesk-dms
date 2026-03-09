import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { validateStatusTransition } from './constants/deal-status-transitions.constants';
import { TransitionStatusDto } from './dto/transition-status.dto';
import { DealStatus, UserRole } from '@prisma/client';
import { RequestingUser } from './deals.service';

@Injectable()
export class DealStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async transitionStatus(dealId: string, dto: TransitionStatusDto, actor: RequestingUser): Promise<void> {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      select: { status: true, taxRate: true },
    });
    if (!deal) throw new NotFoundException(`Deal ${dealId} not found.`);

    // Validate FSM transition (throws ForbiddenException or UnprocessableEntityException on failure)
    validateStatusTransition(deal.status, dto.newStatus, actor.role, dto.note ?? null);

    // Block approval when taxRate is 0 (EC-006)
    if (dto.newStatus === DealStatus.Fni && Number(deal.taxRate) === 0) {
      throw new UnprocessableEntityException({
        error: 'MISSING_TAX_RATE',
        message: 'A tax rate must be set before advancing to F&I.',
      });
    }

    const extra: Record<string, unknown> = {};
    if (dto.newStatus === DealStatus.Funded) {
      extra.fundedAt = new Date();
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.deal.update({
        where: { id: dealId },
        data: { status: dto.newStatus, ...extra },
      });
      await tx.dealStatusHistory.create({
        data: {
          dealId,
          previousStatus: deal.status,
          newStatus: dto.newStatus,
          actorId: actor.id,
          actorName: `${actor.firstName} ${actor.lastName}`,
          actorRole: actor.role,
          note: dto.note ?? null,
        },
      });
    });
  }
}
