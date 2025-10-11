import { DateTime } from 'luxon';
import { Currency, RecurringFreq, TxnType } from '@prisma/client';
import { TimePeriodEnum } from '@expense-ai/shared';

import { AgentLanguage } from '../agent.constants';
import type { BudgetStatusResult } from '../types/internal.types';

export function formatCurrency(
  amount: number,
  currency: Currency,
  language: AgentLanguage,
): string {
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === Currency.VND ? 0 : 2,
    maximumFractionDigits: currency === Currency.VND ? 0 : 2,
  });
  return formatter.format(amount);
}

export function formatDate(value: string, timezone: string): string {
  const dt = DateTime.fromISO(value, { zone: timezone });
  if (!dt.isValid) {
    return value;
  }
  return dt.toFormat('dd/MM/yyyy');
}

export function formatMonthYear(month: number, year: number, language: AgentLanguage): string {
  return language === 'vi' ? `tháng ${month}/${year}` : `${month}/${year}`;
}

export function describeRange(
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
    const start = formatDate(startIso, timezone);
    const end = formatDate(endIso, timezone);
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
    const formatted = formatDate(startIso, timezone);
    return language === 'vi' ? `Từ ${formatted}` : `From ${formatted}`;
  }

  if (endIso) {
    const formatted = formatDate(endIso, timezone);
    return language === 'vi' ? `Đến ${formatted}` : `Until ${formatted}`;
  }

  return language === 'vi' ? 'Trong khoảng thời gian bạn chọn' : 'In the selected period';
}

export function buildEmptyMessageReply(language: AgentLanguage): string {
  return language === 'vi'
    ? 'Bạn hãy nói rõ hơn điều muốn làm để mình hỗ trợ nhé.'
    : "Please tell me more clearly what you'd like help with.";
}

export function buildClassificationErrorReply(language: AgentLanguage): string {
  return language === 'vi'
    ? 'Xin lỗi, mình gặp trục trặc khi phân tích tin nhắn. Bạn thử nói lại giúp mình nhé.'
    : 'Sorry, I ran into an issue while parsing that message. Could you try again?';
}

export function buildLowConfidenceReply(language: AgentLanguage): string {
  return language === 'vi'
    ? 'Mình chưa chắc chắn là hiểu đúng nội dung. Bạn có thể nói rõ hơn hoặc bổ sung thông tin nhé?'
    : "I'm not fully sure I understood. Could you clarify or add a bit more detail?";
}

export function buildUndoNotSupportedReply(language: AgentLanguage): string {
  return language === 'vi'
    ? 'Mình đang xây dựng tính năng hủy giao dịch. Bạn có thể xóa thủ công trong danh sách giao dịch nhé.'
    : "I'm still building the undo feature. You can delete the transaction manually in the list for now.";
}

export function buildUnsupportedIntentReply(language: AgentLanguage): string {
  return language === 'vi'
    ? 'Tính năng này chưa được hỗ trợ. Bạn thử yêu cầu khác giúp mình nhé.'
    : "That capability isn't supported yet. Please try a different request.";
}

export function buildHandlerErrorReply(language: AgentLanguage): string {
  return language === 'vi'
    ? 'Xin lỗi, mình gặp lỗi khi xử lý. Bạn thử lại sau ít phút giúp mình nhé.'
    : 'Sorry, something went wrong while handling that. Please try again shortly.';
}

export function buildMissingAmountReply(language: AgentLanguage): string {
  return language === 'vi'
    ? 'Mình chưa thấy số tiền. Bạn cho mình biết cụ thể hoặc nhập lại giúp nhé.'
    : "I didn't catch the amount. Could you tell me the number or rephrase?";
}

