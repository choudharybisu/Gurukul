import { FileSpreadsheet, LockKeyhole } from 'lucide-react';

export default function AppHeader({ onSignOut, showReports = false }) {
  return <header className="masthead">
    <div className="brand"><span className="brand-mark">HG<span className="brand-dot">.</span></span><span className="brand-copy">HOME GURUKUL<br /><strong>BREAK LEDGER</strong></span></div>
    <div className="header-actions">{showReports && <a className="header-link" href="/#/reports"><FileSpreadsheet size={16} /> Reports</a>}<div className="private-pill"><LockKeyhole size={15} strokeWidth={1.8} /> Private study space</div>{onSignOut && <button className="signout" type="button" onClick={onSignOut}>Sign out</button>}</div>
  </header>;
}
