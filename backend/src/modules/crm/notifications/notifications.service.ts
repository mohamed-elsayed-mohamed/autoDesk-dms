import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Notification } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { paginate, PaginatedResponseDto } from '../../../common/dto/pagination.dto';
import { NotificationListQueryDto } from './dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    type: NotificationType,
    referenceId: string,
    message: string,
  ): Promise<Notification> {
    return this.prisma.notification.create({
      data: { userId, type, referenceId, message },
    });
  }

  async findAll(
    userId: string,
    query: NotificationListQueryDto,
  ): Promise<PaginatedResponseDto<Notification>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = { userId };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { count };
  }

  async markRead(id: string, userId: string): Promise<{ id: string; readAt: Date }> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return { id: updated.id, readAt: updated.readAt as Date };
  }

  async markAllRead(userId: string): Promise<{ markedCount: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { markedCount: result.count };
  }
}
