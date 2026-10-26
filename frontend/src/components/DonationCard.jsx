import { weekLabel } from '../utils/format.js';

export default function DonationCard({ data, busy, onDonate }) {
  const due = data?.currentSummary.dueRupees || 0;
  return <aside className="week-card" aria-labelledby="week-title">
    <span className="section-kicker">02 / THIS WEEK</span>
    <h2 id="week-title">Donation ledger</h2>
    <div className="week-range">{data ? weekLabel(data.currentWeek) : 'Loading week…'}</div>
    <div className="money">₹{due}</div><div className="money-caption">to donate {data?.isSunday ? 'today' : 'on Sunday'}</div>
    <div className="week-stats"><div><strong>{data?.currentSummary.completed || 0}</strong><span>breaks logged</span></div><div><strong>{data?.currentSummary.recentOverruns || 0}</strong><span>recent overruns</span></div></div>
    <p className="ledger-note">₹10 per break that exceeds its allowance. Donate the accumulated amount yourself at week’s end, then mark it paid here.</p>
    {data?.isSunday && due > 0 && <button disabled={busy} className="donate-button" type="button" onClick={() => onDonate(data.currentWeek, due)}>I donated ₹{due}</button>}
  </aside>;
}
