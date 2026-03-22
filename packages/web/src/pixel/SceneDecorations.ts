import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import {
  SCENE_W, SCENE_H, DESK_SLOTS, LOUNGE_X, LOUNGE_Y, LOUNGE_W, LOUNGE_H,
  MEETING_X, MEETING_Y, MEETING_W, MEETING_H,
  WAYPOINTS,
} from './SceneLayout';
import type { GitHubSummary } from '../types';

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
  watering: boolean;
  waterDrops: Graphics | null;
}

export class SceneDecorations {
  readonly container: Container;
  private monitors: MonitorEntry[] = [];
  private clouds: Cloud[] = [];
  private plants: Plant[] = [];
  private coffeeMachine: Graphics | null = null;
  private coffeeSteam: Graphics | null = null;
  private coffeeBrewing = false;
  private steamFrame = 0;
  private chairGraphics: Graphics | null = null;
  private chairStates: Map<string, boolean> = new Map(); // agentId -> online

  // Whiteboard elements (dynamic)
  private whiteboardBars: Graphics | null = null;
  private whiteboardLabel: Text | null = null;
  private whiteboardOpenText: Text | null = null;
  private whiteboardClosedText: Text | null = null;
  private wbFlashTimer = 0;
  private prevWbOpen = -1;
  private prevWbClosed = -1;

  // Clock display
  private clockText: Text | null = null;

  constructor() {
    this.container = new Container();
    this.drawOfficeFurniture();
    this.buildPlants();
    this.buildClouds();
  }

