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

async function main() {
  const datasetRaw = await fs.readFile(inputPath, 'utf8');
  const dataset = JSON.parse(datasetRaw);
  
  const results = {};
  for (const testCase of dataset) {
    console.log(`Processing test case: ${testCase.id || 'unknown'}...`);
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

      const output = await handle(transcript, context);
      results[testCase.id] = output;
      
      await new Promise((resolve) => setTimeout(resolve, 1200));
    } catch (err) {
      console.error(`Failed on case ${testCase.id}:`, err.stack || err.message);
      results[testCase.id] = { error: err.message };
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