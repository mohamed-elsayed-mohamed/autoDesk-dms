import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CrmModule } from './modules/crm/crm.module';
import { DealsModule } from './modules/deals/deals.module';
import { DealershipConfigModule } from './modules/config/config.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    InventoryModule,
    CrmModule,
    DealsModule,
    DealershipConfigModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
