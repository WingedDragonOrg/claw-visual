import type { Activity } from '../types';
import { timeAgo } from '../utils';

const ACTION_CLASSES: Record<string, string> = {
  '\u4ee3\u7801\u5ba1\u67e5': 'action-review',
  '\u6d4b\u8bd5\u9a8c\u8bc1': 'action-test',
  '\u6784\u5efa\u90e8\u7f72': 'action-deploy',
  '\u9700\u6c42\u5de5\u4f5c': 'action-plan',
  '\u5fc3\u8df3\u68c0\u6d4b': 'action-heartbeat',
  '\u5de5\u4f5c': 'action-work',
};

const ACTION_NODES: Record<string, string> = {
  '\u4ee3\u7801\u5ba1\u67e5': 'node-review',
  '\u6d4b\u8bd5\u9a8c\u8bc1': 'node-test',
  '\u6784\u5efa\u90e8\u7f72': 'node-deploy',
  '\u9700\u6c42\u5de5\u4f5c': 'node-plan',
  '\u5fc3\u8df3\u68c0\u6d4b': 'node-heartbeat',
  '\u5de5\u4f5c': 'node-work',
};

const ACTION_ICONS: Record<string, string> = {
  '\u4ee3\u7801\u5ba1\u67e5': '\uD83D\uDD0D',
  '\u6d4b\u8bd5\u9a8c\u8bc1': '\u2705',
  '\u6784\u5efa\u90e8\u7f72': '\uD83D\uDE80',
  '\u9700\u6c42\u5de5\u4f5c': '\uD83D\uDCCB',
  '\u5fc3\u8df3\u68c0\u6d4b': '\uD83D\uDC93',
  '\u5de5\u4f5c': '\u2699\uFE0F',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function ActivityFeed({ activities }: { activities: Activity[] }) {
  if (!activities.length) {
    return <div className="empty-state">No recent activity</div>;
  }

  return (
    <div className="activity-list">
      {activities.map((a) => (
        <div key={a.id} className="activity-item">
          <div className={`activity-node ${ACTION_NODES[a.action] || 'node-work'}`}>
            <span>{ACTION_ICONS[a.action] || '\u2699\uFE0F'}</span>
          </div>
          <div className="activity-avatar">{a.agentName.slice(0, 1)}</div>
          <div className="activity-content">
            <div className="activity-header">
              <span className="activity-name">{a.agentName}</span>
              <span className={`activity-action ${ACTION_CLASSES[a.action] || ''}`}>
                {a.action}
              </span>
              <span className="activity-time" title={formatTime(a.timestamp)}>
                {timeAgo(a.timestamp)}
              </span>
            </div>
            <div className="activity-detail">{a.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
