# GEMINI.md - API Backend (NestJS)

This document provides context for AI assistants working on the NestJS backend.

## Overview

The API is a NestJS application that provides REST endpoints for the expense chatbot. It handles authentication, transaction management, budgets, recurring rules, and LLM-powered chat agent.

## Directory Structure

```
apps/api/src/
├── main.ts                 # Application bootstrap
├── app.module.ts           # Root module
├── common/                 # Shared decorators, guards
│   ├── decorators/         # Custom decorators (@CurrentUser, etc.)
│   └── guards/             # JWT guard, auth guards
├── integrations/           # External service clients
│   ├── hyperbolic/         # LLM API client
│   └── cloudinary/         # Image upload service
├── prisma/                 # Prisma service wrapper
└── modules/                # Feature modules
    ├── agent/              # Chat agent (LLM integration)
    ├── auth/               # Authentication (JWT)
    ├── budgets/            # Budget management
    ├── health/             # Health check endpoint
    ├── recurring/          # Recurring transactions
    ├── recurring-budgets/  # Recurring budget rules
    ├── reports/            # Dashboard reports
    ├── transactions/       # Expense/income CRUD
    └── users/              # User management
```

## Module Structure

Each feature module follows this pattern:

```
modules/{feature}/
├── {feature}.module.ts      # Module definition
├── {feature}.controller.ts  # REST endpoints
├── {feature}.service.ts     # Business logic
├── dto/                     # Data transfer objects
│   ├── create-{feature}.dto.ts
│   └── update-{feature}.dto.ts
└── {feature}.guard.ts       # (optional) Custom guards
```

## Key Modules

### Agent Module (`modules/agent/`)

- **Purpose**: Orchestrate LLM-powered chat interactions
- **Key files**:
  - `agent.service.ts` - Main orchestration logic
  - `agent-response.utils.ts` - Deterministic reply builder
  - `handlers/` - Intent handlers (add_expense, set_budget, etc.)
- **Flow**: User message → LLM classification → Intent handler → Deterministic reply

### Auth Module (`modules/auth/`)

- **Purpose**: JWT-based authentication
- **Endpoints**: `POST /auth/register`, `POST /auth/login`
- **Strategy**: bcrypt password hashing, JWT Bearer tokens

### Transactions Module (`modules/transactions/`)

- **Purpose**: CRUD operations for expenses/incomes
- **Endpoints**: `GET/POST/PATCH/DELETE /transactions`
- **Features**: Filtering by date range, category, pagination

### Budgets Module (`modules/budgets/`)

- **Purpose**: Monthly budget management
- **Endpoints**: `GET/POST/DELETE /budgets`
- **Features**: Category-specific budgets, spent calculation, overspend alerts

### Recurring Module (`modules/recurring/`)

- **Purpose**: Automated recurring transactions
- **Key service**: `RecurringService.processDueRules()` for cron jobs
- **Frequencies**: DAILY, WEEKLY, MONTHLY, YEARLY

## Code Conventions

### DTOs

```typescript
// Use class-validator decorators
export class CreateTransactionDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(TxnType)
  type: TxnType;

  @IsOptional()
  @IsString()
  note?: string;
}
```

### Services

```typescript
@Injectable()
export class TransactionService {
  constructor(
    private prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  async create(userId: string, dto: CreateTransactionDto) {
    // Business logic here
  }
}
```

### Controllers

```typescript
@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(private readonly service: TransactionService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateTransactionDto) {
    return this.service.create(user.id, dto);
  }
}
```

## Environment Variables

```env
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret
JWT_EXPIRES_IN=7d
PORT=4000
APP_TIMEZONE=Asia/Ho_Chi_Minh
HYPERBOLIC_API_URL=https://api.hyperbolic.xyz/v1/chat/completions
HYPERBOLIC_API_KEY=sk_xxx
HYPERBOLIC_MODEL=Qwen/Qwen3-Next-80B-A3B-Thinking
```

## Common Patterns

### Error Handling

```typescript
throw new NotFoundException('Transaction not found');
throw new BadRequestException('Invalid amount');
throw new UnauthorizedException('Invalid credentials');
```

### Current User

```typescript
@Get('me')
getProfile(@CurrentUser() user: User) {
  return user;
}
```

### Prisma Queries

```typescript
// With relations
const transaction = await this.prisma.transaction.findUnique({
  where: { id },
  include: { category: true },
});

// Aggregations
const total = await this.prisma.transaction.aggregate({
  where: { userId, type: 'EXPENSE' },
  _sum: { amount: true },
});
```

## Testing

```bash
# Run from project root
pnpm test --filter=api
```
