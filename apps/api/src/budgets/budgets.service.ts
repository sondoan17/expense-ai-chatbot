import { DateTime } from "luxon";
import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Currency, Prisma, TxnType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UpsertBudgetDto } from "./dto/upsert-budget.dto";

const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";

type BudgetWithCategory = Prisma.BudgetGetPayload<{
  include: { category: true };
}>;

@Injectable()
export class BudgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async upsert(userId: string, dto: UpsertBudgetDto) {
    const limitAmount = new Prisma.Decimal(dto.limitAmount);
    const currency = dto.currency ?? Currency.VND;

    const existing = await this.prisma.budget.findFirst({
      where: {
        userId,
        year: dto.year,
        month: dto.month,
        categoryId: dto.categoryId ?? null,
      },
      include: { category: true },
    });

    if (existing) {
      const updated = await this.prisma.budget.update({
        where: { id: existing.id },
        data: {
          limitAmount,
          currency,
        },
        include: { category: true },
      });

      return this.toResponse(updated);
    }

    const created = await this.prisma.budget.create({
      data: {
        userId,
        year: dto.year,
        month: dto.month,
        limitAmount,
        currency,
        categoryId: dto.categoryId ?? null,
      },
      include: { category: true },
    });

    return this.toResponse(created);
  }

  async list(userId: string) {
    const budgets = await this.prisma.budget.findMany({
      where: { userId },
      include: { category: true },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    return budgets.map((budget) => this.toResponse(budget));
  }

  async status(userId: string, budgetId: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id: budgetId, userId },
      include: { category: true },
    });

    if (!budget) {
      throw new NotFoundException("Budget not found");
    }

    const timezone = this.getTimezone();
    const { start, end } = this.getBudgetRange(budget, timezone);

    const where: Prisma.TransactionWhereInput = {
      userId,
      type: TxnType.EXPENSE,
      occurredAt: {
        ...(start ? { gte: start } : {}),
        ...(end ? { lte: end } : {}),
      },
    };

    if (budget.categoryId) {
      where.categoryId = budget.categoryId;
    }

    const aggregate = await this.prisma.transaction.aggregate({
      where,
      _sum: { amount: true },
    });

    const spent = aggregate._sum.amount?.toNumber() ?? 0;
    const limit = budget.limitAmount.toNumber();
    const remaining = Math.max(limit - spent, 0);
    const percentage = limit === 0 ? 0 : Number(((spent / limit) * 100).toFixed(2));

    return {
      budget: this.toResponse(budget),
      spent,
      remaining,
      percentage,
      range: {
        start: start?.toISOString(),
        end: end?.toISOString(),
      },
    };
  }

  async remove(userId: string, budgetId: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id: budgetId, userId },
    });

    if (!budget) {
      throw new NotFoundException("Budget not found");
    }

    await this.prisma.budget.delete({ where: { id: budget.id } });

    return { success: true };
  }

  private toResponse(budget: BudgetWithCategory) {
    return {
      id: budget.id,
      month: budget.month,
      year: budget.year,
      limitAmount: budget.limitAmount.toNumber(),
      currency: budget.currency,
      category: budget.category
        ? { id: budget.category.id, name: budget.category.name }
        : null,
      createdAt: budget.createdAt.toISOString(),
      updatedAt: budget.updatedAt.toISOString(),
    };
  }

  private getTimezone(): string {
    return this.configService.get<string>("APP_TIMEZONE") ?? DEFAULT_TIMEZONE;
  }

  private getBudgetRange(budget: BudgetWithCategory, timezone: string) {
    const start = DateTime.fromObject(
      { year: budget.year, month: budget.month, day: 1 },
      { zone: timezone },
    ).startOf("month");
    const end = start.endOf("month");

    return {
      start: start.toJSDate(),
      end: end.toJSDate(),
    };
  }
}
