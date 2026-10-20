/**
 * Study Combat - Production Real-time Socket.io Engine & Admin Control Center
 * Runs on Port 8899 alongside Admin Server with Socket.io Support
 */

const http = require('node:http');
const https = require('node:https');
const url = require('node:url');
const { Server } = require('socket.io');
const { parseJsonResponse } = require('./helpers/http_utils.js');
const { renderHtml } = require('./admin_ui_template.js');

const PORT = process.env.PORT || 8899;

const TURSO_URL = process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || 'https://premed-test-portal-emmanueladejuwon2021-star.aws-us-east-1.turso.io/v2/pipeline';
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE3NDk0MzQsImlkIjoiMDFhMTJiNTYtZmEwMS03MmMzLWJlMjctYzRmMDhmMjkxNmJiIiwia2lkIjoiel90TE1SckVpVnk2a28xZ0tEbGc4RkgyUnpWUkJJd1FUcG05UV9PdXRhZyIsInJpZCI6IjNlZmQ3MDQ0LWU2ZTAtNDQ1NS05MGQ5LTY0N2EwNjlkZjcwMyJ9.08Klb4LcVxUkzyLgz6G8s6RnshFl7cMHpVKYaygdBcZpYI8jiyXtEQEw7TNoq66rRCta9ajGYxWiaUBCTs_zBA';

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

const proctorLiveSessions = new Map();

// Helper: Format args for Turso
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

function rtrim(str, ch) {
  return str.endsWith(ch) ? str.slice(0, -ch.length) : str;
}

