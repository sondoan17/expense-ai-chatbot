# AGENTS.md - Mimi Chat Agent

## Role

The `AgentService` orchestrates natural language requests for the expense manager. It calls the Hyperbolic LLM to classify each message, validates the payload with zod, executes the matching domain workflow, and sends a templated reply back to the web client.

## Execution flow

1. Trim the incoming message and detect a fallback language (`vi` if Vietnamese keywords or diacritics are present, otherwise `en`).
2. Persist the user message in `ChatMessage` with role `USER`.
3. Build the system prompt with `SYSTEM_PROMPT_TEMPLATE`, injecting `CURRENT_TIME` and `TIMEZONE`.
4. Call Hyperbolic with `response_format: { type: 'json_object' }`, `temperature: 0.1`, and `max_tokens: 350`.
5. Parse the response via `parseAgentPayload`, which strips `<think>` blocks, scans channel tags, and normalises ISO dates, budget months, and recurring fields.
6. If `confidence < 0.6`, return a clarification reply without mutating data.
7. Route the intent to the matching handler, persist assistant reply in `ChatMessage`, and return the structured result to the caller.

## Supported intents

| Intent              | Purpose                                | Key fields expected                                                                                                 | Backend behaviour                                                                                                                                                              |
| ------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `add_expense`       | Record a spending transaction          | `amount`, `currency?`, `category?`, `note?`, `occurred_at?`                                                         | Creates an `EXPENSE` transaction, upserts category if needed, warns when budgets are nearly exceeded.                                                                          |
| `add_income`        | Record an income transaction           | Same as `add_expense`                                                                                               | Creates an `INCOME` transaction.                                                                                                                                               |
| `query_total`       | Summarise totals for a time window     | `period?` or `date_from`/`date_to`, `currency?`                                                                     | Aggregates expense and income totals, returns formatted summary.                                                                                                               |
| `query_by_category` | Totals for a category in a time window | `category`, range fields, `currency?`                                                                               | Aggregates expense totals filtered by category.                                                                                                                                |
| `set_budget`        | Set or update a monthly budget         | `amount`, `budget_month`, `budget_year`, `category?`, `currency?`                                                   | Creates a new budget. When one already exists for the period it responds with a follow-up message plus `Cap nhat` / `Tang them` quick actions instead of mutating immediately. |
| `get_budget_status` | Check spending vs budget               | `category?`, range fields                                                                                           | Computes current spend, remaining amount, and overspend status.                                                                                                                |
| `list_recent`       | Show recent transactions               | `period?`, `category?`, `currency?`                                                                                 | Lists latest entries with dates, formatted amounts, and categories.                                                                                                            |
| `set_recurring`     | Create or update a recurring rule      | `amount`, `currency?`, `category?`, `recurring_freq?`, `recurring_time_of_day?`, `recurring_timezone?`, date fields | Builds or updates a `RecurringRule` and reports schedule + next run date.                                                                                                      |
| `undo_or_delete`    | Request undo/delete                    | optional `note?`                                                                                                    | Currently returns a not-yet-supported reply (no mutation).                                                                                                                     |
| `small_talk`        | Friendly chit-chat                     | none                                                                                                                | Sends a short greeting using the user name or email.                                                                                                                           |

## Payload contract

The LLM must return JSON that conforms to `AgentPayloadSchema`:

```ts
export const AgentPayloadSchema = z.object({
  intent: z.enum([
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
  ]),
  language: z.enum(['vi', 'en']).default('vi'),
  amount: z.number().optional(),
  currency: z.enum(['VND', 'USD']).optional(),
  category: z.string().optional(),
  note: z.string().optional(),
  occurred_at: z.string().datetime().optional(),
  period: z
    .enum(['today', 'yesterday', 'this_week', 'this_month', 'last_month', 'this_year'])
    .optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  budget_month: z.number().int().min(1).max(12).optional(),
  budget_year: z.number().int().optional(),
  confidence: z.number().min(0).max(1).optional(),
  recurring_freq: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
  recurring_day_of_month: z.number().int().min(1).max(31).optional(),
  recurring_weekday: z.number().int().min(0).max(6).optional(),
  recurring_time_of_day: z.string().optional(),
  recurring_timezone: z.string().optional(),
  recurring_start_date: z.string().datetime().optional(),
  recurring_end_date: z.string().datetime().optional(),
  recurring_txn_type: z.enum(['EXPENSE', 'INCOME']).optional(),
});
```

