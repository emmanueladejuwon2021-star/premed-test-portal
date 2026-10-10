/**
 * Premed Test Portal - Local Admin Control Center Server
 * Zero-dependency native Node.js server using built-in node:http & node:sqlite
 * Runs strictly on Localhost (127.0.0.1) for complete private administrative control.
 */

const http = require('node:http');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const { exec } = require('node:child_process');

const PORT = 8080;
const DB_PATH = path.join(__dirname, 'premed_portal.sqlite');
const GIT_PATH = 'C:\\tools\\mingit\\cmd\\git.exe';

let db;
try {
  db = new DatabaseSync(DB_PATH);
} catch (e) {
  console.error('[DB ERROR]', e.message);
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const params = new URLSearchParams(body);
        const data = {};
        for (const [k, v] of params.entries()) { data[k] = v; }
        resolve(data);
      } catch {
        resolve({});
      }
    });
  });
}

function renderHtml(tab = 'deployments', alert = null) {
  const totalQuestions = db.prepare('SELECT COUNT(*) as c FROM questions').get().c;
  const totalStudents = db.prepare('SELECT COUNT(*) as c FROM students').get().c;
  const totalResults = db.prepare('SELECT COUNT(*) as c FROM results').get().c;
  const totalCourses = db.prepare('SELECT COUNT(*) as c FROM courses').get().c;

  const courses = db.prepare(`
    SELECT c.*, COUNT(q.id) as q_count 
    FROM courses c
    LEFT JOIN topics t ON c.id = t.course_id
    LEFT JOIN questions q ON t.id = q.topic_id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `).all();

  const recentQuestions = db.prepare(`
    SELECT q.*, c.code as course_code 
    FROM questions q
    JOIN topics t ON q.topic_id = t.id
    JOIN courses c ON t.course_id = c.id
    ORDER BY q.created_at DESC
    LIMIT 30
  `).all();

  const submissions = db.prepare(`
    SELECT r.*, s.name as student_name, s.matric_no, c.code as course_code
    FROM results r
    JOIN students s ON r.student_id = s.id
    JOIN courses c ON r.course_id = c.id
    ORDER BY r.created_at DESC
    LIMIT 50
  `).all();

  const students = db.prepare(`
    SELECT s.*, COUNT(r.id) as tests_count
    FROM students s
    LEFT JOIN results r ON s.id = r.student_id
    GROUP BY s.id
    ORDER BY s.created_at DESC
    LIMIT 50
  `).all();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Premed Local Admin Control Center</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    body { font-family: 'Inter', sans-serif; }
  </style>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
    
    <!-- Top Local Control Header -->
    <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-slate-800">
      <div>
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 mb-3">
          <i data-lucide="shield-check" class="w-3.5 h-3.5 text-emerald-400"></i>
          <span>Local Admin Control Center (Offline & PC-Isolated)</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight">Master Examination Console</h1>
        <p class="text-slate-400 text-xs mt-1 max-w-xl">You have full local control over your CBT question banks, mock exams, and test locks. Click the sync button anytime to push your updates live to the cloud.</p>
      </div>

      <form method="POST" action="/sync">
        <button type="submit" class="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-black text-xs shadow-lg shadow-indigo-900/50 flex items-center gap-2.5 transition-all">
          <i data-lucide="cloud-upload" class="w-4 h-4 text-white"></i>
          <span>Push Updates to Live Website</span>
        </button>
      </form>
    </div>

    ${alert ? `
    <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
      <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i>
      <span>${alert}</span>
    </div>
    ` : ''}

    <!-- Metrics -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <span class="text-xs font-bold uppercase text-slate-400 block mb-1">Total Questions</span>
        <span class="text-3xl font-black text-indigo-600">${totalQuestions}</span>
      </div>
      <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <span class="text-xs font-bold uppercase text-slate-400 block mb-1">Registered Students</span>
        <span class="text-3xl font-black text-emerald-600">${totalStudents}</span>
      </div>
      <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <span class="text-xs font-bold uppercase text-slate-400 block mb-1">Test Submissions</span>
        <span class="text-3xl font-black text-violet-600">${totalResults}</span>
      </div>
      <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <span class="text-xs font-bold uppercase text-slate-400 block mb-1">Courses</span>
        <span class="text-3xl font-black text-amber-600">${totalCourses}</span>
      </div>
    </div>

    <!-- Tab Bar -->
    <div class="flex border-b border-slate-200 space-x-6 text-xs font-bold">
      <a href="/?tab=deployments" class="pb-3 border-b-2 ${tab === 'deployments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}">
        Assessments & Course Deployments
      </a>
      <a href="/?tab=questions" class="pb-3 border-b-2 ${tab === 'questions' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}">
        Question Bank Creator & Manager
      </a>
      <a href="/?tab=results" class="pb-3 border-b-2 ${tab === 'results' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}">
        Student Submissions
      </a>
      <a href="/?tab=students" class="pb-3 border-b-2 ${tab === 'students' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}">
        Registered Candidates
      </a>
    </div>

    <!-- TAB 1: DEPLOYMENTS -->
    ${tab === 'deployments' ? `
    <div class="space-y-6">
      <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <h3 class="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
          <i data-lucide="plus-circle" class="w-4 h-4 text-indigo-600"></i> Add New Mock Assessment
        </h3>
        <form method="POST" action="/action/add_course" class="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Course Code</label>
            <input type="text" name="code" required placeholder="e.g. ZOO 102" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono uppercase">
          </div>
          <div class="sm:col-span-2">
            <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Course Title</label>
            <input type="text" name="title" required placeholder="e.g. Introductory Zoology" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs">
          </div>
          <div class="flex items-end">
            <button type="submit" class="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100">
              Create Course
            </button>
          </div>
        </form>
      </div>

      <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 class="text-base font-bold text-slate-900">Current Exam Deployments</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 border-b border-slate-200 uppercase font-bold text-slate-500">
              <tr>
                <th class="px-6 py-3">Code</th>
                <th class="px-6 py-3">Title</th>
                <th class="px-6 py-3 text-center">Questions</th>
                <th class="px-6 py-3 text-center">Status</th>
                <th class="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${courses.map(c => `
              <tr class="hover:bg-slate-50/70">
                <td class="px-6 py-3 font-mono font-bold text-indigo-700">${c.code}</td>
                <td class="px-6 py-3 font-semibold text-slate-800">${c.title}</td>
                <td class="px-6 py-3 text-center font-bold text-slate-600">${c.q_count} Qs</td>
                <td class="px-6 py-3 text-center">
                  ${c.is_locked ? '<span class="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]">Locked</span>' : '<span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">Active (Unlocked)</span>'}
                </td>
                <td class="px-6 py-3 text-right">
                  <form method="POST" action="/action/toggle_lock" class="inline">
                    <input type="hidden" name="course_id" value="${c.id}">
                    <input type="hidden" name="current_locked" value="${c.is_locked}">
                    <button type="submit" class="px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${c.is_locked ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'}">
                      ${c.is_locked ? 'Unlock for Students' : 'Lock Assessment'}
                    </button>
                  </form>
                </td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    ` : ''}

    <!-- TAB 2: QUESTION BANK -->
    ${tab === 'questions' ? `
    <div class="space-y-6">
      <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <h3 class="text-sm font-black text-slate-900 flex items-center gap-2">
          <i data-lucide="edit-3" class="w-4 h-4 text-indigo-600"></i> Add Question to Bank
        </h3>
        <form method="POST" action="/action/add_question" class="space-y-4">
          <div>
            <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Target Subject</label>
            <select name="course_id" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white">
              ${courses.map(c => `<option value="${c.id}">${c.code} - ${c.title}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Question Prompt</label>
            <textarea name="text" required rows="3" placeholder="Enter clinical or scientific question text..." class="w-full p-3 rounded-xl border border-slate-200 text-xs"></textarea>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Option A</label>
              <input type="text" name="a" required placeholder="Option A text" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Option B</label>
              <input type="text" name="b" required placeholder="Option B text" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Option C</label>
              <input type="text" name="c" placeholder="Option C text" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Option D</label>
              <input type="text" name="d" placeholder="Option D text" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs">
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Correct Answer</label>
              <select name="correct_option" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-bold text-indigo-700">
                <option value="A">Option A</option>
                <option value="B">Option B</option>
                <option value="C">Option C</option>
                <option value="D">Option D</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Explanation</label>
              <input type="text" name="explanation" placeholder="Clinical explanation..." class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs">
            </div>
          </div>
          <button type="submit" class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 flex items-center gap-2">
            <i data-lucide="check" class="w-4 h-4"></i>
            <span>Save Question to Bank</span>
          </button>
        </form>
      </div>

      <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 class="text-base font-bold text-slate-900">Recently Added Questions (${recentQuestions.length})</h2>
        <div class="divide-y divide-slate-100">
          ${recentQuestions.length === 0 ? '<div class="py-8 text-center text-slate-400 text-xs">No questions yet. Add one above!</div>' : ''}
          ${recentQuestions.map(rq => `
          <div class="py-4 flex justify-between items-start gap-4">
            <div class="space-y-1">
              <span class="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px]">${rq.course_code}</span>
              <p class="text-xs font-medium text-slate-800">${rq.text}</p>
              <p class="text-[11px] text-emerald-700 font-bold">Answer: Option ${rq.correct_option}</p>
            </div>
            <form method="POST" action="/action/delete_question">
              <input type="hidden" name="question_id" value="${rq.id}">
              <button type="submit" onclick="return confirm('Delete this question?')" class="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </form>
          </div>
          `).join('')}
        </div>
      </div>
    </div>
    ` : ''}

    <!-- TAB 3: SUBMISSIONS -->
    ${tab === 'results' ? `
    <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
      <h2 class="text-base font-bold text-slate-900">Student Test Submissions</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 border-b border-slate-200 uppercase font-bold text-slate-500">
            <tr>
              <th class="px-6 py-3">Candidate</th>
              <th class="px-6 py-3">Matric No</th>
              <th class="px-6 py-3">Course</th>
              <th class="px-6 py-3 text-center">Score</th>
              <th class="px-6 py-3 text-center">Percentage</th>
              <th class="px-6 py-3 text-center">Grade</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${submissions.length === 0 ? '<tr><td colspan="6" class="py-8 text-center text-slate-400">No test submissions yet.</td></tr>' : ''}
            ${submissions.map(sub => `
            <tr class="hover:bg-slate-50/70">
              <td class="px-6 py-3 font-bold text-slate-900">${sub.student_name}</td>
              <td class="px-6 py-3 font-mono text-slate-500">${sub.matric_no}</td>
              <td class="px-6 py-3 font-semibold text-slate-700">${sub.course_code}</td>
              <td class="px-6 py-3 text-center font-bold text-slate-900">${sub.total_score} / ${sub.total_questions}</td>
              <td class="px-6 py-3 text-center font-extrabold text-indigo-600">${sub.percentage}%</td>
              <td class="px-6 py-3 text-center">
                <span class="px-2 py-0.5 rounded-full font-black ${sub.grade === 'A' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}">
                  ${sub.grade}
                </span>
              </td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
    ` : ''}

    <!-- TAB 4: STUDENTS -->
    ${tab === 'students' ? `
    <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
      <h2 class="text-base font-bold text-slate-900">Registered Students Directory</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 border-b border-slate-200 uppercase font-bold text-slate-500">
            <tr>
              <th class="px-6 py-3">Name</th>
              <th class="px-6 py-3">Matric No</th>
              <th class="px-6 py-3">Department</th>
              <th class="px-6 py-3">Phone</th>
              <th class="px-6 py-3 text-center">Tests Completed</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${students.length === 0 ? '<tr><td colspan="5" class="py-8 text-center text-slate-400">No registered students yet.</td></tr>' : ''}
            ${students.map(st => `
            <tr class="hover:bg-slate-50/70">
              <td class="px-6 py-3 font-bold text-slate-900">${st.name}</td>
              <td class="px-6 py-3 font-mono text-slate-500">${st.matric_no}</td>
              <td class="px-6 py-3 text-slate-700 font-medium">${st.department}</td>
              <td class="px-6 py-3 text-slate-500">${st.phone || '—'}</td>
              <td class="px-6 py-3 text-center font-bold text-indigo-600">${st.tests_count}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
    ` : ''}

  </div>
  <script>lucide.createIcons();</script>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  const host = req.headers.host || 'localhost:8080';
  const url = new URL(req.url, 'http://' + host);
  const pathname = url.pathname;

  // Actions
  if (req.method === 'POST') {
    const data = await parseBody(req);

    if (pathname === '/action/toggle_lock') {
      const cid = data.course_id;
      const current = parseInt(data.current_locked, 10) || 0;
      const next = current ? 0 : 1;
      db.prepare('UPDATE courses SET is_locked = ? WHERE id = ?').run(next, cid);
      res.writeHead(302, { Location: '/?tab=deployments' });
      return res.end();
    }

    if (pathname === '/action/add_course') {
      const code = (data.code || '').trim().toUpperCase();
      const title = (data.title || '').trim();
      if (code && title) {
        const cid = 'course_' + code.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Date.now();
        db.prepare('INSERT INTO courses (id, code, title, duration, question_limit, is_mock, is_locked) VALUES (?, ?, ?, 30, 20, 1, 0)').run(cid, code, title);
        const tid = 'topic_' + Math.random().toString(36).substring(2, 10);
        db.prepare('INSERT INTO topics (id, course_id, name) VALUES (?, ?, "General Curriculum")').run(tid, cid);
      }
      res.writeHead(302, { Location: '/?tab=deployments' });
      return res.end();
    }

    if (pathname === '/action/add_question') {
      const courseId = data.course_id;
      const text = (data.text || '').trim();
      const optA = (data.a || '').trim();
      const optB = (data.b || '').trim();
      const optC = (data.c || '').trim();
      const optD = (data.d || '').trim();
      const correct = (data.correct_option || 'A').trim().toUpperCase();
      const explanation = (data.explanation || '').trim();

      if (text && optA && optB) {
        let topic = db.prepare('SELECT id FROM topics WHERE course_id = ? LIMIT 1').get(courseId);
        let topicId = topic ? topic.id : null;
        if (!topicId) {
          topicId = 'topic_' + Math.random().toString(36).substring(2, 10);
          db.prepare('INSERT INTO topics (id, course_id, name) VALUES (?, ?, "General Curriculum")').run(topicId, courseId);
        }
        const qid = 'q_' + Math.random().toString(36).substring(2, 12);
        db.prepare('INSERT INTO questions (id, topic_id, text, a, b, c, d, correct_option, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(qid, topicId, text, optA, optB, optC, optD, correct, explanation);
      }
      res.writeHead(302, { Location: '/?tab=questions' });
      return res.end();
    }

    if (pathname === '/action/delete_question') {
      const qid = data.question_id;
      if (qid) {
        db.prepare('DELETE FROM questions WHERE id = ?').run(qid);
      }
      res.writeHead(302, { Location: '/?tab=questions' });
      return res.end();
    }

    if (pathname === '/sync') {
      const cmd = '"' + GIT_PATH + '" add premed_portal.sqlite && "' + GIT_PATH + '" commit -m "Admin sync: update questions and portal database" && "' + GIT_PATH + '" -c credential.helper="" -c http.sslVerify=false push origin main';
      exec(cmd, { cwd: __dirname }, (err, stdout, stderr) => {
        const msg = err ? ('Sync issue: ' + (stderr || err.message)) : 'Database successfully synced to GitHub & Vercel! Live website will refresh within 15 seconds.';
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(renderHtml('deployments', msg));
      });
      return;
    }
  }

  // GET requests
  const tab = url.searchParams.get('tab') || 'deployments';
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(renderHtml(tab));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Premed Local Admin Server active on http://localhost:' + PORT);
});
