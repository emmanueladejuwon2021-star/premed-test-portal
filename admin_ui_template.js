/**
 * Premed Test Portal - Enterprise School Admin Command Center UI Template
 * 100% Pure Turso DB Cloud Edition - Zero SQLite - Production Grade
 * 
 * Features:
 *  - Native Light & Dark Mode (persistent via localStorage)
 *  - Direct Turso Cloud DB telemetry & statistics
 *  - Interactive Manual Test Creator with per-test proctoring & topic filters
 *  - Live Candidate Radar with 8-second auto-refresh
 *  - Cheating Incident & Tab-Switch Inspector with instant Retake permission
 *  - Full Course & Topic Curriculum Management
 *  - Single & Bulk Question Authoring with KaTeX math rendering
 *  - Candidate Directory and Results Export
 */

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderHtml(tab = 'home', alert = null, alertType = 'success', editCourseId = null, editQuestionId = null, data = {}) {
  const {
    stats = {},
    allTests = [],
    courses = [],
    allTopics = [],
    questions = [],
    examSessions = [],
    submissions = [],
    students = [],
    settingsMap = {},
    courseToEdit = null,
    questionToEdit = null,
    DEPARTMENTS = []
  } = data;

  const totalQuestions = stats.totalQuestions || 0;
  const totalStudents = stats.totalStudents || 0;
  const totalResults = stats.totalResults || 0;
  const totalCourses = stats.totalCourses || 0;
  const liveTestsCount = stats.liveTestsCount || 0;
  const activeSessionsCount = stats.activeSessionsCount || 0;
  const cheatedSessionsCount = stats.cheatedSessionsCount || 0;

  const getSetting = (k, def = '') => (settingsMap[k] !== undefined ? settingsMap[k] : def);

  const activeTab = ['home', 'tests', 'courses', 'questions', 'students', 'results', 'settings'].includes(tab) ? tab : 'home';

  return `<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Apex Premed Administration - Cloud Command Center</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
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
              950: '#1e1b4b'
            }
          }
        }
      }
    };
  </script>
  <script>
    // Theme Initializer
    if (localStorage.getItem('admin_theme') === 'dark' || (!('admin_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    function toggleAdminTheme() {
      if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('admin_theme', 'light');
      } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('admin_theme', 'dark');
      }
      if (window.lucide) lucide.createIcons();
    }
  </script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
    body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 min-h-screen flex flex-col antialiased transition-colors duration-150">

  <!-- ================= TOP COMMAND HEADER ================= -->
  <header class="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
    <div class="max-w-7xl mx-auto px-4 sm:px-6">
      <div class="flex items-center justify-between h-16 gap-3">
        
        <!-- Left: Brand Title & Cloud Status -->
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-brand-500/20 shrink-0">
            <i data-lucide="shield-check" class="w-5 h-5"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white">Apex Premed</span>
              <span class="text-[10px] font-bold uppercase tracking-wider bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full border border-brand-200 dark:border-brand-800">Admin Control</span>
            </div>
            <div class="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span class="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Turso Cloud DB Live
              </span>
              <span>&bull;</span>
              <span class="hidden sm:inline font-mono text-[10px]">AWS us-east-1</span>
            </div>
          </div>
        </div>

        <!-- Right: Actions & Theme Toggle -->
        <div class="flex items-center gap-2.5">
          <!-- Active Candidate Live Counter Badge -->
          <a href="/?tab=home" class="px-3 py-1.5 rounded-xl ${activeSessionsCount > 0 ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'} border flex items-center gap-2 text-xs font-bold transition-all hover:opacity-90">
            <span class="w-2 h-2 rounded-full ${activeSessionsCount > 0 ? 'bg-rose-500 animate-ping' : 'bg-slate-400'}"></span>
            <span>${activeSessionsCount} Writing Now</span>
          </a>

          <!-- Master Live Tests Toggle -->
          <form method="POST" action="/action/master_tests_live_toggle" class="hidden md:inline-block" onsubmit="return confirm('Toggle all tests live status?');">
            <input type="hidden" name="target_state" value="${liveTestsCount > 0 ? '0' : '1'}">
            <button type="submit" class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${liveTestsCount > 0 ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200'}">
              <i data-lucide="${liveTestsCount > 0 ? 'check-circle-2' : 'power'}" class="w-3.5 h-3.5"></i>
              <span>${liveTestsCount > 0 ? liveTestsCount + ' Tests Live' : 'All Tests Offline'}</span>
            </button>
          </form>

          <!-- Light / Dark Mode Toggle Button -->
          <button type="button" onclick="toggleAdminTheme()" title="Toggle Light/Dark Theme" class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-colors">
            <i data-lucide="moon" class="w-4 h-4 hidden dark:block"></i>
            <i data-lucide="sun" class="w-4 h-4 block dark:hidden"></i>
          </button>
        </div>

      </div>

      <!-- Navigation Tabs -->
      <nav class="flex items-center space-x-1 overflow-x-auto py-2 -mb-px text-xs font-bold scrollbar-none border-t border-slate-100 dark:border-slate-850">
        <a href="/?tab=home" class="px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'home' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}">
          <i data-lucide="activity" class="w-4 h-4"></i>
          <span>Live Radar</span>
          ${activeSessionsCount > 0 ? `<span class="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-brand-600 font-black">${activeSessionsCount}</span>` : ''}
        </a>

        <a href="/?tab=tests" class="px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'tests' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}">
          <i data-lucide="file-check-2" class="w-4 h-4"></i>
          <span>Test Manager</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'tests' ? 'bg-brand-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'} font-bold">${allTests.length}</span>
        </a>

        <a href="/?tab=courses" class="px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'courses' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}">
          <i data-lucide="book-open" class="w-4 h-4"></i>
          <span>Courses & Topics</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'courses' ? 'bg-brand-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'} font-bold">${courses.length}</span>
        </a>

        <a href="/?tab=questions" class="px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'questions' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}">
          <i data-lucide="help-circle" class="w-4 h-4"></i>
          <span>Question Bank</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'questions' ? 'bg-brand-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'} font-bold">${totalQuestions}</span>
        </a>

        <a href="/?tab=students" class="px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'students' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}">
          <i data-lucide="users" class="w-4 h-4"></i>
          <span>Students</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'students' ? 'bg-brand-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'} font-bold">${students.length}</span>
        </a>

        <a href="/?tab=results" class="px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'results' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}">
          <i data-lucide="award" class="w-4 h-4"></i>
          <span>Submissions</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'results' ? 'bg-brand-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'} font-bold">${totalResults}</span>
        </a>

        <a href="/?tab=settings" class="px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'settings' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}">
          <i data-lucide="settings" class="w-4 h-4"></i>
          <span>Security & Rules</span>
        </a>
      </nav>
    </div>
  </header>

  <!-- ================= NOTIFICATIONS ALERT ================= -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-5">
    ${alert ? `
      <div class="p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-xs ${
        alertType === 'error'
        ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
        : 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
      }">
        <div class="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
          <i data-lucide="${alertType === 'error' ? 'alert-triangle' : 'check-circle'}" class="w-5 h-5 shrink-0"></i>
          <span>${escapeHtml(alert)}</span>
        </div>
        <button onclick="this.parentElement.remove()" class="text-xs font-extrabold opacity-70 hover:opacity-100">&times;</button>
      </div>
    ` : ''}

    ${renderTabContent(activeTab, {
      stats,
      allTests,
      courses,
      allTopics,
      questions,
      examSessions,
      submissions,
      students,
      settingsMap,
      courseToEdit,
      questionToEdit,
      DEPARTMENTS,
      getSetting
    })}
  </main>

  <!-- ================= MODAL: LIVE PROCTOR WARNING DISPATCHER ================= -->
  <div id="proctorWarningModal" class="hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <i data-lucide="bell-ring" class="w-5 h-5"></i>
          </div>
          <div>
            <h3 class="text-sm font-black text-slate-900 dark:text-white">Dispatch Proctor Notice</h3>
            <p class="text-[11px] text-slate-500 dark:text-slate-400" id="warnModalTargetName">Candidate</p>
          </div>
        </div>
        <button type="button" onclick="closeWarningModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold leading-none cursor-pointer">&times;</button>
      </div>

      <div class="space-y-2">
        <p class="text-xs font-bold text-slate-700 dark:text-slate-300">Quick Incident Presets:</p>
        <div class="flex flex-wrap gap-1.5">
          <button type="button" onclick="setWarningPreset('⚠️ Face Camera: Please face your webcam directly and maintain focus on your screen.')" class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer">
            Face Camera
          </button>
          <button type="button" onclick="setWarningPreset('⚠️ Unauthorized Persons: Multiple individuals detected in examination area.')" class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer">
            Multiple Persons
          </button>
          <button type="button" onclick="setWarningPreset('⚠️ Tab Switching: Do not switch browser tabs or leave the test interface.')" class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer">
            Tab Switching
          </button>
          <button type="button" onclick="setWarningPreset('⚠️ Audio Prohibited: Speaking or communicating during examination is not allowed.')" class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer">
            Speaking
          </button>
          <button type="button" onclick="setWarningPreset('⚠️ Unauthorized Device: Remove all phones and external devices immediately.')" class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer">
            Phone / Device
          </button>
        </div>
      </div>

      <form id="warnModalForm" onsubmit="submitWarningForm(event)" class="space-y-3">
        <input type="hidden" name="session_id" id="warnSessionId" value="">
        <div class="space-y-1">
          <label class="text-xs font-bold text-slate-700 dark:text-slate-300">Warning Message to Student:</label>
          <textarea id="warnMessageInput" name="warning_message" rows="3" required class="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Enter warning text that will pop up on the candidate's screen..."></textarea>
        </div>
        <div id="warnModalStatus" class="hidden text-xs font-bold text-emerald-600 dark:text-emerald-400"></div>
        <div class="flex items-center justify-end gap-2 pt-1">
          <button type="button" onclick="closeWarningModal()" class="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            Cancel
          </button>
          <button type="submit" id="warnSubmitBtn" class="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer">
            <i data-lucide="send" class="w-3.5 h-3.5"></i>
            <span>Send Warning Now</span>
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- ================= MODAL: ENLARGE LIVE CAMERA STREAM ================= -->
  <div id="proctorEnlargeModal" class="hidden fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <i data-lucide="maximize" class="w-5 h-5"></i>
          </div>
          <div>
            <h3 class="text-sm font-black text-slate-900 dark:text-white" id="enlargeCandidateTitle">Candidate Stream</h3>
            <p class="text-[11px] text-slate-500 dark:text-slate-400" id="enlargeCandidateSub">Live Feed</p>
          </div>
        </div>
        <button type="button" onclick="closeEnlargeModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold leading-none cursor-pointer">&times;</button>
      </div>

      <!-- High-Res Video Viewport -->
      <div class="relative aspect-[4/3] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
        <img id="enlargeVideoFeed" src="" alt="Enlarged Live Feed" class="w-full h-full object-cover">
        <div class="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-black uppercase bg-rose-600 text-white flex items-center gap-1.5 shadow-md">
          <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
          LIVE 1.0S STREAM
        </div>
        <div class="absolute bottom-3 right-3 px-3 py-1 rounded-lg text-xs font-bold bg-black/80 text-white backdrop-blur-xs border border-white/10" id="enlargeTabSwitches">
          0 tab switches
        </div>
      </div>

      <!-- Action Footer -->
      <div class="flex items-center justify-between pt-2">
        <button type="button" onclick="triggerWarningFromEnlarge()" class="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
          <i data-lucide="bell-ring" class="w-4 h-4"></i> Issue Warning
        </button>
        <button type="button" onclick="closeEnlargeModal()" class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer">
          Close Full View
        </button>
      </div>
    </div>
  </div>

  <!-- ================= FOOTER ================= -->
  <footer class="mt-auto py-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div class="flex items-center gap-2 font-medium">
        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span>Apex Pre-Medical Sciences Examination Council (PMSEC)</span>
        <span>&bull;</span>
        <span class="font-mono text-[11px] text-slate-400">Pure Turso Cloud DB (Zero SQLite)</span>
      </div>
      <div class="text-[11px] font-mono">
        Active Server: Port 8899 &bull; Real-Time HTTPS Telemetry
      </div>
    </div>
  </footer>

  <script>
    if (window.lucide) lucide.createIcons();

    // -------------------------------------------------------------
    // LIVE PROCTORING STREAM & TELEMETRY CONTROLS
    // -------------------------------------------------------------
    let currentWarningSessionId = null;
    let currentEnlargeSession = null;

    function openWarningModal(sessionId, name, matric) {
      currentWarningSessionId = sessionId;
      const idEl = document.getElementById('warnSessionId');
      const nameEl = document.getElementById('warnModalTargetName');
      const inputEl = document.getElementById('warnMessageInput');
      const statusEl = document.getElementById('warnModalStatus');

      if (idEl) idEl.value = sessionId;
      if (nameEl) nameEl.innerText = name + ' (' + matric + ')';
      if (inputEl) inputEl.value = '⚠️ Examination Notice: Please face your webcam directly and maintain focus on your screen.';
      if (statusEl) statusEl.classList.add('hidden');

      const modal = document.getElementById('proctorWarningModal');
      if (modal) modal.classList.remove('hidden');
      if (window.lucide) lucide.createIcons();
    }

    function closeWarningModal() {
      const modal = document.getElementById('proctorWarningModal');
      if (modal) modal.classList.add('hidden');
      currentWarningSessionId = null;
    }

    function setWarningPreset(txt) {
      const inputEl = document.getElementById('warnMessageInput');
      if (inputEl) inputEl.value = txt;
    }

    function submitWarningForm(e) {
      e.preventDefault();
      const sessionId = document.getElementById('warnSessionId')?.value;
      const msg = document.getElementById('warnMessageInput')?.value;
      const btn = document.getElementById('warnSubmitBtn');
      const statusEl = document.getElementById('warnModalStatus');

      if (!sessionId || !msg) return;

      if (btn) {
        btn.disabled = true;
        btn.innerText = 'Dispatching...';
      }

      fetch('/api/send_warning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, warning_message: msg })
      })
      .then(r => r.json())
      .then(res => {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5"></i> Sent!';
        }
        if (statusEl) {
          statusEl.innerText = 'Warning dispatched directly to candidate screen!';
          statusEl.classList.remove('hidden');
        }
        setTimeout(() => {
          closeWarningModal();
          if (btn) {
            btn.innerHTML = '<i data-lucide="send" class="w-3.5 h-3.5"></i> Send Warning Now';
          }
          if (window.lucide) lucide.createIcons();
        }, 1200);
      })
      .catch(() => {
        if (btn) {
          btn.disabled = false;
          btn.innerText = 'Send Warning Now';
        }
        alert('Failed to dispatch warning. Please try again.');
      });
    }

    function openEnlargeModal(sessionId, name, matric, course) {
      currentEnlargeSession = { sessionId, name, matric, course };
      const titleEl = document.getElementById('enlargeCandidateTitle');
      const subEl = document.getElementById('enlargeCandidateSub');
      const vidEl = document.getElementById('enlargeVideoFeed');
      const swEl = document.getElementById('enlargeTabSwitches');

      if (titleEl) titleEl.innerText = name + ' (' + matric + ')';
      if (subEl) subEl.innerText = course + ' • Real-Time CCTV Feed';

      const currentImg = document.getElementById('proctor-img-' + sessionId);
      if (vidEl && currentImg && currentImg.src) {
        vidEl.src = currentImg.src;
      }
      const badge = document.getElementById('proctor-switch-badge-' + sessionId);
      if (swEl && badge) {
        swEl.innerText = badge.innerText;
      }

      const modal = document.getElementById('proctorEnlargeModal');
      if (modal) modal.classList.remove('hidden');
      if (window.lucide) lucide.createIcons();
    }

    function closeEnlargeModal() {
      const modal = document.getElementById('proctorEnlargeModal');
      if (modal) modal.classList.add('hidden');
      currentEnlargeSession = null;
    }

    function triggerWarningFromEnlarge() {
      if (currentEnlargeSession) {
        const s = currentEnlargeSession;
        closeEnlargeModal();
        openWarningModal(s.sessionId, s.name, s.matric);
      }
    }

    // Real-Time 1.0s Proctor Video & Telemetry Poller
    function pollProctorStreams(isManual = false) {
      fetch('/api/live_sessions')
        .then(r => r.json())
        .then(data => {
          if (!data) return;
          const countEl = document.getElementById('liveRadarCounter');
          if (countEl) countEl.innerText = data.activeCount;
          const feedCount = document.getElementById('proctorFeedsCount');
          if (feedCount) feedCount.innerText = data.activeCount;

          const sessions = data.sessions || [];
          const active = sessions.filter(s => s.status === 'IN_PROGRESS');

          active.forEach(s => {
            const img = document.getElementById('proctor-img-' + s.id);
            const placeholder = document.getElementById('proctor-placeholder-' + s.id);
            const switchBadge = document.getElementById('proctor-switch-badge-' + s.id);

            if (img && s.latest_frame) {
              img.src = s.latest_frame;
              img.classList.remove('hidden');
              if (placeholder) placeholder.classList.add('hidden');
            }

            if (switchBadge) {
              const switches = s.tab_switches || 0;
              switchBadge.innerText = switches > 0 ? ('⚠️ ' + switches + ' Switches') : '🛡️ 0 Clean';
              switchBadge.className = switches > 0 
                ? 'px-2 py-0.5 rounded text-[10px] font-bold shadow-xs bg-amber-600 text-white' 
                : 'px-2 py-0.5 rounded text-[10px] font-bold shadow-xs bg-emerald-600/90 text-white';
            }

            if (currentEnlargeSession && currentEnlargeSession.sessionId === s.id) {
              const enlImg = document.getElementById('enlargeVideoFeed');
              if (enlImg && s.latest_frame) enlImg.src = s.latest_frame;
              const enlBadge = document.getElementById('enlargeTabSwitches');
              if (enlBadge) enlBadge.innerText = (s.tab_switches || 0) + ' tab switches';
            }
          });
        })
        .catch(() => {});
    }

    ${activeTab === 'home' ? `
      setInterval(pollProctorStreams, 1000);
    ` : ''}

    // Dynamic Course Topic Filter for Test Creator
    function filterTopicsByCourse() {
      const courseSelect = document.getElementById('testCourseSelect');
      const container = document.getElementById('topicsChecklistContainer');
      if (!courseSelect || !container) return;
      const selectedCourseId = courseSelect.value;
      const items = container.querySelectorAll('.topic-item');
      items.forEach(el => {
        const cId = el.getAttribute('data-course-id');
        if (cId === selectedCourseId) {
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
          const cb = el.querySelector('input[type="checkbox"]');
          if (cb) cb.checked = false;
        }
      });
    }

    function toggleAllTopics(checked) {
      const container = document.getElementById('topicsChecklistContainer');
      if (!container) return;
      const visibleCheckboxes = container.querySelectorAll('.topic-item:not(.hidden) input[type="checkbox"]');
      visibleCheckboxes.forEach(cb => cb.checked = checked);
    }
  </script>
</body>
</html>`;
}

