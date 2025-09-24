import { z } from "zod";

export enum TimePeriodEnum {
  Today = "today",
  Yesterday = "yesterday",
  ThisWeek = "this_week",
  ThisMonth = "this_month",
  LastMonth = "last_month",
  ThisYear = "this_year",
}

export const TIME_PERIOD_VALUES = Object.values(TimePeriodEnum);
export type TimePeriod = (typeof TIME_PERIOD_VALUES)[number];

export const CURRENCY_VALUES = ["VND", "USD"] as const;
export type Currency = (typeof CURRENCY_VALUES)[number];

export const TXN_TYPE_VALUES = ["EXPENSE", "INCOME"] as const;
export type TxnType = (typeof TXN_TYPE_VALUES)[number];

export const CANONICAL_CATEGORIES = [
  "Ăn uống",
  "Di chuyển",
  "Nhà ở",
  "Mua sắm",
  "Giải trí",
  "Sức khỏe",
  "Giáo dục",
  "Hóa đơn",
  "Thu nhập",
  "Khác",
] as const;

export const CATEGORY_SYNONYMS: Record<string, (typeof CANONICAL_CATEGORIES)[number]> = {
  "ăn": "Ăn uống",
  "ăn uống": "Ăn uống",
  "ăn sáng": "Ăn uống",
  "ăn trưa": "Ăn uống",
  "ăn tối": "Ăn uống",
  "đồ ăn": "Ăn uống",
  "đi chợ": "Ăn uống",
  "cafe": "Ăn uống",
  "cà phê": "Ăn uống",
  "coffee": "Ăn uống",
  "trà sữa": "Ăn uống",
  "di chuyển": "Di chuyển",
  "đi lại": "Di chuyển",
  "grab": "Di chuyển",
  "taxi": "Di chuyển",
  "xe ôm": "Di chuyển",
  "xăng": "Di chuyển",
  "bus": "Di chuyển",
  "bến xe": "Di chuyển",
  "nhà": "Nhà ở",
  "tiền nhà": "Nhà ở",
  "thuê nhà": "Nhà ở",
  "tiền phòng": "Nhà ở",
  "điện": "Hóa đơn",
  "nước": "Hóa đơn",
  "internet": "Hóa đơn",
  "wifi": "Hóa đơn",
  "hóa đơn": "Hóa đơn",
  "truyền hình": "Hóa đơn",
  "mua sắm": "Mua sắm",
  "shopping": "Mua sắm",
  "quần áo": "Mua sắm",
  "giày dép": "Mua sắm",
  "phụ kiện": "Mua sắm",
  "giải trí": "Giải trí",
  "xem phim": "Giải trí",
  "game": "Giải trí",
  "nhạc": "Giải trí",
  "concert": "Giải trí",
  "net": "Giải trí",
  "chơi net": "Giải trí",
  "quán net": "Giải trí",
  "cyber": "Giải trí",
  "sức khỏe": "Sức khỏe",
  "y tế": "Sức khỏe",
  "bệnh viện": "Sức khỏe",
  "khám": "Sức khỏe",
  "thuốc": "Sức khỏe",
  "giáo dục": "Giáo dục",
  "học phí": "Giáo dục",
  "khóa học": "Giáo dục",
  "sách": "Giáo dục",
  "lớp học": "Giáo dục",
  "thu nhập": "Thu nhập",
  "lương": "Thu nhập",
  "thưởng": "Thu nhập",
  "lãi": "Thu nhập",
  "khác": "Khác",
};

export function normalizeVietnamese(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D");
}

export function normalizeText(input: string): string {
  return normalizeVietnamese(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const CATEGORY_LOOKUP = new Map<string, (typeof CANONICAL_CATEGORIES)[number]>();
const CATEGORY_KEYWORDS: Array<{
  keyword: string;
  canonical: (typeof CANONICAL_CATEGORIES)[number];
}> = [];

function registerCategoryKeyword(
  keyword: string,
  canonical: (typeof CANONICAL_CATEGORIES)[number],
) {
  const normalized = normalizeText(keyword);
  if (!normalized) {
    return;
  }

  CATEGORY_LOOKUP.set(normalized, canonical);
  CATEGORY_KEYWORDS.push({ keyword: normalized, canonical });
}

for (const canonical of CANONICAL_CATEGORIES) {
  registerCategoryKeyword(canonical, canonical);
}

for (const [keyword, canonical] of Object.entries(CATEGORY_SYNONYMS)) {
  registerCategoryKeyword(keyword, canonical);
}

CATEGORY_KEYWORDS.sort((a, b) => b.keyword.length - a.keyword.length);

export function resolveCategoryName(
  value?: string | null,
): (typeof CANONICAL_CATEGORIES)[number] | null {
  if (!value) {
    return null;
  }

  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  const directMatch = CATEGORY_LOOKUP.get(normalized);
  if (directMatch) {
    return directMatch;
  }

  for (const token of normalized.split(" ")) {
    if (!token) {
      continue;
    }

    const tokenMatch = CATEGORY_LOOKUP.get(token);
    if (tokenMatch) {
      return tokenMatch;
    }
  }

  for (const { keyword, canonical } of CATEGORY_KEYWORDS) {
    if (keyword.length < 3) {
      continue;
    }

    if (normalized.includes(keyword)) {
      return canonical;
    }
  }

  return null;
}

export const IntentSchema = z.enum([
  "add_expense",
  "add_income",
  "query_total",
  "query_by_category",
  "set_budget",
  "get_budget_status",
  "list_recent",
  "undo_or_delete",
  "small_talk",
]);

export const AgentPayloadSchema = z.object({
  intent: IntentSchema,
  language: z.enum(["vi", "en"]).default("vi"),
  amount: z.number().optional(),
  currency: z.enum(CURRENCY_VALUES).optional(),
  category: z.string().optional(),
  note: z.string().optional(),
  occurred_at: z.string().datetime().optional(),
  period: z.nativeEnum(TimePeriodEnum).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  budget_month: z.number().int().min(1).max(12).optional(),
  budget_year: z.number().int().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type Intent = z.infer<typeof IntentSchema>;
export type AgentPayload = z.infer<typeof AgentPayloadSchema>;





