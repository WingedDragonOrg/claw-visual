import { useState, type ReactNode } from 'react';

interface PanelProps {
  children: ReactNode;
  side?: 'left' | 'right';
  title?: string;
  defaultCollapsed?: boolean;
  collapsible?: boolean;
  width?: number;
  className?: string;
}

/**
 * Collapsible side panel with pixel-style border.
 * Collapses to a thin toggle strip on mobile or when toggled.
 */
export function Panel({
  children,
  side = 'left',
  title,
  defaultCollapsed = false,
  collapsible = true,
  width = 280,
  className = '',
}: PanelProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <aside
      className={[
        'ui-panel',
        `ui-panel--${side}`,
        collapsed ? 'ui-panel--collapsed' : '',
        className,
      ].join(' ')}
      style={{ '--panel-width': `${width}px` } as React.CSSProperties}
    >
      {collapsible && (
        <button
          className="ui-panel__toggle"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
          title={collapsed ? '点击展开' : '点击收起'}
        >
          {collapsed
            ? (side === 'left' ? '▶ 展开' : '◀ 展开')
            : (side === 'left' ? '◀' : '▶')}
        </button>
      )}

      {!collapsed && (
        <div className="ui-panel__body">
          {title && <div className="ui-panel__title">{title}</div>}
          {children}
        </div>
      )}
    </aside>
  );
}
