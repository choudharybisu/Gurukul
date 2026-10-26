import { useState } from 'react';

export default function ReasonModal({ kind, onSave, busy, error }) {
  const [reason, setReason] = useState('');
  if (!kind) return null;
  const attendance = kind === 'attendance';
  return <div className="modal-backdrop"><div className="reason-modal" role="dialog" aria-modal="true" aria-labelledby="reason-title">
    <div className="reason-symbol">!</div><span className="section-kicker">REASON REQUIRED</span>
    <h2 id="reason-title">{attendance ? 'Mark today’s attendance' : 'What delayed your return?'}</h2>
    <p>{attendance ? 'It is after 9:00 AM and today’s attendance has not been marked. Tick attendance and enter a reason to continue.' :
      'Your break has exceeded its allowance by more than 1 minute. Enter a reason before you use the ledger or check in.'}</p>
    <form onSubmit={e => { e.preventDefault(); onSave(reason).then(saved => { if (saved) setReason(''); }); }}>
      <label htmlFor="required-reason">Your reason</label>
      <textarea id="required-reason" maxLength={500} required autoFocus value={reason} onChange={e => setReason(e.target.value)}
        placeholder="Write a short, honest reason…" />
      <button disabled={busy || !reason.trim()} type="submit">{busy ? 'Saving…' : attendance ? '✓ Mark attendance and continue' : 'Save reason and continue'}</button>
    </form>{error && <p className="modal-error" role="alert">{error}</p>}
  </div></div>;
}
