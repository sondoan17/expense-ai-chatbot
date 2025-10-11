import { z } from 'zod';
export declare enum TimePeriodEnum {
    Today = "today",
    Yesterday = "yesterday",
    ThisWeek = "this_week",
    ThisMonth = "this_month",
    LastMonth = "last_month",
    ThisYear = "this_year"
}
export declare const TIME_PERIOD_VALUES: TimePeriodEnum[];
export type TimePeriod = (typeof TIME_PERIOD_VALUES)[number];
export declare const CURRENCY_VALUES: readonly ["VND", "USD"];
export type Currency = (typeof CURRENCY_VALUES)[number];
export declare const TXN_TYPE_VALUES: readonly ["EXPENSE", "INCOME"];
export type TxnType = (typeof TXN_TYPE_VALUES)[number];
export declare const RECURRING_FREQ_VALUES: readonly ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"];
export type RecurringFreq = (typeof RECURRING_FREQ_VALUES)[number];
export declare const CANONICAL_CATEGORIES: readonly ["Ăn uống", "Di chuyển", "Nhà ở", "Mua sắm", "Giải trí", "Sức khỏe", "Giáo dục", "Hóa đơn", "Thu nhập", "Khác"];
export declare const CATEGORY_SYNONYMS: Record<string, (typeof CANONICAL_CATEGORIES)[number]>;
export declare function normalizeVietnamese(input: string): string;
export declare function normalizeText(input: string): string;
export declare function resolveCategoryName(value?: string | null): (typeof CANONICAL_CATEGORIES)[number] | null;
export declare const IntentSchema: z.ZodEnum<{
    add_expense: "add_expense";
    add_income: "add_income";
    query_total: "query_total";
    query_by_category: "query_by_category";
    set_budget: "set_budget";
    get_budget_status: "get_budget_status";
    list_recent: "list_recent";
    undo_or_delete: "undo_or_delete";
    small_talk: "small_talk";
    set_recurring: "set_recurring";
    set_recurring_budget: "set_recurring_budget";
    change_personality: "change_personality";
}>;
export declare const AgentPayloadSchema: z.ZodObject<{
    intent: z.ZodEnum<{
        add_expense: "add_expense";
        add_income: "add_income";
        query_total: "query_total";
        query_by_category: "query_by_category";
        set_budget: "set_budget";
        get_budget_status: "get_budget_status";
        list_recent: "list_recent";
        undo_or_delete: "undo_or_delete";
        small_talk: "small_talk";
        set_recurring: "set_recurring";
        set_recurring_budget: "set_recurring_budget";
        change_personality: "change_personality";
    }>;
    language: z.ZodDefault<z.ZodEnum<{
        vi: "vi";
        en: "en";
    }>>;
    amount: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodOptional<z.ZodEnum<{
        VND: "VND";
        USD: "USD";
    }>>;
    category: z.ZodOptional<z.ZodString>;
    note: z.ZodOptional<z.ZodString>;
    occurred_at: z.ZodOptional<z.ZodString>;
    period: z.ZodOptional<z.ZodEnum<typeof TimePeriodEnum>>;
    date_from: z.ZodOptional<z.ZodString>;
    date_to: z.ZodOptional<z.ZodString>;
    budget_month: z.ZodOptional<z.ZodNumber>;
    budget_year: z.ZodOptional<z.ZodNumber>;
    confidence: z.ZodOptional<z.ZodNumber>;
    recurring_freq: z.ZodOptional<z.ZodEnum<{
        DAILY: "DAILY";
        WEEKLY: "WEEKLY";
        MONTHLY: "MONTHLY";
        YEARLY: "YEARLY";
    }>>;
    recurring_day_of_month: z.ZodOptional<z.ZodNumber>;
    recurring_weekday: z.ZodOptional<z.ZodNumber>;
    recurring_time_of_day: z.ZodOptional<z.ZodString>;
    recurring_timezone: z.ZodOptional<z.ZodString>;
    recurring_start_date: z.ZodOptional<z.ZodString>;
    recurring_end_date: z.ZodOptional<z.ZodString>;
    recurring_txn_type: z.ZodOptional<z.ZodEnum<{
        EXPENSE: "EXPENSE";
        INCOME: "INCOME";
    }>>;
    personality: z.ZodOptional<z.ZodEnum<{
        FRIENDLY: "FRIENDLY";
        PROFESSIONAL: "PROFESSIONAL";
        CASUAL: "CASUAL";
        HUMOROUS: "HUMOROUS";
        INSULTING: "INSULTING";
        ENTHUSIASTIC: "ENTHUSIASTIC";
    }>>;
}, z.core.$strip>;
export type Intent = z.infer<typeof IntentSchema>;
export type AgentPayload = z.infer<typeof AgentPayloadSchema>;
export interface AgentActionOption {
    id: string;
    label: string;
    payload: Record<string, unknown>;
}
