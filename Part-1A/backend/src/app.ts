import express from 'express';
import session from 'express-session';
import { authRouter } from './routes/auth.routes';
import { healthRouter } from './routes/health.routes';
import { errorHandler } from './middleware/error-handler';
import { csrfRouter } from './routes/csrf.routes';
import { sessionMiddleware } from './config/session';
import { booksRouter } from './routes/books.routes';
import { membersRouter } from './routes/members.routes';
import { loansRouter } from './routes/loans.routes';

export const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use(sessionMiddleware);
app.use('/api/auth', authRouter);
app.use('/api/csrf', csrfRouter);
app.use('/api/health', healthRouter);
app.use('/api/books', booksRouter);
app.use('/api/members', membersRouter);
app.use('/api/loans', loansRouter);
app.use(errorHandler);

export type AppSession = session.Session & Partial<session.SessionData> & {
  librarianId?: string;
  csrfToken?: string;
};
