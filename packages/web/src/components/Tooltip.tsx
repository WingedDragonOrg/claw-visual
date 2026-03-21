import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import './Tooltip.css';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: 'top' | 'bottom';
}

/**
 * Lightweight CSS-only positioned tooltip with viewport boundary detection.
 * GPU-safe (opacity + transform only). Accessible via keyboard.
 */
export function Tooltip({ content, children, placement = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [offset, setOffset] = useState(0); // horizontal correction
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLSpanElement>(null);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(true), 120);
  }, []);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    setOffset(0);
  }, []);

  // After the tooltip renders, check if it overflows the viewport
  // and apply a horizontal correction so it stays visible.
  useEffect(() => {
    if (!visible || !boxRef.current) return;
    const rect = boxRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const MARGIN = 8; // px from viewport edge

    let correction = 0;
    if (rect.left < MARGIN) {
      correction = MARGIN - rect.left;
    } else if (rect.right > vw - MARGIN) {
      correction = vw - MARGIN - rect.right;
    }
    if (correction !== 0) setOffset(correction);
  }, [visible]);

  return (
    <span
      className="tooltip-wrapper"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <span
          ref={boxRef}
          className={`tooltip-box tooltip-${placement}`}
          style={offset ? { transform: `translateX(calc(-50% + ${offset}px))` } : undefined}
          role="tooltip"
        >
          {content}
        </span>
      )}
    </span>
  );
}
