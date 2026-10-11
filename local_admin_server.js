/**
 * Premed Test Portal - School Admin Command Center
 * 100% In-Sync Live Examination & Anti-Cheating Monitor
 * 
 * Features:
 *  - 2-Way Real-Time Live Sync with Student Portal
 *  - Live Test Radar (Who is writing an exam right now)
 *  - Cheating Radar (Real-time tab switch & screen exit detector with exact timestamps)
 *  - Real-time test scores, percentages, and grade cards
 *  - Invalidate Cheated Tests & Allow Retakes controls
 *  - Compact, friendly UI without technical jargon
 */

const http = require('node:http');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const { exec } = require('node:child_process');

const PORT = 8899;
const DB_PATH = path.join(__dirname, 'premed_portal.sqlite');
const GIT_PATH = 'C:\\tools\\mingit\\cmd\\git.exe';

let db;
try {
  db = new DatabaseSync(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_name TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS exam_sessions (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      matric_no TEXT NOT NULL,
      student_name TEXT NOT NULL,
      course_id TEXT NOT NULL,
      course_code TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
      tab_switches INTEGER DEFAULT 0,
      cheating_log TEXT,
      total_score INTEGER DEFAULT 0,
      total_questions INTEGER DEFAULT 0,
      percentage REAL DEFAULT 0,
      grade TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS tests (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      course_id TEXT NOT NULL,
      topic_ids TEXT DEFAULT '["ALL"]',
      duration INTEGER DEFAULT 30,
      question_limit INTEGER DEFAULT 20,
      attempts_allowed INTEGER DEFAULT 1,
      is_live INTEGER DEFAULT 1,
      auto_submit INTEGER DEFAULT 1,
      enforce_fullscreen INTEGER DEFAULT 1,
      max_tab_switches INTEGER DEFAULT 3,
      shuffle_questions INTEGER DEFAULT 1,
      shuffle_options INTEGER DEFAULT 1,
      calculator_allowed INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    const testCount = db.prepare('SELECT COUNT(*) as c FROM tests').get().c;
    if (testCount === 0) {
      const phyCourse = db.prepare("SELECT id FROM courses WHERE code = 'PHY 101' LIMIT 1").get();
      if (phyCourse) {
        db.prepare(`
          INSERT INTO tests (id, title, course_id, topic_ids, duration, question_limit, attempts_allowed, is_live, auto_submit, enforce_fullscreen, max_tab_switches, shuffle_questions, shuffle_options, calculator_allowed)
          VALUES ('test_phy101_general', 'PHY 101 - General Physics Comprehensive Mock Exam', ?, '["ALL"]', 30, 20, 1, 1, 1, 1, 3, 1, 1, 1)
        `).run(phyCourse.id);
      }
    }
  } catch (seedErr) {
    console.error('[TEST SEED NOTICE]', seedErr.message);
  }

  const cols = db.prepare('PRAGMA table_info(results)').all().map(c => c.name);
  if (!cols.includes('tab_switches')) db.exec('ALTER TABLE results ADD COLUMN tab_switches INTEGER DEFAULT 0;');
  if (!cols.includes('is_flagged_cheating')) db.exec('ALTER TABLE results ADD COLUMN is_flagged_cheating INTEGER DEFAULT 0;');
  if (!cols.includes('cheating_log')) db.exec('ALTER TABLE results ADD COLUMN cheating_log TEXT;');
  if (!cols.includes('time_spent')) db.exec('ALTER TABLE results ADD COLUMN time_spent INTEGER DEFAULT 0;');
} catch (e) {
  console.error('[DB ERROR]', e.message);
}

const DEPARTMENTS = [
  'Medicine & Surgery',
  'Dentistry',
  'Physiotherapy',
  'Nursing',
  'NACON Nursing',
  'Pharmacology',
  'Pharmacy',
  'Medical Laboratory Science',
  'Physiology',
  'Anatomy'
];

function getSetting(key, def = '1') {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key_name = ? LIMIT 1').get(key);
    return row ? row.value : def;
  } catch {
    return def;
  }
}

function setSetting(key, val) {
  try {
    db.prepare('INSERT INTO settings (key_name, value) VALUES (?, ?) ON CONFLICT(key_name) DO UPDATE SET value = excluded.value').run(key, String(val));
  } catch (e) {
    console.error('[SETTING ERROR]', e.message);
  }
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const params = new URLSearchParams(body);
        const data = {};
        for (const k of params.keys()) {
          const vals = params.getAll(k);
          data[k] = vals.length > 1 ? vals : vals[0];
        }
        resolve(data);
      } catch {
        resolve({});
      }
    });
  });
}

function fetchHttpJson(urlStr) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(urlStr);
      const mod = u.protocol === 'https:' ? require('node:https') : require('node:http');
      const req = mod.get(urlStr, { timeout: 8000 }, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('Invalid response from website'));
          }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Connection timed out')); });
    } catch (e) {
      reject(e);
    }
  });
}

const { renderHtml: renderTemplate } = require('./admin_ui_template.js');

function renderHtml(tab = 'home', alert = null, alertType = 'success', editCourseId = null, editQuestionId = null) {
  return renderTemplate(tab, alert, alertType, editCourseId, editQuestionId, db, DEPARTMENTS, getSetting);
}

