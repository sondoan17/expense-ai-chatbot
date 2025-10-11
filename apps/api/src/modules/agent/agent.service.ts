import { z } from 'zod';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentPayload, normalizeText } from '@expense-ai/shared';
import {
  HyperbolicService,
  HyperbolicMessage,
} from '../../integrations/hyperbolic/hyperbolic.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PublicUser } from '../users/types/public-user.type';
import { AgentActionDto } from './dto/agent-action.dto';
import { AgentChatResult } from './types/agent-response.type';
import { ChatMessageStatus, ChatRole, Currency } from '@prisma/client';

import { AgentLanguage, DEFAULT_LANGUAGE, DEFAULT_TIMEZONE } from './agent.constants';
import {
  buildClassificationErrorReply,
  buildEmptyMessageReply,
  buildHandlerErrorReply,
  buildLowConfidenceReply,
  buildSmallTalkReply,
  buildUndoNotSupportedReply,
  buildUnsupportedIntentReply,
} from './utils/agent-response.utils';
import { buildClassificationPrompt } from './utils/classification.util';
import { logRawCompletion, parseAgentPayload } from './utils/payload.util';
import {
  BudgetHandlerService,
  TransactionHandlerService,
  RecurringHandlerService,
  QueryHandlerService,
  CategoryResolverService,
} from './handlers';
import { TransactionResult } from './types/internal.types';

const BUDGET_ACTION_PAYLOAD_SCHEMA = z.object({
  budgetId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.nativeEnum(Currency),
  language: z.enum(['vi', 'en']).default('vi'),
});

const RECURRING_BUDGET_ACTION_PAYLOAD_SCHEMA = z.object({
  ruleId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.nativeEnum(Currency),
  language: z.enum(['vi', 'en']).default('vi'),
});

