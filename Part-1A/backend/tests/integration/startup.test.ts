import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDatabase } from '../../src/config/database';
import { validateEnvironment } from '../../src/config/environment';

describe('startup prerequisites', () => {
  afterEach(async () => {
    jest.restoreAllMocks();
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });

  it('rejects startup when required environment configuration is missing', () => {
    expect(() => validateEnvironment({})).toThrow('Invalid environment configuration');
  });

  it('propagates an unreachable database error so the server cannot start', async () => {
    const connectionError = new Error('MongoDB unavailable');
    jest.spyOn(mongoose, 'connect').mockRejectedValue(connectionError);

    await expect(connectDatabase('mongodb://127.0.0.1:27017/library'))
      .rejects.toBe(connectionError);
  });

  it('rejects a standalone MongoDB deployment without transaction support', async () => {
    const server = await MongoMemoryServer.create();
    try {
      await expect(connectDatabase(server.getUri()))
        .rejects.toThrow('MongoDB must run as a replica set or sharded cluster for transactions');
    } finally {
      await mongoose.disconnect();
      await server.stop();
    }
  });
});