// Core: Dispatch Turso Pipeline Batch Request
function runTursoPipeline(requests) {
  return new Promise((resolve) => {
    try {
      const payload = JSON.stringify({ requests: [...requests, { type: 'close' }] });
      const reqUrl = TURSO_URL.endsWith('/v2/pipeline') ? TURSO_URL : rtrim(TURSO_URL, '/') + '/v2/pipeline';
      const req = https.request(reqUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TURSO_TOKEN}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 15000
      }, (res) => {
        parseJsonResponse(res, '[TURSO PARSE ERROR]').then(resolve);
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

async function tursoQuery(sql, args = []) {
  const res = await runTursoPipeline([{ type: 'execute', stmt: { sql, args: formatArgs(args) } }]);
  if (!res || !res.results || !res.results[0] || res.results[0].type !== 'ok') {
    return [];
  }
  return parseRows(res.results[0].response.result);
}

async function tursoExecute(sql, args = []) {
  const res = await runTursoPipeline([{ type: 'execute', stmt: { sql, args: formatArgs(args) } }]);
  return (res && res.results && res.results[0] && res.results[0].type === 'ok');
}

async function tursoBatch(stmts) {
  const requests = stmts.map(s => {
    if (typeof s === 'string') return { type: 'execute', stmt: { sql: s } };
    return { type: 'execute', stmt: { sql: s.sql, args: formatArgs(s.args || []) } };
  });
  return await runTursoPipeline(requests);
}

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
      stats: {}, allTests: [], courses: [], allTopics: [], questions: [],
      examSessions: [], submissions: [], students: [], settingsMap: {}, DEPARTMENTS
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
    stats: { totalQuestions, totalStudents, totalResults, totalCourses, liveTestsCount, activeSessionsCount, cheatedSessionsCount },
    allTests, courses, allTopics, questions, examSessions, submissions, students, settingsMap, DEPARTMENTS
  };
}

// -------------------------------------------------------------
// STUDY COMBAT STATE & GAME LOGIC
// -------------------------------------------------------------
const activeCombatRooms = new Map();
const socketUserMap = new Map();
const userActiveRoomMap = new Map();

const COMBAT_RANKS = [
  { name: 'Noobie', wins: 0, color: '#9CA3AF' },
  { name: 'Rookie', wins: 1, color: '#86EFAC' },
  { name: 'Learner', wins: 2, color: '#22C55E' },
  { name: 'Scholar', wins: 3, color: '#3B82F6' },
  { name: 'Challenger', wins: 5, color: '#A855F7' },
  { name: 'Seeker', wins: 7, color: '#7E22CE' },
  { name: 'Striker', wins: 10, color: '#F97316' },
  { name: 'Tactician', wins: 12, color: '#C2410C' },
  { name: 'Contender', wins: 15, color: '#EF4444' },
  { name: 'Warrior', wins: 18, color: '#991B1B' },
  { name: 'Champion', wins: 20, color: '#EAB308' },
  { name: 'Slayer', wins: 22, color: '#A16207' },
  { name: 'Elite', wins: 25, color: '#94A3B8' },
  { name: 'Veteran', wins: 27, color: '#38BDF8' },
  { name: 'Commander', wins: 30, color: '#10B981' },
  { name: 'Conqueror', wins: 32, color: '#E11D48' },
  { name: 'Legend', wins: 35, color: '#F59E0B' },
  { name: 'Titan', wins: 37, color: '#2563EB' },
  { name: 'Warlord', wins: 40, color: '#DC2626' },
  { name: 'Overlord', wins: 42, color: '#18181B' },
  { name: 'Immortal', wins: 45, color: '#F8FAFC' },
  { name: 'Mythic', wins: 47, color: '#C084FC' },
  { name: 'Grandmaster', wins: 50, color: '#F43F5E' },
  { name: 'Eternal Grandmaster', wins: 55, color: '#EC4899' },
  { name: 'Celestial Grandmaster', wins: 60, color: '#06B6D4' },
  { name: 'Supreme Grandmaster', wins: 70, color: '#8B5CF6' },
  { name: 'God of Study', wins: 80, color: '#F59E0B' },
  { name: 'The Unbeatable', wins: 100, color: '#10B981' }
];

function calculateRank(wins) {
  let matched = COMBAT_RANKS[0];
  for (const r of COMBAT_RANKS) {
    if (wins >= r.wins) {
      matched = r;
    }
  }
  return matched;
}

async function generateUniqueRoomCode() {
  let attempts = 0;
  while (attempts < 100) {
    attempts++;
    const digits = Math.floor(10000 + Math.random() * 90000);
    const code = `PREMED-${digits}`;
    if (activeCombatRooms.has(code)) continue;

    const dbRes = await tursoQuery("SELECT room_code FROM combat_rooms WHERE room_code = ? AND status IN ('waiting', 'playing', 'round_break') LIMIT 1;", [code]);
    if (dbRes.length === 0) {
      return code;
    }
  }
  return `PREMED-${Math.floor(10000 + Math.random() * 90000)}`;
}

async function fetchQuestionPoolForTopic(topicId, neededCount) {
  const pastQs = await tursoQuery("SELECT id, text, a, b, c, d, correct_option, explanation FROM questions WHERE topic_id = ?;", [topicId]);
  const studyQs = await tursoQuery(`
    SELECT q.id, q.question_text as text, q.option_a as a, q.option_b as b, q.option_c as c, q.option_d as d, q.correct_option, q.explanation
    FROM study_session_questions q
    JOIN study_note_sessions s ON q.session_id = s.id
    JOIN study_notes n ON s.note_id = n.id
    WHERE n.topic_id = ?;
  `, [topicId]);

  let combined = [...pastQs, ...studyQs];
  if (combined.length === 0) {
    combined = await tursoQuery("SELECT id, text, a, b, c, d, correct_option, explanation FROM questions LIMIT 50;");
  }

  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  const result = [];
  while (result.length < neededCount && combined.length > 0) {
    for (const q of combined) {
      if (result.length >= neededCount) break;
      result.push(q);
    }
  }
  return result;
}

function prepareQuestionForClient(q) {
  const options = [
    { key: 'A', text: q.a },
    { key: 'B', text: q.b },
    { key: 'C', text: q.c },
    { key: 'D', text: q.d }
  ].filter(o => o.text && o.text.trim() !== '');

  return {
    id: q.id,
    text: q.text,
    options: options
  };
}

// Start HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
    return res.end();
  }

  // REST API: Validate PREMED- Code
  if (req.method === 'POST' && pathname === '/api/combat/validate-code') {
    const data = await parseBody(req);
    const code = (data.code || '').trim().toUpperCase();

    if (!code || !code.startsWith('PREMED-')) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ valid: false, message: 'Invalid PREMED- code format.' }));
    }

    const memRoom = activeCombatRooms.get(code);
    if (memRoom) {
      if (memRoom.status === 'finished' || memRoom.status === 'terminated') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ valid: false, message: 'This room has finished or expired.' }));
      }
      const maxPlayers = memRoom.mode === '2v1' ? 3 : 2;
      if (memRoom.players.length >= maxPlayers) {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ valid: false, message: 'Room is full.' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({
        valid: true,
        roomName: memRoom.roomName,
        courseCode: memRoom.courseCode,
        topicName: memRoom.topicName,
        hostName: memRoom.hostName,
        mode: memRoom.mode,
        questionsPerRound: memRoom.questionsPerRound,
        totalRounds: memRoom.totalRounds
      }));
    }

    const rows = await tursoQuery(`
      SELECT cr.*, c.code as course_code, t.name as topic_name, st.name as host_name
      FROM combat_rooms cr
      LEFT JOIN courses c ON cr.course_id = c.id
      LEFT JOIN topics t ON cr.topic_id = t.id
      LEFT JOIN students st ON cr.created_by = st.id
      WHERE cr.room_code = ? LIMIT 1;
    `, [code]);

    if (rows.length === 0) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ valid: false, message: 'This PREMED- code does not exist. Check code.' }));
    }

    const room = rows[0];
    if (room.status === 'finished' || room.status === 'terminated') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ valid: false, message: 'This room has finished or expired.' }));
    }

    const playersArr = JSON.parse(room.players || '[]');
    const maxPlayers = room.mode === '2v1' ? 3 : 2;
    if (playersArr.length >= maxPlayers) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ valid: false, message: 'Room is full.' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({
      valid: true,
      roomName: room.room_name,
      courseCode: room.course_code || 'Course',
      topicName: room.topic_name || 'Topic',
      hostName: room.host_name || 'Host',
      mode: room.mode,
      questionsPerRound: room.questions_per_round,
      totalRounds: room.total_rounds
    }));
  }

  // REST API: Get Room Status
  if ((req.method === 'GET' || req.method === 'POST') && pathname === '/api/combat/get-room-status') {
    const data = await parseBody(req);
    const code = (query.roomCode || data.roomCode || '').trim().toUpperCase();

    const room = activeCombatRooms.get(code);
    if (room) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ success: true, room }));
    }

    const rows = await tursoQuery("SELECT * FROM combat_rooms WHERE room_code = ? LIMIT 1;", [code]);
    if (rows.length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ success: false, message: 'Room not found.' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({ success: true, room: rows[0] }));
  }

  // REST API: Join Battle Room
  if (req.method === 'POST' && pathname === '/api/combat/join-room') {
    const data = await parseBody(req);
    const { roomCode, userId, studentName, matricNo } = data;
    const code = (roomCode || '').trim().toUpperCase();

    const room = activeCombatRooms.get(code);
    if (room) {
      const existingPlayer = room.players.find(p => p.userId === userId);
      if (!existingPlayer) {
        const maxPlayers = room.mode === '2v1' ? 3 : 2;
        if (room.players.length >= maxPlayers) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ success: false, message: 'Room is full.' }));
        }

        const newPlayer = {
          userId,
          name: studentName,
          matricNo,
          team: room.mode === '2v1' ? (room.players.filter(p => p.team === 'A').length < 2 ? 'A' : 'B') : 'B',
          isHost: false,
          socketId: null,
          joinedAt: new Date(),
          connected: true,
          stats: await getUserCombatStats(userId, matricNo, studentName)
        };

        room.players.push(newPlayer);
        room.scores[userId] = 0;
        room.roundScores[userId] = 0;

        await tursoExecute("UPDATE combat_rooms SET players = ?, scores = ? WHERE room_code = ?;", [
          JSON.stringify(room.players), JSON.stringify(room.scores), code
        ]);

        io.to(code).emit('playerJoined', { player: newPlayer, room });
      }

      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ success: true, roomCode: code, room }));
    }

    // Query Turso DB
    const rows = await tursoQuery("SELECT * FROM combat_rooms WHERE room_code = ? LIMIT 1;", [code]);
    if (rows.length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ success: false, message: 'Room code not found.' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({ success: true, roomCode: code, room: rows[0] }));
  }

  // REST API: Start Game
  if (req.method === 'POST' && pathname === '/api/combat/start-game') {
    const data = await parseBody(req);
    const { roomCode, userId } = data;
    const code = (roomCode || '').trim().toUpperCase();

    const room = activeCombatRooms.get(code);
    if (room) {
      room.status = 'playing';
      room.currentRound = 1;
      room.currentQuestionIndex = 0;
      room.currentTurnUserId = room.players[0].userId;
      room.turnType = 'main';

      await tursoExecute("UPDATE combat_rooms SET status = 'playing' WHERE room_code = ?;", [code]);

      io.to(code).emit('gameStarted', { room });
      sendNextQuestion(code);

      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ success: true, room }));
    }

    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({ success: false, message: 'Room not found.' }));
  }

  // REST API: Create Battle Room
  if (req.method === 'POST' && pathname === '/api/combat/create-room') {
    const data = await parseBody(req);
    const { userId, studentName, matricNo, roomName, courseId, topicId, courseCode, topicName, mode, questionsPerRound, totalRounds } = data;

    if (!userId || !courseId || !topicId) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ success: false, message: 'Missing required parameters (course, topic, user).' }));
    }

    const roomCode = await generateUniqueRoomCode();
    const numQuestionsPerRound = parseInt(questionsPerRound, 10) || 4;
    const numRounds = parseInt(totalRounds, 10) || 4;
    const totalQuestions = Math.min(numQuestionsPerRound * 2 * numRounds, 40);

    const questionsPool = await fetchQuestionPoolForTopic(topicId, totalQuestions);

    const hostPlayer = {
      userId,
      name: studentName,
      matricNo,
      team: 'A',
      isHost: true,
      socketId: null,
      joinedAt: new Date(),
      connected: true,
      stats: await getUserCombatStats(userId, matricNo, studentName)
    };

    const room = {
      roomCode,
      roomName: roomName || `${studentName}'s Battle`,
      courseId,
      topicId,
      courseCode,
      topicName,
      createdBy: userId,
      hostName: studentName,
      mode: mode || '1v1',
      questionsPerRound: numQuestionsPerRound,
      totalRounds: numRounds,
      totalQuestions,
      status: 'waiting',
      players: [hostPlayer],
      questionsPool,
      currentRound: 1,
      currentQuestionIndex: 0,
      currentTurnUserId: userId,
      turnType: 'main',
      scores: { [userId]: 0 },
      roundScores: { [userId]: 0 },
      disconnectTimer: null,
      reconnectTrialTimer: null,
      timerInterval: null,
      timeRemaining: 30,
      teamASelection: {},
      roundStats: []
    };

    activeCombatRooms.set(roomCode, room);
    userActiveRoomMap.set(userId, roomCode);

    await tursoExecute(`
      INSERT INTO combat_rooms (
        id, room_code, room_name, course_id, topic_id, created_by, mode,
        questions_per_round, total_rounds, total_questions, status, players, scores,
        created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'waiting', ?, ?, CURRENT_TIMESTAMP, datetime('now', '+1 day'));
    `, [
      `room_${Math.random().toString(36).substring(2, 10)}`,
      roomCode, room.roomName, courseId, topicId, userId, room.mode,
      numQuestionsPerRound, numRounds, totalQuestions, JSON.stringify([hostPlayer]), JSON.stringify(room.scores)
    ]);

    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({ success: true, roomCode, room }));
  }

  // REST API: Export Combat Leaderboard CSV
  if (req.method === 'GET' && pathname === '/api/combat/export-leaderboard') {
    const rows = await tursoQuery(`
      SELECT user_id, matric_no, student_name, total_matches, wins, losses, draws, total_points, combat_coins, current_rank
      FROM user_combat_stats
      ORDER BY wins DESC, total_points DESC;
    `);

    let csv = 'Matric No,Student Name,Total Matches,Wins,Losses,Draws,Total Points,Combat Coins,Current Rank\n';
    rows.forEach(r => {
      csv += `"${r.matric_no || ''}","${(r.student_name || '').replace(/"/g, '""')}",${r.total_matches},${r.wins},${r.losses},${r.draws},${r.total_points},${r.combat_coins},"${r.current_rank}"\n`;
    });

    res.writeHead(200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="study_combat_leaderboard.csv"'
    });
    return res.end(csv);
  }

  // GET Admin Dashboard
  if (req.method === 'GET' && pathname === '/') {
    const tab = query.tab || 'home';
    const alert = query.alert || null;
    const alertType = query.alert_type || 'success';

    const data = await fetchAdminDashboardData();
    const html = renderHtml(tab, alert, alertType, null, null, data);

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }

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

    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({ activeCount, sessions }));
  }

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
        warning: currentWarning ? null : existing.warning
      });

      if (data.frame && shouldSyncCloud) {
        tursoExecute('UPDATE exam_sessions SET latest_frame = ?, tab_switches = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;', [
          data.frame, newSwitches, sessionId
        ]).catch(() => {});
      }

      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ success: true, warning: currentWarning }));
    }

    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({ error: 'Missing session_id' }));
  }

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

      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ success: true, message: 'Warning dispatched successfully' }));
    }

    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({ error: 'Missing session_id or warning message' }));
  }

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

  // Handle Admin POST Actions
  if (req.method === 'POST') {
    const data = await parseBody(req);

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

        res.writeHead(302, { Location: '/?tab=tests&alert=' + encodeURIComponent(`Test "${title}" deployed successfully!`) });
        return res.end();
      }

      res.writeHead(302, { Location: '/?tab=tests&alert=Missing+title+or+course&alert_type=error' });
      return res.end();
    }

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

    if (pathname === '/action/delete_test') {
      const testId = data.test_id;
      if (testId) {
        await tursoExecute('DELETE FROM tests WHERE id = ?;', [testId]);
      }
      res.writeHead(302, { Location: '/?tab=tests&alert=' + encodeURIComponent('Test removed successfully.') });
      return res.end();
    }

    if (pathname === '/action/master_tests_live_toggle') {
      const targetState = parseInt(data.target_state, 10) || 0;
      await tursoExecute('UPDATE tests SET is_live = ?, updated_at = CURRENT_TIMESTAMP;', [targetState]);
      res.writeHead(302, { Location: '/?tab=tests&alert=' + encodeURIComponent(`All tests set to ${targetState ? 'LIVE' : 'OFFLINE'}.`) });
      return res.end();
    }

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

        res.writeHead(302, { Location: '/?tab=questions&alert=' + encodeURIComponent('Question saved to bank!') });
        return res.end();
      }
      res.writeHead(302, { Location: '/?tab=questions&alert=Question+text+and+options+required&alert_type=error' });
      return res.end();
    }

    if (pathname === '/action/delete_question') {
      const questionId = data.question_id;
      if (questionId) {
        await tursoExecute('DELETE FROM questions WHERE id = ?;', [questionId]);
      }
      res.writeHead(302, { Location: '/?tab=questions&alert=' + encodeURIComponent('Question deleted.') });
      return res.end();
    }

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

    if (pathname === '/action/delete_student') {
      const studentId = data.student_id;
      if (studentId) {
        await tursoExecute('DELETE FROM students WHERE id = ?;', [studentId]);
      }
      res.writeHead(302, { Location: '/?tab=students&alert=' + encodeURIComponent('Candidate removed.') });
      return res.end();
    }

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
      res.writeHead(302, { Location: '/?tab=home&alert=' + encodeURIComponent('Candidate retake granted.') });
      return res.end();
    }

    if (pathname === '/action/invalidate_session') {
      const sessionId = data.session_id;
      if (sessionId) {
        if (proctorLiveSessions.has(sessionId)) {
          const s = proctorLiveSessions.get(sessionId);
          s.status = 'TERMINATED_FOR_CHEATING';
        }
        await tursoExecute("UPDATE exam_sessions SET status = 'TERMINATED_FOR_CHEATING', updated_at = CURRENT_TIMESTAMP WHERE id = ?;", [sessionId]);
      }
      res.writeHead(302, { Location: '/?tab=home&alert=' + encodeURIComponent('Candidate test terminated.') });
      return res.end();
    }

    if (pathname === '/action/send_proctor_warning') {
      const sessionId = data.session_id;
      const warningMsg = (data.warning_message || data.warning || '').trim();

      if (sessionId && warningMsg) {
        const existing = proctorLiveSessions.get(sessionId) || {};
        existing.warning = warningMsg;
        existing.updatedAt = Date.now();
        proctorLiveSessions.set(sessionId, existing);

        await tursoExecute('UPDATE exam_sessions SET proctor_warning = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;', [warningMsg, sessionId]);
        res.writeHead(302, { Location: '/?tab=home&alert=' + encodeURIComponent('Proctor warning sent.') });
        return res.end();
      }

      res.writeHead(302, { Location: '/?tab=home&alert=Missing+warning+message&alert_type=error' });
      return res.end();
    }

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

      res.writeHead(302, { Location: '/?tab=settings&alert=' + encodeURIComponent('Global proctor settings saved.') });
      return res.end();
    }
  }

  // Fallback 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

