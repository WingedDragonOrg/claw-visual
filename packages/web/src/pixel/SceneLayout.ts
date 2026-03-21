import type { AgentStatus } from '../types';

export interface OfficeSlot {
  x: number;
  y: number;
  area: 'desk' | 'lounge' | 'edge';
}

const W = 1200;
const H = 500;

/** Zone boundaries */
const ZONES = {
  desk:   { x: 40,  y: 40,  w: W * 0.65, h: H * 0.7 },  // working area (top-left)
  lounge: { x: W * 0.67, y: 40,  w: W * 0.3,  h: H * 0.55 }, // rest area (top-right)
  edge:   { x: 40,  y: H * 0.72, w: W - 80,   h: H * 0.24 }, // offline/edge row (bottom)
};

function gridSlots(zone: typeof ZONES[keyof typeof ZONES], count: number, cols: number): OfficeSlot[] {
  const slots: OfficeSlot[] = [];
  const cellW = zone.w / Math.max(cols, 1);
  const rows = Math.ceil(count / cols);
  const cellH = zone.h / Math.max(rows, 1);
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    slots.push({
      x: zone.x + col * cellW + cellW / 2,
      y: zone.y + row * cellH + cellH / 2,
      area: 'desk',
    });
  }
  return slots;
}

const STATUS_ZONE: Record<AgentStatus, 'desk' | 'lounge' | 'edge'> = {
  online:  'desk',
  busy:    'desk',
  away:    'lounge',
  offline: 'edge',
  error:   'edge',
};

export interface ZonedAgentSlot extends OfficeSlot {
  agentIndex: number;
}

/**
 * Assigns office slots by agent status.
 * Returns a map of agentIndex → slot.
 */
export function assignSlotsByStatus(
  statuses: AgentStatus[]
): ZonedAgentSlot[] {
  const buckets: { zone: 'desk' | 'lounge' | 'edge'; agentIndex: number }[] = statuses.map(
    (s, i) => ({ zone: STATUS_ZONE[s], agentIndex: i })
  );

  const deskAgents  = buckets.filter((b) => b.zone === 'desk');
  const loungeAgents = buckets.filter((b) => b.zone === 'lounge');
  const edgeAgents  = buckets.filter((b) => b.zone === 'edge');

  const deskSlots   = gridSlots(ZONES.desk,   deskAgents.length,   4);
  const loungeSlots = gridSlots(ZONES.lounge,  loungeAgents.length, 2);
  const edgeSlots   = gridSlots(ZONES.edge,    edgeAgents.length,   6);

  const result: ZonedAgentSlot[] = new Array(statuses.length);

  deskAgents.forEach((b, i) => {
    result[b.agentIndex] = { ...deskSlots[i], area: 'desk', agentIndex: b.agentIndex };
  });
  loungeAgents.forEach((b, i) => {
    result[b.agentIndex] = { ...loungeSlots[i], area: 'lounge', agentIndex: b.agentIndex };
  });
  edgeAgents.forEach((b, i) => {
    result[b.agentIndex] = { ...edgeSlots[i], area: 'edge', agentIndex: b.agentIndex };
  });

  return result;
}

export { W as SCENE_W, H as SCENE_H, ZONES };
