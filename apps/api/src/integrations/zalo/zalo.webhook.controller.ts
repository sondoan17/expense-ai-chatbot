import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ZaloService } from './zalo.service';
import { ZaloLinkService } from './zalo-link.service';
import { AgentService } from '../../modules/agent/agent.service';
import { ZaloWebhookPayload } from './zalo.types';
import { ZALO_SECRET_HEADER, ZALO_COMMANDS, ZALO_MESSAGES } from './zalo.constants';
import { PublicUser } from '../../modules/users/types/public-user.type';

@Controller('zalo')
export class ZaloWebhookController {
  private readonly logger = new Logger(ZaloWebhookController.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly zaloService: ZaloService,
    private readonly zaloLinkService: ZaloLinkService,
    private readonly agentService: AgentService,
  ) {
    this.webhookSecret = this.configService.get<string>('ZALO_WEBHOOK_SECRET') ?? '';

    if (!this.webhookSecret) {
      this.logger.warn('ZALO_WEBHOOK_SECRET is not configured');
    }
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers(ZALO_SECRET_HEADER) secretToken: string,
    @Body() body: ZaloWebhookPayload,
  ) {
    // 1. Verify secret token
    if (this.webhookSecret && secretToken !== this.webhookSecret) {
      this.logger.warn('Invalid secret token received');
      throw new UnauthorizedException('Invalid secret token');
    }

    // 2. Validate payload
    if (!body?.ok || !body?.result) {
      this.logger.warn('Invalid webhook payload received');
      return { ok: true };
    }

    const { event_name, message } = body.result;

    // 3. Only handle text messages for now
    if (event_name !== 'message.text.received') {
      if (message?.chat?.id) {
        await this.zaloService.sendMessage(message.chat.id, ZALO_MESSAGES.vi.UNSUPPORTED_MESSAGE);
      }
      return { ok: true };
    }

    // 4. Extract message info
    if (!message) {
      this.logger.warn('No message in webhook payload');
      return { ok: true };
    }

    const chatId = message.chat.id;
    const zaloUserId = message.from.id;
    const text = message.text?.trim() ?? '';
    const displayName = message.from.display_name;

    this.logger.log(`Received message from ${displayName} (${zaloUserId}): "${text}"`);

    try {
      // 5. Handle special commands first
      const commandResult = await this.handleSpecialCommands(zaloUserId, chatId, text, displayName);

      if (commandResult.handled) {
        return { ok: true };
      }

      // 6. Check if user is linked
      const link = await this.zaloLinkService.findByZaloId(zaloUserId);

      if (!link) {
        await this.zaloService.sendMessage(chatId, ZALO_MESSAGES.vi.NOT_LINKED);
        return { ok: true };
      }

      // Update display name if changed
      if (displayName && displayName !== link.displayName) {
        await this.zaloLinkService.updateDisplayName(zaloUserId, displayName);
      }

      // 7. Send typing indicator
      await this.zaloService.sendChatAction(chatId, 'typing');

      // 8. Process message with AgentService (reuse 100%)
      const publicUser: PublicUser = {
        id: link.user.id,
        email: link.user.email,
        name: link.user.name,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await this.agentService.chat(publicUser, text);

      // 9. Send reply
      await this.zaloService.sendMessage(chatId, result.reply);

      this.logger.log(`Replied to ${displayName}: "${result.reply.slice(0, 100)}..."`);

      return { ok: true };
    } catch (error) {
      this.logger.error('Error processing Zalo message', error);

      // Send error message to user
      await this.zaloService.sendMessage(chatId, ZALO_MESSAGES.vi.ERROR);

      return { ok: true };
    }
  }

  /**
   * Handle special commands (link, unlink, help)
   */
  private async handleSpecialCommands(
    zaloUserId: string,
    chatId: string,
    text: string,
    displayName?: string,
  ): Promise<{ handled: boolean }> {
    const lower = text.toLowerCase().trim();

    // Help command
    if (ZALO_COMMANDS.HELP.some((cmd) => lower === cmd)) {
      await this.zaloService.sendMessage(chatId, ZALO_MESSAGES.vi.HELP);
      return { handled: true };
    }

    // Link command: "lienket email@example.com" or "link email@example.com"
    const linkMatch = lower.match(/^(lienket|link)\s+(\S+@\S+\.\S+)$/i);
    if (linkMatch) {
      const email = linkMatch[2].toLowerCase();

      this.logger.log(`Link request from ${zaloUserId} for email: ${email}`);

      const result = await this.zaloLinkService.linkByEmail(zaloUserId, email, displayName);

      if (result.success) {
        await this.zaloService.sendMessage(chatId, ZALO_MESSAGES.vi.LINK_SUCCESS);
      } else if (result.reason === 'ALREADY_LINKED') {
        await this.zaloService.sendMessage(chatId, ZALO_MESSAGES.vi.LINK_ALREADY);
      } else {
        await this.zaloService.sendMessage(chatId, ZALO_MESSAGES.vi.LINK_EMAIL_NOT_FOUND);
      }

      return { handled: true };
    }

    // Unlink command
    if (ZALO_COMMANDS.UNLINK.some((cmd) => lower === cmd)) {
      this.logger.log(`Unlink request from ${zaloUserId}`);

      const result = await this.zaloLinkService.unlink(zaloUserId);

      const msg = result.success
        ? ZALO_MESSAGES.vi.UNLINK_SUCCESS
        : ZALO_MESSAGES.vi.UNLINK_NOT_FOUND;

      await this.zaloService.sendMessage(chatId, msg);

      return { handled: true };
    }

    return { handled: false };
  }
}
