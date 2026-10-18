/**
 * Premed Test Portal - Cloud School Admin Command Center
 * 100% Pure Turso DB Cloud Edition (Zero SQLite)
 * 
 * Features:
 *  - Native Turso Cloud HTTP Pipeline API (libSQL over HTTP v2)
 *  - Live Test Radar & Candidate Proctoring Monitor
 *  - Interactive Manual Test Creator with per-test timing, topics & security
 *  - Real-time Candidate Retake Permissions & Invalidation
 *  - Zero local SQLite database file, zero bridges
 */

const http = require('node:http');
const https = require('node:https');
const url = require('node:url');

const PORT = 8899;
const { renderHtml } = require('./admin_ui_template.js');

const TURSO_URL = 'https://premed-test-portal-emmanueladejuwon2021-star.aws-us-east-1.turso.io/v2/pipeline';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE3NDk0MzQsImlkIjoiMDFhMTJiNTYtZmEwMS03MmMzLWJlMjctYzRmMDhmMjkxNmJiIiwia2lkIjoiel90TE1SckVpVnk2a28xZ0tEbGc4RkgyUnpWUkJJd1FUcG05UV9PdXRhZyIsInJpZCI6IjNlZmQ3MDQ0LWU2ZTAtNDQ1NS05MGQ5LTY0N2EwNjlkZjcwMyJ9.08Klb4LcVxUkzyLgz6G8s6RnshFl7cMHpVKYaygdBcZpYI8jiyXtEQEw7TNoq66rRCta9ajGYxWiaUBCTs_zBA';

const DEPARTMENTS = [
  'Medicine & Surgery (MBBS)',
  'Dentistry (BDS)',
  'Pharmacy (PharmD)',
  'Nursing Science (BNSc)',
  'Medical Laboratory Science (BMLS)',
  'Radiography (B.Rad)',
  'Physiotherapy (BMR)',
  'Human Anatomy',
  'Human Physiology',
  'Biochemistry',
  'Public Health'
];

// In-Memory Live Video Proctoring Feeds Cache
// Maps sessionId -> { sessionId, studentName, matricNo, courseCode, tabSwitches, frame, updatedAt, warning }
const proctorLiveSessions = new Map();

// Helper: Format arguments for Turso Pipeline API
function formatArgs(args = []) {
  return args.map(a => {
    if (a === null || a === undefined) return { type: 'null' };
    if (typeof a === 'number') {
      return Number.isInteger(a) ? { type: 'integer', value: String(a) } : { type: 'float', value: a };
    }
    return { type: 'text', value: String(a) };
  });
}

// Helper: Parse Turso tabular rows into JS objects
function parseRows(result) {
  if (!result || !result.cols || !result.rows) return [];
  const colNames = result.cols.map(c => c.name);
  return result.rows.map(row => {
    const obj = {};
    row.forEach((cell, i) => {
      const col = colNames[i];
      if (!cell || cell.type === 'null') {
        obj[col] = null;
      } else if (cell.type === 'integer' || cell.type === 'float') {
        obj[col] = Number(cell.value);
      } else {
        obj[col] = cell.value;
      }
    });
    return obj;
  });
}

// Core: Dispatch Turso Pipeline Batch Request
function runTursoPipeline(requests) {
  return new Promise((resolve) => {
    try {
      const payload = JSON.stringify({ requests: [...requests, { type: 'close' }] });
      const req = https.request(TURSO_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TURSO_TOKEN}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 15000
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            console.error('[TURSO PARSE ERROR]', e.message);
            resolve(null);
          }
        });
      });
      req.on('error', (e) => {
        console.error('[TURSO PIPELINE ERROR]', e.message);
        resolve(null);
      });
      req.on('timeout', () => {
        req.destroy();
        console.error('[TURSO TIMEOUT]');
        resolve(null);
      });
      req.write(payload);
      req.end();
    } catch (e) {
      console.error('[TURSO DISPATCH ERROR]', e.message);
      resolve(null);
    }
  });
}

