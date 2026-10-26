import { useState } from 'react';
import { ArrowUpRight, Clock3 } from 'lucide-react';
import { clock, time } from '../utils/format.js';

const presets = [
  { label: 'Short break', minutes: 10, detail: 'After a 2-hour block' },
  { label: 'Lunch', minutes: 50, detail: 'Midday reset' },
  { label: 'Dinner', minutes: 30, detail: 'Evening study' },
];

export default function BreakTimer({ active, offActive, now, busy, ready, blocked, onStart, onReturn }) {
  const [checked, setChecked] = useState(false);
  const elapsed = active ? Math.max(0, Math.floor((now - Date.parse(active.startedAt)) / 1000)) : 0;
  const allowance = (active?.plannedMinutes || 0) * 60;
  const remaining = allowance - elapsed;
  const over = remaining < 0;
  const ring = active ? Math.min(360, Math.round(elapsed / allowance * 360)) : 0;
  const offElapsed = offActive ? Math.max(0, Math.floor((now - Date.parse(offActive.startedAt)) / 1000)) : 0;
  async function returnOnce() {
    setChecked(true);
    try { await onReturn(); } finally { setChecked(false); }
  }
  return <section className="timer-card" aria-labelledby="timer-title">
    <div className="card-top"><span className="section-kicker">01 / LIVE BREAK</span><Clock3 size={19} aria-hidden="true" /></div>
    <div className="timer-body">
      <div className={`timer-ring ${over ? 'overtime' : ''}`} style={{ background: active ? `conic-gradient(${over ? '#ff7d72' : '#c8f36b'} ${ring}deg, #425267 ${ring}deg)` : 'conic-gradient(#425267 0deg, #425267 360deg)' }}>
        <div className="timer-center"><span>{active ? (over ? 'OVER TIME' : 'TIME LEFT') : offActive ? 'OFF FROM STUDIES' : 'READY WHEN YOU ARE'}</span><strong>{active ? clock(Math.abs(remaining)) : offActive ? clock(offElapsed) : '00:00'}</strong><small>{active ? `${active.label} · ${active.plannedMinutes} min allowed` : offActive ? 'Current off-study session' : 'Choose a break below'}</small></div>
      </div>
      <div className="timer-side">
        <h2 id="timer-title">{active ? (over ? 'Come back and log it.' : 'Your break is running.') : 'Start your next break'}</h2>
        <p>{active ? `Started at ${time(active.startedAt)} IST. The clock keeps running if you close this page.` : 'Your 10-minute breaks, lunch and dinner are already set to your routine.'}</p>
        {active ? <div className="return-wrap"><label className="return-label"><input className="return-checkbox" type="checkbox" checked={checked} disabled={busy || blocked} onChange={returnOnce} /><span>I’m back from break</span></label><small>Tick once when you are back at your seat.</small></div> : <div className="preset-list">{presets.map(p => <button key={p.label} disabled={busy || !ready || blocked || !!offActive} onClick={() => onStart(p.label)} className="preset" type="button"><span><strong>{p.label}</strong><small>{p.detail}</small></span><span className="preset-time">{p.minutes} min <ArrowUpRight size={17} /></span></button>)}</div>}
      </div>
    </div>
    <div className="timer-foot"><span>Allowances: 10 min · 50 min lunch · 10 min · 30 min dinner</span><span>No grace period</span></div>
  </section>;
}
