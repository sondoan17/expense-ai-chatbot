import { z } from 'zod';

export const transactionSchema = z.object({
  type: z.enum(['EXPENSE', 'INCOME'] as const),
  amount: z.number().positive('Số tiền phải lớn hơn 0'),
  currency: z.enum(['VND', 'USD'] as const).default('VND'),
  note: z.string().max(255, 'Ghi chú không được quá 255 ký tự').optional(),
  occurredAt: z.string().datetime().optional(),
  categoryId: z.string().optional(),
});

export const budgetSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  limitAmount: z.number().positive('Số tiền phải lớn hơn 0'),
  currency: z.enum(['VND', 'USD'] as const).default('VND'),
  categoryId: z.string().optional(),
});

export const recurringSchema = z.object({
  freq: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  weekday: z.number().int().min(0).max(6).optional(),
  timeOfDay: z.string().optional(),
  timezone: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  type: z.enum(['EXPENSE', 'INCOME'] as const),
  amount: z.number().positive('Số tiền phải lớn hơn 0'),
  currency: z.enum(['VND', 'USD'] as const).default('VND'),
  categoryId: z.string().optional(),
  note: z.string().max(255, 'Ghi chú không được quá 255 ký tự').optional(),
});
