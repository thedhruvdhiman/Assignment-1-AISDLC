const LOCAL_HOSTS = new Set(['localhost', 'localhost.', '::1', '[::1]']);
const ALLOWED_DATABASES = new Set(['library', 'library_dev', 'book_library_dev']);

export function assertLocalDevelopmentDatabase(
  uri: string,
  nodeEnvironment: string | undefined = process.env.NODE_ENV,
): void {
  if (nodeEnvironment !== 'development') {
    throw new Error('Development database commands are available only when NODE_ENV=development.');
  }

  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error('MONGODB_URI must be a valid local MongoDB connection string.');
  }

  if (parsed.protocol !== 'mongodb:') {
    throw new Error('Development database commands require a local mongodb:// URI; SRV and other protocols are not allowed.');
  }

  const hostname = parsed.hostname.toLowerCase();
  const isLoopbackIpv4 = /^127(?:\.\d{1,3}){3}$/.test(hostname);
  if (!LOCAL_HOSTS.has(hostname) && !isLoopbackIpv4) {
    throw new Error('Development database commands require a loopback MongoDB host.');
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  if (!ALLOWED_DATABASES.has(database)) {
    throw new Error('MongoDB database name is not in the local development allowlist.');
  }
}
