import { useNavigate } from 'zmp-ui';

function HomePage() {
  const navigate = useNavigate();

  return (
    <main className="mimi-page mimi-hero">
      <section className="mimi-card mimi-hero-card">
        <div className="mimi-orb" />
        <span className="mimi-kicker">Mimi expense assistant</span>
        <h1>Nhắn một câu, Mimi ghi thu chi cho bạn.</h1>
        <p>
          Theo dõi chi tiêu, ngân sách và lịch định kỳ bằng tiếng Việt hoặc English trong một mini
          app tối ưu cho điện thoại.
        </p>
        <div className="mimi-actions">
          <button className="mimi-button primary" onClick={() => navigate('/login')} type="button">
            Đăng nhập
          </button>
          <button className="mimi-button ghost" onClick={() => navigate('/register')} type="button">
            Tạo tài khoản
          </button>
        </div>
      </section>
    </main>
  );
}

export default HomePage;
