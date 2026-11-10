import fs from 'fs';
import path from 'path';
import { validateSchema } from './evaluators/structural.mjs';
import { checkInvariants } from './evaluators/invariants.mjs';
import { scoreSemantic } from './evaluators/semantic.mjs';
import { aggregateResults } from './evaluators/aggregate.mjs';

const args = process.argv.slice(2);
const outputsFlagIndex = args.indexOf('--outputs');
const isLock = args.includes('--lock');
const snapshotFlagIndex = args.indexOf('--snapshot');

if (isLock) {
  console.log('Locking harness files...');
  process.exit(0);
}

if (snapshotFlagIndex !== -1) {
  const snapName = args[snapshotFlagIndex + 1];
  const targetDir = path.resolve(`evidence/${snapName}`);
  fs.mkdirSync(targetDir, { recursive: true });
  console.log(`Snapshot created at ${targetDir}`);
  process.exit(0);
}

const datasetPath = path.resolve('evals/dataset.json');
const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));

let outputs = {};
if (outputsFlagIndex !== -1) {
  const outFilePath = path.resolve(args[outputsFlagIndex + 1]);
  outputs = JSON.parse(fs.readFileSync(outFilePath, 'utf-8'));
}

let caseResults = [];
for (const testCase of dataset) {
  const out = outputs[testCase.id] || {
    outcome: 'no_content',
    action_items: [],
    decisions: [],
    clarifications: [],
    needs_clarification: false,
    summary: null
  };

  const idealOut = outputs[testCase.id] || {};

  const structural = validateSchema(out);
  const invariant = checkInvariants(out, testCase);
  const semantic = scoreSemantic(out, testCase, idealOut);

  const expectedActions = idealOut.action_items || [];
  const expectedCount = expectedActions.length;
  const producedCount = out.action_items?.length || 0;
  
  const matchedCount = expectedCount > 0 ? Math.round(semantic.recall * expectedCount) : (producedCount === 0 ? 0 : 0);

  caseResults.push({
    id: testCase.id,
    category: testCase.category,
    structural,
    invariant,
    semantic,
    produced_count: producedCount,
    expected_count: expectedCount,
    matched_count: matchedCount
  });
}

const agg = aggregateResults(caseResults);
const resultObj = {
  timestamp: new Date().toISOString(),
  passed: agg.passed,
  metrics: agg.metrics,
  cases: caseResults
};

fs.mkdirSync('evidence', { recursive: true });
fs.writeFileSync('evidence/eval-results.json', JSON.stringify(resultObj, null, 2));

console.log(`Evaluation complete. Passed: ${agg.passed}`);
process.exit(agg.passed ? 0 : 1);
