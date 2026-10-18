const test = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('node:events');
const { parseJsonResponse } = require('../helpers/http_utils.js');

test('parseJsonResponse successfully parses JSON from multiple chunks', async () => {
  const stream = new EventEmitter();
  const promise = parseJsonResponse(stream);

  stream.emit('data', '{"foo":');
  stream.emit('data', '"bar",');
  stream.emit('data', '"num":42}');
  stream.emit('end');

  const result = await promise;
  assert.deepStrictEqual(result, { foo: 'bar', num: 42 });
});

test('parseJsonResponse resolves to null and logs on invalid JSON', async () => {
  const stream = new EventEmitter();
  const promise = parseJsonResponse(stream, '[TEST LOG TAG]');

  stream.emit('data', '{invalid json');
  stream.emit('end');

  const result = await promise;
  assert.strictEqual(result, null);
});

test('parseJsonResponse resolves to null and logs on stream error', async () => {
  const stream = new EventEmitter();
  const promise = parseJsonResponse(stream, '[TEST LOG TAG]');

  stream.emit('error', new Error('Stream error'));

  const result = await promise;
  assert.strictEqual(result, null);
});
