import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { Express } from 'express';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, callback) => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/svg+xml',
        ];
        if (allowedTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException('Invalid file type. Allowed: JPG, PNG, GIF, WebP, SVG'),
            false,
          );
        }
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder: string = 'uploads',
    @Body('filename') filename?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    try {
      const result = await this.uploadService.uploadFile(file, folder, filename);
      return {
        statusCode: HttpStatus.OK,
        message: 'File uploaded successfully',
        ...result,
      };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Upload failed');
    }
  }

  @Post('delete')
  async deleteFile(@Body('url') url: string) {
    if (!url) {
      throw new BadRequestException('No URL provided');
    }

    try {
      await this.uploadService.deleteFile(url);
      return {
        statusCode: HttpStatus.OK,
        message: 'File deleted successfully',
      };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Delete failed');
    }
  }
}
