import type { FastifyInstance } from 'fastify';
import { SATELLITE_FIELDS, getFieldById } from '../data/satellite-fields.js';
import { analyzeField, summarizeField } from '../services/satellite-engine.js';

export async function registerSatelliteRoutes(app: FastifyInstance) {
  // Region overview — headline stats for the dashboard.
  app.get('/api/satellite/overview', async () => {
    const summaries = SATELLITE_FIELDS.map(summarizeField);
    const stressed = summaries.filter(
      (s) => s.stress_level === 'moderate' || s.stress_level === 'severe',
    );
    const needIrrigation = summaries.filter(
      (s) => s.action === 'irrigate_now' || s.action === 'irrigate_soon',
    );
    const cropCounts: Record<string, number> = {};
    for (const s of summaries) cropCounts[s.crop] = (cropCounts[s.crop] ?? 0) + 1;

    return {
      ok: true,
      data: {
        total_fields: summaries.length,
        total_area_ha: Math.round(summaries.reduce((a, s) => a + s.area_ha, 0) * 10) / 10,
        stressed_fields: stressed.length,
        fields_needing_irrigation: needIrrigation.length,
        crop_distribution: Object.entries(cropCounts).map(([crop, count]) => ({ crop, count })),
      },
    };
  });

  // All fields as lightweight summaries (for the list + map).
  app.get('/api/satellite/fields', async () => ({
    ok: true,
    data: SATELLITE_FIELDS.map(summarizeField),
  }));

  // Full analysis for a single field.
  app.get<{ Params: { id: string } }>('/api/satellite/fields/:id', async (req, reply) => {
    const field = getFieldById(req.params.id);
    if (!field) {
      return reply.status(404).send({ ok: false, reason: 'not_found' });
    }
    return reply.status(200).send({ ok: true, data: analyzeField(field) });
  });
}
