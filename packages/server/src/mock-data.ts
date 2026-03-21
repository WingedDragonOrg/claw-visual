import type { Agent, Activity } from './types.js';

const now = () => new Date().toISOString();
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export function getMockAgents(): Agent[] {
  return [
    {
      id: 'xiaochan',
      name: '小产',
      role: '产品经理',
      status: 'online',
      lastSeen: minutesAgo(1),
      avatar: 'XC',
      pendingTasks: 3,
      heartbeatFailures: 0,
    },
    {
      id: 'xiaojia',
      name: '小架',
      role: '技术架构/开发',
      status: 'busy',
      lastSeen: minutesAgo(8),
      avatar: 'XJ',
      pendingTasks: 5,
      heartbeatFailures: 0,
    },
    {
      id: 'xiakai',
      name: '小开',
      role: '前端/后端开发',
      status: 'online',
      lastSeen: minutesAgo(3),
      avatar: 'XK',
      pendingTasks: 4,
      heartbeatFailures: 0,
    },
    {
      id: 'xiaoshen',
      name: '小审',
      role: '质量审核',
      status: 'away',
      lastSeen: minutesAgo(15),
      avatar: 'XS',
      pendingTasks: 0,
      heartbeatFailures: 0,
    },
    {
      id: 'xiaocce',
      name: '小测',
      role: '测试',
      status: 'error',
      lastSeen: minutesAgo(45),
      avatar: 'XT',
      pendingTasks: 2,
      heartbeatFailures: 3,
    },
    {
      id: 'main',
      name: '小爱同学',
      role: '私人助理',
      status: 'offline',
      lastSeen: minutesAgo(120),
      avatar: 'XA',
      pendingTasks: 0,
      heartbeatFailures: 0,
    },
    // 未初始化的 agents（无 IDENTITY.md）
    {
      id: 'jiangong',
      name: '',
      role: '',
      status: 'offline',
      lastSeen: minutesAgo(300),
      avatar: '',
      pendingTasks: 0,
      heartbeatFailures: 0,
      uninitialized: true,
    },
    {
      id: 'meishu',
      name: '',
      role: '',
      status: 'offline',
      lastSeen: minutesAgo(400),
      avatar: '',
      pendingTasks: 0,
      heartbeatFailures: 0,
      uninitialized: true,
    },
    {
      id: 'xiaozhi',
      name: '',
      role: '',
      status: 'offline',
      lastSeen: minutesAgo(500),
      avatar: '',
      pendingTasks: 0,
      heartbeatFailures: 0,
      uninitialized: true,
    },
  ];
}

export function getMockActivities(): Activity[] {
  return [
    { id: '1', agentId: 'xiaochan', agentName: '小产', action: '更新需求', detail: '完成 Phase 1 PRD 评审', timestamp: minutesAgo(2) },
    { id: '2', agentId: 'xiaojia', agentName: '小架', action: '提交代码', detail: '实现用户认证模块 feat/auth', timestamp: minutesAgo(5) },
    { id: '3', agentId: 'xiaoshen', agentName: '小审', action: '完成审核', detail: 'PR #42 代码审核通过', timestamp: minutesAgo(18) },
    { id: '4', agentId: 'xiaocce', agentName: '小测', action: '报告异常', detail: '心跳检测连续失败', timestamp: minutesAgo(40) },
    { id: '5', agentId: 'main', agentName: '小爱同学', action: '定时任务', detail: '日报汇总已生成', timestamp: minutesAgo(90) },
    { id: '6', agentId: 'xiaojia', agentName: '小架', action: '创建分支', detail: '新建 feat/dashboard 分支', timestamp: minutesAgo(10) },
    { id: '7', agentId: 'xiaochan', agentName: '小产', action: '创建任务', detail: '添加 5 个新 backlog 条目', timestamp: minutesAgo(4) },
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function getMockActivitiesForAgent(agentId: string): Activity[] {
  return getMockActivities().filter(a => a.agentId === agentId);
}