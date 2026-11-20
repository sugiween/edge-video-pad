const test = require('node:test');
const assert = require('node:assert');
const { shouldStartRepeat } = require('../content.js');

test('primary button on repeat keys starts', () => {
  for (const k of ['back', 'fwd', 'volUp', 'volDown']) assert.strictEqual(shouldStartRepeat(0, k), true);
});
test('non-primary button does not start', () => {
  assert.strictEqual(shouldStartRepeat(1, 'fwd'), false);
  assert.strictEqual(shouldStartRepeat(2, 'back'), false);
});
test('non-repeat keys do not start', () => {
  for (const k of ['toggle', 'ytFull', 'full']) assert.strictEqual(shouldStartRepeat(0, k), false);
});