// Initialize Socket.io Server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Real-time Game Engine Handlers
io.on('connection', (socket) => {
  // 1. Create Room
  socket.on('createRoom', async (data) => {
    try {
      const { userId, studentName, matricNo, roomName, courseId, topicId, courseCode, topicName, mode, questionsPerRound, totalRounds } = data;

      if (userActiveRoomMap.has(userId)) {
        const existingCode = userActiveRoomMap.get(userId);
        const existingRoom = activeCombatRooms.get(existingCode);
        if (existingRoom && existingRoom.status !== 'finished' && existingRoom.status !== 'terminated') {
          socket.emit('errorMsg', 'You are already in an active battle room! Multiple tabs are blocked.');
          return;
        }
      }

      const roomCode = await generateUniqueRoomCode();
      const numQuestionsPerRound = parseInt(questionsPerRound, 10) || 4;
      const numRounds = parseInt(totalRounds, 10) || 4;
      const totalQuestions = Math.min(numQuestionsPerRound * 2 * numRounds, 40);

      const questionsPool = await fetchQuestionPoolForTopic(topicId, totalQuestions);

      const hostPlayer = {
        userId,
        name: studentName,
        matricNo,
        team: 'A',
        isHost: true,
        socketId: socket.id,
        joinedAt: new Date(),
        connected: true,
        stats: await getUserCombatStats(userId, matricNo, studentName)
      };

      const room = {
        roomCode,
        roomName: roomName || `${studentName}'s Battle`,
        courseId,
        topicId,
        courseCode,
        topicName,
        createdBy: userId,
        hostName: studentName,
        mode: mode || '1v1',
        questionsPerRound: numQuestionsPerRound,
        totalRounds: numRounds,
        totalQuestions,
        status: 'waiting',
        players: [hostPlayer],
        questionsPool,
        currentRound: 1,
        currentQuestionIndex: 0,
        currentTurnUserId: userId,
        turnType: 'main',
        scores: { [userId]: 0 },
        roundScores: { [userId]: 0 },
        disconnectTimer: null,
        reconnectTrialTimer: null,
        timerInterval: null,
        timeRemaining: 30,
        teamASelection: {},
        roundStats: []
      };

      activeCombatRooms.set(roomCode, room);
      userActiveRoomMap.set(userId, roomCode);
      socketUserMap.set(socket.id, { userId, roomCode, matricNo, name: studentName });

      socket.join(roomCode);

      await tursoExecute(`
        INSERT INTO combat_rooms (
          id, room_code, room_name, course_id, topic_id, created_by, mode,
          questions_per_round, total_rounds, total_questions, status, players, scores,
          created_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'waiting', ?, ?, CURRENT_TIMESTAMP, datetime('now', '+1 day'));
      `, [
        `room_${Math.random().toString(36).substring(2, 10)}`,
        roomCode, room.roomName, courseId, topicId, userId, room.mode,
        numQuestionsPerRound, numRounds, totalQuestions, JSON.stringify([hostPlayer]), JSON.stringify(room.scores)
      ]);

      socket.emit('roomCreated', { roomCode, room });
      io.emit('adminRoomUpdate', { roomCode, room });
    } catch (e) {
      console.error('Error creating room:', e);
      socket.emit('errorMsg', 'Failed to create room: ' + e.message);
    }
  });

  // 2. Validate PREMED- Code via Socket
  socket.on('validateCode', async (data) => {
    const code = (data.code || '').trim().toUpperCase();
    const room = activeCombatRooms.get(code);

    if (!room || room.status === 'finished' || room.status === 'terminated') {
      socket.emit('codeValidated', { valid: false, message: 'This PREMED- code is not recognized by website or has expired.' });
      return;
    }

    const maxPlayers = room.mode === '2v1' ? 3 : 2;
    if (room.players.length >= maxPlayers) {
      socket.emit('codeValidated', { valid: false, message: 'Room is full.' });
      return;
    }

    socket.emit('codeValidated', {
      valid: true,
      roomName: room.roomName,
      courseCode: room.courseCode,
      topicName: room.topicName,
      hostName: room.hostName,
      mode: room.mode,
      questionsPerRound: room.questionsPerRound,
      totalRounds: room.totalRounds
    });
  });

  // 3. Join Room
  socket.on('joinRoom', async (data) => {
    try {
      const { roomCode, userId, studentName, matricNo, requestedTeam } = data;
      const code = (roomCode || '').trim().toUpperCase();

      let room = activeCombatRooms.get(code);

      // If room was created via native PHP or page refreshed, restore room from DB into memory
      if (!room) {
        const dbRows = await tursoQuery("SELECT * FROM combat_rooms WHERE room_code = ? LIMIT 1;", [code]);
        if (dbRows.length > 0) {
          const dbRoom = dbRows[0];
          if (dbRoom.status !== 'finished' && dbRoom.status !== 'terminated') {
            const numQs = dbRoom.total_questions || 16;
            const questionsPool = await fetchQuestionPoolForTopic(dbRoom.topic_id, numQs);
            room = {
              roomCode: dbRoom.room_code,
              roomName: dbRoom.room_name,
              courseId: dbRoom.course_id,
              topicId: dbRoom.topic_id,
              courseCode: 'COURSE',
              topicName: 'Topic',
              createdBy: dbRoom.created_by,
              hostName: studentName,
              mode: dbRoom.mode || '1v1',
              questionsPerRound: dbRoom.questions_per_round || 4,
              totalRounds: dbRoom.total_rounds || 4,
              totalQuestions: numQs,
              status: dbRoom.status || 'waiting',
              players: JSON.parse(dbRoom.players || '[]'),
              questionsPool,
              currentRound: dbRoom.current_round || 1,
              currentQuestionIndex: dbRoom.current_question_index || 0,
              currentTurnUserId: dbRoom.current_turn_user_id || userId,
              turnType: 'main',
              scores: JSON.parse(dbRoom.scores || '{}'),
              roundScores: {},
              timeRemaining: 30
            };
            activeCombatRooms.set(code, room);
          }
        }
      }

      if (!room) {
        socket.emit('errorMsg', 'Room not found or expired.');
        return;
      }

      if (userActiveRoomMap.has(userId) && userActiveRoomMap.get(userId) !== code) {
        socket.emit('errorMsg', 'You are already in another active battle room.');
        return;
      }

      const existingPlayer = room.players.find(p => p.userId === userId);
      if (existingPlayer) {
        existingPlayer.socketId = socket.id;
        existingPlayer.connected = true;
        socket.join(code);
        socketUserMap.set(socket.id, { userId, roomCode: code, matricNo, name: studentName });

        if (room.disconnectTimer) {
          clearTimeout(room.disconnectTimer);
          room.disconnectTimer = null;
        }
        if (room.reconnectTrialTimer) {
          clearTimeout(room.reconnectTrialTimer);
          room.reconnectTrialTimer = null;
        }

        io.to(code).emit('playerReconnected', { userId, name: studentName, room });
        return;
      }

      const maxPlayers = room.mode === '2v1' ? 3 : 2;
      if (room.players.length >= maxPlayers) {
        socket.emit('errorMsg', 'Room is full.');
        return;
      }

      let team = 'B';
      if (room.mode === '2v1') {
        const teamAPlayers = room.players.filter(p => p.team === 'A');
        if (requestedTeam === 'A' && teamAPlayers.length < 2) {
          team = 'A';
        } else if (teamAPlayers.length < 2) {
          team = 'A';
        } else {
          team = 'B';
        }
      }

      const newPlayer = {
        userId,
        name: studentName,
        matricNo,
        team,
        isHost: false,
        socketId: socket.id,
        joinedAt: new Date(),
        connected: true,
        stats: await getUserCombatStats(userId, matricNo, studentName)
      };

      room.players.push(newPlayer);
      room.scores[userId] = 0;
      room.roundScores[userId] = 0;

      userActiveRoomMap.set(userId, code);
      socketUserMap.set(socket.id, { userId, roomCode: code, matricNo, name: studentName });

      socket.join(code);

      await tursoExecute("UPDATE combat_rooms SET players = ?, scores = ? WHERE room_code = ?;", [
        JSON.stringify(room.players), JSON.stringify(room.scores), code
      ]);

      io.to(code).emit('playerJoined', { player: newPlayer, room });
      io.emit('adminRoomUpdate', { roomCode: code, room });
    } catch (e) {
      console.error('Error joining room:', e);
      socket.emit('errorMsg', 'Failed to join room.');
    }
  });

  // 4. Start Game
  socket.on('startGame', async (data) => {
    const { roomCode, userId } = data;
    const room = activeCombatRooms.get(roomCode);

    if (!room || room.createdBy !== userId) {
      socket.emit('errorMsg', 'Only the room host can start the battle.');
      return;
    }

    const minPlayers = room.mode === '2v1' ? 3 : 2;
    if (room.players.length < minPlayers) {
      socket.emit('errorMsg', `Waiting for opponent(s) to join. Need ${minPlayers} players to start.`);
      return;
    }

    room.status = 'playing';
    room.currentRound = 1;
    room.currentQuestionIndex = 0;
    room.currentTurnUserId = room.players[0].userId;
    room.turnType = 'main';

    await tursoExecute("UPDATE combat_rooms SET status = 'playing' WHERE room_code = ?;", [roomCode]);

    io.to(roomCode).emit('gameStarted', { room });
    io.emit('adminRoomUpdate', { roomCode, room });

    sendNextQuestion(roomCode);
  });

  // 5. Submit Main Answer
  socket.on('mainAnswerSubmitted', async (data) => {
    const { roomCode, userId, selectedOption } = data;
    const room = activeCombatRooms.get(roomCode);
    if (!room || room.status !== 'playing' || room.turnType !== 'main') return;

    const currentQ = room.questionsPool[room.currentQuestionIndex];
    if (!currentQ) return;

    // Check if time had expired before submission
    const elapsedSec = (Date.now() - (room.turnStartTime || Date.now())) / 1000;
    if (elapsedSec > (room.timerDuration || 15) + 2.5) {
      console.warn(`[COMBAT LATE BONUS SUBMISSION BLOCKED] Room: ${roomCode}, Elapsed: ${elapsedSec}s`);
      return;
    }

    if (room.mode === '2v1') {
      const currentTurnPlayer = room.players.find(p => p.userId === room.currentTurnUserId);
      const isTeamATurn = currentTurnPlayer && currentTurnPlayer.team === 'A';

      if (isTeamATurn) {
        const teamAPlayers = room.players.filter(p => p.team === 'A');
        const userInTeamA = teamAPlayers.some(p => p.userId === userId);
        if (!userInTeamA) return;

        room.teamASelection[userId] = selectedOption;

        io.to(roomCode).emit('teamASelectionUpdate', {
          selections: room.teamASelection,
          message: `${room.players.find(p => p.userId === userId)?.name} selected an option.`
        });

        if (Object.keys(room.teamASelection).length >= teamAPlayers.length) {
          clearInterval(room.timerInterval);
          const choices = Object.values(room.teamASelection);
          const firstChoice = choices[0];
          const allAgree = choices.every(c => c === firstChoice);

          if (!allAgree) {
            io.to(roomCode).emit('teamADisagreed', { message: 'Team members disagree! Rethink and agree on one option!' });
            return;
          }

          evaluateMainAnswer(room, firstChoice, currentQ);
        }
        return;
      }
    }

    if (room.currentTurnUserId !== userId) return;

    clearInterval(room.timerInterval);
    evaluateMainAnswer(room, selectedOption, currentQ);
  });

  // 6. Submit Bonus Answer
  socket.on('bonusAnswerSubmitted', async (data) => {
    const { roomCode, userId, selectedOption } = data;
    const room = activeCombatRooms.get(roomCode);
    if (!room || room.status !== 'playing' || room.turnType !== 'bonus') return;

    const currentQ = room.questionsPool[room.currentQuestionIndex];
    if (!currentQ) return;

    const elapsedSec = (Date.now() - (room.turnStartTime || Date.now())) / 1000;
    if (elapsedSec > (room.timerDuration || 30) + 2.5) {
      console.warn(`[COMBAT LATE MAIN SUBMISSION BLOCKED] Room: ${roomCode}, Elapsed: ${elapsedSec}s`);
      return;
    }

    if (room.mode === '2v1') {
      const bonusPlayers = room.players.filter(p => p.team === room.bonusTeam);
      if (room.bonusTeam === 'A') {
        const userInTeamA = bonusPlayers.some(p => p.userId === userId);
        if (!userInTeamA) return;

        room.teamASelection[userId] = selectedOption;

        io.to(roomCode).emit('teamASelectionUpdate', { selections: room.teamASelection });

        if (Object.keys(room.teamASelection).length >= bonusPlayers.length) {
          clearInterval(room.timerInterval);
          const choices = Object.values(room.teamASelection);
          const firstChoice = choices[0];
          const allAgree = choices.every(c => c === firstChoice);

          if (!allAgree) {
            io.to(roomCode).emit('teamADisagreed', { message: 'Team members disagree! Rethink and agree on one option!' });
            return;
          }
          evaluateBonusAnswer(room, firstChoice, currentQ);
        }
        return;
      }
    }

    if (room.bonusUserId !== userId) return;

    clearInterval(room.timerInterval);
    evaluateBonusAnswer(room, selectedOption, currentQ);
  });

  // 7. Player Thinking Notification
  socket.on('playerThinking', (data) => {
    const { roomCode, userId } = data;
    socket.to(roomCode).emit('thinkingUpdate', { userId });
  });

  // 8. Rematch Request
  socket.on('rematchRequest', async (data) => {
    const { roomCode, userId } = data;
    const room = activeCombatRooms.get(roomCode);
    if (!room) return;

    room.rematchVotes = room.rematchVotes || new Set();
    room.rematchVotes.add(userId);

    io.to(roomCode).emit('rematchVoteUpdate', { votes: Array.from(room.rematchVotes), totalNeeded: room.players.length });

    if (room.rematchVotes.size >= room.players.length) {
      const totalQuestions = room.totalQuestions;
      room.questionsPool = await fetchQuestionPoolForTopic(room.topicId, totalQuestions);
      room.currentRound = 1;
      room.currentQuestionIndex = 0;
      room.currentTurnUserId = room.players[0].userId;
      room.status = 'playing';
      room.scores = {};
      room.roundScores = {};
      room.players.forEach(p => {
        room.scores[p.userId] = 0;
        room.roundScores[p.userId] = 0;
      });
      room.rematchVotes = new Set();

      io.to(roomCode).emit('rematchStarted', { room });
      sendNextQuestion(roomCode);
    }
  });

  // 9. Admin Spectate
  socket.on('adminSpectate', (data) => {
    const { roomCode } = data;
    const room = activeCombatRooms.get(roomCode);
    if (room) {
      socket.join(roomCode);
      socket.emit('spectateData', { room });
    }
  });

  // 10. Admin Terminate Room
  socket.on('adminTerminate', async (data) => {
    const { roomCode, reason } = data;
    const room = activeCombatRooms.get(roomCode);
    if (room) {
      room.status = 'terminated';
      clearInterval(room.timerInterval);
      io.to(roomCode).emit('roomTerminated', { reason: reason || 'Terminated by Admin.' });
      await tursoExecute("UPDATE combat_rooms SET status = 'terminated' WHERE room_code = ?;", [roomCode]);
      activeCombatRooms.delete(roomCode);
    }
  });

  // Disconnection Handler
  socket.on('disconnect', () => {
    const userInfo = socketUserMap.get(socket.id);
    if (!userInfo) return;

    const { userId, roomCode, name } = userInfo;
    const room = activeCombatRooms.get(roomCode);

    if (room && room.status === 'playing') {
      const player = room.players.find(p => p.userId === userId);
      if (player) {
        player.connected = false;
        io.to(roomCode).emit('playerDisconnected', { userId, name, message: 'Opponent disconnected! Waiting 60s for reconnection...' });

        clearInterval(room.timerInterval);

        room.disconnectTimer = setTimeout(() => {
          io.to(roomCode).emit('reconnectTrialStarted', { userId, message: 'Giving 45s extra trial to reconnect...' });

          room.reconnectTrialTimer = setTimeout(async () => {
            room.status = 'terminated';
            io.to(roomCode).emit('playerForfeited', {
              forfeitedUserId: userId,
              forfeitedName: name,
              message: `${name} failed to reconnect. Game closed!`
            });

            await handleForfeitGame(room, userId);
            activeCombatRooms.delete(roomCode);
            userActiveRoomMap.delete(userId);
          }, 45000);
        }, 60000);
      }
    }

    socketUserMap.delete(socket.id);
  });
});

