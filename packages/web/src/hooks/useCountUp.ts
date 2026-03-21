import { useRef, useEffect, useState } from 'react';

/**
 * Count-up animation hook using requestAnimationFrame.
 * Only triggers on first render; subsequent target changes show the value directly.
 * Skips animation when target ≤ 1.
 * Cancels rAF on unmount.
 */
export function useCountUp(target: number, duration = 800): number {
  const [display, setDisplay] = useState(target);
  const isFirstMount = useRef(true);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    // Skip animation for small values
    if (target <= 1) {
      setDisplay(target);
      isFirstMount.current = false;
      return;
    }

    // Only animate on first mount; subsequent updates show directly
    if (!isFirstMount.current) {
      setDisplay(target);
      return;
    }

    isFirstMount.current = false;

    const start = performance.now();
    const from = 0;
    const to = target;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (to - from) * eased);

      setDisplay(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target, duration]);

  return display;
}
