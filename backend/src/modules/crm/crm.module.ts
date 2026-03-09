import { Module } from '@nestjs/common';
import { CustomersModule } from './customers/customers.module';
import { LeadsModule } from './leads/leads.module';
import { ActivitiesModule } from './activities/activities.module';
import { TasksModule } from './tasks/tasks.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    CustomersModule,
    LeadsModule,
    ActivitiesModule,
    TasksModule,
    NotificationsModule,
    DashboardModule,
  ],
})
export class CrmModule {}
