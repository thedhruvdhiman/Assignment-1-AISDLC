import 'express-session';

declare module 'express-session' {
  interface SessionData {
    librarianId?: string;
    csrfToken?: string;
  }
}
