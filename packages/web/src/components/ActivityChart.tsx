import { useState, useMemo } from 'react';
import type { Activity } from '../types';

interface Props {
  activities: Activity[];
}

type TimeRange = '24h' | '7d';

function aggregateByHour(activities: Activity[], hours: number): { label: string; count: number }[] {
  const now = Date.now();
  const cutoff = now - hours * 3_600_000;
  const filtered = activities.filter(a => new Date(a.timestamp).getTime() >= cutoff);

  const bucketCount = hours <= 24 ? 24 : 7;
  const bucketMs = (hours * 3_600_000) / bucketCount;
  const buckets: number[] = new Array(bucketCount).fill(0);

  for (const a of filtered) {
    const t = new Date(a.timestamp).getTime();
    const idx = Math.min(Math.floor((t - cutoff) / bucketMs), bucketCount - 1);
    if (idx >= 0) buckets[idx]++;
  }

  return buckets.map((count, i) => {
    const bucketTime = new Date(cutoff + i * bucketMs);
    const label = hours <= 24
      ? bucketTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
      : bucketTime.toLocaleDateString('zh-CN', { weekday: 'short' });
    return { label, count };
  });
}

export function ActivityChart({ activities }: Props) {
  const [range, setRange] = useState<TimeRange>('24h');

  const data = useMemo(() => {
    const hours = range === '24h' ? 24 : 168;
    return aggregateByHour(activities, hours);
  }, [activities, range]);

  const maxCount = Math.max(...data.map(d => d.count), 1);

  const W = 560;
  const H = 200;
  const PAD_LEFT = 32;
  const PAD_RIGHT = 12;
  const PAD_TOP = 16;
  const PAD_BOTTOM = 28;
  const chartW = W - PAD_LEFT - PAD_RIGHT;
  const chartH = H - PAD_TOP - PAD_BOTTOM;

  const points = data.map((d, i) => {
    const x = PAD_LEFT + (i / (data.length - 1)) * chartW;
    const y = PAD_TOP + chartH - (d.count / maxCount) * chartH;
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaD = `${pathD} L${points[points.length - 1].x},${PAD_TOP + chartH} L${points[0].x},${PAD_TOP + chartH} Z`;

  const yTicks = [0, Math.round(maxCount / 2), maxCount];

  const labelStep = range === '24h' ? 6 : 1;

  return (
    <div className="activity-chart">
      <div className="activity-chart-header">
        <h2 className="section-title">Activity Trends</h2>
        <div className="chart-range-tabs">
          <button
            className={`chart-tab ${range === '24h' ? 'active' : ''}`}
            onClick={() => setRange('24h')}
          >
            24h
          </button>
          <button
            className={`chart-tab ${range === '7d' ? 'active' : ''}`}
            onClick={() => setRange('7d')}
          >
            7d
          </button>
        </div>
      </div>
      <div className="activity-chart-body">
        <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg">
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {yTicks.map(tick => {
            const y = PAD_TOP + chartH - (tick / maxCount) * chartH;
            return (
              <g key={tick}>
                <line x1={PAD_LEFT} y1={y} x2={W - PAD_RIGHT} y2={y} stroke="var(--border)" strokeDasharray="3,3" />
                <text x={PAD_LEFT - 6} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize="10">
                  {tick}
                </text>
              </g>
            );
          })}

          <path d={areaD} fill="url(#chartGrad)" />
          <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--accent)" opacity={p.count > 0 ? 1 : 0.3} />
          ))}

          {points.map((p, i) => (
            i % labelStep === 0 ? (
              <text key={`label-${i}`} x={p.x} y={H - 6} textAnchor="middle" fill="var(--text-muted)" fontSize="9">
                {p.label}
              </text>
            ) : null
          ))}
        </svg>
      </div>
    </div>
  );
}
