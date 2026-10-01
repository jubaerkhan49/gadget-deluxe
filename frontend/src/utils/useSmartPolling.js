import { useEffect, useRef } from 'react';

/**
 * Smart Polling Hook
 * - Pauses polling when the browser tab is hidden/minimized (drastically reduces database egress).
 * - Immediately refreshes when the user focuses or returns to the tab.
 * - Defaults to a battery & database-friendly interval (30 seconds).
 */
export function useSmartPolling(callback, intervalMs = 30000, enabled = true) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    let timerId = null;

    const tick = () => {
      if (!document.hidden && savedCallback.current) {
        savedCallback.current();
      }
    };

    timerId = setInterval(tick, intervalMs);

    const handleVisibilityChange = () => {
      if (!document.hidden && savedCallback.current) {
        savedCallback.current();
      }
    };

    const handleFocus = () => {
      if (savedCallback.current) {
        savedCallback.current();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      if (timerId) clearInterval(timerId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [intervalMs, enabled]);
}
