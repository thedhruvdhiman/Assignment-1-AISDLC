import { Router } from 'express';
import { z } from 'zod';
import { requireCsrf } from '../middleware/csrf';
import { HttpError } from '../middleware/error-handler';
import { requireLibrarian } from '../middleware/require-librarian';
import { logger } from '../observability/logger';
import { issueBook, getLoan, listLoans, returnLoan, validateLoanObjectId } from '../services/loan.service';
import { validateEnvironment } from '../config/environment';

export const loansRouter = Router();
loansRouter.use(requireLibrarian);

function pagination(query: Record<string, unknown>) {
  const page = Number(query.page ?? 1);
  const pageSize = Number(query.pageSize ?? 20);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new HttpError(400, 'INVALID_PAGINATION', 'page must be a positive integer and pageSize must be between 1 and 100.');
  }
  return { page, pageSize };
}

loansRouter.get('/', async (req, res) => {
  const status = req.query.status;
  if (status !== undefined && !['active', 'overdue', 'returned'].includes(String(status))) {
    throw new HttpError(400, 'INVALID_STATUS', 'Loan status is invalid.');
  }
  const page = pagination(req.query as Record<string, unknown>);
  const { LIBRARY_TIME_ZONE: timeZone } = validateEnvironment();
  res.json(await listLoans({ ...page, status: status as string | undefined }, timeZone));
});

loansRouter.get('/overdue', async (req, res) => {
  const page = pagination(req.query as Record<string, unknown>);
  const { LIBRARY_TIME_ZONE: timeZone } = validateEnvironment();
  res.json(await listLoans({ ...page, overdueOnly: true }, timeZone));
});

loansRouter.post('/issue', requireCsrf, async (req, res) => {
  const parsed = z.object({
    book_id: z.string().regex(/^[0-9a-f]{24}$/i),
    member_id: z.string().regex(/^[0-9a-f]{24}$/i),
  }).safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, 'VALIDATION_ERROR', 'Valid book_id and member_id are required.');
  const { LIBRARY_TIME_ZONE: timeZone } = validateEnvironment();
  try {
    const loan = await issueBook(parsed.data.book_id, parsed.data.member_id, timeZone);
    logger.info({ event: 'book_issue', loan_id: String(loan._id), book_id: parsed.data.book_id });
    res.status(201).json(loan);
  } catch (error) {
    logger.error({ event: 'book_issue_failed', book_id: parsed.data.book_id });
    throw error;
  }
});

loansRouter.post('/return/:loanId', requireCsrf, async (req, res) => {
  const loanId = String(req.params.loanId);
  if (!validateLoanObjectId(loanId)) throw new HttpError(400, 'INVALID_ID', 'Loan ID is invalid.');
  const { LIBRARY_TIME_ZONE: timeZone } = validateEnvironment();
  try {
    const loan = await returnLoan(loanId, timeZone);
    logger.info({ event: 'book_return', loan_id: loanId });
    res.json(loan);
  } catch (error) {
    logger.error({ event: 'book_return_failed', loan_id: loanId });
    throw error;
  }
});

loansRouter.get('/:loanId', async (req, res) => {
  const loanId = String(req.params.loanId);
  if (!validateLoanObjectId(loanId)) throw new HttpError(400, 'INVALID_ID', 'Loan ID is invalid.');
  const { LIBRARY_TIME_ZONE: timeZone } = validateEnvironment();
  res.json(await getLoan(loanId, timeZone));
});
