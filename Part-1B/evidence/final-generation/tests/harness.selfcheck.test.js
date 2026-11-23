import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { validateSchema } from '../.harness/evaluators/structural.mjs';
import { checkInvariants } from '../.harness/evaluators/invariants.mjs';

describe('HR-11: Evaluation Harness Self-Tests', () => {
  const dataset = JSON.parse(fs.readFileSync(path.resolve('evals/dataset.json'), 'utf-8'));
  const idealOutputs = JSON.parse(fs.readFileSync(path.resolve('evidence/harness-validation/ideal-outputs.json'), 'utf-8'));
  const badOutputs = JSON.parse(fs.readFileSync(path.resolve('evidence/harness-validation/bad-outputs.json'), 'utf-8'));

  it('passes schema and invariant checks for ideal outputs', () => {
    const testCase = dataset.find(c => c.id === 'MA-01');
    const output = idealOutputs['MA-01'];
    assert.equal(validateSchema(output).valid, true);
    assert.equal(checkInvariants(output, testCase).passed, true);
  });

  it('catches bad outputs', () => {
    const testCase = dataset.find(c => c.id === 'MA-01');
    const badOutput = badOutputs['MA-01'];
    assert.equal(checkInvariants(badOutput, testCase).passed, false);
  });
});
