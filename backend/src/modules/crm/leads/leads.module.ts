import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { RoundRobinService } from './round-robin.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [LeadsController],
  providers: [LeadsService, RoundRobinService, PrismaService],
  exports: [LeadsService],
})
export class LeadsModule {}
