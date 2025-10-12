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
import { ChatMessageStatus, ChatRole, Currency, AiPersonality } from '@prisma/client';

import {
  AgentLanguage,
  DEFAULT_LANGUAGE,
  DEFAULT_TIMEZONE,
  buildSystemPromptWithPersonality,
  buildClassificationOnlyPrompt,
} from './agent.constants';
import {
  buildClassificationErrorReply,
  buildEmptyMessageReply,
  buildHandlerErrorReply,
  buildLowConfidenceReply,
  buildSmallTalkReply,
  buildUndoNotSupportedReply,
  buildUnsupportedIntentReply,
} from './utils/agent-response.utils';
import { getReplyWithFallback, logReplySource } from './utils/reply-fallback.util';
import { UserSettingsService } from '../users/users-settings.service';
import { PersonalityReplyService } from './services/personality-reply.service';
import { DataReplyService } from './services/data-reply.service';
import { PERSONALITY_PROFILES, PersonalityProfile } from './types/personality.types';
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
    private readonly userSettingsService: UserSettingsService,
    private readonly personalityReplyService: PersonalityReplyService,
    private readonly dataReplyService: DataReplyService,
  ) {}

  async chat(user: PublicUser, message: string): Promise<AgentChatResult> {
    const trimmed = message?.trim();
    const fallbackLanguage = this.detectLanguageFromMessage(trimmed);

    if (!trimmed) {
      const fallbackReply = buildEmptyMessageReply(fallbackLanguage);
      const reply = getReplyWithFallback({} as AgentPayload, fallbackReply, fallbackLanguage);
      logReplySource({} as AgentPayload, this.logger);

      return {
        reply,
        intent: 'clarify',
      };
    }

    await this.persistUserMessage(user.id, trimmed);

    // Load user personality settings
    const settings = await this.userSettingsService.getOrCreateSettings(user.id);
    const personalityProfile = PERSONALITY_PROFILES[settings.aiPersonality];

    const timezone = this.configService.get<string>('APP_TIMEZONE') ?? DEFAULT_TIMEZONE;
    const now = new Date();

    // Step 1: Classification only (for all intents)
    const classificationPrompt = buildClassificationOnlyPrompt(now.toISOString(), timezone);
    const classificationMessages: HyperbolicMessage[] = [
      { role: 'system', content: classificationPrompt },
      { role: 'user', content: trimmed },
    ];

    let payload: AgentPayload | undefined;

    try {
      const raw = await this.hyperbolicService.complete(classificationMessages, {
        max_tokens: 350,
        temperature: 0.1, // Low temperature for accurate classification
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
      const fallbackReply = buildClassificationErrorReply(fallbackLanguage);
      const reply = getReplyWithFallback({} as AgentPayload, fallbackReply, fallbackLanguage);
      logReplySource({} as AgentPayload, this.logger);

      return this.finalizeResponse(user.id, {
        reply,
        intent: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const language = this.getLanguageFromPayload(payload);

    if (payload.confidence !== undefined && payload.confidence < 0.6) {
      const fallbackReply = buildLowConfidenceReply(language);
      const reply = getReplyWithFallback(payload, fallbackReply, language);
      logReplySource(payload, this.logger);

      return this.finalizeResponse(user.id, {
        reply,
        intent: 'clarify',
        parsed: payload,
      });
    }

    try {
      let result: AgentChatResult;

      // Check if this is a query intent that needs data injection
      const queryIntents = ['query_total', 'query_by_category', 'list_recent', 'get_budget_status'];
      // Check if this is a complex intent that needs special handling (not 1-shot)
      const complexIntents = ['set_budget', 'set_recurring_budget', 'set_recurring'];
      const isQueryIntent = queryIntents.includes(payload.intent);
      const isComplexIntent = complexIntents.includes(payload.intent);

      if (isQueryIntent) {
        // For query intents: use data injection approach
        result = await this.handleQueryIntent(
          user,
          payload,
          timezone,
          language,
          personalityProfile,
        );
      } else if (isComplexIntent) {
        // For complex intents: use direct handler (no 1-shot, no data injection)
        result = await this.handleComplexIntent(user, trimmed, payload, timezone, language);
      } else {
        // For simple transaction intents: use 1-shot approach with personality
        result = await this.handleTransactionIntent(
          user,
          trimmed,
          payload,
          timezone,
          language,
          personalityProfile,
        );
      }

      return this.finalizeResponse(user.id, result);
    } catch (error) {
      this.logger.error('Agent handler failed', error instanceof Error ? error.stack : error);
      const fallbackReply = buildHandlerErrorReply(language);
      const reply = getReplyWithFallback(payload, fallbackReply, language);
      logReplySource(payload, this.logger);

      return this.finalizeResponse(user.id, {
        reply,
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
        const fallbackReply = buildHandlerErrorReply(fallbackLanguage);
        const reply = getReplyWithFallback({} as AgentPayload, fallbackReply, fallbackLanguage);
        logReplySource({} as AgentPayload, this.logger);

        return this.finalizeResponse(user.id, {
          reply,
          intent: 'error',
          error: 'INVALID_ACTION_PAYLOAD',
        });
      }
      parsedPayload = payloadResult.data;
    } else {
      const payloadResult = BUDGET_ACTION_PAYLOAD_SCHEMA.safeParse(dto.payload);
      if (!payloadResult.success) {
        const fallbackReply = buildHandlerErrorReply(fallbackLanguage);
        const reply = getReplyWithFallback({} as AgentPayload, fallbackReply, fallbackLanguage);
        logReplySource({} as AgentPayload, this.logger);

        return this.finalizeResponse(user.id, {
          reply,
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
        default: {
          const fallbackReply = buildUnsupportedIntentReply(language);
          const reply = getReplyWithFallback({} as AgentPayload, fallbackReply, language);
          logReplySource({} as AgentPayload, this.logger);

          result = {
            reply,
            intent: 'error',
          };
          break;
        }
      }

      return this.finalizeResponse(user.id, result);
    } catch (error) {
      this.logger.error('Agent action failed', error instanceof Error ? error.stack : error);
      const fallbackReply = buildHandlerErrorReply(language);
      const reply = getReplyWithFallback({} as AgentPayload, fallbackReply, language);
      logReplySource({} as AgentPayload, this.logger);

      return this.finalizeResponse(user.id, {
        reply,
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

  private async handleQueryIntent(
    user: PublicUser,
    payload: AgentPayload,
    timezone: string,
    language: AgentLanguage,
    personalityProfile: PersonalityProfile,
  ): Promise<AgentChatResult> {
    // Route to appropriate query handler
    switch (payload.intent) {
      case 'query_total':
      case 'query_by_category':
        return await this.queryHandler.handleSummary(
          user,
          payload,
          timezone,
          language,
          personalityProfile,
        );
      case 'list_recent':
        return await this.queryHandler.handleListRecent(
          user,
          payload,
          timezone,
          language,
          personalityProfile,
        );
      case 'get_budget_status':
        return await this.budgetHandler.handleBudgetStatus(
          user,
          payload,
          timezone,
          language,
          personalityProfile,
        );
      default:
        throw new Error(`Unsupported query intent: ${payload.intent}`);
    }
  }

  private async handleComplexIntent(
    user: PublicUser,
    originalMessage: string,
    payload: AgentPayload,
    timezone: string,
    language: AgentLanguage,
  ): Promise<AgentChatResult> {
    // For complex intents, use direct handlers without 1-shot LLM generation
    // This ensures proper business logic (like action buttons for existing budgets)
    switch (payload.intent) {
      case 'set_budget':
        return await this.budgetHandler.handleSetBudget(user, payload, timezone, language);
      case 'set_recurring_budget':
        return await this.budgetHandler.handleSetRecurringBudget(
          user,
          originalMessage,
          payload,
          timezone,
          language,
        );
      case 'set_recurring':
        return await this.recurringHandler.handleSetRecurring(
          user,
          originalMessage,
          payload,
          timezone,
          language,
        );
      default:
        throw new Error(`Unsupported complex intent: ${payload.intent}`);
    }
  }

  private async handleTransactionIntent(
    user: PublicUser,
    originalMessage: string,
    payload: AgentPayload,
    timezone: string,
    language: AgentLanguage,
    personalityProfile: PersonalityProfile,
  ): Promise<AgentChatResult> {
    // Use 1-shot approach with personality for transaction intents
    const systemPrompt = buildSystemPromptWithPersonality(
      personalityProfile,
      new Date().toISOString(),
      timezone,
    );

    const chatMessages: HyperbolicMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: originalMessage },
    ];

    try {
      const raw = await this.hyperbolicService.complete(chatMessages, {
        max_tokens: 450,
        temperature: 0.3,
        top_p: 0.8,
        response_format: { type: 'json_object' },
      });

      logRawCompletion(this.logger, raw);
      const enhancedPayload = parseAgentPayload(this.logger, raw);

      // Execute the transaction based on intent (only simple intents)
      switch (enhancedPayload.intent) {
        case 'add_expense':
        case 'add_income':
          return await this.handleAddTransaction(user, originalMessage, enhancedPayload, language);
        case 'small_talk':
          return this.handleSmallTalk(user, enhancedPayload, language);
        case 'change_personality':
          return await this.handleChangePersonality(user, enhancedPayload, language);
        case 'undo_or_delete': {
          const fallbackReply = buildUndoNotSupportedReply(language);
          const reply = getReplyWithFallback(enhancedPayload, fallbackReply, language);
          logReplySource(enhancedPayload, this.logger);

          return {
            reply,
            intent: 'clarify',
            parsed: enhancedPayload,
          };
        }
        default: {
          const fallbackReply = buildUnsupportedIntentReply(language);
          const reply = getReplyWithFallback(enhancedPayload, fallbackReply, language);
          logReplySource(enhancedPayload, this.logger);

          return {
            reply,
            intent: 'error',
            parsed: enhancedPayload,
          };
        }
      }
    } catch (error) {
      this.logger.error('Transaction intent processing failed', error);
      throw error;
    }
  }

  private async handleAddTransaction(
    user: PublicUser,
    originalMessage: string,
    payload: AgentPayload,
    language: AgentLanguage,
  ): Promise<AgentChatResult> {
    // Load user personality settings (for potential future use)
    // const settings = await this.userSettingsService.getOrCreateSettings(user.id);
    // const personalityProfile = PERSONALITY_PROFILES[settings.aiPersonality];

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

    // ❌ XÓA phần rewrite này - giờ LLM tự generate reply trong lần call đầu
    // try {
    //   const context = `User message: "${originalMessage}"`;
    //   result.reply = await this.personalityReplyService.rewriteWithPersonality(
    //     result.reply,
    //     personalityProfile,
    //     language,
    //     context,
    //   );
    // } catch (error) {
    //   this.logger.error('Failed to rewrite reply with personality', error);
    //   // Fallback to original reply if rewrite fails
    // }

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
    const fallbackReply = buildSmallTalkReply(language, name);
    const reply = getReplyWithFallback(payload, fallbackReply, language);
    logReplySource(payload, this.logger);

    return {
      reply,
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

  private async handleChangePersonality(
    user: PublicUser,
    payload: AgentPayload,
    language: AgentLanguage,
  ): Promise<AgentChatResult> {
    // Extract personality from payload (add new field to AgentPayload schema)
    const newPersonality = (payload as AgentPayload & { personality?: string }).personality; // e.g., 'FRIENDLY'

    if (!newPersonality || !Object.values(AiPersonality).includes(newPersonality)) {
      const fallbackReply = this.buildInvalidPersonalityReply(language);
      const reply = getReplyWithFallback(payload, fallbackReply, language);
      logReplySource(payload, this.logger);

      return {
        reply,
        intent: 'change_personality',
        parsed: payload,
      };
    }

    await this.userSettingsService.updatePersonality(user.id, newPersonality);

    const fallbackReply = this.buildPersonalityChangedReply(language, newPersonality);
    const reply = getReplyWithFallback(payload, fallbackReply, language);
    logReplySource(payload, this.logger);

    return {
      reply,
      intent: 'change_personality',
      parsed: payload,
    };
  }

  private buildPersonalityChangedReply(language: AgentLanguage, personality: string): string {
    const personalityLabels = {
      vi: {
        FRIENDLY: 'Thân thiện',
        PROFESSIONAL: 'Chuyên nghiệp',
        CASUAL: 'Thoải mái',
        HUMOROUS: 'Hài hước',
        INSULTING: 'Xúc phạm',
        ENTHUSIASTIC: 'Nhiệt tình',
      },
      en: {
        FRIENDLY: 'Friendly',
        PROFESSIONAL: 'Professional',
        CASUAL: 'Casual',
        HUMOROUS: 'Humorous',
        INSULTING: 'Insulting',
        ENTHUSIASTIC: 'Enthusiastic',
      },
    };

    const label =
      personalityLabels[language][
        personality as keyof (typeof personalityLabels)[typeof language]
      ] || personality;

    return language === 'vi'
      ? `Đã chuyển tính cách sang "${label}". Từ giờ mình sẽ trò chuyện theo phong cách này nhé!`
      : `Personality changed to "${label}". I'll interact with this style from now on!`;
  }

  private buildInvalidPersonalityReply(language: AgentLanguage): string {
    return language === 'vi'
      ? 'Tính cách không hợp lệ. Vui lòng chọn: Thân thiện, Chuyên nghiệp, Thoải mái, Hài hước, Xúc phạm, hoặc Nhiệt tình.'
      : 'Invalid personality. Please choose: Friendly, Professional, Casual, Humorous, Insulting, or Enthusiastic.';
  }
}
