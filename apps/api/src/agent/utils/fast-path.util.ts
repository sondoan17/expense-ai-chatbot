import { AgentPayload, normalizeText, resolveCategoryName } from '@expense-ai/shared';
import { DateTime } from 'luxon';
import { AgentLanguage } from '../agent.constants';

interface FastPathOptions {
  timezone: string;
  now: Date;
  language: AgentLanguage;
}

interface AmountDetectionResult {
  amount: number;
  currency: 'VND' | 'USD';
}

const QUESTION_KEYWORDS = [
  'bao nhieu',
  'bao nhieu tien',
  'tong chi',
  'tong thu',
  'tong cong',
  'bao cao',
  'thong ke',
  'ngan sach',
  'han muc',
  'report',
  'status',
  'liet ke',
  'danh sach',
  'list',
  'summary',
  'tom tat',
  'con lai',
  'bao nhieu con lai',
  'ngay mai',
  'tomorrow',
  'plan',
  'ke hoach',
];

const INCOME_KEYWORDS = [
  'thu nhap',
  'luong',
  'salary',
  'bonus',
  'thuong',
  'nhan duoc',
  'duoc chuyen',
  'duoc tang',
  'income',
  'received',
  'refund',
  'hoan tien',
];

const USD_MESSAGE_KEYWORDS = ['usd', 'dollar', 'dollars', 'buck', 'bucks', 'do la', 'do my'];

const THOUSAND_TOKENS = ['k', 'nghin', 'ngan'];
const MILLION_TOKENS = ['tr', 'trieu'];
const VND_TOKENS = ['vnd', 'dong', 'dongs'];
const USD_TOKENS = ['usd', 'dollar', 'dollars', 'buck', 'bucks', 'us'];

const CATEGORY_CACHE_LIMIT = 500;
const categoryCache = new Map<string, string | null>();

export function detectFastPathPayload(
  message: string,
  options: FastPathOptions,
): AgentPayload | null {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = normalizeText(trimmed);
  if (!normalized) {
    return null;
  }

  if (shouldSkipFastPath(trimmed, normalized)) {
    return null;
  }

  const amountInfo = extractAmountAndCurrency(trimmed, normalized);
  if (!amountInfo) {
    return null;
  }

  const occurredAtIso = detectOccurredAt(trimmed, normalized, options.now, options.timezone);
  const isIncome = detectIncomeIntent(normalized);
  const category = detectCategory(normalized, isIncome);

  const payload: AgentPayload = {
    intent: isIncome ? 'add_income' : 'add_expense',
    language: options.language,
    amount: roundToTwoDecimals(amountInfo.amount),
    currency: amountInfo.currency,
    occurred_at: occurredAtIso,
    confidence: 0.95,
  };

  if (category) {
    payload.category = category;
  }

  return payload;
}

