# agent.md — AI Expense Chatbot (React + NestJS + Prisma + Hyperbolic)

> **Goal**: Build a production‑ready side project that impresses recruiters: a chatbot‑driven personal expense manager where users type tự nhiên (tiếng Việt/English) như “Trưa nay 50k bún bò” và hệ thống tự nhận diện, lưu giao dịch, báo cáo và cảnh báo ngân sách.

---

## 1) Architecture Overview

**Stack**

- **Frontend**: React (Vite hoặc Next.js) — PWA ready, chat UI, charts.
- **Backend**: Node.js **NestJS** — REST API, business logic, agent orchestration.
- **DB**: PostgreSQL + **Prisma** ORM — migrations, type‑safe queries.
- **AI**: **Hyperbolic** (OpenAI‑compatible) via `https://api.hyperbolic.xyz/v1/chat/completions`.

**High‑level flow**

1. User nhập tin nhắn → Web gửi `POST /api/agent/chat`.
2. NestJS gọi Hyperbolic LLM → nhận **structured intent** + fields (amount, category, date...).
3. Backend **validate & execute** (tạo transaction / truy vấn tổng chi / ngân sách...).
4. Trả về **natural reply** + dữ liệu (summary, charts), cập nhật UI.

**Repo layout (monorepo gợi ý)**

```
/ (root)
 ├─ apps/
 │   ├─ web/                # React app (Vite/Next)
 │   └─ api/                # NestJS app
 ├─ packages/
 │   ├─ shared/             # shared types, schemas
 │   └─ ui/                 # optional shared UI lib
 ├─ prisma/                 # schema + migrations (if colocated with api)
 └─ docker/                 # compose, deploy scripts
```

---

## 2) Environment & Secrets

**.env (backend)**

```
# Postgres
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/expense?schema=public"

# Hyperbolic
HYPERBOLIC_API_URL=https://api.hyperbolic.xyz/v1/chat/completions
HYPERBOLIC_API_KEY=sk_... # put your key here (do NOT commit)
HYPERBOLIC_MODEL=Qwen/Qwen3-Next-80B-A3B-Thinking

# App
NODE_ENV=development
PORT=4000
JWT_SECRET=change_me
```

> ⚠️ **Bảo mật**: KHÔNG commit khóa API. Nếu bạn đã lộ bất kỳ token nào trong lịch sử repo/chat, **hãy rotate** ngay.

---

## 3) Data Model (Prisma)

Minimal nhưng đủ show kỹ năng mở rộng.

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Currency {
  VND
  USD
}

enum TxnType {
  EXPENSE
  INCOME
}

model User {
  id            String        @id @default(cuid())
  email         String        @unique
  name          String?
  passwordHash  String
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  transactions  Transaction[]
  budgets       Budget[]
}

model Category {
  id        String        @id @default(cuid())
  name      String        @unique
  icon      String?
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
  txns      Transaction[]
}

model Transaction {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  type       TxnType
  amount     Decimal  @db.Decimal(18,2)
  currency   Currency @default(VND)
  note       String?
  occurredAt DateTime @default(now())
  categoryId String?
  category   Category? @relation(fields: [categoryId], references: [id])
  meta       Json?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model Budget {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  month       Int      // 1..12
  year        Int
  categoryId  String?
  category    Category? @relation(fields: [categoryId], references: [id])
  limitAmount Decimal   @db.Decimal(18,2)
  currency    Currency  @default(VND)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  @@unique([userId, year, month, categoryId])
}
```

Seed categories (ăn uống, di chuyển, nhà ở, mua sắm, giải trí...).

---

## 4) Agent Design

### 4.1 Intents (tối thiểu)

- `add_expense` — ghi chi tiêu
- `add_income` — ghi thu nhập
- `query_total` — tổng chi/thu theo khoảng thời gian
- `query_by_category` — chi theo hạng mục
- `set_budget` — đặt ngân sách cho (tháng, category)
- `get_budget_status` — đã tiêu bao nhiêu / còn lại
- `list_recent` — liệt kê giao dịch gần đây
- `undo_or_delete` — hủy/lùi giao dịch cuối cùng hoặc theo ID
- `small_talk` — giao tiếp xã giao (không ghi DB)

### 4.2 Output Schema (LLM → Backend)

- Yêu cầu LLM **trả JSON thuần** theo schema dưới; backend parse/validate (Zod) rồi thực thi.

```ts
// packages/shared/schemas.ts
import { z } from 'zod';

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
]);

