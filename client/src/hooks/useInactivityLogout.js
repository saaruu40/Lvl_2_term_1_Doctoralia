import { useEffect, useRef } from "react";

// Simple inactivity logout hook — average coder level, no extra lib.
// Reuses existing JWT system: after timeout it clears localStorage token + role data
// and calls onLogout (which should navigate to login). Backend JWT (1d) still enforces auth.
export default function useInactivityLogout(onLogout, timeoutMs = 5 * 60 * 1000) {
  const timerRef = useRef(null);
  const lastResetRef = useRef(0);

  useEffect(() => {
    if (typeof onLogout !== "function") return;

    const resetTimer = () => {
      // simple throttle: ignore mousemove spam within 3s
      const now = Date.now();
      if (now - lastResetRef.current < 3000 && timerRef.current) {
        // still reset for non-mousemove events, but throttle mousemove
      }
      lastResetRef.current = now;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onLogout();
      }, timeoutMs);
    };

    const throttledReset = (e) => {
      // throttle only mousemove
      if (e && e.type === "mousemove") {
        if (Date.now() - lastResetRef.current < 3000) return;
      }
      resetTimer();
    };

    // start timer
    resetTimer();

    const events = ["mousemove", "mousedown", "click", "keydown", "scroll", "touchstart"];
    events.forEach((ev) => {
      window.addEventListener(ev, throttledReset, { passive: true });
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((ev) => {
        window.removeEventListener(ev, throttledReset);
      });
    };
  }, [onLogout, timeoutMs]);
}