The server normalises ISO timestamps to UTC, coerces numeric strings for month and year, clamps weekday/day-of-month ranges, and converts `recurring_time_of_day` into `HH:mm`.

## System prompt

```
CURRENT_TIME={{NOW_ISO}} TIMEZONE={{TIMEZONE}}.
Output one JSON object (no prose) with keys {intent,language,amount?,currency?,category?,note?,occurred_at?,period?,date_from?,date_to?,budget_month?,budget_year?,confidence?,recurring_freq?,recurring_day_of_month?,recurring_weekday?,recurring_time_of_day?,recurring_timezone?,recurring_start_date?,recurring_end_date?,recurring_txn_type?}.
intent=add_expense|add_income|query_total|query_by_category|set_budget|get_budget_status|list_recent|undo_or_delete|small_talk|set_recurring.
Language vi/en (default vi if Vietnamese words or abbreviations such as k, tr, nghin, trieu appear).
Amounts must be numeric (k -> *1000, tr/trieu -> *1_000_000). Default currency is VND unless USD is explicit.
For set_recurring include timezone (fallback Asia/Ho_Chi_Minh), 24h time string, and start_date as the next occurrence. Infer freq from daily/weekly/monthly/yearly cues. Supply weekday/day_of_month only when present. Use uppercase enums for freq and txn type. Omit unknown fields.
```

## Normalisation rules

- **Language**: default `vi` when diacritics or Vietnamese keywords appear; otherwise `en`.
- **Amounts**: interpret suffixes `k`, `nghin`, `ngan` as *1000 and `tr`, `trieu` as *1_000_000. A bare number without suffix stays unchanged.
- **Currency**: `USD`, `$`, or explicit `usd` selects USD; everything else defaults to VND.
- **Date and time**: relative phrases map to `period`. Explicit dates fill `occurred_at`, `date_from`, or `date_to`. Luxon converts everything into timezone-aware ISO strings.
- **Categories**: canonical names stored in ASCII (`An uong`, `Di chuyen`, `Nha o`, `Mua sam`, `Giai tri`, `Suc khoe`, `Giao duc`, `Hoa don`, `Thu nhap`, `Khac`). `resolveCategoryName` lowercases, strips accents, and matches synonyms such as `bun bo`, `grab`, `tien dien`, `ca phe`.
- **Confidence**: if the model returns `confidence < 0.6`, the service stops and returns a clarification prompt.

## Recurring scheduling

- Frequencies (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`) can be inferred from keywords like `hang ngay`, `hang tuan`, `hang thang`, `hang nam`, or their English equivalents. The service also inspects the original message to infer frequency when the payload omits it.
- `recurring_time_of_day` defaults to `07:00` if missing; the backend normalises values like `7h30`.
- `recurring_weekday` is 0-6 (Sunday-Saturday) and only relevant for weekly rules. If absent, the next run's weekday is used.
- `recurring_day_of_month` applies to monthly rules; the backend uses the start date's day when omitted.
- `recurring_txn_type` defaults to `EXPENSE` unless the model states `INCOME` or the category resolves to `Thu nhap`.
- `RecurringService.createRule` can update an existing rule when the message contains update markers (`cap nhat`, `adjust`, `change`, etc.) and a matching rule already exists.

## Replies

Assistant responses are not generated by the LLM. `agent-response.utils.ts` builds deterministic strings for each intent, formatting amounts with Intl.NumberFormat (`vi-VN` or `en-US`) and including hints such as budget warnings or recent transaction lists.

## Chat history and offline sync

Every message (user and assistant) is stored in `ChatMessage`. The web client hydrates `/agent/history`, merges local pending messages, and keeps an offline queue in IndexedDB via localforage. When connectivity returns, `useOfflineAgentSync` replays queued messages against `/agent/chat`.

## Error handling

- Classification failures return `buildClassificationErrorReply`.
- Handler exceptions surface `buildHandlerErrorReply`.
- Unsupported intents return `buildUnsupportedIntentReply`.
- Undo/delete is acknowledged but not yet implemented (`buildUndoNotSupportedReply`).
