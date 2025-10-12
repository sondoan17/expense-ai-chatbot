import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { transactionSchema } from '../validation';
import { useCreateTransaction } from '../../../hooks/api/useManualEntry';
import { getCategoryOptions } from '../../../utils/categories';
// Import types directly to avoid build issues
type TxnType = 'EXPENSE' | 'INCOME';
type Currency = 'VND' | 'USD';

type TransactionFormData = {
  type: TxnType;
  amount: number;
  currency?: Currency;
  note?: string;
  occurredAt?: string;
  categoryId?: string;
};

export function TransactionForm() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const createTransaction = useCreateTransaction();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'EXPENSE',
      currency: 'VND',
      occurredAt: new Date().toISOString().slice(0, 16),
    },
  });
  const categoryOptions = getCategoryOptions();

  const onSubmit = (data: TransactionFormData) => {
    const submitData = {
      ...data,
      currency: data.currency || 'VND',
      categoryId: selectedCategory || undefined,
    };
    createTransaction.mutate(submitData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Transaction Type */}
        <div className="space-y-2">
          <label htmlFor="type" className="block text-sm font-medium text-slate-200">
            Loại giao dịch
          </label>
          <select
            id="type"
            {...register('type')}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
          >
            <option value="EXPENSE">Chi tiêu</option>
            <option value="INCOME">Thu nhập</option>
          </select>
          {errors.type && <p className="text-red-400 text-sm">{errors.type.message}</p>}
        </div>

        {/* Currency */}
        <div className="space-y-2">
          <label htmlFor="currency" className="block text-sm font-medium text-slate-200">
            Tiền tệ
          </label>
          <select
            id="currency"
            {...register('currency')}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
          >
            <option value="VND">VND</option>
            <option value="USD">USD</option>
          </select>
          {errors.currency && <p className="text-red-400 text-sm">{errors.currency.message}</p>}
        </div>
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <label htmlFor="amount" className="block text-sm font-medium text-slate-200">
          Số tiền
        </label>
        <input
          id="amount"
          type="number"
          step="0.01"
          {...register('amount', { valueAsNumber: true })}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
          placeholder="Nhập số tiền"
        />
        {errors.amount && <p className="text-red-400 text-sm">{errors.amount.message}</p>}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <label htmlFor="category" className="block text-sm font-medium text-slate-200">
          Danh mục
        </label>
        <select
          id="category"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
        >
          <option value="">Chọn danh mục (tùy chọn)</option>
          {categoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Note */}
      <div className="space-y-2">
        <label htmlFor="note" className="block text-sm font-medium text-slate-200">
          Ghi chú
        </label>
        <textarea
          id="note"
          {...register('note')}
          rows={3}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
          placeholder="Thêm ghi chú (tùy chọn)"
        />
        {errors.note && <p className="text-red-400 text-sm">{errors.note.message}</p>}
      </div>

      {/* Occurred At */}
      <div className="space-y-2">
        <label htmlFor="occurredAt" className="block text-sm font-medium text-slate-200">
          Thời gian
        </label>
        <input
          id="occurredAt"
          type="datetime-local"
          {...register('occurredAt')}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
        />
        {errors.occurredAt && <p className="text-red-400 text-sm">{errors.occurredAt.message}</p>}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={createTransaction.isPending}
        className="w-full bg-gradient-to-r from-sky-400 to-cyan-400 text-slate-900 font-semibold py-3 px-4 rounded-lg hover:from-sky-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        {createTransaction.isPending ? 'Đang tạo...' : 'Tạo giao dịch'}
      </button>
    </form>
  );
}
