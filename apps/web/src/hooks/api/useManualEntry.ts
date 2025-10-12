import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { createTransaction, createBudget, createRecurringRule } from '../../api/manual-entry';

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      success('Đã thêm giao dịch thành công');
      navigate('/app/dashboard');
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tạo giao dịch';
      error('Lỗi tạo giao dịch', message);
    },
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budget-status'] });
      success('Đã tạo ngân sách thành công');
      navigate('/app/dashboard');
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tạo ngân sách';
      error('Lỗi tạo ngân sách', message);
    },
  });
}

export function useCreateRecurringRule() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: createRecurringRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      success('Đã tạo lịch định kỳ thành công');
      navigate('/app/dashboard');
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tạo lịch định kỳ';
      error('Lỗi tạo lịch định kỳ', message);
    },
  });
}
