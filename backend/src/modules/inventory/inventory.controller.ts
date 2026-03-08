import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Inject,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { VinDecodeService } from './vin-decode.service';
import {
  STORAGE_SERVICE,
  StorageService,
} from '../../common/storage/storage.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { ListVehiclesQueryDto } from './dto/list-vehicles-query.dto';
import { PhotoReorderDto } from './dto/photo-reorder.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';

@Controller('api/vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly vinDecodeService: VinDecodeService,
    @Inject(STORAGE_SERVICE) private readonly storageService: StorageService,
  ) {}

  @Get('dashboard')
  @Roles(UserRole.GeneralManager, UserRole.InventoryManager)
  async getDashboard(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getDashboard(
      page ? parseInt(page, 10) : 1,
      limit ? Math.min(parseInt(limit, 10), 50) : 25,
    );
  }

  @Get('vin-decode/:vin')
  @Roles(UserRole.InventoryManager)
  async vinDecode(@Param('vin') vin: string) {
    return this.vinDecodeService.decode(vin);
  }

  @Get()
  async list(
    @Query() query: ListVehiclesQueryDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.inventoryService.findAll(query, user.role);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.inventoryService.findOne(id, user.role);
  }

  @Post()
  @Roles(UserRole.InventoryManager)
  async create(
    @Body() dto: CreateVehicleDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.inventoryService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(UserRole.InventoryManager)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.inventoryService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.InventoryManager)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    await this.inventoryService.softDelete(id, user.id);
  }

  @Post(':id/restore')
  @Roles(UserRole.InventoryManager)
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.inventoryService.restore(id, user.id);
  }

  @Post(':id/photos')
  @Roles(UserRole.InventoryManager)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async uploadPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const url = await this.storageService.saveFile(file, id);
    return this.inventoryService.uploadPhoto(id, url);
  }

  @Patch(':id/photos/reorder')
  @Roles(UserRole.InventoryManager)
  async reorderPhotos(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PhotoReorderDto,
  ) {
    return this.inventoryService.reorderPhotos(id, dto.order);
  }

  @Patch(':id/photos/:photoId')
  @Roles(UserRole.InventoryManager)
  async updatePhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @Body() dto: UpdatePhotoDto,
  ) {
    return this.inventoryService.updatePhoto(id, photoId, dto);
  }

  @Delete(':id/photos/:photoId')
  @Roles(UserRole.InventoryManager)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ) {
    const url = await this.inventoryService.deletePhoto(id, photoId);
    if (url) {
      await this.storageService.deleteFile(url);
    }
  }
}
