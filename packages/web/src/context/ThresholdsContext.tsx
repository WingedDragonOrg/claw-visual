import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchThresholds, type ThresholdData } from '../api';

interface ThresholdsContextValue {
  thresholds: ThresholdData | null;
  isLoading: boolean;
}

const ThresholdsContext = createContext<ThresholdsContextValue>({
  thresholds: null,
  isLoading: true,
});

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Provides threshold data to the whole app.
 * Single fetch, shared by all StatusBadge instances.
 * Refreshes every 5 minutes so night-mode transitions are picked up.
 */
export function ThresholdsProvider({ children }: { children: ReactNode }) {
  const [thresholds, setThresholds] = useState<ThresholdData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchThresholds();
        if (!cancelled) {
          setThresholds(data);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) setIsLoading(false);
        // thresholds stays null → StatusBadge uses static fallback
      }
    };

    load();
    const timer = setInterval(load, REFRESH_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <ThresholdsContext.Provider value={{ thresholds, isLoading }}>
      {children}
    </ThresholdsContext.Provider>
  );
}

export function useThresholds(): ThresholdsContextValue {
  return useContext(ThresholdsContext);
}
