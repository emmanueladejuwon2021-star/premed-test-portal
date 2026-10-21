const test = require('node:test');
const assert = require('node:assert/strict');
const { parseRows, formatArgs } = require('../local_admin_server.js');

test('parseRows returns empty array when input is null, undefined, or missing required properties', () => {
  assert.deepStrictEqual(parseRows(null), []);
  assert.deepStrictEqual(parseRows(undefined), []);
  assert.deepStrictEqual(parseRows({}), []);
  assert.deepStrictEqual(parseRows({ cols: [] }), []);
  assert.deepStrictEqual(parseRows({ rows: [] }), []);
  assert.deepStrictEqual(parseRows({ cols: [{ name: 'id' }] }), []);
  assert.deepStrictEqual(parseRows({ rows: [[{ type: 'text', value: '1' }]] }), []);
});

test('parseRows transforms standard Turso tabular rows into JS objects', () => {
  const result = {
    cols: [
      { name: 'id' },
      { name: 'username' },
      { name: 'score' },
      { name: 'ratio' },
      { name: 'is_active' }
    ],
    rows: [
      [
        { type: 'text', value: 'usr_100' },
        { type: 'text', value: 'Alice' },
        { type: 'integer', value: '42' },
        { type: 'float', value: 3.14 },
        { type: 'integer', value: '1' }
      ]
    ]
  };

  const expected = [
    {
      id: 'usr_100',
      username: 'Alice',
      score: 42,
      ratio: 3.14,
      is_active: 1
    }
  ];

  assert.deepStrictEqual(parseRows(result), expected);
});

test('parseRows correctly handles null cells and null cell types', () => {
  const result = {
    cols: [{ name: 'col1' }, { name: 'col2' }, { name: 'col3' }],
    rows: [
      [
        null,
        undefined,
        { type: 'null', value: null }
      ]
    ]
  };

  const expected = [
    {
      col1: null,
      col2: null,
      col3: null
    }
  ];

  assert.deepStrictEqual(parseRows(result), expected);
});

test('parseRows correctly handles zero, negative numbers, and empty strings', () => {
  const result = {
    cols: [{ name: 'zero_int' }, { name: 'neg_int' }, { name: 'neg_float' }, { name: 'empty_text' }],
    rows: [
      [
        { type: 'integer', value: '0' },
        { type: 'integer', value: '-15' },
        { type: 'float', value: -8.5 },
        { type: 'text', value: '' }
      ]
    ]
  };

  const expected = [
    {
      zero_int: 0,
      neg_int: -15,
      neg_float: -8.5,
      empty_text: ''
    }
  ];

  assert.deepStrictEqual(parseRows(result), expected);
});

test('parseRows handles empty rows array or empty columns array', () => {
  assert.deepStrictEqual(parseRows({ cols: [{ name: 'id' }], rows: [] }), []);
  assert.deepStrictEqual(parseRows({ cols: [], rows: [] }), []);
});

test('parseRows handles missing cell entries or row length mismatches', () => {
  const result = {
    cols: [{ name: 'colA' }, { name: 'colB' }, { name: 'colC' }],
    rows: [
      [
        { type: 'text', value: 'A' }
      ]
    ]
  };

  const expected = [
    {
      colA: 'A'
    }
  ];

  assert.deepStrictEqual(parseRows(result), expected);
});

test('formatArgs helper formats arguments correctly for Turso pipeline', () => {
  const args = [null, undefined, 10, 3.14, 'hello', true];
  const formatted = formatArgs(args);

  assert.deepStrictEqual(formatted, [
    { type: 'null' },
    { type: 'null' },
    { type: 'integer', value: '10' },
    { type: 'float', value: 3.14 },
    { type: 'text', value: 'hello' },
    { type: 'text', value: 'true' }
  ]);
});
