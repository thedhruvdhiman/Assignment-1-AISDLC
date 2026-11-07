import 'dotenv/config';
import { validateEnvironment } from '../config/environment';
import { connectDatabase } from '../config/database';
import mongoose from 'mongoose';
import { assertLocalDevelopmentDatabase } from '../config/development-database';
import {
  parseProvisioningCredentials,
  provisionLibrarianAccount,
} from '../services/librarian-provisioning.service';

async function provision(): Promise<void> {
  const config = validateEnvironment();
  assertLocalDevelopmentDatabase(config.MONGODB_URI, config.NODE_ENV);
  const credentials = parseProvisioningCredentials();
  await connectDatabase(config.MONGODB_URI);
  const created = await provisionLibrarianAccount(credentials.email, credentials.password);
  if (!created) {
    console.info('Configured librarian already exists; no changes made.');
    return;
  }
  console.info('Librarian account provisioned.');
}

void provision()
  .catch((error: unknown) => {
    console.error('Librarian provisioning failed', error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
