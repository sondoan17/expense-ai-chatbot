import { z } from 'zod';
export var TimePeriodEnum;
(function (TimePeriodEnum) {
  TimePeriodEnum['Today'] = 'today';
  TimePeriodEnum['Yesterday'] = 'yesterday';
  TimePeriodEnum['ThisWeek'] = 'this_week';
  TimePeriodEnum['ThisMonth'] = 'this_month';
  TimePeriodEnum['LastMonth'] = 'last_month';
  TimePeriodEnum['ThisYear'] = 'this_year';
})(TimePeriodEnum || (TimePeriodEnum = {}));
export const TIME_PERIOD_VALUES = Object.values(TimePeriodEnum);
export const CURRENCY_VALUES = ['VND', 'USD'];
export const TXN_TYPE_VALUES = ['EXPENSE', 'INCOME'];
export const RECURRING_FREQ_VALUES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
export const CANONICAL_CATEGORIES = [
  'Ăn uống',
  'Di chuyển',
  'Nhà ở',
  'Mua sắm',
  'Giải trí',
  'Sức khỏe',
  'Giáo dục',
  'Hóa đơn',
  'Thu nhập',
  'Khác',
];
export const CATEGORY_SYNONYMS = {
  ăn: 'Ăn uống',
  'ăn uống': 'Ăn uống',
  'ăn sáng': 'Ăn uống',
  'ăn trưa': 'Ăn uống',
  'ăn tối': 'Ăn uống',
  'đồ ăn': 'Ăn uống',
  'đi chợ': 'Ăn uống',
  cafe: 'Ăn uống',
  'cà phê': 'Ăn uống',
  coffee: 'Ăn uống',
  'trà sữa': 'Ăn uống',
  'di chuyển': 'Di chuyển',
  'đi lại': 'Di chuyển',
  grab: 'Di chuyển',
  taxi: 'Di chuyển',
  'xe ôm': 'Di chuyển',
  xăng: 'Di chuyển',
  bus: 'Di chuyển',
  'bến xe': 'Di chuyển',
  nhà: 'Nhà ở',
  'tiền nhà': 'Nhà ở',
  'thuê nhà': 'Nhà ở',
  'tiền phòng': 'Nhà ở',
  điện: 'Hóa đơn',
  nước: 'Hóa đơn',
  internet: 'Hóa đơn',
  wifi: 'Hóa đơn',
  'hóa đơn': 'Hóa đơn',
  'truyền hình': 'Hóa đơn',
  'mua sắm': 'Mua sắm',
  shopping: 'Mua sắm',
  'quần áo': 'Mua sắm',
  'giày dép': 'Mua sắm',
  'phụ kiện': 'Mua sắm',
  'giải trí': 'Giải trí',
  'xem phim': 'Giải trí',
  game: 'Giải trí',
  nhạc: 'Giải trí',
  concert: 'Giải trí',
  'sức khỏe': 'Sức khỏe',
  'y tế': 'Sức khỏe',
  'bệnh viện': 'Sức khỏe',
  khám: 'Sức khỏe',
  thuốc: 'Sức khỏe',
  'giáo dục': 'Giáo dục',
  'học phí': 'Giáo dục',
  'khóa học': 'Giáo dục',
  sách: 'Giáo dục',
  'lớp học': 'Giáo dục',
  'thu nhập': 'Thu nhập',
  lương: 'Thu nhập',
  thưởng: 'Thu nhập',
  lãi: 'Thu nhập',
  khác: 'Khác',
};
export function normalizeVietnamese(input) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D');
}
export function normalizeText(input) {
  return normalizeVietnamese(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
const CATEGORY_LOOKUP = new Map();
for (const canonical of CANONICAL_CATEGORIES) {
  CATEGORY_LOOKUP.set(normalizeText(canonical), canonical);
}
for (const [keyword, canonical] of Object.entries(CATEGORY_SYNONYMS)) {
  CATEGORY_LOOKUP.set(normalizeText(keyword), canonical);
}
const ENGLISH_FALLBACK_KEYWORDS = new Map([
  ['food', CANONICAL_CATEGORIES[0]],
  ['foods', CANONICAL_CATEGORIES[0]],
  ['meal', CANONICAL_CATEGORIES[0]],
  ['meals', CANONICAL_CATEGORIES[0]],
  ['dining', CANONICAL_CATEGORIES[0]],
  ['restaurant', CANONICAL_CATEGORIES[0]],
  ['restaurants', CANONICAL_CATEGORIES[0]],
  ['breakfast', CANONICAL_CATEGORIES[0]],
  ['lunch', CANONICAL_CATEGORIES[0]],
  ['dinner', CANONICAL_CATEGORIES[0]],
  ['grocery', CANONICAL_CATEGORIES[0]],
  ['groceries', CANONICAL_CATEGORIES[0]],
  ['snack', CANONICAL_CATEGORIES[0]],
  ['transport', CANONICAL_CATEGORIES[1]],
  ['transportation', CANONICAL_CATEGORIES[1]],
  ['commute', CANONICAL_CATEGORIES[1]],
  ['rent', CANONICAL_CATEGORIES[2]],
  ['mortgage', CANONICAL_CATEGORIES[2]],
  ['housing', CANONICAL_CATEGORIES[2]],
  ['utility', CANONICAL_CATEGORIES[7]],
  ['utilities', CANONICAL_CATEGORIES[7]],
  ['electricity', CANONICAL_CATEGORIES[7]],
  ['water', CANONICAL_CATEGORIES[7]],
  ['internet', CANONICAL_CATEGORIES[7]],
  ['phone', CANONICAL_CATEGORIES[7]],
  ['medical', CANONICAL_CATEGORIES[5]],
  ['health', CANONICAL_CATEGORIES[5]],
  ['doctor', CANONICAL_CATEGORIES[5]],
  ['hospital', CANONICAL_CATEGORIES[5]],
  ['insurance', CANONICAL_CATEGORIES[5]],
  ['tuition', CANONICAL_CATEGORIES[6]],
  ['education', CANONICAL_CATEGORIES[6]],
  ['course', CANONICAL_CATEGORIES[6]],
  ['school', CANONICAL_CATEGORIES[6]],
  ['shopping', CANONICAL_CATEGORIES[3]],
  ['entertainment', CANONICAL_CATEGORIES[4]],
  ['income', CANONICAL_CATEGORIES[8]],
  ['salary', CANONICAL_CATEGORIES[8]],
  ['bonus', CANONICAL_CATEGORIES[8]],
]);
export function resolveCategoryName(value) {
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
  const tokens = normalized.split(' ').filter((token) => token.length > 0);
  if (!tokens.length) {
    return null;
  }
  const maxWindow = Math.min(tokens.length, 4);
  for (let window = maxWindow; window >= 1; window -= 1) {
    for (let start = 0; start <= tokens.length - window; start += 1) {
      const slice = tokens.slice(start, start + window).join(' ');
      const match = CATEGORY_LOOKUP.get(slice);
      if (match) {
        return match;
      }
    }
  }
  for (const token of tokens) {
    const fallback = ENGLISH_FALLBACK_KEYWORDS.get(token);
    if (fallback) {
      return fallback;
    }
  }
  return null;
}
export const IntentSchema = z.enum([
  'add_expense',
  'add_income',
  'query_total',
  'query_by_category',
  'set_budget',
  'get_budget_status',
  'list_recent',
  'undo_or_delete',
  'small_talk',
  'set_recurring',
  'set_recurring_budget',
  'change_personality',
]);
export const AgentPayloadSchema = z.object({
  intent: IntentSchema,
  language: z.enum(['vi', 'en']).default('vi'),
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
  recurring_freq: z.enum(RECURRING_FREQ_VALUES).optional(),
  recurring_day_of_month: z.number().int().min(1).max(31).optional(),
  recurring_weekday: z.number().int().min(0).max(6).optional(),
  recurring_time_of_day: z.string().optional(),
  recurring_timezone: z.string().optional(),
  recurring_start_date: z.string().datetime().optional(),
  recurring_end_date: z.string().datetime().optional(),
  recurring_txn_type: z.enum(TXN_TYPE_VALUES).optional(),
  personality: z
    .enum(['FRIENDLY', 'PROFESSIONAL', 'CASUAL', 'HUMOROUS', 'INSULTING', 'ENTHUSIASTIC'])
    .optional(),
});
