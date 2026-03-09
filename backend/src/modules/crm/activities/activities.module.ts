import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Module({
  controllers: [ActivitiesController],
  providers: [ActivitiesService, PrismaService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
