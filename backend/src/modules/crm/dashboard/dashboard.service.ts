import { Injectable } from '@nestjs/common';
import { LeadStatus, TaskStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface PipelineStats {
  [status: string]: number;
}

export interface WorkloadEntry {
  userId: string;
  firstName: string;
  lastName: string;
  activeLeadCount: number;
  pendingTaskCount: number;
  overdueTaskCount: number;
}

export interface OverdueByAssigneeEntry {
  userId: string;
  firstName: string;
  lastName: string;
  overdueCount: number;
}

export interface ManagerDashboard {
  pipeline: PipelineStats;
  workload: WorkloadEntry[];
  taskCompliance: {
    totalPending: number;
    totalOverdue: number;
    overdueByAssignee: OverdueByAssigneeEntry[];
  };
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getManagerStats(): Promise<ManagerDashboard> {
    const now = new Date();

    const [pipelineGroups, consultants, totalPending, totalOverdue, overdueTaskGroups] =
      await Promise.all([
        this.prisma.lead.groupBy({
          by: ['status'],
          _count: { id: true },
        }),
        this.prisma.user.findMany({
          where: { role: UserRole.SalesConsultant },
          select: { id: true, firstName: true, lastName: true },
          orderBy: { lastName: 'asc' },
        }),
        this.prisma.task.count({
          where: { status: TaskStatus.Pending },
        }),
        this.prisma.task.count({
          where: { status: TaskStatus.Pending, dueAt: { lt: now } },
        }),
        this.prisma.task.groupBy({
          by: ['assignedTo'],
          where: { status: TaskStatus.Pending, dueAt: { lt: now } },
          _count: { id: true },
        }),
      ]);

    // Build pipeline object with all statuses defaulting to 0
    const pipeline: PipelineStats = Object.values(LeadStatus).reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as PipelineStats);

    for (const group of pipelineGroups) {
      pipeline[group.status] = group._count.id;
    }

    // Build workload per consultant
    const consultantIds = consultants.map((c) => c.id);

    const [activeLeadCounts, pendingTaskCounts, overdueTaskCounts] = await Promise.all([
      this.prisma.lead.groupBy({
        by: ['assignedTo'],
        where: {
          assignedTo: { in: consultantIds },
          status: {
            notIn: [LeadStatus.Sold, LeadStatus.Lost],
          },
        },
        _count: { id: true },
      }),
      this.prisma.task.groupBy({
        by: ['assignedTo'],
        where: {
          assignedTo: { in: consultantIds },
          status: TaskStatus.Pending,
        },
        _count: { id: true },
      }),
      this.prisma.task.groupBy({
        by: ['assignedTo'],
        where: {
          assignedTo: { in: consultantIds },
          status: TaskStatus.Pending,
          dueAt: { lt: now },
        },
        _count: { id: true },
      }),
    ]);

    const activeLeadMap = new Map(
      activeLeadCounts.map((g) => [g.assignedTo as string, g._count.id]),
    );
    const pendingTaskMap = new Map(pendingTaskCounts.map((g) => [g.assignedTo, g._count.id]));
    const overdueTaskMap = new Map(overdueTaskCounts.map((g) => [g.assignedTo, g._count.id]));

    const workload: WorkloadEntry[] = consultants.map((c) => ({
      userId: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      activeLeadCount: activeLeadMap.get(c.id) ?? 0,
      pendingTaskCount: pendingTaskMap.get(c.id) ?? 0,
      overdueTaskCount: overdueTaskMap.get(c.id) ?? 0,
    }));

    // Build overdueByAssignee with user names
    const overdueUserIds = overdueTaskGroups.map((g) => g.assignedTo);
    const overdueUsers = await this.prisma.user.findMany({
      where: { id: { in: overdueUserIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const overdueUserMap = new Map(overdueUsers.map((u) => [u.id, u]));

    const overdueByAssignee: OverdueByAssigneeEntry[] = overdueTaskGroups.map((g) => {
      const user = overdueUserMap.get(g.assignedTo);
      return {
        userId: g.assignedTo,
        firstName: user?.firstName ?? '',
        lastName: user?.lastName ?? '',
        overdueCount: g._count.id,
      };
    });

    return {
      pipeline,
      workload,
      taskCompliance: {
        totalPending,
        totalOverdue,
        overdueByAssignee,
      },
    };
  }
}
