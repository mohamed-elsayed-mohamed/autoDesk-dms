import { Injectable, NotFoundException } from '@nestjs/common';
import { LendersRepository } from './lenders.repository';
import { CreateLenderDto } from './dto/create-lender.dto';
import { UpdateLenderDto } from './dto/update-lender.dto';
import Decimal from 'decimal.js';

@Injectable()
export class LendersService {
  constructor(private readonly repo: LendersRepository) {}

  async findAll(includeInactive = false) {
    return this.repo.findAll(includeInactive);
  }

  async findActiveById(id: string) {
    const lender = await this.repo.findById(id);
    if (!lender) throw new NotFoundException(`Lender ${id} not found`);
    return lender;
  }

  async create(dto: CreateLenderDto) {
    return this.repo.create({
      name: dto.name,
      isActive: dto.isActive ?? true,
      maxMarkupCap: dto.maxMarkupCap != null ? new Decimal(dto.maxMarkupCap) : undefined,
    });
  }

  async update(id: string, dto: UpdateLenderDto) {
    await this.findActiveById(id);
    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.maxMarkupCap !== undefined)
      updateData.maxMarkupCap = dto.maxMarkupCap != null ? new Decimal(dto.maxMarkupCap) : null;
    return this.repo.update(id, updateData);
  }
}
