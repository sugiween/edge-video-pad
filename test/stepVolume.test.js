const test = require('node:test');
const assert = require('node:assert');
const { stepVolume } = require('../content.js');

test('clamps at 1', () => { assert.strictEqual(stepVolume(1, 0.05), 1); });
test('clamps at 0', () => { assert.strictEqual(stepVolume(0, -0.05), 0); });
test('0.95 + 0.05 = 1', () => { assert.strictEqual(stepVolume(0.95, 0.05), 1); });
test('rounds float error', () => {
  assert.strictEqual(stepVolume(0.1, 0.2), 0.3);
  assert.strictEqual(stepVolume(0.7, -0.05), 0.65);
});
test('0.03 - 0.05 clamps to 0', () => { assert.strictEqual(stepVolume(0.03, -0.05), 0); });
