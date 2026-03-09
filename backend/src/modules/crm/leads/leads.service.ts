import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeadStatus, NotificationType, UserRole } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { paginate, PaginatedResponseDto } from '../../../common/dto/pagination.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { RoundRobinService } from './round-robin.service';
import {
  AddVehicleDto,
  CreateLeadDto,
  LeadFilterQueryDto,
  UpdateLeadDto,
  UpdateLeadStatusDto,
} from './dto';

const LEAD_INCLUDE = {
  customer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      preferredContact: true,
    },
  },
  assignee: {
    select: { id: true, firstName: true, lastName: true },
  },
  vehicles: {
    include: {
      vehicle: {
        select: {
          id: true,
          year: true,
          make: true,
          model: true,
          trim: true,
          stockNumber: true,
          status: true,
          internetPrice: true,
        },
      },
    },
  },
  statusHistory: {
    orderBy: { changedAt: 'desc' as const },
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      lostReason: true,
      changedBy: true,
      changedAt: true,
    },
  },
};

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roundRobin: RoundRobinService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateLeadDto) {
    if (!dto.customerId && !dto.customer) {
      throw new BadRequestException('Either customerId or customer object must be provided');
    }
    if (dto.customerId && dto.customer) {
      throw new BadRequestException('Provide either customerId or customer object, not both');
    }

    if (dto.vehicleIds && dto.vehicleIds.length > 0) {
      const vehicles = await this.prisma.vehicle.findMany({
        where: { id: { in: dto.vehicleIds } },
        select: { id: true },
      });
      if (vehicles.length !== dto.vehicleIds.length) {
        throw new BadRequestException('One or more vehicle IDs do not exist');
      }
    }

    let assignedTo = dto.assignedTo;
    if (!assignedTo) {
      assignedTo = await this.roundRobin.assignNext();
    }

    const lead = await this.prisma.$transaction(async (tx) => {
      let customerId = dto.customerId!;

      if (dto.customer) {
        const { customer } = dto;
        if (!customer.phone && !customer.email) {
          throw new BadRequestException(
            'At least one of phone or email must be provided for customer',
          );
        }
        const newCustomer = await tx.customer.create({
          data: {
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: customer.phone,
            email: customer.email,
            street: customer.street,
            city: customer.city,
            state: customer.state,
            zip: customer.zip,
            preferredContact: customer.preferredContact,
            notes: customer.notes,
          },
        });
        customerId = newCustomer.id;
      }

      const newLead = await tx.lead.create({
        data: {
          customerId,
          source: dto.source,
          sourceOther: dto.sourceOther,
          assignedTo,
          notes: dto.notes,
          status: LeadStatus.New,
          ...(dto.vehicleIds && dto.vehicleIds.length > 0
            ? {
                vehicles: {
                  create: dto.vehicleIds.map((vehicleId) => ({ vehicleId })),
                },
              }
            : {}),
        },
        include: LEAD_INCLUDE,
      });

      return newLead;
    });

    if (assignedTo) {
      const customer = lead.customer as { firstName: string; lastName: string };
      const message = `New lead assigned: ${customer.firstName} ${customer.lastName} (${dto.source})`;
      await this.notifications.create(assignedTo, NotificationType.LeadAssigned, lead.id, message);
    }

    return lead;
  }

  async findAll(query: LeadFilterQueryDto): Promise<PaginatedResponseDto<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Record<string, unknown> = {};

    if (query.status) {
      const statuses = query.status.split(',').map((s) => s.trim() as LeadStatus);
      where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
    }
    if (query.assignedTo) where.assignedTo = query.assignedTo;
    if (query.source) where.source = query.source;
    if (query.customerId) where.customerId = query.customerId;

    if (query.fromDate || query.toDate) {
      const createdAt: Record<string, Date> = {};
      if (query.fromDate) createdAt.gte = new Date(query.fromDate);
      if (query.toDate) createdAt.lte = new Date(query.toDate);
      where.createdAt = createdAt;
    }

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          source: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
          assignee: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: { select: { vehicles: true } },
        },
      }),
      this.prisma.lead.count({ where }),
    ]);

    const mapped = data.map((lead) => ({
      ...lead,
      vehicleCount: (lead as { _count: { vehicles: number } })._count.vehicles,
      _count: undefined,
    }));

    return paginate(mapped, total, page, limit);
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: LEAD_INCLUDE,
    });

    if (!lead) {
      throw new NotFoundException(`Lead ${id} not found`);
    }

    return lead;
  }

  async update(id: string, dto: UpdateLeadDto) {
    await this.findOne(id);
    return this.prisma.lead.update({
      where: { id },
      data: {
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.sourceOther !== undefined && { sourceOther: dto.sourceOther }),
      },
      include: LEAD_INCLUDE,
    });
  }

  async updateStatus(id: string, dto: UpdateLeadStatusDto, userId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });

    if (!lead) {
      throw new NotFoundException(`Lead ${id} not found`);
    }

    if (lead.status === LeadStatus.Sold) {
      throw new ConflictException('Cannot change the status of a Sold lead');
    }

    if (lead.status === dto.status) {
      throw new BadRequestException(`Lead is already in ${dto.status} status`);
    }

    const isTransitioningToLost = dto.status === LeadStatus.Lost;
    const isReopeningFromLost = lead.status === LeadStatus.Lost;

    await this.prisma.leadStatusHistory.create({
      data: {
        leadId: id,
        fromStatus: lead.status,
        toStatus: dto.status,
        lostReason: isTransitioningToLost ? (dto.lostReason ?? null) : null,
        changedBy: userId,
      },
    });

    const updateData: Record<string, unknown> = { status: dto.status };
    if (isTransitioningToLost) {
      updateData.lostReason = dto.lostReason ?? null;
    } else if (isReopeningFromLost) {
      updateData.lostReason = null;
    }

    return this.prisma.lead.update({
      where: { id },
      data: updateData,
      include: LEAD_INCLUDE,
    });
  }

  async addVehicle(leadId: string, dto: AddVehicleDto) {
    await this.findOne(leadId);

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${dto.vehicleId} not found`);
    }

    const existing = await this.prisma.leadVehicle.findUnique({
      where: { leadId_vehicleId: { leadId, vehicleId: dto.vehicleId } },
    });
    if (existing) {
      throw new BadRequestException('Vehicle is already linked to this lead');
    }

    return this.prisma.leadVehicle.create({
      data: { leadId, vehicleId: dto.vehicleId },
      include: {
        vehicle: {
          select: { year: true, make: true, model: true, stockNumber: true },
        },
      },
    });
  }

  async removeVehicle(leadId: string, vehicleId: string): Promise<void> {
    const existing = await this.prisma.leadVehicle.findUnique({
      where: { leadId_vehicleId: { leadId, vehicleId } },
    });
    if (!existing) {
      throw new NotFoundException('Vehicle link not found');
    }
    await this.prisma.leadVehicle.delete({
      where: { leadId_vehicleId: { leadId, vehicleId } },
    });
  }

  async reassign(leadId: string, assignedTo: string) {
    const lead = await this.findOne(leadId);

    const targetUser = await this.prisma.user.findUnique({
      where: { id: assignedTo },
    });
    if (!targetUser || targetUser.role !== UserRole.SalesConsultant) {
      throw new BadRequestException('Target user is not an active Sales Consultant');
    }

    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: { assignedTo },
      include: LEAD_INCLUDE,
    });

    const customer = lead.customer as { firstName: string; lastName: string };
    const message = `Lead reassigned to you: ${customer.firstName} ${customer.lastName} (${lead.source})`;
    await this.notifications.create(assignedTo, NotificationType.LeadReassigned, leadId, message);

    return updated;
  }
}
