import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentPayload, Intent, normalizeText, resolveCategoryName } from '@expense-ai/shared';
import { HyperbolicService, HyperbolicMessage } from '../integrations/hyperbolic.service';
import { TransactionsService } from '../transactions/transactions.service';
import { BudgetsService } from '../budgets/budgets.service';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionSummaryQueryDto } from '../transactions/dto/transaction-summary-query.dto';
import { ListTransactionsQueryDto } from '../transactions/dto/list-transactions-query.dto';
import { PublicUser } from '../users/types/public-user.type';
import { AgentChatResult } from './types/agent-response.type';
import { ChatMessageStatus, ChatRole, Currency, Prisma, TxnType } from '@prisma/client';
import { DateTime } from 'luxon';

import {
  AgentLanguage,
  DEFAULT_LANGUAGE,
  DEFAULT_RECENT_COUNT,
  DEFAULT_TIMEZONE,
} from './agent.constants';
import {
  buildAskBudgetAmountReply,
  buildBudgetExceededWarning,
  buildBudgetNotFoundReply,
  buildBudgetSetReply,
  buildBudgetStatusReply,
  buildClassificationErrorReply,
  buildEmptyMessageReply,
  buildHandlerErrorReply,
  buildLowConfidenceReply,
  buildMissingAmountReply,
  buildNoTransactionsReply,
  buildRecentTransactionLine,
  buildRecentTransactionsHeader,
  buildSmallTalkReply,
  buildSummaryByCategoryReply,
  buildSummaryTotalsReply,
  buildTransactionSavedReply,
  buildUndoNotSupportedReply,
  buildUnsupportedIntentReply,
  describeRange,
  formatCurrency,
  formatDate,
  formatMonthYear,
  getBudgetTargetLabel,
  getCategoryLabel,
  getOtherCategoryLabel,
} from './utils/agent-response.utils';
import { buildClassificationPrompt } from './utils/classification.util';
import { logRawCompletion, parseAgentPayload } from './utils/payload.util';
import type { TransactionResult } from './types/internal.types';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);


  constructor(
    private readonly hyperbolicService: HyperbolicService,
    private readonly transactionsService: TransactionsService,
    private readonly budgetsService: BudgetsService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
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
      this.logger.error('Agent classification failed', error instanceof Error ? error.stack : error);
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
          result = await this.handleSetBudget(user, payload, timezone, language);
          break;
        case 'get_budget_status':
          result = await this.handleBudgetStatus(user, payload, timezone, language);
          break;
        case 'query_total':
        case 'query_by_category':
          result = await this.handleSummary(user, payload, timezone, language);
          break;
        case 'list_recent':
          result = await this.handleListRecent(user, payload, timezone, language);
          break;
        case 'undo_or_delete':
          result = {
            reply: buildUndoNotSupportedReply(language),
            intent: 'clarify',
            parsed: payload,
          };
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

  async getHistory(user: PublicUser, limit = 200) {
    const take = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 500) : 200;
    const messages = await this.prisma.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      take,
    });

    return messages.map((message) => ({
      id: message.id,
      role: message.role === ChatRole.USER ? 'user' : 'assistant',
      status: message.status === ChatMessageStatus.ERROR ? 'error' : 'sent',
      content: message.content,
      createdAt: message.createdAt,
    }));
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
      this.logger.error("Failed to persist user message", error instanceof Error ? error.stack : error);
    }
  }

  private async finalizeResponse(userId: string, result: AgentChatResult): Promise<AgentChatResult> {
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
      this.logger.error("Failed to persist assistant message", error instanceof Error ? error.stack : error);
    }

    return result;
  }

  private async handleAddTransaction(
    user: PublicUser,
    originalMessage: string,
    payload: AgentPayload,
    language: AgentLanguage,
  ): Promise<AgentChatResult> {
    if (!payload.amount || payload.amount <= 0) {
      return {
        reply: buildMissingAmountReply(language),
        intent: 'clarify',
        parsed: payload,
      };
    }

    const type = payload.intent === 'add_income' ? TxnType.INCOME : TxnType.EXPENSE;
    const currency: Currency = payload.currency === 'USD' ? Currency.USD : Currency.VND;

    const categoryName = payload.category ? this.resolveCategory(payload.category) : null;
    const category = categoryName ? await this.findCategoryByName(categoryName) : null;

    const dto = {
      type,
      amount: payload.amount,
      currency,
      note: payload.note ?? originalMessage,
      occurredAt: payload.occurred_at,
      categoryId: category?.id,
      meta: {
        source: 'agent',
        intent: payload.intent,
        confidence: payload.confidence,
        raw: payload,
      } as Record<string, unknown>,
    };

    const transaction = await this.transactionsService.create(user.id, dto);

    const amountLabel = formatCurrency(transaction.amount, transaction.currency, language);
    const categoryLabel = transaction.category?.name ?? categoryName ?? null;

    let reply = buildTransactionSavedReply(language, {
      type,
      amount: amountLabel,
      category: categoryLabel,
    });

    if (type === TxnType.EXPENSE) {
      const warnings = await this.collectBudgetWarnings(user, transaction, language);
      if (warnings.length > 0) {
        reply = `${reply}\n${warnings.join('\n')}`;
      }
    }

    return {
      reply,
      intent: payload.intent,
      parsed: payload,
      data: { transaction },
    };
  }

  private async handleSetBudget(
    user: PublicUser,
    payload: AgentPayload,
    timezone: string,
    language: AgentLanguage,
  ): Promise<AgentChatResult> {
    if (!payload.amount || payload.amount <= 0) {
      return {
        reply: buildAskBudgetAmountReply(language),
        intent: 'clarify',
        parsed: payload,
      };
    }

    const now = DateTime.now().setZone(timezone);
    const month = payload.budget_month ?? now.month;
    const year = payload.budget_year ?? now.year;

    const currency: Currency = payload.currency === 'USD' ? Currency.USD : Currency.VND;
    const categoryName = payload.category ? this.resolveCategory(payload.category) : null;
    const category = categoryName ? await this.findCategoryByName(categoryName) : null;

    const budget = await this.budgetsService.upsert(user.id, {
      month,
      year,
      limitAmount: payload.amount,
      currency,
      categoryId: category?.id,
    });

    const amountLabel = formatCurrency(budget.limitAmount, budget.currency, language);
    const monthLabel = formatMonthYear(month, year, language);
    const categoryLabel = getCategoryLabel(language, category?.name ?? categoryName ?? null);

    return {
      reply: buildBudgetSetReply(language, {
        amountLabel,
        categoryLabel,
        monthLabel,
      }),
      intent: payload.intent,
      parsed: payload,
      data: { budget },
    };
  }

  private async handleBudgetStatus(
    user: PublicUser,
    payload: AgentPayload,
    timezone: string,
    language: AgentLanguage,
  ): Promise<AgentChatResult> {
    const now = DateTime.now().setZone(timezone);
    const month = payload.budget_month ?? now.month;
    const year = payload.budget_year ?? now.year;

    const categoryName = payload.category ? this.resolveCategory(payload.category) : null;
    const category = categoryName ? await this.findCategoryByName(categoryName) : null;

    const budget = await this.prisma.budget.findFirst({
      where: {
        userId: user.id,
        month,
        year,
        categoryId: category?.id ?? null,
      },
      include: { category: true },
    });

    if (!budget) {
      const monthLabel = formatMonthYear(month, year, language);
      const target = getBudgetTargetLabel(language, category?.name ?? categoryName ?? null);
      return {
        reply: buildBudgetNotFoundReply(language, { target, monthLabel }),
        intent: 'clarify',
        parsed: payload,
      };
    }

    const status = await this.budgetsService.status(user.id, budget.id);
    const amountLabel = formatCurrency(status.spent, status.budget.currency, language);
    const limitLabel = formatCurrency(status.budget.limitAmount, status.budget.currency, language);
    const percentLabel = `${status.percentage}%`;
    const remainingLabel = formatCurrency(status.remaining, status.budget.currency, language);
    const overspentLabel =
      status.overBudget && status.overspent > 0
        ? formatCurrency(status.overspent, status.budget.currency, language)
        : undefined;
    const endDateLabel = status.range?.end ? formatDate(status.range.end, timezone) : undefined;

    return {
      reply: buildBudgetStatusReply(language, {
        amountLabel,
        limitLabel,
        percentLabel,
        remainingLabel,
        endDateLabel,
        overBudget: status.overBudget,
        overspentLabel,
      }),
      intent: payload.intent,
      parsed: payload,
      data: { status },
    };
  }

  private async collectBudgetWarnings(
    user: PublicUser,
    transaction: TransactionResult,
    language: AgentLanguage,
  ): Promise<string[]> {
    const timezone = this.configService.get<string>('APP_TIMEZONE') ?? DEFAULT_TIMEZONE;
    const occurredAt = DateTime.fromISO(transaction.occurredAt).setZone(timezone);

    const where: Prisma.BudgetWhereInput = {
      userId: user.id,
      month: occurredAt.month,
      year: occurredAt.year,
      currency: transaction.currency,
    };

    if (transaction.category?.id) {
      where.OR = [{ categoryId: transaction.category.id }, { categoryId: null }];
    } else {
      where.categoryId = null;
    }

    const budgets = await this.prisma.budget.findMany({ where });

    if (!budgets.length) {
      return [];
    }

    const statuses = await Promise.all(
      budgets.map((budget) => this.budgetsService.status(user.id, budget.id)),
    );

    return statuses
      .filter((status) => status.overBudget)
      .map((status) => buildBudgetExceededWarning(language, status));
  }

  private async handleSummary(
    user: PublicUser,
    payload: AgentPayload,
    timezone: string,
    language: AgentLanguage,
  ): Promise<AgentChatResult> {
    const categoryName = payload.category ? this.resolveCategory(payload.category) : null;
    const category = categoryName ? await this.findCategoryByName(categoryName) : null;

    const type = this.detectSummaryType(payload.intent, categoryName);
    const currency: Currency = payload.currency === 'USD' ? Currency.USD : Currency.VND;

    const summaryInput = Object.assign(new TransactionSummaryQueryDto(), {
      period: payload.period,
      dateFrom: payload.date_from,
      dateTo: payload.date_to,
      type,
      currency,
      categoryId: category?.id ?? undefined,
    });

    const summary = await this.transactionsService.summary(user.id, summaryInput);

    const rangeLabel = describeRange(
      summary.range?.start,
      summary.range?.end,
      timezone,
      language,
      payload.period,
    );

    if (payload.intent === 'query_by_category' && category) {
      const byCategory = summary.byCategory.find((item) => item.categoryId === category.id);
      const amountLabel = formatCurrency(byCategory?.amount ?? 0, currency, language);
      const reply = buildSummaryByCategoryReply(language, {
        rangeLabel,
        amountLabel,
        categoryName: category.name,
      });

      return {
        reply,
        intent: payload.intent,
        parsed: payload,
        data: { summary },
      };
    }

    const expenseLabel = formatCurrency(summary.totals.expense, currency, language);
    const incomeLabel = formatCurrency(summary.totals.income, currency, language);
    const netLabel = formatCurrency(summary.totals.net, currency, language);
    const reply = buildSummaryTotalsReply(language, {
      rangeLabel,
      expenseLabel,
      incomeLabel,
      netLabel,
    });

    return {
      reply,
      intent: payload.intent,
      parsed: payload,
      data: { summary },
    };
  }

  private async handleListRecent(
    user: PublicUser,
    payload: AgentPayload,
    timezone: string,
    language: AgentLanguage,
  ): Promise<AgentChatResult> {
    const listInput = Object.assign(new ListTransactionsQueryDto(), {
      page: 1,
      pageSize: DEFAULT_RECENT_COUNT,
      period: payload.period,
      dateFrom: payload.date_from,
      dateTo: payload.date_to,
    });

    const categoryName = payload.category ? this.resolveCategory(payload.category) : null;
    const category = categoryName ? await this.findCategoryByName(categoryName) : null;
    if (category?.id) {
      listInput.categoryId = category.id;
    }

    if (payload.currency) {
      listInput.currency = payload.currency === 'USD' ? Currency.USD : Currency.VND;
    }

    const result = await this.transactionsService.list(user.id, listInput);

    if (!result.data.length) {
      return {
        reply: buildNoTransactionsReply(language),
        intent: payload.intent,
        parsed: payload,
        data: { transactions: result },
      };
    }

    const lines = result.data.map((item) => {
      const amount = formatCurrency(item.amount, item.currency, language);
      const date = formatDate(item.occurredAt, timezone);
      const label = item.category?.name ?? getOtherCategoryLabel(language);
      return buildRecentTransactionLine({ date, amount, category: label });
    });

    const reply = `${buildRecentTransactionsHeader(language)}\n${lines.join('\n')}`;

    return {
      reply,
      intent: payload.intent,
      parsed: payload,
      data: { transactions: result },
    };
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

  private resolveCategory(input: string): string | null {
    return resolveCategoryName(input);
  }

  private async findCategoryByName(name: string) {
    return this.prisma.category.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });
  }

  private detectSummaryType(intent: Intent, categoryName: string | null): TxnType | undefined {
    if (categoryName === 'Thu nhap' || categoryName === 'Thu nhập') {
      return TxnType.INCOME;
    }

    if (intent === 'query_total' && categoryName === null) {
      return undefined;
    }

    if (intent === 'query_total' || intent === 'query_by_category') {
      return TxnType.EXPENSE;
    }

    return undefined;
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
    return /[ăâđêôơưáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/iu.test(
      message,
    );
  }

}