  // ─── Static Office Furniture ──────────────────────────────────────────────
  private drawOfficeFurniture() {
    const g = new Graphics();

    // ── Floor tiles (warm wood checkerboard, softer creamier tones) ───────
    for (let x = 0; x < SCENE_W; x += 40) {
      for (let y = 0; y < SCENE_H; y += 40) {
        // Warmer cream/beige instead of orange
        const shade = ((x / 40 + y / 40) % 2 === 0) ? 0xe8d4b8 : 0xd8c4a8;
        g.rect(x, y, 40, 40).fill({ color: shade });
      }
    }

    // ── Top wall (taller, 40px with brick pattern) ──────────────────────────
    g.rect(0, 0, SCENE_W, 40).fill({ color: 0x3a3a50 });
    // Brick pattern lines
    for (let bx = 0; bx < SCENE_W; bx += 60) {
      g.rect(bx, 0, 1, 40).fill({ color: 0x2a2a40 });
    }
    for (let by = 0; by < 40; by += 14) {
      g.rect(0, by, SCENE_W, 1).fill({ color: 0x2a2a40 });
      // Offset every other row
      if ((by / 14) % 2 === 1) {
        g.rect(30, by, 1, 14).fill({ color: 0x2a2a40 });
        g.rect(90, by, 1, 14).fill({ color: 0x4a4a60 }); // highlight
      }
    }

    // ── Wall borders ────────────────────────────────────────────────────
    // Left wall
    g.rect(0, 40, 22, SCENE_H - 40).fill({ color: 0xe8d5c0 });
    g.rect(0, 40, 4, SCENE_H - 40).fill({ color: 0xc8b5a0 }); // dark corner shadow
    // Bottom wall (baseboard)
    g.rect(0, SCENE_H - 20, SCENE_W, 20).fill({ color: 0xe0c8b0 });
    g.rect(0, SCENE_H - 22, SCENE_W, 3).fill({ color: 0xc0a890 }); // baseboard highlight

    // ── Pendant ceiling lights (lampshade + bulb, focused glow) ──────────────
    const lightCenters = [
      // Desk area
      { x: 200, y: 120 }, { x: 550, y: 120 }, { x: 900, y: 120 },
      { x: 200, y: 280 }, { x: 550, y: 280 },
      { x: 200, y: 440 }, { x: 550, y: 440 }, { x: 900, y: 440 },
      // Meeting room
      { x: 1250, y: 200 }, { x: 1350, y: 200 },
    ];
    for (const lc of lightCenters) {
      // Chain
      g.rect(lc.x - 1, 0, 2, lc.y - 30).fill({ color: 0x666677 });
      // Lampshade (trapezoid-ish)
      g.moveTo(lc.x - 16, lc.y - 30);
      g.lineTo(lc.x + 16, lc.y - 30);
      g.lineTo(lc.x + 12, lc.y - 20);
      g.lineTo(lc.x - 12, lc.y - 20);
      g.closePath().fill({ color: 0xccaa66 });
      // Bulb glow (warm yellow)
      g.ellipse(lc.x, lc.y - 15, 8, 6).fill({ color: 0xffee88 });
      // Focused downward cone glow
      g.moveTo(lc.x - 10, lc.y - 10);
      g.lineTo(lc.x + 10, lc.y - 10);
      g.lineTo(lc.x + 50, lc.y + 80);
      g.lineTo(lc.x - 50, lc.y + 80);
      g.closePath().fill({ color: 0xffeeaa, alpha: 0.07 });
      // Inner hot spot
      g.ellipse(lc.x, lc.y - 5, 6, 4).fill({ color: 0xffffcc, alpha: 0.5 });
    }

    // ── Desks (isometric style with depth) ────────────────────────────────────
    for (const slot of DESK_SLOTS) {
      const dx = slot.x - 60, dy = slot.y - 20;
      // Desk top (parallelogram for 45° isometric feel)
      g.moveTo(dx, dy + 4);
      g.lineTo(dx + 120, dy);
      g.lineTo(dx + 120, dy + 14);
      g.lineTo(dx, dy + 18);
      g.closePath().fill({ color: 0x8b5e3c });
      // Desk top highlight edge
      g.moveTo(dx, dy + 4);
      g.lineTo(dx + 120, dy);
      g.lineTo(dx + 120, dy + 3);
      g.lineTo(dx, dy + 7);
      g.closePath().fill({ color: 0xa0724a });
      // Desk front face (depth)
      g.moveTo(dx, dy + 18);
      g.lineTo(dx + 120, dy + 14);
      g.lineTo(dx + 120, dy + 30);
      g.lineTo(dx, dy + 34);
      g.closePath().fill({ color: 0x6b4a2a });
      // Desk legs (visible from front)
      g.rect(dx + 4, dy + 28, 6, 16).fill({ color: 0x5a3a1a });
      g.rect(dx + 110, dy + 28, 6, 16).fill({ color: 0x5a3a1a });
    }

    // ── Chairs (drawn after desks, with online/offline state via separate method) ──
    // Chair positions stored for dynamic rendering (pushed aside for offline)
    this.chairGraphics = new Graphics();
    this.drawChairs(this.chairGraphics, this.chairStates);

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

    // Coffee machine (interactive)
    this.coffeeMachine = new Graphics();
    this.drawCoffeeMachine(this.coffeeMachine);
    this.coffeeMachine.position.set(lx + 10, ly + 80);
    this.coffeeMachine.eventMode = 'static';
    this.coffeeMachine.cursor = 'pointer';
    this.coffeeMachine.on('pointerdown', () => this.brewCoffee());
    this.container.addChild(this.coffeeMachine);

    // ── Meeting room (top-right) ────────────────────────────────────────────
    const mx = MEETING_X, my = MEETING_Y, mw = MEETING_W, mh = MEETING_H;
    // Meeting room floor (slightly different shade)
    g.rect(mx, my, mw, mh).fill({ color: 0xd8c8a8 });
    // Meeting room walls (left wall)
    g.rect(mx - 8, my - 20, 8, mh + 30).fill({ color: 0xe8d5c0 });
    g.rect(mx - 8, my - 20, 4, mh + 30).fill({ color: 0xc8b5a0 });
    // Meeting room top wall
    g.rect(mx - 8, my - 20, mw + 8, 20).fill({ color: 0x3a3a50 });
    // Meeting room bottom wall (partial)
    g.rect(mx - 8, my + mh, mw + 8, 20).fill({ color: 0xe8d5c0 });
    // Meeting table (large oval)
    g.ellipse(mx + mw / 2, my + mh / 2, 100, 60).fill({ color: 0x8b6040 });
    g.ellipse(mx + mw / 2, my + mh / 2, 96, 56).fill({ color: 0x9b7050 });
    // Projector screen on wall
    g.rect(mx + 40, my + 30, 160, 100).fill({ color: 0x333344 });
    g.rect(mx + 42, my + 32, 156, 96).fill({ color: 0x4488aa, alpha: 0.3 });
    // Meeting chairs around table
    const chairPositions = [
      { x: mx + mw / 2 - 120, y: my + mh / 2 - 20 },
      { x: mx + mw / 2 + 120, y: my + mh / 2 - 20 },
      { x: mx + mw / 2, y: my + mh / 2 - 80 },
      { x: mx + mw / 2, y: my + mh / 2 + 60 },
    ];
    for (const cp of chairPositions) {
      g.rect(cp.x - 15, cp.y - 8, 30, 16).fill({ color: 0x3a3a5c }); // seat
      g.rect(cp.x - 12, cp.y - 20, 24, 14).fill({ color: 0x3a3a5c }); // back
    }
    // Meeting room label
    const meetingLabel = new Text({
      text: 'MEETING ROOM',
      style: new TextStyle({ fontFamily: 'monospace', fontSize: 8, fill: 0x887766 }),
    });
    meetingLabel.anchor.set(0.5, 0);
    meetingLabel.position.set(mx + mw / 2, my + mh - 20);
    this.container.addChild(meetingLabel);

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

    // ── Windows on top wall with curtains ─────────────────────────────────────
    const hour = new Date().getHours();
    const isDaytime = hour >= 6 && hour < 20;
    const skyColor = isDaytime ? 0x87ceeb : 0x1a1a3a;
    for (const winX of [160, 380, 600, 820]) {
      // Curtains (pixel style, both sides)
      // Left curtain
      g.moveTo(winX - 22, 0);
      g.lineTo(winX - 8, 0);
      g.lineTo(winX - 4, 40);
      g.lineTo(winX - 16, 40);
      g.closePath().fill({ color: 0x8b4a6b }); // dusty rose
      // Right curtain
      g.moveTo(winX + 78, 0);
      g.lineTo(winX + 92, 0);
      g.lineTo(winX + 96, 40);
      g.lineTo(winX + 84, 40);
      g.closePath().fill({ color: 0x8b4a6b });
      // Curtain rod
      g.rect(winX - 20, 0, 110, 3).fill({ color: 0x6b5a4a });
      // Outer frame (slightly darker border)
      g.rect(winX - 1, 5, 82, 32).fill({ color: 0xa09080 });
      // Sky fill
      g.rect(winX, 6, 80, 30).fill({ color: skyColor });
      // Vertical mullion
      g.rect(winX + 39, 6, 2, 26).fill({ color: 0xa09080 });
      // Horizontal mullion
      g.rect(winX, 18, 80, 2).fill({ color: 0xa09080 });
    }

    // ── Whiteboard (top-left, near bookshelf) — static frame ──────────────
    // Outer frame
    g.rect(44, 30, 80, 60).fill({ color: 0xe8e0d0 });
    // Inner border (inset 1px)
    g.rect(45, 31, 78, 58).fill({ color: 0xaaa090 });
    g.rect(46, 32, 76, 56).fill({ color: 0xe8e0d0 });
    // Horizontal lines
    for (const ly of [42, 50, 58]) {
      g.rect(48, ly, 70, 1).fill({ color: 0x8899aa, alpha: 0.7 });
    }
    // Dynamic content (bar chart + labels) built in buildWhiteboard()

    // ── Desk coffee mugs ────────────────────────────────────────────────────
    for (const slot of DESK_SLOTS) {
      const mx = slot.x + 40, my = slot.y - 15;
      g.rect(mx, my, 8, 10).fill({ color: 0xdddddd });       // cup body
      g.rect(mx + 6, my + 2, 8, 5).fill({ color: 0xbbbbbb }); // handle
      g.rect(mx + 1, my + 1, 6, 4).fill({ color: 0x6b3a1a }); // coffee
    }

    // ── Lounge rug ──────────────────────────────────────────────────────────
    const rugX = LOUNGE_X, rugY = LOUNGE_Y + 100;
    g.rect(rugX, rugY, 200, 120).fill({ color: 0x8b6c4a, alpha: 0.4 });
    g.rect(rugX + 4, rugY + 4, 192, 112).fill({ color: 0x6b4c2a, alpha: 0.3 });
    // Diamond pattern at center
    const cx = LOUNGE_X + 100, cy = LOUNGE_Y + 160;
    g.rect(cx - 1, cy - 10, 2, 20).fill({ color: 0xaa8866, alpha: 0.3 });
    g.rect(cx - 10, cy - 1, 20, 2).fill({ color: 0xaa8866, alpha: 0.3 });
    // Diagonal strokes for diamond shape
    for (let d = 0; d < 10; d++) {
      g.rect(cx - 10 + d, cy - d, 1, 1).fill({ color: 0xaa8866, alpha: 0.3 });
      g.rect(cx + 10 - d, cy - d, 1, 1).fill({ color: 0xaa8866, alpha: 0.3 });
      g.rect(cx - 10 + d, cy + d, 1, 1).fill({ color: 0xaa8866, alpha: 0.3 });
      g.rect(cx + 10 - d, cy + d, 1, 1).fill({ color: 0xaa8866, alpha: 0.3 });
    }

    // ── Floor lamp (lounge) ─────────────────────────────────────────────────
    const flx = LOUNGE_X + LOUNGE_W - 30, fly = LOUNGE_Y + 40;
    g.rect(flx - 2, fly, 4, 60).fill({ color: 0xc0a050 });        // pole
    g.rect(flx - 10, fly - 10, 20, 10).fill({ color: 0xffe8a0 }); // shade
    g.ellipse(flx, fly + 10, 40, 25).fill({ color: 0xffeeaa, alpha: 0.08 }); // glow

    // ── Motivational posters on wall ────────────────────────────────────────
    // Poster 1 - "SHIP IT"
    g.rect(300, 5, 50, 30).fill({ color: 0x2a3a2a });
    g.rect(301, 6, 48, 28).fill({ color: 0x1a2a1a });
    const shipText = new Text({ text: '🚀', style: new TextStyle({ fontSize: 14 }) });
    shipText.anchor.set(0.5, 0.5);
    shipText.position.set(325, 15);
    this.container.addChild(shipText);

    // Poster 2 - "PING"
    g.rect(500, 5, 50, 30).fill({ color: 0x2a2a3a });
    g.rect(501, 6, 48, 28).fill({ color: 0x1a1a2a });
    const pingText = new Text({ text: '📡', style: new TextStyle({ fontSize: 14 }) });
    pingText.anchor.set(0.5, 0.5);
    pingText.position.set(525, 15);
    this.container.addChild(pingText);

    // ── Filing cabinet (left wall) ─────────────────────────────────────────
    const fcX = 2, fcY = SCENE_H - 80;
    g.rect(fcX, fcY, 18, 60).fill({ color: 0x8899aa });
    g.rect(fcX + 1, fcY + 1, 16, 19).fill({ color: 0x7788aa }); // drawer 1
    g.rect(fcX + 1, fcY + 20, 16, 19).fill({ color: 0x7788aa }); // drawer 2
    g.rect(fcX + 1, fcY + 39, 16, 19).fill({ color: 0x7788aa }); // drawer 3
    // Drawer handles
    g.rect(fcX + 7, fcY + 8, 4, 2).fill({ color: 0x556677 });
    g.rect(fcX + 7, fcY + 27, 4, 2).fill({ color: 0x556677 });
    g.rect(fcX + 7, fcY + 46, 4, 2).fill({ color: 0x556677 });

    // ── Desk organizers (on some desks) ────────────────────────────────────
    const organizerSlots = [0, 2, 4, 6]; // Only on half the desks
    for (const idx of organizerSlots) {
      const slot = DESK_SLOTS[idx];
      if (!slot) continue;
      const ox = slot.x + 20, oy = slot.y - 10;
      // Pen holder
      g.rect(ox, oy, 6, 12).fill({ color: 0x445566 });
      g.rect(ox + 1, oy + 1, 1, 8).fill({ color: 0xee4444 }); // red pen
      g.rect(ox + 3, oy + 1, 1, 6).fill({ color: 0x44aa44 }); // green pen
      // Sticky notes pad
      g.rect(ox + 8, oy + 4, 10, 10).fill({ color: 0xffee44 });
      g.rect(ox + 8, oy + 4, 10, 2).fill({ color: 0xeecc22 }); // note shadow
    }

    // ── Extra plant in lounge ──────────────────────────────────────────────
    const extraPlantX = LOUNGE_X + LOUNGE_W - 60, extraPlantY = LOUNGE_Y + LOUNGE_H - 20;
    g.rect(extraPlantX - 8, extraPlantY - 6, 16, 8).fill({ color: 0x8b4513 }); // pot
    g.rect(extraPlantX - 6, extraPlantY - 30, 12, 24).fill({ color: 0x228b22 }); // leaves
    g.rect(extraPlantX - 3, extraPlantY - 40, 6, 12).fill({ color: 0x2a9a2a }); // tall leaf

    this.container.addChildAt(g, 0);

    // Add chairs layer on top of floor/desks but below agents
    if (this.chairGraphics) {
      this.container.addChild(this.chairGraphics);
    }

    // Build dynamic whiteboard content
    this.buildWhiteboard();

    // Clock display (top-right corner)
    this.clockText = new Text({
      text: '',
      style: new TextStyle({ fontFamily: 'monospace', fontSize: 5, fill: 0xaaaaaa }),
    });
    this.clockText.anchor.set(1, 0);
    this.clockText.position.set(SCENE_W - 10, 10);
    this.container.addChild(this.clockText);
  }

