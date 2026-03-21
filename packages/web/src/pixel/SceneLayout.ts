import type { OfficeSlot } from './types';

const DESK_COLOR = 0x2a2a4a;
const LOUNGE_COLOR = 0x1a3a2a;
const EDGE_COLOR = 0x2a1a1a;

/**
 * Assigns office positions to agents.
 * Desk area (online/busy), lounge (away), edge (offline/error).
 */
export function assignSlots(count: number): OfficeSlot[] {
  const slots: OfficeSlot[] = [];
  const SCENE_W = 1200;
  const SCENE_H = 500;

  // Desk area: top 60% of scene, 3 columns
  const deskCols = 3;
  const deskRows = Math.ceil(count / deskCols);
  for (let i = 0; i < count; i++) {
    const col = i % deskCols;
    const row = Math.floor(i / deskCols);
    slots.push({
      x: 120 + col * (SCENE_W / deskCols - 40),
      y: 80 + row * ((SCENE_H * 0.6) / Math.max(deskRows, 1)),
      area: 'desk',
    });
  }
  return slots;
}

/** Background color for each area zone */
export function areaColor(area: OfficeSlot['area']): number {
  switch (area) {
    case 'desk':   return DESK_COLOR;
    case 'lounge': return LOUNGE_COLOR;
    case 'edge':   return EDGE_COLOR;
  }
}
