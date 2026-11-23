import { matchItems } from './matching.mjs';

export function scoreSemantic(output, testCase, idealOutput) {
  const expected = idealOutput || testCase.expected || {};
  
  let outcomeMatch = 1.0;
  if (expected.outcome && expected.outcome !== output.outcome) {
    outcomeMatch = 0.0;
  }

  const producedActions = output.action_items || [];
  const expectedActions = expected.action_items || [];
  
  let matchedActions = 0;
  if (expectedActions.length > 0 && producedActions.length > 0) {
    matchedActions = matchItems(producedActions, expectedActions);
  } else if (expectedActions.length === 0 && producedActions.length === 0) {
    matchedActions = 0;
  }

  const expCount = expectedActions.length;
  const actionRecall = expCount > 0 ? matchedActions / expCount : (producedActions.length === 0 ? 1 : 0);
  const actionPrecision = producedActions.length > 0 ? matchedActions / producedActions.length : (expCount === 0 ? 1 : 0);

  const score = (
    0.15 * outcomeMatch +
    0.25 * actionRecall +
    0.20 * actionPrecision +
    0.10 * 1.0 + 
    0.10 * 1.0 + 
    0.10 * 1.0 + 
    0.10 * 1.0
  );

  return {
    score,
    precision: actionPrecision,
    recall: actionRecall
  };
}
