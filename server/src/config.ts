import 'dotenv/config';
import { z } from 'zod';

const Env = z.object({
  PORT: z
    .string()
    .default('4000')
    .transform((v) => Number(v))
    .pipe(z.number().int().positive()),
  OPENWEATHER_API_KEY: z
    .string()
    .min(10, 'OPENWEATHER_API_KEY is missing or too short — set it in server/.env'),
  OPENWEATHER_BASE_URL: z
    .string()
    .url()
    .default('https://api.openweathermap.org/data/2.5'),
  OPENWEATHER_GEO_URL: z.string().url().default('https://api.openweathermap.org/geo/1.0'),
  ALLOWED_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  CACHE_TTL_SECONDS: z
    .string()
    .default('600')
    .transform((v) => Number(v))
    .pipe(z.number().int().min(300)),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),

  GROQ_API_KEY: z.string().default(''),
  // SDK appends /openai/v1 itself — base URL must be the bare host.
  GROQ_BASE_URL: z.string().url().default('https://api.groq.com'),
  GROQ_MODEL_TEXT: z.string().default('llama-3.3-70b-versatile'),
  GROQ_MODEL_VISION: z.string().default('meta-llama/llama-4-scout-17b-16e-instruct'),
  // Upper bound on completion tokens. `callGroq` clamps every request to this
  // cap, so the default must clear the most token-hungry feature (crop advisory
  // asks for ~4500 to satisfy its "3+ rich recommendations" schema). Lighter
  // routes (chat ~700, soil ~1400) pass smaller explicit values and are
  // unaffected. A lower cap here silently truncates advisory into
  // schema_validation_failed, so keep it aligned with .env.example.
  GROQ_MAX_TOKENS: z
    .string()
    .default('4500')
    .transform((v) => Number(v))
    .pipe(z.number().int().positive().max(8192)),
  GROQ_TIMEOUT_MS: z
    .string()
    .default('30000')
    .transform((v) => Number(v))
    .pipe(z.number().int().positive().max(120000)),

  ADMIN_TOKEN: z.string().default(''),
});

const parsed = Env.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('[config] Invalid environment:', parsed.error.flatten().fieldErrors);
  throw new Error('Server cannot start: invalid environment. See server/.env.example.');
}

export const config = parsed.data;

// Sentinel for obvious placeholder so the app can surface a clear error,
// instead of pretending everything is fine and failing at upstream call time.
export const isPlaceholderKey =
  config.OPENWEATHER_API_KEY === 'REPLACE_WITH_YOUR_ROTATED_KEY';

export const isGroqConfigured =
  config.GROQ_API_KEY.length > 10 &&
  config.GROQ_API_KEY !== 'REPLACE_WITH_YOUR_ROTATED_GROQ_KEY';
