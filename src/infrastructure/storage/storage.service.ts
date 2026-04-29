import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.baseUrl = configService.get<string>('APP_URL') ?? 'http://localhost:3000';
  }

  async uploadFile(
    buffer: Buffer,
    originalName: string,
    folder: string,
  ): Promise<{ path: string; url: string }> {
    const ext = path.extname(originalName).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    const folderPath = path.join(this.uploadDir, folder);
    const filePath = path.join(folderPath, filename);

    // Papka yo'q bo'lsa yaratish
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    fs.writeFileSync(filePath, buffer);

    return {
      path: `uploads/${folder}/${filename}`,
      url: `${this.baseUrl}/uploads/${folder}/${filename}`,
    };
  }

  deleteFile(filePath: string): void {
    const fullPath = path.join(process.cwd(), filePath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  getFileUrl(filePath: string): string {
    return `${this.baseUrl}/${filePath}`;
  }
}