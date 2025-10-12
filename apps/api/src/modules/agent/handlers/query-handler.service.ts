import { Injectable, Logger } from '@nestjs/common';
import { Currency, TxnType } from '@prisma/client';
import { AgentPayload } from '@expense-ai/shared';

import { TransactionsService } from '../../transactions/transactions.service';
import { TransactionSummaryQueryDto } from '../../transactions/dto/transaction-summary-query.dto';
import { ListTransactionsQueryDto } from '../../transactions/dto/list-transactions-query.dto';
import { PublicUser } from '../../users/types/public-user.type';
import { AgentChatResult } from '../types/agent-response.type';
import { AgentLanguage, DEFAULT_RECENT_COUNT } from '../agent.constants';
import {
  buildNoTransactionsReply,
  buildRecentTransactionLine,
  buildRecentTransactionsHeader,
  buildSummaryByCategoryReply,
  buildSummaryTotalsReply,
  describeRange,
  formatCurrency,
  formatDate,
  getOtherCategoryLabel,
} from '../utils/agent-response.utils';
import { getReplyWithFallback, logReplySource } from '../utils/reply-fallback.util';
import { CategoryResolverService } from './category-resolver.service';
import { InsightsService } from '../services/insights.service';
import { AIResponseService } from '../services/ai-response.service';
import { PersonalityReplyService } from '../services/personality-reply.service';
import { DataReplyService, DataContext } from '../services/data-reply.service';
import { InsightResult } from '../types/internal.types';
import { PersonalityProfile } from '../types/personality.types';
import { HyperbolicService } from '../../../integrations/hyperbolic/hyperbolic.service';