function renderTabContent(tab, ctx) {
  switch (tab) {
    case 'home':
      return renderRadarTab(ctx);
    case 'tests':
      return renderTestsTab(ctx);
    case 'courses':
      return renderCoursesTab(ctx);
    case 'questions':
      return renderQuestionsTab(ctx);
    case 'students':
      return renderStudentsTab(ctx);
    case 'results':
      return renderResultsTab(ctx);
    case 'settings':
      return renderSettingsTab(ctx);
    default:
      return renderRadarTab(ctx);
  }
}

// -------------------------------------------------------------
// TAB 1: LIVE RADAR & CANDIDATE MONITORING
// -------------------------------------------------------------
function renderRadarTab(ctx) {
  const { stats, allTests, examSessions, submissions } = ctx;
  const activeSessions = examSessions.filter(s => s.status === 'IN_PROGRESS');
  const recentFinished = examSessions.filter(s => s.status !== 'IN_PROGRESS');

  return `
  <!-- Stat Metrics Grid -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
    <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
      <div>
        <p class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Candidates</p>
        <h3 class="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5" id="liveRadarCounter">${activeSessions.length}</h3>
        <p class="text-[10px] text-slate-400 mt-1 font-medium">Writing tests right now</p>
      </div>
      <div class="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
        <i data-lucide="radio" class="w-6 h-6 animate-pulse"></i>
      </div>
    </div>

    <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
      <div>
        <p class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Live Tests</p>
        <h3 class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">${allTests.filter(t => t.is_live === 1).length}</h3>
        <p class="text-[10px] text-slate-400 mt-1 font-medium">Accessible to students</p>
      </div>
      <div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
        <i data-lucide="check-circle" class="w-6 h-6"></i>
      </div>
    </div>

    <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
      <div>
        <p class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cheating Alerts</p>
        <h3 class="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">${ctx.stats.cheatedSessionsCount || 0}</h3>
        <p class="text-[10px] text-slate-400 mt-1 font-medium">Tab-switches &amp; screen exits</p>
      </div>
      <div class="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
        <i data-lucide="shield-alert" class="w-6 h-6"></i>
      </div>
    </div>

    <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
      <div>
        <p class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Submissions</p>
        <h3 class="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">${ctx.stats.totalResults || 0}</h3>
        <p class="text-[10px] text-slate-400 mt-1 font-medium">Graded tests on record</p>
      </div>
      <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
        <i data-lucide="award" class="w-6 h-6"></i>
      </div>
    </div>
  </div>

  <!-- ================= LIVE CCTV VIDEO PROCTORING WALL ================= -->
  <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
    <div class="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-rose-500/5 via-transparent to-transparent">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900">
          <i data-lucide="video" class="w-5 h-5"></i>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-base font-black text-slate-900 dark:text-white">Live Video Proctoring Station</h2>
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
              <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
              Live CCTV Stream &bull; 1.0s Real-Time
            </span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time candidate webcams, automated eye-contact focus, and direct proctor warnings.</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
          <span id="proctorFeedsCount" class="text-rose-600 dark:text-rose-400 font-extrabold">${activeSessions.length}</span> Active Stream(s)
        </span>
        <button type="button" onclick="pollProctorStreams(true)" class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5" title="Force Refresh Feeds">
          <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
          <span>Poll Streams</span>
        </button>
      </div>
    </div>

    <div class="p-4 sm:p-5">
      ${activeSessions.length === 0 ? `
        <div class="p-8 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-300 space-y-3">
          <div class="w-12 h-12 rounded-2xl bg-slate-800 text-rose-400 mx-auto flex items-center justify-center">
            <i data-lucide="video-off" class="w-6 h-6"></i>
          </div>
          <div class="space-y-1">
            <h4 class="text-sm font-bold text-white">Live Proctoring Feeds Standby</h4>
            <p class="text-xs text-slate-400 max-w-md mx-auto">
              Camera feeds will automatically stream here when candidates start their exams. Snapshots are captured and updated every 1.0 second.
            </p>
          </div>
        </div>
      ` : `
        <div id="proctorVideoWallGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          ${activeSessions.map(s => `
            <div id="proctor-card-${escapeHtml(s.id)}" class="bg-slate-50 dark:bg-slate-950/70 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col transition-all hover:border-brand-500/50">
              
              <!-- Video Screen Area -->
              <div class="relative aspect-[4/3] bg-slate-950 flex items-center justify-center overflow-hidden group">
                <img id="proctor-img-${escapeHtml(s.id)}" src="${escapeHtml(s.latest_frame || '')}" alt="Live Camera" class="w-full h-full object-cover transition-opacity duration-150 ${s.latest_frame ? '' : 'hidden'}">
                
                <div id="proctor-placeholder-${escapeHtml(s.id)}" class="flex flex-col items-center justify-center p-4 text-center space-y-2 ${s.latest_frame ? 'hidden' : ''}">
                  <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 animate-pulse">
                    <i data-lucide="camera" class="w-5 h-5"></i>
                  </div>
                  <p class="text-[11px] font-mono text-slate-400">Connecting candidate camera...</p>
                </div>

                <!-- Top Video Badges -->
                <div class="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-600 text-white flex items-center gap-1 shadow-md">
                    <span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                    LIVE
                  </span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/75 text-white backdrop-blur-xs border border-white/10">
                    ${escapeHtml(s.course_code || 'EXAM')}
                  </span>
                </div>

                <!-- Bottom Video Badges -->
                <div class="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/75 text-slate-200 backdrop-blur-xs border border-white/10 truncate max-w-[120px]">
                    ${escapeHtml(s.matric_no)}
                  </span>
                  <span id="proctor-switch-badge-${escapeHtml(s.id)}" class="px-2 py-0.5 rounded text-[10px] font-bold shadow-xs ${(s.tab_switches || 0) > 0 ? 'bg-amber-600 text-white' : 'bg-emerald-600/90 text-white'}">
                    ${(s.tab_switches || 0) > 0 ? '⚠️ ' + s.tab_switches + ' Switches' : '🛡️ 0 Clean'}
                  </span>
                </div>

                <!-- Hover Enlarge Action Overlay -->
                <button type="button" onclick="openEnlargeModal('${escapeHtml(s.id)}', '${escapeHtml(s.student_name || 'Candidate')}', '${escapeHtml(s.matric_no)}', '${escapeHtml(s.course_code || 'EXAM')}')" class="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold text-xs gap-1.5 transition-opacity backdrop-blur-xs cursor-pointer">
                  <i data-lucide="maximize-2" class="w-4 h-4"></i> Enlarge Camera
                </button>
              </div>

              <!-- Candidate Info & Control Footer -->
              <div class="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                <div>
                  <h4 class="text-xs font-black text-slate-900 dark:text-white truncate">${escapeHtml(s.student_name || 'Candidate')}</h4>
                  <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    <span class="font-mono">${escapeHtml(s.matric_no)}</span>
                    <span class="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">Stream OK</span>
                  </div>
                </div>

                <!-- Action Controls -->
                <div class="flex items-center gap-1.5 pt-1 border-t border-slate-200/80 dark:border-slate-800/80">
                  <button type="button" onclick="openWarningModal('${escapeHtml(s.id)}', '${escapeHtml(s.student_name || 'Candidate')}', '${escapeHtml(s.matric_no)}')" class="flex-1 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold flex items-center justify-center gap-1 transition-colors">
                    <i data-lucide="bell-ring" class="w-3.5 h-3.5"></i>
                    <span>Warn</span>
                  </button>

                  <form method="POST" action="/action/invalidate_session" class="inline" onsubmit="return confirm('Immediately terminate test for candidate ${escapeHtml(s.student_name)} for cheating?');">
                    <input type="hidden" name="session_id" value="${escapeHtml(s.id)}">
                    <button type="submit" title="Terminate test for cheating" class="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-colors">
                      <i data-lucide="shield-x" class="w-3.5 h-3.5"></i>
                    </button>
                  </form>

                  <form method="POST" action="/action/allow_retake" class="inline" onsubmit="return confirm('Allow retake and reset test session for ${escapeHtml(s.student_name)}?');">
                    <input type="hidden" name="session_id" value="${escapeHtml(s.id)}">
                    <input type="hidden" name="matric_no" value="${escapeHtml(s.matric_no)}">
                    <button type="submit" title="Allow candidate retake" class="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition-colors">
                      <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
                    </button>
                  </form>
                </div>

              </div>

            </div>
          `).join('')}
        </div>
      `}
    </div>
  </div>

  <!-- Real-Time Radar Stream Table -->
  <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
    <div class="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
          <h2 class="text-base font-black text-slate-900 dark:text-white">Active Examination Radar</h2>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Live proctoring telemetry streaming directly from student exam sessions.</p>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="location.reload()" class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors">
          <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
          <span>Refresh Now</span>
        </button>
      </div>
    </div>

    ${activeSessions.length === 0 ? `
      <div class="p-10 text-center space-y-2.5">
        <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
          <i data-lucide="coffee" class="w-6 h-6"></i>
        </div>
        <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300">No Candidates Currently Writing Tests</h4>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">Active student exam sessions will appear here live with instant tab-switch telemetry, time logs, and retake controls.</p>
      </div>
    ` : `
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-extrabold text-[10px]">
              <th class="p-3.5">Candidate Name</th>
              <th class="p-3.5">Matric No</th>
              <th class="p-3.5">Course</th>
              <th class="p-3.5">Status</th>
              <th class="p-3.5">Tab Switches</th>
              <th class="p-3.5">Started At</th>
              <th class="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            ${activeSessions.map(s => `
              <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                <td class="p-3.5 font-bold text-slate-900 dark:text-white">
                  ${escapeHtml(s.student_name || 'Candidate')}
                </td>
                <td class="p-3.5 font-mono text-slate-600 dark:text-slate-300 font-semibold">
                  ${escapeHtml(s.matric_no)}
                </td>
                <td class="p-3.5">
                  <span class="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono font-bold text-[11px]">
                    ${escapeHtml(s.course_code || 'EXAM')}
                  </span>
                </td>
                <td class="p-3.5">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                    Writing Test
                  </span>
                </td>
                <td class="p-3.5 font-mono">
                  ${(s.tab_switches || 0) > 0 ? `
                    <span class="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold">
                      ⚠️ ${s.tab_switches} switch(es)
                    </span>
                  ` : `
                    <span class="text-emerald-600 dark:text-emerald-400 font-bold">0 Clean</span>
                  `}
                </td>
                <td class="p-3.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                  ${escapeHtml(s.created_at || 'Just now')}
                </td>
                <td class="p-3.5 text-right space-x-1.5">
                  <form method="POST" action="/action/allow_retake" class="inline" onsubmit="return confirm('Allow retake for this student? Active session will be reset.');">
                    <input type="hidden" name="session_id" value="${escapeHtml(s.id)}">
                    <input type="hidden" name="matric_no" value="${escapeHtml(s.matric_no)}">
                    <button type="submit" class="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition-colors">
                      Allow Retake
                    </button>
                  </form>
                  <form method="POST" action="/action/invalidate_session" class="inline" onsubmit="return confirm('Terminate candidate test for cheating immediately?');">
                    <input type="hidden" name="session_id" value="${escapeHtml(s.id)}">
                    <button type="submit" class="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-colors">
                      Invalidate
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

  <!-- Recent Submissions Preview -->
  <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-3">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
        <i data-lucide="check-check" class="w-4 h-4 text-emerald-500"></i>
        <span>Recent Exam Completions</span>
      </h3>
      <a href="/?tab=results" class="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">View All Submissions &rarr;</a>
    </div>

    ${recentFinished.length === 0 ? `
      <p class="text-xs text-slate-400 italic">No completed sessions logged in this period.</p>
    ` : `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        ${recentFinished.slice(0, 6).map(s => `
          <div class="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between gap-3">
            <div class="min-w-0">
              <h4 class="text-xs font-black text-slate-900 dark:text-white truncate">${escapeHtml(s.student_name)}</h4>
              <p class="text-[11px] font-mono text-slate-500 dark:text-slate-400">${escapeHtml(s.matric_no)} &bull; ${escapeHtml(s.course_code)}</p>
            </div>
            <div class="text-right shrink-0">
              <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                s.status === 'TERMINATED_FOR_CHEATING' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              }">${escapeHtml(s.status || 'COMPLETED')}</span>
              <p class="text-[10px] text-slate-400 mt-0.5">${escapeHtml(s.percentage !== null && s.percentage !== undefined ? s.percentage + '%' : '')}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  </div>
  `;
}

// -------------------------------------------------------------
// TAB 2: MANUAL TEST CREATOR & TEST MANAGER
// -------------------------------------------------------------
function renderTestsTab(ctx) {
  const { allTests, courses, allTopics } = ctx;

  return `
  <div class="space-y-6">

    <!-- Manual Test Creator Card -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-7 space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
              <i data-lucide="plus-circle" class="w-4 h-4"></i>
            </div>
            <h2 class="text-lg font-black text-slate-900 dark:text-white">Create Proctored Test</h2>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure an accredited examination, select specific curriculum topics, define timing &amp; security rules, and deploy live.</p>
        </div>
      </div>

      <form method="POST" action="/action/create_test" class="space-y-5">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          <!-- Test Title -->
          <div class="lg:col-span-2 space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Test Title / Name *</label>
            <input type="text" name="title" required placeholder="e.g. PHY 101 Mid-Semester Proctored Examination" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-hidden">
          </div>

          <!-- Course Selector -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Select Course *</label>
            <select name="course_id" id="testCourseSelect" required onchange="filterTopicsByCourse()" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-brand-500 focus:outline-hidden">
              <option value="">-- Choose Course --</option>
              ${courses.map(c => `
                <option value="${escapeHtml(c.id)}">${escapeHtml(c.code)} - ${escapeHtml(c.title)}</option>
              `).join('')}
            </select>
          </div>

          <!-- Duration (Minutes) -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Duration (Minutes)</label>
            <input type="number" name="duration" value="30" min="5" max="300" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-brand-500 focus:outline-hidden">
          </div>

          <!-- Question Limit -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Question Limit</label>
            <input type="number" name="question_limit" value="20" min="5" max="200" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-brand-500 focus:outline-hidden">
          </div>

          <!-- Max Tab Switch Tolerance -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Tab Switch Warnings (0 to disable)</label>
            <input type="number" name="max_tab_switches" value="3" min="0" max="10" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-brand-500 focus:outline-hidden">
          </div>

        </div>

        <!-- Topic Scope Selection -->
        <div class="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div class="flex items-center justify-between">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Curriculum Topic Scope</label>
            <div class="flex items-center gap-3 text-xs">
              <label class="flex items-center gap-1.5 font-bold text-brand-600 dark:text-brand-400 cursor-pointer">
                <input type="checkbox" name="all_topics" id="selectAllTopicsCheckbox" checked onchange="toggleAllTopics(this.checked)" class="rounded text-brand-600">
                <span>Select All Course Topics (Comprehensive)</span>
              </label>
            </div>
          </div>
          
          <div id="topicsChecklistContainer" class="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/50 max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            ${allTopics.map(t => `
              <label class="topic-item p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2 cursor-pointer hover:border-brand-500 transition-colors text-xs" data-course-id="${escapeHtml(t.course_id)}">
                <input type="checkbox" name="topic_ids[]" value="${escapeHtml(t.id)}" checked class="rounded text-brand-600">
                <span class="truncate font-medium text-slate-800 dark:text-slate-200">${escapeHtml(t.name)}</span>
              </label>
            `).join('')}
          </div>
          <p class="text-[11px] text-slate-400">Selecting a course above automatically filters the topic checklist.</p>
        </div>

        <!-- Security & Proctoring Toggles -->
        <div class="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Security &amp; Proctoring Rules</label>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <label class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center gap-2 cursor-pointer text-xs font-bold">
              <input type="checkbox" name="enforce_fullscreen" value="1" checked class="rounded text-brand-600">
              <span>Fullscreen</span>
            </label>

            <label class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center gap-2 cursor-pointer text-xs font-bold">
              <input type="checkbox" name="auto_submit" value="1" checked class="rounded text-brand-600">
              <span>Auto-Submit</span>
            </label>

            <label class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center gap-2 cursor-pointer text-xs font-bold">
              <input type="checkbox" name="calculator_allowed" value="1" checked class="rounded text-brand-600">
              <span>Calculator</span>
            </label>

            <label class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center gap-2 cursor-pointer text-xs font-bold">
              <input type="checkbox" name="shuffle_questions" value="1" checked class="rounded text-brand-600">
              <span>Shuffle Qs</span>
            </label>

            <label class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center gap-2 cursor-pointer text-xs font-bold">
              <input type="checkbox" name="shuffle_options" value="1" checked class="rounded text-brand-600">
              <span>Shuffle Choices</span>
            </label>

            <label class="p-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 flex items-center gap-2 cursor-pointer text-xs font-black">
              <input type="checkbox" name="is_live" value="1" checked class="rounded text-emerald-600">
              <span>Make Live Now</span>
            </label>
          </div>
        </div>

        <div class="pt-3 flex justify-end">
          <button type="submit" class="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black text-xs shadow-md shadow-brand-500/20 flex items-center gap-2 transition-all">
            <i data-lucide="rocket" class="w-4 h-4"></i>
            <span>Deploy &amp; Publish Test to Cloud</span>
          </button>
        </div>
      </form>
    </div>

    <!-- Configured Tests Directory -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div class="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h3 class="text-base font-black text-slate-900 dark:text-white">Active &amp; Configured Tests (${allTests.length})</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Toggle live status, preview direct student links, or update test timing parameters.</p>
        </div>
      </div>

      ${allTests.length === 0 ? `
        <div class="p-10 text-center space-y-2">
          <p class="text-xs text-slate-400">No configured tests found in cloud database. Use the form above to create your first proctored test.</p>
        </div>
      ` : `
        <div class="divide-y divide-slate-100 dark:divide-slate-800">
          ${allTests.map(t => {
            const courseObj = courses.find(c => c.id === t.course_id);
            const courseCode = courseObj ? courseObj.code : (t.course_code || 'EXAM');
            const isLive = (t.is_live === 1);

            return `
            <div class="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
              <div class="space-y-1.5 min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                    ${escapeHtml(courseCode)}
                  </span>
                  <h4 class="text-sm font-extrabold text-slate-900 dark:text-white truncate">${escapeHtml(t.title)}</h4>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${isLive ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}">
                    ${isLive ? '● Live on Portal' : 'Offline / Hidden'}
                  </span>
                </div>

                <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span class="font-mono">⏳ ${t.duration} Mins</span>
                  <span>&bull;</span>
                  <span class="font-mono">❓ Limit: ${t.question_limit} Qs</span>
                  <span>&bull;</span>
                  <span class="font-mono">⚠️ Switches: ${t.max_tab_switches} max</span>
                  <span>&bull;</span>
                  <span class="text-[11px]">${t.calculator_allowed ? '🧮 Calc On' : 'No Calc'}</span>
                </div>

                <div class="pt-1">
                  <code class="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-mono select-all">
                    exam.php?test_id=${escapeHtml(t.id)}
                  </code>
                </div>
              </div>

              <!-- Controls -->
              <div class="flex items-center gap-2 shrink-0">
                <form method="POST" action="/action/toggle_test_live" class="inline">
                  <input type="hidden" name="test_id" value="${escapeHtml(t.id)}">
                  <input type="hidden" name="current_live" value="${isLive ? '1' : '0'}">
                  <button type="submit" class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${isLive ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'}">
                    <i data-lucide="${isLive ? 'eye-off' : 'eye'}" class="w-3.5 h-3.5"></i>
                    <span>${isLive ? 'Take Offline' : 'Make Live'}</span>
                  </button>
                </form>

                <form method="POST" action="/action/delete_test" class="inline" onsubmit="return confirm('Are you sure you want to delete this test?');">
                  <input type="hidden" name="test_id" value="${escapeHtml(t.id)}">
                  <button type="submit" class="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                  </button>
                </form>
              </div>
            </div>
            `;
          }).join('')}
        </div>
      `}
    </div>

  </div>
  `;
}

