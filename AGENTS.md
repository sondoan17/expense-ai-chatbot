# AGENTS.md - Expense AI Chatbot

## Build/Lint/Test Commands

This is a Turborepo monorepo with pnpm. Node >= 20.0.0 required.

```bash
# Install dependencies
pnpm install

# Development (all apps)
pnpm dev

# Build all packages
pnpm build

# Lint all packages
pnpm lint

# Format check / fix
pnpm format
pnpm format:write

# Run tests (all packages)
pnpm test

# Run single app commands
pnpm --filter @expense-ai/api dev     # API only
pnpm --filter @expense-ai/web dev     # Web only
pnpm --filter @expense-ai/api lint    # Lint API
pnpm --filter @expense-ai/web build   # Build web

# Database (Prisma)
pnpm db:generate   # Generate Prisma client
pnpm db:migrate    # Run migrations
pnpm db:seed       # Seed database
```

## Project Structure

```
apps/
  api/     # NestJS backend (CommonJS)
  web/     # React + Vite frontend (ESM)
packages/
  shared/  # Shared types/utils (@expense-ai/shared)
  ui/      # UI components (@expense-ai/ui)
prisma/    # Database schema
```

## Code Style Guidelines

### TypeScript Configuration

- Target: ES2022, strict mode enabled
- API uses CommonJS with decorators (NestJS)
- Web uses ESM modules
- Path aliases: `@expense-ai/shared`, `@expense-ai/ui`

### Formatting (Prettier)

- Single quotes, semicolons required
- Trailing commas: all
- Print width: 100 characters

### Imports

- Group imports: external libs, then internal modules, then relative paths
- Use path aliases for cross-package imports
- Prisma enums imported from `@prisma/client`

```typescript
// Good
import { Injectable } from '@nestjs/common';
import { Currency, TxnType } from '@prisma/client';
import { AgentPayload } from '@expense-ai/shared';
import { PrismaService } from '../../prisma/prisma.service';
```

### Naming Conventions

- Files: kebab-case (`agent.service.ts`, `create-transaction.dto.ts`)
- Classes: PascalCase with suffix (`AgentService`, `CreateTransactionDto`)
- Interfaces/Types: PascalCase (`AgentChatResult`, `PublicUser`)
- Variables/functions: camelCase
- Constants: UPPER_SNAKE_CASE for config, camelCase for runtime
- Enums (Prisma): UPPER_SNAKE_CASE values (`TxnType.EXPENSE`, `Currency.VND`)

### NestJS Backend Patterns

- Use `@Injectable()` for services
- Constructor injection for dependencies
- DTOs with class-validator decorators for validation
- Logger via `new Logger(ClassName.name)`

```typescript
@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}
}
```

### DTO Validation (class-validator)

```typescript
export class CreateTransactionDto {
  @IsEnum(TxnType)
  type!: TxnType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
```

### React Frontend Patterns

- Functional components with hooks
- State: Zustand for global, useState for local
- Data fetching: TanStack Query (useQuery, useMutation)
- Forms: react-hook-form + zod validation
- Styling: Tailwind CSS v4

```typescript
export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const { data, isLoading } = useChatHistory();
  const sendMutation = useSendMessage();

  const handleSend = useCallback(async (text: string) => {
    // ...
  }, [dependencies]);

  return <div>...</div>;
}
```

### Error Handling

- Backend: throw NestJS exceptions (`NotFoundException`, `BadRequestException`)
- Catch errors with try/catch, log with Logger
- Frontend: extractErrorMessage utility, toast notifications

```typescript
// Backend
if (!transaction) {
  throw new NotFoundException('Transaction not found');
}

// Frontend
try {
  await mutation.mutateAsync(data);
} catch (error) {
  const message = extractErrorMessage(error, 'Default error');
  toast.error('Error', message);
}
```

### Zod Schema Validation

```typescript
const PayloadSchema = z.object({
  budgetId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.nativeEnum(Currency),
  language: z.enum(['vi', 'en']).default('vi'),
});
type Payload = z.infer<typeof PayloadSchema>;
```

---

## Mimi Chat Agent

The `AgentService` orchestrates natural language requests for the expense manager. It calls the Hyperbolic LLM to classify each message, validates the payload with zod, executes the matching domain workflow, and sends a templated reply.

### Supported Intents

| Intent              | Purpose                          |
| ------------------- | -------------------------------- |
| `add_expense`       | Record spending transaction      |
| `add_income`        | Record income transaction        |
| `query_total`       | Summarise totals for time window |
| `query_by_category` | Totals filtered by category      |
| `set_budget`        | Set/update monthly budget        |
| `get_budget_status` | Check spending vs budget         |
| `list_recent`       | Show recent transactions         |
| `set_recurring`     | Create/update recurring rule     |
| `small_talk`        | Friendly chit-chat               |

### Normalisation Rules

- **Language**: default `vi` when Vietnamese diacritics/keywords detected
- **Amounts**: `k`/`nghin` = *1000, `tr`/`trieu` = *1_000_000
- **Currency**: `$`/`usd` = USD, otherwise VND
- **Categories**: canonical ASCII names (`An uong`, `Di chuyen`, etc.)
- **Confidence**: if < 0.6, return clarification prompt

### Agent Flow

1. Detect language, persist user message
2. Build system prompt with current time/timezone
3. Call LLM with `response_format: { type: 'json_object' }`
4. Parse response via `parseAgentPayload`
5. Route intent to handler, persist assistant reply
