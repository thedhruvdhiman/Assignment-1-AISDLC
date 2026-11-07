import argon2 from 'argon2';
import { Librarian } from '../models/librarian.model';

export async function verifyLibrarian(
  email: string,
  password: string,
): Promise<{ id: string; email: string } | null> {
  const emailNormalized = email.trim().toLocaleLowerCase('en-US');
  const librarian = await Librarian.findOne({ email_normalized: emailNormalized });
  if (!librarian || librarian.disabled_at) return null;
  const valid = await argon2.verify(librarian.password_hash, password);
  return valid ? { id: librarian.id, email: librarian.email_normalized } : null;
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}
