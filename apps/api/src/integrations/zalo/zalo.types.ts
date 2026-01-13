// Zalo Bot Platform Types
// Reference: https://bot.zapps.me/docs

/**
 * Webhook event names from Zalo
 */
export type ZaloEventName =
  | 'message.text.received'
  | 'message.image.received'
  | 'message.sticker.received'
  | 'message.unsupported.received';

/**
 * Zalo user info from webhook
 */
export interface ZaloUser {
  id: string;
  display_name: string;
  is_bot: boolean;
}

/**
 * Zalo chat info from webhook
 */
export interface ZaloChat {
  id: string;
  chat_type: 'PRIVATE' | 'GROUP';
}

/**
 * Zalo message from webhook
 */
export interface ZaloMessage {
  from: ZaloUser;
  chat: ZaloChat;
  text?: string;
  photo?: string;
  caption?: string;
  sticker?: string;
  url?: string;
  message_id: string;
  date: number;
}

/**
 * Webhook payload from Zalo Server
 * Note: Zalo sends the event directly without ok/result wrapper
 */
export interface ZaloWebhookPayload {
  event_name: ZaloEventName;
  message?: ZaloMessage;
}

/**
 * Response from sendMessage API
 */
export interface ZaloSendMessageResponse {
  ok: boolean;
  result?: {
    message_id: string;
    date: number;
  };
  error_code?: number;
  description?: string;
}

/**
 * Response from setWebhook API
 */
export interface ZaloSetWebhookResponse {
  ok: boolean;
  result?: {
    url: string;
    updated_at: number;
  };
  error_code?: number;
  description?: string;
}

/**
 * Response from getMe API
 */
export interface ZaloGetMeResponse {
  ok: boolean;
  result?: {
    id: string;
    bot_name: string;
    avatar?: string;
  };
  error_code?: number;
  description?: string;
}

/**
 * Link result from ZaloLinkService
 */
export interface ZaloLinkResult {
  success: boolean;
  reason?: 'ALREADY_LINKED' | 'EMAIL_NOT_FOUND' | 'NOT_LINKED';
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
}
