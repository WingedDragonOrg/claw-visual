import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePolling } from './hooks';

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with loading=true and null data', () => {
    const fetcher = vi.fn().mockImplementation(() => new Promise(() => {})); // never resolves
    const { result } = renderHook(() => usePolling(fetcher, 5000));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('fetches data on mount and sets loading=false', async () => {
    const fetcher = vi.fn().mockResolvedValue({ value: 'hello' });
    const { result } = renderHook(() => usePolling(fetcher, 60000)); // 60s interval to avoid re-poll

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual({ value: 'hello' });
    expect(result.current.error).toBeNull();
    // May be called 1-2 times depending on React strict mode / effect timing
    expect(fetcher).toHaveBeenCalled();
  });

  it('sets error when fetcher throws', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => usePolling(fetcher, 60000));

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Network error');
    expect(result.current.data).toBeNull();
  });

  it('handles non-Error throws', async () => {
    const fetcher = vi.fn().mockRejectedValue('string error');
    const { result } = renderHook(() => usePolling(fetcher, 60000));

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(result.current.error).toBe('Unknown error');
  });

  it('refresh() triggers fetch', async () => {
    const fetcher = vi.fn().mockResolvedValue({ v: 1 });
    const { result } = renderHook(() => usePolling(fetcher, 60000));

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    const initialCallCount = fetcher.mock.calls.length;

    // Manual refresh
    await act(async () => {
      await result.current.refresh();
    });

    expect(fetcher.mock.calls.length).toBeGreaterThan(initialCallCount);
  });
});