  // ─── Whiteboard (dynamic) ───────────────────────────────────────────────
  private buildWhiteboard() {
    // Bar chart (4 bars representing issue activity)
    this.whiteboardBars = new Graphics();
    this.container.addChild(this.whiteboardBars);

    // "BOARD" label
    this.whiteboardLabel = new Text({
      text: 'ISSUES',
      style: new TextStyle({ fontFamily: 'monospace', fontSize: 7, fill: 0x998880 }),
    });
    this.whiteboardLabel.anchor.set(0.5, 0);
    this.whiteboardLabel.position.set(84, 30);
    this.container.addChild(this.whiteboardLabel);

    // Open count label
    this.whiteboardOpenText = new Text({
      text: '---',
      style: new TextStyle({ fontFamily: 'monospace', fontSize: 6, fill: 0x5588cc }),
    });
    this.whiteboardOpenText.anchor.set(0, 0);
    this.whiteboardOpenText.position.set(48, 68);
    this.container.addChild(this.whiteboardOpenText);

    // Closed count label
    this.whiteboardClosedText = new Text({
      text: '---',
      style: new TextStyle({ fontFamily: 'monospace', fontSize: 6, fill: 0xcc4444 }),
    });
    this.whiteboardClosedText.anchor.set(0, 0);
    this.whiteboardClosedText.position.set(80, 68);
    this.container.addChild(this.whiteboardClosedText);

    // Draw initial placeholder bars
    this.drawWhiteboardBars(0, 0);
  }

