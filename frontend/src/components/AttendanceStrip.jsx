import { time } from '../utils/format.js';

export default function AttendanceStrip({ attendance, ready, blocked, busy, onMark }) {
  return <section className="attendance-strip" aria-label="Today’s attendance">
    <div><span className="section-kicker">00 / DAILY CHECK-IN</span><strong>Attendance</strong>
      <small>{attendance ? `Marked at ${time(attendance.checkedAt)}${attendance.late ? ' · late reason recorded' : ' · on time'}` : 'Mark your attendance before 9:00 AM.'}</small></div>
    <label className="attendance-check"><input type="checkbox" checked={!!attendance} disabled={!ready || !!attendance || busy || blocked} onChange={onMark} />
      <span>{attendance ? 'Present today' : 'I am present'}</span></label>
  </section>;
}
