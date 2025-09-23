import { DateTime } from "luxon";
import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, Currency, TxnType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { ListTransactionsQueryDto } from "./dto/list-transactions-query.dto";
import { TransactionSummaryQueryDto } from "./dto/transaction-summary-query.dto";
import { resolveDateRange } from "../common/utils/date-range.util";

const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";

type TransactionWithCategory = Prisma.TransactionGetPayload<{
  include: { category: true };
}>;

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async create(userId: string, dto: CreateTransactionDto) {
    const timezone = this.getTimezone();
    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : this.now(timezone);

    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        type: dto.type,
        amount: new Prisma.Decimal(dto.amount),
        currency: dto.currency ?? Currency.VND,
        note: dto.note,
        occurredAt,
        categoryId: dto.categoryId,
        meta: dto.meta !== undefined ? (dto.meta as Prisma.InputJsonValue) : undefined,
      },
      include: { category: true },
    });

    return this.toResponse(transaction as TransactionWithCategory);
  }

  async list(userId: string, query: ListTransactionsQueryDto) {
    const { type, categoryId, currency, page = 1, pageSize = 20, period, dateFrom, dateTo } =
      query;

    const timezone = this.getTimezone();
    const { start, end } = resolveDateRange({
      period,
      dateFrom,
      dateTo,
      timezone,
    });

    const where: Prisma.TransactionWhereInput = { userId };

    if (type) {
      where.type = type;
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (currency) {
      where.currency = currency;
    }
    if (start || end) {
      where.occurredAt = {
        ...(start ? { gte: start } : {}),
        ...(end ? { lte: end } : {}),
      };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: { occurredAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    const totalPages = Math.max(Math.ceil(total / pageSize), 1);

    return {
      data: items.map((item) => this.toResponse(item)),
      meta: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  async summary(userId: string, query: TransactionSummaryQueryDto) {
    const { type, categoryId, currency, period, dateFrom, dateTo } = query;
    const timezone = this.getTimezone();
    const { start, end } = resolveDateRange({ period, dateFrom, dateTo, timezone });

    const where: Prisma.TransactionWhereInput = { userId };

    if (type) {
      where.type = type;
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (currency) {
      where.currency = currency;
    }
    if (start || end) {
      where.occurredAt = {
        ...(start ? { gte: start } : {}),
        ...(end ? { lte: end } : {}),
      };
    }

    const [totalsByType, totalsByCategory] = await this.prisma.$transaction([
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
    ]);

    const expenseGroup = totalsByType.find((item) => item.type === TxnType.EXPENSE);
    const incomeGroup = totalsByType.find((item) => item.type === TxnType.INCOME);

    const expenseTotal = expenseGroup?._sum?.amount ? expenseGroup._sum.amount.toNumber() : 0;
    const incomeTotal = incomeGroup?._sum?.amount ? incomeGroup._sum.amount.toNumber() : 0;

    const categoryIds = totalsByCategory
      .map((group) => group.categoryId)
      .filter((value): value is string => Boolean(value));

    const categories = categoryIds.length
      ? await this.prisma.category.findMany({
          where: { id: { in: categoryIds } },
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
          categoryName: category?.name ?? "Khác",
          amount: sumAmount,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return {
      totals: {
        expense: expenseTotal,
        income: incomeTotal,
        net: incomeTotal - expenseTotal,
      },
      byCategory,
      range: {
        start: start?.toISOString(),
        end: end?.toISOString(),
      },
    };
  }

  async remove(userId: string, transactionId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, userId },
    });

    if (!transaction) {
      throw new NotFoundException("Transaction not found");
    }

    await this.prisma.transaction.delete({ where: { id: transaction.id } });

    return { success: true };
  }

  private toResponse(transaction: TransactionWithCategory) {
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
      meta: transaction.meta,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
    };
  }

  private getTimezone(): string {
    return this.configService.get<string>("APP_TIMEZONE") ?? DEFAULT_TIMEZONE;
  }

  private now(timezone: string): Date {
    return DateTime.now().setZone(timezone).toJSDate();
  }
}


