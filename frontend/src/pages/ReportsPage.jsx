import { useEffect, useState } from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { getReport } from '../api/breaks.js';
import AppHeader from '../components/AppHeader.jsx';
import { downloadReport } from '../utils/xlsx.js';
import { time } from '../utils/format.js';

function istToday() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

export default function ReportsPage() {
  const [scope, setScope] = useState('week');
  const [anchor, setAnchor] = useState(istToday);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let live = true;
    setBusy(true); setError('');
    getReport(scope, anchor).then(value => { if (live) setReport(value); })
      .catch(err => { if (live) { setError(err.message); setReport(null); } })
      .finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, [scope, anchor]);
  return <main className="shell"><AppHeader />
    <div className="content report-content">
      <a className="back-link" href="/"><ArrowLeft size={16} /> Back to ledger</a>
      <div className="page-heading"><div><div className="eyebrow">DISCIPLINE / REPORTS</div>
        <h1>Your routine in numbers.</h1>
        <p>Review your attendance, planned breaks, reasons, and time away from studies. Export the selected period to Excel.</p></div></div>
      <section className="panel report-controls">
        <div className="period-tabs"><button className={scope === 'week' ? 'selected' : ''} onClick={() => setScope('week')}>Week</button>
          <button className={scope === 'month' ? 'selected' : ''} onClick={() => setScope('month')}>Month</button></div>
        <label>Choose a date in the {scope}<input type="date" value={anchor} onChange={e => setAnchor(e.target.value)} /></label>
        <button className="export-button" disabled={!report || busy} onClick={() => downloadReport(report)}><Download size={17} /> Download Excel</button>
      </section>
      {error && <div className="alert" role="alert">{error} <a href="/">Return to ledger</a></div>}
      {busy && <p className="empty">Loading report…</p>}
      {report && !busy && <>
        <div className="report-summary"><div><span>Period</span><strong>{report.startDay} – {report.endDay}</strong></div>
          <div><span>Attendance</span><strong>{report.totals.attendanceDays} days</strong></div>
          <div><span>Break excess</span><strong>{report.totals.excessMinutes} min</strong></div>
          <div><span>Off-study time</span><strong>{report.totals.offMinutes} min</strong></div>
          <div><span>Donation fines</span><strong>₹{report.totals.fines}</strong></div></div>
        <section className="panel report-table"><span className="section-kicker">01 / DAILY ROUTINE</span><h2>Day by day</h2>
          <div className="table-scroll"><table><thead><tr><th>Date</th><th>Attendance</th><th>Breaks</th><th>Break minutes</th><th>Exceeded</th><th>Off-study</th><th>Fine</th><th>Attendance reason</th></tr></thead>
            <tbody>{report.days.map(d => <tr key={d.date}><td>{d.date}</td><td>{d.attendance}{d.checkedAt ? ` · ${time(d.checkedAt)}` : ''}</td>
              <td>{d.breakCount}</td><td>{d.breakMinutes}</td><td>{d.excessMinutes}</td><td>{d.offMinutes}</td><td>₹{d.fineRupees}</td><td>{d.attendanceReason || '—'}</td></tr>)}</tbody></table></div></section>
        <section className="panel report-table"><span className="section-kicker">02 / BREAK DETAILS</span><h2>Breaks and reasons</h2>
          <div className="table-scroll"><table><thead><tr><th>Date</th><th>Break</th><th>Start</th><th>Return</th><th>Allowed</th><th>Actual</th><th>Exceeded</th><th>Fine</th><th>Reason</th></tr></thead>
            <tbody>{report.entries.length ? report.entries.map((e, i) => <tr key={i}><td>{e.date}</td><td>{e.label}</td><td>{time(e.startedAt)}</td><td>{e.endedAt ? time(e.endedAt) : '—'}</td>
              <td>{e.plannedMinutes} min</td><td>{e.actualMinutes ?? 'Running'}</td><td>{e.excessMinutes ?? '—'}</td><td>₹{e.fineRupees}</td><td>{e.reason || '—'}</td></tr>)
              : <tr><td colSpan="9">No breaks recorded in this period.</td></tr>}</tbody></table></div></section>
      </>}
      <footer>Export includes daily routine and break details as separate Excel sheets. Times use IST.</footer>
    </div></main>;
}
