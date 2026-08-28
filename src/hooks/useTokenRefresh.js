import { useEffect, useRef } from 'react';
import config from '@/config';
import { getAuthToken } from '@/stores/authStore';
import { refreshAccessToken, getRefreshToken } from '@/lib/tokenRefresh';

function decodeTokenPayload(token) {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const REFRESH_BEFORE_MS = 5 * 60 * 1000;
const ACTIVITY_REFRESH_THROTTLE_MS = 10 * 1000;

export function useTokenRefresh() {
  const timerRef = useRef(null);
  const lastActivityRefreshRef = useRef(0);

  useEffect(() => {
    const scheduleRefresh = () => {
      const token = getAuthToken();
      if (!token) return;

      const decoded = decodeTokenPayload(token);
      if (!decoded?.exp) return;

      const expiresAt = decoded.exp * 1000;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      const delay = Math.max(timeUntilExpiry - REFRESH_BEFORE_MS, 0);

      if (delay > 0) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(refresh, delay);
      }
    };

    const refresh = async () => {
      if (!getAuthToken()) return;
      if (!getRefreshToken()) return;

      try {
        // refreshAccessToken is single-flight: the timer, activity events and
        // the axios 401 interceptor share one /auth/refresh call, so the
        // backend's rotating refresh token can't be raced into a revoked-token
        // 401.
        await refreshAccessToken();
      } catch (err) {
        if (config.isDevelopment()) {
          console.error('[TokenRefresh] Failed to proactively refresh token:', err?.response?.status, err?.message);
        }
      }

      scheduleRefresh();
    };

    scheduleRefresh();

    const handleActivity = () => {
      const token = getAuthToken();
      if (!token) return;
      const decoded = decodeTokenPayload(token);
      if (!decoded?.exp) return;
      const expiresAt = decoded.exp * 1000;
      const timeUntilExpiry = expiresAt - Date.now();

      if (timeUntilExpiry < REFRESH_BEFORE_MS + 10_000) {
        // Throttle activity-triggered refreshes; a burst of clicks/keystrokes
        // must not spawn a burst of refresh requests.
        const now = Date.now();
        if (now - lastActivityRefreshRef.current >= ACTIVITY_REFRESH_THROTTLE_MS) {
          lastActivityRefreshRef.current = now;
          refresh();
        } else {
          scheduleRefresh();
        }
      } else {
        scheduleRefresh();
      }
    };

    window.addEventListener('mousedown', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, []);
}
