import { useEffect, useState } from 'react';
import { getSession } from './api/auth.js';
import LoginPage from './pages/LoginPage.jsx';
import BreakLedgerPage from './pages/BreakLedgerPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';

export default function App() {
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { getSession().then(setSession).catch(err => setError(err.message)); }, []);
  if (error) return <div role="alert" className="alert" style={{ margin: 30 }}>{error} <button onClick={() => window.location.reload()}>Retry</button></div>;
  if (!session) return <div className="login-layout">Loading your study space…</div>;
  if (!session.authenticated) return <LoginPage onLogin={setSession} />;
  return window.location.hash === '#/reports' // return window.location.pathname === '/reports'
    ? <ReportsPage />
    : <BreakLedgerPage onLogout={() => setSession({ authenticated: false })} />;
}
