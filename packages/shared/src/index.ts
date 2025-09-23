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

export const CANONICAL_CATEGORIES = [
  "An uong",
  "Di chuyen",
  "Nha o",
  "Mua sam",
  "Giai tri",
  "Suc khoe",
  "Giao duc",
  "Hoa don",
  "Thu nhap",
  "Khac",
] as const;

export const CATEGORY_SYNONYMS: Record<string, (typeof CANONICAL_CATEGORIES)[number]> = {
  "an": "An uong",
  "an uong": "An uong",
  "an sang": "An uong",
  "an trua": "An uong",
  "an toi": "An uong",
  "do an": "An uong",
  "cafe": "An uong",
  "coffee": "An uong",
  "tra sua": "An uong",
  "grab": "Di chuyen",
  "taxi": "Di chuyen",
  "xe om": "Di chuyen",
  "xang": "Di chuyen",
  "bus": "Di chuyen",
  "ben xe": "Di chuyen",
  "tien nha": "Nha o",
  "thue nha": "Nha o",
  "tien phong": "Nha o",
  "dien": "Hoa don",
  "nuoc": "Hoa don",
  "internet": "Hoa don",
  "hoa don": "Hoa don",
  "mua sam": "Mua sam",
  "shopping": "Mua sam",
  "quan ao": "Mua sam",
  "giay dep": "Mua sam",
  "giai tri": "Giai tri",
  "xem phim": "Giai tri",
  "game": "Giai tri",
  "nhac": "Giai tri",
  "suc khoe": "Suc khoe",
  "benh vien": "Suc khoe",
  "kham": "Suc khoe",
  "thuoc": "Suc khoe",
  "giao duc": "Giao duc",
  "hoc phi": "Giao duc",
  "khoa hoc": "Giao duc",
  "sach": "Giao duc",
  "thu nhap": "Thu nhap",
  "luong": "Thu nhap",
  "thuong": "Thu nhap",
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

for (const canonical of CANONICAL_CATEGORIES) {
  CATEGORY_LOOKUP.set(normalizeText(canonical), canonical);
}

for (const [keyword, canonical] of Object.entries(CATEGORY_SYNONYMS)) {
  CATEGORY_LOOKUP.set(normalizeText(keyword), canonical);
}

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

  return CATEGORY_LOOKUP.get(normalized) ?? null;
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
  currency: z.enum(["VND", "USD"]).optional(),
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