export const AgentPayloadSchema = z.object({
  intent: IntentSchema,
  language: z.enum(['vi', 'en']).default('vi'),
  // Common parsed fields
  amount: z.number().optional(),
  currency: z.enum(['VND', 'USD']).optional(),
  category: z.string().optional(),
  note: z.string().optional(),
  occurred_at: z.string().datetime().optional(),
  // Query filters
  period: z
    .enum(['today', 'yesterday', 'this_week', 'this_month', 'last_month', 'this_year'])
    .optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  // Budget
  budget_month: z.number().int().min(1).max(12).optional(),
  budget_year: z.number().int().optional(),
  // Control
  confidence: z.number().min(0).max(1).optional(),
});

export type AgentPayload = z.infer<typeof AgentPayloadSchema>;
```

### 4.3 System Prompt (LLM)

**Use this as the `system` message for the classifier call (LLM pass #1).**

> Template variables to inject from server before call:
>
> - `{{NOW_ISO}}` — current server time in ISO 8601 with timezone (e.g., `2025-09-20T22:00:00+07:00`).
> - `{{TIMEZONE}}` — IANA timezone (e.g., `Asia/Ho_Chi_Minh`).
>
> The model must output **one JSON object only**, no prose, no code fences.

```
You are an expense management intent parser for a personal finance chatbot. Your job is to convert a single user message into a structured JSON payload that strictly matches this schema and rules.

CURRENT_TIME: {{NOW_ISO}}
TIMEZONE: {{TIMEZONE}}

### Output Contract (JSON only)
Return a single JSON object with these fields. Do not add other fields. Do not wrap with code fences.
{
  "intent": "add_expense | add_income | query_total | query_by_category | set_budget | get_budget_status | list_recent | undo_or_delete | small_talk",
  "language": "vi | en",
  "amount": number?,            // numeric amount in minor currency unit if natural for currency (VND integer) or normal number; do NOT return strings
  "currency": "VND | USD"?,
  "category": string?,          // canonical category name (see mapping rules)
  "note": string?,
  "occurred_at": string?,       // ISO 8601 date-time if a specific time is implied, otherwise omit
  "period": "today | yesterday | this_week | this_month | last_month | this_year"?,
  "date_from": string?,         // ISO 8601 if user provided explicit range
  "date_to": string?,
  "budget_month": number?,      // 1..12
  "budget_year": number?,
  "confidence": number?         // 0..1, reflect extraction certainty
}

### General Rules
1) **Language**: Detect and mirror the user's language. Default to "vi" if Vietnamese markers exist; else "en".
2) **JSON only**: Output one JSON object with the exact keys above. No comments, no trailing commas, no explanations.
3) **Currency & Amount normalization** (Vietnam-centric):
   - Interpret `k`, `nghìn`, `ngàn` as ×1,000; `tr`, `triệu` as ×1,000,000.
   - Examples: `50k` → `50000` VND; `120.5k` → `120500` VND; `1,2 triệu` or `1.2 triệu` → `1200000` VND.
   - `$` or `USD` implies USD. If ambiguous, default to `VND`.
   - Extract a single most-salient amount per message unless the user clearly lists multiple items (then choose the primary item described by the sentence).
4) **Date/Time parsing** (relative to CURRENT_TIME and TIMEZONE):
   - Phrases → period: `hôm nay/today`→`today`, `hôm qua/yesterday`→`yesterday`, `tuần này/this week`→`this_week`, `tháng này/this month`→`this_month`, `tháng trước/last month`→`last_month`, `năm nay/this year`→`this_year`.
   - Specific mentions (e.g., "trưa nay", "20/09", "yesterday 5pm") should set a precise `occurred_at` ISO time if inferrable; otherwise use `period`.
   - If both `period` and explicit dates are present, prefer explicit `date_from/date_to` for queries.
5) **Category mapping** (normalize to canonical Vietnamese names):
   - Canonical set: `Ăn uống`, `Di chuyển`, `Nhà ở`, `Mua sắm`, `Giải trí`, `Sức khỏe`, `Giáo dục`, `Hóa đơn`, `Thu nhập`, `Khác`.
   - Map common synonyms: e.g., `ăn, bữa sáng, cà phê, bún bò`→`Ăn uống`; `grab, taxi, xăng`→`Di chuyển`; `tiền nhà, điện, nước, internet`→`Hóa đơn/ Nhà ở` (choose the more specific if obvious: điện/nước/internet→`Hóa đơn`). If unclear, use `Khác`.
   - Normalize diacritics and casing.
