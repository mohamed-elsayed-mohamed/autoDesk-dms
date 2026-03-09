import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CheckDuplicatesQueryDto,
  CreateCustomerDto,
  CustomerSearchQueryDto,
  UpdateCustomerDto,
} from './dto';
import { paginate, PaginatedResponseDto } from '../../../common/dto/pagination.dto';
import { Customer } from '@prisma/client';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerDto): Promise<Customer> {
    if (!dto.phone && !dto.email) {
      throw new BadRequestException('At least one of phone or email must be provided');
    }

    return this.prisma.customer.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        email: dto.email,
        street: dto.street,
        city: dto.city,
        state: dto.state,
        zip: dto.zip,
        preferredContact: dto.preferredContact,
        notes: dto.notes,
      },
    });
  }

  async findAll(query: CustomerSearchQueryDto): Promise<PaginatedResponseDto<Customer>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? 'lastName';
    const sortOrder = query.sortOrder ?? 'asc';

    const where: Record<string, unknown> = {};

    if (!query.includeArchived) {
      where.archivedAt = null;
    }

    if (query.search) {
      const search = query.search;
      where.OR = [
        {
          firstName: { contains: search, mode: 'insensitive' },
        },
        {
          lastName: { contains: search, mode: 'insensitive' },
        },
        {
          phone: { contains: search, mode: 'insensitive' },
        },
        {
          email: { contains: search, mode: 'insensitive' },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string): Promise<Customer & { leads: unknown[] }> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        leads: {
          select: {
            id: true,
            source: true,
            status: true,
            assignedTo: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }

    return customer as Customer & { leads: unknown[] };
  }

  async checkDuplicates(query: CheckDuplicatesQueryDto): Promise<Customer[]> {
    const { phone, email, excludeId } = query;

    if (!phone && !email) {
      return [];
    }

    const orConditions: Record<string, unknown>[] = [];
    if (phone) orConditions.push({ phone });
    if (email) orConditions.push({ email });

    const where: Record<string, unknown> = { OR: orConditions };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    return this.prisma.customer.findMany({ where });
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    const { updatedAt, ...fields } = dto;

    const result = await this.prisma.customer.updateMany({
      where: {
        id,
        updatedAt: new Date(updatedAt),
      },
      data: fields,
    });

    if (result.count === 0) {
      const exists = await this.prisma.customer.findUnique({ where: { id } });
      if (!exists) {
        throw new NotFoundException(`Customer ${id} not found`);
      }
      throw new ConflictException(
        'Customer was modified by another request. Please refresh and try again.',
      );
    }

    return this.prisma.customer.findUniqueOrThrow({ where: { id } });
  }

  async archive(id: string): Promise<Customer> {
    await this.findOne(id);
    return this.prisma.customer.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  }

  async restore(id: string): Promise<Customer> {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }
    return this.prisma.customer.update({
      where: { id },
      data: { archivedAt: null },
    });
  }
}
