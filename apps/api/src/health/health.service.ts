import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: {
      status: 'connected' | 'disconnected';
      responseTime?: number;
    };
  };
  version?: string;
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    const uptime = process.uptime();

    try {
      // Kiểm tra kết nối database
      const dbStartTime = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const dbResponseTime = Date.now() - dbStartTime;

      return {
        status: 'healthy',
        timestamp,
        uptime,
        services: {
          database: {
            status: 'connected',
            responseTime: dbResponseTime,
          },
        },
        version: process.env.npm_package_version || '1.0.0',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp,
        uptime,
        services: {
          database: {
            status: 'disconnected',
          },
        },
        version: process.env.npm_package_version || '1.0.0',
      };
    }
  }

  async readiness(): Promise<{ status: string; timestamp: string }> {
    try {
      // Kiểm tra xem service có sẵn sàng nhận traffic không
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'not ready',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async liveness(): Promise<{ status: string; timestamp: string }> {
    // Liveness check đơn giản - chỉ cần service đang chạy
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}
