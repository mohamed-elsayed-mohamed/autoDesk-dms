import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { VinDecodeService } from './vin-decode.service';
import { StorageModule } from '../../common/storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [InventoryController],
  providers: [InventoryService, VinDecodeService],
})
export class InventoryModule {}
