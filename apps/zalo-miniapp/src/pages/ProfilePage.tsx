import { FormEvent, useEffect, useState } from 'react';

import { useCurrentUser, useUpdateUser } from '../hooks/api';

export function ProfilePage() {
  const { data: user } = useCurrentUser();
  const updateUser = useUpdateUser();
  const [name, setName] = useState('');

  useEffect(() => setName(user?.name ?? ''), [user]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    updateUser.mutate({ name });
  };

  return (
    <section className="mimi-screen">
      <div className="mimi-section-title"><span>Account</span><strong>Hồ sơ</strong></div>
      <form className="mimi-card mimi-form" onSubmit={submit}>
        <div className="mimi-profile-avatar">{user?.avatar ? <img src={user.avatar} alt="Avatar" /> : user?.email?.[0]?.toUpperCase()}</div>
        <label>Tên hiển thị<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Email<input value={user?.email ?? ''} disabled /></label>
        <button className="mimi-button primary" disabled={updateUser.isPending} type="submit">{updateUser.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
      </form>
    </section>
  );
}
