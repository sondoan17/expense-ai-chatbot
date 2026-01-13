import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ZaloLinkResult } from './zalo.types';

@Injectable()
export class ZaloLinkService {
  private readonly logger = new Logger(ZaloLinkService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find a Zalo link by Zalo user ID
   */
  async findByZaloId(zaloUserId: string) {
    return this.prisma.zaloUserLink.findUnique({
      where: { zaloUserId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
    });
  }

  /**
   * Find all Zalo links for a user
   */
  async findByUserId(userId: string) {
    return this.prisma.zaloUserLink.findMany({
      where: { userId },
    });
  }

  /**
   * Link a Zalo account to a user by email
   */
  async linkByEmail(
    zaloUserId: string,
    email: string,
    displayName?: string,
  ): Promise<ZaloLinkResult> {
    try {
      // Check if this Zalo account is already linked
      const existingLink = await this.findByZaloId(zaloUserId);
      if (existingLink) {
        this.logger.debug(`Zalo ${zaloUserId} is already linked to user ${existingLink.userId}`);
        return { success: false, reason: 'ALREADY_LINKED' };
      }

      // Find user by email (case-insensitive)
      const user = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      if (!user) {
        this.logger.debug(`Email not found: ${email}`);
        return { success: false, reason: 'EMAIL_NOT_FOUND' };
      }

      // Create the link
      await this.prisma.zaloUserLink.create({
        data: {
          zaloUserId,
          userId: user.id,
          displayName: displayName ?? null,
        },
      });

      this.logger.log(`Linked Zalo ${zaloUserId} (${displayName}) to user ${user.email}`);

      return { success: true, user };
    } catch (error) {
      this.logger.error('Failed to link Zalo account', error);
      throw error;
    }
  }

  /**
   * Unlink a Zalo account
   */
  async unlink(zaloUserId: string): Promise<ZaloLinkResult> {
    try {
      const existingLink = await this.findByZaloId(zaloUserId);

      if (!existingLink) {
        this.logger.debug(`Zalo ${zaloUserId} is not linked`);
        return { success: false, reason: 'NOT_LINKED' };
      }

      await this.prisma.zaloUserLink.delete({
        where: { zaloUserId },
      });

      this.logger.log(`Unlinked Zalo ${zaloUserId} from user ${existingLink.userId}`);

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to unlink Zalo account', error);
      throw error;
    }
  }

  /**
   * Update display name for a Zalo link
   */
  async updateDisplayName(zaloUserId: string, displayName: string): Promise<void> {
    try {
      await this.prisma.zaloUserLink.update({
        where: { zaloUserId },
        data: { displayName },
      });
    } catch (error) {
      // Ignore if link doesn't exist
      this.logger.debug(`Failed to update display name for ${zaloUserId}`, error);
    }
  }
}
