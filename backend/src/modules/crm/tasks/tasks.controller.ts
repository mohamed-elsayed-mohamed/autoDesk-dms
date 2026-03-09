import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TasksService } from './tasks.service';
import {
  CreateTaskDto,
  LeadTaskFilterQueryDto,
  ReassignTaskDto,
  TaskFilterQueryDto,
  UpdateTaskStatusDto,
} from './dto';

interface AuthUser {
  id: string;
  role: UserRole;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SalesConsultant, UserRole.BDCAgent, UserRole.SalesManager)
@Controller('api')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('tasks')
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: AuthUser) {
    return this.tasksService.create(dto, user.id);
  }

  @Get('tasks/my-today')
  getMyToday(@CurrentUser() user: AuthUser) {
    return this.tasksService.getMyToday(user.id);
  }

  @Get('tasks')
  findAll(@Query() query: TaskFilterQueryDto, @CurrentUser() user: AuthUser) {
    return this.tasksService.findAll(query, user.id, user.role);
  }

  @Patch('tasks/:id')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tasksService.updateStatus(id, dto, user.id);
  }

  @Roles(UserRole.SalesManager)
  @Patch('tasks/:id/reassign')
  reassign(@Param('id') id: string, @Body() dto: ReassignTaskDto) {
    return this.tasksService.reassign(id, dto);
  }

  @Get('leads/:id/tasks')
  getLeadTasks(@Param('id') id: string, @Query() query: LeadTaskFilterQueryDto) {
    return this.tasksService.getLeadTasks(id, query);
  }
}
