import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn(
        'Cloudinary is not configured. Upload features will be disabled. ' +
          'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET to enable.',
      );
    } else {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
    }
  }

  async uploadImage(file: Buffer, folder?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder || 'expense-ai',
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result?.secure_url || '');
          }
        },
      );

      uploadStream.end(file);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  generateSignature(folder: string) {
    try {
      const timestamp = Math.round(new Date().getTime() / 1000);
      const transformation = 'w_400,h_400,c_fill,g_face';

      // Kiểm tra biến môi trường
      const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
      const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
      const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');

      this.logger.debug(
        `generateSignature called - cloudName: ${cloudName ? 'SET' : 'MISSING'}, ` +
          `apiKey: ${apiKey ? 'SET' : 'MISSING'}, apiSecret: ${apiSecret ? 'SET' : 'MISSING'}`,
      );

      if (!apiSecret || !cloudName || !apiKey) {
        this.logger.error(
          `Cloudinary configuration missing - cloudName: ${!!cloudName}, apiKey: ${!!apiKey}, apiSecret: ${!!apiSecret}`,
        );
        throw new InternalServerErrorException(
          'Cloudinary chưa được cấu hình. Vui lòng liên hệ quản trị viên.',
        );
      }

      // Tạo signature với tất cả tham số sẽ được gửi lên
      const paramsToSign = {
        timestamp,
        folder,
        transformation,
      };

      this.logger.debug(`Generating signature with params: ${JSON.stringify(paramsToSign)}`);

      const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

      this.logger.debug(`Signature generated successfully`);

      return {
        signature,
        timestamp,
        cloudName,
        apiKey,
        folder,
        transformation,
      };
    } catch (error) {
      this.logger.error(
        `generateSignature error: ${error instanceof Error ? error.message : error}`,
      );
      throw error;
    }
  }
}
