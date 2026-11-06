import { assertLocalDevelopmentDatabase } from '../../src/config/development-database';
import { validateEnvironment } from '../../src/config/environment';
import { parseProvisioningCredentials } from '../../src/services/librarian-provisioning.service';

describe('local development database guard', () => {
  it.each([
    'mongodb://127.0.0.1:27017/library?replicaSet=rs0',
    'mongodb://localhost:27017/library_dev',
    'mongodb://[::1]:27017/book_library_dev',
  ])('allows loopback allowlisted URI %s', (uri) => {
    expect(() => assertLocalDevelopmentDatabase(uri, 'development')).not.toThrow();
  });

  it.each([
    ['mongodb+srv://cluster.example/library', 'development'],
    ['mongodb://example.com:27017/library', 'development'],
    ['mongodb://127.0.0.1:27017/production', 'development'],
    ['mongodb://127.0.0.1:27017/library', 'production'],
    ['not a URI', 'development'],
  ])('rejects unsafe URI %s in %s mode', (uri, mode) => {
    expect(() => assertLocalDevelopmentDatabase(uri, mode)).toThrow();
  });
});

describe('librarian environment validation', () => {
  const base = {
    MONGODB_URI: 'mongodb://127.0.0.1:27017/library',
    SESSION_SECRET: 'a-session-secret-that-is-long-enough-for-tests',
    LIBRARY_TIME_ZONE: 'Asia/Kolkata',
    NODE_ENV: 'development',
  };

  it('accepts a valid local credential pair', () => {
    expect(validateEnvironment({
      ...base,
      LIBRARIAN_EMAIL: 'librarian@example.com',
      LIBRARIAN_PASSWORD: 'unique-test-password',
    }).LIBRARIAN_EMAIL).toBe('librarian@example.com');
  });

  it('rejects incomplete or weak credentials and production development credentials', () => {
    expect(() => validateEnvironment({ ...base, LIBRARIAN_EMAIL: 'librarian@example.com' })).toThrow();
    expect(() => validateEnvironment({ ...base, LIBRARIAN_EMAIL: 'librarian@example.com', LIBRARIAN_PASSWORD: 'short' })).toThrow();
    expect(() => validateEnvironment({
      ...base,
      NODE_ENV: 'production',
      LIBRARIAN_EMAIL: 'librarian@example.com',
      LIBRARIAN_PASSWORD: 'unique-test-password',
    })).toThrow();
  });

  it('rejects missing and weak provisioning credentials', () => {
    expect(() => parseProvisioningCredentials({})).toThrow();
    expect(() => parseProvisioningCredentials({
      LIBRARIAN_EMAIL: 'not-an-email',
      LIBRARIAN_PASSWORD: 'short',
    })).toThrow();
  });
});
