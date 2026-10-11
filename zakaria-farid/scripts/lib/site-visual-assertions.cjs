const assert = require('node:assert/strict');
function contrast(fg, bg) {
  const luminance = hex => {
    const values = hex.replace('#', '').match(/../g).map(v => parseInt(v, 16) / 255)
      .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
  };
  const a = luminance(fg), b = luminance(bg);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
function assertFilledRows({left, right, gap, cards}, expectedCount) {
  assert.equal(cards.length, expectedCount);
  const rows = [];
  for (const card of cards) {
    let row = rows.find(r => Math.abs(r[0].top - card.top) < 2);
    if (!row) rows.push(row = []);
    row.push(card);
  }
  for (const row of rows) {
    row.sort((a,b) => a.left - b.left);
    assert.ok(Math.abs(row[0].left - left) < 2, 'row must start at grid edge');
    assert.ok(Math.abs(row.at(-1).right - right) < 2, 'row must end at grid edge');
    for (let i=1;i<row.length;i++) {
      assert.ok(Math.abs(row[i].left - row[i-1].right - gap) < 2, 'row must have only configured gaps');
      assert.ok(Math.abs(row[i].width - row[0].width) < 2, 'row items must divide width evenly');
    }
  }
  return rows.length;
}
module.exports = { contrast, assertFilledRows };
