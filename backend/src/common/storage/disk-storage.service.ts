import { Injectable } from '@nestjs/common';
import { StorageService } from './storage.service';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DiskStorageService implements StorageService {
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
  }

  async saveFile(file: Express.Multer.File, vehicleId: string): Promise<string> {
    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `${uuidv4()}${ext}`;
    const dir = path.join(this.uploadDir, 'vehicles', vehicleId);

    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(path.join(dir, filename), file.buffer);

    return `/uploads/vehicles/${vehicleId}/${filename}`;
  }

  async deleteFile(url: string): Promise<void> {
    const filePath = path.join(this.uploadDir, url.replace('/uploads/', ''));
    try {
      await fs.promises.unlink(filePath);
    } catch {
      // File may already be deleted
    }
  }
}