// Turso Single Query Execution
async function tursoQuery(sql, args = []) {
  const res = await runTursoPipeline([{ type: 'execute', stmt: { sql, args: formatArgs(args) } }]);
  if (!res || !res.results || !res.results[0] || res.results[0].type !== 'ok') {
    return [];
  }
  return parseRows(res.results[0].response.result);
}

// Turso Single Statement Execution (INSERT / UPDATE / DELETE)
async function tursoExecute(sql, args = []) {
  const res = await runTursoPipeline([{ type: 'execute', stmt: { sql, args: formatArgs(args) } }]);
  return (res && res.results && res.results[0] && res.results[0].type === 'ok');
}

// Turso Batch Execution
async function tursoBatch(stmts) {
  const requests = stmts.map(s => {
    if (typeof s === 'string') return { type: 'execute', stmt: { sql: s } };
    return { type: 'execute', stmt: { sql: s.sql, args: formatArgs(s.args || []) } };
  });
  return await runTursoPipeline(requests);
}

// Helper: Parse POST body (handles JSON and URL-encoded forms)
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const contentType = (req.headers['content-type'] || '').toLowerCase();
        if (contentType.includes('application/json')) {
          try {
            resolve(JSON.parse(body || '{}'));
            return;
          } catch {
            resolve({});
            return;
          }
        }
        const parsed = new URLSearchParams(body);
        const data = {};
        for (const [key, val] of parsed.entries()) {
          if (key.endsWith('[]')) {
            const cleanKey = key.slice(0, -2);
            if (!data[cleanKey]) data[cleanKey] = [];
            data[cleanKey].push(val);
          } else {
            data[key] = val;
          }
        }
        resolve(data);
      } catch {
        resolve({});
      }
    });
  });
}

// Helper: Fetch all data needed for admin UI in ONE roundtrip
async function fetchAdminDashboardData() {
  const requests = [
    { type: 'execute', stmt: { sql: 'SELECT COUNT(*) as c FROM questions;' } },
    { type: 'execute', stmt: { sql: 'SELECT COUNT(*) as c FROM students;' } },
    { type: 'execute', stmt: { sql: 'SELECT COUNT(*) as c FROM results;' } },
    { type: 'execute', stmt: { sql: 'SELECT COUNT(*) as c FROM courses;' } },
    { type: 'execute', stmt: { sql: 'SELECT * FROM tests ORDER BY created_at DESC;' } },
    { type: 'execute', stmt: { sql: 'SELECT * FROM courses ORDER BY code ASC;' } },
    { type: 'execute', stmt: { sql: 'SELECT * FROM topics ORDER BY course_id ASC, id ASC;' } },
    { type: 'execute', stmt: { sql: 'SELECT q.*, t.name as topic_name, c.code as course_code FROM questions q JOIN topics t ON q.topic_id = t.id JOIN courses c ON t.course_id = c.id ORDER BY q.created_at DESC LIMIT 300;' } },
    { type: 'execute', stmt: { sql: 'SELECT * FROM exam_sessions ORDER BY updated_at DESC LIMIT 60;' } },
    { type: 'execute', stmt: { sql: 'SELECT r.*, s.name as student_name, s.matric_no, c.code as course_code FROM results r JOIN students s ON r.student_id = s.id JOIN courses c ON r.course_id = c.id ORDER BY r.created_at DESC LIMIT 60;' } },
    { type: 'execute', stmt: { sql: 'SELECT * FROM students ORDER BY created_at DESC LIMIT 80;' } },
    { type: 'execute', stmt: { sql: 'SELECT key_name, value FROM settings;' } }
  ];

  const pipeline = await runTursoPipeline(requests);
  if (!pipeline || !pipeline.results) {
    return {
      stats: {},
      allTests: [],
      courses: [],
      allTopics: [],
      questions: [],
      examSessions: [],
      submissions: [],
      students: [],
      settingsMap: {},
      DEPARTMENTS
    };
  }

  const results = pipeline.results;
  const getRows = (idx) => (results[idx] && results[idx].type === 'ok' ? parseRows(results[idx].response.result) : []);

  const totalQuestions = getRows(0)[0]?.c || 0;
  const totalStudents = getRows(1)[0]?.c || 0;
  const totalResults = getRows(2)[0]?.c || 0;
  const totalCourses = getRows(3)[0]?.c || 0;

  const allTests = getRows(4);
  const courses = getRows(5);
  const allTopics = getRows(6);
  const questions = getRows(7);
  const examSessions = getRows(8);
  const submissions = getRows(9);
  const students = getRows(10);
  const settingsRows = getRows(11);

  const settingsMap = {};
  settingsRows.forEach(r => { settingsMap[r.key_name] = r.value; });

  // Merge live proctoring stream frames from in-memory cache
  const now = Date.now();
  examSessions.forEach(s => {
    const cached = proctorLiveSessions.get(s.id);
    if (cached) {
      if (cached.frame) s.latest_frame = cached.frame;
      if (typeof cached.tabSwitches !== 'undefined') s.tab_switches = cached.tabSwitches;
      if (cached.warning) s.proctor_warning = cached.warning;
      s.is_streaming = (now - (cached.updatedAt || 0)) < 15000;
    } else {
      s.is_streaming = Boolean(s.latest_frame);
    }
  });

  const activeSessionsCount = examSessions.filter(s => s.status === 'IN_PROGRESS').length;
  const cheatedSessionsCount = examSessions.filter(s => s.status === 'TERMINATED_FOR_CHEATING' || (s.tab_switches || 0) >= 3).length;
  const liveTestsCount = allTests.filter(t => t.is_live === 1).length;

  return {
    stats: {
      totalQuestions,
      totalStudents,
      totalResults,
      totalCourses,
      liveTestsCount,
      activeSessionsCount,
      cheatedSessionsCount
    },
    allTests,
    courses,
    allTopics,
    questions,
    examSessions,
    submissions,
    students,
    settingsMap,
    DEPARTMENTS
  };
}

