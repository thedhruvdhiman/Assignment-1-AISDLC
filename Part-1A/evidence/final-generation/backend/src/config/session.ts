import session from 'express-session';
import MongoStore from 'connect-mongo';

const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET;
if (isProduction && (!sessionSecret || sessionSecret.length < 32)) {
  throw new Error('SESSION_SECRET must contain at least 32 characters in production');
}

const store = process.env.NODE_ENV !== 'test' && process.env.MONGODB_URI
  ? MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: 'sessions',
      ttl: 60 * 60 * 8,
      autoRemove: 'native',
    })
  : undefined;

if (isProduction && !store) {
  throw new Error('MONGODB_URI is required for persistent production sessions');
}

export const sessionMiddleware = session({
  name: 'library_session',
  secret: sessionSecret ?? 'development-only-secret-change-before-deploy-32',
  resave: false,
  saveUninitialized: false,
  store,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000,
  },
});
