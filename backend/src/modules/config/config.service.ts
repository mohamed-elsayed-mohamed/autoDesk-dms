import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DealershipConfig } from '@prisma/client';

@Injectable()
export class DealershipConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(): Promise<DealershipConfig> {
    const config = await this.prisma.dealershipConfig.findUnique({ where: { id: 'default' } });
    if (!config) throw new NotFoundException('DealershipConfig not found. Run database seed.');
    return config;
  }

  async updateDealNumberOffset(newOffset: number): Promise<DealershipConfig> {
    const currentMax = await this.prisma.deal.aggregate({ _max: { dealNumber: true } });
    const maxDealNumber = currentMax._max.dealNumber ?? 0;

    // NOTE: dealNumberOffset configures the *initial* PostgreSQL sequence starting value only
    // (set once at migration time via T006). Changing this field post-deploy updates the stored
    // reference value for display and validation but does NOT re-seed the sequence. The sequence
    // continues incrementing from wherever it currently is.
    if (newOffset <= maxDealNumber) {
      throw new BadRequestException(
        `New offset (${newOffset}) must exceed the current highest deal number (${maxDealNumber}).`,
      );
    }

    return this.prisma.dealershipConfig.update({
      where: { id: 'default' },
      data: { dealNumberOffset: newOffset },
    });
  }
}