export function buildTransactionSavedReply(
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

const WEEKDAY_LABELS: Record<AgentLanguage, string[]> = {
  vi: ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

const MONTH_LABELS: Record<AgentLanguage, string[]> = {
  vi: [
    'tháng 1',
    'tháng 2',
    'tháng 3',
    'tháng 4',
    'tháng 5',
    'tháng 6',
    'tháng 7',
    'tháng 8',
    'tháng 9',
    'tháng 10',
    'tháng 11',
    'tháng 12',
  ],
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
};

export function describeRecurringSchedule(
  language: AgentLanguage,
  params: {
    freq: RecurringFreq;
    dayOfMonth?: number | null;
    weekday?: number | null;
    nextRun: DateTime;
  },
): string {
  const { freq, dayOfMonth, weekday, nextRun } = params;

  switch (freq) {
    case RecurringFreq.DAILY:
      return language === 'vi' ? 'mỗi ngày' : 'every day';
    case RecurringFreq.WEEKLY: {
      const targetWeekday =
        typeof weekday === 'number' ? weekday : ((nextRun.weekday % 7) as number);
      const normalized = ((targetWeekday % 7) + 7) % 7;
      const label = WEEKDAY_LABELS[language][normalized];
      return language === 'vi' ? `mỗi ${label.toLowerCase()}` : `every ${label}`;
    }
    case RecurringFreq.MONTHLY: {
      const desiredDay = dayOfMonth ?? nextRun.day;
      const actualDay = nextRun.day;
      if (desiredDay !== actualDay) {
        return language === 'vi'
          ? 'ngày cuối mỗi tháng (khi thiếu sẽ chạy ngày cuối cùng)'
          : 'the last day of each month (adjusted when shorter)';
      }
      return language === 'vi' ? `ngày ${desiredDay} hàng tháng` : `day ${desiredDay} each month`;
    }
    case RecurringFreq.YEARLY: {
      const monthLabel = MONTH_LABELS[language][nextRun.month - 1];
      const day = nextRun.day;
      return language === 'vi'
        ? `ngày ${day} ${monthLabel} hằng năm`
        : `every year on ${monthLabel} ${day}`;
    }
    default:
      return language === 'vi' ? 'định kỳ' : 'on schedule';
  }
}

export function buildRecurringRuleCreatedReply(
  language: AgentLanguage,
  params: {
    type: TxnType;
    amountLabel: string;
    categoryLabel?: string | null;
    scheduleLabel: string;
    timeLabel: string;
    timezone: string;
    nextRunLabel: string;
  },
): string {
  const { type, amountLabel, categoryLabel, scheduleLabel, timeLabel, timezone, nextRunLabel } =
    params;
  const categoryClause = categoryLabel
    ? language === 'vi'
      ? ` cho ${categoryLabel}`
      : ` for ${categoryLabel}`
    : '';

  const action =
    type === TxnType.INCOME
      ? language === 'vi'
        ? `khoản thu ${amountLabel}`
        : `income of ${amountLabel}`
      : language === 'vi'
        ? `khoản chi ${amountLabel}`
        : `an expense of ${amountLabel}`;

  if (language === 'vi') {
    return `Mình sẽ tự động ghi ${action}${categoryClause} ${scheduleLabel} lúc ${timeLabel} (lần tiếp theo: ${nextRunLabel}, múi giờ ${timezone}).`;
  }

  return `I'll automatically record ${action}${categoryClause} ${scheduleLabel} at ${timeLabel} (next run: ${nextRunLabel}, timezone ${timezone}).`;
}

export function buildRecurringRuleUpdatedReply(
  language: AgentLanguage,
  params: {
    type: TxnType;
    amountLabel: string;
    categoryLabel?: string | null;
    scheduleLabel: string;
    timeLabel: string;
    timezone: string;
    nextRunLabel: string;
  },
): string {
  const { type, amountLabel, categoryLabel, scheduleLabel, timeLabel, timezone, nextRunLabel } =
    params;
  const categoryClause = categoryLabel
    ? language === 'vi'
      ? ` cho ${categoryLabel}`
      : ` for ${categoryLabel}`
    : '';

  const action =
    type === TxnType.INCOME
      ? language === 'vi'
        ? `khoản thu ${amountLabel}`
        : `income of ${amountLabel}`
      : language === 'vi'
        ? `khoản chi ${amountLabel}`
        : `an expense of ${amountLabel}`;

  if (language === 'vi') {
    return `Mình đã cập nhật lịch ghi ${action}${categoryClause} ${scheduleLabel} lúc ${timeLabel} (lần tiếp theo: ${nextRunLabel}, múi giờ ${timezone}).`;
  }

  return `I've updated the schedule to record ${action}${categoryClause} ${scheduleLabel} at ${timeLabel} (next run: ${nextRunLabel}, timezone ${timezone}).`;
}

export function buildRecurringBudgetRuleCreatedReply(
  language: AgentLanguage,
  params: {
    amountLabel: string;
    categoryLabel?: string | null;
    scheduleLabel: string;
    timeLabel: string;
    timezone: string;
    nextRunLabel: string;
  },
): string {
  const { amountLabel, categoryLabel, scheduleLabel, timeLabel, timezone, nextRunLabel } = params;
  const categoryClause = categoryLabel
    ? language === 'vi'
      ? ` cho ${categoryLabel}`
      : ` for ${categoryLabel}`
    : '';

  if (language === 'vi') {
    return `Mình sẽ tự động tạo ngân sách ${amountLabel}${categoryClause} ${scheduleLabel} lúc ${timeLabel} (lần tiếp theo: ${nextRunLabel}, múi giờ ${timezone}).`;
  }

  return `I'll automatically create budget ${amountLabel}${categoryClause} ${scheduleLabel} at ${timeLabel} (next run: ${nextRunLabel}, timezone ${timezone}).`;
}

export function buildRecurringBudgetRuleUpdatedReply(
  language: AgentLanguage,
  params: {
    amountLabel: string;
    categoryLabel?: string | null;
    scheduleLabel: string;
    timeLabel: string;
    timezone: string;
    nextRunLabel: string;
  },
): string {
  const { amountLabel, categoryLabel, scheduleLabel, timeLabel, timezone, nextRunLabel } = params;
  const categoryClause = categoryLabel
    ? language === 'vi'
      ? ` cho ${categoryLabel}`
      : ` for ${categoryLabel}`
    : '';

  if (language === 'vi') {
    return `Mình đã cập nhật lịch tạo ngân sách ${amountLabel}${categoryClause} ${scheduleLabel} lúc ${timeLabel} (lần tiếp theo: ${nextRunLabel}, múi giờ ${timezone}).`;
  }

  return `I've updated the schedule to create budget ${amountLabel}${categoryClause} ${scheduleLabel} at ${timeLabel} (next run: ${nextRunLabel}, timezone ${timezone}).`;
}

export function buildAskBudgetAmountReply(language: AgentLanguage): string {
  return language === 'vi'
    ? 'Bạn muốn đặt ngân sách bao nhiêu? Mình cần số tiền cụ thể nhé.'
    : 'How much budget would you like to set? I need the exact amount.';
}

export function buildBudgetSetReply(
  language: AgentLanguage,
  params: { amountLabel: string; categoryLabel: string; monthLabel: string },
): string {
  const { amountLabel, categoryLabel, monthLabel } = params;
  return language === 'vi'
    ? `Mình đã cập nhật ngân sách ${amountLabel} cho ${categoryLabel} (${monthLabel}).`
    : `I've updated the budget to ${amountLabel} for ${categoryLabel} (${monthLabel}).`;
}

export function buildBudgetNotFoundReply(
  language: AgentLanguage,
  params: { target: string; monthLabel: string },
): string {
  const { target, monthLabel } = params;
  return language === 'vi'
    ? `Mình chưa thấy ${target} trong ${monthLabel}. Bạn có thể đặt ngân sách trước nhé.`
    : `I couldn't find ${target} in ${monthLabel}. Try setting the budget first.`;
}

export function buildBudgetStatusReply(
  language: AgentLanguage,
  params: {
    amountLabel: string;
    limitLabel: string;
    percentLabel: string;
    remainingLabel: string;
    endDateLabel?: string;
    overBudget: boolean;
    overspentLabel?: string;
  },
): string {
  const {
    amountLabel,
    limitLabel,
    percentLabel,
    remainingLabel,
    endDateLabel,
    overBudget,
    overspentLabel,
  } = params;
  const trailing = endDateLabel
    ? language === 'vi'
      ? ` Ngân sách kết thúc vào ${endDateLabel}.`
      : ` The budget ends on ${endDateLabel}.`
    : '';

  if (overBudget && overspentLabel) {
    const warning =
      language === 'vi'
        ? ` Cảnh báo: bạn đã vượt ngân sách ${overspentLabel}.`
        : ` Warning: you're over budget by ${overspentLabel}.`;
    return language === 'vi'
      ? `Bạn đang dùng ${amountLabel} / ${limitLabel} (${percentLabel}).${warning}${trailing}`
      : `You've spent ${amountLabel} / ${limitLabel} (${percentLabel}).${warning}${trailing}`;
  }

  const remainingSentence =
    language === 'vi' ? ` Còn lại ${remainingLabel}.` : ` Remaining ${remainingLabel}.`;

  return language === 'vi'
    ? `Bạn đang dùng ${amountLabel} / ${limitLabel} (${percentLabel}).${remainingSentence}${trailing}`
    : `You've spent ${amountLabel} / ${limitLabel} (${percentLabel}).${remainingSentence}${trailing}`;
}

export function buildBudgetExceededWarning(
  language: AgentLanguage,
  status: BudgetStatusResult,
): string {
  const target = getBudgetTargetLabel(language, status.budget.category?.name ?? null);
  const monthLabel = formatMonthYear(status.budget.month, status.budget.year, language);
  const overspentLabel = formatCurrency(status.overspent, status.budget.currency, language);

  return language === 'vi'
    ? `Bạn đã vượt ${target} ${overspentLabel} trong ${monthLabel}.`
    : `You've exceeded ${target} by ${overspentLabel} in ${monthLabel}.`;
}

export function buildSummaryByCategoryReply(
  language: AgentLanguage,
  params: { rangeLabel: string; amountLabel: string; categoryName: string },
): string {
  const { rangeLabel, amountLabel, categoryName } = params;
  return language === 'vi'
    ? `${rangeLabel} bạn đã chi ${amountLabel} cho ${categoryName}.`
    : `${rangeLabel}, you spent ${amountLabel} on ${categoryName}.`;
}

export function buildSummaryTotalsReply(
  language: AgentLanguage,
  params: { rangeLabel: string; expenseLabel: string; incomeLabel: string; netLabel: string },
): string {
  const { rangeLabel, expenseLabel, incomeLabel, netLabel } = params;
  return language === 'vi'
    ? `${rangeLabel} bạn đã chi ${expenseLabel} và thu ${incomeLabel} (chênh lệch ${netLabel}).`
    : `${rangeLabel}, you spent ${expenseLabel} and earned ${incomeLabel} (net ${netLabel}).`;
}

export function buildNoTransactionsReply(language: AgentLanguage): string {
  return language === 'vi'
    ? 'Chưa có giao dịch nào trong khoảng thời gian đó.'
    : 'No transactions found for that timeframe.';
}

export function buildRecentTransactionsHeader(language: AgentLanguage): string {
  return language === 'vi' ? 'Các giao dịch gần đây:' : 'Recent transactions:';
}

export function buildRecentTransactionLine(params: {
  date: string;
  amount: string;
  category: string;
}): string {
  const { date, amount, category } = params;
  return `- ${date}: ${amount} (${category})`;
}

export function buildSmallTalkReply(language: AgentLanguage, name: string): string {
  return language === 'vi'
    ? `Chào ${name}! Mình ở đây để giúp bạn quản lý chi tiêu, cứ hỏi nhé.`
    : `Hi ${name}! I'm here to help you manage your spending, just let me know what you need.`;
}

export function getCategoryLabel(language: AgentLanguage, categoryName?: string | null): string {
  if (categoryName) {
    return categoryName;
  }
  return language === 'vi' ? 'tất cả danh mục' : 'all categories';
}

export function getBudgetTargetLabel(
  language: AgentLanguage,
  categoryName?: string | null,
): string {
  if (categoryName) {
    return language === 'vi' ? `ngân sách cho ${categoryName}` : `the ${categoryName} budget`;
  }
  return language === 'vi' ? 'ngân sách này' : 'this budget';
}

export function getOtherCategoryLabel(language: AgentLanguage): string {
  return language === 'vi' ? 'Khác' : 'Other';
}

export function buildBudgetNearLimitWarning(
  language: AgentLanguage,
  status: BudgetStatusResult,
): string {
  const target = getBudgetTargetLabel(language, status.budget.category?.name ?? null);
  const monthLabel = formatMonthYear(status.budget.month, status.budget.year, language);
  const amountLabel = formatCurrency(status.spent, status.budget.currency, language);
  const limitLabel = formatCurrency(status.budget.limitAmount, status.budget.currency, language);
  const percentLabel = `${status.percentage}%`;
  const remainingLabel = formatCurrency(status.remaining, status.budget.currency, language);

  return language === 'vi'
    ? `Bạn đã dùng ${amountLabel} / ${limitLabel} (${percentLabel}) cho ${target} trong ${monthLabel}. Còn lại ${remainingLabel}. Hãy cân nhắc chi tiêu để không vượt ngân sách nhé.`
    : `You've spent ${amountLabel} / ${limitLabel} (${percentLabel}) on ${target} in ${monthLabel}. Remaining ${remainingLabel}. Please consider your spending to stay within budget.`;
}

export function buildBudgetAlmostExceededWarning(
  language: AgentLanguage,
  status: BudgetStatusResult,
): string {
  const target = getBudgetTargetLabel(language, status.budget.category?.name ?? null);
  const monthLabel = formatMonthYear(status.budget.month, status.budget.year, language);
  const amountLabel = formatCurrency(status.spent, status.budget.currency, language);
  const limitLabel = formatCurrency(status.budget.limitAmount, status.budget.currency, language);
  const percentLabel = `${status.percentage}%`;
  const remainingLabel = formatCurrency(status.remaining, status.budget.currency, language);

  return language === 'vi'
    ? `Bạn đã dùng ${amountLabel} / ${limitLabel} (${percentLabel}) cho ${target} trong ${monthLabel}. Còn lại ${remainingLabel}. Gần hết ngân sách rồi!`
    : `You've spent ${amountLabel} / ${limitLabel} (${percentLabel}) on ${target} in ${monthLabel}. Remaining ${remainingLabel}. Almost out of budget!`;
}

export function buildBudgetWarningByThreshold(
  language: AgentLanguage,
  status: BudgetStatusResult,
): string | null {
  if (status.overBudget) {
    return buildBudgetExceededWarning(language, status);
  }

  if (status.percentage >= 90) {
    return buildBudgetAlmostExceededWarning(language, status);
  }

  if (status.percentage >= 80) {
    return buildBudgetNearLimitWarning(language, status);
  }

  return null;
}