async function evaluateMainAnswer(room, selectedOption, currentQ) {
  const roomCode = room.roomCode;
  clearInterval(room.timerInterval);

  const isCorrect = (selectedOption === currentQ.correct_option);
  const turnUserId = room.currentTurnUserId;
  const timeUsed = Math.min(30, Math.max(0, (Date.now() - (room.turnStartTime || Date.now())) / 1000));
  const pointsAwarded = isCorrect ? 2 : 0;

  if (isCorrect) {
    if (room.mode === '2v1') {
      const currentTurnPlayer = room.players.find(p => p.userId === turnUserId);
      const teamPlayers = room.players.filter(p => p.team === currentTurnPlayer.team);
      teamPlayers.forEach(p => {
        room.scores[p.userId] = (room.scores[p.userId] || 0) + 2;
        room.roundScores[p.userId] = (room.roundScores[p.userId] || 0) + 2;
      });
    } else {
      room.scores[turnUserId] = (room.scores[turnUserId] || 0) + 2;
      room.roundScores[turnUserId] = (room.roundScores[turnUserId] || 0) + 2;
    }

    io.to(roomCode).emit('mainAnswerResult', {
      isCorrect: true,
      correctOption: currentQ.correct_option,
      selectedOption,
      explanation: currentQ.explanation,
      pointsAwarded: 2,
      scores: room.scores,
      turnUserId: room.currentTurnUserId,
      userId: turnUserId
    });

    setTimeout(() => advanceToNextTurn(roomCode), 2500);
  } else {
    io.to(roomCode).emit('mainAnswerResult', {
      isCorrect: false,
      correctOption: currentQ.correct_option,
      selectedOption,
      explanation: currentQ.explanation,
      pointsAwarded: 0,
      scores: room.scores,
      turnUserId: room.currentTurnUserId,
      userId: turnUserId
    });

    setTimeout(() => startBonusTurn(roomCode), 2000);
  }

  // Insert match log into DB
  const logId = 'log_' + Math.random().toString(36).substring(2, 10);
  const qNum = (room.currentQuestionIndex % room.questionsPerRound) + 1;
  tursoExecute(`
    INSERT INTO combat_match_logs (
      id, room_code, round_number, question_number_in_round, turn_type,
      question_id, asked_to_user_id, main_selected_option, main_is_correct,
      main_time_used, points_awarded, created_at
    ) VALUES (?, ?, ?, ?, 'main', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
  `, [
    logId, roomCode, room.currentRound, qNum,
    currentQ.id, turnUserId, selectedOption || 'TIMEOUT', isCorrect ? 1 : 0,
    timeUsed, JSON.stringify({ [turnUserId]: pointsAwarded })
  ]).catch(err => console.error('Error logging main match:', err));
}

