import { connectDatabase } from '../../src/config/database';
import type { Environment } from '../../src/config/environment';
import { seedDevelopmentData } from '../../src/scripts/seed-development';

jest.mock('../../src/config/database', () => ({
  connectDatabase: jest.fn(),
}));

const safeConfig: Environment = {
  MONGODB_URI: 'mongodb://127.0.0.1:27017/library?replicaSet=rs0',
  SESSION_SECRET: 'test-only-session-secret-with-sufficient-length',
  LIBRARY_TIME_ZONE: 'UTC',
  PORT: 3000,
  NODE_ENV: 'development',
};

describe('development seed safety', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    { ...safeConfig, NODE_ENV: 'production' as const },
    { ...safeConfig, MONGODB_URI: 'mongodb://example.com:27017/library' },
    { ...safeConfig, MONGODB_URI: 'mongodb+srv://cluster.example/library' },
    { ...safeConfig, MONGODB_URI: 'mongodb://127.0.0.1:27017/unapproved' },
  ])('refuses unsafe target before connecting or writing', async (config) => {
    await expect(seedDevelopmentData(config)).rejects.toThrow();
    expect(connectDatabase).not.toHaveBeenCalled();
  });
});