function shouldSkipFastPath(original: string, normalized: string): boolean {
  if (original.includes('?')) {
    return true;
  }

  return QUESTION_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function detectIncomeIntent(normalized: string): boolean {
  return INCOME_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function detectCategory(normalized: string, isIncome: boolean): string | null {
  if (!normalized) {
    return isIncome ? 'Thu nhập' : null;
  }

  if (categoryCache.has(normalized)) {
    return categoryCache.get(normalized) ?? null;
  }

  const tokens = normalized.split(' ').filter(Boolean);
  for (let size = Math.min(3, tokens.length); size >= 1; size -= 1) {
    for (let index = 0; index <= tokens.length - size; index += 1) {
      const phrase = tokens.slice(index, index + size).join(' ');
      const resolved = resolveCategoryName(phrase);
      if (resolved) {
        setCategoryCache(normalized, resolved);
        return resolved;
      }
    }
  }

  if (isIncome) {
    setCategoryCache(normalized, 'Thu nhập');
    return 'Thu nhập';
  }

  setCategoryCache(normalized, null);
  return null;
}

function setCategoryCache(key: string, value: string | null): void {
  if (categoryCache.size >= CATEGORY_CACHE_LIMIT) {
    const oldestKey = categoryCache.keys().next().value;
    if (oldestKey) {
      categoryCache.delete(oldestKey);
    }
  }

  categoryCache.set(key, value ?? null);
}

function extractAmountAndCurrency(
  original: string,
  normalized: string,
): AmountDetectionResult | null {
  const numberRegex = /\d+(?:[.,]\d{3})*(?:[.,]\d+)?/g;
  const lowerOriginal = original.toLowerCase();
  let match: RegExpExecArray | null;

  while ((match = numberRegex.exec(original)) !== null) {
    const rawValue = match[0];
    const start = match.index;
    const end = start + rawValue.length;

    const preceding = lowerOriginal.slice(Math.max(0, start - 8), start);
    const following = lowerOriginal.slice(end, Math.min(lowerOriginal.length, end + 8));

    const suffixMatch = following.match(
      /^[\s]*(k|nghìn|nghin|ngàn|ngan|tr|triệu|trieu|usd|us[$]|vnd|vnđ|đô|đ|đồng|dong|dollar|bucks|[$])/i,
    );
    const prefixMatch = preceding.match(
      /(usd|us[$]|vnd|vnđ|đô|đ|đồng|dong|dollar|bucks|[$])[\s]*$/i,
    );

    const suffixToken = suffixMatch?.[1];
    const prefixToken = prefixMatch?.[1];

    let multiplier = 1;
    let currency: 'VND' | 'USD' = 'VND';
    let hasMarker = false;

    const applyToken = (token?: string) => {
      if (!token) {
        return;
      }

      const rawToken = token.trim();

      if (rawToken === '$') {
        currency = 'USD';
        hasMarker = true;
        return;
      }

      if (rawToken === 'đ' || rawToken === '₫') {
        currency = 'VND';
        hasMarker = true;
        return;
      }

      if (rawToken === 'đô') {
        currency = 'USD';
        hasMarker = true;
        return;
      }

      const normalizedToken = normalizeText(token).replace(/\s+/g, '');
      if (!normalizedToken) {
        return;
      }

      if (USD_TOKENS.includes(normalizedToken) || USD_TOKENS.includes(rawToken)) {
        currency = 'USD';
        hasMarker = true;
        return;
      }

      if (VND_TOKENS.includes(normalizedToken) || VND_TOKENS.includes(rawToken)) {
        currency = 'VND';
        hasMarker = true;
        return;
      }

      if (THOUSAND_TOKENS.includes(normalizedToken)) {
        multiplier = 1_000;
        currency = 'VND';
        hasMarker = true;
        return;
      }

      if (MILLION_TOKENS.includes(normalizedToken)) {
        multiplier = 1_000_000;
        currency = 'VND';
        hasMarker = true;
      }
    };

    applyToken(suffixToken);
    applyToken(prefixToken);

    if (!hasMarker) {
      const containsVndWord =
        normalized.includes('vnd') ||
        normalized.includes('dong') ||
        lowerOriginal.includes('vnđ') ||
        lowerOriginal.includes('đồng') ||
        lowerOriginal.includes('dong') ||
        original.includes('₫');
      if (containsVndWord) {
        hasMarker = true;
      }
    }

    if (!hasMarker && USD_MESSAGE_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
      currency = 'USD';
      hasMarker = true;
    }

    const digitsOnly = rawValue.replace(/\D/g, '');
    if (!hasMarker && digitsOnly.length < 4) {
      continue;
    }

    const parsed = parseNumericString(rawValue);
    if (parsed === null || parsed <= 0) {
      continue;
    }

    const amount = parsed * multiplier;
    if (amount <= 0) {
      continue;
    }

    return { amount, currency };
  }

  return null;
}

function parseNumericString(raw: string): number | null {
  const cleaned = raw
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(/,(?=\d{3}(\D|$))/g, '')
    .replace(/,/g, '.');

  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function detectOccurredAt(
  original: string,
  normalized: string,
  now: Date,
  timezone: string,
): string {
  const reference = DateTime.fromJSDate(now).setZone(timezone);
  const explicit = parseExplicitDate(original, timezone, reference);

  if (explicit) {
    return toIsoString(explicit);
  }

  if (normalized.includes('hom kia')) {
    return toIsoString(reference.minus({ days: 2 }));
  }

  if (
    normalized.includes('hom qua') ||
    normalized.includes('toi qua') ||
    normalized.includes('chieu qua') ||
    normalized.includes('sang qua') ||
    normalized.includes('yesterday')
  ) {
    return toIsoString(reference.minus({ days: 1 }));
  }

  if (normalized.includes('tuan truoc') || normalized.includes('last week')) {
    return toIsoString(reference.minus({ weeks: 1 }));
  }

  if (normalized.includes('thang truoc') || normalized.includes('last month')) {
    return toIsoString(reference.minus({ months: 1 }));
  }

  return toIsoString(reference);
}

function parseExplicitDate(
  original: string,
  timezone: string,
  reference: DateTime,
): DateTime | null {
  const isoMatch = original.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const dt = DateTime.fromObject({ year, month, day }, { zone: timezone });
    return dt.isValid ? dt : null;
  }

  const shortMatch = original.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
  if (shortMatch) {
    const day = Number(shortMatch[1]);
    const month = Number(shortMatch[2]);
    let year = shortMatch[3] ? Number(shortMatch[3]) : reference.year;

    if (year < 100) {
      year += year >= 70 ? 1900 : 2000;
    }

    let candidate = DateTime.fromObject({ day, month, year }, { zone: timezone });
    if (!candidate.isValid) {
      return null;
    }

    if (!shortMatch[3] && candidate > reference.plus({ days: 1 })) {
      candidate = candidate.minus({ years: 1 });
    }

    return candidate;
  }

  return null;
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function toIsoString(date: DateTime): string {
  const iso = date.toUTC().toISO();
  return iso ?? date.toUTC().toString();
}
