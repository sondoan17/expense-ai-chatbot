import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { recurringSchema } from '../validation';
import { useCreateRecurringRule } from '../../../hooks/api/useManualEntry';
import { getCategoryOptions } from '../../../utils/categories';
// Import types directly to avoid build issues
type TxnType = 'EXPENSE' | 'INCOME';
type Currency = 'VND' | 'USD';
type RecurringFreq = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

type RecurringFormData = {
  freq: RecurringFreq;
  dayOfMonth?: number;
  weekday?: number;
  timeOfDay?: string;
  timezone?: string;
  startDate: string;
  endDate?: string;
  type: TxnType;
  amount: number;
  currency?: Currency;
  categoryId?: string;
  note?: string;
};

const FREQUENCY_OPTIONS = [
  { value: 'DAILY', label: 'Hàng ngày' },
  { value: 'WEEKLY', label: 'Hàng tuần' },
  { value: 'MONTHLY', label: 'Hàng tháng' },
  { value: 'YEARLY', label: 'Hàng năm' },
] as const;

const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Chủ nhật' },
  { value: 1, label: 'Thứ hai' },
  { value: 2, label: 'Thứ ba' },
  { value: 3, label: 'Thứ tư' },
  { value: 4, label: 'Thứ năm' },
  { value: 5, label: 'Thứ sáu' },
  { value: 6, label: 'Thứ bảy' },
] as const;

export function RecurringForm() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const createRecurringRule = useCreateRecurringRule();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RecurringFormData>({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      freq: 'MONTHLY',
      type: 'EXPENSE',
      currency: 'VND',
      timezone: 'Asia/Ho_Chi_Minh',
      timeOfDay: '07:00',
      startDate: new Date().toISOString().slice(0, 16),
    },
  });

  const frequency = watch('freq');
  const categoryOptions = getCategoryOptions();

  const onSubmit = (data: RecurringFormData) => {
    const submitData = {
      ...data,
      categoryId: selectedCategory || undefined,
    };
    createRecurringRule.mutate(submitData);
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

        {/* Frequency */}
        <div className="space-y-2">
          <label htmlFor="freq" className="block text-sm font-medium text-slate-200">
            Tần suất
          </label>
          <select
            id="freq"
            {...register('freq')}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
          >
            {FREQUENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.freq && <p className="text-red-400 text-sm">{errors.freq.message}</p>}
        </div>
      </div>

      {/* Conditional fields based on frequency */}
      {frequency === 'WEEKLY' && (
        <div className="space-y-2">
          <label htmlFor="weekday" className="block text-sm font-medium text-slate-200">
            Ngày trong tuần
          </label>
          <select
            id="weekday"
            {...register('weekday', { valueAsNumber: true })}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
          >
            {WEEKDAY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.weekday && <p className="text-red-400 text-sm">{errors.weekday.message}</p>}
        </div>
      )}

      {frequency === 'MONTHLY' && (
        <div className="space-y-2">
          <label htmlFor="dayOfMonth" className="block text-sm font-medium text-slate-200">
            Ngày trong tháng
          </label>
          <select
            id="dayOfMonth"
            {...register('dayOfMonth', { valueAsNumber: true })}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
          >
            {Array.from({ length: 31 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Ngày {i + 1}
              </option>
            ))}
          </select>
          {errors.dayOfMonth && <p className="text-red-400 text-sm">{errors.dayOfMonth.message}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start Date */}
        <div className="space-y-2">
          <label htmlFor="startDate" className="block text-sm font-medium text-slate-200">
            Ngày bắt đầu
          </label>
          <input
            id="startDate"
            type="datetime-local"
            {...register('startDate')}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
          />
          {errors.startDate && <p className="text-red-400 text-sm">{errors.startDate.message}</p>}
        </div>

        {/* End Date */}
        <div className="space-y-2">
          <label htmlFor="endDate" className="block text-sm font-medium text-slate-200">
            Ngày kết thúc (tùy chọn)
          </label>
          <input
            id="endDate"
            type="datetime-local"
            {...register('endDate')}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
          />
          {errors.endDate && <p className="text-red-400 text-sm">{errors.endDate.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Time of Day */}
        <div className="space-y-2">
          <label htmlFor="timeOfDay" className="block text-sm font-medium text-slate-200">
            Giờ thực hiện
          </label>
          <input
            id="timeOfDay"
            type="time"
            {...register('timeOfDay')}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
          />
          {errors.timeOfDay && <p className="text-red-400 text-sm">{errors.timeOfDay.message}</p>}
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <label htmlFor="timezone" className="block text-sm font-medium text-slate-200">
            Múi giờ
          </label>
          <select
            id="timezone"
            {...register('timezone')}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
          >
            <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</option>
            <option value="UTC">UTC</option>
            <option value="America/New_York">America/New_York</option>
            <option value="Europe/London">Europe/London</option>
          </select>
          {errors.timezone && <p className="text-red-400 text-sm">{errors.timezone.message}</p>}
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={createRecurringRule.isPending}
        className="w-full bg-gradient-to-r from-sky-400 to-cyan-400 text-slate-900 font-semibold py-3 px-4 rounded-lg hover:from-sky-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        {createRecurringRule.isPending ? 'Đang tạo...' : 'Tạo lịch định kỳ'}
      </button>
    </form>
  );
}
