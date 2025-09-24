import {
  AgentPayload,
  CATEGORY_SYNONYMS,
  TimePeriodEnum,
  normalizeText,
  resolveCategoryName,
} from '@expense-ai/shared';
import { DateTime } from 'luxon';

import { AgentLanguage } from '../agent.constants';

const INCOME_KEYWORDS = [
  'thu nhap',
  'thuong',
  'luong',
  'salary',
  'income',
  'bonus',
  'nhan duoc',
  'nhan',
  'duoc cho',
  'cho tien',
  'tra luong',
  'duoc tra',
];

const EXPENSE_KEYWORDS = [
  'chi',
  'mua',
  'tra',
  'tieu',
  'pay',
  'spent',
  'spend',
  'expense',
  'mua sam',
  'hoa don',
];

const QUERY_KEYWORDS = [
  'tong',
  'bao nhieu',
  'thong ke',
  'liet ke',
  'danh sach',
  'bao cao',
  'tong ket',
  'so du',
  'budget',
  'ngan sach',
  'bao nhieu tien',
  'con lai',
  'status',
  'bao gom',
  'la bao nhieu',
];

const DATE_KEYWORDS: Record<string, TimePeriodEnum> = {
  'hom nay': TimePeriodEnum.Today,
  today: TimePeriodEnum.Today,
  'hom qua': TimePeriodEnum.Yesterday,
  yesterday: TimePeriodEnum.Yesterday,
  'tuan nay': TimePeriodEnum.ThisWeek,
  'this week': TimePeriodEnum.ThisWeek,
  'thang nay': TimePeriodEnum.ThisMonth,
  'this month': TimePeriodEnum.ThisMonth,
  'thang truoc': TimePeriodEnum.LastMonth,
  'last month': TimePeriodEnum.LastMonth,
  'nam nay': TimePeriodEnum.ThisYear,
  'this year': TimePeriodEnum.ThisYear,
};

const USD_MARKERS = ['usd', 'us$', '$', 'đô', 'do la', 'dollar', 'dol'];
const VND_MARKERS = ['vnd', 'đ', 'd', 'dong', '₫', 'vnđ'];

export interface RuleBasedOptions {
  now: Date;
  timezone: string;
  language: AgentLanguage;
}

export function classifyRuleBased(message: string, options: RuleBasedOptions): AgentPayload | null {
  const normalized = normalizeText(message);
  if (!normalized) {
    return null;
  }

  if (message.includes('?')) {
    return null;
  }

  if (QUERY_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return null;
  }

  const amountInfo = extractAmount(message);
  if (!amountInfo) {
    return null;
  }

  const period = detectPeriod(normalized);
  const occurredAt = detectExplicitDate(message, normalized, options);

  const intent = detectIntent(normalized, amountInfo.inferredCurrency);
  const category = detectCategory(message, intent);

  const payload: AgentPayload = {
    intent,
    language: options.language,
    amount: amountInfo.value,
    currency: amountInfo.currency,
    category: category ?? undefined,
    note: message,
    occurred_at: occurredAt,
    period,
    confidence: 0.92,
  };

  return payload;
}

interface AmountMatch {
  value: number;
  currency: 'VND' | 'USD';
  inferredCurrency: 'VND' | 'USD';
}

function extractAmount(message: string): AmountMatch | null {
  const regex = /(?:(usd|us\$|\$|đô|do la|dollar|dol|vnd|vnđ|₫|đ|dong)\s*)?(\d{1,3}(?:[.,]\d{3})*|\d+(?:[.,]\d+)?)(?:\s*(k|nghin|ngan|ngàn|tr|trieu|triệu|ty|tỷ|m|usd|us\$|\$|vnd|vnđ|₫|đ|dong))?/iu;
  const match = regex.exec(message);
  if (!match) {
    return null;
  }

  const [, prefix, rawNumber, unitOrCurrency] = match;
  const unit = unitOrCurrency ? unitOrCurrency.toLowerCase() : undefined;
  const numeric = normalizeNumber(rawNumber);
  if (!numeric || numeric <= 0) {
    return null;
  }

  let multiplier = 1;
  if (unit) {
    if (['k', 'nghin', 'ngan', 'ngàn'].includes(unit)) {
      multiplier = 1_000;
    } else if (['tr', 'trieu', 'triệu', 'm'].includes(unit)) {
      multiplier = 1_000_000;
    } else if (['ty', 'tỷ'].includes(unit)) {
      multiplier = 1_000_000_000;
    }
  }

  const value = numeric * multiplier;
  const inferredCurrency = detectCurrencyFromMarkers(prefix, unit);
  const currency = unit && isCurrencyUnit(unit) ? detectCurrencyFromMarkers(unit) : inferredCurrency;

  return {
    value,
    currency,
    inferredCurrency,
  };
}

