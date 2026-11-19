const test = require('node:test');
const assert = require('node:assert');
const { pickTarget } = require('../content.js');

const c = (ref, area, visible, paused) => ({ ref, area, visible, paused });

test('multiple playing -> largest playing', () => {
  assert.strictEqual(pickTarget([c('a', 100, true, false), c('b', 500, true, false), c('c', 900, true, true)]), 'b');
});
test('none playing -> largest visible', () => {
  assert.strictEqual(pickTarget([c('a', 100, true, true), c('b', 300, true, true)]), 'b');
});
test('nothing visible -> null', () => {
  assert.strictEqual(pickTarget([c('a', 100, false, true)]), null);
});
test('playing but invisible is excluded', () => {
  assert.strictEqual(pickTarget([c('a', 900, false, false), c('b', 50, true, true)]), 'b');
});
test('empty -> null', () => {
  assert.strictEqual(pickTarget([]), null);
});
