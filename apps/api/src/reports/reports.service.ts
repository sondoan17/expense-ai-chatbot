import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, TxnType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ReportsOverviewQueryDto } from "./dto/reports-overview-query.dto";
import { resolveDateRange } from "../common/utils/date-range.util";

const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";

type TransactionWithCategory = Prisma.TransactionGetPayload<{
  include: { category: true };
}>;

type CategoryMinimal = Prisma.CategoryGetPayload<{
  select: { id: true; name: true };
}>;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async overview(userId: string, query: ReportsOverviewQueryDto) {
    const { period, dateFrom, dateTo, recent = 5, currency } = query;
    const timezone = this.getTimezone();
    const { start, end } = resolveDateRange({ period, dateFrom, dateTo, timezone });

    const where: Prisma.TransactionWhereInput = { userId };
    if (currency) {
      where.currency = currency;
    }
    if (start || end) {
      where.occurredAt = {
        ...(start ? { gte: start } : {}),
        ...(end ? { lte: end } : {}),
      };
    }

    const [totalsByType, totalsByCategory, recentTransactions] = await this.prisma.$transaction([
      this.prisma.transaction.groupBy({
        by: ["type"],
        where,
        orderBy: { type: "asc" },
        _sum: { amount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ["categoryId"],
        where: {
          ...where,
          categoryId: { not: null },
        },
        orderBy: { categoryId: "asc" },
        _sum: { amount: true },
      }),
      this.prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: { occurredAt: "desc" },
        take: recent,
      }),
    ]);

    const expenseGroup = totalsByType.find((item) => item.type === TxnType.EXPENSE);
    const incomeGroup = totalsByType.find((item) => item.type === TxnType.INCOME);

    const expense = expenseGroup?._sum?.amount ? expenseGroup._sum.amount.toNumber() : 0;
    const income = incomeGroup?._sum?.amount ? incomeGroup._sum.amount.toNumber() : 0;

    const categoryIds = totalsByCategory
      .map((group) => group.categoryId)
      .filter((value): value is string => Boolean(value));

    const categories: CategoryMinimal[] = categoryIds.length
      ? await this.prisma.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true },
        })
      : [];

    const categoryMap = new Map(categories.map((item) => [item.id, item]));

    const byCategory = totalsByCategory
      .filter((group) => group.categoryId)
      .map((group) => {
        const sumAmount = group._sum?.amount ? group._sum.amount.toNumber() : 0;
        const category = categoryMap.get(group.categoryId!);
        return {
          categoryId: group.categoryId!,
          categoryName: category?.name ?? "Khac",
          amount: sumAmount,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return {
      totals: {
        expense,
        income,
        net: income - expense,
      },
      byCategory,
      recent: recentTransactions.map((transaction) => this.toTransactionResponse(transaction)),
      range: {
        start: start?.toISOString(),
        end: end?.toISOString(),
      },
    };
  }

  private toTransactionResponse(transaction: TransactionWithCategory) {
    return {
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount.toNumber(),
      currency: transaction.currency,
      note: transaction.note,
      occurredAt: transaction.occurredAt.toISOString(),
      category: transaction.category
        ? { id: transaction.category.id, name: transaction.category.name }
        : null,
      createdAt: transaction.createdAt.toISOString(),
    };
  }

  private getTimezone(): string {
    return this.configService.get<string>("APP_TIMEZONE") ?? DEFAULT_TIMEZONE;
  }
}
