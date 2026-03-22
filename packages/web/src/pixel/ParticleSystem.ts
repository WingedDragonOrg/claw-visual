import { Graphics } from 'pixi.js';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;       // remaining life in seconds
  maxLife: number;
  color: number;
  size: number;
}

const PARTICLE_COLORS = [
  0xffd700,  // gold (message)
  0x87ceeb,  // sky blue
  0x98fb98,  // pale green (task complete)
  0xffa07a,  // light salmon
  0xdda0dd,  // plum
  0xf0e68c,  // khaki
];

export class ParticleSystem {
  private particles: Particle[] = [];
  private graphics: Graphics;
  private pool: Particle[] = [];

  constructor() {
    this.graphics = new Graphics();
  }

  /** Return the Graphics object — add this to your stage/world */
  get display(): Graphics {
    return this.graphics;
  }

  /** Spawn a burst of particles at (x, y) in world coordinates */
  spawn(
    x: number,
    y: number,
    count: number = 12,
    color?: number,
    speed: number = 60,
    life: number = 0.8,
    size: number = 4
  ) {
    const c = color ?? PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const spd = speed * (0.6 + Math.random() * 0.8);
      const p: Particle = this.pool.pop() ?? {} as Particle;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd;
      p.life = life * (0.7 + Math.random() * 0.6);
      p.maxLife = p.life;
      p.color = c;
      p.size = size * (0.6 + Math.random() * 0.8);
      this.particles.push(p);
    }
  }

  /** Update particles — call once per frame */
  tick(deltaMs: number) {
    const dt = deltaMs / 1000;
    const dead: Particle[] = [];

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 20 * dt; // gentle gravity
      p.life -= dt;
      if (p.life <= 0) dead.push(p);
    }

    for (const p of dead) {
      this.particles.splice(this.particles.indexOf(p), 1);
      this.pool.push(p);
    }

    this.render();
  }

  private render() {
    const g = this.graphics;
    g.clear();

    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      // Pixel-art style: draw a single filled rect (no smoothing)
      g.rect(
        Math.round(p.x - p.size / 2),
        Math.round(p.y - p.size / 2),
        Math.ceil(p.size),
        Math.ceil(p.size)
      ).fill({ color: p.color, alpha });
    }
  }
}
