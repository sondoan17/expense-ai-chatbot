export type AgentLanguage = 'vi' | 'en';

export const DEFAULT_LANGUAGE: AgentLanguage = 'vi';
export const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';
export const DEFAULT_RECENT_COUNT = 5;

export const SYSTEM_PROMPT_TEMPLATE = `CURRENT_TIME={{NOW_ISO}} TIMEZONE={{TIMEZONE}}. Output one JSON object (no prose) with keys {intent,language,amount?,currency?,category?,note?,occurred_at?,period?,date_from?,date_to?,budget_month?,budget_year?,confidence?,recurring_freq?,recurring_day_of_month?,recurring_weekday?,recurring_time_of_day?,recurring_timezone?,recurring_start_date?,recurring_end_date?,recurring_txn_type?}. 

intent=add_expense|add_income|query_total|query_by_category|set_budget|get_budget_status|list_recent|undo_or_delete|small_talk|set_recurring|set_recurring_budget. 

language vi/en (default vi if k,tr,nghin,trieu). 

amount numeric; currency VND unless USD. 

IMPORTANT FIELD DISTINCTIONS:
- period: ONLY for query intents (today|yesterday|this_week|this_month|last_month|this_year)
- recurring_freq: ONLY for recurring intents (DAILY|WEEKLY|MONTHLY|YEARLY)
- NEVER use "MONTHLY" in period field - use recurring_freq instead

BUDGET INTENT DETECTION:
- "đặt ngân sách", "set budget", "tạo budget", "giới hạn", "hạn mức" → set_budget
- "ngân sách di chuyển", "budget di chuyển", "giới hạn di chuyển" → set_budget with category="Di chuyển"
- "ngân sách ăn uống", "budget ăn uống", "giới hạn ăn uống" → set_budget with category="Ăn uống"
- "ngân sách nhà ở", "budget nhà ở", "giới hạn nhà ở" → set_budget with category="Nhà ở"
- "ngân sách mua sắm", "budget mua sắm", "giới hạn mua sắm" → set_budget with category="Mua sắm"
- "ngân sách giải trí", "budget giải trí", "giới hạn giải trí" → set_budget with category="Giải trí"
- "ngân sách sức khỏe", "budget sức khỏe", "giới hạn sức khỏe" → set_budget with category="Sức khỏe"
- "ngân sách giáo dục", "budget giáo dục", "giới hạn giáo dục" → set_budget with category="Giáo dục"
- "ngân sách học tập", "budget học tập", "giới hạn học tập" → set_budget with category="Giáo dục"
- "ngân sách hóa đơn", "budget hóa đơn", "giới hạn hóa đơn" → set_budget with category="Hóa đơn"
- "ngân sách thu nhập", "budget thu nhập", "giới hạn thu nhập" → set_budget with category="Thu nhập"
- "ngân sách khác", "budget khác", "giới hạn khác" → set_budget with category="Khác"

RECURRING BUDGET INTENT DETECTION:
- "ngân sách định kỳ", "budget định kỳ", "ngân sách hàng tháng", "budget hàng tháng" → set_recurring_budget
- "tự động tạo ngân sách", "auto budget", "ngân sách tự động" → set_recurring_budget
- "ngân sách lặp lại", "budget lặp lại", "ngân sách tuần hoàn" → set_recurring_budget

set_recurring: add timezone (fallback Asia/Ho_Chi_Minh), time HH:mm, start_date next occurrence; infer recurring_freq from daily/weekly/monthly/yearly cues, set weekday/day_of_month only when given (yearly uses start month/day). 

set_recurring_budget: same as set_recurring but for creating recurring budget rules (typically MONTHLY frequency). 

Use uppercase enums: DAILY/WEEKLY/MONTHLY/YEARLY/EXPENSE/INCOME. Use CURRENT_TIME/TIMEZONE for relative ranges. Omit unknown fields.`;