function old_renderHtml(tab = 'home', alert = null, alertType = 'success', editCourseId = null, editQuestionId = null) {
  const totalQuestions = db.prepare('SELECT COUNT(*) as c FROM questions').get().c;
  const totalStudents = db.prepare('SELECT COUNT(*) as c FROM students').get().c;
  const totalResults = db.prepare('SELECT COUNT(*) as c FROM results').get().c;
  const totalCourses = db.prepare('SELECT COUNT(*) as c FROM courses').get().c;
  const activeExams = db.prepare('SELECT COUNT(*) as c FROM courses WHERE is_locked = 0').get().c;
  const activeSessionsCount = db.prepare("SELECT COUNT(*) as c FROM exam_sessions WHERE status = 'IN_PROGRESS'").get().c;
  const cheatedSessionsCount = db.prepare("SELECT COUNT(*) as c FROM exam_sessions WHERE status = 'TERMINATED_FOR_CHEATING' OR tab_switches >= 3").get().c;

  const allTopics = db.prepare(`
    SELECT t.*, c.code as course_code, c.title as course_title,
           (SELECT COUNT(*) FROM questions q WHERE q.topic_id = t.id) as q_count
    FROM topics t
    JOIN courses c ON t.course_id = c.id
    ORDER BY c.code ASC, t.id ASC
  `).all();

  const courses = db.prepare(`
    SELECT c.*, 
           COUNT(DISTINCT t.id) as topic_count,
           COUNT(q.id) as q_count 
    FROM courses c
    LEFT JOIN topics t ON c.id = t.course_id
    LEFT JOIN questions q ON t.id = q.topic_id
    GROUP BY c.id
    ORDER BY c.code ASC
  `).all();

  const questions = db.prepare(`
    SELECT q.*, t.name as topic_name, c.id as course_id, c.code as course_code, c.title as course_title 
    FROM questions q
    JOIN topics t ON q.topic_id = t.id
    JOIN courses c ON t.course_id = c.id
    ORDER BY q.created_at DESC
    LIMIT 250
  `).all();

  const examSessions = db.prepare(`
    SELECT * FROM exam_sessions 
    ORDER BY updated_at DESC 
    LIMIT 50
  `).all();

  const submissions = db.prepare(`
    SELECT r.*, s.name as student_name, s.matric_no, c.code as course_code
    FROM results r
    JOIN students s ON r.student_id = s.id
    JOIN courses c ON r.course_id = c.id
    ORDER BY r.created_at DESC
    LIMIT 40
  `).all();

  const students = db.prepare(`
    SELECT s.*, COUNT(r.id) as tests_count
    FROM students s
    LEFT JOIN results r ON s.id = r.student_id
    GROUP BY s.id
    ORDER BY s.created_at DESC
    LIMIT 60
  `).all();

  let courseToEdit = null;
  if (editCourseId) {
    courseToEdit = db.prepare('SELECT * FROM courses WHERE id = ? LIMIT 1').get(editCourseId);
  }

  let questionToEdit = null;
  if (editQuestionId) {
    questionToEdit = db.prepare(`
      SELECT q.*, q.topic_id, t.name as topic_name, c.id as course_id, c.code as course_code 
      FROM questions q 
      JOIN topics t ON q.topic_id = t.id 
      JOIN courses c ON t.course_id = c.id 
      WHERE q.id = ? LIMIT 1
    `).get(editQuestionId);
  }

  // Rules & Settings
  const antiCheatBlur = getSetting('anti_cheat_blur', '1') === '1';
  const enforceFullscreen = getSetting('enforce_fullscreen', '1') === '1';
  const shuffleQuestions = getSetting('shuffle_questions', '1') === '1';
  const shuffleOptions = getSetting('shuffle_options', '1') === '1';
  const calculatorAllowed = getSetting('calculator_allowed', '1') === '1';
  const watermarkEnabled = getSetting('watermark_enabled', '1') === '1';
  const disableCopyPaste = getSetting('disable_copy_paste', '1') === '1';
  const maxTabSwitches = getSetting('max_tab_switches', '3');

  const autoSubmitExpiry = getSetting('auto_submit_expiry', '1') === '1';
  const showInstantResults = getSetting('show_instant_results', '1') === '1';
  const allowReviewExplanations = getSetting('allow_review_explanations', '1') === '1';
  const allowFlagQuestions = getSetting('allow_flag_questions', '1') === '1';
  const liveWebsiteUrl = getSetting('live_website_url', 'https://premed-test-portal.vercel.app');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>Premed Admin Control Panel</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    body { font-family: 'Inter', sans-serif; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen flex flex-col antialiased">

  <!-- ================= HEADER ================= -->
  <header class="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
    <div class="max-w-6xl mx-auto px-3 sm:px-6">
      <div class="flex items-center justify-between h-14 sm:h-16 gap-2">
        
        <!-- Logo -->
        <div class="flex items-center gap-2.5 shrink-0">
          <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <i data-lucide="graduation-cap" class="w-4 h-4 sm:w-5 sm:h-5"></i>
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              <span class="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">Premed<span class="text-indigo-600">Admin</span></span>
              <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" title="Live Sync Active"></span>
            </div>
            <p class="text-[10px] text-slate-400 font-medium hidden sm:block">Exam & Student Radar</p>
          </div>
        </div>

        <!-- Desktop Navigation Tabs -->
        <nav class="hidden md:flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600">
          <a href="/?tab=home" class="px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${tab === 'home' ? 'bg-white text-indigo-700 font-bold shadow-xs' : 'hover:text-slate-900'}">
            <i data-lucide="layout-dashboard" class="w-3.5 h-3.5"></i>
            <span>Home</span>
          </a>
          <a href="/?tab=courses" class="px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${tab === 'courses' ? 'bg-white text-indigo-700 font-bold shadow-xs' : 'hover:text-slate-900'}">
            <i data-lucide="book-open" class="w-3.5 h-3.5"></i>
            <span>Courses</span>
          </a>
          <a href="/?tab=tests" class="px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${tab === 'tests' ? 'bg-white text-indigo-700 font-bold shadow-xs' : 'hover:text-slate-900'}">
            <i data-lucide="play" class="w-3.5 h-3.5"></i>
            <span>Exams</span>
          </a>
          <a href="/?tab=questions" class="px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${tab === 'questions' ? 'bg-white text-indigo-700 font-bold shadow-xs' : 'hover:text-slate-900'}">
            <i data-lucide="help-circle" class="w-3.5 h-3.5"></i>
            <span>Questions</span>
          </a>
          <a href="/?tab=security" class="px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${tab === 'security' ? 'bg-white text-indigo-700 font-bold shadow-xs' : 'hover:text-slate-900'}">
            <i data-lucide="shield" class="w-3.5 h-3.5"></i>
            <span>Exam Rules</span>
          </a>
          <a href="/?tab=candidates" class="px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${tab === 'candidates' ? 'bg-white text-indigo-700 font-bold shadow-xs' : 'hover:text-slate-900'}">
            <i data-lucide="users" class="w-3.5 h-3.5"></i>
            <span>Students & Scores</span>
          </a>
        </nav>

        <!-- Right Header Action -->
        <div class="flex items-center gap-1.5 sm:gap-2">
          <form method="POST" action="/action/pull_live_students">
            <button type="submit" class="p-1.5 sm:px-3 sm:py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1 transition-colors" title="Download latest students & results">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-emerald-600"></i>
              <span class="hidden sm:inline">Sync Live</span>
            </button>
          </form>

          <form method="POST" action="/sync" id="topSyncForm">
            <button type="submit" id="topSyncBtn" class="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer">
              <i data-lucide="upload-cloud" class="w-3.5 h-3.5"></i>
              <span>Publish</span>
            </button>
          </form>
        </div>

      </div>
    </div>

    <!-- Mobile Navigation Bar -->
    <div class="md:hidden flex overflow-x-auto no-scrollbar px-3 py-1.5 border-t border-slate-100 gap-1 bg-slate-50 text-xs font-semibold text-slate-600">
      <a href="/?tab=home" class="px-2.5 py-1 rounded-lg shrink-0 ${tab === 'home' ? 'bg-white text-indigo-700 font-bold shadow-xs' : ''}">Home</a>
      <a href="/?tab=courses" class="px-2.5 py-1 rounded-lg shrink-0 ${tab === 'courses' ? 'bg-white text-indigo-700 font-bold shadow-xs' : ''}">Courses</a>
      <a href="/?tab=tests" class="px-2.5 py-1 rounded-lg shrink-0 ${tab === 'tests' ? 'bg-white text-indigo-700 font-bold shadow-xs' : ''}">Exams</a>
      <a href="/?tab=questions" class="px-2.5 py-1 rounded-lg shrink-0 ${tab === 'questions' ? 'bg-white text-indigo-700 font-bold shadow-xs' : ''}">Questions</a>
      <a href="/?tab=security" class="px-2.5 py-1 rounded-lg shrink-0 ${tab === 'security' ? 'bg-white text-indigo-700 font-bold shadow-xs' : ''}">Rules</a>
      <a href="/?tab=candidates" class="px-2.5 py-1 rounded-lg shrink-0 ${tab === 'candidates' ? 'bg-white text-indigo-700 font-bold shadow-xs' : ''}">Students</a>
    </div>
  </header>

  <!-- ================= MAIN CONTENT ================= -->
  <main class="flex-grow max-w-6xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

    <!-- Alert Banner -->
    ${alert ? `
    <div class="p-3 sm:p-4 rounded-xl ${alertType === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'} border flex items-center justify-between gap-3 text-xs font-semibold">
      <div class="flex items-center gap-2">
        <i data-lucide="${alertType === 'success' ? 'check-circle' : 'alert-circle'}" class="w-4 h-4 shrink-0"></i>
        <span>${alert}</span>
      </div>
      <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-4 h-4"></i></button>
    </div>
    ` : ''}

    <!-- ================= TAB 1: HOME ================= -->
    ${tab === 'home' ? `
    <div class="space-y-4 sm:space-y-5">
      
      <!-- Welcome & Status Banner -->
      <div class="rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div class="space-y-1 max-w-xl">
          <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live Sync Engine Active</span>
          </div>
          <h1 class="text-base sm:text-xl font-bold tracking-tight">Portal & Exam Radar</h1>
          <p class="text-xs text-slate-300 leading-relaxed">
            All student test attempts, tab switches, and results synchronize directly with this dashboard.
          </p>
        </div>

        <div class="flex flex-wrap gap-2 w-full sm:w-auto">
          <form method="POST" action="/action/pull_live_students">
            <button type="submit" class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold text-center shadow-sm flex items-center justify-center gap-1.5 transition-all">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
              <span>Download Live Activity</span>
            </button>
          </form>
          <a href="/?tab=candidates" class="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold text-center border border-white/10 flex items-center justify-center gap-1.5 transition-all">
            <i data-lucide="shield-alert" class="w-3.5 h-3.5"></i>
            <span>Cheating Radar</span>
          </a>
        </div>
      </div>

      <!-- Stat Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        
        <div class="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Writing Exam Now</span>
          <div class="text-xl sm:text-2xl font-black ${activeSessionsCount > 0 ? 'text-indigo-600 animate-pulse' : 'text-slate-900'}">${activeSessionsCount}</div>
          <p class="text-[10px] text-slate-400">Students in session</p>
        </div>

        <div class="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Cheating Alerts</span>
          <div class="text-xl sm:text-2xl font-black ${cheatedSessionsCount > 0 ? 'text-rose-600' : 'text-slate-900'}">${cheatedSessionsCount}</div>
          <p class="text-[10px] text-slate-400">Flagged infractions</p>
        </div>

        <div class="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Registered Students</span>
          <div class="text-xl sm:text-2xl font-black text-slate-900">${totalStudents}</div>
          <p class="text-[10px] text-slate-400">${totalResults} total submissions</p>
        </div>

        <div class="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Live Courses</span>
          <div class="text-xl sm:text-2xl font-black text-slate-900">${courses.length}</div>
          <p class="text-[10px] text-slate-400">${totalQuestions} banked questions</p>
        </div>

      </div>

      <!-- Live Radar Snapshot Card -->
      <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3">
        <div class="flex justify-between items-center">
          <h3 class="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Live Student Activity & Exam Radar</span>
          </h3>
          <a href="/?tab=candidates" class="text-xs font-bold text-indigo-600 hover:underline">Full Details</a>
        </div>

        ${examSessions.length === 0 ? `
        <div class="py-6 text-center text-slate-400 text-xs">
          No live student exam sessions recorded yet. When students start exams, they will appear here in real time.
        </div>
        ` : `
        <div class="divide-y divide-slate-100">
          ${examSessions.slice(0, 5).map(se => `
          <div class="py-2.5 flex justify-between items-center gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-900">${se.student_name}</span>
                <span class="text-[10px] text-slate-400 font-mono">(${se.matric_no})</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  se.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' :
                  se.status === 'TERMINATED_FOR_CHEATING' ? 'bg-rose-100 text-rose-800' :
                  'bg-emerald-100 text-emerald-800'
                }">
                  ${se.status === 'IN_PROGRESS' ? 'WRITING NOW' : se.status === 'TERMINATED_FOR_CHEATING' ? 'TERMINATED' : 'FINISHED'}
                </span>
              </div>
              <p class="text-[11px] text-slate-500 mt-0.5 font-medium">
                ${se.course_code} &bull; 
                ${se.tab_switches > 0 ? `<span class="text-rose-600 font-bold">⚠️ ${se.tab_switches} Tab Switches</span>` : '<span class="text-emerald-600">0 Violations (Clean)</span>'}
                ${se.percentage > 0 ? ` &bull; Score: <span class="font-bold">${se.percentage}% (${se.grade})</span>` : ''}
              </p>
            </div>
          </div>
          `).join('')}
        </div>
        `}
      </div>

    </div>
    ` : ''}

    <!-- ================= TAB 2: COURSES ================= -->
    ${tab === 'courses' ? `
    <div class="space-y-4 sm:space-y-5">
      
      <!-- Course Creator Form -->
      <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl ${courseToEdit ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'} flex items-center justify-center">
              <i data-lucide="${courseToEdit ? 'edit-2' : 'folder-plus'}" class="w-4 h-4"></i>
            </div>
            <div>
              <h2 class="text-sm font-bold text-slate-900">${courseToEdit ? 'Edit Course: ' + courseToEdit.code : 'Add New Course'}</h2>
              <p class="text-[11px] text-slate-400">Configure subject code, title, duration, and question limit</p>
            </div>
          </div>
          ${courseToEdit ? `<a href="/?tab=courses" class="text-xs font-semibold text-slate-500 hover:underline">Cancel</a>` : ''}
        </div>

        <form method="POST" action="${courseToEdit ? '/action/edit_course' : '/action/add_course'}" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          ${courseToEdit ? `<input type="hidden" name="course_id" value="${courseToEdit.id}">` : ''}

          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">Course Code *</label>
            <input type="text" name="code" value="${courseToEdit ? courseToEdit.code : ''}" required placeholder="e.g. GST 111" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500">
          </div>

          <div class="sm:col-span-2">
            <label class="block text-[11px] font-bold text-slate-600 mb-1">Course Title *</label>
            <input type="text" name="title" value="${courseToEdit ? courseToEdit.title : ''}" required placeholder="e.g. Communication in English" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">Exam Time (Minutes)</label>
            <input type="number" name="duration" value="${courseToEdit ? courseToEdit.duration : '30'}" min="5" max="300" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">Questions per Student</label>
            <input type="number" name="question_limit" value="${courseToEdit ? courseToEdit.question_limit : '20'}" min="5" max="200" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">Allowed Attempts</label>
            <select name="attempts_allowed" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="1" ${courseToEdit && courseToEdit.attempts_allowed == 1 ? 'selected' : ''}>1 Attempt (Strict)</option>
              <option value="2" ${courseToEdit && courseToEdit.attempts_allowed == 2 ? 'selected' : ''}>2 Attempts</option>
              <option value="0" ${courseToEdit && courseToEdit.attempts_allowed == 0 ? 'selected' : ''}>Unlimited (Practice)</option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">Exam Status</label>
            <select name="is_locked" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="0" ${courseToEdit && courseToEdit.is_locked == 0 ? 'selected' : ''}>Open (Available to take)</option>
              <option value="1" ${courseToEdit && courseToEdit.is_locked == 1 ? 'selected' : ''}>Closed (Hidden)</option>
            </select>
          </div>

          <div class="flex items-end">
            <button type="submit" class="w-full py-2 rounded-xl ${courseToEdit ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white text-xs font-bold shadow-sm transition-colors cursor-pointer">
              <span>${courseToEdit ? 'Save Changes' : 'Create Course'}</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Course List -->
      <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3">
        <h3 class="text-sm font-bold text-slate-900">Registered Courses (${courses.length})</h3>

        ${courses.length === 0 ? `
        <div class="py-8 text-center text-slate-400 text-xs">No courses registered yet.</div>
        ` : `
        <div class="divide-y divide-slate-100">
          ${courses.map(c => {
            const courseTopics = allTopics.filter(t => t.course_id === c.id);
            return `
          <div class="py-3 flex flex-col gap-2">
            <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-mono font-bold text-xs text-indigo-600">${c.code}</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${c.is_locked ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}">
                    ${c.is_locked ? 'Closed' : 'Open'}
                  </span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                    ${c.topic_count} Topics
                  </span>
                </div>
                <h4 class="text-xs font-bold text-slate-900 mt-0.5 truncate">${c.title}</h4>
                <p class="text-[11px] text-slate-400">${c.q_count} questions &bull; ${c.duration} mins timer &bull; ${c.question_limit} Qs served</p>
              </div>

              <div class="flex flex-wrap items-center gap-1.5 shrink-0 pt-1 sm:pt-0">
                <button type="button" onclick="toggleTopicsList('${c.id}')" class="px-2.5 py-1 rounded-lg text-xs font-bold border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1">
                  <i data-lucide="layers" class="w-3.5 h-3.5"></i>
                  <span>Topics (${c.topic_count})</span>
                </button>
                <a href="/?tab=questions&target_course=${c.id}" class="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
                  Add Qs
                </a>
                <a href="/?tab=courses&edit_course=${c.id}" class="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
                  Edit
                </a>
                <form method="POST" action="/action/toggle_lock">
                  <input type="hidden" name="course_id" value="${c.id}">
                  <input type="hidden" name="current_locked" value="${c.is_locked}">
                  <button type="submit" class="px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${c.is_locked ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-rose-300 bg-rose-50 text-rose-700'}">
                    ${c.is_locked ? 'Open' : 'Close'}
                  </button>
                </form>
                <form method="POST" action="/action/delete_course" onsubmit="return confirm('Delete ${c.code}?')">
                  <input type="hidden" name="course_id" value="${c.id}">
                  <button type="submit" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  </button>
                </form>
              </div>
            </div>

            <!-- Collapsible Topics List for this course -->
            <div id="topics_list_${c.id}" class="hidden mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Curriculum Topics (${c.topic_count})</span>
                <form method="POST" action="/action/add_topic" class="flex items-center gap-1.5 w-full sm:w-auto">
                  <input type="hidden" name="course_id" value="${c.id}">
                  <input type="text" name="name" required placeholder="New topic name..." class="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-44">
                  <button type="submit" class="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shrink-0">Add Topic</button>
                </form>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                ${courseTopics.map((t, idx) => `
                <div class="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs">
                  <span class="truncate pr-2 font-medium text-slate-800" title="${t.name}"><span class="text-slate-400 font-mono text-[10px] mr-1">${idx + 1}.</span>${t.name}</span>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${t.q_count > 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-400'}">${t.q_count} Qs</span>
                    <form method="POST" action="/action/delete_topic" onsubmit="return confirm('Remove topic \"${t.name}\"?')">
                      <input type="hidden" name="topic_id" value="${t.id}">
                      <button type="submit" class="text-slate-300 hover:text-rose-600 transition-colors p-0.5" title="Delete Topic">
                        <i data-lucide="trash" class="w-3 h-3"></i>
                      </button>
                    </form>
                  </div>
                </div>
                `).join('')}
              </div>
            </div>
          </div>
          `;
          }).join('')}
        </div>
        `}
      </div>

    </div>
    ` : ''}

    <!-- ================= TAB 3: EXAMS ================= -->
    ${tab === 'tests' ? `
    <div class="space-y-4 sm:space-y-5">
      
      <!-- Exams Gateway Cards -->
      <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 class="text-sm font-bold text-slate-900">Live Exams Control</h2>
            <p class="text-xs text-slate-400">Open or close subjects for student test sessions</p>
          </div>

          <div class="flex items-center gap-2">
            <form method="POST" action="/action/master_lock_toggle">
              <input type="hidden" name="target_locked" value="0">
              <button type="submit" class="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold transition-colors">
                Open All Exams
              </button>
            </form>
            <form method="POST" action="/action/master_lock_toggle">
              <input type="hidden" name="target_locked" value="1">
              <button type="submit" class="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold transition-colors">
                Close All Exams
              </button>
            </form>
          </div>
        </div>

        ${courses.length === 0 ? `
        <div class="py-6 text-center text-slate-400 text-xs">No courses registered yet.</div>
        ` : `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          ${courses.map(c => `
          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
            <div>
              <div class="flex justify-between items-center mb-1">
                <span class="text-xs font-mono font-bold text-indigo-600">${c.code}</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${c.is_locked ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}">
                  ${c.is_locked ? 'CLOSED' : 'OPEN'}
                </span>
              </div>
              <h4 class="text-xs font-bold text-slate-900 truncate">${c.title}</h4>
              <p class="text-[11px] text-slate-500 mt-0.5">${c.q_count} questions banked &bull; ${c.duration} mins timer</p>
            </div>
            
            <form method="POST" action="/action/toggle_lock">
              <input type="hidden" name="course_id" value="${c.id}">
              <input type="hidden" name="current_locked" value="${c.is_locked}">
              <button type="submit" class="w-full py-1.5 rounded-lg text-xs font-bold transition-all ${c.is_locked ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'}">
                ${c.is_locked ? 'Open for Students' : 'Close Exam'}
              </button>
            </form>
          </div>
          `).join('')}
        </div>
        `}
      </div>

      <!-- General Exam Session Settings -->
      <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4">
        <div>
          <h2 class="text-sm font-bold text-slate-900">Exam Session Rules</h2>
          <p class="text-xs text-slate-400">Rules applied during student test sessions</p>
        </div>

        <form method="POST" action="/action/save_test_settings" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            <label class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 cursor-pointer">
              <input type="checkbox" name="auto_submit_expiry" value="1" ${autoSubmitExpiry ? 'checked' : ''} class="w-4 h-4 mt-0.5 rounded text-indigo-600">
              <div>
                <span class="text-xs font-bold text-slate-900 block">Submit Automatically When Time Ends</span>
                <span class="text-[11px] text-slate-500 block">Answers are submitted immediately when the countdown timer hits 00:00.</span>
              </div>
            </label>

            <label class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 cursor-pointer">
              <input type="checkbox" name="show_instant_results" value="1" ${showInstantResults ? 'checked' : ''} class="w-4 h-4 mt-0.5 rounded text-indigo-600">
              <div>
                <span class="text-xs font-bold text-slate-900 block">Show Score Immediately After Submission</span>
                <span class="text-[11px] text-slate-500 block">Student sees their total score and grade right after finishing.</span>
              </div>
            </label>

            <label class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 cursor-pointer">
              <input type="checkbox" name="allow_review_explanations" value="1" ${allowReviewExplanations ? 'checked' : ''} class="w-4 h-4 mt-0.5 rounded text-indigo-600">
              <div>
                <span class="text-xs font-bold text-slate-900 block">Allow Students to See Correct Answers</span>
                <span class="text-[11px] text-slate-500 block">Shows answer keys and clinical explanations after the exam.</span>
              </div>
            </label>

            <label class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 cursor-pointer">
              <input type="checkbox" name="allow_flag_questions" value="1" ${allowFlagQuestions ? 'checked' : ''} class="w-4 h-4 mt-0.5 rounded text-indigo-600">
              <div>
                <span class="text-xs font-bold text-slate-900 block">Allow Bookmarking Difficult Questions</span>
                <span class="text-[11px] text-slate-500 block">Students can bookmark questions to revisit before final submission.</span>
              </div>
            </label>

          </div>

          <div class="flex justify-end">
            <button type="submit" class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer">
              Save Rules
            </button>
          </div>
        </form>
      </div>

    </div>
    ` : ''}

    <!-- ================= TAB 4: QUESTIONS ================= -->
    ${tab === 'questions' ? `
    <div class="space-y-4 sm:space-y-5">
      
      <!-- Single Question Form -->
      <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-bold text-slate-900">${questionToEdit ? 'Edit Question' : 'Add Multiple Choice Question'}</h2>
          ${questionToEdit ? `<a href="/?tab=questions" class="text-xs font-semibold text-slate-500 hover:underline">Cancel</a>` : ''}
        </div>

        ${courses.length === 0 ? `
        <div class="p-4 text-center text-slate-500 text-xs bg-slate-50 rounded-xl">
          Please <a href="/?tab=courses" class="text-indigo-600 font-bold underline">add a course first</a> before adding questions.
        </div>
        ` : `
        <form method="POST" action="${questionToEdit ? '/action/edit_question' : '/action/add_question'}" class="space-y-3">
          ${questionToEdit ? `<input type="hidden" name="question_id" value="${questionToEdit.id}">` : ''}

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Select Course *</label>
              <select name="course_id" id="singleCourseSelect" onchange="syncTopicDropdown('singleCourseSelect', 'singleTopicSelect')" required class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                ${courses.map(c => `<option value="${c.id}" ${questionToEdit && questionToEdit.course_id === c.id ? 'selected' : ''}>${c.code} - ${c.title}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Select Topic *</label>
              <select name="topic_id" id="singleTopicSelect" required class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <!-- Populated dynamically -->
              </select>
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">Question Text *</label>
            <textarea name="text" required rows="2" placeholder="Enter question..." class="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed">${questionToEdit ? questionToEdit.text : ''}</textarea>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Option A *</label>
              <input type="text" name="a" value="${questionToEdit ? questionToEdit.a : ''}" required placeholder="Option A text" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Option B *</label>
              <input type="text" name="b" value="${questionToEdit ? questionToEdit.b : ''}" required placeholder="Option B text" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Option C</label>
              <input type="text" name="c" value="${questionToEdit && questionToEdit.c ? questionToEdit.c : ''}" placeholder="Option C text" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Option D</label>
              <input type="text" name="d" value="${questionToEdit && questionToEdit.d ? questionToEdit.d : ''}" placeholder="Option D text" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Correct Answer *</label>
              <select name="correct_option" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-indigo-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="A" ${questionToEdit && questionToEdit.correct_option === 'A' ? 'selected' : ''}>Option A is Correct</option>
                <option value="B" ${questionToEdit && questionToEdit.correct_option === 'B' ? 'selected' : ''}>Option B is Correct</option>
                <option value="C" ${questionToEdit && questionToEdit.correct_option === 'C' ? 'selected' : ''}>Option C is Correct</option>
                <option value="D" ${questionToEdit && questionToEdit.correct_option === 'D' ? 'selected' : ''}>Option D is Correct</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Explanation (Optional)</label>
              <input type="text" name="explanation" value="${questionToEdit && questionToEdit.explanation ? questionToEdit.explanation : ''}" placeholder="Why this is the correct answer..." class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
            </div>
          </div>

          <div class="flex justify-end pt-1">
            <button type="submit" class="px-5 py-2 rounded-xl ${questionToEdit ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-bold text-xs shadow-sm transition-colors cursor-pointer">
              <span>${questionToEdit ? 'Save Changes' : 'Save Question'}</span>
            </button>
          </div>
        </form>
        `}
      </div>

      <!-- Quick Paste Bulk Add (Topic by Topic) -->
      ${courses.length > 0 ? `
      <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3">
        <div>
          <h3 class="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <i data-lucide="file-text" class="w-4 h-4 text-emerald-600"></i>
            <span>Parse Questions Topic by Topic</span>
          </h3>
          <p class="text-[11px] text-slate-400 mt-0.5">Select a target topic to parse all questions into that topic, or leave as Auto-Detect and include <code>TOPIC: Name</code> headers.</p>
        </div>

        <form method="POST" action="/action/bulk_add_questions" class="space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Target Course *</label>
              <select name="course_id" id="bulkCourseSelect" onchange="syncTopicDropdown('bulkCourseSelect', 'bulkTopicSelect', null, true)" required class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                ${courses.map(c => `<option value="${c.id}">${c.code} - ${c.title}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Target Topic *</label>
              <select name="topic_id" id="bulkTopicSelect" required class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <!-- Populated dynamically -->
              </select>
            </div>
          </div>

          <div class="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-900 flex items-start gap-2">
            <i data-lucide="sparkles" class="w-4 h-4 text-indigo-600 shrink-0 mt-0.5"></i>
            <span>
              <strong>Topic Parsing Tip:</strong> When you select a specific topic above, all pasted questions automatically attach to that topic.
              You can also paste questions for multiple topics at once by adding <code>TOPIC: Topic Name</code> above each set of questions!
            </span>
          </div>

          <div>
            <textarea name="bulk_text" rows="6" placeholder="TOPIC: Kidney and Homeostasis
Q: What organ filters waste and excess water from human blood?
A: Liver
B: Kidney
C: Spleen
D: Gallbladder
ANS: B
EXP: The mammalian kidneys filter waste products from circulation.
---
Q: What is the microscopic functional filtration unit of the kidney?
A: Neuron
B: Nephron
C: Alveolus
D: Osteocyte
ANS: B
EXP: Each kidney contains approximately 1 million nephrons." class="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
          </div>

          <div class="flex justify-end">
            <button type="submit" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer flex items-center gap-1.5">
              <i data-lucide="check" class="w-3.5 h-3.5"></i>
              <span>Parse & Import Questions</span>
            </button>
          </div>
        </form>
      </div>
      ` : ''}

      <!-- Questions List with Course & Topic Filters -->
      <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h3 class="text-sm font-bold text-slate-900">Saved Questions (<span id="visibleQuestionsCount">${questions.length}</span>)</h3>
          
          <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select id="filterCourse" onchange="onCourseFilterChange()" class="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="ALL">All Courses (${courses.length})</option>
              ${courses.map(c => `<option value="${c.id}">${c.code} (${c.q_count} Qs)</option>`).join('')}
            </select>

            <select id="filterTopic" onchange="filterQuestions()" class="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[200px] truncate">
              <option value="ALL">All Topics</option>
            </select>

            <input type="text" id="qFilterInput" onkeyup="filterQuestions()" placeholder="Search questions..." class="px-3 py-1.5 rounded-xl border border-slate-200 text-xs w-full sm:w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          </div>
        </div>

        ${questions.length === 0 ? `
        <div class="py-8 text-center text-slate-400 text-xs">No questions saved yet. Use the form above to add or parse questions.</div>
        ` : `
        <div class="divide-y divide-slate-100" id="questionsContainer">
          ${questions.map((q, idx) => `
          <div class="py-3 flex justify-between items-start gap-2 question-item" 
               data-course="${q.course_id}" 
               data-topic="${q.topic_id}" 
               data-search="${(q.text + ' ' + q.course_code + ' ' + (q.topic_name || '') + ' ' + (q.explanation || '')).toLowerCase()}">
            <div class="space-y-1 min-w-0 pr-2">
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold">${q.course_code}</span>
                <span class="px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 text-[10px] font-semibold">${q.topic_name || 'General'}</span>
                <span class="text-[10px] text-slate-400">#${idx + 1}</span>
              </div>
              <p class="text-xs font-semibold text-slate-900 leading-snug break-words">${q.text}</p>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] text-slate-600 pt-0.5">
                <span class="${q.correct_option === 'A' ? 'text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded' : ''}">A: ${q.a}</span>
                <span class="${q.correct_option === 'B' ? 'text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded' : ''}">B: ${q.b}</span>
                <span class="${q.correct_option === 'C' ? 'text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded' : ''}">C: ${q.c || '—'}</span>
                <span class="${q.correct_option === 'D' ? 'text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded' : ''}">D: ${q.d || '—'}</span>
              </div>
              ${q.explanation ? `<p class="text-[10px] text-indigo-600 font-medium">💡 ${q.explanation}</p>` : ''}
            </div>

            <div class="flex items-center gap-1 shrink-0">
              <a href="/?tab=questions&edit_question=${q.id}" class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
              </a>
              <form method="POST" action="/action/delete_question" onsubmit="return confirm('Delete this question?')">
                <input type="hidden" name="question_id" value="${q.id}">
                <button type="submit" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </form>
            </div>
          </div>
          `).join('')}
        </div>
        `}
      </div>

    </div>
    ` : ''}

    <!-- ================= TAB 5: EXAM RULES ================= -->
    ${tab === 'security' ? `
    <div class="space-y-4 sm:space-y-5">
      
      <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4">
        <div>
          <h2 class="text-sm font-bold text-slate-900">Anti-Cheating Rules</h2>
          <p class="text-xs text-slate-400">Settings to ensure fair and honest examination conditions</p>
        </div>

        <form method="POST" action="/action/save_security" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            <label class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 cursor-pointer">
              <input type="checkbox" name="anti_cheat_blur" value="1" ${antiCheatBlur ? 'checked' : ''} class="w-4 h-4 mt-0.5 rounded text-indigo-600">
              <div>
                <span class="text-xs font-bold text-slate-900 block">Alert when student leaves exam screen</span>
                <span class="text-[11px] text-slate-500 block">Warns student if they switch tabs or minimize the test window.</span>
              </div>
            </label>

            <label class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 cursor-pointer">
              <input type="checkbox" name="enforce_fullscreen" value="1" ${enforceFullscreen ? 'checked' : ''} class="w-4 h-4 mt-0.5 rounded text-indigo-600">
              <div>
                <span class="text-xs font-bold text-slate-900 block">Force full screen mode</span>
                <span class="text-[11px] text-slate-500 block">Expands exam window to full screen, hiding other apps.</span>
              </div>
            </label>

            <label class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 cursor-pointer">
              <input type="checkbox" name="shuffle_questions" value="1" ${shuffleQuestions ? 'checked' : ''} class="w-4 h-4 mt-0.5 rounded text-indigo-600">
              <div>
                <span class="text-xs font-bold text-slate-900 block">Shuffle question order for each student</span>
                <span class="text-[11px] text-slate-500 block">Every student gets questions in a different random order.</span>
              </div>
            </label>

            <label class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 cursor-pointer">
              <input type="checkbox" name="shuffle_options" value="1" ${shuffleOptions ? 'checked' : ''} class="w-4 h-4 mt-0.5 rounded text-indigo-600">
              <div>
                <span class="text-xs font-bold text-slate-900 block">Shuffle answer choices (A, B, C, D)</span>
                <span class="text-[11px] text-slate-500 block">Randomizes the position of choices for each candidate.</span>
              </div>
            </label>

            <label class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 cursor-pointer">
              <input type="checkbox" name="calculator_allowed" value="1" ${calculatorAllowed ? 'checked' : ''} class="w-4 h-4 mt-0.5 rounded text-indigo-600">
              <div>
                <span class="text-xs font-bold text-slate-900 block">Enable on-screen calculator</span>
                <span class="text-[11px] text-slate-500 block">Provides a built-in clinical calculator during the exam.</span>
              </div>
            </label>

            <label class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 cursor-pointer">
              <input type="checkbox" name="watermark_enabled" value="1" ${watermarkEnabled ? 'checked' : ''} class="w-4 h-4 mt-0.5 rounded text-indigo-600">
              <div>
                <span class="text-xs font-bold text-slate-900 block">Show student ID watermark on screen</span>
                <span class="text-[11px] text-slate-500 block">Deters phone photography by displaying student matric ID faintly.</span>
              </div>
            </label>

            <label class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 cursor-pointer">
              <input type="checkbox" name="disable_copy_paste" value="1" ${disableCopyPaste ? 'checked' : ''} class="w-4 h-4 mt-0.5 rounded text-indigo-600">
              <div>
                <span class="text-xs font-bold text-slate-900 block">Block copy, paste, and right-click</span>
                <span class="text-[11px] text-slate-500 block">Prevents copying question questions or text extraction.</span>
              </div>
            </label>

            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span class="text-xs font-bold text-slate-900 block">Allowed Tab Switches Before Ending Exam</span>
              <span class="text-[11px] text-slate-500 block">Automatically submits the exam if student leaves tab this many times.</span>
              <select name="max_tab_switches" class="mt-1 w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none">
                <option value="1" ${maxTabSwitches === '1' ? 'selected' : ''}>1 Violation (Strict)</option>
                <option value="2" ${maxTabSwitches === '2' ? 'selected' : ''}>2 Violations</option>
                <option value="3" ${maxTabSwitches === '3' ? 'selected' : ''}>3 Violations (Standard)</option>
                <option value="5" ${maxTabSwitches === '5' ? 'selected' : ''}>5 Violations</option>
                <option value="0" ${maxTabSwitches === '0' ? 'selected' : ''}>Warning Only (Never Auto-Submit)</option>
              </select>
            </div>

          </div>

          <div class="flex justify-end">
            <button type="submit" class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer">
              Save Exam Rules
            </button>
          </div>
        </form>
      </div>

    </div>
    ` : ''}

    <!-- ================= TAB 6: STUDENTS, LIVE MONITOR & RESULTS ================= -->
    ${tab === 'candidates' ? `
    <div class="space-y-4 sm:space-y-5">
      
      <!-- Top Sync Bar -->
      <div class="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 sm:p-5 border border-emerald-200 space-y-3">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                <i data-lucide="download-cloud" class="w-4 h-4 text-emerald-600"></i>
                <span>Live Student Portal Synchronization</span>
              </h3>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-800">Auto-Sync Active</span>
            </div>
            <p class="text-xs text-emerald-700 mt-0.5">
              All online registrations, active test sessions, cheating alerts, and exam submissions sync to this panel.
            </p>
          </div>
        </div>

        <form method="POST" action="/action/pull_live_students" class="flex flex-col sm:flex-row gap-2">
          <input type="url" name="website_url" value="${liveWebsiteUrl}" placeholder="https://premed-test-portal.vercel.app" class="flex-grow px-3 py-2 rounded-xl border border-emerald-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <button type="submit" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer shrink-0">
            Download Latest Activity
          </button>
        </form>
      </div>

      <!-- Live Exam Monitor & Cheating Radar -->
      <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Live Exam Monitor & Cheating Radar (${examSessions.length})</span>
            </h3>
            <p class="text-xs text-slate-400">See who is taking a test, how many times they switched tabs, and their score</p>
          </div>
        </div>

        ${examSessions.length === 0 ? `
        <div class="py-6 text-center text-slate-400 text-xs">No exam sessions logged yet. When a student starts an exam on the website, they will appear here.</div>
        ` : `
        <div class="divide-y divide-slate-100">
          ${examSessions.map(se => {
            let logs = [];
            try { logs = JSON.parse(se.cheating_log || '[]'); } catch(e) {}
            return `
            <div class="py-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2.5">
              <div class="min-w-0 space-y-1">
                <div class="flex items-center gap-2">
                  <h4 class="text-xs font-bold text-slate-900">${se.student_name}</h4>
                  <span class="text-[10px] text-slate-400 font-mono">(${se.matric_no})</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    se.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                    se.status === 'TERMINATED_FOR_CHEATING' ? 'bg-rose-100 text-rose-800 font-extrabold' :
                    'bg-emerald-100 text-emerald-800'
                  }">
                    ${se.status === 'IN_PROGRESS' ? 'WRITING NOW' : se.status === 'TERMINATED_FOR_CHEATING' ? 'FLAGGED / TERMINATED' : 'FINISHED'}
                  </span>
                </div>
                <p class="text-[11px] text-slate-500">
                  Course: <span class="font-bold text-indigo-700">${se.course_code}</span> &bull; 
                  Integrity: ${
                    se.tab_switches > 0 ? 
                    `<span class="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200">⚠️ ${se.tab_switches} Tab Switches</span>` : 
                    '<span class="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">0 Violations (Clean)</span>'
                  }
                  ${se.percentage > 0 ? ` &bull; Score: <span class="font-bold text-slate-900">${se.total_score}/${se.total_questions} (${se.percentage}%) - Grade ${se.grade}</span>` : ''}
                </p>

                ${logs.length > 0 ? `
                <details class="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200/80 cursor-pointer">
                  <summary class="font-bold text-rose-700">View ${logs.length} Infraction Timestamps</summary>
                  <ul class="mt-1 space-y-0.5 text-[10px] font-mono text-slate-700 pl-2">
                    ${logs.map(l => `<li>&bull; [${l.time || 'Logged'}] ${l.type === 'TAB_SWITCH' ? 'Switched tab or minimized window' : l.type} (#${l.count})</li>`).join('')}
                  </ul>
                </details>
                ` : ''}
              </div>

              <div class="flex items-center gap-1.5 shrink-0 pt-1 sm:pt-0">
                <form method="POST" action="/action/allow_retake" onsubmit="return confirm('Allow retake for ${se.student_name}? This resets their session.')">
                  <input type="hidden" name="student_id" value="${se.student_id}">
                  <input type="hidden" name="course_id" value="${se.course_id}">
                  <button type="submit" class="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors">
                    Allow Retake
                  </button>
                </form>
              </div>
            </div>
            `;
          }).join('')}
        </div>
        `}
      </div>

      <!-- Add Student Manually Form -->
      <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3">
        <h3 class="text-sm font-bold text-slate-900">Add Student Account Manually</h3>
        <p class="text-xs text-slate-400">You can also register a student directly here on your computer.</p>

        <form method="POST" action="/action/add_student" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">Full Name *</label>
            <input type="text" name="name" required placeholder="e.g. John Doe" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">Matric Number *</label>
            <input type="text" name="matric_no" required placeholder="e.g. MED/2026/001" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500">
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">Department *</label>
            <select name="department" required class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              ${DEPARTMENTS.map(d => `<option value="${d}">${d}</option>`).join('')}
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">Password *</label>
            <input type="text" name="password" required value="123456" placeholder="Password" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">Phone Number (Optional)</label>
            <input type="tel" name="phone" placeholder="08012345678" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
          </div>

          <div class="flex items-end">
            <button type="submit" class="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer">
              Register Student
            </button>
          </div>
        </form>
      </div>

      <!-- Registered Students List -->
      <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3">
        <h3 class="text-sm font-bold text-slate-900">Registered Students (${students.length})</h3>

        ${students.length === 0 ? `
        <div class="py-6 text-center text-slate-400 text-xs">No registered students found yet. Click "Download Latest Activity" above if students registered online.</div>
        ` : `
        <div class="divide-y divide-slate-100">
          ${students.map(st => `
          <div class="py-2.5 flex justify-between items-center gap-2">
            <div class="min-w-0">
              <h4 class="text-xs font-bold text-slate-900 truncate">${st.name}</h4>
              <p class="text-[11px] text-slate-400 font-mono">${st.matric_no} &bull; <span class="text-indigo-600 font-sans">${st.department}</span> &bull; Tests taken: ${st.tests_count}</p>
            </div>
            <form method="POST" action="/action/delete_student" onsubmit="return confirm('Remove student ${st.matric_no}?')">
              <input type="hidden" name="student_id" value="${st.id}">
              <button type="submit" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </form>
          </div>
          `).join('')}
        </div>
        `}
      </div>

      <!-- All Test Results -->
      <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3">
        <h3 class="text-sm font-bold text-slate-900">Completed Test Submissions (${submissions.length})</h3>

        ${submissions.length === 0 ? `
        <div class="py-6 text-center text-slate-400 text-xs">No test submissions yet.</div>
        ` : `
        <div class="divide-y divide-slate-100">
          ${submissions.map(sub => `
          <div class="py-2.5 flex justify-between items-center gap-2">
            <div class="min-w-0">
              <h4 class="text-xs font-bold text-slate-900 truncate">${sub.student_name} <span class="text-slate-400 font-mono text-[10px]">(${sub.matric_no})</span></h4>
              <p class="text-[11px] text-slate-500">
                ${sub.course_code} &bull; Score: <span class="font-bold text-slate-800">${sub.total_score}/${sub.total_questions}</span> (${sub.percentage}%)
                ${sub.tab_switches > 0 ? ` &bull; <span class="text-rose-600 font-bold">⚠️ ${sub.tab_switches} tab switches</span>` : ''}
              </p>
            </div>
            <span class="px-2 py-0.5 rounded-lg text-xs font-bold ${sub.grade === 'A' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}">
              Grade ${sub.grade}
            </span>
          </div>
          `).join('')}
        </div>
        `}
      </div>

    </div>
    ` : ''}

  </main>

  <footer class="border-t border-slate-200 py-4 text-center text-[11px] text-slate-400 bg-white">
    Premed CBT Portal &bull; School Admin Control Panel
  </footer>

  <script>
    lucide.createIcons();

    const TOPICS_DATA = ${JSON.stringify(allTopics)};

    function syncTopicDropdown(courseSelectId, topicSelectId, selectedTopicId, includeAuto = false) {
      const courseEl = document.getElementById(courseSelectId);
      const topicEl = document.getElementById(topicSelectId);
      if (!courseEl || !topicEl) return;
      const courseId = courseEl.value;
      const courseTopics = TOPICS_DATA.filter(t => t.course_id === courseId);

      topicEl.innerHTML = '';
      if (includeAuto) {
        const autoOpt = document.createElement('option');
        autoOpt.value = 'AUTO';
        autoOpt.textContent = '✨ Auto-Detect Topic from Text (or use 1st topic)';
        topicEl.appendChild(autoOpt);
      }

      if (courseTopics.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No topics registered yet (General)';
        topicEl.appendChild(opt);
        return;
      }

      courseTopics.forEach((t, idx) => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = (idx + 1) + '. ' + t.name + ' (' + t.q_count + ' Qs)';
        if (selectedTopicId && selectedTopicId === t.id) {
          opt.selected = true;
        }
        topicEl.appendChild(opt);
      });
    }

    function toggleTopicsList(courseId) {
      const el = document.getElementById('topics_list_' + courseId);
      if (el) el.classList.toggle('hidden');
    }

    function onCourseFilterChange() {
      const courseFilter = document.getElementById('filterCourse');
      const topicFilter = document.getElementById('filterTopic');
      if (!courseFilter || !topicFilter) return;
      const courseId = courseFilter.value;

      topicFilter.innerHTML = '<option value="ALL">All Topics in Course</option>';
      if (courseId !== 'ALL') {
        const courseTopics = TOPICS_DATA.filter(t => t.course_id === courseId);
        courseTopics.forEach((t, idx) => {
          const opt = document.createElement('option');
          opt.value = t.id;
          opt.textContent = (idx + 1) + '. ' + t.name + ' (' + t.q_count + ' Qs)';
          topicFilter.appendChild(opt);
        });
      }
      filterQuestions();
    }

    function filterQuestions() {
      const q = (document.getElementById('qFilterInput')?.value || '').toLowerCase();
      const courseVal = document.getElementById('filterCourse')?.value || 'ALL';
      const topicVal = document.getElementById('filterTopic')?.value || 'ALL';

      const items = document.querySelectorAll('.question-item');
      let visible = 0;
      items.forEach(el => {
        const text = el.getAttribute('data-search') || '';
        const itemCourse = el.getAttribute('data-course') || '';
        const itemTopic = el.getAttribute('data-topic') || '';

        const matchesSearch = !q || text.includes(q);
        const matchesCourse = (courseVal === 'ALL') || (itemCourse === courseVal);
        const matchesTopic = (topicVal === 'ALL') || (itemTopic === topicVal);

        if (matchesSearch && matchesCourse && matchesTopic) {
          el.style.display = 'flex';
          visible++;
        } else {
          el.style.display = 'none';
        }
      });

      const countBadge = document.getElementById('visibleQuestionsCount');
      if (countBadge) countBadge.textContent = visible;
    }

    // Initialize dropdowns on page load
    document.addEventListener('DOMContentLoaded', () => {
      const urlParams = new URLSearchParams(window.location.search);
      const targetCourse = urlParams.get('target_course') || '${questionToEdit ? questionToEdit.course_id : ''}';
      const targetTopic = urlParams.get('target_topic') || '${questionToEdit ? (questionToEdit.topic_id || '') : ''}';

      if (document.getElementById('singleCourseSelect')) {
        if (targetCourse) document.getElementById('singleCourseSelect').value = targetCourse;
        syncTopicDropdown('singleCourseSelect', 'singleTopicSelect', targetTopic);
      }
      if (document.getElementById('bulkCourseSelect')) {
        if (targetCourse) document.getElementById('bulkCourseSelect').value = targetCourse;
        syncTopicDropdown('bulkCourseSelect', 'bulkTopicSelect', targetTopic, true);
      }
    });

    // Also trigger immediately in case script runs after DOM
    setTimeout(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const targetCourse = urlParams.get('target_course') || '${questionToEdit ? questionToEdit.course_id : ''}';
      const targetTopic = urlParams.get('target_topic') || '${questionToEdit ? (questionToEdit.topic_id || '') : ''}';

      if (document.getElementById('singleCourseSelect')) {
        if (targetCourse) document.getElementById('singleCourseSelect').value = targetCourse;
        syncTopicDropdown('singleCourseSelect', 'singleTopicSelect', targetTopic);
      }
      if (document.getElementById('bulkCourseSelect')) {
        if (targetCourse) document.getElementById('bulkCourseSelect').value = targetCourse;
        syncTopicDropdown('bulkCourseSelect', 'bulkTopicSelect', targetTopic, true);
      }
    }, 100);

    const topSyncForm = document.getElementById('topSyncForm');
    const topSyncBtn = document.getElementById('topSyncBtn');
    if (topSyncForm && topSyncBtn) {
      topSyncForm.addEventListener('submit', () => {
        topSyncBtn.disabled = true;
        topSyncBtn.innerHTML = '<span class="animate-spin inline-block mr-1">&#9696;</span> Publishing...';
      });
    }

    // Auto-Sync Polling in Background every 12 seconds
    setInterval(async () => {
      try {
        const res = await fetch('/action/auto_sync_status');
        const data = await res.json();
        if (data.has_update) {
          location.reload();
        }
      } catch(e) {}
    }, 12000);
  </script>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  const host = req.headers.host || ('localhost:' + PORT);
  const url = new URL(req.url, 'http://' + host);
  const pathname = url.pathname;

  // Actions
  if (req.method === 'POST') {
    const data = await parseBody(req);

    // Toggle single lock
    if (pathname === '/action/toggle_lock') {
      const cid = data.course_id;
      const current = parseInt(data.current_locked, 10) || 0;
      const next = current ? 0 : 1;
      db.prepare('UPDATE courses SET is_locked = ? WHERE id = ?').run(next, cid);
      const refererTab = url.searchParams.get('tab') || 'home';
      res.writeHead(302, { Location: '/?tab=' + refererTab });
      return res.end();
    }

    // Master unlock all / lock all
    if (pathname === '/action/master_lock_toggle') {
      const targetLocked = parseInt(data.target_locked, 10) || 0;
      db.prepare('UPDATE courses SET is_locked = ?').run(targetLocked);
      res.writeHead(302, { Location: '/?tab=tests' });
      return res.end();
    }

    // Create Test (Explicit Manual Test Deployment)
    if (pathname === '/action/create_test') {
      const courseId = data.course_id;
      const title = (data.title || '').trim();
      const topicMode = data.topic_mode || 'ALL';
      let topicIds = '["ALL"]';

      if (topicMode === 'SPECIFIC') {
        const rawSelected = data.topic_ids;
        if (Array.isArray(rawSelected)) {
          topicIds = JSON.stringify(rawSelected.filter(Boolean));
        } else if (typeof rawSelected === 'string' && rawSelected.trim()) {
          const list = rawSelected.split(',').map(s => s.trim()).filter(Boolean);
          topicIds = JSON.stringify(list.length ? list : ['ALL']);
        }
      }

      const duration = parseInt(data.duration, 10) || 30;
      const questionLimit = parseInt(data.question_limit, 10) || 20;
      const attemptsAllowed = parseInt(data.attempts_allowed, 10) || 1;
      const isLive = data.is_live ? 1 : 0;
      const autoSubmit = data.auto_submit ? 1 : 0;
      const enforceFullscreen = data.enforce_fullscreen ? 1 : 0;
      const maxTabSwitches = parseInt(data.max_tab_switches, 10) || 3;
      const shuffleQuestions = data.shuffle_questions ? 1 : 0;
      const shuffleOptions = data.shuffle_options ? 1 : 0;
      const calculatorAllowed = data.calculator_allowed ? 1 : 0;

      if (courseId && title) {
        const testId = 'test_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
        db.prepare(`
          INSERT INTO tests (id, title, course_id, topic_ids, duration, question_limit, attempts_allowed, is_live, auto_submit, enforce_fullscreen, max_tab_switches, shuffle_questions, shuffle_options, calculator_allowed)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(testId, title, courseId, topicIds, duration, questionLimit, attemptsAllowed, isLive, autoSubmit, enforceFullscreen, maxTabSwitches, shuffleQuestions, shuffleOptions, calculatorAllowed);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(renderHtml('tests', `Examination "${title}" successfully created and ${isLive ? 'made LIVE on student portal' : 'saved as draft'}!`));
      }

      res.writeHead(302, { Location: '/?tab=tests' });
      return res.end();
    }

    // Toggle Test Live Status
    if (pathname === '/action/toggle_test_live') {
      const testId = data.test_id;
      const currentLive = parseInt(data.current_live, 10) || 0;
      const nextLive = currentLive ? 0 : 1;
      if (testId) {
        db.prepare('UPDATE tests SET is_live = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(nextLive, testId);
      }
      res.writeHead(302, { Location: '/?tab=tests' });
      return res.end();
    }

    // Delete Test
    if (pathname === '/action/delete_test') {
      const testId = data.test_id;
      if (testId) {
        db.prepare('DELETE FROM tests WHERE id = ?').run(testId);
      }
      res.writeHead(302, { Location: '/?tab=tests' });
      return res.end();
    }

    // Master Tests Live Toggle
    if (pathname === '/action/master_tests_live_toggle') {
      const targetLive = parseInt(data.target_live, 10) || 0;
      db.prepare('UPDATE tests SET is_live = ?, updated_at = CURRENT_TIMESTAMP').run(targetLive);
      res.writeHead(302, { Location: '/?tab=tests' });
      return res.end();
    }

    // Add Course
    if (pathname === '/action/add_course') {
      const code = (data.code || '').trim().toUpperCase();
      const title = (data.title || '').trim();
      const duration = parseInt(data.duration, 10) || 30;
      const questionLimit = parseInt(data.question_limit, 10) || 20;
      const attemptsAllowed = parseInt(data.attempts_allowed, 10) || 1;
      const isLocked = parseInt(data.is_locked, 10) || 0;

      if (code && title) {
        const cid = 'course_' + code.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Date.now();
        db.prepare('INSERT INTO courses (id, code, title, duration, question_limit, attempts_allowed, is_mock, is_locked) VALUES (?, ?, ?, ?, ?, ?, 1, ?)').run(cid, code, title, duration, questionLimit, attemptsAllowed, isLocked);
        const tid = 'topic_' + Math.random().toString(36).substring(2, 10);
        db.prepare('INSERT INTO topics (id, course_id, name) VALUES (?, ?, ?)').run(tid, cid, 'General Curriculum');
      }
      res.writeHead(302, { Location: '/?tab=courses' });
      return res.end();
    }

    // Edit Course
    if (pathname === '/action/edit_course') {
      const cid = data.course_id;
      const code = (data.code || '').trim().toUpperCase();
      const title = (data.title || '').trim();
      const duration = parseInt(data.duration, 10) || 30;
      const questionLimit = parseInt(data.question_limit, 10) || 20;
      const attemptsAllowed = parseInt(data.attempts_allowed, 10) || 1;
      const isLocked = parseInt(data.is_locked, 10) || 0;

      if (cid && code && title) {
        db.prepare('UPDATE courses SET code = ?, title = ?, duration = ?, question_limit = ?, attempts_allowed = ?, is_locked = ? WHERE id = ?').run(code, title, duration, questionLimit, attemptsAllowed, isLocked, cid);
      }
      res.writeHead(302, { Location: '/?tab=courses' });
      return res.end();
    }

    // Delete Course
    if (pathname === '/action/delete_course') {
      const cid = data.course_id;
      if (cid) {
        const topics = db.prepare('SELECT id FROM topics WHERE course_id = ?').all(cid);
        for (const t of topics) {
          db.prepare('DELETE FROM questions WHERE topic_id = ?').run(t.id);
        }
        db.prepare('DELETE FROM topics WHERE course_id = ?').run(cid);
        db.prepare('DELETE FROM courses WHERE id = ?').run(cid);
      }
      res.writeHead(302, { Location: '/?tab=courses' });
      return res.end();
    }

    // Save Test Global Rules
    if (pathname === '/action/save_test_settings') {
      setSetting('auto_submit_expiry', data.auto_submit_expiry ? '1' : '0');
      setSetting('show_instant_results', data.show_instant_results ? '1' : '0');
      setSetting('allow_review_explanations', data.allow_review_explanations ? '1' : '0');
      setSetting('allow_flag_questions', data.allow_flag_questions ? '1' : '0');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(renderHtml('tests', 'Exam rules saved successfully!'));
    }

    // Save Security Policy
    if (pathname === '/action/save_security') {
      setSetting('anti_cheat_blur', data.anti_cheat_blur ? '1' : '0');
      setSetting('enforce_fullscreen', data.enforce_fullscreen ? '1' : '0');
      setSetting('shuffle_questions', data.shuffle_questions ? '1' : '0');
      setSetting('shuffle_options', data.shuffle_options ? '1' : '0');
      setSetting('calculator_allowed', data.calculator_allowed ? '1' : '0');
      setSetting('watermark_enabled', data.watermark_enabled ? '1' : '0');
      setSetting('disable_copy_paste', data.disable_copy_paste ? '1' : '0');
      setSetting('max_tab_switches', data.max_tab_switches || '3');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(renderHtml('security', 'Anti-cheating rules saved successfully!'));
    }

    // Add Topic to Course
    if (pathname === '/action/add_topic') {
      const cid = data.course_id;
      const name = (data.name || '').trim();
      if (cid && name) {
        const tid = 'topic_' + Math.random().toString(36).substring(2, 10);
        db.prepare('INSERT INTO topics (id, course_id, name) VALUES (?, ?, ?)').run(tid, cid, name);
      }
      res.writeHead(302, { Location: '/?tab=courses' });
      return res.end();
    }

    // Delete Topic
    if (pathname === '/action/delete_topic') {
      const tid = data.topic_id;
      if (tid) {
        db.prepare('DELETE FROM questions WHERE topic_id = ?').run(tid);
        db.prepare('DELETE FROM topics WHERE id = ?').run(tid);
      }
      res.writeHead(302, { Location: '/?tab=courses' });
      return res.end();
    }

    // Add Question
    if (pathname === '/action/add_question') {
      const courseId = data.course_id;
      let topicId = data.topic_id;
      const text = (data.text || '').trim();
      const optA = (data.a || '').trim();
      const optB = (data.b || '').trim();
      const optC = (data.c || '').trim();
      const optD = (data.d || '').trim();
      const correct = (data.correct_option || 'A').trim().toUpperCase();
      const explanation = (data.explanation || '').trim();

      if (text && optA && optB) {
        if (!topicId || topicId === 'AUTO') {
          let topic = db.prepare('SELECT id FROM topics WHERE course_id = ? LIMIT 1').get(courseId);
          topicId = topic ? topic.id : null;
          if (!topicId) {
            topicId = 'topic_' + Math.random().toString(36).substring(2, 10);
            db.prepare('INSERT INTO topics (id, course_id, name) VALUES (?, ?, ?)').run(topicId, courseId, 'General Curriculum');
          }
        }
        const qid = 'q_' + Math.random().toString(36).substring(2, 12);
        db.prepare('INSERT INTO questions (id, topic_id, text, a, b, c, d, correct_option, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(qid, topicId, text, optA, optB, optC, optD, correct, explanation);
      }
      res.writeHead(302, { Location: '/?tab=questions' });
      return res.end();
    }

    // Edit Question
    if (pathname === '/action/edit_question') {
      const qid = data.question_id;
      const courseId = data.course_id;
      let topicId = data.topic_id;
      const text = (data.text || '').trim();
      const optA = (data.a || '').trim();
      const optB = (data.b || '').trim();
      const optC = (data.c || '').trim();
      const optD = (data.d || '').trim();
      const correct = (data.correct_option || 'A').trim().toUpperCase();
      const explanation = (data.explanation || '').trim();

      if (qid && text && optA && optB) {
        if (!topicId || topicId === 'AUTO') {
          let topic = db.prepare('SELECT id FROM topics WHERE course_id = ? LIMIT 1').get(courseId);
          topicId = topic ? topic.id : null;
        }
        db.prepare('UPDATE questions SET topic_id = ?, text = ?, a = ?, b = ?, c = ?, d = ?, correct_option = ?, explanation = ? WHERE id = ?').run(topicId, text, optA, optB, optC, optD, correct, explanation, qid);
      }
      res.writeHead(302, { Location: '/?tab=questions' });
      return res.end();
    }

    // Bulk Add Questions (Topic by Topic Parsing)
    if (pathname === '/action/bulk_add_questions') {
      const courseId = data.course_id;
      let defaultTopicId = data.topic_id;
      const rawText = (data.bulk_text || '').trim();

      if (courseId && rawText) {
        const courseTopics = db.prepare('SELECT * FROM topics WHERE course_id = ?').all();
        let currentTopicId = (defaultTopicId && defaultTopicId !== 'AUTO') ? defaultTopicId : (courseTopics[0]?.id || null);

        if (!currentTopicId) {
          currentTopicId = 'topic_' + Math.random().toString(36).substring(2, 10);
          db.prepare('INSERT INTO topics (id, course_id, name) VALUES (?, ?, ?)').run(currentTopicId, courseId, 'General Curriculum');
          courseTopics.push({ id: currentTopicId, course_id: courseId, name: 'General Curriculum' });
        }

        const rawLines = rawText.split('\n').map(l => l.trim());
        let currentBlock = [];
        let blocks = [];

        for (let i = 0; i < rawLines.length; i++) {
          const line = rawLines[i];
          if (/^---+$/.test(line)) {
            if (currentBlock.length > 0) {
              blocks.push(currentBlock);
              currentBlock = [];
            }
          } else {
            currentBlock.push(line);
          }
        }
        if (currentBlock.length > 0) blocks.push(currentBlock);

        let imported = 0;
        const insertQ = db.prepare(`
          INSERT INTO questions (id, topic_id, text, a, b, c, d, correct_option, explanation)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const blockLines of blocks) {
          let qText = '', optA = '', optB = '', optC = '', optD = '', ans = 'A', exp = '';
          let blockTopicId = currentTopicId;

          for (const line of blockLines) {
            if (!line) continue;

            // Detect inline topic header: e.g. "TOPIC: Kidney and Homeostasis"
            const topicMatch = line.match(/^(?:TOPIC|Topic|TOPIC NAME)[\.:\s]\s*(.+)$/i);
            if (topicMatch) {
              const specifiedName = topicMatch[1].trim();
              const matched = courseTopics.find(t => 
                t.name.toLowerCase() === specifiedName.toLowerCase() ||
                t.name.toLowerCase().includes(specifiedName.toLowerCase()) ||
                specifiedName.toLowerCase().includes(t.name.toLowerCase())
              );
              if (matched) {
                currentTopicId = matched.id;
                blockTopicId = matched.id;
              } else {
                const newTid = 'topic_' + Math.random().toString(36).substring(2, 10);
                db.prepare('INSERT INTO topics (id, course_id, name) VALUES (?, ?, ?)').run(newTid, courseId, specifiedName);
                courseTopics.push({ id: newTid, course_id: courseId, name: specifiedName });
                currentTopicId = newTid;
                blockTopicId = newTid;
              }
              continue;
            }

            if (/^(?:Q|Question|\d+)[\.:\)]?\s*/i.test(line) && !/^(?:ANS|Answer|EXP|Option)/i.test(line)) {
              qText = line.replace(/^(?:Q|Question|\d+)[\.:\)]?\s*/i, '').trim();
            } else if (/^(?:A[\.:\)]|\(A\))\s*/i.test(line)) {
              optA = line.replace(/^(?:A[\.:\)]|\(A\))\s*/i, '').trim();
            } else if (/^(?:B[\.:\)]|\(B\))\s*/i.test(line)) {
              optB = line.replace(/^(?:B[\.:\)]|\(B\))\s*/i, '').trim();
            } else if (/^(?:C[\.:\)]|\(C\))\s*/i.test(line)) {
              optC = line.replace(/^(?:C[\.:\)]|\(C\))\s*/i, '').trim();
            } else if (/^(?:D[\.:\)]|\(D\))\s*/i.test(line)) {
              optD = line.replace(/^(?:D[\.:\)]|\(D\))\s*/i, '').trim();
            } else if (/^(?:ANS|ANSWER|Correct|Key)[\.:\s]\s*([A-D])/i.test(line)) {
              const m = line.match(/^(?:ANS|ANSWER|Correct|Key)[\.:\s]\s*([A-D])/i);
              if (m) ans = m[1].toUpperCase();
            } else if (/^(?:EXP|Explanation|Reason)[\.:\s]\s*/i.test(line)) {
              exp = line.replace(/^(?:EXP|Explanation|Reason)[\.:\s]\s*/i, '').trim();
            } else if (!qText && !/^[A-D][\.:\)]/i.test(line)) {
              qText = line;
            }
          }

          if (qText && optA && optB) {
            const qid = 'q_' + Math.random().toString(36).substring(2, 12);
            insertQ.run(qid, blockTopicId, qText, optA, optB, optC, optD, ans, exp);
            imported++;
          }
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(renderHtml('questions', `Parsed and saved ${imported} questions topic-by-topic successfully!`));
      }

      res.writeHead(302, { Location: '/?tab=questions' });
    }

    // Delete Question
    if (pathname === '/action/delete_question') {
      const qid = data.question_id;
      if (qid) {
        db.prepare('DELETE FROM questions WHERE id = ?').run(qid);
      }
      res.writeHead(302, { Location: '/?tab=questions' });
      return res.end();
    }

    // Add Student Manually
    if (pathname === '/action/add_student') {
      const name = (data.name || '').trim();
      const matric = (data.matric_no || '').trim().toUpperCase().replace(/\s+/g, '');
      const dept = (data.department || '').trim();
      const pass = (data.password || '123456').trim();
      const phone = (data.phone || '').trim();

      if (name && matric && dept) {
        const sid = bin2hexId();
        db.prepare(`
          INSERT INTO students (id, name, matric_no, password, department, phone, strength) 
          VALUES (?, ?, ?, ?, ?, ?, 'Clinical Sciences')
          ON CONFLICT(matric_no) DO UPDATE SET 
            name = excluded.name, 
            password = excluded.password, 
            department = excluded.department, 
            phone = excluded.phone
        `).run(sid, name, matric, pass, dept, phone);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(renderHtml('candidates', `Student "${name}" (${matric}) registered successfully!`));
      }
      res.writeHead(302, { Location: '/?tab=candidates' });
      return res.end();
    }

    // Delete Student
    if (pathname === '/action/delete_student') {
      const sid = data.student_id;
      if (sid) {
        db.prepare('DELETE FROM results WHERE student_id = ?').run(sid);
        db.prepare('DELETE FROM exam_sessions WHERE student_id = ?').run(sid);
        db.prepare('DELETE FROM students WHERE id = ?').run(sid);
      }
      res.writeHead(302, { Location: '/?tab=candidates' });
      return res.end();
    }

    // Allow Retake
    if (pathname === '/action/allow_retake') {
      const sid = data.student_id;
      const cid = data.course_id;
      if (sid && cid) {
        db.prepare('DELETE FROM results WHERE student_id = ? AND course_id = ?').run(sid, cid);
        db.prepare('DELETE FROM exam_sessions WHERE student_id = ? AND course_id = ?').run(sid, cid);
      }
      res.writeHead(302, { Location: '/?tab=candidates' });
      return res.end();
    }

    // Pull / Download Live Students and Sessions from Live Website
    if (pathname === '/action/pull_live_students') {
      try {
        const resSync = await syncWithLivePortal(data.website_url);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(renderHtml('candidates', `Synchronized successfully! (${resSync.importedStudents} students, ${resSync.importedSessions} exam sessions, ${resSync.importedResults} results)`));
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(renderHtml('candidates', `Notice: Could not connect to live portal (${err.message})`, 'error'));
      }
    }

    // Publish to Website (Clean, robust sync)
    if (pathname === '/sync') {
      exec(`"${GIT_PATH}" add premed_portal.sqlite`, { cwd: __dirname }, (addErr) => {
        exec(`"${GIT_PATH}" diff --cached --name-only premed_portal.sqlite`, { cwd: __dirname }, (diffErr, diffOut) => {
          const hasStaged = diffOut && diffOut.trim().includes('premed_portal.sqlite');

          const pushToRemote = (noticeMsg) => {
            exec(`"${GIT_PATH}" -c credential.helper="" -c http.sslVerify=false push origin main`, { cwd: __dirname }, (pushErr, stdout, stderr) => {
              const out = (stdout || '') + ' ' + (stderr || '');
              if (pushErr && !out.includes('Everything up-to-date') && !out.includes('main -> main')) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                return res.end(renderHtml('home', 'Notice: ' + (stderr || pushErr.message), 'error'));
              }
              res.writeHead(200, { 'Content-Type': 'text/html' });
              return res.end(renderHtml('home', noticeMsg, 'success'));
            });
          };

          if (hasStaged) {
            exec(`"${GIT_PATH}" commit -m "Admin sync: update questions and portal database"`, { cwd: __dirname }, (commitErr) => {
              pushToRemote('All changes successfully published to the live website!');
            });
          } else {
            pushToRemote('Live website is already up to date with your local changes.');
          }
        });
      });
      return;
    }
  }

  // GET requests
  const tab = url.searchParams.get('tab') || 'home';
  const editCourseId = url.searchParams.get('edit_course');
  const editQuestionId = url.searchParams.get('edit_question');

  // Background auto-sync poll
  if (pathname === '/action/auto_sync_status') {
    let siteUrl = getSetting('live_website_url', 'https://premed-test-portal.vercel.app').replace(/\/$/, '');
    if (!siteUrl.startsWith('http')) siteUrl = 'https://' + siteUrl;
    try {
      const remoteData = await fetchHttpJson(siteUrl + '/sync_live_data.php');
      let updated = false;

      if (Array.isArray(remoteData.sessions)) {
        for (const se of remoteData.sessions) {
          const existing = db.prepare('SELECT updated_at, status, tab_switches FROM exam_sessions WHERE id = ?').get(se.id);
          if (!existing || existing.status !== se.status || existing.tab_switches !== se.tab_switches) {
            updated = true;
          }
          db.prepare(`
            INSERT INTO exam_sessions (id, student_id, matric_no, student_name, course_id, course_code, status, tab_switches, cheating_log, total_score, total_questions, percentage, grade, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              status = excluded.status,
              tab_switches = excluded.tab_switches,
              cheating_log = excluded.cheating_log,
              total_score = excluded.total_score,
              total_questions = excluded.total_questions,
              percentage = excluded.percentage,
              grade = excluded.grade,
              updated_at = excluded.updated_at
          `).run(
            se.id, se.student_id, se.matric_no, se.student_name, se.course_id, se.course_code,
            se.status, se.tab_switches || 0, se.cheating_log || '[]',
            se.total_score || 0, se.total_questions || 0, se.percentage || 0, se.grade || '',
            se.updated_at || new Date().toISOString()
          );
        }
      }

      if (Array.isArray(remoteData.results)) {
        for (const r of remoteData.results) {
          db.prepare(`
            INSERT INTO results (id, student_id, course_id, total_score, total_questions, percentage, grade, time_spent, tab_switches, is_flagged_cheating, cheating_log)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              total_score = excluded.total_score,
              percentage = excluded.percentage,
              grade = excluded.grade,
              tab_switches = excluded.tab_switches,
              is_flagged_cheating = excluded.is_flagged_cheating,
              cheating_log = excluded.cheating_log
          `).run(
            r.id, r.student_id, r.course_id, r.total_score, r.total_questions, r.percentage, r.grade,
            r.time_spent || 0, r.tab_switches || 0, r.is_flagged_cheating || 0, r.cheating_log || '[]'
          );
        }
      }

      if (Array.isArray(remoteData.tests)) {
        for (const t of remoteData.tests) {
          db.prepare(`
            INSERT INTO tests (id, title, course_id, topic_ids, duration, question_limit, attempts_allowed, is_live, auto_submit, enforce_fullscreen, max_tab_switches, shuffle_questions, shuffle_options, calculator_allowed, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              course_id = excluded.course_id,
              topic_ids = excluded.topic_ids,
              duration = excluded.duration,
              question_limit = excluded.question_limit,
              attempts_allowed = excluded.attempts_allowed,
              is_live = excluded.is_live,
              auto_submit = excluded.auto_submit,
              enforce_fullscreen = excluded.enforce_fullscreen,
              max_tab_switches = excluded.max_tab_switches,
              shuffle_questions = excluded.shuffle_questions,
              shuffle_options = excluded.shuffle_options,
              calculator_allowed = excluded.calculator_allowed,
              updated_at = excluded.updated_at
          `).run(
            t.id, t.title, t.course_id, t.topic_ids || '["ALL"]',
            t.duration || 30, t.question_limit || 20, t.attempts_allowed || 1,
            t.is_live !== undefined ? t.is_live : 1,
            t.auto_submit !== undefined ? t.auto_submit : 1,
            t.enforce_fullscreen !== undefined ? t.enforce_fullscreen : 1,
            t.max_tab_switches || 3,
            t.shuffle_questions !== undefined ? t.shuffle_questions : 1,
            t.shuffle_options !== undefined ? t.shuffle_options : 1,
            t.calculator_allowed !== undefined ? t.calculator_allowed : 1,
            t.updated_at || new Date().toISOString()
          );
        }
      }

      if (Array.isArray(remoteData.students)) {
        for (const s of remoteData.students) {
          db.prepare(`
            INSERT INTO students (id, name, matric_no, password, department, phone, strength)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(matric_no) DO UPDATE SET
              name = excluded.name,
              password = excluded.password,
              department = excluded.department,
              phone = excluded.phone
          `).run(s.id, s.name, s.matric_no, s.password, s.department, s.phone || '', s.strength || 'Clinical Sciences');
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'ok', has_update: updated }));
    } catch(e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'offline' }));
    }
  }

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(renderHtml(tab, null, 'success', editCourseId, editQuestionId));
});

