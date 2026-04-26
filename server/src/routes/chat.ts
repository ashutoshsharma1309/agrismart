import type { FastifyInstance } from 'fastify';
import NodeCache from 'node-cache';
import { z } from 'zod';
import { callGroq, groqStatus } from '../services/groq.js';
import {
  buildChatContext,
  chatbotSystemPrompt,
  seasonalContext,
  type ChatLang,
  type ChatProfileContext,
  type ChatWeatherContext,
} from '../prompts/chatbot.js';
import { geocode, getCurrentWeather, getForecast } from '../services/openweather.js';
import {
  beginActive,
  checkAiLimits,
  endActive,
  identityFromReq,
} from '../lib/ai-rate-limit.js';
import { trackUsage } from '../lib/usage.js';
import { logger } from '../lib/logger.js';

const ProfileShape = z
  .object({
    name: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    district: z.string().max(100).optional(),
    village: z.string().max(100).optional(),
    farm_size_acres: z.number().positive().max(10000).optional(),
    primary_soil: z.string().max(100).optional(),
    secondary_soil: z.string().max(100).optional(),
    irrigation: z.string().max(100).optional(),
    primary_crops: z.array(z.string().max(50)).max(20).optional(),
  })
  .partial()
  .optional();

const Body = z.object({
  conversation_id: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(2000),
  lang: z.enum(['en', 'hi', 'kn', 'ta', 'te', 'mr']),
  profile: ProfileShape,
});

// Per-conversation message history. 1h TTL; adequate for v1.
type Turn = { role: 'user' | 'assistant'; content: string; at: number };
const conversations = new NodeCache({ stdTTL: 60 * 60, useClones: false });

// Per-user weather context cache. 10-minute TTL — long enough to avoid hammering
// OpenWeatherMap on every chat turn, short enough that the model still grounds
// in fresh data.
type WeatherCacheEntry = { ctx: ChatWeatherContext; fetchedAt: number };
const weatherContextCache = new NodeCache({ stdTTL: 10 * 60, useClones: false });

const FALLBACK: Record<ChatLang, string> = {
  en: "I'm having trouble thinking right now — please try again in a moment.",
  hi: 'अभी मुझे सोचने में दिक्कत हो रही है — कृपया थोड़ी देर में फिर पूछें।',
  kn: 'ಈಗ ನನಗೆ ಯೋಚಿಸಲು ಕಷ್ಟವಾಗುತ್ತಿದೆ — ಸ್ವಲ್ಪ ಸಮಯದಲ್ಲಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
  ta: 'இப்போது எனக்கு சிந்திக்க கடினமாக உள்ளது — சிறிது நேரத்தில் மீண்டும் முயற்சிக்கவும்.',
  te: 'ఇప్పుడు ఆలోచించడంలో ఇబ్బంది పడుతున్నాను — కొద్ది సేపట్లో మళ్ళీ ప్రయత్నించండి.',
  mr: 'सध्या मला विचार करायला अडचण येत आहे — थोड्या वेळाने पुन्हा प्रयत्न करा.',
};

export async function registerChatRoutes(app: FastifyInstance) {
  app.post('/api/chat/message', async (req, reply) => {
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ ok: false, reason: 'invalid_query', details: parsed.error.flatten().fieldErrors });
    }

    if (!groqStatus.configured()) {
      return reply
        .status(503)
        .send({ ok: false, reason: 'upstream_auth_failed', fallback: FALLBACK[parsed.data.lang] });
    }

    const identity = identityFromReq(req);
    const gate = checkAiLimits('chat', identity);
    if (!gate.allowed) {
      return reply.status(429).send({ ok: false, reason: gate.reason });
    }

    const { conversation_id, message, lang, profile } = parsed.data;
    const history = (conversations.get<Turn[]>(conversation_id) ?? []).slice(-10);

    beginActive('chat');
    try {
      const weather = await resolveWeatherContext(profile, identity.userId ?? identity.ip);
      const farmerContext = buildChatContext(
        profile as ChatProfileContext | undefined,
        weather,
        seasonalContext(),
      );

      const systemPrompt = farmerContext
        ? `${chatbotSystemPrompt(lang)}\n\n${farmerContext}`
        : chatbotSystemPrompt(lang);

      const result = await callGroq<string>({
        system: systemPrompt,
        user: message,
        history: history.map((t) => ({ role: t.role, content: t.content })),
        temperature: 0.6,
        // Senior-advisor responses are 100-180 words typical, up to 350 for
        // complex protocols. 700 tokens covers both with margin.
        maxTokens: 700,
      });

      if (!result.ok) {
        logger.warn({ reason: result.reason }, 'chat fallback');
        return reply.status(200).send({
          ok: true,
          reply: FALLBACK[lang],
          fallback_used: true,
          reason: result.reason,
        });
      }

      trackUsage('chat', result.usage);

      const turn: Turn = { role: 'user', content: message, at: Date.now() };
      const botTurn: Turn = { role: 'assistant', content: result.data, at: Date.now() };
      conversations.set(conversation_id, [...history, turn, botTurn].slice(-20));

      return reply.status(200).send({
        ok: true,
        reply: result.data,
        tokens: result.usage.total_tokens,
        grounded: Boolean(farmerContext),
      });
    } finally {
      endActive('chat');
    }
  });
}

async function resolveWeatherContext(
  profile: ChatProfileContext | undefined,
  userKey: string,
): Promise<ChatWeatherContext | undefined> {
  if (!profile?.district && !profile?.state) return undefined;

  const cached = weatherContextCache.get<WeatherCacheEntry>(userKey);
  if (cached) {
    return {
      ...cached.ctx,
      fetched_minutes_ago: Math.floor((Date.now() - cached.fetchedAt) / 60000),
    };
  }

  try {
    const query = [profile.village, profile.district, profile.state].filter(Boolean).join(', ');
    const geo = await geocode(query, 1);
    const hit = geo[0];
    if (!hit) return undefined;
    const [c, f] = await Promise.all([
      getCurrentWeather({ lat: hit.lat, lon: hit.lon, units: 'metric', lang: 'en' }),
      getForecast({ lat: hit.lat, lon: hit.lon, units: 'metric', lang: 'en' }).catch(() => null),
    ]);
    let forecast_summary: string | undefined;
    if (f) {
      const total = f.days.reduce((acc, d) => acc + d.precipitation_mm, 0);
      const peak = Math.max(...f.days.map((d) => d.temp_max_c));
      const trough = Math.min(...f.days.map((d) => d.temp_min_c));
      forecast_summary = `~${total.toFixed(0)}mm rainfall, ${trough.toFixed(0)}–${peak.toFixed(0)}°C range`;
    }
    const ctx: ChatWeatherContext = {
      fetched_minutes_ago: 0,
      temp_c: Math.round(c.current.temp_c),
      feels_like_c: Math.round(c.current.feels_like_c),
      humidity_pct: c.current.humidity_pct,
      wind_ms: Math.round(c.current.wind_speed_ms),
      condition: c.current.condition.description,
      forecast_summary,
    };
    weatherContextCache.set(userKey, { ctx, fetchedAt: Date.now() });
    return ctx;
  } catch {
    return undefined;
  }
}
