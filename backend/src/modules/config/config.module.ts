import { Module } from '@nestjs/common';
import { DealershipConfigService } from './config.service';
import { DealershipConfigController } from './config.controller';

@Module({
  controllers: [DealershipConfigController],
  providers: [DealershipConfigService],
})
export class DealershipConfigModule {}
