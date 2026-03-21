import type { AgentStatus } from '../types';

/** Pixel-layer status animation state */
export type PixelState = 'work' | 'idle' | 'sleep' | 'error';

/** Mapping from Agent status to pixel animation state */
export const STATUS_TO_PIXEL: Record<AgentStatus, PixelState> = {
  online:  'work',
  busy:    'work',
  away:    'idle',
  offline: 'sleep',
  error:   'error',
};

/** Position slot in the office scene for each agent */
export interface OfficeSlot {
  x: number;
  y: number;
  area: 'desk' | 'lounge' | 'edge';
}
