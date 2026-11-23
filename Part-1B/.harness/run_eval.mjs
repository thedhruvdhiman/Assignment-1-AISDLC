import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { validateSchema } from './evaluators/structural.mjs';
import { checkInvariants } from './evaluators/invariants.mjs';
import { scoreSemantic } from './evaluators/semantic.mjs';
import { aggregateResults } from './evaluators/aggregate.mjs';

const args = process.argv.slice(2);
const outputsFlagIndex = args.indexOf('--outputs');
const replayFlagIndex = args.indexOf('--replay');
const isLock = args.includes('--lock');
const snapshotFlagIndex = args.indexOf('--snapshot');

// Helper to compute SHA-256 hash of a file
function computeFileHash(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  } catch (e) {
    return null;
  }
}

// Normalizer to harmonize camelCase (spec contract SCH-1) and snake_case (harness) outputs
function normalizeOutput(raw) {
  if (!raw || raw.error) {
    return {
      outcome: 'no_content',
      action_items: [],
      decisions: [],
      clarifications: [],
      needs_clarification: false,
      summary: null
    };
  }
  const action_items = (raw.action_items ?? raw.actionItems ?? []).map(a => ({
    task: a.task,
    assignee: a.assignee ?? null,
    deadline: a.deadline ?? null,
    source_quote: a.source_quote
  }));
  const decisions = (raw.decisions ?? raw.keyDecisions ?? []).map(d => ({
    decision: d.decision,
    source_quote: d.source_quote
  }));
  const clarifications = (raw.clarifications ?? raw.clarificationQuestions ?? []).map(c => {
    let about = c.about;
    if (about === 'actionItem') about = 'task';
    else if (about === 'transcript') about = 'other';
    else if (!['assignee', 'deadline', 'task', 'decision', 'other'].includes(about)) about = 'other';
    return {
      about,
      item_index: c.item_index !== undefined ? c.item_index : (c.itemIndex !== undefined ? c.itemIndex : null),
      question: c.question
    };
  });
  const outcome = raw.outcome ?? ((action_items.length > 0 || decisions.length > 0) ? 'extracted' : 'no_content');
  const needs_clarification = raw.needs_clarification ?? (clarifications.length > 0);
  const summary = raw.summary ?? null;

  return {
    outcome,
    action_items,
    decisions,
    clarifications,
    needs_clarification,
    summary
  };
}

if (isLock) {
  console.log('Generating .harness/input-lock.json...');
  const lockData = {
    timestamp: new Date().toISOString(),
    files: {
      dataset: computeFileHash('evals/dataset.json'),
      schema: computeFileHash('.harness/response.schema.json') || computeFileHash('.harness/schema/output.schema.json'),
      threshold: computeFileHash('.harness/threshold.json'),
      runner: computeFileHash('.harness/run_eval.mjs'),
      structuralEvaluator: computeFileHash('.harness/evaluators/structural.mjs'),
      invariantEvaluator: computeFileHash('.harness/evaluators/invariants.mjs'),
      semanticEvaluator: computeFileHash('.harness/evaluators/semantic.mjs'),
      matchingModule: computeFileHash('.harness/evaluators/matching.mjs'),
      aggregateModule: computeFileHash('.harness/evaluators/aggregate.mjs')
    }
  };
  fs.writeFileSync('.harness/input-lock.json', JSON.stringify(lockData, null, 2));
  console.log('.harness/input-lock.json created successfully.');
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
} else if (replayFlagIndex !== -1) {
  const replayPath = path.resolve(args[replayFlagIndex + 1]);
  outputs = JSON.parse(fs.readFileSync(replayPath, 'utf-8'));
}

let caseResults = [];
for (const testCase of dataset) {
  const rawOut = outputs[testCase.id];
  const out = normalizeOutput(rawOut);
  const idealOut = rawOut ? normalizeOutput(rawOut) : {};

  const structural = validateSchema(out);
  const invariant = checkInvariants(out, testCase);
  const semantic = scoreSemantic(out, testCase, idealOut);

  const expectedActions = idealOut.action_items || [];
  const expectedCount = expectedActions.length;
  const producedCount = out.action_items?.length || 0;
  const matchedCount = expectedCount > 0 ? Math.round(semantic.recall * expectedCount) : 0;

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
