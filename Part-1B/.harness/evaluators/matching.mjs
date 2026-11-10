export function matchItems(produced, expected) {
  let matches = 0;
  for (const exp of expected) {
    const expStr = typeof exp === 'string' ? exp : (exp.task || JSON.stringify(exp));
    const found = produced.some(prod => {
      const prodStr = typeof prod === 'string' ? prod : (prod.task || JSON.stringify(prod));
      return prodStr.toLowerCase().includes(expStr.toLowerCase()) || expStr.toLowerCase().includes(prodStr.toLowerCase());
    });
    if (found) matches++;
  }
  return matches;
}
