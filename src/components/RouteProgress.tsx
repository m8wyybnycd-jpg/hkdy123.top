import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Top progress bar that shows on route changes.
 * Lightweight, zero-dependency alternative to NProgress.
 * Triggers on location.pathname change, auto-completes after ~300ms.
 */
export default function RouteProgress() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Start progress bar
    setProgress(0);
    setVisible(true);

    // Simulate progress: fast to 80%, then wait for completion
    let pct = 0;
    timerRef.current = setInterval(() => {
      pct += Math.random() * 20 + 5;
      if (pct >= 80) {
        pct = 80;
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
      setProgress(pct);
    }, 80);

    // Complete after a short delay (route content usually loads fast)
    completeTimerRef.current = setTimeout(() => {
      setProgress(100);
      // Hide after fade-out
      setTimeout(() => setVisible(false), 300);
    }, 350);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (completeTimerRef.current) {
        clearTimeout(completeTimerRef.current);
        completeTimerRef.current = null;
      }
    };
  }, [location.pathname]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-aurora-cyan via-aurora-teal to-aurora-purple transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          boxShadow: "0 0 8px rgba(46, 167, 255, 0.6)",
        }}
      />
    </div>
  );
}
