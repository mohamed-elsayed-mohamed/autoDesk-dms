import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { UpsertCatalogItemDto } from './dto/upsert-catalog-item.dto';

@Injectable()
export class ProductCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(includeInactive = false) {
    return this.prisma.productCatalogItem.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ productType: 'asc' }, { providerName: 'asc' }],
    });
  }

  async create(dto: UpsertCatalogItemDto) {
    return this.prisma.productCatalogItem.create({
      data: {
        productType: dto.productType,
        providerName: dto.providerName,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: Partial<UpsertCatalogItemDto>) {
    const existing = await this.prisma.productCatalogItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Product catalog item ${id} not found`);
    return this.prisma.productCatalogItem.update({
      where: { id },
      data: {
        ...(dto.productType !== undefined && { productType: dto.productType }),
        ...(dto.providerName !== undefined && { providerName: dto.providerName }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }
}
