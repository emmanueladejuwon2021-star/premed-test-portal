const test = require('node:test');
const assert = require('node:assert/strict');
const { escapeHtml } = require('../admin_ui_template.js');

test('escapeHtml returns empty string when input is null', () => {
  assert.strictEqual(escapeHtml(null), '');
});

test('escapeHtml returns empty string when input is undefined', () => {
  assert.strictEqual(escapeHtml(undefined), '');
});

test('escapeHtml returns empty string when input is empty string', () => {
  assert.strictEqual(escapeHtml(''), '');
});

test('escapeHtml returns plain text unchanged', () => {
  assert.strictEqual(escapeHtml('Hello World 123'), 'Hello World 123');
});

test('escapeHtml escapes ampersand (&)', () => {
  assert.strictEqual(escapeHtml('AT&T & More'), 'AT&amp;T &amp; More');
});

test('escapeHtml escapes less-than (<)', () => {
  assert.strictEqual(escapeHtml('5 < 10'), '5 &lt; 10');
});

test('escapeHtml escapes greater-than (>)', () => {
  assert.strictEqual(escapeHtml('10 > 5'), '10 &gt; 5');
});

test('escapeHtml escapes double quote (")', () => {
  assert.strictEqual(escapeHtml('He said "Hello"'), 'He said &quot;Hello&quot;');
});

test("escapeHtml escapes single quote (')", () => {
  assert.strictEqual(escapeHtml("It's a test"), 'It&#39;s a test');
});

test('escapeHtml escapes HTML script tags and attribute injections', () => {
  assert.strictEqual(
    escapeHtml('<script type="text/javascript">alert(\'XSS & Hazard\');</script>'),
    '&lt;script type=&quot;text/javascript&quot;&gt;alert(&#39;XSS &amp; Hazard&#39;);&lt;/script&gt;'
  );
});

test('escapeHtml escapes concatenated special characters', () => {
  assert.strictEqual(escapeHtml('&<>"\''), '&amp;&lt;&gt;&quot;&#39;');
});

test('escapeHtml converts numbers to string', () => {
  assert.strictEqual(escapeHtml(123), '123');
  assert.strictEqual(escapeHtml(0), '0');
});

test('escapeHtml converts booleans to string', () => {
  assert.strictEqual(escapeHtml(true), 'true');
  assert.strictEqual(escapeHtml(false), 'false');
});

test('escapeHtml converts objects to string representation', () => {
  assert.strictEqual(escapeHtml({ key: 'val' }), '[object Object]');
});
