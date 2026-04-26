import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { usageSnapshot } from '../lib/usage.js';

export async function registerAdminRoutes(app: FastifyInstance) {
  app.get('/api/admin/usage', async (req, reply) => {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!config.ADMIN_TOKEN || token !== config.ADMIN_TOKEN) {
      return reply.status(401).send({ ok: false, reason: 'unauthorized' });
    }
    return usageSnapshot();
  });
}
