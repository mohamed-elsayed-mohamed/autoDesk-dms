import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { FiProductsRepository } from '../fi-products/fi-products.repository';
import { FiAuditService } from '../audit/fi-audit.service';
import { FiCalculationService } from '../calculation/fi-calculation.service';
import { RecordChargebackDto } from './dto/record-chargeback.dto';
import { FiAuditActionType, FiProductStatus } from '@prisma/client';
import Decimal from 'decimal.js';
import { Actor } from '../credit-applications/credit-applications.service';

@Injectable()
export class ChargebacksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsRepo: FiProductsRepository,
    private readonly auditService: FiAuditService,
    private readonly calcService: FiCalculationService,
  ) {}

  private async getActorName(actorId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: actorId } });
    return user ? `${user.firstName} ${user.lastName}` : actorId;
  }

  async recordChargeback(
    dealId: string,
    productId: string,
    dto: RecordChargebackDto,
    actor: Actor,
  ) {
    const product = await this.productsRepo.findById(productId);
    if (!product || product.dealId !== dealId || product.deletedAt !== null) {
      throw new NotFoundException('Product not found');
    }

    if (product.status !== FiProductStatus.Active) {
      throw new UnprocessableEntityException(
        'Chargebacks can only be recorded for Active products',
      );
    }

    const actorName = await this.getActorName(actor.id);
    const beforeSnapshot = {
      status: product.status,
      chargebackAmount: null,
      chargebackDate: null,
    };

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.fIProduct.update({
        where: { id: productId },
        data: {
          status: FiProductStatus.ChargedBack,
          chargebackAmount: new Decimal(dto.chargebackAmount),
          chargebackDate: new Date(dto.chargebackDate),
          chargebackRecordedById: actor.id,
        },
      });

      const allProducts = await tx.fIProduct.findMany({
        where: { dealId, deletedAt: null },
      });
      // ChargedBack excluded from gross by calculateFiGross (only Active counts)
      const fiGross = this.calcService.calculateFiGross(allProducts);

      await tx.deal.update({
        where: { id: dealId },
        data: { backEndGross: fiGross },
      });

      await this.auditService.log(
        {
          dealId,
          actionType: FiAuditActionType.ChargebackRecorded,
          actorId: actor.id,
          actorName,
          actorRole: actor.role,
          entityType: 'FIProduct',
          entityId: productId,
          beforeSnapshot,
          afterSnapshot: {
            status: FiProductStatus.ChargedBack,
            chargebackAmount: dto.chargebackAmount,
            chargebackDate: dto.chargebackDate,
          },
        },
        tx,
      );

      return updated;
    });
  }
}
