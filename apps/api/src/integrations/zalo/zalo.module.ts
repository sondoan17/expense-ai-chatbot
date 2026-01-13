import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { AgentModule } from '../../modules/agent/agent.module';
import { ZaloService } from './zalo.service';
import { ZaloLinkService } from './zalo-link.service';
import { ZaloWebhookController } from './zalo.webhook.controller';

@Module({
  imports: [ConfigModule, PrismaModule, forwardRef(() => AgentModule)],
  controllers: [ZaloWebhookController],
  providers: [ZaloService, ZaloLinkService],
  exports: [ZaloService, ZaloLinkService],
})
export class ZaloModule {}