type BudgetActionPayload = z.infer<typeof BUDGET_ACTION_PAYLOAD_SCHEMA>;
type RecurringBudgetActionPayload = z.infer<typeof RECURRING_BUDGET_ACTION_PAYLOAD_SCHEMA>;

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly hyperbolicService: HyperbolicService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly budgetHandler: BudgetHandlerService,
    private readonly transactionHandler: TransactionHandlerService,
    private readonly recurringHandler: RecurringHandlerService,
    private readonly queryHandler: QueryHandlerService,
    private readonly categoryResolver: CategoryResolverService,
  ) {}

  async chat(user: PublicUser, message: string): Promise<AgentChatResult> {
    const trimmed = message?.trim();
    const fallbackLanguage = this.detectLanguageFromMessage(trimmed);

    if (!trimmed) {
      return {
        reply: buildEmptyMessageReply(fallbackLanguage),
        intent: 'clarify',
      };
    }

    await this.persistUserMessage(user.id, trimmed);

    const timezone = this.configService.get<string>('APP_TIMEZONE') ?? DEFAULT_TIMEZONE;
    const now = new Date();
    const systemPrompt = buildClassificationPrompt(now, timezone);

    const chatMessages: HyperbolicMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: trimmed },
    ];

    let payload: AgentPayload | undefined;

    try {
      const raw = await this.hyperbolicService.complete(chatMessages, {
        max_tokens: 350,
        temperature: 0.1,
        top_p: 0.8,
        response_format: { type: 'json_object' },
      });

      logRawCompletion(this.logger, raw);

      payload = parseAgentPayload(this.logger, raw);
    } catch (error) {
      this.logger.error(
        'Agent classification failed',
        error instanceof Error ? error.stack : error,
      );
      return this.finalizeResponse(user.id, {
        reply: buildClassificationErrorReply(fallbackLanguage),
        intent: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const language = this.getLanguageFromPayload(payload);

    if (payload.confidence !== undefined && payload.confidence < 0.6) {
      return this.finalizeResponse(user.id, {
        reply: buildLowConfidenceReply(language),
        intent: 'clarify',
        parsed: payload,
      });
    }

    try {
      let result: AgentChatResult;

      switch (payload.intent) {
        case 'add_expense':
        case 'add_income':
          result = await this.handleAddTransaction(user, trimmed, payload, language);
          break;
        case 'set_budget':
          result = await this.budgetHandler.handleSetBudget(user, payload, timezone, language);
          break;
        case 'get_budget_status':
          result = await this.budgetHandler.handleBudgetStatus(user, payload, timezone, language);
          break;
        case 'query_total':
        case 'query_by_category':
          result = await this.queryHandler.handleSummary(user, payload, timezone, language);
          break;
        case 'list_recent':
          result = await this.queryHandler.handleListRecent(user, payload, timezone, language);
          break;
        case 'undo_or_delete':
          result = {
            reply: buildUndoNotSupportedReply(language),
            intent: 'clarify',
            parsed: payload,
          };
          break;
        case 'set_recurring':
          result = await this.recurringHandler.handleSetRecurring(
            user,
            trimmed,
            payload,
            timezone,
            language,
          );
          break;
        case 'set_recurring_budget':
          result = await this.budgetHandler.handleSetRecurringBudget(
            user,
            trimmed,
            payload,
            timezone,
            language,
          );
          break;
        case 'small_talk':
          result = this.handleSmallTalk(user, payload, language);
          break;
        default:
          result = {
            reply: buildUnsupportedIntentReply(language),
            intent: 'error',
            parsed: payload,
          };
          break;
      }

      return this.finalizeResponse(user.id, result);
    } catch (error) {
      this.logger.error('Agent handler failed', error instanceof Error ? error.stack : error);
      return this.finalizeResponse(user.id, {
        reply: buildHandlerErrorReply(language),
        intent: 'error',
        parsed: payload,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async handleAction(user: PublicUser, dto: AgentActionDto): Promise<AgentChatResult> {
    const label = dto.label?.trim() ?? '';
    const fallbackLanguage = label ? this.detectLanguageFromMessage(label) : DEFAULT_LANGUAGE;

    const messageLabel = label || '[Action]';
    await this.persistUserMessage(user.id, messageLabel);

    // Validate payload based on action type
    let parsedPayload: BudgetActionPayload | RecurringBudgetActionPayload;

    if (dto.actionId === 'recurring_budget_update' || dto.actionId === 'recurring_budget_add') {
      const payloadResult = RECURRING_BUDGET_ACTION_PAYLOAD_SCHEMA.safeParse(dto.payload);
      if (!payloadResult.success) {
        return this.finalizeResponse(user.id, {
          reply: buildHandlerErrorReply(fallbackLanguage),
          intent: 'error',
          error: 'INVALID_ACTION_PAYLOAD',
        });
      }
      parsedPayload = payloadResult.data;
    } else {
      const payloadResult = BUDGET_ACTION_PAYLOAD_SCHEMA.safeParse(dto.payload);
      if (!payloadResult.success) {
        return this.finalizeResponse(user.id, {
          reply: buildHandlerErrorReply(fallbackLanguage),
          intent: 'error',
          error: 'INVALID_ACTION_PAYLOAD',
        });
      }
      parsedPayload = payloadResult.data;
    }

    const language = parsedPayload.language === 'en' ? 'en' : 'vi';

    try {
      let result: AgentChatResult;

      switch (dto.actionId) {
        case 'set_budget_update':
          result = await this.budgetHandler.handleBudgetUpdateAction(
            user,
            parsedPayload as BudgetActionPayload,
            language,
          );
          break;
        case 'set_budget_increase':
          result = await this.budgetHandler.handleBudgetIncreaseAction(
            user,
            parsedPayload as BudgetActionPayload,
            language,
          );
          break;
        case 'recurring_budget_update':
          result = await this.budgetHandler.handleRecurringBudgetUpdateAction(
            user,
            parsedPayload as RecurringBudgetActionPayload,
            language,
          );
          break;
        case 'recurring_budget_add':
          result = await this.budgetHandler.handleRecurringBudgetAddAction(
            user,
            parsedPayload as RecurringBudgetActionPayload,
            language,
          );
          break;
        default:
          result = {
            reply: buildUnsupportedIntentReply(language),
            intent: 'error',
          };
          break;
      }

      return this.finalizeResponse(user.id, result);
    } catch (error) {
      this.logger.error('Agent action failed', error instanceof Error ? error.stack : error);
      return this.finalizeResponse(user.id, {
        reply: buildHandlerErrorReply(language),
        intent: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getHistory(user: PublicUser, limit = 200, cursor?: string) {
    const take = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 500) : 200;

    const where: { userId: string; createdAt?: { lt: Date } } = { userId: user.id };

    if (cursor) {
      where.createdAt = { lt: new Date(cursor) };
    }

    const messages = await this.prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: take + 1, // Take one extra to check if there are more
    });

    const hasNextPage = messages.length > take;
    const data = hasNextPage ? messages.slice(0, -1) : messages;

    // For cursor-based pagination with DESC order, nextCursor should be the oldest message's timestamp
    // Since we're ordering by DESC, the last item in data is the oldest
    const nextCursor =
      hasNextPage && data.length > 0 ? data[data.length - 1]?.createdAt.toISOString() : null;

    // Reverse the data to show oldest first (for proper chat display)
    const reversedData = data.reverse();

    return {
      data: reversedData.map((message) => ({
        id: message.id,
        role: message.role === ChatRole.USER ? 'user' : 'assistant',
        status: message.status === ChatMessageStatus.ERROR ? 'error' : 'sent',
        content: message.content,
        createdAt: message.createdAt,
      })),
      nextCursor,
      hasNextPage,
    };
  }

  private async handleAddTransaction(
    user: PublicUser,
    originalMessage: string,
    payload: AgentPayload,
    language: AgentLanguage,
  ): Promise<AgentChatResult> {
    // Gọi handler để tạo transaction
    const result = await this.transactionHandler.handleAddTransaction(
      user,
      originalMessage,
      payload,
      language,
    );

    // Nếu tạo transaction thành công và là expense, check budget
    if (
      result.data &&
      typeof result.data === 'object' &&
      result.data !== null &&
      'transaction' in result.data &&
      payload.intent === 'add_expense'
    ) {
      const transactionData = result.data as { transaction: TransactionResult };
      const warnings = await this.budgetHandler.collectBudgetWarnings(
        user,
        transactionData.transaction,
        language,
      );

      // Append warnings vào reply
      if (warnings.length > 0) {
        result.reply = `${result.reply}\n\n⚠️ ${warnings.join('\n')}`;
      }
    }

    return result;
  }

  private async persistUserMessage(userId: string, content: string): Promise<void> {
    try {
      await this.prisma.chatMessage.create({
        data: {
          userId,
          role: ChatRole.USER,
          status: ChatMessageStatus.SENT,
          content,
        },
      });
    } catch (error) {
      this.logger.error(
        'Failed to persist user message',
        error instanceof Error ? error.stack : error,
      );
    }
  }

  private async getRecentChatHistory(
    userId: string,
    limit = 10,
  ): Promise<Array<{ role: string; content: string }>> {
    try {
      const messages = await this.prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          role: true,
          content: true,
        },
      });

      return messages.reverse().map((msg) => ({
        role: msg.role === 'USER' ? 'user' : 'assistant',
        content: msg.content,
      }));
    } catch (error) {
      this.logger.error('Error fetching chat history', error);
      return [];
    }
  }

  private async finalizeResponse(
    userId: string,
    result: AgentChatResult,
  ): Promise<AgentChatResult> {
    try {
      await this.prisma.chatMessage.create({
        data: {
          userId,
          role: ChatRole.ASSISTANT,
          status: result.error ? ChatMessageStatus.ERROR : ChatMessageStatus.SENT,
          content: result.reply,
        },
      });
    } catch (error) {
      this.logger.error(
        'Failed to persist assistant message',
        error instanceof Error ? error.stack : error,
      );
    }

    return result;
  }

  private handleSmallTalk(
    user: PublicUser,
    payload: AgentPayload,
    language: AgentLanguage,
  ): AgentChatResult {
    const name = user.name ?? user.email;
    return {
      reply: buildSmallTalkReply(language, name),
      intent: payload.intent,
      parsed: payload,
    };
  }

  private getLanguageFromPayload(payload?: AgentPayload): AgentLanguage {
    if (!payload?.language) {
      return DEFAULT_LANGUAGE;
    }
    return payload.language === 'en' ? 'en' : 'vi';
  }

  private detectLanguageFromMessage(message?: string): AgentLanguage {
    if (!message) {
      return DEFAULT_LANGUAGE;
    }

    if (this.hasVietnameseCharacters(message)) {
      return 'vi';
    }

    const normalized = normalizeText(message);
    if (!normalized) {
      return DEFAULT_LANGUAGE;
    }

    const vietnameseKeywords = [
      'khong',
      'ngan',
      'thang',
      'chi',
      'thu',
      'nhap',
      'tieu',
      'mua',
      'ban',
      'tien',
      'dong',
      'vnd',
      'trieu',
      'nghin',
      'cam on',
      'giup',
    ];

    return vietnameseKeywords.some((keyword) => normalized.includes(keyword)) ? 'vi' : 'en';
  }

  private hasVietnameseCharacters(message: string): boolean {
    return /[ăâđêôơưáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/iu.test(message);
  }
}
