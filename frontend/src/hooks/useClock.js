import { useEffect, useMemo, useState } from 'react';

export function useClock(serverNow) {
  const [now, setNow] = useState(Date.now());
  const offset = useMemo(() => serverNow ? Date.parse(serverNow) - Date.now() : 0, [serverNow]);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  return now + offset;
}
