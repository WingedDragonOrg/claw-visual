import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { SCENE_W, DESK_SLOTS, LOUNGE_X, LOUNGE_Y, LOUNGE_W, LOUNGE_H, WAYPOINTS } from './SceneLayout';

/** A decorative monitor placed at each desk slot */
interface MonitorEntry {
  g: Graphics;
  agentId: string;
  online: boolean;
}

interface Cloud {
  g: Graphics;
  speed: number;
}

interface Plant {
  g: Graphics;
  phase: number;
}

export class SceneDecorations {
  readonly container: Container;
  private monitors: MonitorEntry[] = [];
  private clouds: Cloud[] = [];
  private plants: Plant[] = [];

  constructor() {
    this.container = new Container();
    this.drawOfficeFurniture();
    this.buildPlants();
    this.buildClouds();
  }

  // ─── Static Office Furniture ──────────────────────────────────────────────
  private drawOfficeFurniture() {
    const g = new Graphics();

    // ── Floor tiles (checkerboard) ────────────────────────────────────────
    for (let x = 0; x < 1200; x += 40) {
      for (let y = 0; y < 500; y += 40) {
        const shade = ((x / 40 + y / 40) % 2 === 0) ? 0x1a1a2e : 0x16213e;
        g.rect(x, y, 40, 40).fill({ color: shade });
      }
    }

    // ── Desks ─────────────────────────────────────────────────────────────
    for (const slot of DESK_SLOTS) {
      const dx = slot.x - 60, dy = slot.y - 20;
      // Desk surface
      g.rect(dx, dy, 120, 14).fill({ color: 0x8b5e3c });
      g.rect(dx, dy, 120, 3).fill({ color: 0xa0724a }); // highlight edge
      // Desk legs
      g.rect(dx + 4, dy + 14, 6, 16).fill({ color: 0x6b4a2a });
      g.rect(dx + 110, dy + 14, 6, 16).fill({ color: 0x6b4a2a });
      // Chair
      g.rect(dx + 36, dy + 30, 48, 6).fill({ color: 0x3a3a5c }); // seat
      g.rect(dx + 44, dy + 36, 32, 14).fill({ color: 0x2e2e4a }); // base
      g.rect(dx + 44, dy + 14, 32, 18).fill({ color: 0x3a3a5c }); // back
    }

    // ── Lounge area ───────────────────────────────────────────────────────
    const lx = LOUNGE_X, ly = LOUNGE_Y;
    // Room divider
    g.rect(lx - 8, ly - 20, 4, LOUNGE_H + 30).fill({ color: 0x2a2a4a });

    // Sofa left
    g.rect(lx + 10, ly + 60, 100, 40).fill({ color: 0x3d5a80 }); // body
    g.rect(lx + 10, ly + 55, 100, 8).fill({ color: 0x4a6f9c });  // back cushion
    g.rect(lx + 10, ly + 60, 8, 40).fill({ color: 0x2d4a6e });   // left arm
    g.rect(lx + 102, ly + 60, 8, 40).fill({ color: 0x2d4a6e });  // right arm
    // Sofa right
    g.rect(lx + 130, ly + 60, 80, 40).fill({ color: 0x3d5a80 });
    g.rect(lx + 130, ly + 55, 80, 8).fill({ color: 0x4a6f9c });
    g.rect(lx + 130, ly + 60, 8, 40).fill({ color: 0x2d4a6e });
    g.rect(lx + 202, ly + 60, 8, 40).fill({ color: 0x2d4a6e });
    // Coffee table
    g.rect(lx + 60, ly + 110, 90, 50).fill({ color: 0x6b4a2a });
    g.rect(lx + 60, ly + 108, 90, 4).fill({ color: 0x8b6040 });
    // Coffee mug on table
    g.rect(lx + 90, ly + 115, 10, 12).fill({ color: 0xdddddd });
    g.rect(lx + 92, ly + 117, 6, 8).fill({ color: 0x8b4513 }); // coffee

    // ── Bookshelf (left wall) ─────────────────────────────────────────────
    g.rect(20, 30, 20, 160).fill({ color: 0x5a3e2b });
    for (let shelf = 0; shelf < 4; shelf++) {
      const sy = 40 + shelf * 36;
      // Books
      const bookColors = [0xcc4444, 0x4444cc, 0x44aa44, 0xaaaa22, 0xaa4488, 0x22aaaa];
      for (let b = 0; b < 4; b++) {
        g.rect(22 + b * 4, sy, 3, 28).fill({ color: bookColors[(shelf * 4 + b) % bookColors.length] });
      }
      // Shelf board
      g.rect(18, sy + 30, 24, 3).fill({ color: 0x7a5a3a });
    }

    // ── Water dispenser ───────────────────────────────────────────────────
    const wx = WAYPOINTS.find(w => w.name === 'water_dispenser')!;
    g.rect(wx.x - 12, wx.y - 40, 24, 40).fill({ color: 0xccddee }); // body
    g.rect(wx.x - 8,  wx.y - 50, 16, 12).fill({ color: 0x88aacc }); // bottle
    g.rect(wx.x - 10, wx.y - 10, 8, 6).fill({ color: 0x4477aa });   // tap

    // ── Top wall ─────────────────────────────────────────────────────────
    g.rect(0, 0, 1200, 18).fill({ color: 0x252540 });
    // Windows on top wall
    for (const wx_win of [180, 380, 580]) {
      g.rect(wx_win, 2, 80, 14).fill({ color: 0x8ec5fc, alpha: 0.7 }); // sky
      g.rect(wx_win + 38, 2, 4, 14).fill({ color: 0x252540 }); // frame
      g.rect(wx_win, 8, 80, 2).fill({ color: 0x252540 }); // frame
    }

    this.container.addChildAt(g, 0);
  }

