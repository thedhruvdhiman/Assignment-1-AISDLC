import fs from 'node:fs/promises';
import path from 'node:path';
import { handle } from './agent.js';

const args = process.argv.slice(2);
const inputArgIndex = args.indexOf('--input');
const outputArgIndex = args.indexOf('--output');

if (inputArgIndex === -1 || outputArgIndex === -1) {
  console.error('Usage: node src/extractor.mjs --input <dataset.json> --output <output.json>');
  process.exit(1);
}

const inputPath = path.resolve(args[inputArgIndex + 1]);
const outputPath = path.resolve(args[outputArgIndex + 1]);

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function handleWithRetry(transcript, context, caseId, maxRetries = 4) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await handle(transcript, context);
    } catch (err) {
      const is429 = err.message && (err.message.includes('429') || err.message.includes('rate') || err.message.includes('quota'));
      const is5xx = err.message && (err.message.includes('503') || err.message.includes('502') || err.message.includes('500'));
      if ((is429 || is5xx) && attempt < maxRetries) {
        const waitMs = is429 ? 15000 * attempt : 5000 * attempt;
        console.log(`  Rate-limited on ${caseId} (attempt ${attempt}/${maxRetries}), retrying in ${waitMs/1000}s...`);
        await sleep(waitMs);
      } else {
        throw err;
      }
    }
  }
}

async function main() {
  const datasetRaw = await fs.readFile(inputPath, 'utf8');
  const dataset = JSON.parse(datasetRaw);

  const results = {};

  for (const testCase of dataset) {
    const id = testCase.id || 'unknown';
    console.log(`Processing test case: ${id}...`);
    try {
      const transcript = 
        typeof testCase.input === 'string' ? testCase.input :
        testCase.transcript ?? 
        testCase.input?.transcript ?? 
        testCase.input?.body ?? 
        testCase.input?.text ?? 
        testCase.input?.content ?? '';

      let rawContext = testCase.context ?? testCase.input?.context ?? null;
      let context = null;
      if (rawContext) {
        context = {};
        if (rawContext.meeting_date !== undefined) context.meetingDate = rawContext.meeting_date;
        if (rawContext.meetingDate !== undefined) context.meetingDate = rawContext.meetingDate;
        if (rawContext.participants !== undefined) context.participants = rawContext.participants;
      }

      const output = await handleWithRetry(transcript, context, id);
      results[id] = output;

    } catch (err) {
      console.error(`Failed on case ${id}:`, err.stack || err.message);
      results[id] = { error: err.message };
    }
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`Extraction complete. Outputs written to ${outputPath}`);
}

main().catch((err) => {
  console.error('Extractor failed:', err.stack || err);
  process.exit(1);
});