import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AgentPayload,
  AgentPayloadSchema,
  Intent,
  TimePeriodEnum,
  normalizeText,
  resolveCategoryName,
} from '@expense-ai/shared';
import { HyperbolicService, HyperbolicMessage } from '../integrations/hyperbolic.service';
import { TransactionsService } from '../transactions/transactions.service';
import { BudgetsService } from '../budgets/budgets.service';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionSummaryQueryDto } from '../transactions/dto/transaction-summary-query.dto';
import { ListTransactionsQueryDto } from '../transactions/dto/list-transactions-query.dto';
import { PublicUser } from '../users/types/public-user.type';
import { AgentChatResult } from './types/agent-response.type';
import { Currency, TxnType } from '@prisma/client';
import { DateTime } from 'luxon';

const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';
const DEFAULT_RECENT_COUNT = 5;

type AgentLanguage = 'vi' | 'en';
const DEFAULT_LANGUAGE: AgentLanguage = 'vi';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly systemPromptTemplate = `You are an expense management intent parser for a personal finance chatbot. Your job is to convert a single user message into a structured JSON payload that strictly matches this schema and rules.

CURRENT_TIME: {{NOW_ISO}}
TIMEZONE: {{TIMEZONE}}

### Output Contract (JSON only)
Return a single JSON object with these fields. Do not add other fields. Do not wrap with code fences.
{
  "intent": "add_expense | add_income | query_total | query_by_category | set_budget | get_budget_status | list_recent | undo_or_delete | small_talk",
  "language": "vi | en",
  "amount": number?,
  "currency": "VND | USD"?,
  "category": string?,
  "note": string?,
  "occurred_at": string?,
  "period": "today | yesterday | this_week | this_month | last_month | this_year"?,
  "date_from": string?,
  "date_to": string?,
  "budget_month": number?,
  "budget_year": number?,
  "confidence": number?
}

### General Rules
1) Language: detect and mirror the user's language. Default to "vi" when Vietnamese markers exist.
2) JSON only: output one JSON object with the exact keys above.
3) Currency & amount normalization: interpret Vietnamese shorthand (k, tr, nghin, trieu) to numeric VND. If ambiguous default to VND.
4) Date parsing: respect CURRENT_TIME & TIMEZONE. Support relative phrases (today, this month, last month, this year...). Prefer explicit dates if provided.
5) Category mapping: normalise to canonical Vietnamese category names (An uong, Di chuyen, Nha o, Mua sam, Giai tri, Suc khoe, Giao duc, Hoa don, Thu nhap, Khac).
6) Intent selection:
   - add_expense: user spent money
   - add_income: user received money
   - query_total: ask for totals in a time range (any category)
   - query_by_category: ask for totals filtered by category
   - set_budget: request to set monthly budget (requires amount + month/year)
   - get_budget_status: ask remaining/used budget
   - list_recent: ask to list recent transactions
   - undo_or_delete: ask to undo/delete last or specific transaction
   - small_talk: general chit-chat (no DB change)
`;

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
        reply: this.buildEmptyMessageReply(fallbackLanguage),
        intent: 'clarify',
      };
    }

    const timezone = this.configService.get<string>('APP_TIMEZONE') ?? DEFAULT_TIMEZONE;
    const now = new Date();
    const systemPrompt = this.buildClassificationPrompt(now, timezone);

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
      });

      this.logRawCompletion(raw);

      payload = this.parseAgentPayload(raw);
    } catch (error) {
      this.logger.error('Agent classification failed', error instanceof Error ? error.stack : error);
      return {
        reply: this.buildClassificationErrorReply(fallbackLanguage),
        intent: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
    }

    const language = this.getLanguageFromPayload(payload);

    if (payload.confidence !== undefined && payload.confidence < 0.6) {
      return {
        reply: this.buildLowConfidenceReply(language),
        intent: 'clarify',
        parsed: payload,
      };
    }

    try {
      switch (payload.intent) {
        case 'add_expense':
        case 'add_income':
          return await this.handleAddTransaction(user, trimmed, payload, language);
        case 'set_budget':
          return await this.handleSetBudget(user, payload, timezone, language);
        case 'get_budget_status':
          return await this.handleBudgetStatus(user, payload, timezone, language);
        case 'query_total':
        case 'query_by_category':
          return await this.handleSummary(user, payload, timezone, language);
        case 'list_recent':
          return await this.handleListRecent(user, payload, timezone, language);
        case 'undo_or_delete':
          return {
            reply: this.buildUndoNotSupportedReply(language),
            intent: 'clarify',
            parsed: payload,
          };
        case 'small_talk':
          return this.handleSmallTalk(user, payload, language);
        default:
          return {
            reply: this.buildUnsupportedIntentReply(language),
            intent: 'error',
            parsed: payload,
          };
      }
    } catch (error) {
      this.logger.error('Agent handler failed', error instanceof Error ? error.stack : error);
      return {
        reply: this.buildHandlerErrorReply(language),
        intent: 'error',
        parsed: payload,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private buildClassificationPrompt(now: Date, timezone: string): string {
    return this.systemPromptTemplate
      .replace('{{NOW_ISO}}', now.toISOString())
      .replace('{{TIMEZONE}}', timezone);
  }

  private async handleAddTransaction(
    user: PublicUser,
    originalMessage: string,
    payload: AgentPayload,
    language: AgentLanguage,
  ): Promise<AgentChatResult> {
    if (!payload.amount || payload.amount <= 0) {
      return {
        reply: this.buildMissingAmountReply(language),
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

    const amountLabel = this.formatCurrency(transaction.amount, transaction.currency, language);
    const categoryLabel = transaction.category?.name ?? categoryName ?? null;

    return {
      reply: this.buildTransactionSavedReply(language, {
        type,
        amount: amountLabel,
        category: categoryLabel,
      }),
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
        reply: this.buildAskBudgetAmountReply(language),
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

    const amountLabel = this.formatCurrency(budget.limitAmount, budget.currency, language);
    const monthLabel = this.formatMonthYear(month, year, language);
    const categoryLabel = this.getCategoryLabel(language, category?.name ?? categoryName ?? null);

    return {
      reply: this.buildBudgetSetReply(language, {
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
      const monthLabel = this.formatMonthYear(month, year, language);
      const target = this.getBudgetTargetLabel(language, category?.name ?? categoryName ?? null);
      return {
        reply: this.buildBudgetNotFoundReply(language, { target, monthLabel }),
        intent: 'clarify',
        parsed: payload,
      };
    }

    const status = await this.budgetsService.status(user.id, budget.id);
    const amountLabel = this.formatCurrency(status.spent, status.budget.currency, language);
    const limitLabel = this.formatCurrency(status.budget.limitAmount, status.budget.currency, language);
    const percentLabel = `${status.percentage}%`;
    const remainingLabel = this.formatCurrency(status.remaining, status.budget.currency, language);
    const endDateLabel = status.range?.end ? this.formatDate(status.range.end, timezone) : undefined;

    return {
      reply: this.buildBudgetStatusReply(language, {
        amountLabel,
        limitLabel,
        percentLabel,
        remainingLabel,
        endDateLabel,
      }),
      intent: payload.intent,
      parsed: payload,
      data: { status },
    };
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

    const rangeLabel = this.describeRange(
      summary.range?.start,
      summary.range?.end,
      timezone,
      language,
      payload.period,
    );

    if (payload.intent === 'query_by_category' && category) {
      const byCategory = summary.byCategory.find((item) => item.categoryId === category.id);
      const amountLabel = this.formatCurrency(byCategory?.amount ?? 0, currency, language);
      const reply = this.buildSummaryByCategoryReply(language, {
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

    const expenseLabel = this.formatCurrency(summary.totals.expense, currency, language);
    const incomeLabel = this.formatCurrency(summary.totals.income, currency, language);
    const netLabel = this.formatCurrency(summary.totals.net, currency, language);
    const reply = this.buildSummaryTotalsReply(language, {
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
        reply: this.buildNoTransactionsReply(language),
        intent: payload.intent,
        parsed: payload,
        data: { transactions: result },
      };
    }

    const lines = result.data.map((item) => {
      const amount = this.formatCurrency(item.amount, item.currency, language);
      const date = this.formatDate(item.occurredAt, timezone);
      const label = item.category?.name ?? this.getOtherCategoryLabel(language);
      return this.buildRecentTransactionLine({ date, amount, category: label });
    });

    const reply = `${this.buildRecentTransactionsHeader(language)}\n${lines.join('\n')}`;

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
      reply: this.buildSmallTalkReply(language, name),
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

  private logRawCompletion(raw: string): void {
    const cleaned = raw.replace(/\s+/g, ' ').trim();
    const preview = cleaned.length > 1000 ? `${cleaned.slice(0, 1000)}...` : cleaned;
    this.logger.debug(`Hyperbolic raw response preview: ${preview}`);
  }
  private parseAgentPayload(raw: string): AgentPayload {
    try {
      return AgentPayloadSchema.parse(JSON.parse(raw));
    } catch (error) {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return AgentPayloadSchema.parse(JSON.parse(jsonMatch[0]));
        } catch (innerError) {
          this.logger.warn('Failed to parse JSON snippet from LLM response', innerError);
        }
      }
      throw error;
    }
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

  private formatCurrency(amount: number, currency: Currency, language: AgentLanguage): string {
    const locale = language === 'vi' ? 'vi-VN' : 'en-US';
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: currency === Currency.VND ? 0 : 2,
      maximumFractionDigits: currency === Currency.VND ? 0 : 2,
    });
    return formatter.format(amount);
  }

  private formatDate(value: string, timezone: string): string {
    const dt = DateTime.fromISO(value, { zone: timezone });
    if (!dt.isValid) {
      return value;
    }
    return dt.toFormat('dd/MM/yyyy');
  }

  private formatMonthYear(month: number, year: number, language: AgentLanguage): string {
    return language === 'vi' ? `tháng ${month}/${year}` : `${month}/${year}`;
  }

  private describeRange(
    startIso: string | undefined,
    endIso: string | undefined,
    timezone: string,
    language: AgentLanguage,
    period?: TimePeriodEnum,
  ): string {
    if (!startIso && !endIso && !period) {
      return language === 'vi' ? 'Trong khoảng thời gian bạn chọn' : 'In the selected period';
    }

    if (startIso && endIso) {
      const start = this.formatDate(startIso, timezone);
      const end = this.formatDate(endIso, timezone);
      return language === 'vi' ? `Từ ${start} đến ${end}` : `From ${start} to ${end}`;
    }

    if (period) {
      switch (period) {
        case TimePeriodEnum.Today:
          return language === 'vi' ? 'Hôm nay' : 'Today';
        case TimePeriodEnum.Yesterday:
          return language === 'vi' ? 'Hôm qua' : 'Yesterday';
        case TimePeriodEnum.ThisWeek:
          return language === 'vi' ? 'Tuần này' : 'This week';
        case TimePeriodEnum.ThisMonth:
          return language === 'vi' ? 'Tháng này' : 'This month';
        case TimePeriodEnum.LastMonth:
          return language === 'vi' ? 'Tháng trước' : 'Last month';
        case TimePeriodEnum.ThisYear:
          return language === 'vi' ? 'Năm nay' : 'This year';
        default:
          break;
      }
    }

    if (startIso) {
      const formatted = this.formatDate(startIso, timezone);
      return language === 'vi' ? `Từ ${formatted}` : `From ${formatted}`;
    }

    if (endIso) {
      const formatted = this.formatDate(endIso, timezone);
      return language === 'vi' ? `Đến ${formatted}` : `Until ${formatted}`;
    }

    return language === 'vi' ? 'Trong khoảng thời gian bạn chọn' : 'In the selected period';
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

  private buildEmptyMessageReply(language: AgentLanguage): string {
    return language === 'vi'
      ? 'Bạn hãy nói rõ hơn điều muốn làm để mình hỗ trợ nhé.'
      : 'Please tell me more clearly what you\'d like help with.';
  }

  private buildClassificationErrorReply(language: AgentLanguage): string {
    return language === 'vi'
      ? 'Xin lỗi, mình gặp trục trặc khi phân tích tin nhắn. Bạn thử nói lại giúp mình nhé.'
      : 'Sorry, I ran into an issue while parsing that message. Could you try again?';
  }

  private buildLowConfidenceReply(language: AgentLanguage): string {
    return language === 'vi'
      ? 'Mình chưa chắc chắn là hiểu đúng nội dung. Bạn có thể nói rõ hơn hoặc bổ sung thông tin nhé?'
      : 'I\'m not fully sure I understood. Could you clarify or add a bit more detail?';
  }

  private buildUndoNotSupportedReply(language: AgentLanguage): string {
    return language === 'vi'
      ? 'Mình đang xây dựng tính năng hủy giao dịch. Bạn có thể xóa thủ công trong danh sách giao dịch nhé.'
      : 'I\'m still building the undo feature. You can delete the transaction manually in the list for now.';
  }

  private buildUnsupportedIntentReply(language: AgentLanguage): string {
    return language === 'vi'
      ? 'Tính năng này chưa được hỗ trợ. Bạn thử yêu cầu khác giúp mình nhé.'
      : 'That capability isn\'t supported yet. Please try a different request.';
  }

  private buildHandlerErrorReply(language: AgentLanguage): string {
    return language === 'vi'
      ? 'Xin lỗi, mình gặp lỗi khi xử lý. Bạn thử lại sau ít phút giúp mình nhé.'
      : 'Sorry, something went wrong while handling that. Please try again shortly.';
  }

  private buildMissingAmountReply(language: AgentLanguage): string {
    return language === 'vi'
      ? 'Mình chưa thấy số tiền. Bạn cho mình biết cụ thể hoặc nhập lại giúp nhé.'
      : 'I didn\'t catch the amount. Could you tell me the number or rephrase?';
  }

  private buildTransactionSavedReply(
    language: AgentLanguage,
    params: { type: TxnType; amount: string; category?: string | null },
  ): string {
    const { type, amount, category } = params;
    const categoryClause = category
      ? language === 'vi'
        ? ` cho ${category}`
        : ` for ${category}`
      : '';
    if (language === 'vi') {
      const noun = type === TxnType.INCOME ? 'khoản thu' : 'khoản chi';
      return `Mình đã ghi nhận ${noun} ${amount}${categoryClause}.`;
    }
    const base =
      type === TxnType.INCOME
        ? `I've recorded income of ${amount}`
        : `I've recorded an expense of ${amount}`;
    return `${base}${categoryClause}.`;
  }

  private buildAskBudgetAmountReply(language: AgentLanguage): string {
    return language === 'vi'
      ? 'Bạn muốn đặt ngân sách bao nhiêu? Mình cần số tiền cụ thể nhé.'
      : 'How much budget would you like to set? I need the exact amount.';
  }

  private buildBudgetSetReply(
    language: AgentLanguage,
    params: { amountLabel: string; categoryLabel: string; monthLabel: string },
  ): string {
    const { amountLabel, categoryLabel, monthLabel } = params;
    return language === 'vi'
      ? `Mình đã cập nhật ngân sách ${amountLabel} cho ${categoryLabel} (${monthLabel}).`
      : `I've updated the budget to ${amountLabel} for ${categoryLabel} (${monthLabel}).`;
  }

  private buildBudgetNotFoundReply(
    language: AgentLanguage,
    params: { target: string; monthLabel: string },
  ): string {
    const { target, monthLabel } = params;
    return language === 'vi'
      ? `Mình chưa thấy ${target} trong ${monthLabel}. Bạn có thể đặt ngân sách trước nhé.`
      : `I couldn't find ${target} in ${monthLabel}. Try setting the budget first.`;
  }

  private buildBudgetStatusReply(
    language: AgentLanguage,
    params: {
      amountLabel: string;
      limitLabel: string;
      percentLabel: string;
      remainingLabel: string;
      endDateLabel?: string;
    },
  ): string {
    const { amountLabel, limitLabel, percentLabel, remainingLabel, endDateLabel } = params;
    const trailing = endDateLabel
      ? language === 'vi'
        ? ` Ngân sách kết thúc vào ${endDateLabel}.`
        : ` The budget ends on ${endDateLabel}.`
      : '';
    return language === 'vi'
      ? `Bạn đang dùng ${amountLabel} / ${limitLabel} (${percentLabel}). Còn lại ${remainingLabel}.${trailing}`
      : `You've spent ${amountLabel} / ${limitLabel} (${percentLabel}). Remaining ${remainingLabel}.${trailing}`;
  }

  private buildSummaryByCategoryReply(
    language: AgentLanguage,
    params: { rangeLabel: string; amountLabel: string; categoryName: string },
  ): string {
    const { rangeLabel, amountLabel, categoryName } = params;
    return language === 'vi'
      ? `${rangeLabel} bạn đã chi ${amountLabel} cho ${categoryName}.`
      : `${rangeLabel}, you spent ${amountLabel} on ${categoryName}.`;
  }

  private buildSummaryTotalsReply(
    language: AgentLanguage,
    params: { rangeLabel: string; expenseLabel: string; incomeLabel: string; netLabel: string },
  ): string {
    const { rangeLabel, expenseLabel, incomeLabel, netLabel } = params;
    return language === 'vi'
      ? `${rangeLabel} bạn đã chi ${expenseLabel} và thu ${incomeLabel} (chênh lệch ${netLabel}).`
      : `${rangeLabel}, you spent ${expenseLabel} and earned ${incomeLabel} (net ${netLabel}).`;
  }

  private buildNoTransactionsReply(language: AgentLanguage): string {
    return language === 'vi'
      ? 'Chưa có giao dịch nào trong khoảng thời gian đó.'
      : 'No transactions found for that timeframe.';
  }

  private buildRecentTransactionsHeader(language: AgentLanguage): string {
    return language === 'vi' ? 'Các giao dịch gần đây:' : 'Recent transactions:';
  }

  private buildRecentTransactionLine(params: {
    date: string;
    amount: string;
    category: string;
  }): string {
    const { date, amount, category } = params;
    return `- ${date}: ${amount} (${category})`;
  }

  private buildSmallTalkReply(language: AgentLanguage, name: string): string {
    return language === 'vi'
      ? `Chào ${name}! Mình ở đây để giúp bạn quản lý chi tiêu, cứ hỏi nhé.`
      : `Hi ${name}! I'm here to help you manage your spending, just let me know what you need.`;
  }

  private getCategoryLabel(language: AgentLanguage, categoryName?: string | null): string {
    if (categoryName) {
      return categoryName;
    }
    return language === 'vi' ? 'tất cả danh mục' : 'all categories';
  }

  private getBudgetTargetLabel(language: AgentLanguage, categoryName?: string | null): string {
    if (categoryName) {
      return language === 'vi' ? `ngân sách cho ${categoryName}` : `the ${categoryName} budget`;
    }
    return language === 'vi' ? 'ngân sách này' : 'this budget';
  }

  private getOtherCategoryLabel(language: AgentLanguage): string {
    return language === 'vi' ? 'Khác' : 'Other';
  }
}

