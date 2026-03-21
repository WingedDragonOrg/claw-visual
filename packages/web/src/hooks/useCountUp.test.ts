import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountUp } from './useCountUp';

describe('useCountUp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns target directly when target <= 1', () => {
    const { result, rerender } = renderHook(({ target }) => useCountUp(target), {
      initialProps: { target: 0 },
    });

    expect(result.current).toBe(0);

    rerender({ target: 1 });
    expect(result.current).toBe(1);
  });

  it('returns large target values', () => {
    const { result, rerender } = renderHook(({ target }) => useCountUp(target), {
      initialProps: { target: 100 },
    });

    // First mount with large value - initial state is target, animation runs
    expect(result.current).toBe(100);

    rerender({ target: 1000 });
    expect(result.current).toBe(1000);
  });

  it('shows value directly on subsequent target changes (no re-animation)', async () => {
    const { result, rerender } = renderHook(({ target }) => useCountUp(target, 800), {
      initialProps: { target: 50 },
    });

    // Change target - should show directly without animation
    rerender({ target: 200 });
    expect(result.current).toBe(200);
  });

  it('cancels animation on unmount', () => {
    const cancelAnimationFrame = vi.spyOn(window, 'cancelAnimationFrame');

    const { unmount } = renderHook(() => useCountUp(100, 1000));

    unmount();

    // Should have called cancelAnimationFrame during cleanup
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });
});
