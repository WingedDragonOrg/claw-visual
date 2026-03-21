import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { serve } from '@hono/node-server';
import { createApp, createDefaultState, type AppState } from './app.js';
import supertest from 'supertest';
import type http from 'node:http';

describe('API Endpoints', () => {
  let server: http.Server;
  let request: supertest.SuperTest<supertest.Test>;
  let state: AppState;

  beforeAll(() => {
    state = createDefaultState();
    const { app } = createApp(state) as any;
    server = serve({ fetch: app.fetch, port: 0 }); // random port
    request = supertest(server);
  });

  afterAll(() => {
    server.close();
  });

  // ── /api/agents ────────────────────────────────────────────────────────
  describe('GET /api/agents', () => {
    it('returns array of agents', async () => {
      const res = await request.get('/api/agents');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('returns agents with required fields', async () => {
      const res = await request.get('/api/agents');
      const agent = res.body[0];
      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('status');
      expect(agent).toHaveProperty('role');
    });
  });

  // ── /api/agents/:id/activity ────────────────────────────────────────────
  describe('GET /api/agents/:id/activity', () => {
    it('returns activities for existing agent', async () => {
      const res = await request.get('/api/agents/xiaochan/activity');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('returns empty array for unknown agent', async () => {
      const res = await request.get('/api/agents/unknown-agent/activity');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('activities have required fields', async () => {
      const res = await request.get('/api/agents/xiaochan/activity');
      if (res.body.length > 0) {
        const activity = res.body[0];
        expect(activity).toHaveProperty('id');
        expect(activity).toHaveProperty('agentId');
        expect(activity).toHaveProperty('action');
        expect(activity).toHaveProperty('timestamp');
      }
    });
  });

  // ── /api/dashboard ──────────────────────────────────────────────────────
  describe('GET /api/dashboard', () => {
    it('returns dashboard data', async () => {
      const res = await request.get('/api/dashboard');
      expect(res.status).toBe(200);
    });

    it('returns correct status counts', async () => {
      const res = await request.get('/api/dashboard');
      const data = res.body;
      expect(data).toHaveProperty('totalAgents');
      expect(data).toHaveProperty('online');
      expect(data).toHaveProperty('offline');
      expect(data).toHaveProperty('away');
      expect(data).toHaveProperty('busy');
      expect(data).toHaveProperty('error');
      expect(data.totalAgents).toBe(data.online + data.offline + data.away + data.busy + data.error);
    });

    it('includes channels and activities', async () => {
      const res = await request.get('/api/dashboard');
      expect(res.body).toHaveProperty('channels');
      expect(res.body).toHaveProperty('recentActivities');
      expect(res.body).toHaveProperty('lastUpdated');
    });
  });

  // ── /api/channels ───────────────────────────────────────────────────────
  describe('GET /api/channels', () => {
    it('returns array of channels', async () => {
      const res = await request.get('/api/channels');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── /api/channels/:id/agents ────────────────────────────────────────────
  describe('GET /api/channels/:id/agents', () => {
    it('returns 404 for unknown channel', async () => {
      const res = await request.get('/api/channels/nonexistent/agents');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    it('returns agents for existing channel', async () => {
      // 先添加一个测试 channel
      state.channels.push({
        id: 'test-channel',
        name: 'Test Channel',
        type: 'discord',
        agentIds: ['xiaochan'],
        agentCount: 1,
        onlineCount: 1,
        lastActivity: null,
      });

      const res = await request.get('/api/channels/test-channel/agents');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].id).toBe('xiaochan');
    });
  });

  // ── /api/issues ─────────────────────────────────────────────────────────
  describe('GET /api/issues', () => {
    it('returns GitHub summary', async () => {
      const res = await request.get('/api/issues');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('open');
      expect(res.body).toHaveProperty('closed');
      expect(res.body).toHaveProperty('byAssignee');
      expect(res.body).toHaveProperty('issues');
    });
  });

  // ── /api/config/thresholds ──────────────────────────────────────────────
  describe('GET /api/config/thresholds', () => {
    it('returns threshold configuration', async () => {
      const res = await request.get('/api/config/thresholds');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('isNightMode');
      expect(res.body).toHaveProperty('normal');
      expect(res.body).toHaveProperty('night');
      expect(res.body).toHaveProperty('current');
    });

    it('normal thresholds have correct fields', async () => {
      const res = await request.get('/api/config/thresholds');
      expect(res.body.normal).toHaveProperty('onlineMinutes');
      expect(res.body.normal).toHaveProperty('busyMinutes');
      expect(res.body.normal).toHaveProperty('awayMinutes');
    });
  });

  // ── /api/health ─────────────────────────────────────────────────────────
  describe('GET /api/health', () => {
    it('returns health status', async () => {
      const res = await request.get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body).toHaveProperty('dataSource');
      expect(res.body).toHaveProperty('agentsCount');
      expect(res.body).toHaveProperty('uptime');
    });

    it('reports mock data source by default', async () => {
      const res = await request.get('/api/health');
      expect(res.body.dataSource).toBe('mock');
    });
  });

  // ── 404 handling ────────────────────────────────────────────────────────
  describe('404 handling', () => {
    it('returns 404 for unknown API endpoint', async () => {
      const res = await request.get('/api/unknown');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });
});
