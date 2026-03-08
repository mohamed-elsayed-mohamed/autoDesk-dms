export interface StorageService {
  saveFile(file: Express.Multer.File, vehicleId: string): Promise<string>;
  deleteFile(url: string): Promise<void>;
}

export const STORAGE_SERVICE = 'STORAGE_SERVICE';
