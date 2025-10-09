import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Currency, Prisma, RecurringFreq } from '@prisma/client';
import { AgentActionOption, AgentPayload, normalizeText } from '@expense-ai/shared';
import { DateTime } from 'luxon';

import { PrismaService } from '../../../prisma/prisma.service';
import { BudgetsService } from '../../budgets/budgets.service';
import { RecurringBudgetsService } from '../../recurring-budgets/recurring-budgets.service';
import { PublicUser } from '../../users/types/public-user.type';
import { AgentChatResult } from '../types/agent-response.type';
import { AgentLanguage, DEFAULT_TIMEZONE } from '../agent.constants';
import {
  buildAskBudgetAmountReply,
  buildBudgetExceededWarning,
  buildBudgetNotFoundReply,
  buildBudgetSetReply,
  buildBudgetStatusReply,
  buildRecurringBudgetRuleCreatedReply,
  buildRecurringBudgetRuleUpdatedReply,
  describeRecurringSchedule,
  formatCurrency,
  formatDate,
  formatMonthYear,
  getBudgetTargetLabel,
  getCategoryLabel,
} from '../utils/agent-response.utils';
import { CategoryResolverService } from './category-resolver.service';
import { TransactionResult } from '../types/internal.types';

const RECURRING_UPDATE_MARKERS = [
  'cap nhat',
  'update',
  'thay doi',
  'change',
  'dieu chinh',
  'chinh sua',
  'chinh lai',
  'adjust',
  'doi lich',
  'doi ngay',
];

type BudgetActionPayload = {
  budgetId: string;
  amount: number;
  currency: Currency;
  language: AgentLanguage;
};

type RecurringBudgetActionPayload = {
  ruleId: string;
  amount: number;
  currency: Currency;
  language: AgentLanguage;
};

@Injectable()
export class BudgetHandlerService {
  private readonly logger = new Logger(BudgetHandlerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly budgetsService: BudgetsService,
    private readonly recurringBudgetsService: RecurringBudgetsService,
    private readonly configService: ConfigService,
    private readonly categoryResolver: CategoryResolverService,
  ) {}

