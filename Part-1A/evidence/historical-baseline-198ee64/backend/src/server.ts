import 'dotenv/config';
import { app } from './app';
import { connectDatabase } from './config/database';
import { validateEnvironment } from './config/environment';

async function start(): Promise<void> {
  const config = validateEnvironment();
  await connectDatabase(config.MONGODB_URI);
  app.listen(config.PORT, () => {
    console.info(`Library API listening on port ${config.PORT}`);
  });
}

void start().catch((error: unknown) => {
  console.error('Unable to start library API', error);
  process.exitCode = 1;
});
