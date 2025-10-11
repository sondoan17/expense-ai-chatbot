import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PublicUser } from './types/public-user.type';
import { UserEntity } from './types/user.entity';
import * as bcrypt from 'bcryptjs';

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

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // Lấy user entity để có passwordHash
    const user = await this.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }

    // Xác thực mật khẩu hiện tại
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }

    // Hash mật khẩu mới
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return { message: 'Mật khẩu đã được thay đổi thành công' };
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
