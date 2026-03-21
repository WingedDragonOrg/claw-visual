import { Graphics, Text, TextStyle, Container } from 'pixi.js';
import type { Agent } from '../types';
import type { PixelState } from './types';
import { STATUS_TO_PIXEL } from './types';

const STATUS_COLORS: Record<PixelState, number> = {
  work:  0x22c55e,  // green
  idle:  0xeab308,  // yellow
  sleep: 0x6b7280,  // gray
  error: 0xef4444,  // red
};

/**
 * Placeholder sprite for a single Agent.
 * Renders as a colored pixel-art block + name label.
 * Will be replaced with AnimatedSprite once sprite sheets arrive.
 */
export class AgentSprite {
  container: Container;
  private block: Graphics;
  private label: Text;
  private agent: Agent;
  private animTick = 0;

  constructor(agent: Agent) {
    this.agent = agent;
    this.container = new Container();

    // Placeholder: 32×32 colored block
    this.block = new Graphics();
    this.container.addChild(this.block);

    // Name label
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
    this.label.position.set(16, 36);
    this.container.addChild(this.label);

    this.draw();
  }

  private draw() {
    const state = STATUS_TO_PIXEL[this.agent.status];
    const color = STATUS_COLORS[state];
    const pulse = state === 'error' && (this.animTick % 30 < 15);

    this.block.clear();
    // Pixel block with 1px border (simulates 8-bit sprite)
    this.block.rect(0, 0, 32, 32).fill({ color: pulse ? 0xff6666 : color });
    this.block.rect(2, 2, 28, 28).fill({ color: 0x000000, alpha: 0.2 });
    // Avatar initial
    const init = this.agent.avatar || this.agent.name[0];
    // tiny dot decoration
    this.block.rect(12, 10, 8, 8).fill({ color: 0xffffff, alpha: 0.5 });
  }

  /** Call from ticker to animate */
  tick() {
    this.animTick++;
    if (this.agent.status === 'error' && this.animTick % 15 === 0) {
      this.draw();
    }
  }

  moveTo(x: number, y: number) {
    this.container.position.set(x - 16, y - 16); // center
  }

  setState(agent: Agent) {
    const changed = this.agent.status !== agent.status;
    this.agent = agent;
    if (changed) this.draw();
  }

  destroy() {
    this.container.destroy({ children: true });
  }
}
