import { BadRequestException, Injectable } from '@nestjs/common';
import { MultipartFile } from '@fastify/multipart';
import { StorageService } from '../../infrastructure/storage/storage.service';

const ALLOWED_FOLDERS = ['avatars', 'habits', 'categories', 'challenges'] as const;
type UploadFolder = (typeof ALLOWED_FOLDERS)[number];

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable()
export class UploadService {
  constructor(private readonly storageService: StorageService) {}

  async uploadImage(
    file: MultipartFile | undefined,
    folder: UploadFolder,
  ): Promise<{ message: string; url: string; path: string }> {
    if (!file) {
      throw new BadRequestException('Fayl topilmadi');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Faqat jpeg, png, webp formatlar qabul qilinadi');
    }

    if (!ALLOWED_FOLDERS.includes(folder)) {
      throw new BadRequestException('Noto\'g\'ri folder');
    }

    const buffer = await file.toBuffer();
    const { path, url } = await this.storageService.uploadFile(
      buffer,
      file.filename,
      folder,
    );

    return {
      message: 'Rasm muvaffaqiyatli yuklandi',
      url,
      path,
    };
  }

  deleteImage(filePath: string): { message: string } {
    this.storageService.deleteFile(filePath);
    return { message: 'Rasm muvaffaqiyatli o\'chirildi' };
  }
}