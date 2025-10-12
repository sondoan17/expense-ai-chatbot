import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { budgetSchema } from '../validation';
import { useCreateBudget } from '../../../hooks/api/useManualEntry';
import { getCategoryOptions } from '../../../utils/categories';
// Import types directly to avoid build issues
type Currency = 'VND' | 'USD';

type BudgetFormData = {
  month: number;
  year: number;
  limitAmount: number;
  currency?: Currency;
  categoryId?: string;
};

export function BudgetForm() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const createBudget = useCreateBudget();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      currency: 'VND',
    },
  });

  const categoryOptions = getCategoryOptions();

  const onSubmit = (data: BudgetFormData) => {
    const submitData = {
      ...data,
      categoryId: selectedCategory || undefined,
    };
    createBudget.mutate(submitData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Month */}
        <div className="space-y-2">
          <label htmlFor="month" className="block text-sm font-medium text-slate-200">
            Tháng
          </label>
          <select
            id="month"
            {...register('month', { valueAsNumber: true })}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Tháng {i + 1}
              </option>
            ))}
          </select>
          {errors.month && <p className="text-red-400 text-sm">{errors.month.message}</p>}
        </div>

        {/* Year */}
        <div className="space-y-2">
          <label htmlFor="year" className="block text-sm font-medium text-slate-200">
            Năm
          </label>
          <select
            id="year"
            {...register('year', { valueAsNumber: true })}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
          >
            {Array.from({ length: 10 }, (_, i) => {
              const year = new Date().getFullYear() - 2 + i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
          {errors.year && <p className="text-red-400 text-sm">{errors.year.message}</p>}
        </div>
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

      {/* Limit Amount */}
      <div className="space-y-2">
        <label htmlFor="limitAmount" className="block text-sm font-medium text-slate-200">
          Số tiền ngân sách
        </label>
        <input
          id="limitAmount"
          type="number"
          step="0.01"
          {...register('limitAmount', { valueAsNumber: true })}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
          placeholder="Nhập số tiền ngân sách"
        />
        {errors.limitAmount && <p className="text-red-400 text-sm">{errors.limitAmount.message}</p>}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <label htmlFor="category" className="block text-sm font-medium text-slate-200">
          Danh mục (tùy chọn)
        </label>
        <select
          id="category"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
        >
          <option value="">Tất cả danh mục</option>
          {categoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-sm text-slate-400">Để trống để tạo ngân sách tổng cho tất cả danh mục</p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={createBudget.isPending}
        className="w-full bg-gradient-to-r from-sky-400 to-cyan-400 text-slate-900 font-semibold py-3 px-4 rounded-lg hover:from-sky-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        {createBudget.isPending ? 'Đang tạo...' : 'Tạo ngân sách'}
      </button>
    </form>
  );
}
