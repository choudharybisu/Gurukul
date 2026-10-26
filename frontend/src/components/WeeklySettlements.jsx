import { weekLabel } from '../utils/format.js';

export default function WeeklySettlements({ settlements, busy, onDonate }) {
  return <section className="panel" aria-labelledby="settlement-title">
    <div className="panel-head"><div><span className="section-kicker">04 / WEEKLY SETTLEMENT</span><h2 id="settlement-title">Donation history</h2></div></div>
    {!settlements ? <p className="empty">Loading your weeks…</p> : <div className="settlement-list">{settlements.map(w => <div className="settlement-row" key={w.weekStart}>
      <div><strong>{weekLabel(w.weekStart)}</strong><span>{w.completed} breaks · ₹{w.fineRupees} fines</span></div>
      <div className="settlement-action">{w.canPay ? <button className="preset" type="button" disabled={busy} onClick={() => onDonate(w.weekStart, w.dueRupees)}>Mark ₹{w.dueRupees} donated</button> : <span className={w.paidRupees > 0 ? 'paid' : 'pending'}>{w.dueRupees === 0 ? (w.paidRupees ? 'Donated' : 'No fine') : `₹${w.dueRupees} due Sunday`}</span>}</div>
    </div>)}</div>}
  </section>;
}
