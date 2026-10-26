import { clock, time } from '../utils/format.js';

export default function RecentBreaks({ history }) {
  return <section className="panel" aria-labelledby="history-title">
    <div className="panel-head"><div><span className="section-kicker">03 / RETURN TIMES</span><h2 id="history-title">Today’s breaks</h2></div><span className="subtle">Today only</span></div>
    {!history ? <p className="empty">Loading your history…</p> : history.length === 0 ? <p className="empty">Completed breaks today will appear here.</p> : <div className="history-list">{history.map(h => <div className="history-row" key={h.id}>
      <span className={`history-icon ${h.fineRupees ? 'late' : 'on-time'}`}>{h.fineRupees ? '!' : '✓'}</span>
      <div className="history-main"><strong>{h.label}</strong><span>{time(h.startedAt)}–{time(h.endedAt)}</span>{h.reason && <span className="history-reason">Reason: {h.reason}</span>}</div>
      <div className="history-result"><strong>{clock(h.actualSeconds)}</strong><span>{h.fineRupees ? '+₹10' : 'On time'}</span></div>
    </div>)}</div>}
  </section>;
}
