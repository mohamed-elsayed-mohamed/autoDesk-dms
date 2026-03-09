import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TaskStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { paginate, PaginatedResponseDto } from '../../../common/dto/pagination.dto';
import {
  CreateTaskDto,
  LeadTaskFilterQueryDto,
  ReassignTaskDto,
  TaskFilterQueryDto,
  UpdateTaskStatusDto,
} from './dto';

const TASK_INCLUDE = {
  lead: {
    select: {
      id: true,
      source: true,
      status: true,
      customer: {
        select: { id: true, firstName: true, lastName: true, phone: true },
      },
    },
  },
  assignee: {
    select: { id: true, firstName: true, lastName: true },
  },
};

type TaskWithRelations = {
  id: string;
  leadId: string;
  assignedTo: string;
  type: string | null;
  description: string | null;
  dueAt: Date;
  completedAt: Date | null;
  status: TaskStatus;
  createdAt: Date;
  lead: unknown;
  assignee: unknown;
};

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  addIsOverdue<T extends { status: TaskStatus; dueAt: Date }>(task: T): T & { isOverdue: boolean } {
    const isOverdue = task.status === TaskStatus.Pending && task.dueAt < new Date();
    return { ...task, isOverdue };
  }

  async create(dto: CreateTaskDto, userId: string) {
    if (!dto.type && !dto.description) {
      throw new BadRequestException('At least one of type or description must be provided');
    }

    const dueAt = new Date(dto.dueAt);
    if (dueAt <= new Date()) {
      throw new BadRequestException('dueAt must be a future date');
    }

    const lead = await this.prisma.lead.findUnique({ where: { id: dto.leadId } });
    if (!lead) {
      throw new NotFoundException(`Lead ${dto.leadId} not found`);
    }

    const task = await this.prisma.task.create({
      data: {
        leadId: dto.leadId,
        assignedTo: userId,
        type: dto.type ?? null,
        description: dto.description ?? null,
        dueAt,
        status: TaskStatus.Pending,
      },
      include: TASK_INCLUDE,
    });

    return this.addIsOverdue(task as TaskWithRelations);
  }

  async updateStatus(id: string, dto: UpdateTaskStatusDto, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });

    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    if (task.status !== TaskStatus.Pending) {
      throw new BadRequestException('Task is not in Pending status');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isSalesManager = user?.role === UserRole.SalesManager;

    if (!isSalesManager && task.assignedTo !== userId) {
      throw new ForbiddenException(
        'Only the assigned user or a Sales Manager can update this task',
      );
    }

    const completedAt = dto.status === TaskStatus.Completed ? new Date() : null;

    const updated = await this.prisma.task.update({
      where: { id },
      data: { status: dto.status, completedAt },
      include: TASK_INCLUDE,
    });

    return this.addIsOverdue(updated as TaskWithRelations);
  }

  async reassign(id: string, dto: ReassignTaskDto) {
    const task = await this.prisma.task.findUnique({ where: { id } });

    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    if (task.status !== TaskStatus.Pending) {
      throw new BadRequestException('Can only reassign Pending tasks');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.assignedTo },
    });
    if (!targetUser || targetUser.role !== UserRole.SalesConsultant) {
      throw new BadRequestException('Target user is not an active Sales Consultant');
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: { assignedTo: dto.assignedTo },
      include: TASK_INCLUDE,
    });

    return this.addIsOverdue(updated as TaskWithRelations);
  }

  async getMyToday(userId: string) {
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const tasks = await this.prisma.task.findMany({
      where: {
        assignedTo: userId,
        status: TaskStatus.Pending,
        dueAt: { lte: endOfToday },
      },
      orderBy: { dueAt: 'asc' },
      include: TASK_INCLUDE,
    });

    const tasksWithOverdue = tasks.map((t) => this.addIsOverdue(t as TaskWithRelations));

    const overdueTasks = tasksWithOverdue.filter((t) => t.isOverdue);
    const todayTasks = tasksWithOverdue.filter((t) => !t.isOverdue);
    const sorted = [...overdueTasks, ...todayTasks];

    return {
      data: sorted,
      meta: {
        todayCount: todayTasks.length,
        overdueCount: overdueTasks.length,
      },
    };
  }

  async findAll(
    query: TaskFilterQueryDto,
    userId: string,
    userRole: UserRole,
  ): Promise<PaginatedResponseDto<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? 'dueAt';
    const sortOrder = query.sortOrder ?? 'asc';

    const where: Record<string, unknown> = {};

    if (userRole === UserRole.SalesManager) {
      if (query.assignedTo) {
        where.assignedTo = query.assignedTo;
      }
    } else {
      where.assignedTo = userId;
    }

    if (query.status) where.status = query.status;
    if (query.leadId) where.leadId = query.leadId;

    if (query.fromDate || query.toDate) {
      const dueAt: Record<string, Date> = {};
      if (query.fromDate) dueAt.gte = new Date(query.fromDate);
      if (query.toDate) dueAt.lte = new Date(query.toDate);
      where.dueAt = dueAt;
    }

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: TASK_INCLUDE,
      }),
      this.prisma.task.count({ where }),
    ]);

    const mapped = data.map((t) => this.addIsOverdue(t as TaskWithRelations));
    return paginate(mapped, total, page, limit);
  }

  async getLeadTasks(
    leadId: string,
    query: LeadTaskFilterQueryDto,
  ): Promise<PaginatedResponseDto<unknown>> {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException(`Lead ${leadId} not found`);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { leadId };
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueAt: 'asc' },
        include: TASK_INCLUDE,
      }),
      this.prisma.task.count({ where }),
    ]);

    const mapped = data.map((t) => this.addIsOverdue(t as TaskWithRelations));
    return paginate(mapped, total, page, limit);
  }
}
