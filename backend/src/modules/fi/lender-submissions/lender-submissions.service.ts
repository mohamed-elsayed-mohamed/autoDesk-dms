import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { LenderSubmissionsRepository } from './lender-submissions.repository';
import { LendersRepository } from '../lenders/lenders.repository';
import { LenderSimulatorService } from './lender-simulator.service';
import { FiAuditService } from '../audit/fi-audit.service';
import { FiCalculationService } from '../calculation/fi-calculation.service';
import { SubmitToLendersDto } from './dto/submit-to-lenders.dto';
import { SelectLenderDecisionDto } from './dto/select-lender-decision.dto';
import {
  CreditApplicationStatus,
  DealStatus,
  FiAuditActionType,
  LenderDecision,
} from '@prisma/client';
import Decimal from 'decimal.js';
import { Actor } from '../credit-applications/credit-applications.service';

@Injectable()
export class LenderSubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: LenderSubmissionsRepository,
    private readonly lendersRepo: LendersRepository,
    private readonly simulator: LenderSimulatorService,
    private readonly auditService: FiAuditService,
    private readonly calcService: FiCalculationService,
  ) {}

  private async getActorName(actorId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: actorId } });
    return user ? `${user.firstName} ${user.lastName}` : actorId;
  }

  async submitToLenders(dealId: string, dto: SubmitToLendersDto, actor: Actor) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException('Deal not found');
    if (deal.status !== DealStatus.Fni) {
      throw new UnprocessableEntityException('Deal must be in Fni status to submit to lenders');
    }

    const creditApp = await this.prisma.creditApplication.findFirst({
      where: { dealId, status: CreditApplicationStatus.Submitted },
    });
    if (!creditApp) {
      throw new UnprocessableEntityException(
        'A submitted credit application is required before submitting to lenders',
      );
    }

    const actorName = await this.getActorName(actor.id);

    const submissions = await this.prisma.$transaction(async (tx) => {
      const records: any[] = [];
      for (const lenderId of dto.lenderIds) {
        const lender = await this.lendersRepo.findById(lenderId);
        if (!lender) throw new NotFoundException(`Lender ${lenderId} not found`);

        const result = this.simulator.simulateDecision(dealId, lenderId, deal.amountFinanced);

        const submission = await tx.lenderSubmission.create({
          data: {
            dealId,
            creditApplicationId: creditApp.id,
            lenderId,
            decision: result.decision,
            approvedAmount: result.approvedAmount,
            buyRate: result.buyRate,
            maxTerm: result.maxTerm,
            stipulations: result.stipulations,
          },
        });
        records.push(submission);
      }

      await this.auditService.log(
        {
          dealId,
          actionType: FiAuditActionType.LenderSubmitted,
          actorId: actor.id,
          actorName,
          actorRole: actor.role,
          entityType: 'LenderSubmission',
          entityId: dealId,
          afterSnapshot: { lenderIds: dto.lenderIds, count: records.length },
        },
        tx,
      );

      return records;
    });

    return submissions;
  }

  async selectDecision(dealId: string, dto: SelectLenderDecisionDto, actor: Actor) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException('Deal not found');

    const submission = await this.prisma.lenderSubmission.findUnique({
      where: { id: dto.lenderSubmissionId },
      include: { lender: true },
    });
    if (!submission || submission.dealId !== dealId) {
      throw new NotFoundException('Lender submission not found for this deal');
    }

    if (submission.decision === LenderDecision.Declined) {
      throw new UnprocessableEntityException('Cannot select a declined lender decision');
    }

    const lender = await this.lendersRepo.findById(submission.lenderId);
    if (!lender) throw new NotFoundException('Lender not found');

    const rateMarkup = new Decimal(dto.rateMarkup);
    const buyRate = submission.buyRate!;
    const sellRate = this.calcService.calculateSellRate(buyRate, rateMarkup);
    const monthlyPayment = this.calcService.calculateMonthlyPayment(
      submission.approvedAmount ?? deal.amountFinanced,
      sellRate,
      dto.selectedTerm,
    );

    const warnings = this.calcService.checkMarkupCapWarning(rateMarkup, lender.maxMarkupCap);

    const actorName = await this.getActorName(actor.id);

    const beforeSnapshot = {
      apr: deal.apr.toString(),
      term: deal.term,
      monthlyPayment: deal.monthlyPayment.toString(),
    };

    const result = await this.prisma.$transaction(async (tx) => {
      const selected = await this.repo.upsertSelectedDecision(
        dealId,
        {
          lenderSubmissionId: dto.lenderSubmissionId,
          buyRate,
          rateMarkup,
          sellRate,
          selectedTerm: dto.selectedTerm,
          selectedById: actor.id,
        },
        tx,
      );

      await this.repo.markAsSelected(dto.lenderSubmissionId, tx);

      const updatedDeal = await tx.deal.update({
        where: { id: dealId },
        data: {
          apr: sellRate.dividedBy(100),
          term: dto.selectedTerm,
          monthlyPayment,
        },
      });

      await this.auditService.log(
        {
          dealId,
          actionType: FiAuditActionType.LenderDecisionSelected,
          actorId: actor.id,
          actorName,
          actorRole: actor.role,
          entityType: 'SelectedLenderDecision',
          entityId: selected.id,
          beforeSnapshot,
          afterSnapshot: {
            lenderSubmissionId: dto.lenderSubmissionId,
            sellRate: sellRate.toString(),
            selectedTerm: dto.selectedTerm,
            monthlyPayment: monthlyPayment.toString(),
          },
        },
        tx,
      );

      return { data: selected, deal: updatedDeal };
    });

    return {
      data: result.data,
      warnings,
    };
  }

  async findByDealId(dealId: string) {
    return this.repo.findByDealId(dealId);
  }
}
