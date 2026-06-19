import { FormEvent, useState } from 'react';

import { Currency, TxnType } from '../api/types';
import { useCreateBudget, useCreateRecurringRule, useCreateTransaction } from '../hooks/api';
import { toDatetimeLocal } from '../utils/format';

type EntryTab = 'transaction' | 'budget' | 'recurring';

export function ManualEntryPage() {
  const [tab, setTab] = useState<EntryTab>('transaction');
  const transaction = useCreateTransaction();
  const budget = useCreateBudget();
  const recurring = useCreateRecurringRule();
  const now = new Date();

  const submitTransaction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    transaction.mutate({ type: data.get('type') as TxnType, amount: Number(data.get('amount')), currency: data.get('currency') as Currency, note: String(data.get('note') ?? ''), occurredAt: new Date(String(data.get('occurredAt'))).toISOString() });
  };
  const submitBudget = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    budget.mutate({ month: Number(data.get('month')), year: Number(data.get('year')), limitAmount: Number(data.get('limitAmount')), currency: data.get('currency') as Currency });
  };
  const submitRecurring = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    recurring.mutate({ freq: data.get('freq') as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY', type: data.get('type') as TxnType, amount: Number(data.get('amount')), currency: data.get('currency') as Currency, note: String(data.get('note') ?? ''), startDate: new Date(String(data.get('startDate'))).toISOString(), timezone: 'Asia/Ho_Chi_Minh' });
  };

  return (
    <section className="mimi-screen">
      <div className="mimi-section-title"><span>Manual entry</span><strong>Nhập thủ công</strong></div>
      <div className="mimi-tabs"><button className={tab === 'transaction' ? 'active' : ''} onClick={() => setTab('transaction')} type="button">Giao dịch</button><button className={tab === 'budget' ? 'active' : ''} onClick={() => setTab('budget')} type="button">Ngân sách</button><button className={tab === 'recurring' ? 'active' : ''} onClick={() => setTab('recurring')} type="button">Định kỳ</button></div>
      {tab === 'transaction' ? <EntryForm onSubmit={submitTransaction} pending={transaction.isPending} defaults={{ occurredAt: toDatetimeLocal() }} fields="transaction" /> : null}
      {tab === 'budget' ? <EntryForm onSubmit={submitBudget} pending={budget.isPending} defaults={{ month: String(now.getMonth() + 1), year: String(now.getFullYear()) }} fields="budget" /> : null}
      {tab === 'recurring' ? <EntryForm onSubmit={submitRecurring} pending={recurring.isPending} defaults={{ startDate: toDatetimeLocal() }} fields="recurring" /> : null}
    </section>
  );
}

function EntryForm({ onSubmit, pending, defaults, fields }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; pending: boolean; defaults: Record<string, string>; fields: EntryTab }) {
  return <form className="mimi-card mimi-form" onSubmit={onSubmit}>{fields !== 'budget' ? <label>Loại<select name="type" defaultValue="EXPENSE"><option value="EXPENSE">Chi tiêu</option><option value="INCOME">Thu nhập</option></select></label> : null}<label>Số tiền<input name={fields === 'budget' ? 'limitAmount' : 'amount'} type="number" min="1" required /></label><label>Tiền tệ<select name="currency" defaultValue="VND"><option>VND</option><option>USD</option></select></label>{fields === 'transaction' ? <label>Thời gian<input name="occurredAt" type="datetime-local" defaultValue={defaults.occurredAt} /></label> : null}{fields === 'budget' ? <><label>Tháng<input name="month" type="number" min="1" max="12" defaultValue={defaults.month} /></label><label>Năm<input name="year" type="number" min="2000" max="2100" defaultValue={defaults.year} /></label></> : null}{fields === 'recurring' ? <><label>Tần suất<select name="freq" defaultValue="MONTHLY"><option value="DAILY">Hằng ngày</option><option value="WEEKLY">Hằng tuần</option><option value="MONTHLY">Hằng tháng</option><option value="YEARLY">Hằng năm</option></select></label><label>Bắt đầu<input name="startDate" type="datetime-local" defaultValue={defaults.startDate} /></label></> : null}{fields !== 'budget' ? <label>Ghi chú<input name="note" maxLength={255} /></label> : null}<button className="mimi-button primary" disabled={pending} type="submit">{pending ? 'Đang lưu...' : 'Lưu'}</button></form>;
}
