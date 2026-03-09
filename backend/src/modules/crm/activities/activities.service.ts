import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { paginate, PaginatedResponseDto } from '../../../common/dto/pagination.dto';
import { CreateActivityDto, TimelineQueryDto } from './dto';

const ACTIVITY_INCLUDE = {
  performer: {
    select: { id: true, firstName: true, lastName: true },
  },
  lead: {
    select: { id: true, source: true, status: true },
  },
};

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateActivityDto, performedBy: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer ${dto.customerId} not found`);
    }

    if (dto.leadId) {
      const lead = await this.prisma.lead.findUnique({
        where: { id: dto.leadId },
      });
      if (!lead) {
        throw new NotFoundException(`Lead ${dto.leadId} not found`);
      }
      if (lead.customerId !== dto.customerId) {
        throw new BadRequestException('Lead does not belong to the specified customer');
      }
    }

    return this.prisma.activity.create({
      data: {
        customerId: dto.customerId,
        leadId: dto.leadId ?? null,
        type: dto.type,
        direction: dto.direction ?? null,
        content: dto.content ?? null,
        performedBy,
        performedAt: new Date(),
      },
      include: ACTIVITY_INCLUDE,
    });
  }

  async getCustomerTimeline(
    customerId: string,
    query: TimelineQueryDto,
  ): Promise<PaginatedResponseDto<unknown>> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where = { customerId };

    const [data, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { performedAt: 'desc' },
        include: ACTIVITY_INCLUDE,
      }),
      this.prisma.activity.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async getLeadActivities(
    leadId: string,
    query: TimelineQueryDto,
  ): Promise<PaginatedResponseDto<unknown>> {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException(`Lead ${leadId} not found`);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where = { leadId };

    const [data, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { performedAt: 'desc' },
        include: ACTIVITY_INCLUDE,
      }),
      this.prisma.activity.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }
}
