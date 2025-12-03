import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ftp from 'basic-ftp';
import * as path from 'path';
import { Readable } from 'stream';

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  folder: string;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  // cPanel FTP configuration
  private readonly ftpHost: string;
  private readonly ftpUser: string;
  private readonly ftpPassword: string;
  private readonly ftpPort: number;
  private readonly ftpBasePath: string;
  private readonly cdnBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    // Load configuration from environment variables
    this.ftpHost = this.configService.get<string>('CPANEL_FTP_HOST', '');
    this.ftpUser = this.configService.get<string>('CPANEL_FTP_USER', '');
    this.ftpPassword = this.configService.get<string>('CPANEL_FTP_PASSWORD', '');
    this.ftpPort = this.configService.get<number>('CPANEL_FTP_PORT', 21);
    this.ftpBasePath = this.configService.get<string>('CPANEL_FTP_BASE_PATH', '/public_html/uploads');
    this.cdnBaseUrl = this.configService.get<string>('CDN_BASE_URL', 'https://assets.yourdomain.com');
  }

  /**
   * Generate a unique filename
   */
  private generateFilename(originalName: string, providedFilename?: string): string {
    if (providedFilename) {
      return providedFilename;
    }
    const extension = path.extname(originalName).toLowerCase() || '.jpg';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}${extension}`;
  }

  /**
   * Upload a file to cPanel via FTP
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads',
    providedFilename?: string,
  ): Promise<UploadResult> {
    const filename = this.generateFilename(file.originalname, providedFilename);
    const remotePath = `${this.ftpBasePath}/${folder}`;
    const remoteFilePath = `${remotePath}/${filename}`;

    // If FTP is not configured, use local storage fallback
    if (!this.ftpHost || !this.ftpUser || !this.ftpPassword) {
      this.logger.warn('FTP not configured, using mock upload');
      return this.mockUpload(file, folder, filename);
    }

    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
      this.logger.log(`Connecting to FTP server: ${this.ftpHost}`);

      await client.access({
        host: this.ftpHost,
        user: this.ftpUser,
        password: this.ftpPassword,
        port: this.ftpPort,
        secure: false, // Set to true for FTPS
      });

      // Ensure the directory exists
      await client.ensureDir(remotePath);

      // Upload the file
      const stream = Readable.from(file.buffer);
      await client.uploadFrom(stream, remoteFilePath);

      this.logger.log(`File uploaded successfully: ${remoteFilePath}`);

      return {
        url: `${this.cdnBaseUrl}/${folder}/${filename}`,
        filename,
        size: file.size,
        folder,
      };
    } catch (error: any) {
      this.logger.error(`FTP upload failed: ${error.message}`);
      throw new Error(`Upload failed: ${error.message}`);
    } finally {
      client.close();
    }
  }

  /**
   * Delete a file from cPanel via FTP
   */
  async deleteFile(url: string): Promise<void> {
    // Extract the path from the URL
    const urlObj = new URL(url);
    const filePath = urlObj.pathname;
    const remotePath = `${this.ftpBasePath}${filePath}`;

    // If FTP is not configured, skip deletion
    if (!this.ftpHost || !this.ftpUser || !this.ftpPassword) {
      this.logger.warn('FTP not configured, skipping deletion');
      return;
    }

    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
      await client.access({
        host: this.ftpHost,
        user: this.ftpUser,
        password: this.ftpPassword,
        port: this.ftpPort,
        secure: false,
      });

      await client.remove(remotePath);
      this.logger.log(`File deleted successfully: ${remotePath}`);
    } catch (error: any) {
      this.logger.error(`FTP delete failed: ${error.message}`);
      throw new Error(`Delete failed: ${error.message}`);
    } finally {
      client.close();
    }
  }

  /**
   * Mock upload for development/testing when FTP is not configured
   * Returns a URL that works with local development
   */
  private async mockUpload(
    file: Express.Multer.File,
    folder: string,
    filename: string,
  ): Promise<UploadResult> {
    // In development, you could save to local filesystem
    // For now, we'll just return a mock URL
    this.logger.log(`Mock upload: ${folder}/${filename}`);

    return {
      url: `${this.cdnBaseUrl}/${folder}/${filename}`,
      filename,
      size: file.size,
      folder,
    };
  }
}