// -------------------------------------------------------------
// TAB 3: COURSES & TOPICS
// -------------------------------------------------------------
function renderCoursesTab(ctx) {
  const { courses, allTopics } = ctx;

  return `
  <div class="space-y-6">

    <!-- Add Course Form -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-4">
      <div class="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <i data-lucide="book-plus" class="w-5 h-5 text-brand-600 dark:text-brand-400"></i>
        <h3 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Add Accredited Course</h3>
      </div>

      <form method="POST" action="/action/add_course" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div class="space-y-1">
          <label class="text-[11px] font-bold text-slate-600 dark:text-slate-400">Course Code *</label>
          <input type="text" name="code" required placeholder="e.g. PHY 101" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-brand-500">
        </div>

        <div class="lg:col-span-2 space-y-1">
          <label class="text-[11px] font-bold text-slate-600 dark:text-slate-400">Course Title *</label>
          <input type="text" name="title" required placeholder="e.g. General Physics I" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-brand-500">
        </div>

        <div class="space-y-1">
          <label class="text-[11px] font-bold text-slate-600 dark:text-slate-400">Default Duration (Mins)</label>
          <input type="number" name="duration" value="30" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-brand-500">
        </div>

        <div class="flex items-end">
          <button type="submit" class="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-xs transition-colors">
            + Create Course
          </button>
        </div>
      </form>
    </div>

    <!-- Course List with Topic Accordions -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      ${courses.map(c => {
        const cTopics = allTopics.filter(t => t.course_id === c.id);

        return `
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="px-2.5 py-0.5 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-mono font-black text-xs border border-brand-200 dark:border-brand-800">
                ${escapeHtml(c.code)}
              </span>
              <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400">${cTopics.length} Topics</span>
            </div>

            <h4 class="text-sm font-extrabold text-slate-900 dark:text-white">${escapeHtml(c.title)}</h4>
            <p class="text-[11px] text-slate-400">Standard CBT: ${c.duration || 30} mins &bull; Limit: ${c.question_limit || 20} Qs</p>
          </div>

          <!-- Topics Summary -->
          <div class="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Curriculum Topics:</div>
            <div class="max-h-36 overflow-y-auto space-y-1 pr-1">
              ${cTopics.length === 0 ? `
                <p class="text-[11px] text-slate-400 italic">No topics assigned yet.</p>
              ` : cTopics.map(t => `
                <div class="flex items-center justify-between text-xs py-0.5 px-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800">
                  <span class="truncate text-slate-700 dark:text-slate-300">${escapeHtml(t.name)}</span>
                  <form method="POST" action="/action/delete_topic" class="inline" onsubmit="return confirm('Delete topic &quot;${escapeHtml(t.name)}&quot;?');">
                    <input type="hidden" name="topic_id" value="${escapeHtml(t.id)}">
                    <button type="submit" class="text-slate-300 hover:text-rose-500">&times;</button>
                  </form>
                </div>
              `).join('')}
            </div>

            <!-- Add Topic Form -->
            <form method="POST" action="/action/add_topic" class="flex gap-1.5 pt-2">
              <input type="hidden" name="course_id" value="${escapeHtml(c.id)}">
              <input type="text" name="name" required placeholder="+ Add topic name..." class="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white">
              <button type="submit" class="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold">
                Add
              </button>
            </form>
          </div>

          <!-- Bottom Actions -->
          <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <form method="POST" action="/action/delete_course" onsubmit="return confirm('Delete course &quot;${escapeHtml(c.code)}&quot; and all its questions?');">
              <input type="hidden" name="course_id" value="${escapeHtml(c.id)}">
              <button type="submit" class="text-[11px] font-bold text-rose-500 hover:text-rose-700 transition-colors">
                Delete Course
              </button>
            </form>
          </div>
        </div>
        `;
      }).join('')}
    </div>

  </div>
  `;
}

