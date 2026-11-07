import { z } from 'zod';

const environmentSchema = z.object({
  MONGODB_URI: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  LIBRARY_TIME_ZONE: z.string().min(1),
  LIBRARIAN_EMAIL: z.string().trim().email().optional(),
  LIBRARIAN_PASSWORD: z.string().min(12).optional(),
  FRONTEND_ORIGIN: z.string().url().optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
}).superRefine((config, context) => {
  if (config.NODE_ENV === 'production' && (config.LIBRARIAN_EMAIL || config.LIBRARIAN_PASSWORD)) {
    context.addIssue({
      code: 'custom',
      path: ['LIBRARIAN_EMAIL'],
      message: 'Development librarian credentials must not be configured in production.',
    });
  }
  if (Boolean(config.LIBRARIAN_EMAIL) !== Boolean(config.LIBRARIAN_PASSWORD)) {
    context.addIssue({
      code: 'custom',
      path: ['LIBRARIAN_EMAIL'],
      message: 'LIBRARIAN_EMAIL and LIBRARIAN_PASSWORD must be configured together.',
    });
  }
});

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): Environment {
  const parsed = environmentSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: parsed.data.LIBRARY_TIME_ZONE });
  } catch {
    throw new Error('LIBRARY_TIME_ZONE must be a valid IANA time zone');
  }
  return parsed.data;
}
