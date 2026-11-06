import { Router } from 'express';
import { z } from 'zod';
import { requireCsrf } from '../middleware/csrf';
import { HttpError } from '../middleware/error-handler';
import { requireLibrarian } from '../middleware/require-librarian';
import {
  archiveMember,
  createMember,
  getMember,
  listMembers,
  updateMember,
  validObjectId,
} from '../services/member.service';

export const membersRouter = Router();
membersRouter.use(requireLibrarian);

const memberInput = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(254),
});

function pagination(query: Record<string, unknown>) {
  const page = Number(query.page ?? 1);
  const pageSize = Number(query.pageSize ?? 20);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new HttpError(400, 'INVALID_PAGINATION', 'page must be a positive integer and pageSize must be between 1 and 100.');
  }
  return { page, pageSize };
}

membersRouter.get('/', async (req, res) => {
  const { page, pageSize } = pagination(req.query as Record<string, unknown>);
  res.json(await listMembers(page, pageSize));
});

membersRouter.post('/', requireCsrf, async (req, res) => {
  const parsed = memberInput.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, 'VALIDATION_ERROR', 'Member name and email are required.');
  res.status(201).json(await createMember(parsed.data));
});

membersRouter.get('/:memberId', async (req, res) => {
  const memberId = String(req.params.memberId);
  if (!validObjectId(memberId)) throw new HttpError(400, 'INVALID_ID', 'Member ID is invalid.');
  res.json(await getMember(memberId));
});

membersRouter.patch('/:memberId', requireCsrf, async (req, res) => {
  const memberId = String(req.params.memberId);
  if (!validObjectId(memberId)) throw new HttpError(400, 'INVALID_ID', 'Member ID is invalid.');
  const parsed = memberInput.partial().strict().safeParse(req.body);
  if (!parsed.success || Object.keys(req.body as object).length === 0) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'At least one valid member field is required.');
  }
  res.json(await updateMember(memberId, parsed.data));
});

membersRouter.delete('/:memberId', requireCsrf, async (req, res) => {
  const memberId = String(req.params.memberId);
  if (!validObjectId(memberId)) throw new HttpError(400, 'INVALID_ID', 'Member ID is invalid.');
  await archiveMember(memberId);
  res.status(204).end();
});
