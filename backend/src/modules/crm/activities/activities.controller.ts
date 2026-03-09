import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto, TimelineQueryDto } from './dto';

interface AuthUser {
  id: string;
  role: UserRole;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SalesConsultant, UserRole.BDCAgent, UserRole.SalesManager)
@Controller('api')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post('activities')
  create(@Body() dto: CreateActivityDto, @CurrentUser() user: AuthUser) {
    return this.activitiesService.create(dto, user.id);
  }

  @Get('customers/:id/timeline')
  getCustomerTimeline(@Param('id') id: string, @Query() query: TimelineQueryDto) {
    return this.activitiesService.getCustomerTimeline(id, query);
  }

  @Get('leads/:id/activities')
  getLeadActivities(@Param('id') id: string, @Query() query: TimelineQueryDto) {
    return this.activitiesService.getLeadActivities(id, query);
  }
}
