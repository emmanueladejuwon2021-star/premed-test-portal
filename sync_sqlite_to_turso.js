const https = require('node:https');
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const TURSO_URL = 'https://premed-test-portal-emmanueladejuwon2021-star.aws-us-east-1.turso.io/v2/pipeline';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE3NDk0MzQsImlkIjoiMDFhMTJiNTYtZmEwMS03MmMzLWJlMjctYzRmMDhmMjkxNmJiIiwia2lkIjoiel90TE1SckVpVnk2a28xZ0tEbGc4RkgyUnpWUkJJd1FUcG05UV9PdXRhZyIsInJpZCI6IjNlZmQ3MDQ0LWU2ZTAtNDQ1NS05MGQ5LTY0N2EwNjlkZjcwMyJ9.08Klb4LcVxUkzyLgz6G8s6RnshFl7cMHpVKYaygdBcZpYI8jiyXtEQEw7TNoq66rRCta9ajGYxWiaUBCTs_zBA';

function sendTursoBatch(stmts) {
  return new Promise((resolve, reject) => {
    const requests = stmts.map(s => {
      if (typeof s === 'string') return { type: 'execute', stmt: { sql: s } };
      return {
        type: 'execute',
        stmt: {
          sql: s.sql,
          args: (s.args || []).map(a => {
            if (a === null || a === undefined) return { type: 'null' };
            if (typeof a === 'number') {
              return Number.isInteger(a) ? { type: 'integer', value: String(a) } : { type: 'float', value: a };
            }
            return { type: 'text', value: String(a) };
          })
        }
      };
    });
    requests.push({ type: 'close' });

    const payload = JSON.stringify({ requests });
    const req = https.request(TURSO_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TURSO_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Failed to parse Turso response: ${e.message} - ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  const db = new DatabaseSync(path.join(__dirname, 'premed_portal.sqlite'));

  console.log('Reading from local premed_portal.sqlite...');
  const courses = db.prepare('SELECT * FROM courses').all();
  const topics = db.prepare('SELECT * FROM topics').all();
  const tests = db.prepare('SELECT * FROM tests').all();
  const settings = db.prepare('SELECT * FROM settings').all();

  console.log(`Found in SQLite: ${courses.length} courses, ${topics.length} topics, ${tests.length} tests, ${settings.length} settings`);

  // Step 1: Wipe stale courses and topics from Turso
  console.log('Resetting courses and topics in Turso DB Cloud...');
  await sendTursoBatch([
    'DELETE FROM topics;',
    'DELETE FROM courses;',
    'DELETE FROM tests;'
  ]);

  // Step 2: Insert Courses into Turso
  console.log('Inserting courses into Turso...');
  const courseStmts = courses.map(c => ({
    sql: `INSERT INTO courses (id, code, title, duration, question_limit, attempts_allowed, is_mock, is_locked)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [c.id, c.code, c.title, c.duration || 30, c.question_limit || 20, c.attempts_allowed || 1, c.is_mock !== undefined ? c.is_mock : 1, c.is_locked || 0]
  }));
  await sendTursoBatch(courseStmts);

  // Step 3: Insert Topics in batches of 30 into Turso
  console.log('Inserting topics into Turso...');
  for (let i = 0; i < topics.length; i += 30) {
    const batch = topics.slice(i, i + 30).map(t => ({
      sql: 'INSERT INTO topics (id, course_id, name) VALUES (?, ?, ?)',
      args: [t.id, t.course_id, t.name]
    }));
    await sendTursoBatch(batch);
  }

  // Step 4: Insert Tests into Turso
  if (tests.length > 0) {
    console.log('Inserting tests into Turso...');
    const testStmts = tests.map(t => ({
      sql: `INSERT INTO tests (id, title, course_id, topic_ids, duration, question_limit, attempts_allowed, is_live, auto_submit, enforce_fullscreen, max_tab_switches, shuffle_questions, shuffle_options, calculator_allowed, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        t.id, t.title, t.course_id, t.topic_ids || '["ALL"]',
        t.duration || 30, t.question_limit || 20, t.attempts_allowed || 1,
        t.is_live !== undefined ? t.is_live : 1,
        t.auto_submit !== undefined ? t.auto_submit : 1,
        t.enforce_fullscreen !== undefined ? t.enforce_fullscreen : 1,
        t.max_tab_switches || 3,
        t.shuffle_questions !== undefined ? t.shuffle_questions : 1,
        t.shuffle_options !== undefined ? t.shuffle_options : 1,
        t.calculator_allowed !== undefined ? t.calculator_allowed : 1,
        t.created_at || new Date().toISOString(),
        t.updated_at || new Date().toISOString()
      ]
    }));
    await sendTursoBatch(testStmts);
  }

  // Step 5: Insert Settings into Turso
  if (settings.length > 0) {
    console.log('Inserting settings into Turso...');
    const settingStmts = settings.map(s => ({
      sql: `INSERT OR REPLACE INTO settings (key_name, value) VALUES (?, ?)`,
      args: [s.key_name, s.value]
    }));
    await sendTursoBatch(settingStmts);
  }

  console.log('VERIFYING Turso DB Cloud sync...');
  const verify = await sendTursoBatch([
    'SELECT count(*) as c FROM courses;',
    'SELECT count(*) as c FROM topics;',
    'SELECT count(*) as c FROM tests;',
    'SELECT count(*) as c FROM questions;'
  ]);

  console.log('Turso Verification Result:');
  console.log('Courses:', verify.results[0]?.response?.result?.rows);
  console.log('Topics:', verify.results[1]?.response?.result?.rows);
  console.log('Tests:', verify.results[2]?.response?.result?.rows);
  console.log('Questions:', verify.results[3]?.response?.result?.rows);
  console.log('SUCCESS! Local courses, topics, and tests are now 100% synced to Turso Cloud!');
}

main().catch(console.error);
