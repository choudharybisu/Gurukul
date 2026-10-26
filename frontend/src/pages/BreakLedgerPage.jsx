import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { finishBreak, finishOffStudy, markAttendance, markDonated, recordBreakReason, startBreak, startOffStudy } from '../api/breaks.js';
import { signOut } from '../api/auth.js';
import AppHeader from '../components/AppHeader.jsx';
import AttendanceStrip from '../components/AttendanceStrip.jsx';
import BreakTimer from '../components/BreakTimer.jsx';
import DonationCard from '../components/DonationCard.jsx';
import OffStudyPanel from '../components/OffStudyPanel.jsx';
import ReasonModal from '../components/ReasonModal.jsx';
import RecentBreaks from '../components/RecentBreaks.jsx';
import WeeklySettlements from '../components/WeeklySettlements.jsx';
import { useClock } from '../hooks/useClock.js';
import { useDashboard } from '../hooks/useDashboard.js';
import { todayLabel } from '../utils/format.js';

export default function BreakLedgerPage({ onLogout }) {
  const { data, error, setError, refresh } = useDashboard();
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const now = useClock(data?.serverNow);
  const active = data?.active;
  const elapsed = active ? now - Date.parse(active.startedAt) : 0;
  const blocker = data?.attendanceReasonRequired ? 'attendance'
    : active && !active.reason && (data.breakReasonRequired || elapsed > (active.plannedMinutes + 1) * 60000) ? 'break'
      : null;

  async function act(operation, success) {
    if (busy) return false;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await operation();
      await refresh();
      setNotice(typeof result?.fineRupees === 'number'
        ? (result.fineRupees ? 'Break closed. ₹10 added to this week’s donation.' : 'Break closed. You returned on time.')
        : success);
      return true;
    } catch (err) { setError(err.message); return false; }
    finally { setBusy(false); }
  }
  async function logout() {
    try { await signOut(); onLogout(); }
    catch (err) { setError(err.message); }
  }
  return <main className="shell">
    <AppHeader onSignOut={logout} showReports />
    <div className="content">
      <div className="page-heading"><div><div className="eyebrow">DISCIPLINE / 01</div><h1>Keep breaks on time.</h1><p>Start a break. Tick the box when you return. An overrun adds ₹10 to your Sunday donation.</p></div><span className="date-stamp">{todayLabel()}</span></div>
      {error && !blocker && <div role="alert" className="alert">{error} <button onClick={refresh} type="button" aria-label="Retry loading"><RotateCcw size={16} /></button></div>}
      {notice && <div role="status" className="notice">{notice}</div>}
      <AttendanceStrip attendance={data?.attendance} ready={!!data} blocked={!!blocker} busy={busy}
        onMark={() => act(() => markAttendance(), 'Attendance marked.')} />
      <div className="grid-main">
        <BreakTimer active={active} offActive={data?.off.active} now={now} busy={busy} blocked={!!blocker} ready={!!data}
          onStart={label => act(() => startBreak(label), `${label} started.`)}
          onReturn={() => act(finishBreak, 'Break recorded.')} />
        <DonationCard data={data} busy={busy || !!blocker} onDonate={(week, due) => act(() => markDonated(week), `₹${due} marked as donated.`)} />
      </div>
      <div className="lower-grid"><RecentBreaks history={data?.history} />
        <WeeklySettlements settlements={data?.settlements} busy={busy || !!blocker}
          onDonate={(week, due) => act(() => markDonated(week), `₹${due} marked as donated.`)} /></div>
      <OffStudyPanel off={data?.off} now={now} serverNow={data?.serverNow} activeBreak={active} busy={busy} blocked={!!blocker}
        onToggle={() => act(data?.off.active ? finishOffStudy : startOffStudy,
          data?.off.active ? 'Off-study time recorded.' : 'Off-study timer started.')} />
      <footer>Home Gurukul · Time is counted in IST · Your donation is recorded here after you make it.</footer>
    </div>
    <ReasonModal kind={blocker} busy={busy} error={error} onSave={reason => act(
      () => blocker === 'attendance' ? markAttendance(reason) : recordBreakReason(reason),
      blocker === 'attendance' ? 'Attendance and reason recorded.' : 'Reason recorded. Tick the return box when you are back.'
    )} />
  </main>;
}
