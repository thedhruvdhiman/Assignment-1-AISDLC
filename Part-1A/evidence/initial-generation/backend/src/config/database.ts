import mongoose from 'mongoose';

export async function connectDatabase(uri: string): Promise<void> {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  const hello = await mongoose.connection.db?.admin().command({ hello: 1 });
  if (!hello || (!hello.setName && hello.msg !== 'isdbgrid')) {
    await mongoose.disconnect();
    throw new Error('MongoDB must run as a replica set or sharded cluster for transactions');
  }
}
