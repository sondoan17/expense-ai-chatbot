import { useState } from 'react';

import { resetAccount } from '../api/client';
import { AiPersonality } from '../api/types';
import { useLogout, useUpdatePersonality, useUserSettings } from '../hooks/api';

const personalities: Array<{ value: AiPersonality; label: string; description: string }> = [
  { value: 'FRIENDLY', label: '😊 Thân thiện', description: 'Ấm áp, kiên nhẫn, hỏi nhiều' },
  { value: 'PROFESSIONAL', label: '👔 Chuyên nghiệp', description: 'Ngắn gọn, lịch sự' },
  { value: 'CASUAL', label: '😎 Thoải mái', description: 'Thân mật, dễ gần' },
  { value: 'HUMOROUS', label: '😄 Hài hước', description: 'Vui vẻ, hóm hỉnh' },
  { value: 'INSULTING', label: '😤 Xúc phạm', description: 'Mắng mỏ khi bạn chi tiêu' },
  { value: 'ENTHUSIASTIC', label: '🚀 Nhiệt tình', description: 'Năng động, khuyến khích' },
];

export function SettingsPage() {
  const settings = useUserSettings();
  const updatePersonality = useUpdatePersonality();
  const logout = useLogout();
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const selected = personalities.find((item) => item.value === settings.data?.aiPersonality) ?? personalities[0];

  const clearData = async () => {
    if (!password.trim()) {
      setStatus('Nhập mật khẩu để xác nhận.');
      return;
    }
    await resetAccount(password);
    setPassword('');
    setStatus('Đã xóa dữ liệu tài khoản.');
  };

  return (
    <section className="mimi-screen">
      <div className="mimi-section-title"><span>Preferences</span><strong>Cài đặt</strong></div>
      <article className="mimi-card mimi-form">
        <h2>Tính cách AI</h2>
        <select value={settings.data?.aiPersonality ?? 'FRIENDLY'} onChange={(event) => updatePersonality.mutate(event.target.value as AiPersonality)} disabled={settings.isLoading || updatePersonality.isPending}>
          {personalities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <p>{selected.description}</p>
      </article>
      <article className="mimi-card mimi-form">
        <h2>Tài khoản</h2>
        <button className="mimi-button ghost" onClick={() => logout.mutate()} type="button">Đăng xuất</button>
      </article>
      <article className="mimi-card mimi-form danger">
        <h2>Vùng nguy hiểm</h2>
        <p>Xóa giao dịch, ngân sách, lịch định kỳ và lịch sử chat. Hành động này không thể hoàn tác.</p>
        <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Mật khẩu xác nhận" />
        {status ? <div className="mimi-error">{status}</div> : null}
        <button className="mimi-button danger" onClick={() => void clearData()} type="button">Xóa toàn bộ dữ liệu</button>
      </article>
    </section>
  );
}
