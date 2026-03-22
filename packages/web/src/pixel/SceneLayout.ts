/** Scene logical dimensions — expanded for Phase 4 */
export const SCENE_W = 1600;
export const SCENE_H = 700;

/** A fixed desk slot — each agent owns one permanently */
export interface DeskSlot {
  id: number;
  x: number;       // center
  y: number;
  area: 'desk' | 'lounge' | 'meeting' | 'edge';
}

/** Named waypoint for idle wandering / status transitions */
export interface Waypoint {
  name: string;
  x: number;
  y: number;
}

// ── Desk area (left 65%) ────────────────────────────────────────────────────
// Three rows of desks, 5 per row = 15 total desk slots
const DESK_LEFT = 60;
const DESK_TOP  = 80;
const DESK_COL_GAP = 190;  // distance between desk columns
const DESK_ROW_GAP = 160;  // distance between desk rows
const DESK_COLS = 5;
const DESK_ROWS = 3;

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

// ── Lounge area (bottom-right, relaxation zone) ───────────────────────────
export const LOUNGE_X = 1100;
export const LOUNGE_Y = 480;
export const LOUNGE_W = 300;
export const LOUNGE_H = 180;

export const LOUNGE_SPOTS: { x: number; y: number }[] = [
  { x: 1140, y: 530 },
  { x: 1200, y: 580 },
  { x: 1260, y: 530 },
  { x: 1320, y: 580 },
];

// ── Meeting room (top-right, collaboration zone) ────────────────────────────
export const MEETING_X = 1100;
export const MEETING_Y = 60;
export const MEETING_W = 440;
export const MEETING_H = 380;

// Meeting table positions (agents in a meeting are seated around the table)
export const MEETING_SPOTS: { x: number; y: number }[] = [
  { x: 1200, y: 200 },
  { x: 1260, y: 280 },
  { x: 1320, y: 200 },
  { x: 1260, y: 120 },
];

// General waypoints used for wandering
export const WAYPOINTS: Waypoint[] = [
  { name: 'water_dispenser', x: 1050, y: 440 },
  { name: 'bookshelf',       x: 80,   y: 480 },
  { name: 'hallway_center',  x: 800,  y: 440 },
  { name: 'meeting_entrance', x: 1100, y: 400 },
];

// ── Zone rectangles for background drawing ───────────────────────────────────
export const ZONES = {
  desk: {
    x: 20,
    y: 20,
    w: MEETING_X - 40,
    h: SCENE_H - 40,
  },
  lounge: {
    x: LOUNGE_X - 20,
    y: LOUNGE_Y - 20,
    w: LOUNGE_W + 20,
    h: LOUNGE_H + 20,
  },
  meeting: {
    x: MEETING_X - 20,
    y: MEETING_Y - 20,
    w: MEETING_W + 20,
    h: MEETING_H + 20,
  },
};

// ── Slot assignment ────────────────────────────────────────────────────────

export interface ZonedAgentSlot {
  agentIndex: number;
  deskSlot: DeskSlot | null;   // null for agents beyond desk count
  x: number;
  y: number;
  area: 'desk' | 'lounge' | 'meeting' | 'edge';
}

import type { AgentStatus } from '../types';

const STATUS_AREA: Record<AgentStatus, 'desk' | 'lounge' | 'meeting' | 'edge'> = {
  online:  'desk',
  busy:    'meeting',  // busy = in meeting
  away:    'lounge',
  offline: 'desk',    // stays at desk, just transparent
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

    if (area === 'meeting') {
      const spot = MEETING_SPOTS[i % MEETING_SPOTS.length];
      return { agentIndex: i, deskSlot: desk, x: spot.x, y: spot.y, area: 'meeting' };
    }

    return { agentIndex: i, deskSlot: desk, x: desk.x, y: desk.y, area: 'desk' };
  });
}