function startBonusTurn(roomCode) {
  const room = activeCombatRooms.get(roomCode);
  if (!room) return;

  room.turnType = 'bonus';
  const currentTurnPlayer = room.players.find(p => p.userId === room.currentTurnUserId);

  if (room.mode === '2v1') {
    const bonusTeam = currentTurnPlayer.team === 'A' ? 'B' : 'A';
    room.bonusTeam = bonusTeam;
    const bonusPlayers = room.players.filter(p => p.team === bonusTeam);
    room.bonusUserId = bonusPlayers[0].userId;
    room.teamASelection = {};

    const timerDuration = (bonusTeam === 'A') ? 30 : 15;
    room.timeRemaining = timerDuration;
    room.turnStartTime = Date.now();
    room.timerDuration = timerDuration;

    io.to(roomCode).emit('triggerBonusTurn', {
      bonusUserId: room.bonusUserId,
      bonusTeam,
      timerDuration,
      message: `Bonus Chance! (${timerDuration}s)`
    });

    runServerTimer(room, timerDuration, () => {
      io.to(roomCode).emit('bonusAnswerResult', {
        isCorrect: false,
        correctOption: room.questionsPool[room.currentQuestionIndex].correct_option,
        pointsAwarded: 0,
        scores: room.scores,
        turnUserId: room.bonusUserId,
        userId: room.bonusUserId,
        message: 'Bonus Time Expired!'
      });
      setTimeout(() => advanceToNextTurn(roomCode), 2000);
    });
  } else {
    const opponent = room.players.find(p => p.userId !== room.currentTurnUserId);
    room.bonusUserId = opponent.userId;
    room.timeRemaining = 15;
    room.turnStartTime = Date.now();
    room.timerDuration = 15;

    io.to(roomCode).emit('triggerBonusTurn', {
      bonusUserId: opponent.userId,
      timerDuration: 15,
      message: 'Bonus Chance for Opponent! (15s)'
    });

    runServerTimer(room, 15, () => {
      io.to(roomCode).emit('bonusAnswerResult', {
        isCorrect: false,
        correctOption: room.questionsPool[room.currentQuestionIndex].correct_option,
        pointsAwarded: 0,
        scores: room.scores,
        turnUserId: room.bonusUserId,
        userId: room.bonusUserId,
        message: 'Bonus Time Expired!'
      });
      setTimeout(() => advanceToNextTurn(roomCode), 2000);
    });
  }
}

