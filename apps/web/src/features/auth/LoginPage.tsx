import { FormEvent, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { extractErrorMessage } from "../../api/client";
import "./auth.css";

export function LoginPage() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await login({ email, password });
    } catch (err) {
      setError(extractErrorMessage(err, "Login failed"));
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-badge">Expense AI</span>
          <h1>Welcome back</h1>
          <p>Sign in with your email and password to chat with your expense assistant.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />
          </label>
          {error ? <p className="auth-error">{error}</p> : null}
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="auth-footer">Need an account? Call the backend `/auth/register` endpoint to create one.</p>
      </div>
    </div>
  );
}
