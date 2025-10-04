import { Injectable, Logger } from '@nestjs/common';
import { Currency, RecurringFreq, TxnType } from '@prisma/client';
import { AgentPayload, normalizeText } from '@expense-ai/shared';
import { DateTime } from 'luxon';

import { RecurringService } from '../../recurring/recurring.service';
import { PublicUser } from '../../users/types/public-user.type';
import { AgentChatResult } from '../types/agent-response.type';
import { AgentLanguage, DEFAULT_TIMEZONE } from '../agent.constants';
import {
  buildMissingAmountReply,
  buildRecurringRuleCreatedReply,
  buildRecurringRuleUpdatedReply,
  describeRecurringSchedule,
  formatCurrency,
  formatDate,
} from '../utils/agent-response.utils';
import { CategoryResolverService } from './category-resolver.service';

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

@Injectable()
export class RecurringHandlerService {
  private readonly logger = new Logger(RecurringHandlerService.name);

  constructor(
    private readonly recurringService: RecurringService,
    private readonly categoryResolver: CategoryResolverService,
  ) {}

  async handleSetRecurring(
    user: PublicUser,
    originalMessage: string,
    payload: AgentPayload,
    defaultTimezone: string,
    language: AgentLanguage,
  ): Promise<AgentChatResult> {
    if (!payload.amount || payload.amount <= 0) {
      return {
        reply: buildMissingAmountReply(language),
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

    let txnType: TxnType;
    if (payload.recurring_txn_type === 'INCOME') {
      txnType = TxnType.INCOME;
    } else if (payload.recurring_txn_type === 'EXPENSE') {
      txnType = TxnType.EXPENSE;
    } else {
      txnType = categoryName === 'Thu nhập' ? TxnType.INCOME : TxnType.EXPENSE;
    }

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

    const { rule, action } = await this.recurringService.createRule(
      user.id,
      {
        freq,
        dayOfMonth,
        weekday,
        timeOfDay,
        timezone,
        startDate: startDateTime.toJSDate(),
        endDate: endDateTime?.toJSDate(),
        type: txnType,
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
      action === 'updated' ? buildRecurringRuleUpdatedReply : buildRecurringRuleCreatedReply;

    return {
      reply: replyBuilder(language, {
        type: rule.type,
        amountLabel,
        categoryLabel,
        scheduleLabel,
        timeLabel: rule.timeOfDay,
        timezone: rule.timezone,
        nextRunLabel,
      }),
      intent: payload.intent,
      parsed: payload,
      data: { rule, action },
      meta: { nextRunAt: rule.nextRunAt, action },
    };
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