function bin2hexId() {
  return 'st_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
}

async function syncWithLivePortal(overrideUrl = null) {
  let siteUrl = (overrideUrl || getSetting('live_website_url', 'https://premed-test-portal.vercel.app')).trim();
  siteUrl = siteUrl.replace(/\/$/, '');
  if (!siteUrl.startsWith('http')) siteUrl = 'https://' + siteUrl;
  setSetting('live_website_url', siteUrl);

  const endpoint = siteUrl + '/sync_live_data.php';
  const remoteData = await fetchHttpJson(endpoint);
  let importedStudents = 0;
  let importedResults = 0;
  let importedSessions = 0;

  if (Array.isArray(remoteData.students)) {
    for (const s of remoteData.students) {
      db.prepare(`
        INSERT INTO students (id, name, matric_no, password, department, phone, strength)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(matric_no) DO UPDATE SET
          name = excluded.name,
          password = excluded.password,
          department = excluded.department,
          phone = excluded.phone
      `).run(s.id, s.name, s.matric_no, s.password, s.department, s.phone || '', s.strength || 'Clinical Sciences');
      importedStudents++;
    }
  }

  if (Array.isArray(remoteData.sessions)) {
    for (const se of remoteData.sessions) {
      db.prepare(`
        INSERT INTO exam_sessions (id, student_id, matric_no, student_name, course_id, course_code, status, tab_switches, cheating_log, total_score, total_questions, percentage, grade, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          status = excluded.status,
          tab_switches = excluded.tab_switches,
          cheating_log = excluded.cheating_log,
          total_score = excluded.total_score,
          total_questions = excluded.total_questions,
          percentage = excluded.percentage,
          grade = excluded.grade,
          updated_at = excluded.updated_at
      `).run(
        se.id, se.student_id, se.matric_no, se.student_name, se.course_id, se.course_code,
        se.status, se.tab_switches || 0, se.cheating_log || '[]',
        se.total_score || 0, se.total_questions || 0, se.percentage || 0, se.grade || '',
        se.updated_at || new Date().toISOString()
      );
      importedSessions++;
    }
  }

  if (Array.isArray(remoteData.results)) {
    for (const r of remoteData.results) {
      db.prepare(`
        INSERT INTO results (id, student_id, course_id, total_score, total_questions, percentage, grade, time_spent, tab_switches, is_flagged_cheating, cheating_log)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          total_score = excluded.total_score,
          percentage = excluded.percentage,
          grade = excluded.grade,
          tab_switches = excluded.tab_switches,
          is_flagged_cheating = excluded.is_flagged_cheating,
          cheating_log = excluded.cheating_log
      `).run(
        r.id, r.student_id, r.course_id, r.total_score, r.total_questions, r.percentage, r.grade,
        r.time_spent || 0, r.tab_switches || 0, r.is_flagged_cheating || 0, r.cheating_log || '[]'
      );
      importedResults++;
    }
  }

  let importedTests = 0;
  if (Array.isArray(remoteData.tests)) {
    for (const t of remoteData.tests) {
      db.prepare(`
        INSERT INTO tests (id, title, course_id, topic_ids, duration, question_limit, attempts_allowed, is_live, auto_submit, enforce_fullscreen, max_tab_switches, shuffle_questions, shuffle_options, calculator_allowed, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          course_id = excluded.course_id,
          topic_ids = excluded.topic_ids,
          duration = excluded.duration,
          question_limit = excluded.question_limit,
          attempts_allowed = excluded.attempts_allowed,
          is_live = excluded.is_live,
          auto_submit = excluded.auto_submit,
          enforce_fullscreen = excluded.enforce_fullscreen,
          max_tab_switches = excluded.max_tab_switches,
          shuffle_questions = excluded.shuffle_questions,
          shuffle_options = excluded.shuffle_options,
          calculator_allowed = excluded.calculator_allowed,
          updated_at = excluded.updated_at
      `).run(
        t.id, t.title, t.course_id, t.topic_ids || '["ALL"]',
        t.duration || 30, t.question_limit || 20, t.attempts_allowed || 1,
        t.is_live !== undefined ? t.is_live : 1,
        t.auto_submit !== undefined ? t.auto_submit : 1,
        t.enforce_fullscreen !== undefined ? t.enforce_fullscreen : 1,
        t.max_tab_switches || 3,
        t.shuffle_questions !== undefined ? t.shuffle_questions : 1,
        t.shuffle_options !== undefined ? t.shuffle_options : 1,
        t.calculator_allowed !== undefined ? t.calculator_allowed : 1,
        t.updated_at || new Date().toISOString()
      );
      importedTests++;
    }
  }

  return { importedStudents, importedSessions, importedResults, importedTests };
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use by another process.`);
  } else {
    console.error('[Server Error]', err);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Premed Admin Server running on http://localhost:' + PORT);
  setImmediate(async () => {
    try {
      const res = await syncWithLivePortal();
      console.log(`[Startup Live Sync] Synced ${res.importedStudents} students, ${res.importedSessions} sessions, ${res.importedResults} results from live website.`);
    } catch (err) {
      console.log('[Startup Live Sync] Notice:', err.message);
    }
  });
});