  private drawWhiteboardBars(open: number, closed: number) {
    if (!this.whiteboardBars) return;
    this.whiteboardBars.clear();

    // Normalize to max height of 20px, max total of 20 issues for scaling
    const maxIssues = Math.max(open + closed, 20);
    const maxH = 20;
    const openH = Math.round((open / maxIssues) * maxH);
    const closedH = Math.round((closed / maxIssues) * maxH);

    // 4 bars: open1, open2, closed1, closed2 (alternating pattern)
    const bars = [
      { bx: 48, h: openH > 0 ? Math.max(openH / 2, 2) : 0 },
      { bx: 56, h: openH > 0 ? Math.max(openH, 2) : 0 },
      { bx: 64, h: closedH > 0 ? Math.max(closedH / 2, 2) : 0 },
      { bx: 72, h: closedH > 0 ? Math.max(closedH, 2) : 0 },
    ];

    const baseY = 80;
    for (const bar of bars) {
      if (bar.h > 0) {
        this.whiteboardBars!.rect(bar.bx, baseY - bar.h, 6, bar.h).fill({ color: 0x5588cc, alpha: 0.8 });
      }
    }

    // Trend line dots (small squares at top of bars)
    for (const bar of bars) {
      if (bar.h > 0) {
        this.whiteboardBars!.rect(bar.bx + 1, baseY - bar.h - 1, 4, 1).fill({ color: 0xcc4444, alpha: 0.8 });
      }
    }
  }

