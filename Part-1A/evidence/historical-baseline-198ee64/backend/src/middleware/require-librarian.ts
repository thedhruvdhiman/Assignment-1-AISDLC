import type { NextFunction, Request, Response } from 'express';

export function requireLibrarian(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.session.librarianId) {
    res.status(401).json({ code: 'UNAUTHENTICATED', message: 'Librarian sign-in is required.' });
    return;
  }
  next();
}
