import { useState, useRef, useCallback, type ReactNode } from 'react';
import './Tooltip.css';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: 'top' | 'bottom';
}

/**
 * Lightweight CSS-only positioned tooltip.
 * No dependencies, GPU-safe (no layout-triggering properties in animation).
 */
export function Tooltip({ content, children, placement = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(true), 120);
  }, []);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

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
        <span className={`tooltip-box tooltip-${placement}`} role="tooltip">
          {content}
        </span>
      )}
    </span>
  );
}
