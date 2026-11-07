import { Router } from 'express';
import { z } from 'zod';
import { requireCsrf } from '../middleware/csrf';
import { HttpError } from '../middleware/error-handler';
import { requireLibrarian } from '../middleware/require-librarian';
import { archiveBook, createBook, getBook, listBooks, restoreBook, updateBook } from '../services/book.service';

export const booksRouter = Router();
booksRouter.use(requireLibrarian);

const bookInput = z.object({
  title: z.string().trim().min(1).max(300),
  author: z.string().trim().min(1).max(200),
  isbn: z.string().trim().min(1).max(32),
  category: z.string().trim().min(1).max(100),
  status: z.enum(['available', 'issued', 'maintenance']).optional(),
});
const idSchema = z.string().regex(/^[0-9a-f]{24}$/i);

function pagination(query: Record<string, unknown>) {
  const page = Number(query.page ?? 1);
  const pageSize = Number(query.pageSize ?? 20);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new HttpError(400, 'INVALID_PAGINATION', 'page must be a positive integer and pageSize must be between 1 and 100.');
  }
  return { page, pageSize };
}

booksRouter.get('/', async (req, res) => {
  const parsed = z.object({
    q: z.string().max(200).optional(),
    category: z.string().max(100).optional(),
    status: z.enum(['available', 'issued', 'maintenance']).optional(),
    sort: z.enum(['title', 'created_at', 'status_priority']).optional(),
    direction: z.enum(['asc', 'desc']).optional(),
    archived: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  }).safeParse(req.query);
  if (!parsed.success) throw new HttpError(400, 'INVALID_QUERY', 'One or more catalog query parameters are invalid.');
  const page = pagination(req.query as Record<string, unknown>);
  res.json(await listBooks({ ...parsed.data, ...page }));
});

booksRouter.get('/:bookId', async (req, res) => {
  const bookId = String(req.params.bookId);
  if (!idSchema.safeParse(bookId).success) throw new HttpError(400, 'INVALID_ID', 'Book ID is invalid.');
  res.json(await getBook(bookId));
});

booksRouter.post('/:bookId/restore', requireCsrf, async (req, res) => {
  const bookId = String(req.params.bookId);
  if (!idSchema.safeParse(bookId).success) throw new HttpError(400, 'INVALID_ID', 'Book ID is invalid.');
  res.json(await restoreBook(bookId));
});

booksRouter.post('/', requireCsrf, async (req, res) => {
  const parsed = bookInput.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, 'VALIDATION_ERROR', 'Book fields are invalid.');
  if (parsed.data.status === 'issued') throw new HttpError(400, 'INVALID_INITIAL_STATUS', 'A new book cannot start as issued.');
  res.status(201).json(await createBook(parsed.data));
});

booksRouter.patch('/:bookId', requireCsrf, async (req, res) => {
  const bookId = String(req.params.bookId);
  if (!idSchema.safeParse(bookId).success) throw new HttpError(400, 'INVALID_ID', 'Book ID is invalid.');
  const parsed = bookInput.partial().strict().safeParse(req.body);
  if (!parsed.success || Object.keys(req.body as object).length === 0) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'At least one valid book field is required.');
  }
  res.json(await updateBook(bookId, parsed.data));
});

booksRouter.delete('/:bookId', requireCsrf, async (req, res) => {
  const bookId = String(req.params.bookId);
  if (!idSchema.safeParse(bookId).success) throw new HttpError(400, 'INVALID_ID', 'Book ID is invalid.');
  await archiveBook(bookId);
  res.status(204).end();
});
