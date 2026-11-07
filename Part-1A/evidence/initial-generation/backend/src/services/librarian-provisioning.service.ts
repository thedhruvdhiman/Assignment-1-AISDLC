import { z } from 'zod';
import { Librarian } from '../models/librarian.model';
import { normalizeUniqueValue } from '../models/book.model';
import { hashPassword } from './auth.service';

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(12),
});

export function parseProvisioningCredentials(
  env: NodeJS.ProcessEnv = process.env,
): { email: string; password: string } {
  const parsed = credentialsSchema.safeParse({
    email: env.LIBRARIAN_EMAIL,
    password: env.LIBRARIAN_PASSWORD,
  });
  if (!parsed.success) {
    throw new Error('Set a valid LIBRARIAN_EMAIL and a LIBRARIAN_PASSWORD of at least 12 characters in the environment.');
  }
  return parsed.data;
}

export async function provisionLibrarianAccount(
  email: string,
  password: string,
): Promise<boolean> {
  const emailNormalized = normalizeUniqueValue(email);
  if (await Librarian.exists({ email_normalized: emailNormalized })) return false;

  await Librarian.create({
    email_normalized: emailNormalized,
    password_hash: await hashPassword(password),
  });
  return true;
}
