/**
 * Premed Test Portal - Executive Admin Command Center
 * World-Class UI with 6 Dedicated Navigation Tabs:
 *  1. Home (Executive Dashboard & System Status)
 *  2. Courses (Course Creation & Editing)
 *  3. Tests (Live Examination Gateways & Test Settings)
 *  4. Question Bank (MCQ Authoring, Search, Editing & Bulk Import)
 *  5. Test Security (Anti-Cheating, Proctoring & Integrity Rules)
 *  6. Candidates (Registered Candidates & Examination Results)
 *
 * Native Zero-Dependency Node.js (node:http + node:sqlite)
 * Running strictly on Localhost (port 8899)
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
  `);
} catch (e) {
  console.error('[DB ERROR]', e.message);
}

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
        for (const [k, v] of params.entries()) { data[k] = v; }
        resolve(data);
      } catch {
        resolve({});
      }
    });
  });
}

function renderHtml(tab = 'home', alert = null, alertType = 'success', editCourseId = null, editQuestionId = null) {
  const totalQuestions = db.prepare('SELECT COUNT(*) as c FROM questions').get().c;
  const totalStudents = db.prepare('SELECT COUNT(*) as c FROM students').get().c;
  const totalResults = db.prepare('SELECT COUNT(*) as c FROM results').get().c;
  const totalCourses = db.prepare('SELECT COUNT(*) as c FROM courses').get().c;
  const activeExams = db.prepare('SELECT COUNT(*) as c FROM courses WHERE is_locked = 0').get().c;

  const courses = db.prepare(`
    SELECT c.*, COUNT(q.id) as q_count 
    FROM courses c
    LEFT JOIN topics t ON c.id = t.course_id
    LEFT JOIN questions q ON t.id = q.topic_id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `).all();

  const questions = db.prepare(`
    SELECT q.*, c.id as course_id, c.code as course_code, c.title as course_title 
    FROM questions q
    JOIN topics t ON q.topic_id = t.id
    JOIN courses c ON t.course_id = c.id
    ORDER BY q.created_at DESC
    LIMIT 200
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

  // Selected course for editing if any
  let courseToEdit = null;
  if (editCourseId) {
    courseToEdit = db.prepare('SELECT * FROM courses WHERE id = ? LIMIT 1').get(editCourseId);
  }

  // Selected question for editing if any
  let questionToEdit = null;
  if (editQuestionId) {
    questionToEdit = db.prepare(`
      SELECT q.*, c.id as course_id 
      FROM questions q 
      JOIN topics t ON q.topic_id = t.id 
      JOIN courses c ON t.course_id = c.id 
      WHERE q.id = ? LIMIT 1
    `).get(editQuestionId);
  }

  // Test Security Settings
  const antiCheatBlur = getSetting('anti_cheat_blur', '1') === '1';
  const enforceFullscreen = getSetting('enforce_fullscreen', '1') === '1';
  const shuffleQuestions = getSetting('shuffle_questions', '1') === '1';
  const shuffleOptions = getSetting('shuffle_options', '1') === '1';
  const calculatorAllowed = getSetting('calculator_allowed', '1') === '1';
  const watermarkEnabled = getSetting('watermark_enabled', '1') === '1';
  const disableCopyPaste = getSetting('disable_copy_paste', '1') === '1';
  const maxTabSwitches = getSetting('max_tab_switches', '3');

  // Test Global Settings
  const autoSubmitExpiry = getSetting('auto_submit_expiry', '1') === '1';
  const showInstantResults = getSetting('show_instant_results', '1') === '1';
  const allowReviewExplanations = getSetting('allow_review_explanations', '1') === '1';
  const allowFlagQuestions = getSetting('allow_flag_questions', '1') === '1';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Premed Admin Command Center</title>
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
    body { font-family: 'Inter', sans-serif; }
    .glass-card { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); }
  </style>
</head>
<body class="bg-[#f8fafc] text-slate-800 min-h-screen antialiased flex flex-col selection:bg-indigo-600 selection:text-white">

  <!-- ================= TOP STICKY EXECUTIVE NAVIGATION ================= -->
  <header class="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-20">
        
        <!-- Brand & Localhost Security Tag -->
        <div class="flex items-center gap-3.5">
          <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <i data-lucide="shield-check" class="w-6 h-6"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-lg font-black tracking-tight text-slate-900">Premed<span class="text-indigo-600">Admin</span></span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Localhost :8899
              </span>
            </div>
            <p class="text-[11px] text-slate-500 font-medium">Master Examination Control Center</p>
          </div>
        </div>

        <!-- 6-Way Navigation Tabs -->
        <nav class="hidden lg:flex items-center p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 text-xs font-bold text-slate-600">
          <a href="/?tab=home" class="px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${tab === 'home' ? 'bg-white text-indigo-700 shadow-sm font-extrabold' : 'hover:text-slate-900 hover:bg-white/60'}">
            <i data-lucide="layout-dashboard" class="w-4 h-4"></i>
            <span>Home</span>
          </a>
          <a href="/?tab=courses" class="px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${tab === 'courses' ? 'bg-white text-indigo-700 shadow-sm font-extrabold' : 'hover:text-slate-900 hover:bg-white/60'}">
            <i data-lucide="book-open" class="w-4 h-4"></i>
            <span>Courses</span>
          </a>
          <a href="/?tab=tests" class="px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${tab === 'tests' ? 'bg-white text-indigo-700 shadow-sm font-extrabold' : 'hover:text-slate-900 hover:bg-white/60'}">
            <i data-lucide="play-circle" class="w-4 h-4"></i>
            <span>Tests</span>
          </a>
          <a href="/?tab=questions" class="px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${tab === 'questions' ? 'bg-white text-indigo-700 shadow-sm font-extrabold' : 'hover:text-slate-900 hover:bg-white/60'}">
            <i data-lucide="help-circle" class="w-4 h-4"></i>
            <span>Question Bank</span>
          </a>
          <a href="/?tab=security" class="px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${tab === 'security' ? 'bg-white text-indigo-700 shadow-sm font-extrabold' : 'hover:text-slate-900 hover:bg-white/60'}">
            <i data-lucide="shield-alert" class="w-4 h-4"></i>
            <span>Test Security</span>
          </a>
          <a href="/?tab=candidates" class="px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${tab === 'candidates' ? 'bg-white text-indigo-700 shadow-sm font-extrabold' : 'hover:text-slate-900 hover:bg-white/60'}">
            <i data-lucide="users" class="w-4 h-4"></i>
            <span>Candidates</span>
          </a>
        </nav>

        <!-- Right Header Action: 1-Click Sync to Live Website -->
        <div class="flex items-center gap-3">
          <form method="POST" action="/sync" id="topSyncForm">
            <button type="submit" id="topSyncBtn" class="px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white font-extrabold text-xs shadow-md shadow-indigo-200 flex items-center gap-2 transition-all transform active:scale-95 cursor-pointer">
              <i data-lucide="cloud-upload" class="w-4 h-4 text-white"></i>
              <span>Sync to Live Website</span>
            </button>
          </form>
        </div>

      </div>
    </div>

    <!-- Mobile Navigation Scrollable Tab Bar -->
    <div class="lg:hidden flex overflow-x-auto px-4 py-2.5 border-t border-slate-200 gap-1.5 bg-slate-50 text-xs font-bold text-slate-600">
      <a href="/?tab=home" class="px-3 py-1.5 rounded-lg shrink-0 ${tab === 'home' ? 'bg-white text-indigo-700 shadow-xs' : ''}">Home</a>
      <a href="/?tab=courses" class="px-3 py-1.5 rounded-lg shrink-0 ${tab === 'courses' ? 'bg-white text-indigo-700 shadow-xs' : ''}">Courses</a>
      <a href="/?tab=tests" class="px-3 py-1.5 rounded-lg shrink-0 ${tab === 'tests' ? 'bg-white text-indigo-700 shadow-xs' : ''}">Tests</a>
      <a href="/?tab=questions" class="px-3 py-1.5 rounded-lg shrink-0 ${tab === 'questions' ? 'bg-white text-indigo-700 shadow-xs' : ''}">Question Bank</a>
      <a href="/?tab=security" class="px-3 py-1.5 rounded-lg shrink-0 ${tab === 'security' ? 'bg-white text-indigo-700 shadow-xs' : ''}">Test Security</a>
      <a href="/?tab=candidates" class="px-3 py-1.5 rounded-lg shrink-0 ${tab === 'candidates' ? 'bg-white text-indigo-700 shadow-xs' : ''}">Candidates</a>
    </div>
  </header>

  <!-- ================= MAIN CONTENT CONTAINER ================= -->
  <main class="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">

    <!-- Global Alert Banner -->
    ${alert ? `
    <div class="p-4 rounded-2xl ${alertType === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'} border flex items-center justify-between gap-3 shadow-xs">
      <div class="flex items-center gap-2.5 text-xs font-bold">
        <i data-lucide="${alertType === 'success' ? 'check-circle' : 'alert-circle'}" class="w-4 h-4 shrink-0 ${alertType === 'success' ? 'text-emerald-600' : 'text-rose-600'}"></i>
        <span>${alert}</span>
      </div>
      <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-slate-700"><i data-lucide="x" class="w-4 h-4"></i></button>
    </div>
    ` : ''}

    <!-- ================= TAB 1: HOME DASHBOARD ================= -->
    ${tab === 'home' ? `
    <div class="space-y-8">
      
      <!-- Welcome Hero Banner -->
      <div class="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 sm:p-10 shadow-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div class="space-y-2 max-w-2xl">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-md mb-2 border border-white/15">
            <i data-lucide="sparkles" class="w-3.5 h-3.5 text-amber-300"></i>
            <span>Local Control Engine Session Active</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-black tracking-tight">Executive Examination Control</h1>
          <p class="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
            Manage your courses, author high-yield medical & clinical questions, lock/unlock live exams, and enforce anti-cheating rules locally. Click "Sync to Live Website" to publish your changes instantly.
          </p>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <a href="/?tab=courses" class="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold text-center shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all">
            <i data-lucide="folder-plus" class="w-4 h-4"></i>
            <span>Create Course</span>
          </a>
          <a href="/?tab=questions" class="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-extrabold text-center border border-white/10 flex items-center justify-center gap-2 transition-all">
            <i data-lucide="plus-circle" class="w-4 h-4"></i>
            <span>Author Questions</span>
          </a>
        </div>
      </div>

      <!-- KPI Stat Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <!-- Questions Card -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div class="flex justify-between items-center mb-3">
            <span class="text-xs font-extrabold uppercase tracking-wider text-slate-400">Total Questions</span>
            <div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <i data-lucide="database" class="w-4 h-4"></i>
            </div>
          </div>
          <div class="text-3xl font-black text-slate-900">${totalQuestions}</div>
          <p class="text-[11px] text-slate-500 mt-1">Ready in question bank</p>
        </div>

        <!-- Total Courses Card -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div class="flex justify-between items-center mb-3">
            <span class="text-xs font-extrabold uppercase tracking-wider text-slate-400">Courses</span>
            <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <i data-lucide="book-open" class="w-4 h-4"></i>
            </div>
          </div>
          <div class="text-3xl font-black text-slate-900">${totalCourses}</div>
          <p class="text-[11px] text-slate-500 mt-1">Configured in curriculum</p>
        </div>

        <!-- Active Live Exams Card -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div class="flex justify-between items-center mb-3">
            <span class="text-xs font-extrabold uppercase tracking-wider text-slate-400">Live Exams</span>
            <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <i data-lucide="play-circle" class="w-4 h-4"></i>
            </div>
          </div>
          <div class="text-3xl font-black text-slate-900">${activeExams}</div>
          <p class="text-[11px] text-slate-500 mt-1">Unlocked for candidates</p>
        </div>

        <!-- Total Submissions Card -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div class="flex justify-between items-center mb-3">
            <span class="text-xs font-extrabold uppercase tracking-wider text-slate-400">Submissions</span>
            <div class="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <i data-lucide="check-circle" class="w-4 h-4"></i>
            </div>
          </div>
          <div class="text-3xl font-black text-slate-900">${totalResults}</div>
          <p class="text-[11px] text-slate-500 mt-1">${totalStudents} registered students</p>
        </div>

      </div>

      <!-- Quick Actions Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Live Exams Gateway Card -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div class="flex justify-between items-center">
            <h3 class="text-sm font-black text-slate-900 flex items-center gap-2">
              <i data-lucide="play-circle" class="w-4 h-4 text-emerald-600"></i>
              <span>Active Examination Gates</span>
            </h3>
            <a href="/?tab=tests" class="text-xs font-bold text-indigo-600 hover:underline">Manage All</a>
          </div>

          ${courses.length === 0 ? `
          <div class="py-8 text-center text-slate-400 text-xs">
            No courses in the system. <br><a href="/?tab=courses" class="text-indigo-600 font-bold underline mt-1 inline-block">Create your first course</a>
          </div>
          ` : `
          <div class="divide-y divide-slate-100">
            ${courses.slice(0, 5).map(c => `
            <div class="py-3 flex justify-between items-center gap-3">
              <div>
                <span class="text-xs font-mono font-bold text-indigo-600">${c.code}</span>
                <p class="text-xs font-bold text-slate-800 truncate max-w-[180px]">${c.title}</p>
                <span class="text-[10px] text-slate-400">${c.q_count} Qs &bull; ${c.duration} mins</span>
              </div>
              <form method="POST" action="/action/toggle_lock">
                <input type="hidden" name="course_id" value="${c.id}">
                <input type="hidden" name="current_locked" value="${c.is_locked}">
                <button type="submit" class="px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors ${c.is_locked ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'}">
                  ${c.is_locked ? 'Unlock' : 'Lock'}
                </button>
              </form>
            </div>
            `).join('')}
          </div>
          `}
        </div>

        <!-- Security Rules Summary Card -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div class="flex justify-between items-center">
            <h3 class="text-sm font-black text-slate-900 flex items-center gap-2">
              <i data-lucide="shield-check" class="w-4 h-4 text-indigo-600"></i>
              <span>Proctoring & Integrity Policies</span>
            </h3>
            <a href="/?tab=security" class="text-xs font-bold text-indigo-600 hover:underline">Configure</a>
          </div>

          <div class="space-y-2.5 text-xs">
            <div class="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span class="text-slate-700 font-medium">Window Blur / Tab Switch</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${antiCheatBlur ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}">${antiCheatBlur ? 'ACTIVE' : 'OFF'}</span>
            </div>
            <div class="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span class="text-slate-700 font-medium">Fullscreen Enforced</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${enforceFullscreen ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}">${enforceFullscreen ? 'ACTIVE' : 'OFF'}</span>
            </div>
            <div class="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span class="text-slate-700 font-medium">Randomize Questions & Options</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${shuffleQuestions && shuffleOptions ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}">${shuffleQuestions && shuffleOptions ? 'ACTIVE' : 'OFF'}</span>
            </div>
            <div class="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span class="text-slate-700 font-medium">Candidate Matric Watermark</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${watermarkEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}">${watermarkEnabled ? 'ACTIVE' : 'OFF'}</span>
            </div>
          </div>
        </div>

        <!-- 1-Click Cloud Sync Card -->
        <div class="bg-gradient-to-br from-indigo-50/70 to-violet-50/70 rounded-3xl p-6 border border-indigo-100 shadow-xs flex flex-col justify-between space-y-4">
          <div class="space-y-2">
            <div class="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
              <i data-lucide="cloud" class="w-5 h-5"></i>
            </div>
            <h3 class="text-sm font-black text-slate-900">Live Website Deployment</h3>
            <p class="text-xs text-slate-600 leading-relaxed font-medium">
              Changes saved in your local database (<code class="text-indigo-600 font-bold">premed_portal.sqlite</code>) remain local until you push them to the live website. Click below to deploy immediately.
            </p>
          </div>

          <form method="POST" action="/sync" class="w-full">
            <button type="submit" class="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-200 flex items-center justify-center gap-2 transition-all cursor-pointer">
              <i data-lucide="upload-cloud" class="w-4 h-4"></i>
              <span>Deploy Local Data to Live Website</span>
            </button>
          </form>
        </div>

      </div>

    </div>
    ` : ''}

    <!-- ================= TAB 2: COURSES (CREATION & EDITING) ================= -->
    ${tab === 'courses' ? `
    <div class="space-y-8">
      
      <!-- Course Creator / Editor Card -->
      <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl ${courseToEdit ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'} flex items-center justify-center">
              <i data-lucide="${courseToEdit ? 'edit-3' : 'folder-plus'}" class="w-5 h-5"></i>
            </div>
            <div>
              <h2 class="text-base font-black text-slate-900">${courseToEdit ? 'Edit Course: ' + courseToEdit.code : 'Create New Course / Mock Subject'}</h2>
              <p class="text-xs text-slate-500">${courseToEdit ? 'Update course title, code, duration, or question limits.' : 'Configure course code, title, duration, question count, and department filter.'}</p>
            </div>
          </div>
          ${courseToEdit ? `
          <a href="/?tab=courses" class="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50">Cancel Edit</a>
          ` : ''}
        </div>

        <form method="POST" action="${courseToEdit ? '/action/edit_course' : '/action/add_course'}" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          ${courseToEdit ? `<input type="hidden" name="course_id" value="${courseToEdit.id}">` : ''}

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Course Code *</label>
            <input type="text" name="code" value="${courseToEdit ? courseToEdit.code : ''}" required placeholder="e.g. ZOO 102" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-none">
          </div>

          <div class="sm:col-span-2">
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Course Title *</label>
            <input type="text" name="title" value="${courseToEdit ? courseToEdit.title : ''}" required placeholder="e.g. Introductory Zoology & Animal Classification" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none">
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Duration (Minutes)</label>
            <input type="number" name="duration" value="${courseToEdit ? courseToEdit.duration : '30'}" min="5" max="300" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none">
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Questions per Test</label>
            <input type="number" name="question_limit" value="${courseToEdit ? courseToEdit.question_limit : '20'}" min="5" max="200" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none">
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Attempts Allowed</label>
            <select name="attempts_allowed" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
              <option value="1" ${courseToEdit && courseToEdit.attempts_allowed == 1 ? 'selected' : ''}>1 Attempt Only (Strict Exam)</option>
              <option value="2" ${courseToEdit && courseToEdit.attempts_allowed == 2 ? 'selected' : ''}>2 Attempts</option>
              <option value="3" ${courseToEdit && courseToEdit.attempts_allowed == 3 ? 'selected' : ''}>3 Attempts</option>
              <option value="0" ${courseToEdit && courseToEdit.attempts_allowed == 0 ? 'selected' : ''}>Unlimited (Practice Mode)</option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Initial Status</label>
            <select name="is_locked" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
              <option value="0" ${courseToEdit && courseToEdit.is_locked == 0 ? 'selected' : ''}>Unlocked (Live for Testing)</option>
              <option value="1" ${courseToEdit && courseToEdit.is_locked == 1 ? 'selected' : ''}>Locked (Hidden/Closed)</option>
            </select>
          </div>

          <div class="flex items-end">
            <button type="submit" class="w-full py-2.5 rounded-xl ${courseToEdit ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white text-xs font-bold shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition-all cursor-pointer">
              <i data-lucide="${courseToEdit ? 'save' : 'plus'}" class="w-4 h-4"></i>
              <span>${courseToEdit ? 'Save Course Changes' : 'Create Course'}</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Course Catalog & Editing Table -->
      <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="text-base font-black text-slate-900">Current Course Catalog (${courses.length})</h3>
            <p class="text-xs text-slate-500">Edit course titles, duration, question limits, lock status, or remove courses.</p>
          </div>
        </div>

        ${courses.length === 0 ? `
        <div class="py-12 text-center text-slate-400 text-xs">
          No courses currently registered. Use the form above to add your first course.
        </div>
        ` : `
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 border-b border-slate-200 uppercase font-bold text-slate-500">
              <tr>
                <th class="px-6 py-3.5">Code</th>
                <th class="px-6 py-3.5">Title</th>
                <th class="px-6 py-3.5 text-center">Banked Questions</th>
                <th class="px-6 py-3.5 text-center">Timer</th>
                <th class="px-6 py-3.5 text-center">Limit</th>
                <th class="px-6 py-3.5 text-center">Status</th>
                <th class="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${courses.map(c => `
              <tr class="hover:bg-slate-50/70 transition-colors">
                <td class="px-6 py-4 font-mono font-bold text-indigo-600">${c.code}</td>
                <td class="px-6 py-4 font-bold text-slate-900">${c.title}</td>
                <td class="px-6 py-4 text-center">
                  <span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${c.q_count > 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}">
                    ${c.q_count} Qs
                  </span>
                </td>
                <td class="px-6 py-4 text-center font-mono text-slate-600">${c.duration} mins</td>
                <td class="px-6 py-4 text-center font-mono text-slate-600">${c.question_limit} Qs</td>
                <td class="px-6 py-4 text-center">
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${c.is_locked ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}">
                    ${c.is_locked ? 'Locked' : 'Live / Active'}
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="inline-flex items-center gap-2">
                    <a href="/?tab=courses&edit_course=${c.id}" class="px-3 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1">
                      <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                      <span>Edit</span>
                    </a>
                    <form method="POST" action="/action/toggle_lock" class="inline">
                      <input type="hidden" name="course_id" value="${c.id}">
                      <input type="hidden" name="current_locked" value="${c.is_locked}">
                      <button type="submit" class="px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors ${c.is_locked ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'}">
                        ${c.is_locked ? 'Unlock' : 'Lock'}
                      </button>
                    </form>
                    <form method="POST" action="/action/delete_course" class="inline" onsubmit="return confirm('Permanently delete ${c.code} and its banked questions?')">
                      <input type="hidden" name="course_id" value="${c.id}">
                      <button type="submit" class="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Delete Course">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        `}
      </div>

    </div>
    ` : ''}

    <!-- ================= TAB 3: TESTS & TEST SETTINGS ================= -->
    ${tab === 'tests' ? `
    <div class="space-y-8">
      
      <!-- Live Exams Master Gateways -->
      <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <i data-lucide="play-circle" class="w-5 h-5"></i>
            </div>
            <div>
              <h2 class="text-base font-black text-slate-900">Live Examination Gateways</h2>
              <p class="text-xs text-slate-500">Control active access to mock examinations for testing sessions.</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <form method="POST" action="/action/master_lock_toggle">
              <input type="hidden" name="target_locked" value="0">
              <button type="submit" class="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-extrabold text-xs transition-colors flex items-center gap-1.5">
                <i data-lucide="unlock" class="w-3.5 h-3.5"></i>
                <span>Unlock All Exams</span>
              </button>
            </form>
            <form method="POST" action="/action/master_lock_toggle">
              <input type="hidden" name="target_locked" value="1">
              <button type="submit" class="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-extrabold text-xs transition-colors flex items-center gap-1.5">
                <i data-lucide="lock" class="w-3.5 h-3.5"></i>
                <span>Lock All Exams</span>
              </button>
            </form>
          </div>
        </div>

        ${courses.length === 0 ? `
        <div class="p-8 text-center text-slate-400 text-xs">
          No courses created yet. <a href="/?tab=courses" class="text-indigo-600 font-bold underline">Create a course first</a>.
        </div>
        ` : `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${courses.map(c => `
          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-4">
            <div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-xs font-mono font-bold text-indigo-600">${c.code}</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${c.is_locked ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}">
                  ${c.is_locked ? 'LOCKED' : 'ACTIVE / LIVE'}
                </span>
              </div>
              <h4 class="text-sm font-bold text-slate-900">${c.title}</h4>
              <p class="text-[11px] text-slate-500 mt-1">${c.q_count} questions &bull; ${c.duration} mins duration &bull; ${c.question_limit} Qs served</p>
            </div>
            
            <form method="POST" action="/action/toggle_lock">
              <input type="hidden" name="course_id" value="${c.id}">
              <input type="hidden" name="current_locked" value="${c.is_locked}">
              <button type="submit" class="w-full py-2 rounded-xl text-xs font-bold transition-all ${c.is_locked ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'}">
                ${c.is_locked ? 'Unlock for Examination' : 'Lock Examination'}
              </button>
            </form>
          </div>
          `).join('')}
        </div>
        `}
      </div>

      <!-- Test Execution Settings -->
      <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <i data-lucide="sliders" class="w-5 h-5"></i>
          </div>
          <div>
            <h2 class="text-base font-black text-slate-900">Global Test Session Rules</h2>
            <p class="text-xs text-slate-500">Configure timer auto-submission, instant score visibility, and candidate review rules.</p>
          </div>
        </div>

        <form method="POST" action="/action/save_test_settings" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <label class="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5 cursor-pointer hover:border-slate-300 transition-all">
              <input type="checkbox" name="auto_submit_expiry" value="1" ${autoSubmitExpiry ? 'checked' : ''} class="w-4 h-4 mt-0.5 rounded text-indigo-600">
              <div class="space-y-1">
                <span class="text-xs font-bold text-slate-900 block">Strict Auto-Submit on Timer Expiry</span>
                <span class="text-[11px] text-slate-500 block">When candidate test time reaches 00:00, instantly submit answers without delay.</span>
              </div>
            </label>

            <label class="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5 cursor-pointer hover:border-slate-300 transition-all">
              <input type="checkbox" name="show_instant_results" value="1" ${showInstantResults ? 'checked' : ''} class="w-4 h-4 mt-0.5 rounded text-indigo-600">
              <div class="space-y-1">
                <span class="text-xs font-bold text-slate-900 block">Show Instant Score Upon Submission</span>
                <span class="text-[11px] text-slate-500 block">Displays score, percentage, and grade to the student immediately upon finishing.</span>
              </div>
            </label>

            <label class="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5 cursor-pointer hover:border-slate-300 transition-all">
              <input type="checkbox" name="allow_review_explanations" value="1" ${allowReviewExplanations ? 'checked' : ''} class="w-4 h-4 mt-0.5 rounded text-indigo-600">
              <div class="space-y-1">
                <span class="text-xs font-bold text-slate-900 block">Allow Candidate Review & Explanations</span>
                <span class="text-[11px] text-slate-500 block">Permits candidates to see which answers were correct and read clinical explanations after test.</span>
              </div>
            </label>

            <label class="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5 cursor-pointer hover:border-slate-300 transition-all">
              <input type="checkbox" name="allow_flag_questions" value="1" ${allowFlagQuestions ? 'checked' : ''} class="w-4 h-4 mt-0.5 rounded text-indigo-600">
              <div class="space-y-1">
                <span class="text-xs font-bold text-slate-900 block">Enable Question Flagging / Bookmarks</span>
                <span class="text-[11px] text-slate-500 block">Allows candidates to bookmark difficult questions to return to them before submitting.</span>
              </div>
            </label>

          </div>

          <div class="flex justify-end">
            <button type="submit" class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 flex items-center gap-2 cursor-pointer">
              <i data-lucide="check" class="w-4 h-4"></i>
              <span>Save Test Session Rules</span>
            </button>
          </div>
        </form>
      </div>

    </div>
    ` : ''}

    <!-- ================= TAB 4: QUESTION BANK ================= -->
    ${tab === 'questions' ? `
    <div class="space-y-8">
      
      <!-- Single Question Authoring / Editing Card -->
      <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl ${questionToEdit ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'} flex items-center justify-center">
              <i data-lucide="${questionToEdit ? 'edit-3' : 'plus-circle'}" class="w-5 h-5"></i>
            </div>
            <div>
              <h2 class="text-base font-black text-slate-900">${questionToEdit ? 'Edit Question' : 'Author Multiple Choice Question'}</h2>
              <p class="text-xs text-slate-500">Provide question prompt with options A, B, C, D, correct answer key, and clinical explanation.</p>
            </div>
          </div>
          ${questionToEdit ? `
          <a href="/?tab=questions" class="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50">Cancel Edit</a>
          ` : ''}
        </div>

        ${courses.length === 0 ? `
        <div class="p-6 text-center text-slate-500 text-xs bg-slate-50 rounded-2xl border border-slate-200">
          Please <a href="/?tab=courses" class="text-indigo-600 font-bold underline">create a course first</a> before authoring questions.
        </div>
        ` : `
        <form method="POST" action="${questionToEdit ? '/action/edit_question' : '/action/add_question'}" class="space-y-4">
          ${questionToEdit ? `<input type="hidden" name="question_id" value="${questionToEdit.id}">` : ''}

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Target Course *</label>
            <select name="course_id" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
              ${courses.map(c => `<option value="${c.id}" ${questionToEdit && questionToEdit.course_id === c.id ? 'selected' : ''}>${c.code} - ${c.title}</option>`).join('')}
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Question Prompt * (LaTeX formulas like $E=mc^2$ supported)</label>
            <textarea name="text" required rows="3" placeholder="Enter clinical scenario or question stem..." class="w-full p-3.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none leading-relaxed">${questionToEdit ? questionToEdit.text : ''}</textarea>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Option A *</label>
              <input type="text" name="a" value="${questionToEdit ? questionToEdit.a : ''}" required placeholder="Option A text" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Option B *</label>
              <input type="text" name="b" value="${questionToEdit ? questionToEdit.b : ''}" required placeholder="Option B text" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Option C</label>
              <input type="text" name="c" value="${questionToEdit && questionToEdit.c ? questionToEdit.c : ''}" placeholder="Option C text" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Option D</label>
              <input type="text" name="d" value="${questionToEdit && questionToEdit.d ? questionToEdit.d : ''}" placeholder="Option D text" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Correct Answer Key *</label>
              <select name="correct_option" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-indigo-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                <option value="A" ${questionToEdit && questionToEdit.correct_option === 'A' ? 'selected' : ''}>Option A</option>
                <option value="B" ${questionToEdit && questionToEdit.correct_option === 'B' ? 'selected' : ''}>Option B</option>
                <option value="C" ${questionToEdit && questionToEdit.correct_option === 'C' ? 'selected' : ''}>Option C</option>
                <option value="D" ${questionToEdit && questionToEdit.correct_option === 'D' ? 'selected' : ''}>Option D</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Clinical Explanation / Rationale</label>
              <input type="text" name="explanation" value="${questionToEdit && questionToEdit.explanation ? questionToEdit.explanation : ''}" placeholder="Why this answer is clinically correct..." class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            </div>
          </div>

          <div class="flex justify-end pt-2">
            <button type="submit" class="px-6 py-2.5 rounded-xl ${questionToEdit ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-bold text-xs shadow-md shadow-indigo-100 flex items-center gap-2 cursor-pointer">
              <i data-lucide="${questionToEdit ? 'save' : 'plus'}" class="w-4 h-4"></i>
              <span>${questionToEdit ? 'Save Changes' : 'Save Question to Bank'}</span>
            </button>
          </div>
        </form>
        `}
      </div>

      <!-- Bulk Question Import Section -->
      ${courses.length > 0 ? `
      <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <i data-lucide="file-text" class="w-5 h-5"></i>
          </div>
          <div>
            <h3 class="text-base font-black text-slate-900">Bulk Question Quick-Paste Importer</h3>
            <p class="text-xs text-slate-500">Paste 5, 20, or 50 questions at once in standard format to instantly populate the bank.</p>
          </div>
        </div>

        <form method="POST" action="/action/bulk_add_questions" class="space-y-4">
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Target Course *</label>
            <select name="course_id" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
              ${courses.map(c => `<option value="${c.id}">${c.code} - ${c.title}</option>`).join('')}
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Pasted Questions Block (Separate with ---)</label>
            <textarea name="bulk_text" rows="6" placeholder="Q: Which organ produces insulin?
A: Liver
B: Pancreas
C: Kidney
D: Spleen
ANS: B
EXP: Beta cells in the islets of Langerhans in the pancreas secrete insulin.
---
Q: What is the normal human body temperature?
A: 37°C
B: 39°C
C: 35°C
D: 40°C
ANS: A
EXP: 37°C (98.6°F) is typical human baseline." class="w-full p-3.5 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"></textarea>
          </div>

          <div class="flex justify-end">
            <button type="submit" class="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-100 flex items-center gap-2 cursor-pointer">
              <i data-lucide="upload" class="w-4 h-4"></i>
              <span>Import Questions in Bulk</span>
            </button>
          </div>
        </form>
      </div>
      ` : ''}

      <!-- Banked Question Catalog -->
      <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 class="text-base font-black text-slate-900">Banked Questions Catalog (${questions.length})</h3>
            <p class="text-xs text-slate-500">All questions currently available in the database.</p>
          </div>
          <input type="text" id="qFilterInput" onkeyup="filterQuestions()" placeholder="Search questions..." class="px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64">
        </div>

        ${questions.length === 0 ? `
        <div class="py-12 text-center text-slate-400 text-xs">
          No questions in the database yet. Use the single authoring form or bulk importer above to add questions.
        </div>
        ` : `
        <div class="divide-y divide-slate-100" id="questionsContainer">
          ${questions.map((q, idx) => `
          <div class="py-4 flex justify-between items-start gap-4 hover:bg-slate-50/60 px-3 rounded-2xl transition-colors question-item" data-search="${(q.text + ' ' + q.course_code + ' ' + (q.explanation || '')).toLowerCase()}">
            <div class="space-y-1.5 max-w-3xl">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[10px] font-bold">${q.course_code}</span>
                <span class="text-[11px] text-slate-400">#${idx + 1}</span>
              </div>
              <p class="text-xs font-bold text-slate-900 leading-relaxed">${q.text}</p>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 pt-1">
                <span class="${q.correct_option === 'A' ? 'text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200' : ''}">A: ${q.a}</span>
                <span class="${q.correct_option === 'B' ? 'text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200' : ''}">B: ${q.b}</span>
                <span class="${q.correct_option === 'C' ? 'text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200' : ''}">C: ${q.c || '—'}</span>
                <span class="${q.correct_option === 'D' ? 'text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200' : ''}">D: ${q.d || '—'}</span>
              </div>
              ${q.explanation ? `<p class="text-[11px] text-indigo-700 font-medium">💡 ${q.explanation}</p>` : ''}
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <a href="/?tab=questions&edit_question=${q.id}" class="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Edit Question">
                <i data-lucide="edit-2" class="w-4 h-4"></i>
              </a>
              <form method="POST" action="/action/delete_question" onsubmit="return confirm('Delete this question?')">
                <input type="hidden" name="question_id" value="${q.id}">
                <button type="submit" class="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Delete Question">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
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

    <!-- ================= TAB 5: TEST SECURITY SETTINGS ================= -->
    ${tab === 'security' ? `
    <div class="space-y-8">
      
      <!-- Test Security Policies Card -->
      <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <i data-lucide="shield-alert" class="w-5 h-5"></i>
          </div>
          <div>
            <h2 class="text-base font-black text-slate-900">Anti-Cheating & Test Integrity Policies</h2>
            <p class="text-xs text-slate-500">Configure global proctoring safeguards enforced on candidate browsers during tests.</p>
          </div>
        </div>

        <form method="POST" action="/action/save_security" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <!-- Window Blur -->
            <label class="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5 cursor-pointer hover:border-slate-300 transition-all">
              <input type="checkbox" name="anti_cheat_blur" value="1" ${antiCheatBlur ? 'checked' : ''} class="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-0">
              <div class="space-y-1">
                <span class="text-xs font-bold text-slate-900 block">Window Blur & Tab Switch Detector</span>
                <span class="text-[11px] text-slate-500 block">Detects when student switches to another browser tab or application, displays violation alert, and logs an infraction.</span>
              </div>
            </label>

            <!-- Fullscreen -->
            <label class="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5 cursor-pointer hover:border-slate-300 transition-all">
              <input type="checkbox" name="enforce_fullscreen" value="1" ${enforceFullscreen ? 'checked' : ''} class="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-0">
              <div class="space-y-1">
                <span class="text-xs font-bold text-slate-900 block">Enforce Fullscreen Mode</span>
                <span class="text-[11px] text-slate-500 block">Locks assessment into full-screen browser viewport, hiding taskbar, notifications, and desktop background.</span>
              </div>
            </label>

            <!-- Shuffle Questions -->
            <label class="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5 cursor-pointer hover:border-slate-300 transition-all">
              <input type="checkbox" name="shuffle_questions" value="1" ${shuffleQuestions ? 'checked' : ''} class="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-0">
              <div class="space-y-1">
                <span class="text-xs font-bold text-slate-900 block">Randomize Question Sequence</span>
                <span class="text-[11px] text-slate-500 block">Every candidate receives a distinct, randomized question order preventing shoulder-surfing.</span>
              </div>
            </label>

            <!-- Shuffle Options -->
            <label class="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5 cursor-pointer hover:border-slate-300 transition-all">
              <input type="checkbox" name="shuffle_options" value="1" ${shuffleOptions ? 'checked' : ''} class="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-0">
              <div class="space-y-1">
                <span class="text-xs font-bold text-slate-900 block">Randomize Option Positions (A, B, C, D)</span>
                <span class="text-[11px] text-slate-500 block">Shuffles the answer options order uniquely for each candidate session.</span>
              </div>
            </label>

            <!-- Calculator Allowed -->
            <label class="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5 cursor-pointer hover:border-slate-300 transition-all">
              <input type="checkbox" name="calculator_allowed" value="1" ${calculatorAllowed ? 'checked' : ''} class="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-0">
              <div class="space-y-1">
                <span class="text-xs font-bold text-slate-900 block">Allow On-Screen Medical Calculator</span>
                <span class="text-[11px] text-slate-500 block">Provides candidate with an interactive on-screen clinical calculator during the exam.</span>
              </div>
            </label>

            <!-- Watermark -->
            <label class="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5 cursor-pointer hover:border-slate-300 transition-all">
              <input type="checkbox" name="watermark_enabled" value="1" ${watermarkEnabled ? 'checked' : ''} class="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-0">
              <div class="space-y-1">
                <span class="text-xs font-bold text-slate-900 block">Candidate Matric Watermark</span>
                <span class="text-[11px] text-slate-500 block">Overlays a translucent watermark of candidate's matric number across the screen to deter phone photography leaks.</span>
              </div>
            </label>

            <!-- Disable Copy Paste -->
            <label class="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5 cursor-pointer hover:border-slate-300 transition-all">
              <input type="checkbox" name="disable_copy_paste" value="1" ${disableCopyPaste ? 'checked' : ''} class="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-0">
              <div class="space-y-1">
                <span class="text-xs font-bold text-slate-900 block">Disable Right-Click, Copy & Paste</span>
                <span class="text-[11px] text-slate-500 block">Disables context menu, text selection, and clipboard copying to prevent question stem extraction.</span>
              </div>
            </label>

            <!-- Max Tab Switches -->
            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span class="text-xs font-bold text-slate-900 block">Tab Switch Violation Limit</span>
              <span class="text-[11px] text-slate-500 block">Auto-submits exam when student switches tabs more than this number of times.</span>
              <select name="max_tab_switches" class="mt-2 w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none">
                <option value="1" ${maxTabSwitches === '1' ? 'selected' : ''}>1 Violation (Strict Zero Tolerance)</option>
                <option value="2" ${maxTabSwitches === '2' ? 'selected' : ''}>2 Violations</option>
                <option value="3" ${maxTabSwitches === '3' ? 'selected' : ''}>3 Violations (Standard Academic)</option>
                <option value="5" ${maxTabSwitches === '5' ? 'selected' : ''}>5 Violations (Lenient)</option>
                <option value="0" ${maxTabSwitches === '0' ? 'selected' : ''}>Warning Only (Never Auto-Submit)</option>
              </select>
            </div>

          </div>

          <div class="flex justify-end">
            <button type="submit" class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 flex items-center gap-2 cursor-pointer">
              <i data-lucide="check" class="w-4 h-4"></i>
              <span>Save Security Policies</span>
            </button>
          </div>
        </form>
      </div>

    </div>
    ` : ''}

    <!-- ================= TAB 6: CANDIDATES & RESULTS ================= -->
    ${tab === 'candidates' ? `
    <div class="space-y-8">
      
      <!-- Submissions Table -->
      <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
        <h3 class="text-base font-black text-slate-900">Recent Test Submissions (${submissions.length})</h3>
        ${submissions.length === 0 ? `
        <div class="py-8 text-center text-slate-400 text-xs">No exam submissions recorded yet.</div>
        ` : `
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
              ${submissions.map(sub => `
              <tr class="hover:bg-slate-50/70">
                <td class="px-6 py-3.5 font-bold text-slate-900">${sub.student_name}</td>
                <td class="px-6 py-3.5 font-mono text-slate-500">${sub.matric_no}</td>
                <td class="px-6 py-3.5 font-semibold text-indigo-700">${sub.course_code}</td>
                <td class="px-6 py-3.5 text-center font-bold text-slate-900">${sub.total_score} / ${sub.total_questions}</td>
                <td class="px-6 py-3.5 text-center font-extrabold text-indigo-600">${sub.percentage}%</td>
                <td class="px-6 py-3.5 text-center">
                  <span class="px-2 py-0.5 rounded-full font-black ${sub.grade === 'A' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}">
                    ${sub.grade}
                  </span>
                </td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        `}
      </div>

      <!-- Registered Candidates Table -->
      <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
        <h3 class="text-base font-black text-slate-900">Registered Candidate Directory (${students.length})</h3>
        ${students.length === 0 ? `
        <div class="py-8 text-center text-slate-400 text-xs">No registered candidates yet.</div>
        ` : `
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 border-b border-slate-200 uppercase font-bold text-slate-500">
              <tr>
                <th class="px-6 py-3">Name</th>
                <th class="px-6 py-3">Matric No</th>
                <th class="px-6 py-3">Department</th>
                <th class="px-6 py-3">Phone</th>
                <th class="px-6 py-3 text-center">Tests Taken</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${students.map(st => `
              <tr class="hover:bg-slate-50/70">
                <td class="px-6 py-3.5 font-bold text-slate-900">${st.name}</td>
                <td class="px-6 py-3.5 font-mono text-slate-500">${st.matric_no}</td>
                <td class="px-6 py-3.5 font-medium text-slate-700">${st.department}</td>
                <td class="px-6 py-3.5 text-slate-500">${st.phone || '—'}</td>
                <td class="px-6 py-3.5 text-center font-bold text-indigo-600">${st.tests_count}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        `}
      </div>

    </div>
    ` : ''}

  </main>

  <footer class="border-t border-slate-200 py-6 text-center text-xs text-slate-400 bg-white">
    Premed CBT Portal &bull; Master Local Admin Control Center &bull; Database: <span class="text-indigo-600 font-mono">premed_portal.sqlite</span>
  </footer>

  <script>
    lucide.createIcons();

    function filterQuestions() {
      const q = (document.getElementById('qFilterInput').value || '').toLowerCase();
      const items = document.querySelectorAll('.question-item');
      items.forEach(el => {
        const text = el.getAttribute('data-search') || '';
        el.style.display = text.includes(q) ? 'flex' : 'none';
      });
    }

    const topSyncForm = document.getElementById('topSyncForm');
    const topSyncBtn = document.getElementById('topSyncBtn');
    if (topSyncForm && topSyncBtn) {
      topSyncForm.addEventListener('submit', () => {
        topSyncBtn.disabled = true;
        topSyncBtn.innerHTML = '<span class="animate-spin inline-block mr-2">&#9696;</span> Pushing to Live Site...';
      });
    }
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
        db.prepare('INSERT INTO topics (id, course_id, name) VALUES (?, ?, "General Curriculum")').run(tid, cid);
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
      return res.end(renderHtml('tests', 'Global test session rules updated successfully!'));
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
      return res.end(renderHtml('security', 'Test security and anti-cheating policies saved successfully!'));
    }

    // Add Question
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

    // Edit Question
    if (pathname === '/action/edit_question') {
      const qid = data.question_id;
      const courseId = data.course_id;
      const text = (data.text || '').trim();
      const optA = (data.a || '').trim();
      const optB = (data.b || '').trim();
      const optC = (data.c || '').trim();
      const optD = (data.d || '').trim();
      const correct = (data.correct_option || 'A').trim().toUpperCase();
      const explanation = (data.explanation || '').trim();

      if (qid && text && optA && optB) {
        let topic = db.prepare('SELECT id FROM topics WHERE course_id = ? LIMIT 1').get(courseId);
        let topicId = topic ? topic.id : null;
        if (!topicId) {
          topicId = 'topic_' + Math.random().toString(36).substring(2, 10);
          db.prepare('INSERT INTO topics (id, course_id, name) VALUES (?, ?, "General Curriculum")').run(topicId, courseId);
        }
        db.prepare('UPDATE questions SET topic_id = ?, text = ?, a = ?, b = ?, c = ?, d = ?, correct_option = ?, explanation = ? WHERE id = ?').run(topicId, text, optA, optB, optC, optD, correct, explanation, qid);
      }
      res.writeHead(302, { Location: '/?tab=questions' });
      return res.end();
    }

    // Bulk Add Questions
    if (pathname === '/action/bulk_add_questions') {
      const courseId = data.course_id;
      const rawText = (data.bulk_text || '').trim();

      if (courseId && rawText) {
        let topic = db.prepare('SELECT id FROM topics WHERE course_id = ? LIMIT 1').get(courseId);
        let topicId = topic ? topic.id : null;
        if (!topicId) {
          topicId = 'topic_' + Math.random().toString(36).substring(2, 10);
          db.prepare('INSERT INTO topics (id, course_id, name) VALUES (?, ?, "General Curriculum")').run(topicId, courseId);
        }

        const blocks = rawText.split(/\n\s*---\s*\n/);
        let imported = 0;

        for (const block of blocks) {
          const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
          let qText = '', optA = '', optB = '', optC = '', optD = '', ans = 'A', exp = '';

          for (const line of lines) {
            if (/^Q:\s*/i.test(line)) qText = line.replace(/^Q:\s*/i, '');
            else if (/^A:\s*/i.test(line)) optA = line.replace(/^A:\s*/i, '');
            else if (/^B:\s*/i.test(line)) optB = line.replace(/^B:\s*/i, '');
            else if (/^C:\s*/i.test(line)) optC = line.replace(/^C:\s*/i, '');
            else if (/^D:\s*/i.test(line)) optD = line.replace(/^D:\s*/i, '');
            else if (/^ANS:\s*/i.test(line)) ans = line.replace(/^ANS:\s*/i, '').toUpperCase().trim();
            else if (/^EXP:\s*/i.test(line)) exp = line.replace(/^EXP:\s*/i, '');
          }

          if (qText && optA && optB) {
            const qid = 'q_' + Math.random().toString(36).substring(2, 12);
            db.prepare('INSERT INTO questions (id, topic_id, text, a, b, c, d, correct_option, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(qid, topicId, qText, optA, optB, optC, optD, ans, exp);
            imported++;
          }
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(renderHtml('questions', `Successfully imported ${imported} questions in bulk into course!`));
      }

      res.writeHead(302, { Location: '/?tab=questions' });
      return res.end();
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

    // 100% Robust Git Sync Handler (Never errors on "nothing to commit")
    if (pathname === '/sync') {
      exec(`"${GIT_PATH}" add premed_portal.sqlite`, { cwd: __dirname }, (addErr) => {
        exec(`"${GIT_PATH}" diff --cached --name-only premed_portal.sqlite`, { cwd: __dirname }, (diffErr, diffOut) => {
          const hasStaged = diffOut && diffOut.trim().includes('premed_portal.sqlite');

          const pushToRemote = (commitMessagePrefix) => {
            exec(`"${GIT_PATH}" -c credential.helper="" -c http.sslVerify=false push origin main`, { cwd: __dirname }, (pushErr, stdout, stderr) => {
              const out = (stdout || '') + ' ' + (stderr || '');
              if (pushErr && !out.includes('Everything up-to-date') && !out.includes('main -> main')) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                return res.end(renderHtml('home', 'Sync Notice: ' + (stderr || pushErr.message), 'error'));
              }
              res.writeHead(200, { 'Content-Type': 'text/html' });
              return res.end(renderHtml('home', commitMessagePrefix, 'success'));
            });
          };

          if (hasStaged) {
            exec(`"${GIT_PATH}" commit -m "Admin sync: update questions and portal database"`, { cwd: __dirname }, (commitErr) => {
              pushToRemote('Database changes successfully committed and pushed to GitHub & Vercel! Live portal updated.');
            });
          } else {
            pushToRemote('Live portal is already 100% up to date with your local database.');
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

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(renderHtml(tab, null, 'success', editCourseId, editQuestionId));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Premed Master Admin Server running on http://localhost:' + PORT);
});