async function evaluateBonusAnswer(room, selectedOption, currentQ) {
  const roomCode = room.roomCode;
  clearInterval(room.timerInterval);

  const isCorrect = (selectedOption === currentQ.correct_option);
  const timeUsed = Math.min(15, Math.max(0, (Date.now() - (room.turnStartTime || Date.now())) / 1000));

  let pointsAwarded = 0;
  if (isCorrect) {
    pointsAwarded = 1;
  } else {
    pointsAwarded = -1;
  }

  if (room.mode === '2v1') {
    const bonusPlayers = room.players.filter(p => p.team === room.bonusTeam);
    bonusPlayers.forEach(p => {
      room.scores[p.userId] = Math.max(-10, (room.scores[p.userId] || 0) + pointsAwarded);
      room.roundScores[p.userId] = Math.max(-10, (room.roundScores[p.userId] || 0) + pointsAwarded);
    });
  } else {
    const bId = room.bonusUserId;
    room.scores[bId] = Math.max(-10, (room.scores[bId] || 0) + pointsAwarded);
    room.roundScores[bId] = Math.max(-10, (room.roundScores[bId] || 0) + pointsAwarded);
  }

  io.to(roomCode).emit('bonusAnswerResult', {
    isCorrect,
    selectedOption,
    correctOption: currentQ.correct_option,
    explanation: currentQ.explanation,
    pointsAwarded,
    scores: room.scores,
    turnUserId: room.bonusUserId,
    userId: room.bonusUserId
  });

  setTimeout(() => advanceToNextTurn(roomCode), 2500);

  // Insert bonus match log into DB
  const logId = 'log_' + Math.random().toString(36).substring(2, 10);
  const qNum = (room.currentQuestionIndex % room.questionsPerRound) + 1;
  tursoExecute(`
    INSERT INTO combat_match_logs (
      id, room_code, round_number, question_number_in_round, turn_type,
      question_id, bonus_to_user_id, bonus_selected_option, bonus_is_correct,
      bonus_time_used, points_awarded, created_at
    ) VALUES (?, ?, ?, ?, 'bonus', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
  `, [
    logId, roomCode, room.currentRound, qNum,
    currentQ.id, room.bonusUserId, selectedOption || 'TIMEOUT', isCorrect ? 1 : 0,
    timeUsed, JSON.stringify({ [room.bonusUserId]: pointsAwarded })
  ]).catch(err => console.error('Error logging bonus match:', err));
}

