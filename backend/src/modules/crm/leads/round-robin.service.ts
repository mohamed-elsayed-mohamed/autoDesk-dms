import { BadRequestException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class RoundRobinService {
  constructor(private readonly prisma: PrismaService) {}

  async assignNext(): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const state = await tx.roundRobinState.findUnique({
        where: { id: 'lead-assignment' },
      });

      const consultants = await tx.user.findMany({
        where: { role: UserRole.SalesConsultant },
        orderBy: { id: 'asc' },
        select: { id: true },
      });

      if (consultants.length === 0) {
        throw new BadRequestException('No active Sales Consultants available for lead assignment');
      }

      const lastId = state?.lastAssignedUserId ?? null;
      let nextId: string;

      if (!lastId) {
        nextId = consultants[0].id;
      } else {
        const lastIndex = consultants.findIndex((c) => c.id === lastId);
        if (lastIndex === -1 || lastIndex === consultants.length - 1) {
          nextId = consultants[0].id;
        } else {
          nextId = consultants[lastIndex + 1].id;
        }
      }

      await tx.roundRobinState.upsert({
        where: { id: 'lead-assignment' },
        create: { id: 'lead-assignment', lastAssignedUserId: nextId },
        update: { lastAssignedUserId: nextId },
      });

      return nextId;
    });
  }
}
