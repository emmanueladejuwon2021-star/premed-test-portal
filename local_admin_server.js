/**
 * Premed Test Portal - Executive Local Admin Control Center Server
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
  // Ensure settings table
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

function renderHtml(tab = 'home', alert = null, alertType = 'success') {
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
    SELECT q.*, c.code as course_code, c.title as course_title 
    FROM questions q
    JOIN topics t ON q.topic_id = t.id
    JOIN courses c ON t.course_id = c.id
    ORDER BY q.created_at DESC
    LIMIT 100
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

  // Settings values
  const antiCheatBlur = getSetting('anti_cheat_blur', '1') === '1';
  const enforceFullscreen = getSetting('enforce_fullscreen', '1') === '1';
  const shuffleQuestions = getSetting('shuffle_questions', '1') === '1';
  const shuffleOptions = getSetting('shuffle_options', '1') === '1';
  const calculatorAllowed = getSetting('calculator_allowed', '1') === '1';
  const watermarkEnabled = getSetting('watermark_enabled', '1') === '1';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Premed Master Admin Console | Academic Control Engine</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    code, pre { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen antialiased flex flex-col selection:bg-indigo-500 selection:text-white">
  
  <!-- ================= TOP NAVIGATION BAR ================= -->
  <header class="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 shadow-2xl">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-20">
        
        <!-- Brand & System Status Indicator -->
        <div class="flex items-center gap-4">
          <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/20">
            <i data-lucide="shield-check" class="w-6 h-6"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-base font-extrabold tracking-tight text-white">Premed<span class="text-indigo-400">Admin</span></span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Localhost Only
              </span>
            </div>
            <p class="text-[11px] text-slate-400 font-medium">Master Examination & Curriculum Control</p>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <nav class="hidden md:flex items-center p-1.5 bg-slate-950/60 rounded-2xl border border-slate-800 text-xs font-bold text-slate-400">
          <a href="/?tab=home" class="px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${tab === 'home' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'hover:text-slate-200 hover:bg-slate-900'}">
            <i data-lucide="home" class="w-4 h-4"></i>
            <span>Home</span>
          </a>
          <a href="/?tab=courses" class="px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${tab === 'courses' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'hover:text-slate-200 hover:bg-slate-900'}">
            <i data-lucide="book-open" class="w-4 h-4"></i>
            <span>Courses</span>
          </a>
          <a href="/?tab=tests" class="px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${tab === 'tests' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'hover:text-slate-200 hover:bg-slate-900'}">
            <i data-lucide="sliders" class="w-4 h-4"></i>
            <span>Tests & Security</span>
          </a>
          <a href="/?tab=questions" class="px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${tab === 'questions' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'hover:text-slate-200 hover:bg-slate-900'}">
            <i data-lucide="database" class="w-4 h-4"></i>
            <span>Question Bank</span>
          </a>
          <a href="/?tab=candidates" class="px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${tab === 'candidates' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'hover:text-slate-200 hover:bg-slate-900'}">
            <i data-lucide="users" class="w-4 h-4"></i>
            <span>Candidates</span>
          </a>
        </nav>

        <!-- Cloud Sync Action -->
        <div class="flex items-center gap-3">
          <form method="POST" action="/sync">
            <button type="submit" class="px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all transform active:scale-95">
              <i data-lucide="cloud-upload" class="w-4 h-4"></i>
              <span>Sync to Live Website</span>
            </button>
          </form>
        </div>

      </div>
    </div>

    <!-- Mobile Nav Bar -->
    <div class="md:hidden flex overflow-x-auto px-4 py-2 border-t border-slate-800 gap-1 bg-slate-900/50 text-xs font-bold text-slate-400">
      <a href="/?tab=home" class="px-3 py-1.5 rounded-lg shrink-0 ${tab === 'home' ? 'bg-indigo-600 text-white' : ''}">Home</a>
      <a href="/?tab=courses" class="px-3 py-1.5 rounded-lg shrink-0 ${tab === 'courses' ? 'bg-indigo-600 text-white' : ''}">Courses</a>
      <a href="/?tab=tests" class="px-3 py-1.5 rounded-lg shrink-0 ${tab === 'tests' ? 'bg-indigo-600 text-white' : ''}">Tests & Security</a>
      <a href="/?tab=questions" class="px-3 py-1.5 rounded-lg shrink-0 ${tab === 'questions' ? 'bg-indigo-600 text-white' : ''}">Question Bank</a>
      <a href="/?tab=candidates" class="px-3 py-1.5 rounded-lg shrink-0 ${tab === 'candidates' ? 'bg-indigo-600 text-white' : ''}">Candidates</a>
    </div>
  </header>

  <!-- ================= MAIN CONTENT CONTAINER ================= -->
  <main class="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">

    ${alert ? `
    <div class="p-4 rounded-2xl ${alertType === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'} border flex items-center justify-between gap-3 shadow-lg">
      <div class="flex items-center gap-2.5 text-xs font-bold">
        <i data-lucide="${alertType === 'success' ? 'check-circle' : 'alert-circle'}" class="w-4 h-4 shrink-0"></i>
        <span>${alert}</span>
      </div>
      <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white"><i data-lucide="x" class="w-4 h-4"></i></button>
    </div>
    ` : ''}

    <!-- ================= TAB 1: HOME OVERVIEW ================= -->
    ${tab === 'home' ? `
    <div class="space-y-8">
      
      <!-- Welcome Hero Banner -->
      <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/20 p-8 sm:p-10 shadow-2xl">
        <div class="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
        <div class="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div class="space-y-2 max-w-2xl">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
              <i data-lucide="sparkles" class="w-3.5 h-3.5 text-amber-300"></i>
              <span>Academic Session 2025/2026 Ready</span>
            </div>
            <h1 class="text-2xl sm:text-4xl font-black text-white tracking-tight">Executive CBT Control Center</h1>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              Manage clinical courses, author examination questions, enforce anti-cheating protocols, and synchronize database updates directly to your live cloud deployment with 1 click.
            </p>
          </div>
          <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <a href="/?tab=courses" class="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold text-center shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all">
              <i data-lucide="plus-circle" class="w-4 h-4"></i>
              <span>Create Course</span>
            </a>
            <a href="/?tab=questions" class="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold text-center border border-slate-700 flex items-center justify-center gap-2 transition-all">
              <i data-lucide="edit-3" class="w-4 h-4"></i>
              <span>Add Questions</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Key Performance Metrics Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div class="flex justify-between items-center mb-4">
            <span class="text-xs font-extrabold uppercase tracking-wider text-slate-400">Total Questions</span>
            <div class="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <i data-lucide="database" class="w-4 h-4"></i>
            </div>
          </div>
          <div class="text-3xl font-black text-white">${totalQuestions}</div>
          <p class="text-[11px] text-slate-500 mt-2">Active in question bank</p>
        </div>

        <div class="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div class="flex justify-between items-center mb-4">
            <span class="text-xs font-extrabold uppercase tracking-wider text-slate-400">Active Live Exams</span>
            <div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <i data-lucide="play-circle" class="w-4 h-4"></i>
            </div>
          </div>
          <div class="text-3xl font-black text-emerald-400">${activeExams} <span class="text-sm text-slate-500 font-normal">/ ${totalCourses}</span></div>
          <p class="text-[11px] text-slate-500 mt-2">Unlocked for student testing</p>
        </div>

        <div class="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-violet-500/40 transition-all">
          <div class="flex justify-between items-center mb-4">
            <span class="text-xs font-extrabold uppercase tracking-wider text-slate-400">Registered Students</span>
            <div class="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/20">
              <i data-lucide="users" class="w-4 h-4"></i>
            </div>
          </div>
          <div class="text-3xl font-black text-violet-400">${totalStudents}</div>
          <p class="text-[11px] text-slate-500 mt-2">Verified candidate profiles</p>
        </div>

        <div class="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div class="flex justify-between items-center mb-4">
            <span class="text-xs font-extrabold uppercase tracking-wider text-slate-400">Completed Tests</span>
            <div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <i data-lucide="award" class="w-4 h-4"></i>
            </div>
          </div>
          <div class="text-3xl font-black text-amber-400">${totalResults}</div>
          <p class="text-[11px] text-slate-500 mt-2">Submitted and auto-graded</p>
        </div>
      </div>

      <!-- Quick Action Cards & Live Sync Status -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div class="lg:col-span-2 bg-slate-900/60 rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-4">
          <div class="flex justify-between items-center">
            <h3 class="text-sm font-extrabold text-white flex items-center gap-2">
              <i data-lucide="activity" class="w-4 h-4 text-indigo-400"></i>
              <span>Active Assessments Status</span>
            </h3>
            <a href="/?tab=tests" class="text-xs text-indigo-400 hover:text-indigo-300 font-bold">Configure All &rarr;</a>
          </div>

          ${courses.length === 0 ? `
          <div class="p-8 text-center bg-slate-950/50 rounded-2xl border border-dashed border-slate-800 space-y-3">
            <div class="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <i data-lucide="book-plus" class="w-6 h-6"></i>
            </div>
            <p class="text-xs text-slate-400 font-medium">No courses exist in the portal right now. All previous courses were wiped clean as requested.</p>
            <a href="/?tab=courses" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold">
              <span>Create Your First Course</span>
            </a>
          </div>
          ` : `
          <div class="divide-y divide-slate-800/80">
            ${courses.slice(0, 5).map(c => `
            <div class="py-3 flex justify-between items-center gap-4">
              <div>
                <span class="text-xs font-mono font-bold text-indigo-400">${c.code}</span>
                <p class="text-xs font-semibold text-white">${c.title}</p>
                <span class="text-[10px] text-slate-500">${c.q_count} Questions &bull; ${c.duration} mins limit</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${c.is_locked ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}">
                  ${c.is_locked ? 'Locked' : 'Active'}
                </span>
                <form method="POST" action="/action/toggle_lock">
                  <input type="hidden" name="course_id" value="${c.id}">
                  <input type="hidden" name="current_locked" value="${c.is_locked}">
                  <button type="submit" class="px-3 py-1 rounded-lg text-xs font-bold border ${c.is_locked ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10' : 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10'}">
                    ${c.is_locked ? 'Unlock' : 'Lock'}
                  </button>
                </form>
              </div>
            </div>
            `).join('')}
          </div>
          `}
        </div>

        <!-- Sync Card -->
        <div class="bg-gradient-to-br from-indigo-950/60 to-slate-900 rounded-3xl p-6 sm:p-8 border border-indigo-500/20 flex flex-col justify-between space-y-6">
          <div class="space-y-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <i data-lucide="cloud" class="w-5 h-5"></i>
            </div>
            <h3 class="text-base font-extrabold text-white">Live Cloud Sync Pipeline</h3>
            <p class="text-xs text-slate-400 leading-relaxed font-medium">
              Whenever you create courses, add questions, or modify security locks on your local PC, push them live with 1 click.
            </p>
          </div>

          <form method="POST" action="/sync" class="w-full">
            <button type="submit" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-xs shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all">
              <i data-lucide="upload-cloud" class="w-4 h-4"></i>
              <span>Push All Updates to Live Website</span>
            </button>
          </form>
        </div>

      </div>

    </div>
    ` : ''}

    <!-- ================= TAB 2: COURSES ================= -->
    ${tab === 'courses' ? `
    <div class="space-y-8">
      
      <!-- Create Course Card -->
      <div class="bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <i data-lucide="folder-plus" class="w-5 h-5"></i>
          </div>
          <div>
            <h2 class="text-base font-extrabold text-white">Create New Course / Mock Subject</h2>
            <p class="text-xs text-slate-400">Add an academic subject or mock test for medical candidates.</p>
          </div>
        </div>

        <form method="POST" action="/action/add_course" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Course Code *</label>
            <input type="text" name="code" required placeholder="e.g. ZOO 102" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono uppercase text-white focus:outline-none focus:border-indigo-500">
          </div>

          <div class="sm:col-span-2">
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Course Title *</label>
            <input type="text" name="title" required placeholder="e.g. Introductory Zoology & Comparative Anatomy" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500">
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Department Filter</label>
            <select name="department" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500">
              <option value="All Departments">All Departments (General)</option>
              <option value="Medicine & Surgery">Medicine & Surgery</option>
              <option value="Dentistry">Dentistry</option>
              <option value="Physiotherapy">Physiotherapy</option>
              <option value="NACON Nursing">NACON Nursing</option>
              <option value="Medical Laboratory Science">Medical Laboratory Science</option>
              <option value="Pharmacy">Pharmacy</option>
              <option value="Physiology">Physiology</option>
              <option value="Anatomy">Anatomy</option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Duration (Minutes)</label>
            <input type="number" name="duration" value="30" min="5" max="300" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500">
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Question Limit per Test</label>
            <input type="number" name="question_limit" value="20" min="5" max="200" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500">
          </div>

          <div class="sm:col-span-2 flex items-end">
            <button type="submit" class="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all">
              <i data-lucide="check" class="w-4 h-4"></i>
              <span>Save & Register Course</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Course Catalog & Editor Table -->
      <div class="bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-4">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="text-base font-extrabold text-white">Course Catalog (${courses.length})</h3>
            <p class="text-xs text-slate-400">Configured subjects with real-time question statistics.</p>
          </div>
        </div>

        ${courses.length === 0 ? `
        <div class="py-12 text-center text-slate-500 text-xs">No courses registered yet. Use the form above to add a course.</div>
        ` : `
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-950/70 border-b border-slate-800 uppercase font-bold text-slate-400">
              <tr>
                <th class="px-6 py-3.5">Code</th>
                <th class="px-6 py-3.5">Title</th>
                <th class="px-6 py-3.5 text-center">Questions</th>
                <th class="px-6 py-3.5 text-center">Duration</th>
                <th class="px-6 py-3.5 text-center">Limit</th>
                <th class="px-6 py-3.5 text-center">Status</th>
                <th class="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/80">
              ${courses.map(c => `
              <tr class="hover:bg-slate-800/40 transition-colors">
                <td class="px-6 py-4 font-mono font-bold text-indigo-400">${c.code}</td>
                <td class="px-6 py-4 font-bold text-white">${c.title}</td>
                <td class="px-6 py-4 text-center font-bold text-slate-300">${c.q_count} Qs</td>
                <td class="px-6 py-4 text-center font-mono text-slate-400">${c.duration} mins</td>
                <td class="px-6 py-4 text-center font-mono text-slate-400">${c.question_limit} Qs</td>
                <td class="px-6 py-4 text-center">
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${c.is_locked ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}">
                    ${c.is_locked ? 'Locked' : 'Unlocked'}
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="inline-flex items-center gap-2">
                    <form method="POST" action="/action/toggle_lock" class="inline">
                      <input type="hidden" name="course_id" value="${c.id}">
                      <input type="hidden" name="current_locked" value="${c.is_locked}">
                      <button type="submit" class="px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${c.is_locked ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10' : 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10'}">
                        ${c.is_locked ? 'Unlock' : 'Lock'}
                      </button>
                    </form>
                    <form method="POST" action="/action/delete_course" class="inline" onsubmit="return confirm('Permanently delete ${c.code} and all its questions?')">
                      <input type="hidden" name="course_id" value="${c.id}">
                      <button type="submit" class="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
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

    <!-- ================= TAB 3: TESTS & SECURITY ================= -->
    ${tab === 'tests' ? `
    <div class="space-y-8">
      
      <!-- Live Tests Deployment Rules -->
      <div class="bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <i data-lucide="play-circle" class="w-5 h-5"></i>
          </div>
          <div>
            <h2 class="text-base font-extrabold text-white">Live Examination Deployment Status</h2>
            <p class="text-xs text-slate-400">Lock or unlock specific subject mock exams for candidate sessions.</p>
          </div>
        </div>

        ${courses.length === 0 ? `
        <div class="p-8 text-center text-slate-500 text-xs">No courses registered yet. <a href="/?tab=courses" class="text-indigo-400 font-bold underline">Create a course first</a>.</div>
        ` : `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${courses.map(c => `
          <div class="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-xs font-mono font-bold text-indigo-400">${c.code}</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${c.is_locked ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}">
                  ${c.is_locked ? 'LOCKED' : 'ACTIVE'}
                </span>
              </div>
              <h4 class="text-sm font-bold text-white">${c.title}</h4>
              <p class="text-[11px] text-slate-400 mt-1">${c.q_count} questions banked &bull; ${c.duration} mins timer</p>
            </div>
            
            <form method="POST" action="/action/toggle_lock">
              <input type="hidden" name="course_id" value="${c.id}">
              <input type="hidden" name="current_locked" value="${c.is_locked}">
              <button type="submit" class="w-full py-2 rounded-xl text-xs font-bold transition-all ${c.is_locked ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-rose-600/80 hover:bg-rose-600 text-white'}">
                ${c.is_locked ? 'Unlock for Examination' : 'Lock Examination'}
              </button>
            </form>
          </div>
          `).join('')}
        </div>
        `}
      </div>

      <!-- Test Security Settings Card -->
      <div class="bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <i data-lucide="shield-alert" class="w-5 h-5"></i>
          </div>
          <div>
            <h2 class="text-base font-extrabold text-white">Test Security & Anti-Cheating Controls</h2>
            <p class="text-xs text-slate-400">Configure global academic integrity policies enforced on candidate testing browsers.</p>
          </div>
        </div>

        <form method="POST" action="/action/save_security" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <!-- Window Blur Anti-Cheat -->
            <label class="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3 cursor-pointer hover:border-slate-700 transition-all">
              <input type="checkbox" name="anti_cheat_blur" value="1" ${antiCheatBlur ? 'checked' : ''} class="w-4 h-4 mt-1 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0">
              <div class="space-y-1">
                <span class="text-xs font-bold text-white block">Window Blur & Tab Switch Detector</span>
                <span class="text-[11px] text-slate-400 block">Detects when student leaves browser tab, issues warning dialogs, and logs an integrity infraction incident.</span>
              </div>
            </label>

            <!-- Fullscreen Enforcement -->
            <label class="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3 cursor-pointer hover:border-slate-700 transition-all">
              <input type="checkbox" name="enforce_fullscreen" value="1" ${enforceFullscreen ? 'checked' : ''} class="w-4 h-4 mt-1 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0">
              <div class="space-y-1">
                <span class="text-xs font-bold text-white block">Enforce Fullscreen Mode</span>
                <span class="text-[11px] text-slate-400 block">Locks browser into full-screen viewport; blocks taskbar and multi-monitor distractions.</span>
              </div>
            </label>

            <!-- Shuffle Questions -->
            <label class="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3 cursor-pointer hover:border-slate-700 transition-all">
              <input type="checkbox" name="shuffle_questions" value="1" ${shuffleQuestions ? 'checked' : ''} class="w-4 h-4 mt-1 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0">
              <div class="space-y-1">
                <span class="text-xs font-bold text-white block">Randomize Question Sequence</span>
                <span class="text-[11px] text-slate-400 block">Each candidate receives an individually randomized question order preventing shoulder surfing.</span>
              </div>
            </label>

            <!-- Shuffle Options -->
            <label class="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3 cursor-pointer hover:border-slate-700 transition-all">
              <input type="checkbox" name="shuffle_options" value="1" ${shuffleOptions ? 'checked' : ''} class="w-4 h-4 mt-1 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0">
              <div class="space-y-1">
                <span class="text-xs font-bold text-white block">Randomize Answer Options (A, B, C, D)</span>
                <span class="text-[11px] text-slate-400 block">Option positions are randomly shuffled for each candidate.</span>
              </div>
            </label>

            <!-- Calculator Allowed -->
            <label class="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3 cursor-pointer hover:border-slate-700 transition-all">
              <input type="checkbox" name="calculator_allowed" value="1" ${calculatorAllowed ? 'checked' : ''} class="w-4 h-4 mt-1 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0">
              <div class="space-y-1">
                <span class="text-xs font-bold text-white block">Enable On-Screen Medical Calculator</span>
                <span class="text-[11px] text-slate-400 block">Allows student to open floating scientific calculator during test.</span>
              </div>
            </label>

            <!-- Watermark -->
            <label class="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3 cursor-pointer hover:border-slate-700 transition-all">
              <input type="checkbox" name="watermark_enabled" value="1" ${watermarkEnabled ? 'checked' : ''} class="w-4 h-4 mt-1 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0">
              <div class="space-y-1">
                <span class="text-xs font-bold text-white block">Digital Watermark Matric ID on Screen</span>
                <span class="text-[11px] text-slate-400 block">Renders a subtle, translucent watermark of the candidate's matric number across the screen to deter phone photography.</span>
              </div>
            </label>

          </div>

          <div class="flex justify-end">
            <button type="submit" class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2">
              <i data-lucide="check" class="w-4 h-4"></i>
              <span>Save Security Policy</span>
            </button>
          </div>
        </form>
      </div>

    </div>
    ` : ''}

    <!-- ================= TAB 4: QUESTION BANK ================= -->
    ${tab === 'questions' ? `
    <div class="space-y-8">
      
      <!-- Add Question Card -->
      <div class="bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <i data-lucide="help-circle" class="w-5 h-5"></i>
          </div>
          <div>
            <h2 class="text-base font-extrabold text-white">Author New Multiple Choice Question</h2>
            <p class="text-xs text-slate-400">Add clinical or scientific question with options, correct answer, and explanation.</p>
          </div>
        </div>

        ${courses.length === 0 ? `
        <div class="p-6 text-center text-slate-400 text-xs bg-slate-950 rounded-2xl border border-slate-800">
          Please <a href="/?tab=courses" class="text-indigo-400 font-bold underline">create at least one course</a> before adding questions.
        </div>
        ` : `
        <form method="POST" action="/action/add_question" class="space-y-4">
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Target Course *</label>
            <select name="course_id" required class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500">
              ${courses.map(c => `<option value="${c.id}">${c.code} - ${c.title}</option>`).join('')}
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Question Prompt * (LaTeX $formula$ supported)</label>
            <textarea name="text" required rows="3" placeholder="Enter clinical scenario or question stem..." class="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 leading-relaxed"></textarea>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Option A *</label>
              <input type="text" name="a" required placeholder="Option A text" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500">
            </div>
            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Option B *</label>
              <input type="text" name="b" required placeholder="Option B text" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500">
            </div>
            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Option C</label>
              <input type="text" name="c" placeholder="Option C text" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500">
            </div>
            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Option D</label>
              <input type="text" name="d" placeholder="Option D text" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Correct Answer Key *</label>
              <select name="correct_option" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-indigo-400 focus:outline-none focus:border-indigo-500">
                <option value="A">Option A</option>
                <option value="B">Option B</option>
                <option value="C">Option C</option>
                <option value="D">Option D</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Clinical Explanation</label>
              <input type="text" name="explanation" placeholder="Rationale explaining why the answer is correct..." class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500">
            </div>
          </div>

          <div class="flex justify-end pt-2">
            <button type="submit" class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2">
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span>Save Question to Bank</span>
            </button>
          </div>
        </form>
        `}
      </div>

      <!-- Question List Table -->
      <div class="bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-4">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="text-base font-extrabold text-white">Banked Questions (${questions.length})</h3>
            <p class="text-xs text-slate-400">All questions currently available in database.</p>
          </div>
        </div>

        ${questions.length === 0 ? `
        <div class="py-12 text-center text-slate-500 text-xs">No questions in database yet. Add one above!</div>
        ` : `
        <div class="divide-y divide-slate-800/80">
          ${questions.map((q, idx) => `
          <div class="py-4 flex justify-between items-start gap-4 hover:bg-slate-800/20 px-2 rounded-xl transition-colors">
            <div class="space-y-1.5 max-w-3xl">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono text-[10px] font-bold">${q.course_code}</span>
                <span class="text-[11px] text-slate-500">#${idx + 1}</span>
              </div>
              <p class="text-xs font-semibold text-white leading-relaxed">${q.text}</p>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-400 pt-1">
                <span class="${q.correct_option === 'A' ? 'text-emerald-400 font-bold' : ''}">A: ${q.a}</span>
                <span class="${q.correct_option === 'B' ? 'text-emerald-400 font-bold' : ''}">B: ${q.b}</span>
                <span class="${q.correct_option === 'C' ? 'text-emerald-400 font-bold' : ''}">C: ${q.c || '—'}</span>
                <span class="${q.correct_option === 'D' ? 'text-emerald-400 font-bold' : ''}">D: ${q.d || '—'}</span>
              </div>
              ${q.explanation ? `<p class="text-[11px] text-indigo-300 font-medium">💡 ${q.explanation}</p>` : ''}
            </div>

            <form method="POST" action="/action/delete_question" onsubmit="return confirm('Delete this question?')">
              <input type="hidden" name="question_id" value="${q.id}">
              <button type="submit" class="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </form>
          </div>
          `).join('')}
        </div>
        `}
      </div>

    </div>
    ` : ''}

    <!-- ================= TAB 5: CANDIDATES & RESULTS ================= -->
    ${tab === 'candidates' ? `
    <div class="space-y-8">
      
      <!-- Submissions Table -->
      <div class="bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-4">
        <h3 class="text-base font-extrabold text-white">Recent Test Submissions (${submissions.length})</h3>
        ${submissions.length === 0 ? `
        <div class="py-8 text-center text-slate-500 text-xs">No exam submissions recorded yet.</div>
        ` : `
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-950/70 border-b border-slate-800 uppercase font-bold text-slate-400">
              <tr>
                <th class="px-6 py-3">Candidate</th>
                <th class="px-6 py-3">Matric No</th>
                <th class="px-6 py-3">Course</th>
                <th class="px-6 py-3 text-center">Score</th>
                <th class="px-6 py-3 text-center">Percentage</th>
                <th class="px-6 py-3 text-center">Grade</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/80">
              ${submissions.map(sub => `
              <tr class="hover:bg-slate-800/30">
                <td class="px-6 py-3.5 font-bold text-white">${sub.student_name}</td>
                <td class="px-6 py-3.5 font-mono text-slate-400">${sub.matric_no}</td>
                <td class="px-6 py-3.5 font-semibold text-indigo-400">${sub.course_code}</td>
                <td class="px-6 py-3.5 text-center font-bold text-white">${sub.total_score} / ${sub.total_questions}</td>
                <td class="px-6 py-3.5 text-center font-extrabold text-indigo-400">${sub.percentage}%</td>
                <td class="px-6 py-3.5 text-center">
                  <span class="px-2 py-0.5 rounded-full font-black ${sub.grade === 'A' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-300'}">
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
      <div class="bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-4">
        <h3 class="text-base font-extrabold text-white">Registered Candidate Directory (${students.length})</h3>
        ${students.length === 0 ? `
        <div class="py-8 text-center text-slate-500 text-xs">No registered candidates yet.</div>
        ` : `
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-950/70 border-b border-slate-800 uppercase font-bold text-slate-400">
              <tr>
                <th class="px-6 py-3">Name</th>
                <th class="px-6 py-3">Matric No</th>
                <th class="px-6 py-3">Department</th>
                <th class="px-6 py-3">Phone</th>
                <th class="px-6 py-3 text-center">Tests Taken</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/80">
              ${students.map(st => `
              <tr class="hover:bg-slate-800/30">
                <td class="px-6 py-3.5 font-bold text-white">${st.name}</td>
                <td class="px-6 py-3.5 font-mono text-slate-400">${st.matric_no}</td>
                <td class="px-6 py-3.5 font-medium text-slate-300">${st.department}</td>
                <td class="px-6 py-3.5 text-slate-400">${st.phone || '—'}</td>
                <td class="px-6 py-3.5 text-center font-bold text-indigo-400">${st.tests_count}</td>
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

  <footer class="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
    Premed CBT Portal &bull; Master Local Admin Control Center &bull; Connected to <span class="text-slate-400 font-mono">premed_portal.sqlite</span>
  </footer>

  <script>lucide.createIcons();</script>
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

    if (pathname === '/action/toggle_lock') {
      const cid = data.course_id;
      const current = parseInt(data.current_locked, 10) || 0;
      const next = current ? 0 : 1;
      db.prepare('UPDATE courses SET is_locked = ? WHERE id = ?').run(next, cid);
      res.writeHead(302, { Location: '/?tab=tests' });
      return res.end();
    }

    if (pathname === '/action/add_course') {
      const code = (data.code || '').trim().toUpperCase();
      const title = (data.title || '').trim();
      const duration = parseInt(data.duration, 10) || 30;
      const questionLimit = parseInt(data.question_limit, 10) || 20;

      if (code && title) {
        const cid = 'course_' + code.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Date.now();
        db.prepare('INSERT INTO courses (id, code, title, duration, question_limit, is_mock, is_locked) VALUES (?, ?, ?, ?, ?, 1, 0)').run(cid, code, title, duration, questionLimit);
        const tid = 'topic_' + Math.random().toString(36).substring(2, 10);
        db.prepare('INSERT INTO topics (id, course_id, name) VALUES (?, ?, "General Curriculum")').run(tid, cid);
      }
      res.writeHead(302, { Location: '/?tab=courses' });
      return res.end();
    }

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

    if (pathname === '/action/save_security') {
      setSetting('anti_cheat_blur', data.anti_cheat_blur ? '1' : '0');
      setSetting('enforce_fullscreen', data.enforce_fullscreen ? '1' : '0');
      setSetting('shuffle_questions', data.shuffle_questions ? '1' : '0');
      setSetting('shuffle_options', data.shuffle_options ? '1' : '0');
      setSetting('calculator_allowed', data.calculator_allowed ? '1' : '0');
      setSetting('watermark_enabled', data.watermark_enabled ? '1' : '0');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(renderHtml('tests', 'Test security and anti-cheating policy updated successfully!'));
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
        res.end(renderHtml('home', msg, err ? 'error' : 'success'));
      });
      return;
    }
  }

  // GET requests
  const tab = url.searchParams.get('tab') || 'home';
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(renderHtml(tab));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Premed Master Admin Server running on http://localhost:' + PORT);
});
