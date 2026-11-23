import fs from 'fs';
import path from 'path';

const thresholdPath = path.resolve('.harness/threshold.json');
const threshold = JSON.parse(fs.readFileSync(thresholdPath, 'utf-8'));

export function aggregateResults(caseResults) {
  const total = caseResults.length;
  if (total === 0) return { pass: false, reason: 'Empty dataset' };

  const structuralPassCount = caseResults.filter(r => r.structural.valid).length;
  const invariantPassCount = caseResults.filter(r => r.invariant.passed).length;

  const meanSemanticScore = caseResults.reduce((acc, r) => acc + r.semantic.score, 0) / total;
  
  let totalProduced = 0;
  let totalMatched = 0;
  let totalExpected = 0;

  for (const r of caseResults) {
    if (r.expected_count > 0 || r.produced_count > 0) {
      totalProduced += r.produced_count;
      totalMatched += r.matched_count;
      totalExpected += r.expected_count;
    }
  }

  // If no action items exist across any cases, default to 1.0
  const microPrecision = totalProduced > 0 ? totalMatched / totalProduced : 1.0;
  const microRecall = totalExpected > 0 ? totalMatched / totalExpected : 1.0;

  const structuralPassRate = structuralPassCount / total;
  const invariantPassRate = invariantPassCount / total;

  const passed = (
    structuralPassRate >= threshold.structural_pass_rate &&
    invariantPassRate >= threshold.invariant_pass_rate_min &&
    meanSemanticScore >= threshold.mean_semantic_score_min &&
    microPrecision >= threshold.action_item_micro_precision_min &&
    microRecall >= threshold.action_item_micro_recall_min
  );

  return {
    passed,
    metrics: {
      structuralPassRate,
      invariantPassRate,
      meanSemanticScore,
      microPrecision,
      microRecall
    }
  };
}
