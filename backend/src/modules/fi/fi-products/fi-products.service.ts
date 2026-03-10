import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { FiProductsRepository } from './fi-products.repository';
import { FiAuditService } from '../audit/fi-audit.service';
import { FiCalculationService } from '../calculation/fi-calculation.service';
import { CreateFiProductDto } from './dto/create-fi-product.dto';
import { UpdateFiProductDto } from './dto/update-fi-product.dto';
import { DealStatus, FiAuditActionType, FiProductStatus } from '@prisma/client';
import Decimal from 'decimal.js';
import { Actor } from '../credit-applications/credit-applications.service';

@Injectable()
export class FiProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: FiProductsRepository,
    private readonly auditService: FiAuditService,
    private readonly calcService: FiCalculationService,
  ) {}

  private async getActorName(actorId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: actorId } });
    return user ? `${user.firstName} ${user.lastName}` : actorId;
  }

  async findByDealId(dealId: string) {
    return this.repo.findByDealId(dealId);
  }

  async addProduct(dealId: string, dto: CreateFiProductDto, actor: Actor) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException('Deal not found');

    const allowedStatuses: DealStatus[] = [DealStatus.Fni, DealStatus.ContractsSigned];
    if (!allowedStatuses.includes(deal.status)) {
      throw new UnprocessableEntityException(
        'Products can only be added to deals in Fni or ContractsSigned status',
      );
    }

    const actorName = await this.getActorName(actor.id);

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.fIProduct.create({
        data: {
          dealId,
          productType: dto.productType,
          providerName: dto.providerName,
          cost: new Decimal(dto.cost),
          sellingPrice: new Decimal(dto.sellingPrice),
          termMonths: dto.termMonths,
          deductible: dto.deductible != null ? new Decimal(dto.deductible) : undefined,
          contractNumber: dto.contractNumber,
        },
      });

      const allProducts = await tx.fIProduct.findMany({
        where: { dealId, deletedAt: null },
      });
      const fiGross = this.calcService.calculateFiGross(allProducts);

      await tx.deal.update({
        where: { id: dealId },
        data: { backEndGross: fiGross },
      });

      await this.auditService.log(
        {
          dealId,
          actionType: FiAuditActionType.ProductAdded,
          actorId: actor.id,
          actorName,
          actorRole: actor.role,
          entityType: 'FIProduct',
          entityId: product.id,
          afterSnapshot: {
            productType: product.productType,
            providerName: product.providerName,
            cost: product.cost.toString(),
            sellingPrice: product.sellingPrice.toString(),
          },
        },
        tx,
      );

      return product;
    });
  }

  async editProduct(dealId: string, productId: string, dto: UpdateFiProductDto, actor: Actor) {
    const product = await this.repo.findById(productId);
    if (!product || product.dealId !== dealId || product.deletedAt !== null) {
      throw new NotFoundException('Product not found');
    }

    const actorName = await this.getActorName(actor.id);
    const beforeSnapshot = {
      productType: product.productType,
      providerName: product.providerName,
      cost: product.cost.toString(),
      sellingPrice: product.sellingPrice.toString(),
      termMonths: product.termMonths,
    };

    return this.prisma.$transaction(async (tx) => {
      const updateData: Record<string, any> = {};
      if (dto.productType !== undefined) updateData.productType = dto.productType;
      if (dto.providerName !== undefined) updateData.providerName = dto.providerName;
      if (dto.cost !== undefined) updateData.cost = new Decimal(dto.cost);
      if (dto.sellingPrice !== undefined) updateData.sellingPrice = new Decimal(dto.sellingPrice);
      if (dto.termMonths !== undefined) updateData.termMonths = dto.termMonths;
      if (dto.deductible !== undefined)
        updateData.deductible = dto.deductible != null ? new Decimal(dto.deductible) : null;
      if (dto.contractNumber !== undefined) updateData.contractNumber = dto.contractNumber;

      const updated = await tx.fIProduct.update({ where: { id: productId }, data: updateData });

      const allProducts = await tx.fIProduct.findMany({
        where: { dealId, deletedAt: null },
      });
      const fiGross = this.calcService.calculateFiGross(allProducts);

      await tx.deal.update({
        where: { id: dealId },
        data: { backEndGross: fiGross },
      });

      await this.auditService.log(
        {
          dealId,
          actionType: FiAuditActionType.ProductEdited,
          actorId: actor.id,
          actorName,
          actorRole: actor.role,
          entityType: 'FIProduct',
          entityId: productId,
          beforeSnapshot,
          afterSnapshot: {
            productType: updated.productType,
            providerName: updated.providerName,
            cost: updated.cost.toString(),
            sellingPrice: updated.sellingPrice.toString(),
            termMonths: updated.termMonths,
          },
        },
        tx,
      );

      return updated;
    });
  }

  async removeProduct(dealId: string, productId: string, actor: Actor) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException('Deal not found');

    const lockedStatuses: DealStatus[] = [
      DealStatus.Delivered,
      DealStatus.Funded,
      DealStatus.Unwound,
    ];
    if (lockedStatuses.includes(deal.status)) {
      throw new UnprocessableEntityException(
        'Products cannot be removed from deals in Delivered, Funded, or Unwound status',
      );
    }

    const product = await this.repo.findById(productId);
    if (!product || product.dealId !== dealId || product.deletedAt !== null) {
      throw new NotFoundException('Product not found');
    }

    const actorName = await this.getActorName(actor.id);

    return this.prisma.$transaction(async (tx) => {
      await tx.fIProduct.update({ where: { id: productId }, data: { deletedAt: new Date() } });

      const allProducts = await tx.fIProduct.findMany({
        where: { dealId, deletedAt: null },
      });
      const fiGross = this.calcService.calculateFiGross(allProducts);

      await tx.deal.update({
        where: { id: dealId },
        data: { backEndGross: fiGross },
      });

      await this.auditService.log(
        {
          dealId,
          actionType: FiAuditActionType.ProductRemoved,
          actorId: actor.id,
          actorName,
          actorRole: actor.role,
          entityType: 'FIProduct',
          entityId: productId,
          beforeSnapshot: {
            productType: product.productType,
            providerName: product.providerName,
            status: product.status,
          },
        },
        tx,
      );

      return { success: true };
    });
  }

  async changeStatus(dealId: string, productId: string, newStatus: FiProductStatus, actor: Actor) {
    const product = await this.repo.findById(productId);
    if (!product || product.dealId !== dealId || product.deletedAt !== null) {
      throw new NotFoundException('Product not found');
    }

    if (newStatus === FiProductStatus.ChargedBack) {
      throw new UnprocessableEntityException(
        'Use the chargeback endpoint to set status to ChargedBack',
      );
    }

    const actorName = await this.getActorName(actor.id);
    const beforeSnapshot = { status: product.status };

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.fIProduct.update({
        where: { id: productId },
        data: { status: newStatus },
      });

      const allProducts = await tx.fIProduct.findMany({
        where: { dealId, deletedAt: null },
      });
      const fiGross = this.calcService.calculateFiGross(allProducts);

      await tx.deal.update({
        where: { id: dealId },
        data: { backEndGross: fiGross },
      });

      await this.auditService.log(
        {
          dealId,
          actionType: FiAuditActionType.ProductStatusChanged,
          actorId: actor.id,
          actorName,
          actorRole: actor.role,
          entityType: 'FIProduct',
          entityId: productId,
          beforeSnapshot,
          afterSnapshot: { status: newStatus },
        },
        tx,
      );

      return updated;
    });
  }
}