function advanceToNextTurn(roomCode) {
  const room = activeCombatRooms.get(roomCode);
  if (!room || room.status !== 'playing') return;

  room.turnType = 'main';
  room.teamASelection = {};

  if (room.mode === '2v1') {
    const currentTurnPlayer = room.players.find(p => p.userId === room.currentTurnUserId);
    if (currentTurnPlayer.team === 'A') {
      const playerB = room.players.find(p => p.team === 'B');
      room.currentTurnUserId = playerB.userId;
      room.currentQuestionIndex++;
    } else {
      const playerA = room.players.find(p => p.team === 'A');
      room.currentTurnUserId = playerA.userId;
      room.currentQuestionIndex++;
    }
  } else {
    const p1 = room.players[0].userId;
    const p2 = room.players[1].userId;
    if (room.currentTurnUserId === p1) {
      room.currentTurnUserId = p2;
      room.currentQuestionIndex++;
    } else {
      room.currentTurnUserId = p1;
      room.currentQuestionIndex++;
    }
  }

  const questionsPerRoundTotal = room.questionsPerRound;
  if (room.currentQuestionIndex >= room.currentRound * questionsPerRoundTotal) {
    handleRoundFinished(room);
  } else {
    sendNextQuestion(roomCode);
  }
}

function sendNextQuestion(roomCode) {
  const room = activeCombatRooms.get(roomCode);
  if (!room || room.status !== 'playing') return;

  const currentQ = room.questionsPool[room.currentQuestionIndex];
  if (!currentQ) {
    handleGameFinished(room);
    return;
  }

  const clientQ = prepareQuestionForClient(currentQ);
  room.timeRemaining = 30;
  room.turnStartTime = Date.now();
  room.timerDuration = 30;

  io.to(roomCode).emit('nextQuestion', {
    question: clientQ,
    questionNumber: (room.currentQuestionIndex % room.questionsPerRound) + 1,
    roundNumber: room.currentRound,
    totalRounds: room.totalRounds,
    questionsPerRound: room.questionsPerRound,
    turnUserId: room.currentTurnUserId,
    scores: room.scores,
    timerDuration: 30
  });

  runServerTimer(room, 30, () => {
    io.to(roomCode).emit('mainAnswerResult', {
      isCorrect: false,
      correctOption: currentQ.correct_option,
      pointsAwarded: 0,
      scores: room.scores,
      turnUserId: room.currentTurnUserId,
      userId: room.currentTurnUserId,
      message: 'Time Expired!'
    });
    setTimeout(() => startBonusTurn(roomCode), 2000);
  });
}

function runServerTimer(room, duration, onTimeout) {
  clearInterval(room.timerInterval);
  room.timeRemaining = duration;

  room.timerInterval = setInterval(() => {
    room.timeRemaining--;
    io.to(room.roomCode).emit('timerUpdate', { timeRemaining: room.timeRemaining });

    if (room.timeRemaining <= 0) {
      clearInterval(room.timerInterval);
      onTimeout();
    }
  }, 1000);
}

function handleRoundFinished(room) {
  clearInterval(room.timerInterval);
  room.status = 'round_break';

  let maxPoints = -1;
  let roundWinnerName = 'Draw';
  room.players.forEach(p => {
    const pts = room.roundScores[p.userId] || 0;
    if (pts > maxPoints) {
      maxPoints = pts;
      roundWinnerName = p.name;
    }
  });

  const roundStatsTable = room.players.map(p => ({
    userId: p.userId,
    name: p.name,
    pointsThisRound: room.roundScores[p.userId] || 0,
    totalPoints: room.scores[p.userId] || 0
  }));

  io.to(room.roomCode).emit('roundFinished', {
    roundNumber: room.currentRound,
    winnerName: roundWinnerName,
    statsTable: roundStatsTable,
    isFinalRound: (room.currentRound >= room.totalRounds)
  });

  room.players.forEach(p => { room.roundScores[p.userId] = 0; });

  if (room.currentRound >= room.totalRounds) {
    setTimeout(() => handleGameFinished(room), 4000);
  } else {
    setTimeout(() => {
      room.currentRound++;
      room.status = 'playing';
      sendNextQuestion(room.roomCode);
    }, 6000);
  }
}

