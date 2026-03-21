import { Graphics, Text, TextStyle, Container, Spritesheet, Texture, AnimatedSprite, Assets } from 'pixi.js';
import type { Agent } from '../types';
import type { PixelState } from './types';
import { STATUS_TO_PIXEL } from './types';

// Maps agent id → sprite sheet path in /public/sprites/
const SPRITE_SHEETS: Partial<Record<string, string>> = {
  'xiaoai': '/sprites/agent-xiaoai.png',
};

/** Frame size in the generated sprite sheet */
const FRAME_W = 64;
const FRAME_H = 64;
const COLS = 4;

/** Row index per animation state in the sheet */
const ANIM_ROW: Record<PixelState, number> = {
  idle:  0,
  work:  1,
  sleep: 2,
  error: 0, // reuse idle row, will apply tint
};

/** Frames per animation row */
const ANIM_FRAMES: Record<PixelState, number> = {
  idle:  4,
  work:  4,
  sleep: 2,
  error: 4,
};

const STATUS_COLORS: Record<PixelState, number> = {
  work:  0x22c55e,
  idle:  0xeab308,
  sleep: 0x6b7280,
  error: 0xef4444,
};

/**
 * Agent sprite — uses real AnimatedSprite if a sprite sheet is available,
 * falls back to colored placeholder block otherwise.
 */
export class AgentSprite {
  container: Container;
  private agent: Agent;
  private animated: AnimatedSprite | null = null;
  private placeholder: Graphics | null = null;
  private label: Text;
  private animTick = 0;
  private currentState: PixelState;

  constructor(agent: Agent) {
    this.agent = agent;
    this.container = new Container();
    this.currentState = STATUS_TO_PIXEL[agent.status];

    // Name label (shared for both modes)
    this.label = new Text({
      text: agent.name.slice(0, 4),
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 8,
        fill: 0xffffff,
        align: 'center',
      }),
    });
    this.label.anchor.set(0.5, 0);
    this.label.position.set(32, 68); // below 64px sprite
    this.container.addChild(this.label);

    // Try to load sprite sheet, fall back to placeholder
    const agentKey = this.getAgentKey(agent);
    const sheetPath = SPRITE_SHEETS[agentKey];
    if (sheetPath) {
      this.loadSheet(sheetPath);
    } else {
      this.drawPlaceholder();
    }
  }

  private getAgentKey(agent: Agent): string {
    // Match by name patterns (simplified, expand as more sheets arrive)
    const name = agent.name.toLowerCase().replace(/\s/g, '');
    if (name.includes('爱')) return 'xiaoai';
    return agent.id.toLowerCase();
  }

  private async loadSheet(path: string) {
    try {
      const texture = await Assets.load<Texture>(path);
      const baseTexture = texture.source;

      // Build frames from the sprite sheet
      const frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }> = {};
      const animations: Record<string, string[]> = {};

      (['idle', 'work', 'sleep', 'error'] as PixelState[]).forEach((state) => {
        const row = ANIM_ROW[state];
        const count = ANIM_FRAMES[state];
        const keys: string[] = [];
        for (let col = 0; col < count; col++) {
          const key = `${state}_${col}`;
          frames[key] = { frame: { x: col * FRAME_W, y: row * FRAME_H, w: FRAME_W, h: FRAME_H } };
          keys.push(key);
        }
        animations[state] = keys;
      });

      const sheet = new Spritesheet(texture, {
        frames,
        animations,
        meta: { scale: 1 },
      });
      await sheet.parse();

      // Remove placeholder if it was added while loading
      if (this.placeholder) {
        this.container.removeChild(this.placeholder);
        this.placeholder.destroy();
        this.placeholder = null;
      }

      const textures = sheet.animations[this.currentState] ?? sheet.animations['idle'];
      const anim = new AnimatedSprite(textures);
      anim.animationSpeed = this.currentState === 'sleep' ? 0.04 : 0.08;
      anim.loop = true;
      anim.play();
      this.animated = anim;
      this.container.addChildAt(anim, 0);

      // Reposition label below sprite
      this.label.position.set(32, 68);
    } catch (err) {
      console.warn('[AgentSprite] Failed to load sprite sheet, using placeholder:', err);
      if (!this.placeholder) this.drawPlaceholder();
    }
  }

  private drawPlaceholder() {
    if (!this.placeholder) {
      const g = new Graphics();
      this.container.addChildAt(g, 0);
      this.placeholder = g;
      this.label.position.set(16, 36);
    }

    const state = this.currentState;
    const color = STATUS_COLORS[state];
    const pulse = state === 'error' && (this.animTick % 30 < 15);

    this.placeholder.clear();
    this.placeholder.rect(0, 0, 32, 32).fill({ color: pulse ? 0xff6666 : color });
    this.placeholder.rect(2, 2, 28, 28).fill({ color: 0x000000, alpha: 0.2 });
    this.placeholder.rect(12, 10, 8, 8).fill({ color: 0xffffff, alpha: 0.5 });
  }

  tick() {
    this.animTick++;
    if (this.placeholder && this.agent.status === 'error' && this.animTick % 15 === 0) {
      this.drawPlaceholder();
    }
  }

  moveTo(x: number, y: number) {
    this.container.position.set(x - 32, y - 32);
  }

  setState(agent: Agent) {
    const newState = STATUS_TO_PIXEL[agent.status];
    const changed = this.currentState !== newState;
    this.agent = agent;
    this.currentState = newState;

    if (changed) {
      if (this.animated) {
        // Switch animation on real sprite
        // (re-parse not needed — reuse existing sheet textures via tag)
        this.animated.stop();
        this.animated.gotoAndPlay(0);
      } else {
        this.drawPlaceholder();
      }
    }
  }

  destroy() {
    this.animated?.destroy();
    this.placeholder?.destroy();
    this.container.destroy({ children: true });
  }
}
