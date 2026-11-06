import { Router } from 'express';
import { issueCsrfToken } from '../middleware/csrf';

export const csrfRouter = Router();

csrfRouter.get('/', (req, res, next) => {
  const csrfToken = issueCsrfToken(req);
  req.session.save((error) => {
    if (error) return next(error);
    res.json({ csrf_token: csrfToken });
  });
});
