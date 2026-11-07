import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { assertLocalDevelopmentDatabase } from '../config/development-database';
import { validateEnvironment } from '../config/environment';
import { Book, normalizeUniqueValue } from '../models/book.model';
import { Member } from '../models/member.model';
import type { Environment } from '../config/environment';

const books = [
  { title: 'The Left Hand of Darkness', author: 'Ursula K. Le Guin', isbn: '9780441478125', category: 'Science Fiction' },
  { title: 'A Wizard of Earthsea', author: 'Ursula K. Le Guin', isbn: '9780547773742', category: 'Fantasy' },
  { title: 'The Dispossessed', author: 'Ursula K. Le Guin', isbn: '9780061054884', category: 'Science Fiction' },
];

const members = [
  { name: 'Alex Reader', email: 'alex.reader@example.test' },
  { name: 'Jordan Reader', email: 'jordan.reader@example.test' },
];

export async function seedDevelopmentData(config: Environment = validateEnvironment()): Promise<void> {
  assertLocalDevelopmentDatabase(config.MONGODB_URI, config.NODE_ENV);
  await connectDatabase(config.MONGODB_URI);

  for (const book of books) {
    const isbnNormalized = normalizeUniqueValue(book.isbn);
    await Book.updateOne(
      { isbn_normalized: isbnNormalized },
      {
        $setOnInsert: {
          ...book,
          isbn_normalized: isbnNormalized,
          status: 'available' as const,
        },
      },
      { upsert: true },
    );
  }
  for (const member of members) {
    const emailNormalized = normalizeUniqueValue(member.email);
    await Member.updateOne(
      { email_normalized: emailNormalized },
      {
        $setOnInsert: {
          ...member,
          email_normalized: emailNormalized,
          active_loans_count: 0,
        },
      },
      { upsert: true },
    );
  }
  console.info('Local development sample books and members are ready.');
}

if (require.main === module) {
  void seedDevelopmentData()
    .catch((error: unknown) => {
      console.error('Development data seeding failed', error);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}