async function handleGameFinished(room) {
  clearInterval(room.timerInterval);
  room.status = 'finished';

  let highestScore = -1;
  let winners = [];
  let isDraw = false;

  room.players.forEach(p => {
    const pts = room.scores[p.userId] || 0;
    if (pts > highestScore) {
      highestScore = pts;
      winners = [p];
    } else if (pts === highestScore) {
      winners.push(p);
    }
  });

  if (winners.length > 1) {
    isDraw = true;
  }

  const winnerUserId = isDraw ? null : winners[0].userId;
  const loserUserId = isDraw ? null : room.players.find(p => p.userId !== winnerUserId)?.userId;

  const coinsAwarded = {};
  if (isDraw) {
    room.players.forEach(p => { coinsAwarded[p.userId] = 25; });
  } else {
    room.players.forEach(p => {
      coinsAwarded[p.userId] = (p.userId === winnerUserId) ? 50 : 0;
    });
  }

  for (const p of room.players) {
    const pts = room.scores[p.userId] || 0;
    const coins = coinsAwarded[p.userId] || 0;
    const isWin = (p.userId === winnerUserId);
    const isLoss = (p.userId === loserUserId);

    await updateUserCombatStatsAndCoins(p.userId, p.matricNo, p.name, room.courseId, room.topicId, isWin, isLoss, isDraw, pts, coins);
  }

  await tursoExecute(`
    INSERT INTO combat_final_results (
      id, room_code, players, winner_user_id, loser_user_id, is_draw,
      final_scores, topic_id, total_questions, coins_awarded, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
  `, [
    `res_${Math.random().toString(36).substring(2, 10)}`,
    room.roomCode, JSON.stringify(room.players.map(p => p.userId)), winnerUserId, loserUserId,
    isDraw ? 1 : 0, JSON.stringify(room.scores), room.topicId, room.totalQuestions, JSON.stringify(coinsAwarded)
  ]);

  await tursoExecute("UPDATE combat_rooms SET status = 'finished' WHERE room_code = ?;", [room.roomCode]);

  io.to(room.roomCode).emit('gameFinished', {
    winnerUserId,
    winnerName: isDraw ? 'Draw' : winners[0].name,
    isDraw,
    finalScores: room.scores,
    coinsAwarded
  });

  io.emit('adminRoomUpdate', { roomCode: room.roomCode, room });
}

async function handleForfeitGame(room, forfeitedUserId) {
  clearInterval(room.timerInterval);
  room.status = 'finished';

  const forfeitedPlayer = room.players.find(p => p.userId === forfeitedUserId);
  const remainingPlayers = room.players.filter(p => p.userId !== forfeitedUserId);

  const winner = remainingPlayers[0];
  const coinsAwarded = {
    [forfeitedPlayer.userId]: 0,
    [winner.userId]: 25
  };

  await tursoExecute(`
    UPDATE user_combat_stats
    SET wins_for_rank = MAX(0, wins_for_rank - 4),
        total_points = MAX(0, total_points - 4),
        losses = losses + 1,
        total_matches = total_matches + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?;
  `, [forfeitedUserId]);

  await updateUserCombatStatsAndCoins(winner.userId, winner.matricNo, winner.name, room.courseId, room.topicId, true, false, false, room.scores[winner.userId] || 0, 25);

  await tursoExecute("UPDATE combat_rooms SET status = 'terminated' WHERE room_code = ?;", [room.roomCode]);

  io.to(room.roomCode).emit('gameFinished', {
    winnerUserId: winner.userId,
    winnerName: winner.name,
    isDraw: false,
    finalScores: room.scores,
    coinsAwarded,
    message: `${forfeitedPlayer.name} forfeited. ${winner.name} wins!`
  });
}

async function getUserCombatStats(userId, matricNo, name) {
  const rows = await tursoQuery("SELECT * FROM user_combat_stats WHERE user_id = ? LIMIT 1;", [userId]);
  if (rows.length > 0) return rows[0];

  const defaultRank = COMBAT_RANKS[0].name;
  await tursoExecute(`
    INSERT INTO user_combat_stats (
      user_id, matric_no, student_name, total_matches, wins, losses, draws,
      total_points, combat_coins, current_rank, wins_for_rank, updated_at
    ) VALUES (?, ?, ?, 0, 0, 0, 0, 0, 0, ?, 0, CURRENT_TIMESTAMP);
  `, [userId, matricNo, name, defaultRank]);

  return {
    user_id: userId,
    matric_no: matricNo,
    student_name: name,
    total_matches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    total_points: 0,
    combat_coins: 0,
    current_rank: defaultRank,
    wins_for_rank: 0
  };
}

async function updateUserCombatStatsAndCoins(userId, matricNo, name, courseId, topicId, isWin, isLoss, isDraw, pointsEarned, coinsEarned) {
  const stats = await getUserCombatStats(userId, matricNo, name);

  const newWins = stats.wins + (isWin ? 1 : 0);
  const newLosses = stats.losses + (isLoss ? 1 : 0);
  const newDraws = stats.draws + (isDraw ? 1 : 0);
  const newMatches = stats.total_matches + 1;
  const newPoints = stats.total_points + pointsEarned;
  const newCoins = stats.combat_coins + coinsEarned;

  const newRankObj = calculateRank(newWins);
  const isRankUp = (newRankObj.name !== stats.current_rank);

  await tursoExecute(`
    UPDATE user_combat_stats
    SET total_matches = ?, wins = ?, losses = ?, draws = ?, total_points = ?,
        combat_coins = ?, current_rank = ?, wins_for_rank = ?, favorite_topic_id = ?,
        last_match_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?;
  `, [newMatches, newWins, newLosses, newDraws, newPoints, newCoins, newRankObj.name, newWins, topicId, userId]);

  if (coinsEarned > 0 && courseId) {
    await tursoExecute(`
      INSERT INTO student_course_coins (id, student_id, course_id, coins_balance, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(student_id, course_id) DO UPDATE SET
        coins_balance = coins_balance + excluded.coins_balance,
        updated_at = CURRENT_TIMESTAMP;
    `, [`coin_${Math.random().toString(36).substring(2, 10)}`, userId, courseId, coinsEarned]);
  }

  return { isRankUp, newRank: newRankObj.name };
}

server.listen(PORT, () => {
  console.log(`======================================================================`);
  console.log(`  STUDY COMBAT & APEX ADMIN ENGINE (100% TURSO CLOUD + SOCKET.IO)`);
  console.log(`======================================================================`);
  console.log(`  Running on Port: ${PORT}`);
  console.log(`  Socket.io Endpoint: ws://localhost:${PORT}`);
  console.log(`======================================================================`);
});
