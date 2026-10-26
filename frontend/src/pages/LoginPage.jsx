import { useState } from 'react';
import AppHeader from '../components/AppHeader.jsx';
import { signIn } from '../api/auth.js';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { onLogin(await signIn(username, password)); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <main className="shell"><AppHeader /><div className="login-layout"><form className="login-card" onSubmit={submit}>
    <div className="eyebrow">PRIVATE STUDY SPACE</div><h1>Welcome back.</h1><p>Sign in to your break ledger.</p>
    {error && <div className="alert" role="alert">{error}</div>}
    <label>Username<input autoComplete="username" required value={username} onChange={e => setUsername(e.target.value)} /></label>
    <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
    <button disabled={busy} type="submit">{busy ? 'Signing in…' : 'Sign in'}</button>
  </form></div></main>;
}
