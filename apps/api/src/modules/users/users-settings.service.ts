import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiPersonality, UserSettings } from '@prisma/client';

@Injectable()
export class UserSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateSettings(userId: string): Promise<UserSettings> {
    let settings = await this.prisma.userSettings.findUnique({ 
      where: { userId } 
    });
    
    if (!settings) {
      settings = await this.prisma.userSettings.create({
        data: { 
          userId, 
          aiPersonality: AiPersonality.FRIENDLY 
        }
      });
    }
    
    return settings;
  }

  async updatePersonality(userId: string, personality: AiPersonality): Promise<UserSettings> {
    return this.prisma.userSettings.upsert({
      where: { userId },
      update: { aiPersonality: personality },
      create: { userId, aiPersonality: personality }
    });
  }
}