// Start HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // -------------------------------------------------------------
  // CORS Preflight Handler
  // -------------------------------------------------------------
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
    return res.end();
  }

  // -------------------------------------------------------------
  // GET / - Admin Dashboard
  // -------------------------------------------------------------
  if (req.method === 'GET' && pathname === '/') {
    const tab = query.tab || 'home';
    const alert = query.alert || null;
    const alertType = query.alert_type || 'success';

    const data = await fetchAdminDashboardData();
    const html = renderHtml(tab, alert, alertType, null, null, data);

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }

  // -------------------------------------------------------------
  // GET /api/live_sessions - Telemetry & Live Video Polling
  // -------------------------------------------------------------
  if (req.method === 'GET' && pathname === '/api/live_sessions') {
    const sessions = await tursoQuery('SELECT * FROM exam_sessions ORDER BY updated_at DESC LIMIT 60;');
    const now = Date.now();

    sessions.forEach(s => {
      const cached = proctorLiveSessions.get(s.id);
      if (cached) {
        if (cached.frame) s.latest_frame = cached.frame;
        if (typeof cached.tabSwitches !== 'undefined') s.tab_switches = cached.tabSwitches;
        if (cached.warning) s.proctor_warning = cached.warning;
        s.is_streaming = (now - (cached.updatedAt || 0)) < 15000;
      } else {
        s.is_streaming = Boolean(s.latest_frame);
      }
    });

    const activeCount = sessions.filter(s => s.status === 'IN_PROGRESS').length;

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    return res.end(JSON.stringify({ activeCount, sessions }));
  }

  // -------------------------------------------------------------
  // POST /api/proctor_frame - Ingest candidate webcam snapshot
  // -------------------------------------------------------------
  if (req.method === 'POST' && pathname === '/api/proctor_frame') {
    const data = await parseBody(req);
    const sessionId = data.session_id;

    if (sessionId) {
      const existing = proctorLiveSessions.get(sessionId) || {};
      const currentWarning = existing.warning || null;
      const now = Date.now();
      const lastDbSync = existing.lastDbSync || 0;
      const newSwitches = typeof data.tab_switches !== 'undefined' ? Number(data.tab_switches) : (existing.tabSwitches || 0);
      const shouldSyncCloud = (now - lastDbSync > 2000) || (newSwitches > (existing.tabSwitches || 0));

      proctorLiveSessions.set(sessionId, {
        sessionId: sessionId,
        studentName: data.student_name || existing.studentName || 'Student',
        matricNo: data.matric_no || existing.matricNo || 'Unknown',
        courseCode: data.course_code || existing.courseCode || 'EXAM',
        tabSwitches: newSwitches,
        frame: data.frame || existing.frame || null,
        updatedAt: now,
        lastDbSync: shouldSyncCloud ? now : lastDbSync,
        warning: currentWarning ? null : existing.warning // Clear on delivery
      });

      // Persist to cloud DB throttled to once every 2s or on tab switch
      if (data.frame && shouldSyncCloud) {
        tursoExecute('UPDATE exam_sessions SET latest_frame = ?, tab_switches = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;', [
          data.frame,
          newSwitches,
          sessionId
        ]).catch(() => {});
      }

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(JSON.stringify({ success: true, warning: currentWarning }));
    }

    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({ error: 'Missing session_id' }));
  }

  // -------------------------------------------------------------
  // POST /api/send_warning - Send real-time proctor warning to student
  // -------------------------------------------------------------
  if (req.method === 'POST' && pathname === '/api/send_warning') {
    const data = await parseBody(req);
    const sessionId = data.session_id;
    const warningMsg = (data.warning_message || data.warning || '').trim();

    if (sessionId && warningMsg) {
      const existing = proctorLiveSessions.get(sessionId) || {};
      existing.warning = warningMsg;
      existing.updatedAt = Date.now();
      proctorLiveSessions.set(sessionId, existing);

      await tursoExecute('UPDATE exam_sessions SET proctor_warning = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;', [warningMsg, sessionId]);

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(JSON.stringify({ success: true, message: 'Warning dispatched successfully' }));
    }

    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({ error: 'Missing session_id or warning message' }));
  }

  // -------------------------------------------------------------
  // GET /api/export_results_csv - Download Results CSV
  // -------------------------------------------------------------
  if (req.method === 'GET' && pathname === '/api/export_results_csv') {
    const rows = await tursoQuery(`
      SELECT r.id, s.name as student_name, s.matric_no, s.department, c.code as course_code,
             r.total_score, r.total_questions, r.percentage, r.grade, r.tab_switches, r.is_flagged_cheating, r.created_at
      FROM results r
      JOIN students s ON r.student_id = s.id
      JOIN courses c ON r.course_id = c.id
      ORDER BY r.created_at DESC;
    `);

    let csv = 'ID,Candidate Name,Matric No,Department,Course,Score,Total Qs,Percentage,Grade,Tab Switches,Flagged Cheating,Date\n';
    rows.forEach(r => {
      csv += `"${r.id}","${(r.student_name || '').replace(/"/g, '""')}","${r.matric_no}","${(r.department || '').replace(/"/g, '""')}","${r.course_code}",${r.total_score},${r.total_questions},${r.percentage},"${r.grade}",${r.tab_switches},${r.is_flagged_cheating},"${r.created_at}"\n`;
    });

    res.writeHead(200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="premed_exam_results.csv"'
    });
    return res.end(csv);
  }

  // -------------------------------------------------------------
  // POST ACTIONS
  // -------------------------------------------------------------
  if (req.method === 'POST') {
    const data = await parseBody(req);

    // 1. Create Test
    if (pathname === '/action/create_test') {
      const title = (data.title || '').trim();
      const courseId = data.course_id || '';
      const duration = parseInt(data.duration, 10) || 30;
      const questionLimit = parseInt(data.question_limit, 10) || 20;
      const maxTabSwitches = parseInt(data.max_tab_switches, 10) || 3;
      const enforceFullscreen = data.enforce_fullscreen ? 1 : 0;
      const autoSubmit = data.auto_submit ? 1 : 0;
      const calculatorAllowed = data.calculator_allowed ? 1 : 0;
      const shuffleQuestions = data.shuffle_questions ? 1 : 0;
      const shuffleOptions = data.shuffle_options ? 1 : 0;
      const includePastQuestions = data.include_past_questions ? 1 : 0;
      const isLive = data.is_live ? 1 : 0;

      let topicIds = '["ALL"]';
      if (!data.all_topics && data.topic_ids) {
        const list = Array.isArray(data.topic_ids) ? data.topic_ids : [data.topic_ids];
        topicIds = JSON.stringify(list);
      }

      if (title && courseId) {
        const testId = 'test_' + Math.random().toString(36).substring(2, 10);
        await tursoExecute(`
          INSERT INTO tests (
            id, title, course_id, topic_ids, duration, question_limit, attempts_allowed,
            is_live, auto_submit, enforce_fullscreen, max_tab_switches, shuffle_questions,
            shuffle_options, calculator_allowed, include_past_questions, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
          testId, title, courseId, topicIds, duration, questionLimit,
          isLive, autoSubmit, enforceFullscreen, maxTabSwitches, shuffleQuestions,
          shuffleOptions, calculatorAllowed, includePastQuestions
        ]);

        res.writeHead(302, { Location: '/?tab=tests&alert=' + encodeURIComponent(`Test "${title}" deployed successfully to Cloud!`) });
        return res.end();
      }

      res.writeHead(302, { Location: '/?tab=tests&alert=Missing+title+or+course&alert_type=error' });
      return res.end();
    }

    // 2. Toggle Single Test Live
    if (pathname === '/action/toggle_test_live') {
      const testId = data.test_id;
      const currentLive = parseInt(data.current_live, 10) || 0;
      const newLive = currentLive === 1 ? 0 : 1;

      if (testId) {
        await tursoExecute('UPDATE tests SET is_live = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;', [newLive, testId]);
      }
      res.writeHead(302, { Location: '/?tab=tests&alert=' + encodeURIComponent(`Test status updated to ${newLive ? 'LIVE' : 'OFFLINE'}.`) });
      return res.end();
    }

    // 3. Delete Test
    if (pathname === '/action/delete_test') {
      const testId = data.test_id;
      if (testId) {
        await tursoExecute('DELETE FROM tests WHERE id = ?;', [testId]);
      }
      res.writeHead(302, { Location: '/?tab=tests&alert=' + encodeURIComponent('Test removed successfully.') });
      return res.end();
    }

    // 4. Master Live Tests Toggle
    if (pathname === '/action/master_tests_live_toggle') {
      const targetState = parseInt(data.target_state, 10) || 0;
      await tursoExecute('UPDATE tests SET is_live = ?, updated_at = CURRENT_TIMESTAMP;', [targetState]);
      res.writeHead(302, { Location: '/?tab=tests&alert=' + encodeURIComponent(`All tests set to ${targetState ? 'LIVE' : 'OFFLINE'}.`) });
      return res.end();
    }

    // 5. Add Course
    if (pathname === '/action/add_course') {
      const code = (data.code || '').trim().toUpperCase();
      const title = (data.title || '').trim();
      const duration = parseInt(data.duration, 10) || 30;

      if (code && title) {
        const courseId = 'course_' + code.toLowerCase().replace(/[^a-z0-9]/g, '');
        const topicId = 'topic_' + Math.random().toString(36).substring(2, 10);

        await tursoBatch([
          {
            sql: 'INSERT INTO courses (id, code, title, duration, question_limit, attempts_allowed, is_mock, is_locked) VALUES (?, ?, ?, ?, 20, 1, 1, 0) ON CONFLICT(id) DO UPDATE SET title = excluded.title;',
            args: [courseId, code, title, duration]
          },
          {
            sql: 'INSERT INTO topics (id, course_id, name) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING;',
            args: [topicId, courseId, 'General Curriculum']
          }
        ]);

        res.writeHead(302, { Location: '/?tab=courses&alert=' + encodeURIComponent(`Course ${code} created successfully!`) });
        return res.end();
      }
      res.writeHead(302, { Location: '/?tab=courses&alert=Course+code+and+title+required&alert_type=error' });
      return res.end();
    }

    // 6. Delete Course
    if (pathname === '/action/delete_course') {
      const courseId = data.course_id;
      if (courseId) {
        await tursoBatch([
          { sql: 'DELETE FROM tests WHERE course_id = ?;', args: [courseId] },
          { sql: 'DELETE FROM questions WHERE topic_id IN (SELECT id FROM topics WHERE course_id = ?);', args: [courseId] },
          { sql: 'DELETE FROM topics WHERE course_id = ?;', args: [courseId] },
          { sql: 'DELETE FROM courses WHERE id = ?;', args: [courseId] }
        ]);
      }
      res.writeHead(302, { Location: '/?tab=courses&alert=' + encodeURIComponent('Course and curriculum topics deleted.') });
      return res.end();
    }

    // 7. Add Topic
    if (pathname === '/action/add_topic') {
      const courseId = data.course_id;
      const name = (data.name || '').trim();
      if (courseId && name) {
        const topicId = 'topic_' + Math.random().toString(36).substring(2, 10);
        await tursoExecute('INSERT INTO topics (id, course_id, name) VALUES (?, ?, ?);', [topicId, courseId, name]);
      }
      res.writeHead(302, { Location: '/?tab=courses&alert=' + encodeURIComponent(`Topic "${name}" added.`) });
      return res.end();
    }

    // 8. Delete Topic
    if (pathname === '/action/delete_topic') {
      const topicId = data.topic_id;
      if (topicId) {
        await tursoBatch([
          { sql: 'DELETE FROM questions WHERE topic_id = ?;', args: [topicId] },
          { sql: 'DELETE FROM topics WHERE id = ?;', args: [topicId] }
        ]);
      }
      res.writeHead(302, { Location: '/?tab=courses&alert=' + encodeURIComponent('Topic deleted.') });
      return res.end();
    }

    // 9. Add Question
    if (pathname === '/action/add_question') {
      const topicId = data.topic_id;
      const text = (data.text || '').trim();
      const a = (data.a || '').trim();
      const b = (data.b || '').trim();
      const c = (data.c || '').trim();
      const d = (data.d || '').trim();
      const correctOption = (data.correct_option || 'A').toUpperCase();
      const explanation = (data.explanation || '').trim();

      if (topicId && text && a && b) {
        const qId = 'q_' + Math.random().toString(36).substring(2, 12);
        await tursoExecute(`
          INSERT INTO questions (id, topic_id, text, a, b, c, d, correct_option, explanation, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
        `, [qId, topicId, text, a, b, c, d, correctOption, explanation]);

        res.writeHead(302, { Location: '/?tab=questions&alert=' + encodeURIComponent('Question saved to Cloud bank successfully!') });
        return res.end();
      }
      res.writeHead(302, { Location: '/?tab=questions&alert=Question+text+and+options+required&alert_type=error' });
      return res.end();
    }

    // 10. Delete Question
    if (pathname === '/action/delete_question') {
      const questionId = data.question_id;
      if (questionId) {
        await tursoExecute('DELETE FROM questions WHERE id = ?;', [questionId]);
      }
      res.writeHead(302, { Location: '/?tab=questions&alert=' + encodeURIComponent('Question deleted.') });
      return res.end();
    }

    // 11. Add Student
    if (pathname === '/action/add_student') {
      const name = (data.name || '').trim();
      const matric = (data.matric_no || '').trim().toUpperCase().replace(/\s+/g, '');
      const dept = (data.department || '').trim();

      if (name && matric) {
        const sid = 'student_' + Math.random().toString(36).substring(2, 10);
        await tursoExecute(`
          INSERT INTO students (id, name, matric_no, password, department, strength, created_at)
          VALUES (?, ?, ?, '123456', ?, 'Clinical Sciences', CURRENT_TIMESTAMP)
          ON CONFLICT(matric_no) DO UPDATE SET name = excluded.name, department = excluded.department;
        `, [sid, name, matric, dept]);

        res.writeHead(302, { Location: '/?tab=students&alert=' + encodeURIComponent(`Candidate ${matric} registered.`) });
        return res.end();
      }
      res.writeHead(302, { Location: '/?tab=students&alert=Name+and+matric+required&alert_type=error' });
      return res.end();
    }

    // 12. Delete Student
    if (pathname === '/action/delete_student') {
      const studentId = data.student_id;
      if (studentId) {
        await tursoExecute('DELETE FROM students WHERE id = ?;', [studentId]);
      }
      res.writeHead(302, { Location: '/?tab=students&alert=' + encodeURIComponent('Candidate removed.') });
      return res.end();
    }

    // 13. Allow Retake
    if (pathname === '/action/allow_retake') {
      const sessionId = data.session_id;
      const matricNo = data.matric_no;
      if (sessionId) {
        proctorLiveSessions.delete(sessionId);
        await tursoExecute('DELETE FROM exam_sessions WHERE id = ?;', [sessionId]);
      }
      if (matricNo) {
        await tursoExecute('DELETE FROM results WHERE student_id IN (SELECT id FROM students WHERE matric_no = ?);', [matricNo]);
      }
      res.writeHead(302, { Location: '/?tab=home&alert=' + encodeURIComponent('Candidate retake granted. Session cleared.') });
      return res.end();
    }

    // 14. Invalidate Session
    if (pathname === '/action/invalidate_session') {
      const sessionId = data.session_id;
      if (sessionId) {
        if (proctorLiveSessions.has(sessionId)) {
          const s = proctorLiveSessions.get(sessionId);
          s.status = 'TERMINATED_FOR_CHEATING';
        }
        await tursoExecute("UPDATE exam_sessions SET status = 'TERMINATED_FOR_CHEATING', updated_at = CURRENT_TIMESTAMP WHERE id = ?;", [sessionId]);
      }
      res.writeHead(302, { Location: '/?tab=home&alert=' + encodeURIComponent('Candidate test terminated for cheating violation.') });
      return res.end();
    }

    // 15. Send Proctor Warning via Form POST
    if (pathname === '/action/send_proctor_warning') {
      const sessionId = data.session_id;
      const warningMsg = (data.warning_message || data.warning || '').trim();

      if (sessionId && warningMsg) {
        const existing = proctorLiveSessions.get(sessionId) || {};
        existing.warning = warningMsg;
        existing.updatedAt = Date.now();
        proctorLiveSessions.set(sessionId, existing);

        await tursoExecute('UPDATE exam_sessions SET proctor_warning = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;', [warningMsg, sessionId]);
        res.writeHead(302, { Location: '/?tab=home&alert=' + encodeURIComponent('Proctor warning sent directly to candidate screen.') });
        return res.end();
      }

      res.writeHead(302, { Location: '/?tab=home&alert=Missing+warning+message&alert_type=error' });
      return res.end();
    }

    // 16. Save Global Settings
    if (pathname === '/action/save_settings') {
      const enforceFullscreen = data.enforce_fullscreen || '1';
      const antiCheatBlur = data.anti_cheat_blur || '1';
      const maxTabSwitches = data.max_tab_switches || '3';
      const watermarkEnabled = data.watermark_enabled || '1';

      await tursoBatch([
        { sql: 'INSERT INTO settings (key_name, value) VALUES (?, ?) ON CONFLICT(key_name) DO UPDATE SET value = excluded.value;', args: ['enforce_fullscreen', enforceFullscreen] },
        { sql: 'INSERT INTO settings (key_name, value) VALUES (?, ?) ON CONFLICT(key_name) DO UPDATE SET value = excluded.value;', args: ['anti_cheat_blur', antiCheatBlur] },
        { sql: 'INSERT INTO settings (key_name, value) VALUES (?, ?) ON CONFLICT(key_name) DO UPDATE SET value = excluded.value;', args: ['max_tab_switches', maxTabSwitches] },
        { sql: 'INSERT INTO settings (key_name, value) VALUES (?, ?) ON CONFLICT(key_name) DO UPDATE SET value = excluded.value;', args: ['watermark_enabled', watermarkEnabled] }
      ]);

      res.writeHead(302, { Location: '/?tab=settings&alert=' + encodeURIComponent('Global system proctor settings saved.') });
      return res.end();
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

server.listen(PORT, () => {
  console.log(`======================================================================`);
  console.log(`  APEX PREMED ADMIN COMMAND CENTER (100% PURE TURSO CLOUD DB)`);
  console.log(`======================================================================`);
  console.log(`  Running at: http://localhost:${PORT}`);
  console.log(`  Cluster: aws-us-east-1 (Zero SQLite, Pure libSQL over HTTPS)`);
  console.log(`======================================================================`);
});
