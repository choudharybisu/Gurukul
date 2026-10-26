import { clock } from '../utils/format.js';

export default function OffStudyPanel({ off, now, serverNow, activeBreak, busy, blocked, onToggle }) {
  const elapsed = off?.active ? Math.max(0, Math.floor((now - Date.parse(off.active.startedAt)) / 1000)) : 0;
  const liveTotal = (off?.totalMinutesToday || 0) +
    (off?.active && serverNow ? Math.max(0, (now - Date.parse(serverNow)) / 60000) : 0);
  return <section className="off-panel" aria-labelledby="off-title">
    <div><span className="section-kicker">05 / OFF FROM STUDIES</span><h2 id="off-title">Time away from studies</h2>
      <p>Keep track of longer pauses outside your planned breaks.</p></div>
    <div className="off-readout"><span>Today’s total</span><strong>{Math.max(0, liveTotal).toFixed(1)} <small>min</small></strong>
      {off?.active && <span>Current session: {clock(elapsed)}</span>}</div>
    <button className="off-button" type="button" disabled={busy || blocked || !off || (!!activeBreak && !off.active)} onClick={onToggle}>
      {off?.active ? '✓ Tick: back to studies' : 'Start off-study timer'}</button>
  </section>;
}
