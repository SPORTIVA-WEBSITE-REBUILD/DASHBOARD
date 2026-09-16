import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { safeInternalPath } from '../lib/links.js';
import { Field, Spinner } from '../components/ui.jsx';
import PasswordInput from '../components/PasswordInput.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      // Return the administrator to whatever they were trying to reach.
      // Only ever return to an in-app path, never an absolute or off-site URL.
      navigate(safeInternalPath(location.state?.from, '/'), { replace: true });
    } catch (err) {
      setError(
        err.status === 429
          ? 'Too many attempts. Please wait a few minutes and try again.'
          : err.message || 'Sign in failed',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="login__card" onSubmit={onSubmit}>
        <div className="login__brand">
          <h1>PCN Sportiva</h1>
          <small>Content management</small>
        </div>

        {error && <div className="alert alert--error" role="alert">{error}</div>}

        <Field label="Email" htmlFor="email">
          <input
            id="email" type="email" autoComplete="username" required autoFocus
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label="Password" htmlFor="password">
          <PasswordInput
            id="password" autoComplete="current-password" required
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <button type="submit" className="btn btn--primary" style={{ width: '100%' }} disabled={busy}>
          {busy && <Spinner />} Sign in
        </button>
      </form>
    </div>
  );
}