@Injectable()
export class QueryHandlerService {
  private readonly logger = new Logger(QueryHandlerService.name);

  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly categoryResolver: CategoryResolverService,
    private readonly insightsService: InsightsService,
    private readonly aiResponseService: AIResponseService,
    private readonly personalityReplyService: PersonalityReplyService,
    private readonly dataReplyService: DataReplyService,
    private readonly hyperbolicService: HyperbolicService,
  ) {}

  async handleSummary(
    user: PublicUser,
    payload: AgentPayload,
    timezone: string,
    language: AgentLanguage,
    personalityProfile: PersonalityProfile,
  ): Promise<AgentChatResult> {
    const categoryName = payload.category
      ? this.categoryResolver.resolveCategory(payload.category)
      : null;
    const category = categoryName
      ? await this.categoryResolver.findCategoryByName(categoryName)
      : null;

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

    // Generate insights for spending analysis
    let insights: InsightResult[] = [];
    try {
      if (summary.range?.start && summary.range?.end) {
        insights = await this.insightsService.generateInsights(
          user.id,
          { start: new Date(summary.range.start), end: new Date(summary.range.end) },
          currency,
        );
      }
    } catch (error) {
      this.logger.error('Error generating insights', error);
    }

    // Generate AI response with data injection approach
    try {
      // Format data context for LLM
      const dataContext: DataContext = {
        summary: {
          totals: summary.totals,
          range: summary.range
            ? {
                start: summary.range.start || '',
                end: summary.range.end || '',
              }
            : undefined,
          byCategory: summary.byCategory,
        },
        insights: insights,
      };

      // Single LLM call with data injection + personality
      const reply = await this.dataReplyService.generateReplyWithData(
        payload,
        dataContext,
        personalityProfile,
        language,
      );
      this.logger.debug(`Using data injection approach for intent: ${payload.intent}`);

      return {
        reply,
        intent: payload.intent,
        parsed: payload,
        data: { summary, insights },
      };
    } catch (error) {
      this.logger.error('Error generating AI response, falling back to template', error);

      // Fallback to original template logic
      const rangeLabel = describeRange(
        summary.range?.start,
        summary.range?.end,
        timezone,
        language,
        payload.period,
      );

      let fallbackReply: string;
      if (payload.intent === 'query_by_category' && category) {
        const byCategory = summary.byCategory.find(
          (item: { categoryId: string }) => item.categoryId === category.id,
        );
        const amountLabel = formatCurrency(byCategory?.amount ?? 0, currency, language);
        fallbackReply = buildSummaryByCategoryReply(language, {
          rangeLabel,
          amountLabel,
          categoryName: category.name,
        });
      } else {
        const expenseLabel = formatCurrency(summary.totals.expense, currency, language);
        const incomeLabel = formatCurrency(summary.totals.income, currency, language);
        const netLabel = formatCurrency(summary.totals.net, currency, language);
        fallbackReply = buildSummaryTotalsReply(language, {
          rangeLabel,
          expenseLabel,
          incomeLabel,
          netLabel,
        });
      }

      const reply = getReplyWithFallback(payload, fallbackReply, language);
      logReplySource(payload, this.logger);

      return {
        reply,
        intent: payload.intent,
        parsed: payload,
        data: { summary },
      };
    }
  }

  async handleListRecent(
    user: PublicUser,
    payload: AgentPayload,
    timezone: string,
    language: AgentLanguage,
    personalityProfile: PersonalityProfile,
  ): Promise<AgentChatResult> {
    const listInput = Object.assign(new ListTransactionsQueryDto(), {
      page: 1,
      pageSize: DEFAULT_RECENT_COUNT,
      period: payload.period,
      dateFrom: payload.date_from,
      dateTo: payload.date_to,
    });

    const categoryName = payload.category
      ? this.categoryResolver.resolveCategory(payload.category)
      : null;
    const category = categoryName
      ? await this.categoryResolver.findCategoryByName(categoryName)
      : null;
    if (category?.id) {
      listInput.categoryId = category.id;
    }

    if (payload.currency) {
      listInput.currency = payload.currency === 'USD' ? Currency.USD : Currency.VND;
    }

    const result = await this.transactionsService.list(user.id, listInput);

    if (!result.data.length) {
      const fallbackReply = buildNoTransactionsReply(language);
      const reply = getReplyWithFallback(payload, fallbackReply, language);
      logReplySource(payload, this.logger);

      return {
        reply,
        intent: payload.intent,
        parsed: payload,
        data: { transactions: result },
      };
    }

    // Generate AI response for recent transactions - data injection approach
    try {
      // Format data context for LLM
      const dataContext: DataContext = {
        transactions: result.data.map((tx) => ({
          occurredAt: tx.occurredAt,
          amount: tx.amount,
          category: tx.category ? { name: tx.category.name } : undefined,
          type: tx.type.toString(),
          note: tx.note || undefined,
        })),
      };

      // Single LLM call with data injection + personality
      const reply = await this.dataReplyService.generateReplyWithData(
        payload,
        dataContext,
        personalityProfile,
        language,
      );
      this.logger.debug(`Using data injection approach for intent: ${payload.intent}`);

      return {
        reply,
        intent: payload.intent,
        parsed: payload,
        data: { transactions: result },
      };
    } catch (error) {
      this.logger.error(
        'Error generating AI response for recent transactions, falling back to template',
        error,
      );

      // Fallback to original template logic
      const lines = result.data.map((item) => {
        const amount = formatCurrency(item.amount, item.currency, language);
        const date = formatDate(item.occurredAt, timezone);
        const label = item.category?.name ?? getOtherCategoryLabel(language);
        return buildRecentTransactionLine({ date, amount, category: label });
      });

      const fallbackReply = `${buildRecentTransactionsHeader(language)}\n${lines.join('\n')}`;
      const reply = getReplyWithFallback(payload, fallbackReply, language);
      logReplySource(payload, this.logger);

      return {
        reply,
        intent: payload.intent,
        parsed: payload,
        data: { transactions: result },
      };
    }
  }

  private detectSummaryType(intent: string, categoryName: string | null): TxnType | undefined {
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
}
