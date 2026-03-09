import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { ListVehiclesQueryDto } from './dto/list-vehicles-query.dto';
import { VehicleStatus, Prisma } from '@prisma/client';

const STOCK_NUMBER_START = 1001;

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  private validateInternetPrice(status: VehicleStatus, internetPrice?: number | null) {
    if (
      status === VehicleStatus.FrontlineReady &&
      (internetPrice === null || internetPrice === undefined)
    ) {
      throw new BadRequestException('internetPrice is required when status is FrontlineReady');
    }
  }

  private computeDaysInStock(dateAcquired: Date, dateSold: Date | null): number {
    const end = dateSold || new Date();
    const diff = end.getTime() - dateAcquired.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  private formatVehicleResponse(vehicle: any) {
    return {
      ...vehicle,
      msrp: vehicle.msrp?.toString() ?? null,
      invoicePrice: vehicle.invoicePrice?.toString() ?? null,
      internetPrice: vehicle.internetPrice?.toString() ?? null,
      salePrice: vehicle.salePrice?.toString() ?? null,
      daysInStock: this.computeDaysInStock(vehicle.dateAcquired, vehicle.dateSold),
      photos: vehicle.photos?.sort((a: any, b: any) => a.sortOrder - b.sortOrder) ?? [],
      history:
        vehicle.history
          ?.map((h: any) => ({
            id: h.id,
            changeType: h.changeType,
            fieldName: h.fieldName,
            oldValue: h.oldValue,
            newValue: h.newValue,
            changedAt: h.createdAt,
            changedBy: h.user
              ? {
                  id: h.user.id,
                  firstName: h.user.firstName,
                  lastName: h.user.lastName,
                }
              : null,
          }))
          .sort(
            (a: any, b: any) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
          ) ?? [],
    };
  }

  async create(dto: CreateVehicleDto, userId: string) {
    this.validateInternetPrice(dto.status, dto.internetPrice);

    return this.prisma.$transaction(async (tx) => {
      const activeExisting = await tx.vehicle.findFirst({
        where: { vin: dto.vin, deletedAt: null },
      });
      if (activeExisting) {
        throw new BadRequestException('A vehicle with this VIN already exists');
      }

      const deletedExisting = await tx.vehicle.findFirst({
        where: { vin: dto.vin, deletedAt: { not: null } },
      });
      if (deletedExisting) {
        throw new ConflictException({
          message: 'A vehicle with this VIN already exists in your archived records.',
          archivedVehicleId: deletedExisting.id,
          stockNumber: deletedExisting.stockNumber,
        });
      }

      const maxStock = await tx.vehicle.aggregate({
        _max: { stockNumber: true },
      });
      const nextStockNumber = (maxStock._max.stockNumber ?? STOCK_NUMBER_START - 1) + 1;

      const vehicle = await tx.vehicle.create({
        data: {
          vin: dto.vin,
          stockNumber: nextStockNumber,
          year: dto.year,
          make: dto.make,
          model: dto.model,
          trim: dto.trim,
          bodyStyle: dto.bodyStyle,
          exteriorColor: dto.exteriorColor,
          interiorColor: dto.interiorColor,
          mileage: dto.mileage ?? 0,
          condition: dto.condition,
          status: dto.status,
          msrp: dto.msrp,
          invoicePrice: dto.invoicePrice,
          internetPrice: dto.internetPrice,
          salePrice: dto.salePrice,
          lotLocation: dto.lotLocation,
          dateAcquired: dto.dateAcquired ? new Date(dto.dateAcquired) : new Date(),
        },
        include: {
          photos: true,
          history: { include: { user: true } },
        },
      });

      await tx.vehicleHistory.create({
        data: {
          vehicleId: vehicle.id,
          changeType: 'created',
          fieldName: null,
          oldValue: null,
          newValue: null,
          userId,
        },
      });

      const full = await tx.vehicle.findUnique({
        where: { id: vehicle.id },
        include: {
          photos: true,
          history: { include: { user: true } },
        },
      });

      return this.formatVehicleResponse(full);
    });
  }

  async update(id: string, dto: UpdateVehicleDto, userId: string) {
    const existing = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Vehicle not found');
    }

    const newStatus = dto.status ?? existing.status;
    const newInternetPrice =
      dto.internetPrice !== undefined ? dto.internetPrice : existing.internetPrice;
    this.validateInternetPrice(
      newStatus,
      newInternetPrice !== null ? Number(newInternetPrice) : null,
    );

    const historyEntries: Array<{
      vehicleId: string;
      changeType: string;
      fieldName: string;
      oldValue: string | null;
      newValue: string | null;
      userId: string;
    }> = [];

    if (dto.status && dto.status !== existing.status) {
      historyEntries.push({
        vehicleId: id,
        changeType: 'status_change',
        fieldName: 'status',
        oldValue: existing.status,
        newValue: dto.status,
        userId,
      });
    }

    const priceFields = ['msrp', 'invoicePrice', 'internetPrice', 'salePrice'] as const;
    for (const field of priceFields) {
      if (dto[field] !== undefined) {
        const oldVal = existing[field];
        const newVal = dto[field];
        if (String(oldVal) !== String(newVal)) {
          historyEntries.push({
            vehicleId: id,
            changeType: 'price_change',
            fieldName: field,
            oldValue: oldVal?.toString() ?? null,
            newValue: newVal?.toString() ?? null,
            userId,
          });
        }
      }
    }

    const updateData: any = {};
    const dtoEntries = Object.entries(dto).filter(([, v]) => v !== undefined);
    for (const [key, value] of dtoEntries) {
      if (key === 'dateAcquired') {
        updateData[key] = new Date(value as string);
      } else {
        updateData[key] = value;
      }
    }

    const vehicle = await this.prisma.$transaction(async (tx) => {
      await tx.vehicle.update({
        where: { id },
        data: updateData,
      });

      if (historyEntries.length > 0) {
        await tx.vehicleHistory.createMany({ data: historyEntries });
      }

      return tx.vehicle.findUnique({
        where: { id },
        include: {
          photos: true,
          history: { include: { user: true } },
        },
      });
    });

    return this.formatVehicleResponse(vehicle);
  }

  async softDelete(id: string, userId: string) {
    const existing = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Vehicle not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.vehicle.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      await tx.vehicleHistory.create({
        data: {
          vehicleId: id,
          changeType: 'status_change',
          fieldName: 'deletedAt',
          oldValue: null,
          newValue: new Date().toISOString(),
          userId,
        },
      });
    });
  }

  async restore(id: string, userId: string) {
    const existing = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!existing || !existing.deletedAt) {
      throw new NotFoundException('Vehicle not found or not soft-deleted');
    }

    const vehicle = await this.prisma.$transaction(async (tx) => {
      await tx.vehicle.update({
        where: { id },
        data: { deletedAt: null },
      });
      await tx.vehicleHistory.create({
        data: {
          vehicleId: id,
          changeType: 'status_change',
          fieldName: 'deletedAt',
          oldValue: existing.deletedAt!.toISOString(),
          newValue: null,
          userId,
        },
      });
      return tx.vehicle.findUnique({
        where: { id },
        include: {
          photos: true,
          history: { include: { user: true } },
        },
      });
    });

    return this.formatVehicleResponse(vehicle);
  }

  async findOne(id: string, userRole: string) {
    const where: any = { id };
    if (userRole !== 'InventoryManager') {
      where.deletedAt = null;
    }

    const vehicle = await this.prisma.vehicle.findFirst({
      where,
      include: {
        photos: true,
        history: { include: { user: true } },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return this.formatVehicleResponse(vehicle);
  }

  async findAll(query: ListVehiclesQueryDto, userRole: string) {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const skip = (page - 1) * limit;

    const where: Prisma.VehicleWhereInput = {};

    if (query.includeDeleted && userRole === 'InventoryManager') {
      // No deletedAt filter — show all including archived
    } else {
      where.deletedAt = null;
      where.status = {
        notIn: [VehicleStatus.Sold, VehicleStatus.Wholesaled],
      };
    }

    if (query.make) {
      where.make = { contains: query.make, mode: 'insensitive' };
    }
    if (query.model) {
      where.model = { contains: query.model, mode: 'insensitive' };
    }
    if (query.year) {
      where.year = query.year;
    }
    if (query.bodyStyle) {
      where.bodyStyle = { contains: query.bodyStyle, mode: 'insensitive' };
    }
    if (query.condition) {
      where.condition = query.condition;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.color) {
      where.exteriorColor = { contains: query.color, mode: 'insensitive' };
    }
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.internetPrice = {};
      if (query.minPrice !== undefined) where.internetPrice.gte = query.minPrice;
      if (query.maxPrice !== undefined) where.internetPrice.lte = query.maxPrice;
    }
    if (query.minMileage !== undefined || query.maxMileage !== undefined) {
      where.mileage = {};
      if (query.minMileage !== undefined) (where.mileage as any).gte = query.minMileage;
      if (query.maxMileage !== undefined) (where.mileage as any).lte = query.maxMileage;
    }

    if (query.q) {
      where.OR = [
        { make: { contains: query.q, mode: 'insensitive' } },
        { model: { contains: query.q, mode: 'insensitive' } },
        { trim: { contains: query.q, mode: 'insensitive' } },
        { vin: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const sortBy = query.sortBy || 'dateAcquired';
    const sortOrder = query.sortOrder || 'desc';
    const orderBy: any = { [sortBy]: sortOrder };

    const [vehicles, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          photos: { where: { isPrimary: true }, take: 1 },
        },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    const data = vehicles.map((v) => ({
      id: v.id,
      stockNumber: v.stockNumber,
      vin: v.vin,
      year: v.year,
      make: v.make,
      model: v.model,
      trim: v.trim,
      condition: v.condition,
      status: v.status,
      internetPrice: v.internetPrice?.toString() ?? null,
      mileage: v.mileage,
      exteriorColor: v.exteriorColor,
      primaryPhotoUrl: v.photos[0]?.url ?? null,
      dateAcquired: v.dateAcquired.toISOString(),
      daysInStock: this.computeDaysInStock(v.dateAcquired, v.dateSold),
      deletedAt: v.deletedAt?.toISOString() ?? null,
    }));

    return {
      data,
      meta: { page, limit, total },
    };
  }

  async getDashboard(page: number = 1, limit: number = 25) {
    const activeWhere: Prisma.VehicleWhereInput = {
      deletedAt: null,
      status: { notIn: [VehicleStatus.Sold, VehicleStatus.Wholesaled] },
    };

    const [totalCount, aggregation, allActive] = await Promise.all([
      this.prisma.vehicle.count({ where: activeWhere }),
      this.prisma.vehicle.aggregate({
        where: activeWhere,
        _sum: { internetPrice: true },
      }),
      this.prisma.vehicle.findMany({
        where: activeWhere,
        select: { dateAcquired: true, dateSold: true },
      }),
    ]);

    const totalValue = aggregation._sum.internetPrice?.toString() ?? '0';

    const avgDays =
      allActive.length > 0
        ? Math.round(
            allActive.reduce(
              (sum, v) => sum + this.computeDaysInStock(v.dateAcquired, v.dateSold),
              0,
            ) / allActive.length,
          )
        : 0;

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const agingWhere: Prisma.VehicleWhereInput = {
      ...activeWhere,
      dateAcquired: { lt: sixtyDaysAgo },
    };

    const [agingVehicles, agingTotal] = await Promise.all([
      this.prisma.vehicle.findMany({
        where: agingWhere,
        orderBy: { dateAcquired: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.vehicle.count({ where: agingWhere }),
    ]);

    return {
      totalCount,
      totalValue,
      averageDaysInStock: avgDays,
      agingList: {
        data: agingVehicles.map((v) => ({
          stockNumber: v.stockNumber,
          make: v.make,
          model: v.model,
          daysInStock: this.computeDaysInStock(v.dateAcquired, v.dateSold),
          internetPrice: v.internetPrice?.toString() ?? '0',
        })),
        meta: { page, limit, total: agingTotal },
      },
    };
  }

  async uploadPhoto(vehicleId: string, url: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { photos: true },
    });

    if (!vehicle || vehicle.deletedAt) {
      throw new NotFoundException('Vehicle not found');
    }

    if (vehicle.photos.length >= 20) {
      throw new BadRequestException('Photo limit reached (20/20)');
    }

    const maxSort = vehicle.photos.reduce((max, p) => Math.max(max, p.sortOrder), -1);
    const isPrimary = vehicle.photos.length === 0;

    const photo = await this.prisma.vehiclePhoto.create({
      data: {
        vehicleId,
        url,
        sortOrder: maxSort + 1,
        isPrimary,
      },
    });

    return photo;
  }

  async updatePhoto(
    vehicleId: string,
    photoId: string,
    data: { isPrimary?: boolean; sortOrder?: number },
  ) {
    const photo = await this.prisma.vehiclePhoto.findFirst({
      where: { id: photoId, vehicleId },
    });
    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    if (data.isPrimary) {
      await this.prisma.vehiclePhoto.updateMany({
        where: { vehicleId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const updated = await this.prisma.vehiclePhoto.update({
      where: { id: photoId },
      data: {
        ...(data.isPrimary !== undefined ? { isPrimary: data.isPrimary } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
    });

    return updated;
  }

  async reorderPhotos(vehicleId: string, order: string[]) {
    const photos = await this.prisma.vehiclePhoto.findMany({
      where: { vehicleId },
    });
    const photoIds = new Set(photos.map((p) => p.id));
    const orderSet = new Set(order);

    if (photoIds.size !== orderSet.size || !order.every((id) => photoIds.has(id))) {
      throw new BadRequestException('Order array does not match the vehicle photo IDs');
    }

    await this.prisma.$transaction(
      order.map((id, index) =>
        this.prisma.vehiclePhoto.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.prisma.vehiclePhoto.findMany({
      where: { vehicleId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async deletePhoto(vehicleId: string, photoId: string): Promise<string | null> {
    const photo = await this.prisma.vehiclePhoto.findFirst({
      where: { id: photoId, vehicleId },
    });
    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    const url = photo.url;
    const wasPrimary = photo.isPrimary;

    await this.prisma.vehiclePhoto.delete({ where: { id: photoId } });

    if (wasPrimary) {
      const next = await this.prisma.vehiclePhoto.findFirst({
        where: { vehicleId },
        orderBy: { sortOrder: 'asc' },
      });
      if (next) {
        await this.prisma.vehiclePhoto.update({
          where: { id: next.id },
          data: { isPrimary: true },
        });
      }
    }

    return url;
  }
}
