# #57 游戏化设计方案

## 积分规则（按小后建议）

| Agent 状态 | 积分/5min | 说明 |
|-----------|-----------|------|
| busy | +2 | 正在处理任务 |
| online | +1 | 正常在线工作 |
| away | 0 | 离开，0积分 |
| offline | 0 | 下线，0积分 |
| error | -1 | 异常状态，扣分 |

| 额外积分 | 分值 | 说明 |
|---------|------|------|
| 每处理1个issue | +5 | GitHub issues 关闭 |

**积分计算：** 每30秒 WebSocket 推送时，根据当前状态计算增量

## 数据结构

```typescript
interface AgentScore {
  agentId: string;
  agentName: string;
  totalScore: number;
  busyMinutes: number;
  onlineMinutes: number;
  errorMinutes: number;
  issuesResolved: number;
  lastUpdated: number;
}

interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string;
  score: number;
  status: AgentStatus;
}
```

## 排行榜 UI 方案

**位置：** 侧边栏底部，或者浮层面板（可展开/收起）

**显示内容：**
- 前3名：金色/银色/铜牌图标 + 名字 + 积分
- 其余：排名 + 名字 + 积分 + 状态徽章

**交互：**
- 点击条目 → 高亮对应 AgentSprite
- 悬停 → 显示详细统计（在线时长、忙碌时长）

**样式：** 像素风格卡片，排名数字大号显示

## 实现位置

- `packages/web/src/hooks/useGamification.ts` — 积分计算 hook
- `packages/web/src/components/Leaderboard.tsx` — 排行榜组件
- `packages/web/src/pages/PixelOffice.tsx` — 接入 useGamification

## 依赖

- WebSocket 推送 `agent-update` 事件（已有）
- WebSocket 推送 `github:refresh` 事件（已有）
- PixiApp 暴露 `highlightAgent(id)` 方法（待加）
