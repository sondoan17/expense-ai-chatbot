import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PublicUser } from './types/public-user.type';
import { UserEntity } from './types/user.entity';

type CreateUserInput = {
  email: string;
  name?: string;
  passwordHash: string;
};

type UpdateUserInput = {
  name?: string;
  avatar?: string;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(input: CreateUserInput): Promise<UserEntity> {
    return this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: input.passwordHash,
      },
    });
  }

  async update(id: string, input: UpdateUserInput): Promise<UserEntity> {
    return this.prisma.user.update({
      where: { id },
      data: {
        name: input.name,
        avatar: input.avatar,
      },
    });
  }

  toPublicUser(user: UserEntity): PublicUser {
    const { passwordHash: _ignored, ...rest } = user;
    void _ignored;
    return rest;
  }

  async resetAccountData(userId: string): Promise<{
    deletedCounts: {
      transactions: number;
      chatMessages: number;
      recurringRules: number;
      budgets: number;
      recurringBudgetRules: number;
      passwordResetTokens: number;
    };
  }> {
    return this.prisma.$transaction(async (tx) => {
      // Xóa RecurringRunLog trước (cascade từ RecurringRule)
      const recurringRunLogs = await tx.recurringRunLog.deleteMany({
        where: {
          recurringRule: {
            userId,
          },
        },
      });
      void recurringRunLogs;

      // Xóa RecurringRule
      const recurringRules = await tx.recurringRule.deleteMany({
        where: { userId },
      });

      // Xóa RecurringBudgetRunLog (cascade từ RecurringBudgetRule)
      const recurringBudgetRunLogs = await tx.recurringBudgetRunLog.deleteMany({
        where: {
          recurringBudgetRule: {
            userId,
          },
        },
      });
      void recurringBudgetRunLogs;

      // Xóa RecurringBudgetRule
      const recurringBudgetRules = await tx.recurringBudgetRule.deleteMany({
        where: { userId },
      });

      // Xóa ChatMessage
      const chatMessages = await tx.chatMessage.deleteMany({
        where: { userId },
      });

      // Xóa Transaction
      const transactions = await tx.transaction.deleteMany({
        where: { userId },
      });

      // Xóa Budget
      const budgets = await tx.budget.deleteMany({
        where: { userId },
      });

      // Xóa PasswordResetToken
      const passwordResetTokens = await tx.passwordResetToken.deleteMany({
        where: { userId },
      });

      return {
        deletedCounts: {
          transactions: transactions.count,
          chatMessages: chatMessages.count,
          recurringRules: recurringRules.count,
          budgets: budgets.count,
          recurringBudgetRules: recurringBudgetRules.count,
          passwordResetTokens: passwordResetTokens.count,
        },
      };
    });
  }
}