function normalizeNumber(input: string): number {
  if (!input) {
    return NaN;
  }

  const cleaned = input.replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(/,(?=\d{3}(?:\D|$))/g, '').replace(/,/g, '.');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function detectCurrencyFromMarkers(...markers: (string | undefined)[]): 'VND' | 'USD' {
  for (const marker of markers) {
    if (!marker) continue;
    const lowered = marker.toLowerCase();
    if (USD_MARKERS.includes(lowered)) {
      return 'USD';
    }
    if (VND_MARKERS.includes(lowered)) {
      return 'VND';
    }
  }
  return 'VND';
}

function isCurrencyUnit(value: string): boolean {
  const lowered = value.toLowerCase();
  return USD_MARKERS.includes(lowered) || VND_MARKERS.includes(lowered);
}

function detectIntent(normalized: string, inferredCurrency: 'VND' | 'USD'): AgentPayload['intent'] {
  if (INCOME_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'add_income';
  }

  if (EXPENSE_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'add_expense';
  }

  if (inferredCurrency === 'USD' || inferredCurrency === 'VND') {
    return 'add_expense';
  }

  return 'add_expense';
}

function detectCategory(message: string, intent: AgentPayload['intent']): string | null {
  if (intent === 'add_income') {
    return 'Thu nhập';
  }

  const normalized = normalizeText(message);
  if (!normalized) {
    return null;
  }

  for (const keyword of Object.keys(CATEGORY_SYNONYMS)) {
    const normalizedKeyword = normalizeText(keyword);
    if (normalizedKeyword && normalized.includes(normalizedKeyword)) {
      return CATEGORY_SYNONYMS[keyword];
    }
  }

  return resolveCategoryName(message);
}

function detectPeriod(normalized: string): TimePeriodEnum | undefined {
  for (const [keyword, period] of Object.entries(DATE_KEYWORDS)) {
    if (normalized.includes(keyword)) {
      return period;
    }
  }
  return undefined;
}

function detectExplicitDate(
  message: string,
  normalized: string,
  options: RuleBasedOptions,
): string | undefined {
  const now = DateTime.fromJSDate(options.now).setZone(options.timezone);

  const isoMatch = message.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const dt = DateTime.fromObject(
      { year: Number(year), month: Number(month), day: Number(day) },
      { zone: options.timezone },
    );
    if (dt.isValid) {
      return dt.toUTC().toISO();
    }
  }

  const slashMatch = message.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    const resolvedYear = year ? normalizeYear(Number(year), now.year) : now.year;
    const dt = DateTime.fromObject(
      { year: resolvedYear, month: Number(month), day: Number(day) },
      { zone: options.timezone },
    );
    if (dt.isValid) {
      return dt.toUTC().toISO();
    }
  }

  const wordMatch = message.match(/ngay\s+(\d{1,2})(?:\s+thang\s+(\d{1,2}))?(?:\s+nam\s+(\d{2,4}))?/i);
  if (wordMatch) {
    const [, day, month, year] = wordMatch;
    const resolvedMonth = month ? Number(month) : now.month;
    const resolvedYear = year ? normalizeYear(Number(year), now.year) : now.year;
    const dt = DateTime.fromObject(
      { year: resolvedYear, month: resolvedMonth, day: Number(day) },
      { zone: options.timezone },
    );
    if (dt.isValid) {
      return dt.toUTC().toISO();
    }
  }

  if (normalized.includes('hom nay') || normalized.includes('today')) {
    return now.toUTC().toISO();
  }

  if (normalized.includes('hom qua') || normalized.includes('yesterday')) {
    return now.minus({ days: 1 }).toUTC().toISO();
  }

  return undefined;
}

function normalizeYear(year: number, currentYear: number): number {
  if (year < 100) {
    const century = Math.floor(currentYear / 100) * 100;
    const candidate = century + year;
    if (candidate <= currentYear + 1) {
      return candidate;
    }
    return candidate - 100;
  }
  return year;
}
