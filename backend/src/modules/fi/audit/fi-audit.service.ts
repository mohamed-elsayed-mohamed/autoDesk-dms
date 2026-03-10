import { Injectable } from '@nestjs/common';
import { Prisma, FiAuditActionType } from '@prisma/client';

export interface FiAuditLogParams {
  dealId: string;
  actionType: FiAuditActionType;
  actorId: string;
  actorName: string;
  actorRole: string;
  entityType: string;
  entityId: string;
  beforeSnapshot?: Record<string, unknown> | null;
  afterSnapshot?: Record<string, unknown> | null;
}

@Injectable()
export class FiAuditService {
  /**
   * Insert-only. Always called inside the triggering mutation's transaction.
   * Pass tx (Prisma.TransactionClient) from caller.
   */
  async log(params: FiAuditLogParams, tx: Prisma.TransactionClient): Promise<void> {
    await tx.fIAuditLog.create({
      data: {
        dealId: params.dealId,
        actionType: params.actionType,
        actorId: params.actorId,
        actorName: params.actorName,
        actorRole: params.actorRole,
        entityType: params.entityType,
        entityId: params.entityId,
        beforeSnapshot: (params.beforeSnapshot ?? undefined) as Prisma.InputJsonValue | undefined,
        afterSnapshot: (params.afterSnapshot ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  /**
   * Paginated read for audit log endpoint (read-only, no mutations).
   */
  async findByDeal(
    dealId: string,
    page: number,
    limit: number,
    prisma:
      | Prisma.TransactionClient
      | {
          fIAuditLog: {
            findMany: (...args: any[]) => Promise<any>;
            count: (...args: any[]) => Promise<number>;
          };
        },
  ) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      (prisma as any).fIAuditLog.findMany({
        where: { dealId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      (prisma as any).fIAuditLog.count({ where: { dealId } }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
}
