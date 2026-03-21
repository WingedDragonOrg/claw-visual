import { useRef, useEffect, type ReactNode } from 'react';

interface StaggerInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  /** Mobile delay override (default: delay * 0.6) */
  mobileDelay?: number;
}

/**
 * Wrapper component that staggers child entrance animations.
 * Uses CSS transform + opacity for GPU acceleration.
 */
export function StaggerIn({ children, delay = 0, className, mobileDelay }: StaggerInProps) {
  const isFirstMount = useRef(true);

  // Handle React StrictMode double-mount:
  // Only animate on first mount; subsequent mounts skip animation.
  useEffect(() => {
    isFirstMount.current = false;
  }, []);

  const shouldAnimate = isFirstMount.current;

  const style: React.CSSProperties = shouldAnimate
    ? {
        animation: 'stagger-in 0.5s ease-out both',
        animationDelay: `${delay}ms`,
        '--stagger-mobile-delay': `${mobileDelay ?? delay * 0.6}ms`,
      } as React.CSSProperties
    : { opacity: 1 };

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}
