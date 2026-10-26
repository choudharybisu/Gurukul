export const clock = (seconds) => {
  const value = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
};

export const time = (iso) => new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true,
}).format(new Date(iso));

export const shortDate = (iso) => new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short',
}).format(new Date(iso));

export function weekLabel(weekStart) {
  const monday = new Date(`${weekStart}T00:00:00Z`);
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  const fmt = (date) => new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', timeZone: 'UTC',
  }).format(date);
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

export const todayLabel = () => new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'long',
}).format(new Date());
