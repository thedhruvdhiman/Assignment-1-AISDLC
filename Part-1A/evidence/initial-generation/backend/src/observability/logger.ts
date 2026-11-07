type LogEntry = Record<string, unknown> & { event: string };

function write(level: 'info' | 'error', entry: LogEntry): void {
  const safeEntry = Object.fromEntries(
    Object.entries(entry).filter(([key]) =>
      !/password|csrf|session|token|email|name/i.test(key),
    ),
  );
  const output = JSON.stringify({ timestamp: new Date().toISOString(), ...safeEntry });
  if (level === 'error') console.error(output);
  else console.info(output);
}

export const logger = {
  info: (entry: LogEntry): void => write('info', entry),
  error: (entry: LogEntry): void => write('error', entry),
};
