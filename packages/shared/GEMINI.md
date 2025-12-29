# GEMINI.md - Shared Package (@expense-ai/shared)

This document provides context for AI assistants working on the shared package.

## Overview

The shared package contains TypeScript types, Zod schemas, enums, and utility functions used by both the API and web app. It ensures type safety and consistency across the monorepo.

## Directory Structure

```
packages/shared/
├── src/
│   └── index.ts        # All exports (schemas, enums, utilities)
├── dist/               # Compiled output
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

## Exports

### Enums

```typescript
// Transaction type
export enum TxnType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
}

// Currency
export enum Currency {
  VND = 'VND',
  USD = 'USD',
}

// Recurring frequency
export enum RecurringFreq {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

// Chat roles
export enum ChatRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
}

// Message status
export enum ChatMessageStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}
```

### Zod Schemas

```typescript
// LLM response validation
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

export type AgentPayload = z.infer<typeof AgentPayloadSchema>;
```

### Category System

```typescript
// Canonical categories with Vietnamese synonyms
export const CATEGORIES = {
  'An uong': ['an', 'uong', 'com', 'bun', 'pho', 'cafe', 'tra', 'nuoc', 'do an', 'nha hang'],
  'Di chuyen': ['grab', 'taxi', 'xe', 'xang', 'giao thong', 'di lai'],
  'Nha o': ['nha', 'thue', 'dien', 'nuoc', 'internet', 'wifi'],
  'Mua sam': ['mua', 'shopping', 'quan ao', 'giay', 'tui'],
  'Giai tri': ['phim', 'game', 'ca nhac', 'du lich', 'choi'],
  'Suc khoe': ['benh vien', 'thuoc', 'bac si', 'gym', 'the duc'],
  'Giao duc': ['hoc', 'sach', 'khoa hoc', 'truong'],
  'Hoa don': ['hoa don', 'bill', 'phi', 'le phi'],
  'Thu nhap': ['luong', 'tien', 'thu nhap', 'bonus', 'thuong'],
  Khac: ['khac', 'other'],
};

// Resolve user input to canonical category
export function resolveCategoryName(input: string): string | null;
```

### Utility Functions

```typescript
// Normalize text (strip diacritics, lowercase)
export function normalizeText(text: string): string;

// Example usage
normalizeText('Ăn uống'); // => 'an uong'
normalizeText('Cà phê'); // => 'ca phe'

// Resolve category from user input
resolveCategoryName('bún bò'); // => 'An uong'
resolveCategoryName('taxi'); // => 'Di chuyen'
resolveCategoryName('unknown'); // => null
```

## Usage

### In API (NestJS)

```typescript
import { AgentPayloadSchema, resolveCategoryName, TxnType, Currency } from '@expense-ai/shared';

// Validate LLM response
const result = AgentPayloadSchema.safeParse(llmResponse);
if (!result.success) {
  throw new BadRequestException('Invalid LLM response');
}

// Resolve category
const category = resolveCategoryName(userInput) || 'Khac';
```

### In Web (React)

```typescript
import { TxnType, Currency, ChatRole, CATEGORIES } from '@expense-ai/shared';

// Use enums for type safety
const transaction = {
  type: TxnType.EXPENSE,
  currency: Currency.VND,
};

// Display category options
const categoryOptions = Object.keys(CATEGORIES);
```

## Building

```bash
# From project root
pnpm build --filter=@expense-ai/shared

# Or from package directory
cd packages/shared
pnpm build
```

## Adding New Exports

1. Add to `src/index.ts`
2. Run `pnpm build` to compile
3. Import in api/web apps

```typescript
// src/index.ts
export const NEW_CONSTANT = 'value';
export function newUtility() { ... }
export const NewSchema = z.object({ ... });
```
