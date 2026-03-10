import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { FiAuditService } from '../audit/fi-audit.service';
import { ConfirmDisclosureDto } from './dto/confirm-disclosure.dto';
import { UpsertDisclosureRequirementDto } from './dto/upsert-disclosure-requirement.dto';
import { FiAuditActionType } from '@prisma/client';
import { Actor } from '../credit-applications/credit-applications.service';

@Injectable()
export class DisclosuresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: FiAuditService,
  ) {}

  private async getActorName(actorId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: actorId } });
    return user ? `${user.firstName} ${user.lastName}` : actorId;
  }

  async getRequirements(jurisdiction?: string) {
    return this.prisma.disclosureRequirement.findMany({
      where: {
        isActive: true,
        ...(jurisdiction ? { jurisdiction } : {}),
      },
      orderBy: [{ jurisdiction: 'asc' }, { disclosureName: 'asc' }],
    });
  }

  async getConfirmations(dealId: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException('Deal not found');

    const requirements = await this.prisma.disclosureRequirement.findMany({
      where: { isActive: true },
    });

    const confirmations = await this.prisma.disclosureConfirmation.findMany({
      where: { dealId },
    });

    const confirmedNames = new Set(confirmations.map((c) => c.disclosureName));

    const required = requirements.length;
    const confirmed = requirements.filter((r) => confirmedNames.has(r.disclosureName)).length;
    const pending = required - confirmed;
    const isComplete = pending === 0 && required > 0;

    return {
      required,
      confirmed,
      pending,
      isComplete,
      requirements: requirements.map((r) => ({
        ...r,
        isConfirmed: confirmedNames.has(r.disclosureName),
      })),
      confirmations,
    };
  }

  async confirmDisclosure(dealId: string, dto: ConfirmDisclosureDto, actor: Actor) {
    const requirement = await this.prisma.disclosureRequirement.findUnique({
      where: { id: dto.disclosureRequirementId },
    });
    if (!requirement) throw new NotFoundException('Disclosure requirement not found');

    // Idempotent: return existing if already confirmed
    const existing = await this.prisma.disclosureConfirmation.findFirst({
      where: { dealId, disclosureName: requirement.disclosureName },
    });
    if (existing) return existing;

    const actorName = await this.getActorName(actor.id);
    const user = await this.prisma.user.findUnique({ where: { id: actor.id } });
    const confirmedByName = user ? `${user.firstName} ${user.lastName}` : actor.id;

    return this.prisma.$transaction(async (tx) => {
      const confirmation = await tx.disclosureConfirmation.create({
        data: {
          dealId,
          disclosureName: requirement.disclosureName,
          confirmedById: actor.id,
          confirmedByName: confirmedByName,
          confirmedByRole: actor.role,
          confirmedAt: new Date(),
        },
      });

      await this.auditService.log(
        {
          dealId,
          actionType: FiAuditActionType.DisclosureConfirmed,
          actorId: actor.id,
          actorName,
          actorRole: actor.role,
          entityType: 'DisclosureConfirmation',
          entityId: confirmation.id,
          afterSnapshot: {
            disclosureName: requirement.disclosureName,
            jurisdiction: requirement.jurisdiction,
            confirmedByName,
            confirmedByRole: actor.role,
          },
        },
        tx,
      );

      return confirmation;
    });
  }

  async createRequirement(dto: UpsertDisclosureRequirementDto) {
    return this.prisma.disclosureRequirement.create({
      data: {
        jurisdiction: dto.jurisdiction,
        disclosureName: dto.disclosureName,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateRequirement(id: string, dto: Partial<UpsertDisclosureRequirementDto>) {
    const existing = await this.prisma.disclosureRequirement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Disclosure requirement ${id} not found`);
    return this.prisma.disclosureRequirement.update({
      where: { id },
      data: {
        ...(dto.jurisdiction !== undefined && { jurisdiction: dto.jurisdiction }),
        ...(dto.disclosureName !== undefined && { disclosureName: dto.disclosureName }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }
}