  async handleSetBudget(
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
    const categoryName = payload.category
      ? this.categoryResolver.resolveCategory(payload.category)
      : null;
    const category = categoryName
      ? await this.categoryResolver.findCategoryByName(categoryName)
      : null;

    const existingBudget = await this.prisma.budget.findFirst({
      where: {
        userId: user.id,
        month,
        year,
        categoryId: category?.id ?? null,
      },
      include: { category: true },
    });

    if (existingBudget) {
      const basePayload = {
        budgetId: existingBudget.id,
        amount: payload.amount,
        currency,
        language,
      };

      const actions: AgentActionOption[] = [
        {
          id: 'set_budget_update',
          label: language === 'vi' ? 'Cập nhật' : 'Update',
          payload: basePayload,
        },
        {
          id: 'set_budget_increase',
          label: language === 'vi' ? 'Tăng thêm' : 'Add more',
          payload: basePayload,
        },
      ];

      return {
        reply:
          language === 'vi'
            ? 'Giới hạn của danh mục này đã tồn tại, bạn muốn tôi cập nhật hay tăng thêm?'
            : 'A budget for this category already exists. Would you like me to update it or add more?',
        intent: 'clarify',
        parsed: payload,
        data: { budget: existingBudget },
        meta: {
          pendingIntent: 'set_budget',
          existingBudgetId: existingBudget.id,
          requestedAmount: payload.amount,
        },
        actions,
      };
    }

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

  async handleBudgetUpdateAction(
    user: PublicUser,
    payload: BudgetActionPayload,
    language: AgentLanguage,
  ): Promise<AgentChatResult> {
    const budget = await this.prisma.budget.findFirst({
      where: { id: payload.budgetId, userId: user.id },
      include: { category: true },
    });

    if (!budget) {
      const message =
        language === 'vi'
          ? 'Mình không tìm thấy giới hạn này nữa, bạn thử đặt lại giúp mình nhé.'
          : "I couldn't find that budget anymore. Please try setting it again.";
      return {
        reply: message,
        intent: 'error',
      };
    }

    if (budget.currency !== payload.currency) {
      const message =
        language === 'vi'
          ? 'Loại tiền tệ không khớp với giới hạn hiện có, bạn thử đặt lại một giới hạn mới nhé.'
          : 'The currency does not match the existing budget. Please create a new budget instead.';
      return {
        reply: message,
        intent: 'error',
        data: { budget },
      };
    }

    const updated = await this.prisma.budget.update({
      where: { id: budget.id },
      data: {
        limitAmount: new Prisma.Decimal(payload.amount),
      },
      include: { category: true },
    });

    const amountLabel = formatCurrency(updated.limitAmount.toNumber(), updated.currency, language);
    const monthLabel = formatMonthYear(updated.month, updated.year, language);
    const categoryLabel = getCategoryLabel(language, updated.category?.name ?? null);

    const reply =
      language === 'vi'
        ? `Mình đã cập nhật giới hạn ${categoryLabel} trong ${monthLabel} thành ${amountLabel}.`
        : `Updated the ${categoryLabel} budget for ${monthLabel} to ${amountLabel}.`;

    return {
      reply,
      intent: 'set_budget',
      data: { budget: updated },
    };
  }

  async handleBudgetIncreaseAction(
    user: PublicUser,
    payload: BudgetActionPayload,
    language: AgentLanguage,
  ): Promise<AgentChatResult> {
    const budget = await this.prisma.budget.findFirst({
      where: { id: payload.budgetId, userId: user.id },
      include: { category: true },
    });

    if (!budget) {
      const message =
        language === 'vi'
          ? 'Mình không tìm thấy giới hạn này nữa, bạn thử đặt lại giúp mình nhé.'
          : "I couldn't find that budget anymore. Please try setting it again.";
      return {
        reply: message,
        intent: 'error',
      };
    }

    if (budget.currency !== payload.currency) {
      const message =
        language === 'vi'
          ? 'Loại tiền tệ không khớp với giới hạn hiện có, bạn thử đặt lại một giới hạn mới nhé.'
          : 'The currency does not match the existing budget. Please create a new budget instead.';
      return {
        reply: message,
        intent: 'error',
        data: { budget },
      };
    }

    const increment = new Prisma.Decimal(payload.amount);
    const updated = await this.prisma.budget.update({
      where: { id: budget.id },
      data: {
        limitAmount: budget.limitAmount.add(increment),
      },
      include: { category: true },
    });

    const incrementLabel = formatCurrency(payload.amount, budget.currency, language);
    const newLimitLabel = formatCurrency(
      updated.limitAmount.toNumber(),
      updated.currency,
      language,
    );
    const monthLabel = formatMonthYear(updated.month, updated.year, language);
    const categoryLabel = getCategoryLabel(language, updated.category?.name ?? null);

    const reply =
      language === 'vi'
        ? `Đã tăng thêm ${incrementLabel} cho giới hạn ${categoryLabel} trong ${monthLabel}. Giới hạn mới là ${newLimitLabel}.`
        : `Added ${incrementLabel} to the ${categoryLabel} budget for ${monthLabel}. The new limit is ${newLimitLabel}.`;

    return {
      reply,
      intent: 'set_budget',
      data: { budget: updated },
    };
  }

  async handleBudgetStatus(
    user: PublicUser,
    payload: AgentPayload,
    timezone: string,
    language: AgentLanguage,
  ): Promise<AgentChatResult> {
    const now = DateTime.now().setZone(timezone);
    const month = payload.budget_month ?? now.month;
    const year = payload.budget_year ?? now.year;

    const categoryName = payload.category
      ? this.categoryResolver.resolveCategory(payload.category)
      : null;
    const category = categoryName
      ? await this.categoryResolver.findCategoryByName(categoryName)
      : null;

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

  async handleSetRecurringBudget(
    user: PublicUser,
    originalMessage: string,
    payload: AgentPayload,
    defaultTimezone: string,
    language: AgentLanguage,
  ): Promise<AgentChatResult> {
    if (!payload.amount || payload.amount <= 0) {
      return {
        reply: buildAskBudgetAmountReply(language),
        intent: 'clarify',
        parsed: payload,
      };
    }

    const freq: RecurringFreq = payload.recurring_freq
      ? (payload.recurring_freq as RecurringFreq)
      : RecurringFreq.MONTHLY;

    const timezone = payload.recurring_timezone?.trim() || defaultTimezone || DEFAULT_TIMEZONE;
    let startDateTime = payload.recurring_start_date
      ? DateTime.fromISO(payload.recurring_start_date, { zone: timezone })
      : DateTime.now().setZone(timezone);
    if (!startDateTime.isValid) {
      startDateTime = DateTime.now().setZone(timezone);
    }

    let endDateTime: DateTime | undefined;
    if (payload.recurring_end_date) {
      const parsedEnd = DateTime.fromISO(payload.recurring_end_date, { zone: timezone });
      if (parsedEnd.isValid) {
        endDateTime = parsedEnd;
      }
    }

    const timeOfDay = payload.recurring_time_of_day ?? '07:00';

    const categoryName = payload.category
      ? this.categoryResolver.resolveCategory(payload.category)
      : null;
    const category = categoryName
      ? await this.categoryResolver.findCategoryByName(categoryName)
      : null;

    let weekday: number | undefined;
    if (freq === RecurringFreq.WEEKLY) {
      if (typeof payload.recurring_weekday === 'number') {
        weekday = payload.recurring_weekday;
      } else {
        const luxonWeekday = startDateTime.weekday; // 1 (Mon) .. 7 (Sun)
        weekday = luxonWeekday === 7 ? 0 : luxonWeekday;
      }
    }

    let dayOfMonth: number | undefined;
    if (freq === RecurringFreq.MONTHLY) {
      if (typeof payload.recurring_day_of_month === 'number') {
        dayOfMonth = payload.recurring_day_of_month;
      } else {
        dayOfMonth = startDateTime.day;
      }
    }

    const currency: Currency = payload.currency === 'USD' ? Currency.USD : Currency.VND;
    const note = payload.note?.trim()?.length ? payload.note.trim() : originalMessage.trim();

    const preferUpdate = this.isRecurringUpdateMessage(originalMessage);

    // Kiểm tra xem có rule tương tự đã tồn tại chưa
    // Tìm rules có cùng category, currency và frequency để tránh trùng lặp
    const existingRules = await this.prisma.recurringBudgetRule.findMany({
      where: {
        userId: user.id,
        categoryId: category?.id ?? null,
        currency,
        freq,
        enabled: true,
      },
      include: { category: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (existingRules.length > 0 && !preferUpdate) {
      const existingRule = existingRules[0];
      const categoryLabel = existingRule.category?.name ?? categoryName ?? null;
      const existingAmountLabel = formatCurrency(
        existingRule.amount.toNumber(),
        existingRule.currency,
        language,
      );

      const actions: AgentActionOption[] = [
        {
          id: 'recurring_budget_update',
          label: language === 'vi' ? 'Cập nhật' : 'Update',
          payload: {
            ruleId: existingRule.id,
            amount: payload.amount,
            currency,
            language,
          },
        },
        {
          id: 'recurring_budget_add',
          label: language === 'vi' ? 'Thêm vào' : 'Add to',
          payload: {
            ruleId: existingRule.id,
            amount: payload.amount,
            currency,
            language,
          },
        },
      ];

      return {
        reply:
          language === 'vi'
            ? `Đã có ngân sách định kỳ cho ${categoryLabel || 'danh mục này'} với số tiền ${existingAmountLabel}. Bạn muốn cập nhật hay thêm vào ngân sách hiện có?`
            : `There's already a recurring budget for ${categoryLabel || 'this category'} with amount ${existingAmountLabel}. Would you like to update or add to the existing budget?`,
        intent: 'clarify',
        parsed: payload,
        data: { existingRule },
        meta: {
          pendingIntent: 'set_recurring_budget',
          existingRuleId: existingRule.id,
          requestedAmount: payload.amount,
        },
        actions,
      };
    }

    const { rule, action } = await this.recurringBudgetsService.createRule(
      user.id,
      {
        freq,
        dayOfMonth,
        weekday,
        timeOfDay,
        timezone,
        startDate: startDateTime.toJSDate(),
        endDate: endDateTime?.toJSDate(),
        amount: payload.amount,
        currency,
        categoryId: category?.id ?? null,
        note,
      },
      {
        preferUpdate,
      },
    );

    const nextRun = DateTime.fromJSDate(rule.nextRunAt).setZone(rule.timezone);
    const amountLabel = formatCurrency(rule.amount.toNumber(), rule.currency, language);
    const categoryLabel = rule.category?.name ?? categoryName ?? null;
    const scheduleLabel = describeRecurringSchedule(language, {
      freq: rule.freq,
      dayOfMonth: rule.dayOfMonth,
      weekday: rule.weekday,
      nextRun,
    });
    const nextRunIso = nextRun.toISO() ?? nextRun.toISODate() ?? nextRun.toFormat('yyyy-MM-dd');
    const nextRunLabel = formatDate(nextRunIso, rule.timezone);

    const replyBuilder =
      action === 'updated'
        ? buildRecurringBudgetRuleUpdatedReply
        : buildRecurringBudgetRuleCreatedReply;

    const reply = replyBuilder(language, {
      amountLabel,
      categoryLabel,
      scheduleLabel,
      timeLabel: rule.timeOfDay,
      timezone: rule.timezone,
      nextRunLabel,
    });

    return {
      reply,
      intent: payload.intent,
      parsed: payload,
      data: { rule, action },
      meta: { nextRunAt: rule.nextRunAt, action },
    };
  }

  async handleRecurringBudgetUpdateAction(
    user: PublicUser,
    payload: RecurringBudgetActionPayload,
    language: AgentLanguage,
  ): Promise<AgentChatResult> {
    const rule = await this.prisma.recurringBudgetRule.findFirst({
      where: { id: payload.ruleId, userId: user.id },
      include: { category: true },
    });

    if (!rule) {
      const message =
        language === 'vi'
          ? 'Mình không tìm thấy quy tắc ngân sách định kỳ này nữa, bạn thử tạo lại giúp mình nhé.'
          : "I couldn't find that recurring budget rule anymore. Please try creating it again.";
      return {
        reply: message,
        intent: 'error',
      };
    }

    const updated = await this.prisma.recurringBudgetRule.update({
      where: { id: rule.id },
      data: {
        amount: new Prisma.Decimal(payload.amount),
        currency: payload.currency,
      },
      include: { category: true },
    });

    const amountLabel = formatCurrency(updated.amount.toNumber(), updated.currency, language);
    const categoryLabel = updated.category?.name ?? null;

    const reply =
      language === 'vi'
        ? `Mình đã cập nhật ngân sách định kỳ cho ${categoryLabel || 'danh mục này'} thành ${amountLabel}.`
        : `Updated the recurring budget for ${categoryLabel || 'this category'} to ${amountLabel}.`;

    return {
      reply,
      intent: 'set_recurring_budget',
      data: { rule: updated },
    };
  }

  async handleRecurringBudgetAddAction(
    user: PublicUser,
    payload: RecurringBudgetActionPayload,
    language: AgentLanguage,
  ): Promise<AgentChatResult> {
    const rule = await this.prisma.recurringBudgetRule.findFirst({
      where: { id: payload.ruleId, userId: user.id },
      include: { category: true },
    });

    if (!rule) {
      const message =
        language === 'vi'
          ? 'Mình không tìm thấy quy tắc ngân sách định kỳ này nữa, bạn thử tạo lại giúp mình nhé.'
          : "I couldn't find that recurring budget rule anymore. Please try creating it again.";
      return {
        reply: message,
        intent: 'error',
      };
    }

    const increment = new Prisma.Decimal(payload.amount);
    const updated = await this.prisma.recurringBudgetRule.update({
      where: { id: rule.id },
      data: {
        amount: rule.amount.add(increment),
      },
      include: { category: true },
    });

    const incrementLabel = formatCurrency(payload.amount, rule.currency, language);
    const newAmountLabel = formatCurrency(updated.amount.toNumber(), updated.currency, language);
    const categoryLabel = updated.category?.name ?? null;

    const reply =
      language === 'vi'
        ? `Đã thêm ${incrementLabel} vào ngân sách định kỳ cho ${categoryLabel || 'danh mục này'}. Ngân sách mới là ${newAmountLabel}.`
        : `Added ${incrementLabel} to the recurring budget for ${categoryLabel || 'this category'}. The new budget is ${newAmountLabel}.`;

    return {
      reply,
      intent: 'set_recurring_budget',
      data: { rule: updated },
    };
  }

  async collectBudgetWarnings(
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

  private isRecurringUpdateMessage(message: string): boolean {
    if (!message) {
      return false;
    }

    const normalized = normalizeText(message);
    if (!normalized) {
      return false;
    }

    return RECURRING_UPDATE_MARKERS.some((marker) => normalized.includes(marker));
  }
}
