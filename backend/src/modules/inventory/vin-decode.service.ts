import { Injectable, Logger } from '@nestjs/common';

export interface VinDecodeResult {
  decoded: boolean;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  bodyStyle?: string;
  fuelType?: string;
  reason?: string;
}

@Injectable()
export class VinDecodeService {
  private readonly logger = new Logger(VinDecodeService.name);

  async decode(vin: string): Promise<VinDecodeResult> {
    try {
      const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`;
      const response = await fetch(url);

      if (!response.ok) {
        return { decoded: false, reason: 'NHTSA service returned an error' };
      }

      const data = await response.json();
      const results = data?.Results?.[0];

      if (!results || !results.Make) {
        return { decoded: false, reason: 'No data returned for this VIN' };
      }

      return {
        decoded: true,
        year: results.ModelYear ? parseInt(results.ModelYear, 10) : undefined,
        make: results.Make || undefined,
        model: results.Model || undefined,
        trim: results.Trim || undefined,
        bodyStyle: results.BodyClass || undefined,
        fuelType: results.FuelTypePrimary || undefined,
      };
    } catch (error) {
      this.logger.warn(`VIN decode failed for ${vin}: ${error}`);
      return { decoded: false, reason: 'NHTSA unavailable or no data returned' };
    }
  }
}
