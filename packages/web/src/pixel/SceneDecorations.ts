import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { SCENE_W, SCENE_H, ZONES } from './SceneLayout';

/** A decorative monitor placed at each desk slot */
interface Monitor {
  g: Graphics;
  agentId: string | null;
  online: boolean;
}

/** Cloud instance */
interface Cloud {
  g: Graphics;
  speed: number;
  startX: number;
}

/** Plant instance */
interface Plant {
  g: Graphics;
  phase: number; // sin wave phase offset
}

export class SceneDecorations {
  readonly container: Container;
  private monitors: Monitor[] = [];
  private clouds: Cloud[] = [];
  private plants: Plant[] = [];

  constructor() {
    this.container = new Container();
    this.buildPlants();
    this.buildClouds();
  }

  // ─── Plants ───────────────────────────────────────────
  private buildPlants() {
    const positions = [
      { x: ZONES.lounge.x + ZONES.lounge.w - 20, y: ZONES.lounge.y + ZONES.lounge.h - 10 },
      { x: ZONES.desk.x + ZONES.desk.w - 16,     y: ZONES.desk.y + 4 },
    ];

    for (const pos of positions) {
      const g = new Graphics();
      this.drawPlant(g);
      // Set pivot at bottom center so it rocks around the stem base
      g.pivot.set(0, 20);
      g.position.set(pos.x, pos.y);
      this.container.addChild(g);
      this.plants.push({ g, phase: Math.random() * Math.PI * 2 });
    }
  }

  private drawPlant(g: Graphics) {
    g.clear();
    // Pot
    g.rect(-6, 12, 12, 8).fill({ color: 0x8b5e3c });
    g.rect(-5, 11, 10, 2).fill({ color: 0x6d4a2f });
    // Stem
    g.rect(-1, 2, 2, 10).fill({ color: 0x4a7c3f });
    // Leaves
    g.ellipse(-6, 5, 7, 4).fill({ color: 0x3a9c35 });
    g.ellipse(6, 3, 7, 4).fill({ color: 0x2d8a28 });
    g.ellipse(0, -2, 5, 6).fill({ color: 0x45b03a });
  }

  // ─── Clouds ───────────────────────────────────────────
  private buildClouds() {
    const cloudDefs = [
      { x: 100,  y: 18, w: 70, speed: 0.25 },
      { x: 700,  y: 10, w: 50, speed: 0.15 },
    ];
    for (const def of cloudDefs) {
      const g = new Graphics();
      this.drawCloud(g, def.w);
      g.position.set(def.x, def.y);
      g.alpha = 0.35;
      this.container.addChild(g);
      this.clouds.push({ g, speed: def.speed, startX: def.x });
    }
  }

  private drawCloud(g: Graphics, w: number) {
    const h = w * 0.45;
    g.clear();
    g.ellipse(0, 0, w * 0.5, h * 0.6).fill({ color: 0xddeeff });
    g.ellipse(w * 0.22, -h * 0.2, w * 0.35, h * 0.5).fill({ color: 0xe8f4ff });
    g.ellipse(-w * 0.2, -h * 0.1, w * 0.3, h * 0.42).fill({ color: 0xddeeff });
  }

  // ─── Monitors ─────────────────────────────────────────
  /** Call after SceneLayout slots are known — place one monitor per slot */
  setMonitorSlots(slots: { x: number; y: number; agentId: string | null; online: boolean }[]) {
    // Remove old monitors
    for (const m of this.monitors) m.g.destroy();
    this.monitors = [];

    for (const slot of slots) {
      const g = new Graphics();
      this.drawMonitor(g, slot.online);
      // Position behind agent (slightly above their feet)
      g.position.set(slot.x - 24, slot.y - 40);
      this.container.addChildAt(g, 0); // render below agents
      this.monitors.push({ g, agentId: slot.agentId, online: slot.online });
    }
  }

  private drawMonitor(g: Graphics, online: boolean) {
    g.clear();
    // Desk surface
    g.rect(0, 20, 48, 6).fill({ color: 0x7a5c3a });
    // Monitor stand
    g.rect(22, 12, 4, 10).fill({ color: 0x555566 });
    // Monitor frame
    g.rect(4, 0, 40, 14).fill({ color: 0x333344 });
    // Screen
    const screenColor = online ? 0x2266ee : 0x223333;
    g.rect(6, 2, 36, 10).fill({ color: screenColor });
  }

  updateMonitorStatus(agentId: string, online: boolean) {
    const m = this.monitors.find((mon) => mon.agentId === agentId);
    if (!m || m.online === online) return;
    m.online = online;
    this.drawMonitor(m.g, online);
  }

  // ─── Tick ─────────────────────────────────────────────
  tick(elapsed: number, deltaTime: number) {
    // Plants sway
    for (const plant of this.plants) {
      plant.g.rotation = Math.sin(elapsed * 1.1 + plant.phase) * 0.04;
    }

    // Clouds drift left to right
    for (const cloud of this.clouds) {
      cloud.g.x += cloud.speed * deltaTime;
      if (cloud.g.x > SCENE_W + 100) {
        cloud.g.x = -120;
      }
    }

    // Online monitor screen flicker (subtle)
    for (const mon of this.monitors) {
      if (!mon.online) continue;
      // subtle brightness pulse on the screen rect — re-draw would be expensive, use tint
      const pulse = 0.92 + Math.sin(elapsed * 1.8 + this.monitors.indexOf(mon)) * 0.08;
      mon.g.alpha = pulse;
    }
  }
}

// ─── Status Bubbles ───────────────────────────────────
/** Creates a floating status bubble (bubble, error) above a sprite container */
export class StatusBubble {
  readonly container: Container;
  private phase: number;
  private label: Text;
  private bg: Graphics;

  constructor(emoji: string, bgColor: number) {
    this.phase = Math.random() * Math.PI * 2;
    this.container = new Container();

    this.bg = new Graphics();
    this.bg.roundRect(-12, -12, 24, 24, 6).fill({ color: bgColor, alpha: 0.85 });
    this.container.addChild(this.bg);

    this.label = new Text({
      text: emoji,
      style: new TextStyle({ fontSize: 14, align: 'center' }),
    });
    this.label.anchor.set(0.5, 0.5);
    this.container.addChild(this.label);
  }

  tick(elapsed: number) {
    this.container.y = Math.sin(elapsed * 2.5 + this.phase) * 2.5;
  }

  destroy() {
    this.container.destroy({ children: true });
  }
}
