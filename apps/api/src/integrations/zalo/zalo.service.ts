import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ZALO_API_BASE, ZALO_MAX_MESSAGE_LENGTH } from './zalo.constants';
import { ZaloSendMessageResponse, ZaloSetWebhookResponse, ZaloGetMeResponse } from './zalo.types';

@Injectable()
export class ZaloService {
  private readonly logger = new Logger(ZaloService.name);
  private readonly botToken: string;
  private readonly apiBase = ZALO_API_BASE;

  constructor(private readonly configService: ConfigService) {
    this.botToken = this.configService.get<string>('ZALO_BOT_TOKEN') ?? '';

    if (!this.botToken) {
      this.logger.warn('ZALO_BOT_TOKEN is not configured');
    }
  }

  /**
   * Check if Zalo integration is enabled
   */
  isEnabled(): boolean {
    return !!this.botToken;
  }

  /**
   * Get bot information
   */
  async getMe(): Promise<ZaloGetMeResponse> {
    const url = `${this.apiBase}/bot${this.botToken}/getMe`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const json = (await response.json()) as ZaloGetMeResponse;
      this.logger.debug(`getMe response: ${JSON.stringify(json)}`);
      return json;
    } catch (error) {
      this.logger.error('Failed to get bot info', error);
      throw error;
    }
  }

  /**
   * Send a text message to a chat
   */
  async sendMessage(chatId: string, text: string): Promise<ZaloSendMessageResponse> {
    if (!this.botToken) {
      this.logger.error('Cannot send message: ZALO_BOT_TOKEN not configured');
      return { ok: false, error_code: -1, description: 'Bot token not configured' };
    }

    // Truncate if message is too long
    let truncatedText = text;
    if (text.length > ZALO_MAX_MESSAGE_LENGTH) {
      truncatedText = text.slice(0, ZALO_MAX_MESSAGE_LENGTH - 20) + '\n\n[Tin nhan bi cat ngan]';
      this.logger.warn(`Message truncated from ${text.length} to ${truncatedText.length} chars`);
    }

    const url = `${this.apiBase}/bot${this.botToken}/sendMessage`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: truncatedText,
        }),
      });

      const json = (await response.json()) as ZaloSendMessageResponse;

      if (!json.ok) {
        this.logger.error(`sendMessage failed: ${JSON.stringify(json)}`);
      } else {
        this.logger.debug(`Message sent to ${chatId}, message_id: ${json.result?.message_id}`);
      }

      return json;
    } catch (error) {
      this.logger.error(`Failed to send message to ${chatId}`, error);
      return { ok: false, error_code: -1, description: String(error) };
    }
  }

  /**
   * Send typing indicator to a chat
   */
  async sendChatAction(chatId: string, action = 'typing'): Promise<boolean> {
    if (!this.botToken) {
      return false;
    }

    const url = `${this.apiBase}/bot${this.botToken}/sendChatAction`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          action,
        }),
      });

      const json = (await response.json()) as { ok?: boolean };
      return json.ok === true;
    } catch (error) {
      this.logger.error(`Failed to send chat action to ${chatId}`, error);
      return false;
    }
  }

  /**
   * Set webhook URL for the bot
   */
  async setWebhook(webhookUrl: string, secretToken: string): Promise<ZaloSetWebhookResponse> {
    if (!this.botToken) {
      this.logger.error('Cannot set webhook: ZALO_BOT_TOKEN not configured');
      return { ok: false, error_code: -1, description: 'Bot token not configured' };
    }

    const url = `${this.apiBase}/bot${this.botToken}/setWebhook`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: secretToken,
        }),
      });

      const json = (await response.json()) as ZaloSetWebhookResponse;

      if (json.ok) {
        this.logger.log(`Webhook set successfully: ${webhookUrl}`);
      } else {
        this.logger.error(`Failed to set webhook: ${JSON.stringify(json)}`);
      }

      return json;
    } catch (error) {
      this.logger.error('Failed to set webhook', error);
      return { ok: false, error_code: -1, description: String(error) };
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(): Promise<boolean> {
    if (!this.botToken) {
      return false;
    }

    const url = `${this.apiBase}/bot${this.botToken}/deleteWebhook`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const json = (await response.json()) as { ok?: boolean };
      return json.ok === true;
    } catch (error) {
      this.logger.error('Failed to delete webhook', error);
      return false;
    }
  }

  /**
   * Get current webhook info
   */
  async getWebhookInfo(): Promise<{ url?: string; updated_at?: number } | null> {
    if (!this.botToken) {
      return null;
    }

    const url = `${this.apiBase}/bot${this.botToken}/getWebhookInfo`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const json = (await response.json()) as {
        ok?: boolean;
        result?: { url?: string; updated_at?: number };
      };
      return json.ok ? (json.result ?? null) : null;
    } catch (error) {
      this.logger.error('Failed to get webhook info', error);
      return null;
    }
  }
}
