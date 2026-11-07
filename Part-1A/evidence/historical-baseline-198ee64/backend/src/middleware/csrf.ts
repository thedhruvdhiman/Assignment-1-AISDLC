import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

export function issueCsrfToken(req: Request): string {
  if (!req.session.csrfToken) {
    req.session.csrfToken = randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
}

export function requireCsrf(req: Request, res: Response, next: NextFunction): void {
  if (safeMethods.has(req.method)) {
    next();
    return;
  }
  const token = req.get('X-CSRF-Token');
  const expected = req.session.csrfToken;
  if (!token || !expected || token.length !== expected.length) {
    res.status(403).json({ code: 'CSRF_INVALID', message: 'A valid CSRF token is required.' });
    return;
  }
  if (!timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
    res.status(403).json({ code: 'CSRF_INVALID', message: 'A valid CSRF token is required.' });
    return;
  }
  next();
}
