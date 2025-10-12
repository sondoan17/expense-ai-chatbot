import { useState } from 'react';
import { TransactionForm } from './components/TransactionForm';
import { BudgetForm } from './components/BudgetForm';
import { RecurringForm } from './components/RecurringForm';

type TabType = 'transaction' | 'budget' | 'recurring';

export function ManualEntryPage() {
  const [activeTab, setActiveTab] = useState<TabType>('transaction');

  const tabs = [
    { id: 'transaction' as const, label: 'Giao dịch', icon: '💰' },
    { id: 'budget' as const, label: 'Ngân sách', icon: '📊' },
    { id: 'recurring' as const, label: 'Định kỳ', icon: '🔄' },
  ];

  const renderForm = () => {
    switch (activeTab) {
      case 'transaction':
        return <TransactionForm />;
      case 'budget':
        return <BudgetForm />;
      case 'recurring':
        return <RecurringForm />;
      default:
        return <TransactionForm />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-2xl border border-slate-700/40 bg-slate-900/60 backdrop-blur-xl">
        <div className="px-5 py-4">
          <h2 className="m-0 text-xl font-semibold tracking-tight">Nhập thủ công</h2>
          <p className="m-0 mt-1 text-sm text-slate-400">
            Thêm giao dịch, ngân sách hoặc lịch định kỳ một cách nhanh chóng.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-t border-slate-700/40 px-2 py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'bg-sky-400/20 text-sky-200'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/20'
              } rounded-xl px-3 py-1.5 text-sm font-semibold transition flex items-center gap-2`}
              aria-pressed={activeTab === tab.id}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="rounded-2xl border border-slate-700/40 bg-slate-900/60 backdrop-blur-xl p-6">
        <div className="space-y-6">{renderForm()}</div>
      </div>
    </div>
  );
}