6) **Intent selection**:
   - `add_expense`: user spent money; `add_income`: user received money.
   - `query_total`: asks for total in a time range without specifying category.
   - `query_by_category`: asks for amount within a category and time range.
   - `set_budget`: asks to set a monthly budget (requires `amount`, `budget_month`, `budget_year`, optional `category`).
   - `get_budget_status`: asks how much used/left for budget (may include category/period).
   - `list_recent`: asks to list recent transactions.
   - `undo_or_delete`: asks to undo/remove the last or a specific transaction.
   - If not about finance at all, use `small_talk`.
7) **Confidence**: Provide a confidence score. If ambiguous category/time/amount, choose the most likely and set `confidence ≤ 0.6`.
8) **Omit** fields you cannot infer confidently (except `intent` and `language` which are required).
9) **Never** invent amounts or dates not implied. Never compute totals—backend will do it.

### Vietnamese-specific notes
- Numbers like `15k5` → `15500` VND. `1tr2` → `1200000` VND. `200k tiền xăng` → amount=200000, category=`Di chuyển`.
- If the user writes only text like "cà phê" without amount, do **not** set `amount`.

### Disallowed output
- Any text outside JSON. Any code fences. Any explanations.
```

### 4.4 Few-shot Examples

**VI**

- User: "Trưa nay 50k bún bò"

```json
{
  "intent": "add_expense",
  "language": "vi",
  "amount": 50000,
  "currency": "VND",
  "category": "Ăn uống",
  "note": "bún bò",
  "occurred_at": "{{NOW_ISO}}",
  "confidence": 0.9
}
```

- User: "Ghi 120k đi Grab"

```json
{
  "intent": "add_expense",
  "language": "vi",
  "amount": 120000,
  "currency": "VND",
  "category": "Di chuyển",
  "note": "grab",
  "confidence": 0.85
}
```

- User: "Tiền điện tháng 9 là 1.2 triệu"

```json
{
  "intent": "add_expense",
  "language": "vi",
  "amount": 1200000,
  "currency": "VND",
  "category": "Hóa đơn",
  "note": "tiền điện",
  "period": "this_month",
  "confidence": 0.85
}
```

- User: "Hôm qua mình nhận lương 15 triệu"

```json
{
  "intent": "add_income",
  "language": "vi",
  "amount": 15000000,
  "currency": "VND",
  "category": "Thu nhập",
  "occurred_at": "{{NOW_ISO}}",
  "confidence": 0.9
}
```

- User: "Ăn uống tuần này bao nhiêu?"

```json
{
  "intent": "query_by_category",
  "language": "vi",
  "category": "Ăn uống",
  "period": "this_week",
  "confidence": 0.9
}
```

- User: "Đặt budget ăn uống 2 triệu tháng 10"

```json
{
  "intent": "set_budget",
  "language": "vi",
  "category": "Ăn uống",
  "amount": 2000000,
  "currency": "VND",
  "budget_month": 10,
  "budget_year": 2025,
  "confidence": 0.9
}
```

- User: "Cho xem các giao dịch gần đây"

```json
{ "intent": "list_recent", "language": "vi", "confidence": 0.9 }
```

- User: "Xoá giao dịch cuối cùng"

```json
{ "intent": "undo_or_delete", "language": "vi", "confidence": 0.8 }
```

- User: "Xin chào bạn"

```json
{ "intent": "small_talk", "language": "vi", "confidence": 0.95 }
```

**EN**

- User: "Spent $12 on coffee yesterday"

```json
{
  "intent": "add_expense",
  "language": "en",
  "amount": 12,
  "currency": "USD",
  "category": "Ăn uống",
  "note": "coffee",
  "occurred_at": "{{NOW_ISO}}",
  "confidence": 0.9
}
```

- User: "How much did I spend on transport in August?"

```json
{
  "intent": "query_by_category",
  "language": "en",
  "category": "Di chuyển",
  "date_from": "2025-08-01T00:00:00+07:00",
  "date_to": "2025-09-01T00:00:00+07:00",
  "confidence": 0.85
}
```

### 4.5 Reply Prompt (LLM for natural text)

**Use this as a separate `system` prompt for the response formatter (LLM pass #2), after the backend has executed the intent and produced results.** The backend should provide a `context` JSON with operation and computed numbers, and a `language` field.

```
You are a concise financial assistant. Given a JSON `context` from the backend (already executed, containing computed totals, created transaction, budget status, etc.) and a `language` ("vi" | "en"), generate a short, friendly one- or two-sentence reply. Do not invent numbers. Use locale formatting (vi-VN for VND with thousands separators, en-US for USD). Offer a tiny helpful tip only if space allows.

