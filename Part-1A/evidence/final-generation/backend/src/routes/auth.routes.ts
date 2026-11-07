import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { issueCsrfToken, requireCsrf } from '../middleware/csrf';
import { verifyLibrarian } from '../services/auth.service';
import { logger } from '../observability/logger';
import type { AppSession } from '../app';

export const authRouter = Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(1024),
});

authRouter.get('/session', (req, res, next) => {
  const csrfToken = issueCsrfToken(req);
  req.session.save((error) => {
    if (error) return next(error);
    res.json({
      authenticated: Boolean(req.session.librarianId),
      csrf_token: csrfToken,
      ...(req.session.librarianId
        ? { librarian: { id: req.session.librarianId } }
        : {}),
    });
  });
});

authRouter.post('/login', requireCsrf, async (req, res, next) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: 'VALIDATION_ERROR', message: 'A valid email and password are required.' });
    return;
  }
  try {
    const librarian = await verifyLibrarian(parsed.data.email, parsed.data.password);
    if (!librarian) {
      logger.info({ event: 'sign_in_failed' });
      res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' });
      return;
    }
    req.session.regenerate((error) => {
      if (error) return next(error);
      const currentSession = req.session as AppSession;
      currentSession.librarianId = librarian.id;
      currentSession.csrfToken = randomBytes(32).toString('hex');
      currentSession.save((saveError) => {
        if (saveError) return next(saveError);
        logger.info({ event: 'sign_in_succeeded', librarian_id: librarian.id });
        res.json({
          authenticated: true,
          csrf_token: currentSession.csrfToken,
          librarian: { id: librarian.id, email: librarian.email },
        });
      });
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', requireCsrf, (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie('library_session', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
    res.status(204).end();
  });
});
