import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { timeAgo } from './utils';

describe('timeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "刚刚" for less than 60 seconds', () => {
    const now = new Date('2024-01-15T12:00:00Z');
    vi.setSystemTime(now);

    const result = timeAgo('2024-01-15T11:59:30Z'); // 30 seconds ago
    expect(result).toBe('刚刚');
  });

  it('returns minutes for 1-59 minutes ago', () => {
    const now = new Date('2024-01-15T12:00:00Z');
    vi.setSystemTime(now);

    expect(timeAgo('2024-01-15T11:30:00Z')).toBe('30m');
    expect(timeAgo('2024-01-15T11:01:00Z')).toBe('59m');
    expect(timeAgo('2024-01-15T11:59:00Z')).toBe('1m');
  });

  it('returns hours for 1-23 hours ago', () => {
    const now = new Date('2024-01-15T12:00:00Z');
    vi.setSystemTime(now);

    expect(timeAgo('2024-01-15T00:00:00Z')).toBe('12h');
    expect(timeAgo('2024-01-14T13:00:00Z')).toBe('23h');
    expect(timeAgo('2024-01-15T11:00:00Z')).toBe('1h');
  });

  it('returns days for 24+ hours ago', () => {
    const now = new Date('2024-01-15T12:00:00Z');
    vi.setSystemTime(now);

    expect(timeAgo('2024-01-14T12:00:00Z')).toBe('1d');
    expect(timeAgo('2024-01-13T12:00:00Z')).toBe('2d');
    expect(timeAgo('2024-01-01T12:00:00Z')).toBe('14d');
  });

  it('handles ISO strings with timezone offset', () => {
    const now = new Date('2024-01-15T12:00:00+08:00');
    vi.setSystemTime(now);

    expect(timeAgo('2024-01-15T11:30:00+08:00')).toBe('30m');
  });
});