  // ─── Monitors (dynamic — per agent) ──────────────────────────────────────
  setMonitorSlots(slots: { x: number; y: number; agentId: string; online: boolean }[]) {
    for (const m of this.monitors) m.g.destroy();
    this.monitors = [];

    for (const slot of slots) {
      const g = new Graphics();
      this.drawMonitor(g, slot.online);
      g.position.set(slot.x - 22, slot.y - 48);
      this.container.addChild(g);
      this.monitors.push({ g, agentId: slot.agentId, online: slot.online });
    }
  }

  private drawMonitor(g: Graphics, online: boolean) {
    g.clear();
    // Monitor stand
    g.rect(18, 22, 4, 10).fill({ color: 0x555566 });
    g.rect(10, 30, 20, 3).fill({ color: 0x444455 }); // base
    // Monitor frame
    g.rect(0, 0, 40, 24).fill({ color: 0x333344 });
    // Screen
    g.rect(2, 2, 36, 18).fill({ color: online ? 0x1a4aaa : 0x222233 });
    // Screen content (fake UI)
    if (online) {
      g.rect(4, 4, 22, 2).fill({ color: 0x4488ff, alpha: 0.8 });
      g.rect(4, 8, 16, 1).fill({ color: 0x3366cc, alpha: 0.6 });
      g.rect(4, 11, 20, 1).fill({ color: 0x3366cc, alpha: 0.6 });
    }
  }

  updateMonitorStatus(agentId: string, online: boolean) {
    const m = this.monitors.find((mon) => mon.agentId === agentId);
    if (!m || m.online === online) return;
    m.online = online;
    this.drawMonitor(m.g, online);
  }

  // ─── Plants ──────────────────────────────────────────────────────────────
  private buildPlants() {
    const positions = [
      { x: LOUNGE_X + LOUNGE_W - 10, y: LOUNGE_Y + LOUNGE_H - 10 },
      { x: 60, y: LOUNGE_Y + 200 },
      { x: 700, y: 440 },
    ];

    for (const pos of positions) {
      const g = new Graphics();
      this.drawPlant(g);
      g.pivot.set(0, 20);
      g.position.set(pos.x, pos.y);
      this.container.addChild(g);
      this.plants.push({ g, phase: Math.random() * Math.PI * 2 });
    }
  }

  private drawPlant(g: Graphics) {
    g.clear();
    g.rect(-6, 14, 12, 8).fill({ color: 0x8b5e3c });
    g.rect(-5, 13, 10, 2).fill({ color: 0x6d4a2f });
    g.rect(-1, 4, 2, 10).fill({ color: 0x4a7c3f });
    g.ellipse(-6, 7, 7, 4).fill({ color: 0x3a9c35 });
    g.ellipse(6, 5, 7, 4).fill({ color: 0x2d8a28 });
    g.ellipse(0, 0, 5, 6).fill({ color: 0x45b03a });
  }

  // ─── Clouds ──────────────────────────────────────────────────────────────
  private buildClouds() {
    const defs = [
      { x: 150,  y: 2, w: 60, speed: 0.2 },
      { x: 600,  y: 4, w: 44, speed: 0.12 },
    ];
    for (const def of defs) {
      const g = new Graphics();
      this.drawCloud(g, def.w);
      g.position.set(def.x, def.y);
      g.alpha = 0.3;
      this.container.addChild(g);
      this.clouds.push({ g, speed: def.speed });
    }
  }

  private drawCloud(g: Graphics, w: number) {
    const h = w * 0.45;
    g.ellipse(0, 0, w * 0.5, h * 0.6).fill({ color: 0xddeeff });
    g.ellipse(w * 0.22, -h * 0.2, w * 0.35, h * 0.5).fill({ color: 0xe8f4ff });
    g.ellipse(-w * 0.2, -h * 0.1, w * 0.3, h * 0.42).fill({ color: 0xddeeff });
  }

  // ─── Tick ─────────────────────────────────────────────────────────────────
  tick(elapsed: number, deltaTime: number) {
    for (const plant of this.plants) {
      plant.g.rotation = Math.sin(elapsed * 1.1 + plant.phase) * 0.04;
    }

    for (const cloud of this.clouds) {
      cloud.g.x += cloud.speed * deltaTime;
      if (cloud.g.x > SCENE_W + 80) cloud.g.x = -100;
    }

    // Online monitor screen subtle flicker
    for (let i = 0; i < this.monitors.length; i++) {
      const mon = this.monitors[i];
      if (!mon.online) continue;
      mon.g.alpha = 0.90 + Math.sin(elapsed * 1.6 + i) * 0.10;
    }
  }
}

// ─── Status Bubbles ───────────────────────────────────────────────────────
export class StatusBubble {
  readonly container: Container;
  private phase: number;

  constructor(emoji: string, bgColor: number) {
    this.phase = Math.random() * Math.PI * 2;
    this.container = new Container();

    const bg = new Graphics();
    bg.roundRect(-13, -13, 26, 26, 7).fill({ color: bgColor, alpha: 0.88 });
    this.container.addChild(bg);

    const label = new Text({
      text: emoji,
      style: new TextStyle({ fontSize: 16, align: 'center' }),
    });
    label.anchor.set(0.5, 0.5);
    this.container.addChild(label);
  }

  tick(elapsed: number) {
    this.container.y = Math.sin(elapsed * 2.8 + this.phase) * 3;
  }

  destroy() {
    this.container.destroy({ children: true });
  }
}