  updateWhiteboard(summary: GitHubSummary) {
    if (!this.whiteboardBars || !this.whiteboardOpenText || !this.whiteboardClosedText) return;

    // Trigger flash if values changed
    if (summary.open !== this.prevWbOpen || summary.closed !== this.prevWbClosed) {
      this.wbFlashTimer = 1.0;
    }
    this.prevWbOpen = summary.open;
    this.prevWbClosed = summary.closed;

    this.drawWhiteboardBars(summary.open, summary.closed);
    this.whiteboardOpenText.text = `O:${summary.open}`;
    this.whiteboardClosedText.text = `C:${summary.closed}`;
  }

  private drawChairs(g: Graphics, chairStates: Map<string, boolean>) {
    // Draw chairs based on online/offline state
    // Offline: chair pushed aside (rotated and moved right)
    let idx = 0;
    for (const slot of DESK_SLOTS) {
      const dx = slot.x - 60, dy = slot.y - 20;
      const online = chairStates.get(`slot_${idx}`) ?? true; // default online
      idx++;

      if (online) {
        // Chair in seated position (in front of desk)
        g.rect(dx + 36, dy + 30, 48, 6).fill({ color: 0x3a3a5c }); // seat
        g.rect(dx + 44, dy + 36, 32, 14).fill({ color: 0x2e2e4a }); // base
        g.rect(dx + 44, dy + 14, 32, 18).fill({ color: 0x3a3a5c }); // back
      } else {
        // Chair pushed aside (to the right of desk, slightly rotated feel via offset)
        g.rect(dx + 130, dy + 32, 48, 6).fill({ color: 0x3a3a5c }); // seat
        g.rect(dx + 138, dy + 38, 32, 14).fill({ color: 0x2e2e4a }); // base
        g.rect(dx + 138, dy + 16, 32, 18).fill({ color: 0x3a3a5c }); // back
      }
    }
  }

