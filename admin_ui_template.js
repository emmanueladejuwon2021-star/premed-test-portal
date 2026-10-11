/**
 * Premed Test Portal - Enterprise School Admin Command Center UI Template
 * Production-Grade Design & High-Performance Examination Architecture
 */

function renderHtml(tab = 'home', alert = null, alertType = 'success', editCourseId = null, editQuestionId = null, db, DEPARTMENTS, getSetting) {
  // Query Core Statistics
  const totalQuestions = db.prepare('SELECT COUNT(*) as c FROM questions').get().c;
  const totalStudents = db.prepare('SELECT COUNT(*) as c FROM students').get().c;
  const totalResults = db.prepare('SELECT COUNT(*) as c FROM results').get().c;
  const totalCourses = db.prepare('SELECT COUNT(*) as c FROM courses').get().c;
  
  // Query Configured Tests
  let allTests = [];
  try {
    allTests = db.prepare(`
      SELECT t.*, c.code as course_code, c.title as course_title,
             (SELECT COUNT(*) FROM questions q JOIN topics tp ON q.topic_id = tp.id WHERE tp.course_id = c.id) as course_q_count
      FROM tests t
      JOIN courses c ON t.course_id = c.id
      ORDER BY t.created_at DESC
    `).all();
  } catch (e) {
    allTests = [];
  }
  const liveTestsCount = allTests.filter(t => t.is_live === 1).length;
  const activeExams = liveTestsCount;
  const activeSessionsCount = db.prepare("SELECT COUNT(*) as c FROM exam_sessions WHERE status = 'IN_PROGRESS'").get().c;
  const cheatedSessionsCount = db.prepare("SELECT COUNT(*) as c FROM exam_sessions WHERE status = 'TERMINATED_FOR_CHEATING' OR tab_switches >= 3").get().c;

  // Query Topics & Courses
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

  // Query Questions (top 300)
  const questions = db.prepare(`
    SELECT q.*, t.name as topic_name, c.id as course_id, c.code as course_code, c.title as course_title 
    FROM questions q
    JOIN topics t ON q.topic_id = t.id
    JOIN courses c ON t.course_id = c.id
    ORDER BY q.created_at DESC
    LIMIT 300
  `).all();

  // Query Live Exam Sessions
  const examSessions = db.prepare(`
    SELECT * FROM exam_sessions 
    ORDER BY updated_at DESC 
    LIMIT 60
  `).all();

  // Query Completed Submissions
  const submissions = db.prepare(`
    SELECT r.*, s.name as student_name, s.matric_no, s.department as student_dept, c.code as course_code
    FROM results r
    JOIN students s ON r.student_id = s.id
    JOIN courses c ON r.course_id = c.id
    ORDER BY r.created_at DESC
    LIMIT 60
  `).all();

  // Query Students
  const students = db.prepare(`
    SELECT s.*, COUNT(r.id) as tests_count
    FROM students s
    LEFT JOIN results r ON s.id = r.student_id
    GROUP BY s.id
    ORDER BY s.created_at DESC
    LIMIT 80
  `).all();

  // Selected Edit Items
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

  // Security & Exam Settings
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

  // Department counts
  const deptCounts = {};
  for (const d of DEPARTMENTS) deptCounts[d] = 0;
  for (const s of students) {
    if (s.department && deptCounts[s.department] !== undefined) {
      deptCounts[s.department]++;
    }
  }

  return `<!DOCTYPE html>
<html lang="en" class="h-full dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>Premed Admin Command Center | Live Examination Platform</title>
  
  <!-- Early Theme Setter to Prevent Flash -->
  <script>
    (function() {
      try {
        const theme = localStorage.getItem('premed_theme');
        if (theme === 'light') {
          document.documentElement.classList.remove('dark');
        } else {
          document.documentElement.classList.add('dark');
        }
      } catch(e) {}
    })();
  </script>

  <!-- Fonts & Icons -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>

  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Plus Jakarta Sans', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace'],
          },
          colors: {
            brand: {
              50: '#eef2ff',
              100: '#e0e7ff',
              200: '#c7d2fe',
              300: '#a5b4fc',
              400: '#818cf8',
              500: '#6366f1',
              600: '#4f46e5',
              700: '#4338ca',
              800: '#3730a3',
              900: '#312e81',
              950: '#1e1b4b',
            }
          }
        }
      }
    }
  </script>

  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scroll::-webkit-scrollbar-track { background: transparent; }
    .custom-scroll::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 9999px; }
    .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.5); }
    
    .badge-glow {
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.35);
    }
    .badge-alert-glow {
      box-shadow: 0 0 12px rgba(244, 63, 94, 0.35);
    }
  </style>
</head>
<body class="bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 antialiased min-h-screen flex flex-col font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-150">

  <!-- ================= TOP ENTERPRISE APP SHELL ================= -->
  <header class="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white transition-colors">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16 gap-4">
        
        <!-- Left: Brand & Engine Health -->
        <div class="flex items-center gap-3 shrink-0">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
            <i data-lucide="shield-check" class="w-5 h-5"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">Premed<span class="text-indigo-600 dark:text-indigo-400">Command</span></span>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30 badge-glow">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Radar</span>
              </span>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">School of Clinical Sciences &bull; Premed Portal</p>
          </div>
        </div>

        <!-- Center: Desktop Navigation Tabs -->
        <nav class="hidden lg:flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
          
          <a href="/?tab=home" class="px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${tab === 'home' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30 ring-1 ring-white/20' : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/50'}">
            <i data-lucide="activity" class="w-4 h-4"></i>
            <span>Overview</span>
          </a>

          <a href="/?tab=courses" class="px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${tab === 'courses' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30 ring-1 ring-white/20' : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/50'}">
            <i data-lucide="book-open" class="w-4 h-4"></i>
            <span>Courses</span>
            <span class="px-1.5 py-0.2 rounded-md text-[10px] bg-slate-200 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-mono">${courses.length}</span>
          </a>

          <a href="/?tab=tests" class="px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${tab === 'tests' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30 ring-1 ring-white/20' : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/50'}">
            <i data-lucide="play-circle" class="w-4 h-4"></i>
            <span>Exams</span>
            <span class="px-1.5 py-0.2 rounded-md text-[10px] ${liveTestsCount > 0 ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}">${liveTestsCount} Live</span>
          </a>

          <a href="/?tab=questions" class="px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${tab === 'questions' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30 ring-1 ring-white/20' : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/50'}">
            <i data-lucide="help-circle" class="w-4 h-4"></i>
            <span>Question Bank</span>
            <span class="px-1.5 py-0.2 rounded-md text-[10px] bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-mono font-bold">${totalQuestions}</span>
          </a>

          <a href="/?tab=security" class="px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${tab === 'security' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30 ring-1 ring-white/20' : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/50'}">
            <i data-lucide="lock" class="w-4 h-4"></i>
            <span>Security Suite</span>
          </a>

          <a href="/?tab=candidates" class="px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${tab === 'candidates' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30 ring-1 ring-white/20' : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/50'}">
            <i data-lucide="users" class="w-4 h-4"></i>
            <span>Students & Scores</span>
            ${cheatedSessionsCount > 0 ? `<span class="px-1.5 py-0.2 rounded-md text-[10px] bg-rose-500 text-white font-bold animate-pulse">${cheatedSessionsCount} ⚠️</span>` : ''}
          </a>

        </nav>

        <!-- Right Header Action Tools -->
        <div class="flex items-center gap-2">
          
          <!-- Light / Dark Theme Toggle Button -->
          <button onclick="toggleTheme()" id="themeToggleBtn" type="button" class="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer" title="Toggle Light / Dark Mode">
            <i data-lucide="sun" class="w-4 h-4 theme-icon-sun text-amber-500 hidden"></i>
            <i data-lucide="moon" class="w-4 h-4 theme-icon-moon text-indigo-400 hidden"></i>
            <span class="text-[11px] font-semibold hidden sm:inline theme-label">Theme</span>
          </button>

          <!-- Sync Live Students Activity Button -->
          <form method="POST" action="/action/pull_live_students">
            <button type="submit" class="px-2.5 py-1.5 sm:px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer" title="Pull latest student tests & cheating alerts from the website">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-emerald-500"></i>
              <span class="hidden sm:inline">Sync Portal</span>
            </button>
          </form>

          <!-- Publish Database to Production Button -->
          <form method="POST" action="/sync" id="topPublishForm">
            <button type="submit" id="topPublishBtn" class="px-3.5 py-1.5 sm:px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs shadow-md shadow-indigo-600/30 ring-1 ring-white/20 flex items-center gap-2 transition-all cursor-pointer">
              <i data-lucide="upload-cloud" class="w-3.5 h-3.5"></i>
              <span class="hidden xs:inline">Publish Live</span>
            </button>
          </form>
        </div>

      </div>
    </div>

    <!-- Mobile Sub-Navigation Scrollable Bar -->
    <div class="lg:hidden flex items-center overflow-x-auto no-scrollbar px-4 py-2 border-t border-slate-200 dark:border-slate-800 gap-1.5 bg-white/95 dark:bg-slate-900/90 text-xs font-semibold">
      <a href="/?tab=home" class="px-3 py-1.5 rounded-xl shrink-0 transition-all ${tab === 'home' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">Overview</a>
      <a href="/?tab=courses" class="px-3 py-1.5 rounded-xl shrink-0 transition-all ${tab === 'courses' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">Courses (${courses.length})</a>
      <a href="/?tab=tests" class="px-3 py-1.5 rounded-xl shrink-0 transition-all ${tab === 'tests' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">Exams (${liveTestsCount} Live)</a>
      <a href="/?tab=questions" class="px-3 py-1.5 rounded-xl shrink-0 transition-all ${tab === 'questions' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">Question Bank (${totalQuestions})</a>
      <a href="/?tab=security" class="px-3 py-1.5 rounded-xl shrink-0 transition-all ${tab === 'security' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">Security</a>
      <a href="/?tab=candidates" class="px-3 py-1.5 rounded-xl shrink-0 transition-all ${tab === 'candidates' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">Students (${totalStudents})</a>
    </div>
  </header>

  <!-- ================= MAIN BODY CONTAINER ================= -->
  <div class="flex-grow bg-slate-100 dark:bg-slate-950 py-6 sm:py-8 transition-colors">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

      <!-- Toast Feedback Banner -->
      ${alert ? `
      <div class="p-4 rounded-2xl ${alertType === 'success' ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200' : 'bg-rose-950/80 border-rose-500/40 text-rose-200'} border flex items-center justify-between gap-4 text-xs font-semibold shadow-lg backdrop-blur-md">
        <div class="flex items-center gap-2.5">
          <div class="w-6 h-6 rounded-lg ${alertType === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'} flex items-center justify-center shrink-0">
            <i data-lucide="${alertType === 'success' ? 'check' : 'alert-triangle'}" class="w-3.5 h-3.5"></i>
          </div>
          <span>${alert}</span>
        </div>
        <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white p-1 rounded-lg"><i data-lucide="x" class="w-4 h-4"></i></button>
      </div>
      ` : ''}

      <!-- ========================================================================= -->
      <!-- TAB 1: EXECUTIVE OVERVIEW & RADAR                                         -->
      <!-- ========================================================================= -->
      ${tab === 'home' ? `
      <div class="space-y-6">

        <!-- Mission Control Banner -->
        <div class="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/80 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div class="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div class="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div class="space-y-2 max-w-2xl">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
                <span class="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                <span>Active School Session 2025/2026</span>
              </div>
              <h1 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Examination Command Center</h1>
              <p class="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                Continuous examination monitoring, live anti-cheating radar, instant scoring, and complete curriculum management across all medical disciplines.
              </p>
            </div>

            <!-- Quick Action Hub -->
            <div class="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <a href="/?tab=questions" class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/30">
                <i data-lucide="plus-circle" class="w-4 h-4"></i>
                <span>Add Questions</span>
              </a>
              <a href="/?tab=candidates" class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-all">
                <i data-lucide="shield-alert" class="w-4 h-4 text-rose-400"></i>
                <span>Cheating Radar</span>
              </a>
              <form method="POST" action="/action/master_tests_live_toggle">
                <input type="hidden" name="target_live" value="${activeExams > 0 ? '0' : '1'}">
                <button type="submit" class="px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeExams > 0 
                  ? 'bg-rose-950/80 text-rose-300 border-rose-700 hover:bg-rose-900' 
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-700 hover:bg-emerald-900'
                }">
                  <i data-lucide="${activeExams > 0 ? 'pause-circle' : 'play-circle'}" class="w-4 h-4"></i>
                  <span>${activeExams > 0 ? 'Take All Exams Offline' : 'Make All Exams Live'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        <!-- 4-Stat Executive Metric Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">

          <!-- Stat 1: Live Exam Radar -->
          <div class="bg-slate-900 rounded-3xl p-5 border border-slate-800 relative overflow-hidden shadow-sm">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Writing Exam Now</span>
              <div class="w-8 h-8 rounded-xl ${activeSessionsCount > 0 ? 'bg-emerald-500/20 text-emerald-400 badge-glow' : 'bg-slate-800 text-slate-500'} flex items-center justify-center">
                <i data-lucide="radio" class="w-4 h-4 ${activeSessionsCount > 0 ? 'animate-pulse' : ''}"></i>
              </div>
            </div>
            <div class="text-3xl font-black ${activeSessionsCount > 0 ? 'text-emerald-400' : 'text-white'}">${activeSessionsCount}</div>
            <p class="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full ${activeSessionsCount > 0 ? 'bg-emerald-400' : 'bg-slate-600'}"></span>
              <span>Active student test sessions</span>
            </p>
          </div>

          <!-- Stat 2: Cheating Alerts -->
          <div class="bg-slate-900 rounded-3xl p-5 border border-slate-800 relative overflow-hidden shadow-sm">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Security Alerts</span>
              <div class="w-8 h-8 rounded-xl ${cheatedSessionsCount > 0 ? 'bg-rose-500/20 text-rose-400 badge-alert-glow' : 'bg-slate-800 text-slate-500'} flex items-center justify-center">
                <i data-lucide="shield-alert" class="w-4 h-4"></i>
              </div>
            </div>
            <div class="text-3xl font-black ${cheatedSessionsCount > 0 ? 'text-rose-400' : 'text-white'}">${cheatedSessionsCount}</div>
            <p class="text-xs text-slate-400 mt-1">Screen / Tab switch infractions</p>
          </div>

          <!-- Stat 3: Total Candidates -->
          <div class="bg-slate-900 rounded-3xl p-5 border border-slate-800 relative overflow-hidden shadow-sm">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Candidates</span>
              <div class="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <i data-lucide="users" class="w-4 h-4"></i>
              </div>
            </div>
            <div class="text-3xl font-black text-white">${totalStudents}</div>
            <p class="text-xs text-slate-400 mt-1">${totalResults} completed submissions</p>
          </div>

          <!-- Stat 4: Banked Questions -->
          <div class="bg-slate-900 rounded-3xl p-5 border border-slate-800 relative overflow-hidden shadow-sm">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Banked Questions</span>
              <div class="w-8 h-8 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center">
                <i data-lucide="layers" class="w-4 h-4"></i>
              </div>
            </div>
            <div class="text-3xl font-black text-white">${totalQuestions}</div>
            <p class="text-xs text-slate-400 mt-1">${courses.length} courses &bull; ${allTopics.length} topics</p>
          </div>

        </div>

        <!-- Department Activity Bar -->
        <div class="bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-800 space-y-4">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <i data-lucide="graduation-cap" class="w-4 h-4"></i>
              </div>
              <div>
                <h3 class="text-sm font-bold text-white">Premedical Departments & Enrollment</h3>
                <p class="text-xs text-slate-400">Breakdown of registered candidates across faculties</p>
              </div>
            </div>
            <span class="text-xs font-mono font-bold text-slate-400">${DEPARTMENTS.length} Specializations</span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2">
            ${DEPARTMENTS.map(d => `
            <div class="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
              <div class="min-w-0 pr-2">
                <span class="text-xs font-bold text-slate-200 block truncate" title="${d}">${d}</span>
                <span class="text-[10px] text-slate-400 font-medium">Candidate pool</span>
              </div>
              <span class="px-2 py-0.5 rounded-lg text-xs font-mono font-bold ${deptCounts[d] > 0 ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-700/50 text-slate-500'}">
                ${deptCounts[d]}
              </span>
            </div>
            `).join('')}
          </div>
        </div>

        <!-- Live Candidate Activity & Cheating Radar Feed -->
        <div class="bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-800 space-y-4">
          <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center badge-glow">
                <i data-lucide="radar" class="w-4 h-4 animate-spin" style="animation-duration: 8s;"></i>
              </div>
              <div>
                <h3 class="text-sm font-bold text-white flex items-center gap-2">
                  <span>Live Candidate Test Radar</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Live Polling</span>
                </h3>
                <p class="text-xs text-slate-400">Real-time candidate sessions, tab departures, and results</p>
              </div>
            </div>
            
            <a href="/?tab=candidates" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all self-start sm:self-auto">
              <span>View All Candidate Records</span>
              <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </a>
          </div>

          ${examSessions.length === 0 ? `
          <div class="py-12 text-center rounded-2xl bg-slate-800/40 border border-dashed border-slate-800 space-y-2">
            <i data-lucide="inbox" class="w-8 h-8 text-slate-600 mx-auto"></i>
            <p class="text-xs font-bold text-slate-400">No active student sessions right now.</p>
            <p class="text-[11px] text-slate-500 max-w-sm mx-auto">When candidates start writing exams on the live website, their real-time activity and screen security will stream here.</p>
          </div>
          ` : `
          <div class="overflow-x-auto custom-scroll">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700 text-[11px] uppercase tracking-wider">
                <tr>
                  <th class="py-3 px-4 rounded-l-xl">Candidate</th>
                  <th class="py-3 px-4">Subject</th>
                  <th class="py-3 px-4">Exam Status</th>
                  <th class="py-3 px-4">Security / Tab Switches</th>
                  <th class="py-3 px-4">Score & Grade</th>
                  <th class="py-3 px-4 rounded-r-xl text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800 text-slate-200">
                ${examSessions.slice(0, 10).map(se => {
                  let logs = [];
                  try { logs = JSON.parse(se.cheating_log || '[]'); } catch(e) {}
                  return `
                  <tr class="hover:bg-slate-800/40 transition-colors">
                    <td class="py-3 px-4">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-indigo-400 text-xs shrink-0">
                          ${(se.student_name || 'S').charAt(0)}
                        </div>
                        <div>
                          <span class="font-bold text-white block">${se.student_name}</span>
                          <span class="text-[11px] text-slate-400 font-mono">${se.matric_no}</span>
                        </div>
                      </div>
                    </td>
                    <td class="py-3 px-4">
                      <span class="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">${se.course_code}</span>
                    </td>
                    <td class="py-3 px-4">
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        se.status === 'IN_PROGRESS' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse' :
                        se.status === 'TERMINATED_FOR_CHEATING' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                        'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }">
                        <span class="w-1.5 h-1.5 rounded-full ${se.status === 'IN_PROGRESS' ? 'bg-amber-400' : se.status === 'TERMINATED_FOR_CHEATING' ? 'bg-rose-400' : 'bg-emerald-400'}"></span>
                        <span>${se.status === 'IN_PROGRESS' ? 'WRITING NOW' : se.status === 'TERMINATED_FOR_CHEATING' ? 'TERMINATED' : 'FINISHED'}</span>
                      </span>
                    </td>
                    <td class="py-3 px-4">
                      ${se.tab_switches > 0 ? `
                        <div class="space-y-1">
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold">
                            <i data-lucide="alert-triangle" class="w-3 h-3 text-rose-400"></i>
                            <span>${se.tab_switches} Violations</span>
                          </span>
                          ${logs.length > 0 ? `<p class="text-[10px] text-slate-400 font-mono">${logs.length} logged screen events</p>` : ''}
                        </div>
                      ` : `
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 text-xs font-medium">
                          <i data-lucide="check" class="w-3 h-3"></i>
                          <span>100% Clean</span>
                        </span>
                      `}
                    </td>
                    <td class="py-3 px-4">
                      ${se.percentage > 0 ? `
                        <span class="font-bold text-white">${se.total_score}/${se.total_questions} (${se.percentage}%)</span>
                        <span class="ml-1 px-1.5 py-0.2 rounded text-[10px] font-bold ${se.grade === 'A' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'}">${se.grade}</span>
                      ` : `
                        <span class="text-slate-500 font-mono">In Progress</span>
                      `}
                    </td>
                    <td class="py-3 px-4 text-right">
                      <form method="POST" action="/action/allow_retake" onsubmit="return confirm('Allow retake for ${se.student_name}?')" class="inline-block">
                        <input type="hidden" name="student_id" value="${se.student_id}">
                        <input type="hidden" name="course_id" value="${se.course_id}">
                        <button type="submit" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all" title="Reset test attempt and allow candidate to retake">
                          Reset / Retake
                        </button>
                      </form>
                    </td>
                  </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          `}
        </div>

      </div>
      ` : ''}

      <!-- ========================================================================= -->
      <!-- TAB 2: COURSES & CURRICULUM STUDIO                                        -->
      <!-- ========================================================================= -->
      ${tab === 'courses' ? `
      <div class="space-y-6">

        <!-- Course Header & Add Bar -->
        <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h2 class="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Courses & Curriculum Studio</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">Manage academic subjects, add chapters/topics, and view question banks</p>
          </div>
          
          <button onclick="document.getElementById('courseFormCard').scrollIntoView({ behavior: 'smooth' })" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-2 self-start sm:self-auto cursor-pointer">
            <i data-lucide="plus-circle" class="w-4 h-4"></i>
            <span>Add New Course</span>
          </button>
        </div>

        <!-- Course Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${courses.map(c => {
            const courseTopics = allTopics.filter(t => t.course_id === c.id);
            return `
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm">
              <div class="space-y-3">
                <div class="flex justify-between items-start gap-2">
                  <div>
                    <span class="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 inline-block mb-1">${c.code}</span>
                    <h3 class="text-sm font-bold text-slate-900 dark:text-white truncate" title="${c.title}">${c.title}</h3>
                  </div>
                  
                  <!-- Create Exam Button -->
                  <a href="/?tab=tests&course_id=${c.id}" class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition-all flex items-center gap-1 cursor-pointer" title="Create an Exam for this Course">
                    <i data-lucide="plus" class="w-3 h-3"></i>
                    <span>Create Exam</span>
                  </a>
                </div>

                <div class="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-center">
                  <div>
                    <span class="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Questions</span>
                    <span class="text-xs font-mono font-bold text-slate-900 dark:text-white">${c.q_count}</span>
                  </div>
                  <div>
                    <span class="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Default Time</span>
                    <span class="text-xs font-mono font-bold text-slate-900 dark:text-white">${c.duration}m</span>
                  </div>
                  <div>
                    <span class="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Default Limit</span>
                    <span class="text-xs font-mono font-bold text-slate-900 dark:text-white">${c.question_limit}</span>
                  </div>
                </div>

                <!-- Collapsible Topics List -->
                <div class="space-y-2">
                  <button type="button" onclick="toggleTopicsList('${c.id}')" class="w-full px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-between border border-slate-200 dark:border-slate-700/60 transition-colors">
                    <span class="flex items-center gap-1.5">
                      <i data-lucide="layers" class="w-3.5 h-3.5 text-indigo-500"></i>
                      <span>Curriculum Topics (${c.topic_count})</span>
                    </span>
                    <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400"></i>
                  </button>

                  <div id="topics_list_${c.id}" class="hidden p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 max-h-56 overflow-y-auto custom-scroll">
                    <!-- Inline Add Topic -->
                    <form method="POST" action="/action/add_topic" class="flex gap-1.5">
                      <input type="hidden" name="course_id" value="${c.id}">
                      <input type="text" name="name" required placeholder="New topic name..." class="flex-grow px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                      <button type="submit" class="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shrink-0">+</button>
                    </form>

                    <div class="space-y-1">
                      ${courseTopics.map((t, idx) => `
                      <div class="flex items-center justify-between p-1.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px]">
                        <span class="text-slate-700 dark:text-slate-300 truncate pr-2" title="${t.name}">
                          <span class="text-slate-400 font-mono text-[10px] mr-1">${idx + 1}.</span>${t.name}
                        </span>
                        <div class="flex items-center gap-1 shrink-0">
                          <span class="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${t.q_count > 0 ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}">${t.q_count} Qs</span>
                          <form method="POST" action="/action/delete_topic" onsubmit="return confirm('Remove topic \"${t.name}\"?')">
                            <input type="hidden" name="topic_id" value="${t.id}">
                            <button type="submit" class="text-slate-400 hover:text-rose-500 p-0.5" title="Delete Topic">
                              <i data-lucide="trash" class="w-3 h-3"></i>
                            </button>
                          </form>
                        </div>
                      </div>
                      `).join('')}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Course Bottom Controls -->
              <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
                <a href="/?tab=questions&target_course=${c.id}" class="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 text-indigo-600 dark:text-indigo-300 text-xs font-bold transition-all flex items-center gap-1">
                  <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                  <span>Add Questions</span>
                </a>

                <div class="flex items-center gap-1.5">
                  <a href="/?tab=courses&edit_course=${c.id}" class="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors" title="Edit Course Parameters">
                    <i data-lucide="settings" class="w-3.5 h-3.5"></i>
                  </a>
                  <form method="POST" action="/action/delete_course" onsubmit="return confirm('Delete course ${c.code} and its topics?')">
                    <input type="hidden" name="course_id" value="${c.id}">
                    <button type="submit" class="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-500 border border-slate-200 dark:border-slate-700 transition-colors" title="Delete Course">
                      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                  </form>
                </div>
              </div>

            </div>
            `;
          }).join('')}
        </div>

        <!-- Add/Edit Course Form Card -->
        <div id="courseFormCard" class="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-4 shadow-xl">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl ${courseToEdit ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'} flex items-center justify-center">
                <i data-lucide="${courseToEdit ? 'edit-2' : 'folder-plus'}" class="w-4 h-4"></i>
              </div>
              <div>
                <h3 class="text-sm font-bold text-white">${courseToEdit ? 'Edit Subject Parameters: ' + courseToEdit.code : 'Register New Course'}</h3>
                <p class="text-xs text-slate-400">Configure subject code, title, duration, question serving limit, and attempts</p>
              </div>
            </div>
            ${courseToEdit ? `<a href="/?tab=courses" class="text-xs font-semibold text-slate-400 hover:text-white">Cancel Edit</a>` : ''}
          </div>

          <form method="POST" action="${courseToEdit ? '/action/edit_course' : '/action/add_course'}" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
            ${courseToEdit ? `<input type="hidden" name="course_id" value="${courseToEdit.id}">` : ''}

            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Course Code *</label>
              <input type="text" name="code" value="${courseToEdit ? courseToEdit.code : ''}" required placeholder="e.g. PHY 101" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono uppercase text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            </div>

            <div class="sm:col-span-2">
              <label class="block text-xs font-bold text-slate-300 mb-1">Course Title *</label>
              <input type="text" name="title" value="${courseToEdit ? courseToEdit.title : ''}" required placeholder="e.g. General Physics I" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Exam Duration (Minutes)</label>
              <input type="number" name="duration" value="${courseToEdit ? courseToEdit.duration : '30'}" min="5" max="300" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Questions Served to Student</label>
              <input type="number" name="question_limit" value="${courseToEdit ? courseToEdit.question_limit : '20'}" min="5" max="200" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Attempts Permitted</label>
              <select name="attempts_allowed" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="1" ${courseToEdit && courseToEdit.attempts_allowed == 1 ? 'selected' : ''}>1 Attempt (Strict Official)</option>
                <option value="2" ${courseToEdit && courseToEdit.attempts_allowed == 2 ? 'selected' : ''}>2 Attempts</option>
                <option value="0" ${courseToEdit && courseToEdit.attempts_allowed == 0 ? 'selected' : ''}>Unlimited (Continuous Practice)</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Initial Status</label>
              <select name="is_locked" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="0" ${courseToEdit && courseToEdit.is_locked == 0 ? 'selected' : ''}>Open (Available to write)</option>
                <option value="1" ${courseToEdit && courseToEdit.is_locked == 1 ? 'selected' : ''}>Closed (Locked)</option>
              </select>
            </div>

            <div class="flex items-end">
              <button type="submit" class="w-full py-2.5 rounded-xl ${courseToEdit ? 'bg-amber-600 hover:bg-amber-500' : 'bg-indigo-600 hover:bg-indigo-500'} text-white text-xs font-bold shadow-md transition-all cursor-pointer">
                ${courseToEdit ? 'Save Changes' : 'Create Course'}
              </button>
            </div>
          </form>
        </div>

      </div>
      ` : ''}

      <!-- ========================================================================= -->
      <!-- TAB 3: EXAMINATIONS & MANUAL TEST CREATION STUDIO                          -->
      <!-- ========================================================================= -->
      ${tab === 'tests' ? `
      <div class="space-y-6">

        <!-- Top Header & Live Master Actions -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-2xl bg-indigo-500/20 text-indigo-500 flex items-center justify-center">
                  <i data-lucide="play-circle" class="w-5 h-5"></i>
                </div>
                <div>
                  <h2 class="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">Examinations & Test Deployment Studio</h2>
                  <p class="text-xs text-slate-500 dark:text-slate-400">Configure manual CBT exams, select topic scopes, and control portal live status</p>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <form method="POST" action="/action/master_tests_live_toggle">
                <input type="hidden" name="target_live" value="1">
                <button type="submit" class="px-3.5 py-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/25 transition-all flex items-center gap-1.5 cursor-pointer">
                  <i data-lucide="radio" class="w-3.5 h-3.5"></i>
                  <span>Make All Tests Live</span>
                </button>
              </form>
              <form method="POST" action="/action/master_tests_live_toggle">
                <input type="hidden" name="target_live" value="0">
                <button type="submit" class="px-3.5 py-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/25 transition-all flex items-center gap-1.5 cursor-pointer">
                  <i data-lucide="pause-circle" class="w-3.5 h-3.5"></i>
                  <span>Take All Offline (Draft)</span>
                </button>
              </form>
              <button onclick="document.getElementById('examStudioCard').scrollIntoView({ behavior: 'smooth' })" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer">
                <i data-lucide="plus" class="w-4 h-4"></i>
                <span>Create New Test</span>
              </button>
            </div>
          </div>

          <!-- Quick Metrics Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <span class="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Total Configured Tests</span>
              <span class="text-xl font-black text-slate-900 dark:text-white mt-0.5 block">${allTests.length}</span>
            </div>
            <div class="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <span class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active Live Exams</span>
              </span>
              <span class="text-xl font-black text-emerald-600 dark:text-emerald-300 mt-0.5 block">${liveTestsCount}</span>
            </div>
            <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <span class="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Draft / Offline Tests</span>
              <span class="text-xl font-black text-slate-900 dark:text-white mt-0.5 block">${allTests.length - liveTestsCount}</span>
            </div>
            <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <span class="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Available Course Banks</span>
              <span class="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5 block">${courses.length}</span>
            </div>
          </div>
        </div>

        <!-- Exam Creation Studio Card -->
        <div id="examStudioCard" class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
                <i data-lucide="sparkles" class="w-4 h-4"></i>
              </div>
              <div>
                <h3 class="text-base font-extrabold text-slate-900 dark:text-white">Create & Configure New Examination</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400">Select course, choose full curriculum or specific topics, define rules, and launch live</p>
              </div>
            </div>
          </div>

          <form method="POST" action="/action/create_test" id="createTestForm" class="space-y-6">
            
            <!-- Step 1: Course & Test Title -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  1. Select Subject Course <span class="text-rose-500">*</span>
                </label>
                <select name="course_id" id="testCourseSelect" required onchange="handleCourseSelectionChange()" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  ${courses.map(c => `
                    <option value="${c.id}" data-code="${c.code}" data-title="${c.title}" data-duration="${c.duration}" data-limit="${c.question_limit}">
                      ${c.code} &bull; ${c.title} (${c.q_count} Questions available)
                    </option>
                  `).join('')}
                </select>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Subject curriculum from which questions will be selected.</p>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  2. Examination Title / Header <span class="text-rose-500">*</span>
                </label>
                <input type="text" name="title" id="testTitleInput" required placeholder="e.g. PHY 101 - General Physics Comprehensive Mock Exam" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">This title is displayed on candidate exam cards and test report cards.</p>
              </div>
            </div>

            <!-- Step 2: Topic Scope Selection -->
            <div class="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-4">
              <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <label class="block text-xs font-extrabold text-slate-900 dark:text-white">
                    3. Topic Scope (Question Pool Coverage)
                  </label>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400">Choose whether this test covers all curriculum topics or only specific chosen chapters</p>
                </div>

                <!-- Scope Mode Radios -->
                <div class="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                  <label class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-colors" id="labelTopicAll">
                    <input type="radio" name="topic_mode" value="ALL" checked onchange="handleTopicModeChange(this.value)" class="text-indigo-600 focus:ring-0">
                    <span class="text-slate-800 dark:text-slate-200">All Curriculum Topics</span>
                  </label>
                  <label class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-colors" id="labelTopicSpecific">
                    <input type="radio" name="topic_mode" value="SPECIFIC" onchange="handleTopicModeChange(this.value)" class="text-indigo-600 focus:ring-0">
                    <span class="text-slate-800 dark:text-slate-200">Specific Topics Only</span>
                  </label>
                </div>
              </div>

              <!-- Specific Topics Checklist Area -->
              <div id="specificTopicsBox" class="hidden space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-bold text-slate-700 dark:text-slate-300">Select topics to include in this exam:</span>
                  <div class="flex items-center gap-2 text-[11px] font-bold">
                    <button type="button" onclick="toggleAllTopicsCheckbox(true)" class="text-indigo-600 dark:text-indigo-400 hover:underline">Select All</button>
                    <span class="text-slate-300 dark:text-slate-600">&bull;</span>
                    <button type="button" onclick="toggleAllTopicsCheckbox(false)" class="text-slate-500 hover:underline">Clear All</button>
                  </div>
                </div>

                <div id="topicCheckboxesList" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto custom-scroll p-1">
                  <!-- Dynamic checkboxes populated by JS -->
                </div>
              </div>
            </div>

            <!-- Step 3: Exam Parameters & Proctored Security -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Duration (Minutes)
                </label>
                <input type="number" name="duration" id="testDurationInput" value="30" min="5" max="300" required class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <span class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">Time limit before submission.</span>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Questions Served Limit
                </label>
                <input type="number" name="question_limit" id="testLimitInput" value="20" min="5" max="250" required class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <span class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">Number of questions per candidate session.</span>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Attempts Allowed
                </label>
                <select name="attempts_allowed" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="1">1 Attempt (Strict Official Exam)</option>
                  <option value="2">2 Attempts</option>
                  <option value="0">Unlimited (Continuous Practice)</option>
                </select>
                <span class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">How many times each matric number can sit.</span>
              </div>
            </div>

            <!-- Proctored Checkboxes -->
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <label class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" name="auto_submit" value="1" checked class="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-0">
                <div>
                  <span class="text-xs font-bold text-slate-800 dark:text-white block">Auto-Submit on Clock Expiry</span>
                  <span class="text-[10px] text-slate-500 dark:text-slate-400 block">Forces submission when countdown hits 00:00</span>
                </div>
              </label>

              <label class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" name="enforce_fullscreen" value="1" checked class="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-0">
                <div>
                  <span class="text-xs font-bold text-slate-800 dark:text-white block">Enforce Fullscreen Proctored</span>
                  <span class="text-[10px] text-slate-500 dark:text-slate-400 block">Locks exam screen and tracks tab escapes</span>
                </div>
              </label>

              <label class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" name="shuffle_questions" value="1" checked class="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-0">
                <div>
                  <span class="text-xs font-bold text-slate-800 dark:text-white block">Randomize Questions Order</span>
                  <span class="text-[10px] text-slate-500 dark:text-slate-400 block">Shuffles questions for each student</span>
                </div>
              </label>

              <label class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" name="shuffle_options" value="1" checked class="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-0">
                <div>
                  <span class="text-xs font-bold text-slate-800 dark:text-white block">Randomize Choices (A,B,C,D)</span>
                  <span class="text-[10px] text-slate-500 dark:text-slate-400 block">Prevents looking at peer answers</span>
                </div>
              </label>

              <label class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" name="calculator_allowed" value="1" checked class="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-0">
                <div>
                  <span class="text-xs font-bold text-slate-800 dark:text-white block">Scientific Calculator</span>
                  <span class="text-[10px] text-slate-500 dark:text-slate-400 block">Allows on-screen medical calculator</span>
                </div>
              </label>

              <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <span class="text-xs font-bold text-slate-800 dark:text-white block">Max Tab Switches</span>
                  <span class="text-[10px] text-slate-500 dark:text-slate-400 block">Terminates on violation</span>
                </div>
                <input type="number" name="max_tab_switches" value="3" min="1" max="10" class="w-16 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-center text-slate-900 dark:text-white">
              </div>
            </div>

            <!-- Launch State & Submit Button -->
            <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <label class="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="is_live" value="1" checked class="w-5 h-5 rounded text-emerald-600 focus:ring-0">
                <div>
                  <span class="text-xs font-black text-slate-900 dark:text-white block">Make Test Live Immediately</span>
                  <span class="text-[11px] text-slate-500 dark:text-slate-400 block">Test will appear live for students on courses.php and index.php</span>
                </div>
              </label>

              <button type="submit" class="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer">
                <i data-lucide="check-circle" class="w-4 h-4"></i>
                <span>Deploy & Save Examination</span>
              </button>
            </div>

          </form>
        </div>

        <!-- Configured Tests Registry -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-base font-extrabold text-slate-900 dark:text-white">Configured Examinations Registry (${allTests.length})</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Manage individual test live status, topic scope, and student links</p>
            </div>
          </div>

          ${allTests.length === 0 ? `
          <div class="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <i data-lucide="inbox" class="w-10 h-10 text-slate-400 mx-auto mb-2"></i>
            <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300">No Examinations Configured Yet</h4>
            <p class="text-xs text-slate-400 max-w-sm mx-auto mt-1">Use the Examination Creation Studio above to create your first CBT mock test from any subject course.</p>
          </div>
          ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${allTests.map(t => {
              let topicsLabel = 'All Curriculum Topics';
              try {
                const parsed = JSON.parse(t.topic_ids || '[]');
                if (Array.isArray(parsed) && !parsed.includes('ALL')) {
                  topicsLabel = parsed.length + ' Specific Topics Selected';
                }
              } catch(e) {}

              return `
              <div class="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-xs">
                <div class="space-y-3">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <div class="flex items-center gap-2 mb-1">
                        <span class="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30">
                          ${t.course_code}
                        </span>
                        <span class="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[180px]">${t.course_title}</span>
                      </div>
                      <h4 class="text-sm font-black text-slate-900 dark:text-white leading-snug">${t.title}</h4>
                    </div>

                    <!-- Live Status Badge -->
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide border flex items-center gap-1.5 shrink-0 ${
                      t.is_live 
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30' 
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'
                    }">
                      <span class="w-2 h-2 rounded-full ${t.is_live ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}"></span>
                      <span>${t.is_live ? 'LIVE ON PORTAL' : 'DRAFT / OFFLINE'}</span>
                    </span>
                  </div>

                  <!-- Details Badges -->
                  <div class="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <div>
                      <span class="text-[10px] text-slate-400 block font-medium">Timer</span>
                      <span class="text-xs font-mono font-bold text-slate-800 dark:text-white">${t.duration}m</span>
                    </div>
                    <div>
                      <span class="text-[10px] text-slate-400 block font-medium">Serve Limit</span>
                      <span class="text-xs font-mono font-bold text-slate-800 dark:text-white">${t.question_limit} Qs</span>
                    </div>
                    <div>
                      <span class="text-[10px] text-slate-400 block font-medium">Attempts</span>
                      <span class="text-xs font-mono font-bold text-slate-800 dark:text-white">${t.attempts_allowed == 1 ? '1 Attempt' : (t.attempts_allowed == 0 ? 'Unlimited' : t.attempts_allowed)}</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                    <i data-lucide="layers" class="w-3.5 h-3.5 text-indigo-500 shrink-0"></i>
                    <span class="font-semibold truncate">${topicsLabel}</span>
                  </div>
                </div>

                <!-- Action Controls -->
                <div class="pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-2">
                  <!-- Toggle Live -->
                  <form method="POST" action="/action/toggle_test_live">
                    <input type="hidden" name="test_id" value="${t.id}">
                    <input type="hidden" name="current_live" value="${t.is_live}">
                    <button type="submit" class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      t.is_live
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 hover:bg-amber-500/25 border border-amber-500/30'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm'
                    }">
                      <i data-lucide="${t.is_live ? 'pause-circle' : 'play'}" class="w-3.5 h-3.5"></i>
                      <span>${t.is_live ? 'Take Offline' : 'Make Live'}</span>
                    </button>
                  </form>

                  <div class="flex items-center gap-1.5">
                    <!-- Student Direct Link -->
                    <a href="https://premed-test-portal.vercel.app/exam.php?test_id=${encodeURIComponent(t.id)}" target="_blank" class="p-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors" title="View Student Exam Link">
                      <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                    </a>

                    <!-- Delete Test -->
                    <form method="POST" action="/action/delete_test" onsubmit="return confirm('Permanently remove examination \"${t.title}\"?')">
                      <input type="hidden" name="test_id" value="${t.id}">
                      <button type="submit" class="p-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer" title="Delete Test">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </form>
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

      <!-- ========================================================================= -->
      <!-- TAB 4: QUESTION STUDIO (ENTERPRISE EXPERIENCE)                            -->
      <!-- ========================================================================= -->
      ${tab === 'questions' ? `
      <div class="space-y-6">

        <!-- Question Header & Search Studio -->
        <div class="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-4">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-lg font-extrabold text-white tracking-tight">Question Bank Studio</h2>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  ${totalQuestions} Verified Questions
                </span>
              </div>
              <p class="text-xs text-slate-400">Categorized by subject curriculum, with 4 choices, answers, and physical solutions</p>
            </div>

            <!-- Instant Search Input -->
            <div class="flex items-center gap-2.5 w-full md:w-auto">
              <div class="relative w-full md:w-72">
                <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3"></i>
                <input type="text" id="qFilterInput" onkeyup="filterQuestions()" placeholder="Search questions, options, or topics..." class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              </div>
            </div>
          </div>

          <!-- Horizontal Topic Filter Carousel / Pills -->
          <div class="space-y-2 pt-2 border-t border-slate-800">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Quick Topic Filter</span>
            <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
              
              <button onclick="selectTopicFilter('ALL')" id="pill_ALL" class="topic-pill px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold shrink-0 transition-all">
                All Topics (${questions.length})
              </button>

              ${allTopics.map(t => `
              <button onclick="selectTopicFilter('${t.id}')" id="pill_${t.id}" class="topic-pill px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 shrink-0 transition-all font-medium flex items-center gap-1.5">
                <span>${t.name}</span>
                <span class="px-1.5 py-0.2 rounded text-[10px] bg-slate-700 font-mono text-slate-300 font-bold">${t.q_count}</span>
              </button>
              `).join('')}

            </div>
          </div>
        </div>

        <!-- Question Creation Hub (Single Question vs Bulk Topic Parser) -->
        <div class="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <div class="flex items-center gap-2">
              <button type="button" onclick="switchQuestionMode('single')" id="modeBtnSingle" class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white transition-all">
                Single Question Builder
              </button>
              <button type="button" onclick="switchQuestionMode('bulk')" id="modeBtnBulk" class="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-all">
                Smart Topic-by-Topic Parser
              </button>
            </div>
            ${questionToEdit ? `<a href="/?tab=questions" class="text-xs font-semibold text-slate-400 hover:text-white">Cancel Edit</a>` : ''}
          </div>

          <!-- Mode 1: Single Question Form -->
          <div id="singleQuestionFormArea">
            <form method="POST" action="${questionToEdit ? '/action/edit_question' : '/action/add_question'}" class="space-y-4">
              ${questionToEdit ? `<input type="hidden" name="question_id" value="${questionToEdit.id}">` : ''}

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label class="block text-xs font-bold text-slate-300 mb-1">Target Course *</label>
                  <select name="course_id" id="singleCourseSelect" onchange="syncTopicDropdown('singleCourseSelect', 'singleTopicSelect')" required class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    ${courses.map(c => `<option value="${c.id}" ${questionToEdit && questionToEdit.course_id === c.id ? 'selected' : ''}>${c.code} - ${c.title}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-300 mb-1">Target Topic *</label>
                  <select name="topic_id" id="singleTopicSelect" required class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <!-- Dynamically populated -->
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1">Question Problem Statement *</label>
                <textarea name="text" required rows="2" placeholder="e.g. A particle moves with constant speed of 6 m/s. Which statement describes its motion?" class="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed">${questionToEdit ? questionToEdit.text : ''}</textarea>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label class="block text-xs font-bold text-slate-300 mb-1">Option A *</label>
                  <input type="text" name="a" value="${questionToEdit ? questionToEdit.a : ''}" required placeholder="Option A text" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-300 mb-1">Option B *</label>
                  <input type="text" name="b" value="${questionToEdit ? questionToEdit.b : ''}" required placeholder="Option B text" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-300 mb-1">Option C</label>
                  <input type="text" name="c" value="${questionToEdit && questionToEdit.c ? questionToEdit.c : ''}" placeholder="Option C text" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-300 mb-1">Option D</label>
                  <input type="text" name="d" value="${questionToEdit && questionToEdit.d ? questionToEdit.d : ''}" placeholder="Option D text" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label class="block text-xs font-bold text-emerald-400 mb-1">Correct Answer Choice *</label>
                  <select name="correct_option" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-emerald-500/50 text-xs font-bold text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="A" ${questionToEdit && questionToEdit.correct_option === 'A' ? 'selected' : ''}>Option A is Correct Answer</option>
                    <option value="B" ${questionToEdit && questionToEdit.correct_option === 'B' ? 'selected' : ''}>Option B is Correct Answer</option>
                    <option value="C" ${questionToEdit && questionToEdit.correct_option === 'C' ? 'selected' : ''}>Option C is Correct Answer</option>
                    <option value="D" ${questionToEdit && questionToEdit.correct_option === 'D' ? 'selected' : ''}>Option D is Correct Answer</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-300 mb-1">Step-by-Step Clinical/Mathematical Solution</label>
                  <input type="text" name="explanation" value="${questionToEdit && questionToEdit.explanation ? questionToEdit.explanation : ''}" placeholder="Working or physical principle..." class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>
              </div>

              <div class="flex justify-end pt-2">
                <button type="submit" class="px-5 py-2.5 rounded-xl ${questionToEdit ? 'bg-amber-600 hover:bg-amber-500' : 'bg-indigo-600 hover:bg-indigo-500'} text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer">
                  ${questionToEdit ? 'Save Changes' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>

          <!-- Mode 2: Bulk Topic Parser Area -->
          <div id="bulkQuestionFormArea" class="hidden space-y-4">
            <form method="POST" action="/action/bulk_add_questions" class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label class="block text-xs font-bold text-slate-300 mb-1">Target Subject *</label>
                  <select name="course_id" id="bulkCourseSelect" onchange="syncTopicDropdown('bulkCourseSelect', 'bulkTopicSelect', null, true)" required class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    ${courses.map(c => `<option value="${c.id}">${c.code} - ${c.title}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-300 mb-1">Target Topic *</label>
                  <select name="topic_id" id="bulkTopicSelect" required class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <!-- Populated dynamically -->
                  </select>
                </div>
              </div>

              <div class="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-3">
                <i data-lucide="sparkles" class="w-4 h-4 text-indigo-400 shrink-0 mt-0.5"></i>
                <div class="leading-relaxed">
                  <strong>Smart Parser Syntax:</strong> You can paste multiple questions separated by <code>---</code>. Include <code>TOPIC: Name</code> to switch topics on the fly, or select a topic above.
                </div>
              </div>

              <div>
                <textarea name="bulk_text" rows="7" placeholder="TOPIC: Space and time
Q: A particle travels at a constant speed of 6 m/s. What does this mean?
A: Acceleration is 6 m/s²
B: Travels 6 meters in each 1 second interval
C: Changes direction by 6 radians
D: Remains stationary
ANS: B
EXP: Uniform speed represents equal distance per unit time.
---
Q: A car travels 4 km East and 7 km West. What is total distance?
A: 11 km
B: 3 km
C: 4 km
D: 7 km
ANS: A
EXP: Scalar distance is 4 + 7 = 11 km." class="w-full p-3.5 rounded-2xl bg-slate-800 border border-slate-700 font-mono text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"></textarea>
              </div>

              <div class="flex justify-end">
                <button type="submit" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-2">
                  <i data-lucide="zap" class="w-4 h-4"></i>
                  <span>Parse & Import All</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Rendered Question Feed (Studio Cards) -->
        <div class="space-y-3" id="questionsContainer">
          ${questions.map((q, idx) => `
          <div class="question-item bg-slate-900 rounded-3xl p-5 border border-slate-800 space-y-3 hover:border-slate-700 transition-all"
               data-course="${q.course_id}"
               data-topic="${q.topic_id}"
               data-search="${(q.text + ' ' + q.course_code + ' ' + (q.topic_name || '') + ' ' + (q.explanation || '')).toLowerCase()}">
            
            <div class="flex justify-between items-start gap-3">
              <div class="flex flex-wrap items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">${q.course_code}</span>
                <span class="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">${q.topic_name || 'General'}</span>
                <span class="text-xs text-slate-500 font-mono font-bold">#${idx + 1}</span>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                <a href="/?tab=questions&edit_question=${q.id}" class="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors" title="Edit Question">
                  <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                </a>
                <form method="POST" action="/action/delete_question" onsubmit="return confirm('Delete this question permanently?')">
                  <input type="hidden" name="question_id" value="${q.id}">
                  <button type="submit" class="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors" title="Delete Question">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  </button>
                </form>
              </div>
            </div>

            <p class="text-xs sm:text-sm font-semibold text-white leading-relaxed">${q.text}</p>

            <!-- 4 Multiple Choice Tiles -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 text-xs">
              <div class="p-2.5 rounded-2xl ${q.correct_option === 'A' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-bold' : 'bg-slate-800/60 border-slate-700/60 text-slate-300'} border flex items-center justify-between">
                <span><strong class="text-slate-400 mr-1.5">A.</strong> ${q.a}</span>
                ${q.correct_option === 'A' ? '<i data-lucide="check" class="w-4 h-4 text-emerald-400 shrink-0"></i>' : ''}
              </div>
              <div class="p-2.5 rounded-2xl ${q.correct_option === 'B' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-bold' : 'bg-slate-800/60 border-slate-700/60 text-slate-300'} border flex items-center justify-between">
                <span><strong class="text-slate-400 mr-1.5">B.</strong> ${q.b}</span>
                ${q.correct_option === 'B' ? '<i data-lucide="check" class="w-4 h-4 text-emerald-400 shrink-0"></i>' : ''}
              </div>
              <div class="p-2.5 rounded-2xl ${q.correct_option === 'C' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-bold' : 'bg-slate-800/60 border-slate-700/60 text-slate-300'} border flex items-center justify-between">
                <span><strong class="text-slate-400 mr-1.5">C.</strong> ${q.c || '—'}</span>
                ${q.correct_option === 'C' ? '<i data-lucide="check" class="w-4 h-4 text-emerald-400 shrink-0"></i>' : ''}
              </div>
              <div class="p-2.5 rounded-2xl ${q.correct_option === 'D' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-bold' : 'bg-slate-800/60 border-slate-700/60 text-slate-300'} border flex items-center justify-between">
                <span><strong class="text-slate-400 mr-1.5">D.</strong> ${q.d || '—'}</span>
                ${q.correct_option === 'D' ? '<i data-lucide="check" class="w-4 h-4 text-emerald-400 shrink-0"></i>' : ''}
              </div>
            </div>

            <!-- Step-by-Step Solution Accordion -->
            ${q.explanation ? `
            <details class="text-xs text-slate-300 bg-slate-950 p-3 rounded-2xl border border-slate-800 cursor-pointer">
              <summary class="font-bold text-indigo-400 flex items-center gap-1.5">
                <i data-lucide="book-open" class="w-3.5 h-3.5"></i>
                <span>Step-by-Step Solution & Working</span>
              </summary>
              <p class="mt-2 text-slate-300 leading-relaxed font-mono text-[11px] pl-4 border-l-2 border-indigo-500">${q.explanation}</p>
            </details>
            ` : ''}

          </div>
          `).join('')}
        </div>

      </div>
      ` : ''}

      <!-- ========================================================================= -->
      <!-- TAB 5: SECURITY & ANTI-CHEATING SUITE                                     -->
      <!-- ========================================================================= -->
      ${tab === 'security' ? `
      <div class="space-y-6">

        <!-- Security Posture Badge -->
        <div class="rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 border border-slate-800 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div class="space-y-1">
            <div class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold badge-glow">
              <i data-lucide="shield-check" class="w-3.5 h-3.5 text-emerald-400"></i>
              <span>High Security Mode Active</span>
            </div>
            <h2 class="text-xl font-extrabold text-white tracking-tight">Anti-Cheating & Exam Integrity Guard</h2>
            <p class="text-xs text-slate-400">Military-grade protection against browser tab switching, unauthorized copying, and screen sharing</p>
          </div>

          <div class="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-center">
            <span class="text-[10px] text-slate-400 uppercase font-bold block">Integrity Score</span>
            <span class="text-xl font-black text-emerald-400">98% Secure</span>
          </div>
        </div>

        <form method="POST" action="/action/save_security" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <label class="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex items-start gap-4 cursor-pointer hover:border-slate-700 transition-colors shadow-sm">
              <input type="checkbox" name="anti_cheat_blur" value="1" ${antiCheatBlur ? 'checked' : ''} class="w-5 h-5 mt-1 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0">
              <div class="space-y-1">
                <span class="text-xs sm:text-sm font-bold text-white block">Real-Time Screen & Window Blur Detection</span>
                <span class="text-xs text-slate-400 block leading-relaxed">Alerts and increments infraction counter whenever candidate clicks away, minimizes window, or switches applications.</span>
              </div>
            </label>

            <label class="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex items-start gap-4 cursor-pointer hover:border-slate-700 transition-colors shadow-sm">
              <input type="checkbox" name="enforce_fullscreen" value="1" ${enforceFullscreen ? 'checked' : ''} class="w-5 h-5 mt-1 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0">
              <div class="space-y-1">
                <span class="text-xs sm:text-sm font-bold text-white block">Enforce Lockdown Fullscreen Window</span>
                <span class="text-xs text-slate-400 block leading-relaxed">Forces browser to occupy entire display area, preventing split-screen notes or concurrent messaging apps.</span>
              </div>
            </label>

            <label class="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex items-start gap-4 cursor-pointer hover:border-slate-700 transition-colors shadow-sm">
              <input type="checkbox" name="shuffle_questions" value="1" ${shuffleQuestions ? 'checked' : ''} class="w-5 h-5 mt-1 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0">
              <div class="space-y-1">
                <span class="text-xs sm:text-sm font-bold text-white block">Randomize Question Sequence per Candidate</span>
                <span class="text-xs text-slate-400 block leading-relaxed">Renders test questions in a unique randomized permutation for each student sitting side-by-side in computer halls.</span>
              </div>
            </label>

            <label class="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex items-start gap-4 cursor-pointer hover:border-slate-700 transition-colors shadow-sm">
              <input type="checkbox" name="shuffle_options" value="1" ${shuffleOptions ? 'checked' : ''} class="w-5 h-5 mt-1 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0">
              <div class="space-y-1">
                <span class="text-xs sm:text-sm font-bold text-white block">Shuffle Answer Option Choices (A, B, C, D)</span>
                <span class="text-xs text-slate-400 block leading-relaxed">Randomizes the position of options for every question to neutralize peer signaling (e.g. whispering "Question 4 is B").</span>
              </div>
            </label>

            <label class="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex items-start gap-4 cursor-pointer hover:border-slate-700 transition-colors shadow-sm">
              <input type="checkbox" name="watermark_enabled" value="1" ${watermarkEnabled ? 'checked' : ''} class="w-5 h-5 mt-1 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0">
              <div class="space-y-1">
                <span class="text-xs sm:text-sm font-bold text-white block">Forensic Candidate ID Screen Watermarking</span>
                <span class="text-xs text-slate-400 block leading-relaxed">Projects transparent matriculation number across question tiles, rendering smartphone screen capture immediately identifiable.</span>
              </div>
            </label>

            <label class="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex items-start gap-4 cursor-pointer hover:border-slate-700 transition-colors shadow-sm">
              <input type="checkbox" name="disable_copy_paste" value="1" ${disableCopyPaste ? 'checked' : ''} class="w-5 h-5 mt-1 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0">
              <div class="space-y-1">
                <span class="text-xs sm:text-sm font-bold text-white block">Disable Text Selection & Clipboard Copying</span>
                <span class="text-xs text-slate-400 block leading-relaxed">Blocks Ctrl+C, Ctrl+V, inspect element, and right-click context menu across examination pages.</span>
              </div>
            </label>

            <label class="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex items-start gap-4 cursor-pointer hover:border-slate-700 transition-colors shadow-sm">
              <input type="checkbox" name="calculator_allowed" value="1" ${calculatorAllowed ? 'checked' : ''} class="w-5 h-5 mt-1 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0">
              <div class="space-y-1">
                <span class="text-xs sm:text-sm font-bold text-white block">Enable On-Screen Clinical Scientific Calculator</span>
                <span class="text-xs text-slate-400 block leading-relaxed">Provides built-in floating scientific calculator during physics and arithmetic tests without opening secondary apps.</span>
              </div>
            </label>

            <div class="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2 shadow-sm">
              <span class="text-xs sm:text-sm font-bold text-white block">Auto-Termination Infraction Threshold</span>
              <span class="text-xs text-slate-400 block leading-relaxed">Maximum permitted tab switch departures before automatic exam termination:</span>
              <select name="max_tab_switches" class="mt-2 w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold">
                <option value="1" ${maxTabSwitches === '1' ? 'selected' : ''}>1 Violation (Strict Zero-Tolerance)</option>
                <option value="2" ${maxTabSwitches === '2' ? 'selected' : ''}>2 Violations</option>
                <option value="3" ${maxTabSwitches === '3' ? 'selected' : ''}>3 Violations (Standard University Policy)</option>
                <option value="5" ${maxTabSwitches === '5' ? 'selected' : ''}>5 Violations (Lenient Practice)</option>
                <option value="0" ${maxTabSwitches === '0' ? 'selected' : ''}>Audit Only (Log events without auto-terminating)</option>
              </select>
            </div>

          </div>

          <div class="flex justify-end pt-2">
            <button type="submit" class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer">
              Save Security Policies
            </button>
          </div>
        </form>

      </div>
      ` : ''}

      <!-- ========================================================================= -->
      <!-- TAB 6: STUDENTS, LIVE RADAR & RESULTS DIRECTORY                           -->
      <!-- ========================================================================= -->
      ${tab === 'candidates' ? `
      <div class="space-y-6">

        <!-- Top Live Sync Console -->
        <div class="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/60 rounded-3xl p-6 border border-emerald-500/30 shadow-xl space-y-4">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-bold text-white flex items-center gap-2">
                  <i data-lucide="download-cloud" class="w-4 h-4 text-emerald-400"></i>
                  <span>Live Student Portal Synchronization</span>
                </h3>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Active</span>
              </div>
              <p class="text-xs text-slate-300 mt-0.5">
                Pulls all accounts created on the student portal, active exam runs, tab departure logs, and submitted scores directly into this admin console.
              </p>
            </div>
          </div>

          <form method="POST" action="/action/pull_live_students" class="flex flex-col sm:flex-row gap-2.5">
            <input type="url" name="website_url" value="${liveWebsiteUrl}" placeholder="https://premed-test-portal.vercel.app" class="flex-grow px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono">
            <button type="submit" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer shrink-0 flex items-center justify-center gap-2">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
              <span>Download Latest Activity Now</span>
            </button>
          </form>
        </div>

        <!-- Candidate Directory & Search Hub -->
        <div class="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-4">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <i data-lucide="users" class="w-4 h-4 text-indigo-400"></i>
                <span>Enrolled Candidates Directory (${students.length})</span>
              </h3>
              <p class="text-xs text-slate-400">Search and manage candidates registered online</p>
            </div>

            <div class="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <select id="studentDeptFilter" onchange="filterStudentsTable()" class="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none">
                <option value="ALL">All Departments (${DEPARTMENTS.length})</option>
                ${DEPARTMENTS.map(d => `<option value="${d}">${d}</option>`).join('')}
              </select>

              <input type="text" id="studentSearchInput" onkeyup="filterStudentsTable()" placeholder="Search name or matric..." class="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none">
            </div>
          </div>

          <!-- Students Directory Table -->
          ${students.length === 0 ? `
          <div class="py-12 text-center rounded-2xl bg-slate-800/40 border border-dashed border-slate-800 space-y-2">
            <p class="text-xs font-bold text-slate-400">No students registered yet.</p>
            <p class="text-[11px] text-slate-500">Click "Download Latest Activity Now" above to fetch students registered on the portal.</p>
          </div>
          ` : `
          <div class="overflow-x-auto custom-scroll">
            <table class="w-full text-left text-xs" id="studentsTable">
              <thead class="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700 text-[11px] uppercase tracking-wider">
                <tr>
                  <th class="py-3 px-4 rounded-l-xl">Candidate Name</th>
                  <th class="py-3 px-4">Matric No.</th>
                  <th class="py-3 px-4">Department</th>
                  <th class="py-3 px-4">Tests Taken</th>
                  <th class="py-3 px-4 rounded-r-xl text-right">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800 text-slate-200">
                ${students.map(st => `
                <tr class="student-row hover:bg-slate-800/40 transition-colors" data-name="${(st.name || '').toLowerCase()}" data-matric="${(st.matric_no || '').toLowerCase()}" data-dept="${st.department || ''}">
                  <td class="py-3 px-4 font-bold text-white">${st.name}</td>
                  <td class="py-3 px-4 font-mono text-slate-300">${st.matric_no}</td>
                  <td class="py-3 px-4">
                    <span class="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">${st.department}</span>
                  </td>
                  <td class="py-3 px-4 font-mono">${st.tests_count} completed</td>
                  <td class="py-3 px-4 text-right">
                    <form method="POST" action="/action/delete_student" onsubmit="return confirm('Remove student ${st.matric_no}?')">
                      <input type="hidden" name="student_id" value="${st.id}">
                      <button type="submit" class="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </form>
                  </td>
                </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          `}
        </div>

        <!-- Completed Submissions & Scorecards Table -->
        <div class="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-4">
          <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <i data-lucide="award" class="w-4 h-4 text-amber-400"></i>
                <span>Completed Exam Submissions (${submissions.length})</span>
              </h3>
              <p class="text-xs text-slate-400">Scorecard registry, percentage calculations, and tab departure violations</p>
            </div>

            <!-- CSV Export Tool -->
            <button onclick="exportSubmissionsCSV()" class="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer">
              <i data-lucide="download" class="w-3.5 h-3.5"></i>
              <span>Export CSV Spreadsheet</span>
            </button>
          </div>

          ${submissions.length === 0 ? `
          <div class="py-10 text-center rounded-2xl bg-slate-800/40 text-slate-500 text-xs">
            No examination submissions recorded yet.
          </div>
          ` : `
          <div class="overflow-x-auto custom-scroll">
            <table class="w-full text-left text-xs" id="submissionsTable">
              <thead class="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700 text-[11px] uppercase tracking-wider">
                <tr>
                  <th class="py-3 px-4 rounded-l-xl">Candidate</th>
                  <th class="py-3 px-4">Department</th>
                  <th class="py-3 px-4">Subject</th>
                  <th class="py-3 px-4">Score</th>
                  <th class="py-3 px-4">Grade</th>
                  <th class="py-3 px-4 rounded-r-xl">Integrity</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800 text-slate-200">
                ${submissions.map(sub => `
                <tr class="hover:bg-slate-800/40 transition-colors">
                  <td class="py-3 px-4">
                    <span class="font-bold text-white block">${sub.student_name}</span>
                    <span class="text-[10px] text-slate-400 font-mono">${sub.matric_no}</span>
                  </td>
                  <td class="py-3 px-4 text-slate-300">${sub.student_dept || 'Medicine'}</td>
                  <td class="py-3 px-4">
                    <span class="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">${sub.course_code}</span>
                  </td>
                  <td class="py-3 px-4 font-bold text-white">${sub.total_score}/${sub.total_questions} (${sub.percentage}%)</td>
                  <td class="py-3 px-4">
                    <span class="px-2 py-0.5 rounded-lg text-xs font-bold ${sub.grade === 'A' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-300'}">
                      Grade ${sub.grade}
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    ${sub.tab_switches > 0 ? `
                      <span class="px-2 py-0.5 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        ⚠️ ${sub.tab_switches} Switched Tabs
                      </span>
                    ` : `
                      <span class="text-emerald-400 font-semibold flex items-center gap-1">
                        <i data-lucide="check" class="w-3.5 h-3.5"></i> Clean
                      </span>
                    `}
                  </td>
                </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          `}
        </div>

        <!-- Add Student Account Manually Card -->
        <div class="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-4">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <i data-lucide="user-plus" class="w-4 h-4"></i>
            </div>
            <div>
              <h3 class="text-sm font-bold text-white">Direct Candidate Registration</h3>
              <p class="text-xs text-slate-400">Directly provision a student account into the school database</p>
            </div>
          </div>

          <form method="POST" action="/action/add_student" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Full Name *</label>
              <input type="text" name="name" required placeholder="e.g. Adeola Adeleke" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Matriculation Number *</label>
              <input type="text" name="matric_no" required placeholder="e.g. MED/2026/042" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono uppercase text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Department *</label>
              <select name="department" required class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                ${DEPARTMENTS.map(d => `<option value="${d}">${d}</option>`).join('')}
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Initial Password *</label>
              <input type="text" name="password" required value="123456" placeholder="Password" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Phone Number (Optional)</label>
              <input type="tel" name="phone" placeholder="08012345678" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            </div>

            <div class="flex items-end">
              <button type="submit" class="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer">
                Register Candidate
              </button>
            </div>
          </form>
        </div>

      </div>
      ` : ''}

    </div>
  </div>

  <!-- ================= ENTERPRISE FOOTER ================= -->
  <footer class="border-t border-slate-800 py-6 bg-slate-900 text-center text-xs text-slate-400">
    <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span>Premed Test Portal &bull; Enterprise Admin Command Center</span>
      </div>
      <p class="text-slate-500">SQLite Architecture &bull; Vercel Live Synchronization</p>
    </div>
  </footer>

  <!-- ================= CLIENT SCRIPTS ================= -->
  <script>
    lucide.createIcons();

    const TOPICS_DATA = ${JSON.stringify(allTopics)};
    let currentTopicFilter = 'ALL';

    function switchQuestionMode(mode) {
      const singleArea = document.getElementById('singleQuestionFormArea');
      const bulkArea = document.getElementById('bulkQuestionFormArea');
      const singleBtn = document.getElementById('modeBtnSingle');
      const bulkBtn = document.getElementById('modeBtnBulk');
      
      if (mode === 'single') {
        singleArea.classList.remove('hidden');
        bulkArea.classList.add('hidden');
        singleBtn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white transition-all';
        bulkBtn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-all';
      } else {
        singleArea.classList.add('hidden');
        bulkArea.classList.remove('hidden');
        bulkBtn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white transition-all';
        singleBtn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-all';
      }
    }

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
        autoOpt.textContent = '✨ Auto-Detect Topic from Text Headers';
        topicEl.appendChild(autoOpt);
      }

      if (courseTopics.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'General Curriculum';
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

    function selectTopicFilter(topicId) {
      currentTopicFilter = topicId;
      document.querySelectorAll('.topic-pill').forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'text-white');
        btn.classList.add('bg-slate-800', 'text-slate-300');
      });
      const activeBtn = document.getElementById('pill_' + topicId);
      if (activeBtn) {
        activeBtn.classList.add('bg-indigo-600', 'text-white');
        activeBtn.classList.remove('bg-slate-800', 'text-slate-300');
      }
      filterQuestions();
    }

    function filterQuestions() {
      const q = (document.getElementById('qFilterInput')?.value || '').toLowerCase();
      const items = document.querySelectorAll('.question-item');
      items.forEach(el => {
        const text = el.getAttribute('data-search') || '';
        const itemTopic = el.getAttribute('data-topic') || '';

        const matchesSearch = !q || text.includes(q);
        const matchesTopic = (currentTopicFilter === 'ALL') || (itemTopic === currentTopicFilter);

        if (matchesSearch && matchesTopic) {
          el.style.display = 'block';
        } else {
          el.style.display = 'none';
        }
      });
    }

    function filterStudentsTable() {
      const q = (document.getElementById('studentSearchInput')?.value || '').toLowerCase();
      const dept = document.getElementById('studentDeptFilter')?.value || 'ALL';
      const rows = document.querySelectorAll('.student-row');

      rows.forEach(r => {
        const name = r.getAttribute('data-name') || '';
        const matric = r.getAttribute('data-matric') || '';
        const rowDept = r.getAttribute('data-dept') || '';

        const matchesQuery = !q || name.includes(q) || matric.includes(q);
        const matchesDept = (dept === 'ALL') || (rowDept === dept);

        if (matchesQuery && matchesDept) {
          r.style.display = '';
        } else {
          r.style.display = 'none';
        }
      });
    }

    function exportSubmissionsCSV() {
      const table = document.getElementById('submissionsTable');
      if (!table) return;
      let csv = [];
      const rows = table.querySelectorAll('tr');
      for (const row of rows) {
        const cols = row.querySelectorAll('td, th');
        const rowData = [];
        for (const col of cols) {
          rowData.push('"' + col.innerText.replace(/"/g, '""').replace(/\\n/g, ' ') + '"');
        }
        csv.push(rowData.join(','));
      }
      const csvBlob = new Blob([csv.join('\\n')], { type: 'text/csv' });
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(csvBlob);
      downloadLink.download = 'premed_submissions_report.csv';
      downloadLink.click();
    }

    // Embed Courses & Topics data for instant client reactivity
    window.coursesData = ${JSON.stringify(courses)};
    window.allTopicsData = ${JSON.stringify(allTopics)};

    // Light / Dark Mode Toggle Logic
    function toggleTheme() {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('premed_theme', isDark ? 'dark' : 'light');
      updateThemeIcons();
    }

    function updateThemeIcons() {
      const isDark = document.documentElement.classList.contains('dark');
      document.querySelectorAll('.theme-icon-sun').forEach(el => el.classList.toggle('hidden', !isDark));
      document.querySelectorAll('.theme-icon-moon').forEach(el => el.classList.toggle('hidden', isDark));
      document.querySelectorAll('.theme-label').forEach(el => {
        el.textContent = isDark ? 'Dark' : 'Light';
      });
    }

    // Examination Studio Reactive Handlers
    function handleCourseSelectionChange() {
      const select = document.getElementById('testCourseSelect');
      if (!select) return;
      const selectedOpt = select.options[select.selectedIndex];
      if (!selectedOpt) return;
      const cid = select.value;
      const code = selectedOpt.getAttribute('data-code') || '';
      const title = selectedOpt.getAttribute('data-title') || '';
      const defDur = selectedOpt.getAttribute('data-duration') || '30';
      const defLimit = selectedOpt.getAttribute('data-limit') || '20';

      const titleInput = document.getElementById('testTitleInput');
      if (titleInput && (!titleInput.value || titleInput.value.includes('Examination') || titleInput.value.includes('Mock'))) {
        titleInput.value = code + ' - ' + title + ' Comprehensive Examination';
      }

      const durInput = document.getElementById('testDurationInput');
      if (durInput && defDur) durInput.value = defDur;

      const limitInput = document.getElementById('testLimitInput');
      if (limitInput && defLimit) limitInput.value = defLimit;

      renderCourseTopicCheckboxes(cid);
    }

    function handleTopicModeChange(mode) {
      const box = document.getElementById('specificTopicsBox');
      if (!box) return;
      if (mode === 'SPECIFIC') {
        box.classList.remove('hidden');
        const select = document.getElementById('testCourseSelect');
        if (select) renderCourseTopicCheckboxes(select.value);
      } else {
        box.classList.add('hidden');
      }
    }

    function renderCourseTopicCheckboxes(courseId) {
      var container = document.getElementById('topicCheckboxesList');
      if (!container) return;
      var courseTopics = (window.allTopicsData || []).filter(function(t) { return t.course_id === courseId; });
      if (courseTopics.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-400 p-2 col-span-3">No topics found for this course yet.</p>';
        return;
      }

      var html = '';
      for (var i = 0; i < courseTopics.length; i++) {
        var t = courseTopics[i];
        var nameSafe = (t.name || '').replace(/"/g, '&quot;');
        html += '<label class="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-2 cursor-pointer hover:border-indigo-400 transition-colors">' +
          '<input type="checkbox" name="topic_ids" value="' + t.id + '" checked class="topic-checkbox w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-0">' +
          '<div class="truncate">' +
            '<span class="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate" title="' + nameSafe + '">' +
              (i + 1) + '. ' + nameSafe +
            '</span>' +
            '<span class="text-[10px] text-slate-400 font-mono">' + (t.q_count || 0) + ' Questions available</span>' +
          '</div>' +
        '</label>';
      }
      container.innerHTML = html;
    }

    function toggleAllTopicsCheckbox(checked) {
      document.querySelectorAll('.topic-checkbox').forEach(cb => {
        cb.checked = checked;
      });
    }

    // Initialize UI on page load
    document.addEventListener('DOMContentLoaded', () => {
      updateThemeIcons();

      const urlParams = new URLSearchParams(window.location.search);
      const targetCourse = urlParams.get('target_course') || '${questionToEdit ? questionToEdit.course_id : ''}';
      const targetTopic = urlParams.get('target_topic') || '${questionToEdit ? (questionToEdit.topic_id || '') : ''}';
      const examCourseParam = urlParams.get('course_id');

      if (document.getElementById('testCourseSelect')) {
        if (examCourseParam) {
          document.getElementById('testCourseSelect').value = examCourseParam;
        }
        handleCourseSelectionChange();
      }

      if (document.getElementById('singleCourseSelect')) {
        if (targetCourse) document.getElementById('singleCourseSelect').value = targetCourse;
        syncTopicDropdown('singleCourseSelect', 'singleTopicSelect', targetTopic);
      }
      if (document.getElementById('bulkCourseSelect')) {
        if (targetCourse) document.getElementById('bulkCourseSelect').value = targetCourse;
        syncTopicDropdown('bulkCourseSelect', 'bulkTopicSelect', targetTopic, true);
      }
    });

    setTimeout(() => {
      updateThemeIcons();
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

    const publishForm = document.getElementById('topPublishForm');
    const publishBtn = document.getElementById('topPublishBtn');
    if (publishForm && publishBtn) {
      publishForm.addEventListener('submit', () => {
        publishBtn.disabled = true;
        publishBtn.innerHTML = '<span class="animate-spin inline-block mr-1">&#9696;</span> Publishing...';
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

module.exports = { renderHtml };
