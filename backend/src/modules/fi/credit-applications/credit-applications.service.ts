import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreditApplicationsRepository } from './credit-applications.repository';
import { SsnEncryptionService } from '../calculation/ssn-encryption.service';
import { FiAuditService } from '../audit/fi-audit.service';
import { UpsertCreditApplicationDto } from './dto/upsert-credit-application.dto';
import { UpdateCreditApplicationDto } from './dto/update-credit-application.dto';
import { CreditApplicationStatus, DealStatus, FiAuditActionType } from '@prisma/client';
import Decimal from 'decimal.js';

export interface Actor {
  id: string;
  role: string;
}

function maskSsn(lastFour: string): string {
  return `XXX-XX-${lastFour}`;
}

function sanitize(app: any) {
  if (!app) return null;
  const result = { ...app, ssnMasked: maskSsn(app.ssnLastFour as string) };
  delete result.ssnEncrypted;
  delete result.ssnIv;
  delete result.ssnLastFour;
  return result;
}

@Injectable()
export class CreditApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: CreditApplicationsRepository,
    private readonly ssnEncryption: SsnEncryptionService,
    private readonly auditService: FiAuditService,
  ) {}

  private async getActorName(actorId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: actorId } });
    return user ? `${user.firstName} ${user.lastName}` : actorId;
  }

  async createOrSupersede(dealId: string, dto: UpsertCreditApplicationDto, actor: Actor) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException('Deal not found');
    if (deal.status !== DealStatus.Fni) {
      throw new UnprocessableEntityException(
        'Credit application can only be created for deals in Fni status',
      );
    }

    const existing = await this.repo.findActiveByDealId(dealId);

    if (existing && !dto.supersede) {
      throw new ConflictException(
        'An active credit application already exists. Set supersede=true to replace it.',
      );
    }

    const { ciphertext, iv, lastFour } = this.ssnEncryption.encrypt(dto.ssn);
    const actorName = await this.getActorName(actor.id);

    const newApp = await this.prisma.$transaction(async (tx) => {
      if (existing && dto.supersede) {
        await tx.creditApplication.update({
          where: { id: existing.id },
          data: { status: CreditApplicationStatus.Archived },
        });
        await this.auditService.log(
          {
            dealId,
            actionType: FiAuditActionType.CreditAppSuperseded,
            actorId: actor.id,
            actorName,
            actorRole: actor.role,
            entityType: 'CreditApplication',
            entityId: existing.id,
            beforeSnapshot: { status: existing.status },
            afterSnapshot: { status: CreditApplicationStatus.Archived },
          },
          tx,
        );
      }

      const created = await tx.creditApplication.create({
        data: {
          dealId,
          customerId: deal.customerId,
          annualIncome: new Decimal(dto.annualIncome),
          employerName: dto.employerName,
          employmentLengthMonths: dto.employmentLengthMonths,
          housingType: dto.housingType,
          monthlyHousingPayment: new Decimal(dto.monthlyHousingPayment),
          ssnEncrypted: ciphertext,
          ssnIv: iv,
          ssnLastFour: lastFour,
          dateOfBirth: new Date(dto.dateOfBirth),
          createdById: actor.id,
          status: CreditApplicationStatus.Draft,
        },
      });

      await this.auditService.log(
        {
          dealId,
          actionType: FiAuditActionType.CreditAppCreated,
          actorId: actor.id,
          actorName,
          actorRole: actor.role,
          entityType: 'CreditApplication',
          entityId: created.id,
          afterSnapshot: { status: created.status },
        },
        tx,
      );

      return created;
    });

    return sanitize(newApp);
  }

  async updateDraft(dealId: string, dto: UpdateCreditApplicationDto, _actor: Actor) {
    const existing = await this.repo.findActiveByDealId(dealId);
    if (!existing) throw new NotFoundException('No active credit application found for this deal');
    if (existing.status !== CreditApplicationStatus.Draft) {
      throw new UnprocessableEntityException('Only Draft credit applications can be updated');
    }

    const updateData: Record<string, any> = {};
    if (dto.annualIncome !== undefined) updateData.annualIncome = new Decimal(dto.annualIncome);
    if (dto.employerName !== undefined) updateData.employerName = dto.employerName;
    if (dto.employmentLengthMonths !== undefined)
      updateData.employmentLengthMonths = dto.employmentLengthMonths;
    if (dto.housingType !== undefined) updateData.housingType = dto.housingType;
    if (dto.monthlyHousingPayment !== undefined)
      updateData.monthlyHousingPayment = new Decimal(dto.monthlyHousingPayment);
    if (dto.dateOfBirth !== undefined) updateData.dateOfBirth = new Date(dto.dateOfBirth);

    const updated = await this.prisma.creditApplication.update({
      where: { id: existing.id },
      data: updateData,
    });

    return sanitize(updated);
  }

  async submit(dealId: string, actor: Actor) {
    const existing = await this.repo.findActiveByDealId(dealId);
    if (!existing) throw new NotFoundException('No active credit application found for this deal');
    if (existing.status !== CreditApplicationStatus.Draft) {
      throw new UnprocessableEntityException('Only Draft credit applications can be submitted');
    }

    const actorName = await this.getActorName(actor.id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const app = await tx.creditApplication.update({
        where: { id: existing.id },
        data: {
          status: CreditApplicationStatus.Submitted,
          submittedById: actor.id,
          submittedAt: new Date(),
        },
      });

      await this.auditService.log(
        {
          dealId,
          actionType: FiAuditActionType.CreditAppSubmitted,
          actorId: actor.id,
          actorName,
          actorRole: actor.role,
          entityType: 'CreditApplication',
          entityId: app.id,
          beforeSnapshot: { status: CreditApplicationStatus.Draft },
          afterSnapshot: { status: CreditApplicationStatus.Submitted },
        },
        tx,
      );

      return app;
    });

    return sanitize(updated);
  }

  async findByDealId(dealId: string) {
    const app = await this.repo.findActiveByDealId(dealId);
    return sanitize(app);
  }
}