// -------------------------------------------------------------
// TAB 4: QUESTION BANK
// -------------------------------------------------------------
function renderQuestionsTab(ctx) {
  const { questions, courses, allTopics } = ctx;

  return `
  <div class="space-y-6">

    <!-- Add Question Panel -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-7 space-y-5">
      <div class="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <i data-lucide="help-circle" class="w-5 h-5 text-brand-600 dark:text-brand-400"></i>
        <h3 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Add Question to Cloud Bank</h3>
      </div>

      <form method="POST" action="/action/add_question" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-700 dark:text-slate-300">Course *</label>
            <select name="course_id" id="qCourseSelect" required onchange="filterQTopics()" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold">
              <option value="">-- Choose Course --</option>
              ${courses.map(c => `
                <option value="${escapeHtml(c.id)}">${escapeHtml(c.code)} - ${escapeHtml(c.title)}</option>
              `).join('')}
            </select>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-700 dark:text-slate-300">Curriculum Topic *</label>
            <select name="topic_id" id="qTopicSelect" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium">
              <option value="">-- Choose Topic --</option>
              ${allTopics.map(t => `
                <option value="${escapeHtml(t.id)}" data-course-id="${escapeHtml(t.course_id)}">${escapeHtml(t.name)}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Question Stem -->
        <div class="space-y-1">
          <label class="text-xs font-bold text-slate-700 dark:text-slate-300">Question Stem (Supports LaTeX math, e.g. $E=mc^2$) *</label>
          <textarea name="text" required rows="3" placeholder="Enter question text here..." class="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-brand-500"></textarea>
        </div>

        <!-- Options A, B, C, D -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-700 dark:text-slate-300">Option A *</label>
            <input type="text" name="a" required class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs">
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-700 dark:text-slate-300">Option B *</label>
            <input type="text" name="b" required class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs">
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-700 dark:text-slate-300">Option C *</label>
            <input type="text" name="c" required class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs">
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-700 dark:text-slate-300">Option D *</label>
            <input type="text" name="d" required class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs">
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-700 dark:text-slate-300">Correct Option *</label>
            <select name="correct_option" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold">
              <option value="A">Option A</option>
              <option value="B">Option B</option>
              <option value="C">Option C</option>
              <option value="D">Option D</option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-700 dark:text-slate-300">Explanation (Optional)</label>
            <input type="text" name="explanation" placeholder="Rationale for solution..." class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs">
          </div>
        </div>

        <div class="flex justify-end pt-2">
          <button type="submit" class="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-xs">
            Save Question to Cloud
          </button>
        </div>
      </form>
    </div>

    <!-- Questions Bank List -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-black text-slate-900 dark:text-white">Cloud Question Bank (${questions.length} Items Displayed)</h3>
      </div>

      ${questions.length === 0 ? `
        <div class="p-8 text-center text-slate-400 text-xs">
          Question bank is currently clean. Use the form above to add questions for your courses.
        </div>
      ` : `
        <div class="divide-y divide-slate-100 dark:divide-slate-800">
          ${questions.map((q, idx) => `
            <div class="py-4 space-y-2">
              <div class="flex items-start justify-between gap-3">
                <div class="space-y-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">#${idx + 1}</span>
                    <span class="text-xs font-black text-brand-600 dark:text-brand-400 font-mono">${escapeHtml(q.course_code || '')}</span>
                    <span class="text-xs text-slate-400">&bull;</span>
                    <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">${escapeHtml(q.topic_name || '')}</span>
                  </div>
                  <div class="text-xs font-medium text-slate-900 dark:text-white pt-1 leading-relaxed">
                    ${escapeHtml(q.text)}
                  </div>
                </div>

                <form method="POST" action="/action/delete_question" onsubmit="return confirm('Delete this question permanently?');">
                  <input type="hidden" name="question_id" value="${escapeHtml(q.id)}">
                  <button type="submit" class="text-slate-300 hover:text-rose-500 p-1">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                  </button>
                </form>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
                <div class="p-2 rounded bg-slate-50 dark:bg-slate-850 ${q.correct_option === 'A' ? 'font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800' : 'text-slate-600 dark:text-slate-400'}">
                  A: ${escapeHtml(q.a)}
                </div>
                <div class="p-2 rounded bg-slate-50 dark:bg-slate-850 ${q.correct_option === 'B' ? 'font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800' : 'text-slate-600 dark:text-slate-400'}">
                  B: ${escapeHtml(q.b)}
                </div>
                <div class="p-2 rounded bg-slate-50 dark:bg-slate-850 ${q.correct_option === 'C' ? 'font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800' : 'text-slate-600 dark:text-slate-400'}">
                  C: ${escapeHtml(q.c)}
                </div>
                <div class="p-2 rounded bg-slate-50 dark:bg-slate-850 ${q.correct_option === 'D' ? 'font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800' : 'text-slate-600 dark:text-slate-400'}">
                  D: ${escapeHtml(q.d)}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>

  </div>

  <script>
    function filterQTopics() {
      const cSelect = document.getElementById('qCourseSelect');
      const tSelect = document.getElementById('qTopicSelect');
      if (!cSelect || !tSelect) return;
      const cId = cSelect.value;
      Array.from(tSelect.options).forEach(opt => {
        if (!opt.value) return;
        const optCId = opt.getAttribute('data-course-id');
        opt.style.display = (optCId === cId) ? 'block' : 'none';
      });
      tSelect.value = '';
    }
  </script>
  `;
}

// -------------------------------------------------------------
// TAB 5: STUDENTS DIRECTORY
// -------------------------------------------------------------
function renderStudentsTab(ctx) {
  const { students } = ctx;

  return `
  <div class="space-y-6">

    <!-- Add Candidate Card -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
      <div class="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <i data-lucide="user-plus" class="w-5 h-5 text-brand-600 dark:text-brand-400"></i>
        <h3 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Register Candidate</h3>
      </div>

      <form method="POST" action="/action/add_student" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="space-y-1">
          <label class="text-xs font-bold text-slate-700 dark:text-slate-300">Candidate Full Name *</label>
          <input type="text" name="name" required placeholder="e.g. Adejuwon Emmanuel" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium">
        </div>

        <div class="space-y-1">
          <label class="text-xs font-bold text-slate-700 dark:text-slate-300">Matric / Registration No *</label>
          <input type="text" name="matric_no" required placeholder="e.g. 210203001" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold">
        </div>

        <div class="space-y-1">
          <label class="text-xs font-bold text-slate-700 dark:text-slate-300">Department *</label>
          <input type="text" name="department" required placeholder="e.g. Medicine &amp; Surgery" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium">
        </div>

        <div class="flex items-end">
          <button type="submit" class="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-xs transition-colors">
            Register Candidate
          </button>
        </div>
      </form>
    </div>

    <!-- Students Directory Table -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div class="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h3 class="text-base font-black text-slate-900 dark:text-white">Enrolled Candidates (${students.length})</h3>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-extrabold text-[10px]">
              <th class="p-3.5">Matric No</th>
              <th class="p-3.5">Candidate Name</th>
              <th class="p-3.5">Department</th>
              <th class="p-3.5">Registered</th>
              <th class="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            ${students.length === 0 ? `
              <tr><td colspan="5" class="p-6 text-center text-slate-400">No candidates found in cloud database.</td></tr>
            ` : students.map(s => `
              <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td class="p-3.5 font-mono font-bold text-brand-600 dark:text-brand-400">${escapeHtml(s.matric_no)}</td>
                <td class="p-3.5 font-bold text-slate-900 dark:text-white">${escapeHtml(s.name)}</td>
                <td class="p-3.5 text-slate-600 dark:text-slate-300">${escapeHtml(s.department || 'Premedical')}</td>
                <td class="p-3.5 text-slate-400 font-mono text-[11px]">${escapeHtml(s.created_at || '-')}</td>
                <td class="p-3.5 text-right">
                  <form method="POST" action="/action/delete_student" onsubmit="return confirm('Delete candidate &quot;${escapeHtml(s.name)}&quot;?');">
                    <input type="hidden" name="student_id" value="${escapeHtml(s.id)}">
                    <button type="submit" class="text-slate-400 hover:text-rose-600 p-1">
                      <i data-lucide="trash-2" class="w-4 h-4"></i>
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
  `;
}

// -------------------------------------------------------------
// TAB 6: RESULTS & SUBMISSIONS
// -------------------------------------------------------------
function renderResultsTab(ctx) {
  const { submissions } = ctx;

  return `
  <div class="space-y-6">

    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div class="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
        <div>
          <h3 class="text-base font-black text-slate-900 dark:text-white">Graded Examination Results (${submissions.length})</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Automated scoring records, grades, and anti-cheating audit trail.</p>
        </div>
        <a href="/api/export_results_csv" download class="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors">
          <i data-lucide="download" class="w-3.5 h-3.5"></i>
          <span>Export CSV</span>
        </a>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-extrabold text-[10px]">
              <th class="p-3.5">Candidate</th>
              <th class="p-3.5">Course</th>
              <th class="p-3.5">Score</th>
              <th class="p-3.5">Grade</th>
              <th class="p-3.5">Tab Switches</th>
              <th class="p-3.5">Submitted At</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            ${submissions.length === 0 ? `
              <tr><td colspan="6" class="p-8 text-center text-slate-400">No examination submissions recorded yet.</td></tr>
            ` : submissions.map(r => `
              <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td class="p-3.5">
                  <div class="font-bold text-slate-900 dark:text-white">${escapeHtml(r.student_name || 'Candidate')}</div>
                  <div class="font-mono text-[11px] text-slate-400">${escapeHtml(r.matric_no || '')}</div>
                </td>
                <td class="p-3.5 font-mono font-bold text-brand-600 dark:text-brand-400">
                  ${escapeHtml(r.course_code || 'EXAM')}
                </td>
                <td class="p-3.5 font-mono font-bold text-slate-900 dark:text-white">
                  ${r.total_score} / ${r.total_questions} (${Math.round(r.percentage || 0)}%)
                </td>
                <td class="p-3.5">
                  <span class="px-2 py-0.5 rounded text-[11px] font-black ${
                    ['A', 'B'].includes(r.grade) ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                    ['C', 'D'].includes(r.grade) ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' :
                    'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }">${escapeHtml(r.grade || 'F')}</span>
                </td>
                <td class="p-3.5 font-mono">
                  ${(r.tab_switches || 0) > 0 ? `
                    <span class="text-amber-600 dark:text-amber-400 font-bold">⚠️ ${r.tab_switches} switch(es)</span>
                  ` : `
                    <span class="text-emerald-600 dark:text-emerald-400 font-bold">Clean</span>
                  `}
                </td>
                <td class="p-3.5 text-slate-400 font-mono text-[11px]">
                  ${escapeHtml(r.created_at || '-')}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

  </div>
  `;
}

// -------------------------------------------------------------
// TAB 7: SECURITY & SYSTEM SETTINGS
// -------------------------------------------------------------
function renderSettingsTab(ctx) {
  const { getSetting } = ctx;

  return `
  <div class="max-w-3xl mx-auto space-y-6">

    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-sm space-y-5">
      <div class="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <i data-lucide="shield" class="w-5 h-5 text-brand-600 dark:text-brand-400"></i>
        <h3 class="text-base font-black text-slate-900 dark:text-white">Global Proctoring &amp; Fallback Rules</h3>
      </div>

      <form method="POST" action="/action/save_settings" class="space-y-4 text-xs font-semibold">
        <div class="space-y-2">
          <label class="block text-slate-700 dark:text-slate-300">Fullscreen Enforcement (Default for new exams)</label>
          <select name="enforce_fullscreen" class="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
            <option value="1" ${getSetting('enforce_fullscreen', '1') === '1' ? 'selected' : ''}>Strict Fullscreen Required</option>
            <option value="0" ${getSetting('enforce_fullscreen', '1') === '0' ? 'selected' : ''}>Windowed Allowed</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="block text-slate-700 dark:text-slate-300">Tab-Switch Window Blur Detection</label>
          <select name="anti_cheat_blur" class="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
            <option value="1" ${getSetting('anti_cheat_blur', '1') === '1' ? 'selected' : ''}>Enabled (Record timestamps on window blur)</option>
            <option value="0" ${getSetting('anti_cheat_blur', '1') === '0' ? 'selected' : ''}>Disabled</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="block text-slate-700 dark:text-slate-300">Default Maximum Tab-Switch Warnings</label>
          <input type="number" name="max_tab_switches" value="${escapeHtml(getSetting('max_tab_switches', '3'))}" min="1" max="10" class="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono">
        </div>

        <div class="space-y-2">
          <label class="block text-slate-700 dark:text-slate-300">Candidate Watermark Overlay</label>
          <select name="watermark_enabled" class="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
            <option value="1" ${getSetting('watermark_enabled', '1') === '1' ? 'selected' : ''}>Enabled (Matric No translucent overlay)</option>
            <option value="0" ${getSetting('watermark_enabled', '1') === '0' ? 'selected' : ''}>Disabled</option>
          </select>
        </div>

        <div class="pt-3 flex justify-end">
          <button type="submit" class="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black text-xs shadow-xs">
            Save System Settings
          </button>
        </div>
      </form>
    </div>

    <!-- Turso Cloud DB Status Card -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-3">
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <h4 class="text-sm font-bold text-slate-900 dark:text-white">Cloud Architecture Verification</h4>
      </div>
      <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        The system is actively connected to the high-performance <strong>Turso Cloud DB</strong> cluster (AWS us-east-1). Local SQLite files, bridges, and redundant dumps have been completely removed.
      </p>
      <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300 space-y-1">
        <div><strong>Database Engine:</strong> libSQL over HTTP v2 pipeline</div>
        <div><strong>Region:</strong> aws-us-east-1</div>
        <div><strong>Endpoint:</strong> https://premed-test-portal-emmanueladejuwon2021-star.aws-us-east-1.turso.io</div>
      </div>
    </div>

  </div>
  `;
}

module.exports = { renderHtml };
