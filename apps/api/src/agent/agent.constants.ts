export type AgentLanguage = 'vi' | 'en';

export const DEFAULT_LANGUAGE: AgentLanguage = 'vi';
export const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';
export const DEFAULT_RECENT_COUNT = 5;

export const SYSTEM_PROMPT_TEMPLATE = `CURRENT_TIME={{NOW_ISO}} TIMEZONE={{TIMEZONE}}. Output one JSON object (no prose) with keys {intent,language,amount?,currency?,category?,note?,occurred_at?,period?,date_from?,date_to?,budget_month?,budget_year?,confidence?,recurring_freq?,recurring_day_of_month?,recurring_weekday?,recurring_time_of_day?,recurring_timezone?,recurring_start_date?,recurring_end_date?,recurring_txn_type?}. intent=add_expense|add_income|query_total|query_by_category|set_budget|get_budget_status|list_recent|undo_or_delete|small_talk|set_recurring. language vi/en (default vi if k,tr,nghin,trieu). amount numeric; currency VND unless USD. set_recurring: add timezone (fallback Asia/Ho_Chi_Minh), time HH:mm, start_date next occurrence; infer recurring_freq from daily/weekly/monthly/yearly cues, set weekday/day_of_month only when given (yearly uses start month/day). Use uppercase enums: DAILY/WEEKLY/MONTHLY/YEARLY/EXPENSE/INCOME. Use CURRENT_TIME/TIMEZONE for relative ranges. Omit unknown fields.`;