Rules:
- Keep it under 200 characters when possible.
- If currency is VND, append "VND"; for USD, use "$" prefix if appropriate.
- If `context.op == "add_expense"`, confirm amount, category, and time. If budget exists and is close to limit, warn politely.
- If `context.op == "query_total"` or `"query_by_category"`, state the total and the time range.
- If `context.op == "set_budget"`, confirm the budget set.
- If `context.op == "get_budget_status"`, show used vs remaining.
- If nothing to report, ask a clarifying follow-up (1 short question).

Output: plain text only, no JSON, no code fences.
```

---

## 5) NestJS Implementation Notes

### 5.1 Hyperbolic Client (Service)

```ts
// apps/api/src/integrations/hyperbolic.service.ts
import { Injectable } from '@nestjs/common';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Injectable()
export class HyperbolicService {
  private url = process.env.HYPERBOLIC_API_URL || 'https://api.hyperbolic.xyz/v1/chat/completions';
  private apiKey = process.env.HYPERBOLIC_API_KEY!;
  private model = process.env.HYPERBOLIC_MODEL || 'Qwen/Qwen3-Next-80B-A3B-Thinking';

  async complete(
    messages: ChatMessage[],
    opts?: { max_tokens?: number; temperature?: number; top_p?: number; stream?: boolean },
  ) {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: opts?.max_tokens ?? 512,
        temperature: opts?.temperature ?? 0.3,
        top_p: opts?.top_p ?? 0.9,
        stream: opts?.stream ?? false,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Hyperbolic error ${res.status}: ${text}`);
    }
    const json = await res.json();
    return json.choices?.[0]?.message?.content as string;
  }
}
```

### 5.2 Agent Controller

````ts
// apps/api/src/agent/agent.controller.ts
import { Body, Controller, Post, Req } from '@nestjs/common';
import { z } from 'zod';
import { HyperbolicService } from '../integrations/hyperbolic.service';
import { AgentPayloadSchema, AgentPayload } from '../../../packages/shared/schemas';
import { PrismaService } from '../prisma/prisma.service';

@Controller('agent')
export class AgentController {
  constructor(
    private readonly llm: HyperbolicService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('chat')
  async chat(@Body() body: { message: string }, @Req() req: any) {
    const userId = req.user.id; // assume auth guard

    const system = {
      role: 'system',
      content: `You are an expense assistant... (paste System Prompt from section 4.3)`,
    } as const;

    const raw = await this.llm.complete([system, { role: 'user', content: body.message }]);

    // Enforce JSON only
    const jsonStr = raw.trim().replace(/^```json\n?|```$/g, '');
    const parsed = AgentPayloadSchema.safeParse(JSON.parse(jsonStr));
    if (!parsed.success) {
      return { error: 'PARSE_ERROR', details: parsed.error.issues };
    }
    const p = parsed.data as AgentPayload;

    // Execute intent
    switch (p.intent) {
      case 'add_expense': {
        const category = await this.upsertCategory(p.category);
        const txn = await this.prisma.transaction.create({
          data: {
            userId,
            type: 'EXPENSE',
            amount: new Prisma.Decimal(p.amount ?? 0),
            currency: p.currency ?? 'VND',
            note: p.note ?? null,
            occurredAt: p.occurred_at ? new Date(p.occurred_at) : new Date(),
            categoryId: category?.id,
          },
        });
        return { reply: this.replyAdded(txn, category?.name), op: { created_txn_id: txn.id } };
      }
      case 'query_total': {
        const { where, label } = this.buildWhere(userId, p);
        const result = await this.prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { ...where },
        });
        return {
          reply: `Tổng ${label}: ${Number(result._sum.amount ?? 0).toLocaleString()} ${p.currency ?? 'VND'}`,
        };
      }
      // ... handle other intents
      default:
        return {
          reply:
            'Mình có thể giúp bạn ghi chi tiêu hoặc báo cáo. Bạn thử: "Trưa nay 50k bún bò" nhé.',
        };
    }
  }

  private async upsertCategory(name?: string) {
    if (!name) return null;
    const key = name.trim().toLowerCase();
    return this.prisma.category.upsert({
      create: { name: key },
      update: {},
      where: { name: key },
    });
  }

  private buildWhere(userId: string, p: AgentPayload) {
    const where: any = { userId, type: 'EXPENSE' };
    let label = 'chi tiêu';
    // translate period → date range
    // ... implement mapping for this_month/last_month/today/etc.
    return { where, label };
  }

  private replyAdded(txn: any, category?: string) {
    return `Đã ghi ${Number(txn.amount).toLocaleString()} VND cho ${category ?? 'khác'} lúc ${new Date(txn.occurredAt).toLocaleString('vi-VN')}.`;
  }
}
````

> Ghi chú: Thêm **AuthGuard** (JWT + bcrypt) trước khi dùng `req.user`.

### 5.3 PrismaService (chuẩn NestJS)

```ts
// apps/api/src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

---

## 6) Frontend (React) — Chat + Insights

**Features**

- Chat UI (bubbles) + quick suggestions (chips: “Thêm 50k ăn sáng”, “Báo cáo tháng này”).
- Charts: Donut theo category, Line theo ngày.
- PWA: offline queue (Background Sync) cho `POST /agent/chat` và `POST /transactions`.

**Call API example**

```ts
// apps/web/src/api.ts
export async function talk(message: string) {
  const res = await fetch('/api/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error('API error');
  return res.json();
}
```

**UI note**: Khi `reply` trả về, hiển thị văn bản + nếu có `op.created_txn_id` thì show toast “Saved ✅”.

---

## 7) Prompting & Accuracy

- Dùng **rule‑based** để extract số tiền trước (regex `/(\d+[.,]?\d*)\s*(k|nghìn|ngàn|triệu|đ|vnd)?/i`) → normalize sang VND.
- LLM chỉ cần decide **intent + category + thời gian** → giảm hallucination.
- Mapping category: tạo bảng synonyms (`"ăn", "ăn uống", "bún bò" -> category: ăn uống`).
- Nếu `confidence < 0.6` → Hỏi lại người dùng để confirm trước khi ghi DB.

---

## 8) Testing & Quality

- **Unit**: parse tiền, map thời gian, service tổng hợp số liệu.
- **E2E** (Supertest): `/agent/chat` với chuỗi mẫu → assert DB changed đúng.
- Lint/Format: ESLint + Prettier + Husky pre‑commit.
- Metrics: pino logger, request id, duration; rate‑limit `/agent/chat`.

---

## 9) Deployment

- **Docker Compose (dev)**

```yaml
version: '3.9'
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: expense
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports: ['5432:5432']
    volumes: ['pgdata:/var/lib/postgresql/data']
  api:
    build: ./apps/api
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/expense?schema=public
      HYPERBOLIC_API_KEY: ${HYPERBOLIC_API_KEY}
    ports: ['4000:4000']
    depends_on: [db]
volumes:
  pgdata:
```

- **Prod**: Railway/Render cho API + DB, Vercel/Netlify cho Web. Set env & secrets trên dashboard.

---

## 10) README/Portfolio Checklist

- GIF demo: nhập câu → bot ghi chi tiêu → dashboard cập nhật.
- ERD + kiến trúc (sequence diagram) trong `docs/`.
- Lighthouse PWA score (ảnh chụp).
- Test coverage badge.
- Link deploy live.

---

## 11) Snippets — Hyperbolic (Node fetch)

```ts
// Minimal client (Node)
const url = process.env.HYPERBOLIC_API_URL || 'https://api.hyperbolic.xyz/v1/chat/completions';
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.HYPERBOLIC_API_KEY}`,
  },
  body: JSON.stringify({
    model: process.env.HYPERBOLIC_MODEL || 'Qwen/Qwen3-Next-80B-A3B-Thinking',
    messages: [{ role: 'user', content: 'What can I do in SF?' }],
    max_tokens: 507,
    temperature: 0.7,
    top_p: 0.8,
    stream: false,
  }),
});
const json = await response.json();
const output = json.choices?.[0]?.message?.content;
console.log(output);
```

> Frontend **không** gọi Hyperbolic trực tiếp: luôn đi qua backend để bảo vệ khóa.

---

## 12) Roadmap (để mở rộng nếu còn thời gian)

- OCR hoá đơn (Tesseract/MLKit) → tự trích amount + merchant.
- Telegram Bot / Zalo Mini App proxy đến `/agent/chat`.
- Multi‑currency + tự động tỷ giá.
- Budgets nâng cao: cảnh báo vượt X% / envelope budgeting.
- Export PDF/Excel báo cáo tháng.
- SSO (Google) + WebAuthn.

---

## 13) License & Notes

- License: MIT (tuỳ chọn).
- Tôn trọng quyền riêng tư dữ liệu cá nhân.
- Ghi chú kỹ trong README cách **rotate** API keys và cấu hình `.env.example`.
