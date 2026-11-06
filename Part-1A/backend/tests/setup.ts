process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET ??= 'test-only-session-secret-with-sufficient-length';
process.env.LIBRARY_TIME_ZONE ??= 'UTC';
process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/library_test';