  updateChairStates(slots: { x: number; y: number; agentId: string; online: boolean }[]) {
    // Update chair states map
    slots.forEach((slot, i) => {
      this.chairStates.set(`slot_${i}`, slot.online);
    });
    // Redraw chairs
    if (this.chairGraphics) {
      this.chairGraphics.clear();
      this.drawChairs(this.chairGraphics, this.chairStates);
    }
  }
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

    // Update chair states
    this.updateChairStates(slots);
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
      g.eventMode = 'static';
      g.cursor = 'pointer';
      g.on('pointerdown', () => this.waterPlant(this.plants.length));
      this.container.addChild(g);
      this.plants.push({ g, phase: Math.random() * Math.PI * 2, watering: false, waterDrops: null });
    }
  }

  private waterPlant(index: number) {
    const plant = this.plants[index];
    if (!plant || plant.watering) return;
    plant.watering = true;
    plant.phase = 0; // Reset animation for bounce effect

    // Create water drops
    const drops = new Graphics();
    drops.position.set(plant.g.position.x, plant.g.position.y - 20);
    this.container.addChild(drops);
    plant.waterDrops = drops;

    // Animate water drops falling
    let frame = 0;
    const animate = () => {
      if (frame > 30) {
        this.container.removeChild(drops);
        plant.waterDrops = null;
        plant.watering = false;
        return;
      }
      drops.clear();
      for (let i = 0; i < 5; i++) {
        const y = frame * 2 + i * 4;
        drops.ellipse((i - 2) * 3, y, 2, 3).fill({ color: 0x66bbff, alpha: 0.7 - frame * 0.02 });
      }
      frame++;
      requestAnimationFrame(animate);
    };
    animate();
  }

  private drawCoffeeMachine(g: Graphics) {
    g.clear();
    // Machine body
    g.rect(-10, -15, 20, 30).fill({ color: 0x444444 });
    g.rect(-8, -12, 16, 20).fill({ color: 0x666666 });
    // Button
    g.circle(0, 5, 3).fill({ color: 0x22cc44 });
    // Spout
    g.rect(-2, 12, 4, 6).fill({ color: 0x333333 });
  }

  private brewCoffee() {
    if (this.coffeeBrewing || !this.coffeeMachine) return;
    this.coffeeBrewing = true;
    this.steamFrame = 0;

    // Create steam particles
    const steam = new Graphics();
    steam.position.set(this.coffeeMachine.position.x, this.coffeeMachine.position.y + 5);
    this.container.addChild(steam);
    this.coffeeSteam = steam;

    // Animate steam rising
    const animate = () => {
      if (this.steamFrame > 45) {
        this.container.removeChild(steam);
        this.coffeeSteam = null;
        this.coffeeBrewing = false;
        return;
      }
      steam.clear();
      for (let i = 0; i < 3; i++) {
        const y = -this.steamFrame * 1.2 - i * 6;
        const x = Math.sin((this.steamFrame + i * 15) * 0.3) * 6;
        steam.ellipse(x, y, 4, 5).fill({ color: 0xeeeeee, alpha: 0.5 - this.steamFrame * 0.01 });
      }
      this.steamFrame++;
      requestAnimationFrame(animate);
    };
    animate();
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

    // Whiteboard number flash animation
    if (this.wbFlashTimer > 0) {
      this.wbFlashTimer -= deltaTime;
      const t = Math.max(0, this.wbFlashTimer);
      const scale = 1 + Math.sin(t * Math.PI * 6) * 0.25;
      if (this.whiteboardOpenText) this.whiteboardOpenText.scale.set(scale);
      if (this.whiteboardClosedText) this.whiteboardClosedText.scale.set(scale);
    } else {
      if (this.whiteboardOpenText) this.whiteboardOpenText.scale.set(1);
      if (this.whiteboardClosedText) this.whiteboardClosedText.scale.set(1);
    }

    // Clock update (every second)
    if (this.clockText) {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      this.clockText.text = `${hh}:${mm}:${ss}`;
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
