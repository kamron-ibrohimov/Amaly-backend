import {
  Body,
  Controller,
  Delete,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { UploadService } from './upload.service';

@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @ApiOperation({ summary: 'Rasm yuklash' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'folder',
    enum: ['avatars', 'habits', 'categories', 'challenges'],
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async uploadImage(
    @Req() req: any,
    @Query('folder') folder: 'avatars' | 'habits' | 'categories' | 'challenges',
  ) {
    const file = await req.file();
    return this.uploadService.uploadImage(file, folder);
  }

  @Delete('image')
  @ApiOperation({ summary: "Rasm o'chirish" })
  @ApiQuery({ name: 'path', example: 'uploads/avatars/uuid.jpg' })
  deleteImage(@Query('path') filePath: string) {
    return this.uploadService.deleteImage(filePath);
  }
}