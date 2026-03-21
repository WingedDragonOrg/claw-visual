/** Scene logical dimensions */
export const SCENE_W = 1200;
export const SCENE_H = 500;

/** A fixed desk slot — each agent owns one permanently */
export interface DeskSlot {
  id: number;
  x: number;       // center
  y: number;
  area: 'desk' | 'lounge' | 'edge';
}

/** Named waypoint for idle wandering / status transitions */
export interface Waypoint {
  name: string;
  x: number;
  y: number;
}

// ── Fixed desk grid ────────────────────────────────────────────────────────
// Two rows of desks on the left ⅔ of the scene (4 per row = 8 total).
// Right portion is the lounge.
const DESK_LEFT = 80;
const DESK_TOP  = 80;
const DESK_COL_GAP = 200;  // distance between desk columns
const DESK_ROW_GAP = 170;  // distance between desk rows
const DESK_COLS = 4;
const DESK_ROWS = 2;

export const DESK_SLOTS: DeskSlot[] = [];
for (let row = 0; row < DESK_ROWS; row++) {
  for (let col = 0; col < DESK_COLS; col++) {
    DESK_SLOTS.push({
      id: row * DESK_COLS + col,
      x: DESK_LEFT + col * DESK_COL_GAP + DESK_COL_GAP / 2,
      y: DESK_TOP + row * DESK_ROW_GAP + DESK_ROW_GAP / 2,
      area: 'desk',
    });
  }
}

// Lounge area (right side)
export const LOUNGE_X = 900;
export const LOUNGE_Y = 80;
export const LOUNGE_W = 260;
export const LOUNGE_H = 280;

// Lounge waypoints (sofa + coffee table spots)
export const LOUNGE_SPOTS: { x: number; y: number }[] = [
  { x: 930, y: 160 },
  { x: 1000, y: 200 },
  { x: 1060, y: 160 },
  { x: 1110, y: 200 },
];

// General waypoints used for wandering
export const WAYPOINTS: Waypoint[] = [
  { name: 'water_dispenser', x: 840,  y: 420 },
  { name: 'bookshelf',       x: 100,  y: 440 },
  { name: 'hallway_center',  x: 600,  y: 440 },
];

/** Zone rectangles for background drawing */
export const ZONES = {
  desk: {
    x: 20,
    y: 20,
    w: SCENE_W * 0.67,
    h: SCENE_H - 40,
  },
  lounge: {
    x: LOUNGE_X - 20,
    y: LOUNGE_Y - 20,
    w: LOUNGE_W + 20,
    h: LOUNGE_H + 20,
  },
};

// ── Slot assignment ────────────────────────────────────────────────────────

export interface ZonedAgentSlot {
  agentIndex: number;
  deskSlot: DeskSlot | null;   // null for agents beyond desk count
  x: number;
  y: number;
  area: 'desk' | 'lounge' | 'edge';
}

import type { AgentStatus } from '../types';

const STATUS_AREA: Record<AgentStatus, 'desk' | 'lounge' | 'edge'> = {
  online:  'desk',
  busy:    'desk',
  away:    'lounge',
  offline: 'desk',   // stays at desk, just transparent
  error:   'desk',
};

/**
 * Assigns a fixed desk slot to each agent by index.
 * Agents beyond DESK_SLOTS.length share overflow positions.
 */
export function assignFixedSlots(
  count: number,
  statuses: AgentStatus[]
): ZonedAgentSlot[] {
  return statuses.map((status, i) => {
    const desk = DESK_SLOTS[i % DESK_SLOTS.length];
    const area = STATUS_AREA[status];

    if (area === 'lounge') {
      const spot = LOUNGE_SPOTS[i % LOUNGE_SPOTS.length];
      return { agentIndex: i, deskSlot: desk, x: spot.x, y: spot.y, area: 'lounge' };
    }

    return { agentIndex: i, deskSlot: desk, x: desk.x, y: desk.y, area: 'desk' };
  });
}
