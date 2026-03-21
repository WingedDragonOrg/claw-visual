import { useMemo } from 'react';
import type { Activity } from '../types';

interface Props {
  activities: Activity[];
}

interface HourlyActivity {
  hour: number;
  count: number;
  level: number; // 0-4
}

function aggregateByHourOfDay(activities: Activity[]): HourlyActivity[] {
  const counts = new Array(24).fill(0);

  for (const a of activities) {
    const hour = new Date(a.timestamp).getHours();
    counts[hour]++;
  }

  const max = Math.max(...counts, 1);
  const levels = counts.map(count => {
    if (count === 0) return 0;
    const ratio = count / max;
    if (ratio < 0.25) return 1;
    if (ratio < 0.5) return 2;
    if (ratio < 0.75) return 3;
    return 4;
  });

  return counts.map((count, hour) => ({
    hour,
    count,
    level: levels[hour],
  }));
}

const HOUR_LABELS = [
  '0时', '1时', '2时', '3时', '4时', '5时',
  '6时', '7时', '8时', '9时', '10时', '11时',
  '12时', '13时', '14时', '15时', '16时', '17时',
  '18时', '19时', '20时', '21时', '22时', '23时',
];

export function ActivityHeatmap({ activities }: Props) {
  const hourlyData = useMemo(() => aggregateByHourOfDay(activities), [activities]);

  return (
    <div className="activity-heatmap">
      <h2 className="section-title">活跃度热力图</h2>
      <div className="heatmap-grid">
        {hourlyData.map(({ hour, count, level }) => (
          <div
            key={hour}
            className={`heatmap-cell level-${level}`}
            title={`${HOUR_LABELS[hour]} - ${count} 次活动`}
          >
            <span className="heatmap-hour">{hour}</span>
          </div>
        ))}
      </div>
      <div className="heatmap-legend">
        <span className="legend-label">少</span>
        {[0, 1, 2, 3, 4].map(level => (
          <div key={level} className={`legend-cell level-${level}`} />
        ))}
        <span className="legend-label">多</span>
      </div>
    </div>
  );
}
