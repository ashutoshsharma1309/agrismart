import type { FastifyInstance } from 'fastify';
import { timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';
import { usageSnapshot } from '../lib/usage.js';

/** Constant-time bearer-token check. Denies when the config token is empty/unset. */
function isAuthorized(token: string): boolean {
  const expected = config.ADMIN_TOKEN;
  if (!expected) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch; guard so unequal lengths just deny.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function registerAdminRoutes(app: FastifyInstance) {
  app.get('/api/admin/usage', async (req, reply) => {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!isAuthorized(token)) {
      return reply.status(401).send({ ok: false, reason: 'unauthorized' });
    }
    return usageSnapshot();
  });
}
