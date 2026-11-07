import type { PipelineStage } from 'mongoose';
import { Book, normalizeUniqueValue } from '../models/book.model';
import { HttpError } from '../middleware/error-handler';

export type BookInput = {
  title: string;
  author: string;
  isbn: string;
  category: string;
  status?: 'available' | 'issued' | 'maintenance';
};

function publicBook(book: Record<string, unknown>): Record<string, unknown> {
  const { isbn_normalized: _normalized, archived_at: _archived, ...publicFields } = book;
  return publicFields;
}

export async function createBook(input: BookInput): Promise<Record<string, unknown>> {
  const book = await Book.create({
    ...input,
    isbn_normalized: normalizeUniqueValue(input.isbn),
  });
  return publicBook(book.toObject());
}

export async function getBook(id: string): Promise<Record<string, unknown>> {
  const book = await Book.findOne({ _id: id, archived_at: null }).lean();
  if (!book) throw new HttpError(404, 'BOOK_NOT_FOUND', 'Book not found.');
  return publicBook(book as unknown as Record<string, unknown>);
}

export async function updateBook(
  id: string,
  input: Partial<BookInput>,
): Promise<Record<string, unknown>> {
  const current = await Book.findOne({ _id: id, archived_at: null });
  if (!current) throw new HttpError(404, 'BOOK_NOT_FOUND', 'Book not found.');
  if (input.status === 'issued') {
    throw new HttpError(400, 'INVALID_STATUS_TRANSITION', 'A book can be marked issued only by the issue workflow.');
  }
  if (input.status && current.status === 'issued') {
    throw new HttpError(409, 'BOOK_HAS_ACTIVE_LOAN', 'Return the active loan before changing this book status.');
  }
  const update: Record<string, unknown> = { ...input };
  if (input.isbn !== undefined) update.isbn_normalized = normalizeUniqueValue(input.isbn);
  const book = await Book.findOneAndUpdate(
    { _id: id, archived_at: null, status: current.status },
    { $set: update },
    { new: true, runValidators: true },
  ).lean();
  if (!book) throw new HttpError(409, 'BOOK_UPDATE_CONFLICT', 'The book changed during this update. Reload it and try again.');
  return publicBook(book as unknown as Record<string, unknown>);
}

export async function archiveBook(id: string): Promise<void> {
  const { Loan } = await import('../models/loan.model');
  const book = await Book.findOne({ _id: id, archived_at: null });
  if (!book) throw new HttpError(404, 'BOOK_NOT_FOUND', 'Book not found.');
  const active = await Loan.exists({ book_id: id, return_date: null });
  if (active) throw new HttpError(409, 'BOOK_HAS_ACTIVE_LOAN', 'Return the active loan before archiving this book.');
  book.archived_at = new Date();
  await book.save();
}

export async function restoreBook(id: string): Promise<Record<string, unknown>> {
  const book = await Book.findOneAndUpdate(
    { _id: id, archived_at: { $ne: null } },
    { $set: { archived_at: null } },
    { new: true, runValidators: true },
  ).lean();
  if (book) return publicBook(book as unknown as Record<string, unknown>);

  if (!await Book.exists({ _id: id })) {
    throw new HttpError(404, 'BOOK_NOT_FOUND', 'Book not found.');
  }
  throw new HttpError(409, 'BOOK_NOT_ARCHIVED', 'The book is already active.');
}

export async function listBooks(query: {
  q?: string;
  category?: string;
  status?: string;
  sort?: string;
  direction?: string;
  archived?: boolean;
  page: number;
  pageSize: number;
}): Promise<{ items: Record<string, unknown>[]; page: number; pageSize: number; total: number; totalPages: number }> {
  const match: Record<string, unknown> = {
    archived_at: query.archived ? { $ne: null } : null,
  };
  if (query.category) match.category = query.category;
  if (query.status) match.status = query.status;
  if (query.q) {
    const escaped = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    match.$or = [{ title: regex }, { author: regex }];
  }
  const direction = query.direction === 'desc' ? -1 : 1;
  const sortKey = ['title', 'created_at', 'status_priority'].includes(query.sort ?? '')
    ? query.sort
    : 'title';
  const pipeline: PipelineStage[] = [{ $match: match }];
  if (sortKey === 'status_priority') {
    pipeline.push({
      $addFields: {
        status_order: {
          $switch: {
            branches: [
              { case: { $eq: ['$status', 'available'] }, then: 0 },
              { case: { $eq: ['$status', 'issued'] }, then: 1 },
            ],
            default: 2,
          },
        },
      },
    });
    pipeline.push({ $sort: { status_order: direction, _id: 1 } });
  } else {
    pipeline.push({ $sort: { [sortKey ?? 'title']: direction, _id: 1 } });
  }
  pipeline.push({
    $facet: {
      items: [
        { $skip: (query.page - 1) * query.pageSize },
        { $limit: query.pageSize },
      ],
      count: [{ $count: 'total' }],
    },
  });
  const [result] = await Book.aggregate(pipeline);
  const total = (result?.count[0]?.total as number | undefined) ?? 0;
  return {
    items: (result?.items ?? []).map((book: Record<string, unknown>) => publicBook(book)),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.ceil(total / query.pageSize),
  };
}
