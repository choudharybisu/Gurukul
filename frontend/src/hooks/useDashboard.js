import { useCallback, useEffect, useState } from 'react';
import { getDashboard } from '../api/breaks.js';

export function useDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try { setData(await getDashboard()); setError(''); }
    catch (err) { setError(err.message); }
  }, []);
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus); };
  }, [refresh]);
  return { data, error, setError, refresh };
}
