import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let replicaSet: MongoMemoryReplSet | undefined;

export async function connectTestDatabase(): Promise<void> {
  replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replicaSet.getUri(), { dbName: 'library-tests' });
}

export async function disconnectTestDatabase(): Promise<void> {
  await mongoose.disconnect();
  await replicaSet?.stop();
}

export async function clearTestDatabase(): Promise<void> {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})),
  );
}
