<?php
/**
 * Global Header Component - Clinical Medical Edition
 * Apex Pre-Medical Sciences Examination Portal
 */

require_once __DIR__ . '/../config/db.php';

try {
    DB::connect();
} catch (Exception $e) {}

$currentPage = basename($_SERVER['PHP_SELF'] ?? '');
$currentUri = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
$cleanUri = trim($currentUri, '/');
$cleanUri = preg_replace('/\.php$/', '', $cleanUri);
$isPublicPage = in_array($cleanUri, ['', 'login', 'admin_login']) || in_array($currentPage, ['login.php', 'admin_login.php']);

if (!$isPublicPage && empty($_SESSION['student']) && empty($_SESSION['admin'])) {
    header('Location: login.php');
    exit;
}

$student = $_SESSION['student'] ?? null;
$isAdmin = !empty($_SESSION['admin']);
$pageTitle = $pageTitle ?? 'PreMed Test Portal';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($pageTitle) ?> | PreMed Test Portal</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        clinical: {
                            50: '#f0fdfa',
                            100: '#ccfbf1',
                            200: '#99f6e4',
                            300: '#5eead4',
                            400: '#2dd4bf',
                            500: '#14b8a6',
                            600: '#0d9488',
                            700: '#0f766e',
                            800: '#115e59',
                            900: '#134e4a',
                            950: '#042f2e'
                        }
                    }
                }
            }
        }
    </script>
    <script>
        (function() {
            const savedTheme = localStorage.getItem('appTheme') || localStorage.getItem('adminTheme');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        })();
    </script>
    <!-- Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest"></script>
    <!-- KaTeX CSS & JS for math & science formulas -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
    </style>
</head>
<body class="bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-100 min-h-screen flex flex-col antialiased selection:bg-teal-600 selection:text-white transition-colors duration-200">

<?php if (!$isPublicPage && $currentPage !== 'exam.php'): ?>
<!-- ================= FIXED & COLLAPSIBLE CLINICAL NAVBAR ================= -->
<header class="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-teal-100/70 dark:border-slate-800 shadow-xs">
    <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <div class="flex items-center justify-between h-16 gap-3">

            <!-- 1. Left Brand / Logo with Medical Cross Emblem -->
            <a href="index.php" class="flex items-center gap-2.5 shrink-0 group">
                <div id="secretBrandCross" class="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-700 text-white flex items-center justify-center shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform cursor-pointer select-none" title="">
                    <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 6v12m-6-6h12"></path>
                        <path d="M4 12h2l2 4 4-8 3 6h5" stroke-width="1.8" stroke="currentColor" opacity="0.8"></path>
                    </svg>
                </div>
                <div>
                    <span class="text-base font-black text-slate-900 tracking-tight">PreMed <span class="text-teal-600">Test Portal</span></span>
                    <p class="text-[10px] text-teal-700 font-bold uppercase tracking-wider leading-none hidden sm:block">Clinical CBT Portal</p>
                </div>
            </a>

            <!-- 2. Desktop Navigation (6 Tabs) -->
            <nav class="hidden lg:flex items-center space-x-1 text-xs font-semibold text-slate-600">
                <!-- Home -->
                <a href="index.php" class="px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 <?= $currentPage === 'index.php' ? 'bg-teal-50 text-teal-800 font-bold shadow-xs border border-teal-200/50' : 'hover:bg-slate-100 hover:text-slate-900' ?>">
                    <i data-lucide="home" class="w-4 h-4 text-teal-600"></i>
                    <span>Home</span>
                </a>

                <!-- Tests -->
                <a href="courses.php" class="px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 <?= in_array($currentPage, ['courses.php', 'exam.php']) ? 'bg-teal-50 text-teal-800 font-bold shadow-xs border border-teal-200/50' : 'hover:bg-slate-100 hover:text-slate-900' ?>">
                    <i data-lucide="file-check-2" class="w-4 h-4 text-teal-600"></i>
                    <span>Tests</span>
                </a>

                <!-- Study Combat (⚔️ Game & Admin) -->
                <div class="relative group">
                    <?php if ($isAdmin): ?>
                    <a href="admin_combat.php" class="px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 <?= in_array($currentPage, ['admin_combat.php', 'combat.php']) ? 'bg-purple-50 text-purple-900 font-bold shadow-xs border border-purple-200/50' : 'hover:bg-slate-100 hover:text-slate-900' ?>">
                        <i data-lucide="swords" class="w-4 h-4 text-purple-600"></i>
                        <span>Study Combat Admin</span>
                        <i data-lucide="chevron-down" class="w-3 h-3 text-slate-400 group-hover:rotate-180 transition-transform"></i>
                    </a>
                    <!-- Admin Sub-menu Dropdown -->
                    <div class="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-purple-100 dark:border-slate-800 py-2 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-1">
                        <a href="admin_combat.php?tab=monitor" class="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-700">
                            <i data-lucide="activity" class="w-3.5 h-3.5 text-purple-600"></i>
                            <span>Live Battle Monitor</span>
                        </a>
                        <a href="admin_combat.php?tab=security" class="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-700">
                            <i data-lucide="shield-check" class="w-3.5 h-3.5 text-purple-600"></i>
                            <span>Security & Anti-Cheat</span>
                        </a>
                        <a href="admin_combat.php?tab=ranks" class="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-700">
                            <i data-lucide="award" class="w-3.5 h-3.5 text-purple-600"></i>
                            <span>Edit Rank Thresholds</span>
                        </a>
                        <a href="admin_combat.php?tab=players" class="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-700">
                            <i data-lucide="crown" class="w-3.5 h-3.5 text-amber-500"></i>
                            <span>Master Leaderboard</span>
                        </a>
                        <a href="admin_combat.php?tab=questions" class="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-700">
                            <i data-lucide="help-circle" class="w-3.5 h-3.5 text-purple-600"></i>
                            <span>Questions Pool Radar</span>
                        </a>
                        <div class="border-t border-slate-100 dark:border-slate-800 my-1"></div>
                        <a href="combat.php" class="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
                            <i data-lucide="gamepad-2" class="w-3.5 h-3.5 text-slate-400"></i>
                            <span>Open Student Arena View</span>
                        </a>
                    </div>
                    <?php else: ?>
                    <a href="combat.php" class="px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 <?= $currentPage === 'combat.php' ? 'bg-purple-50 text-purple-900 font-bold shadow-xs border border-purple-200/50' : 'hover:bg-slate-100 hover:text-slate-900' ?>">
                        <i data-lucide="swords" class="w-4 h-4 text-purple-600"></i>
                        <span>Study Combat</span>
                        <i data-lucide="chevron-down" class="w-3 h-3 text-slate-400 group-hover:rotate-180 transition-transform"></i>
                    </a>
                    <!-- Student Sub-menu Dropdown -->
                    <div class="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-purple-100 dark:border-slate-800 py-2 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-1">
                        <a href="combat.php?action=create" class="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-700">
                            <i data-lucide="swords" class="w-3.5 h-3.5 text-purple-600"></i>
                            <span>Create Battle Room</span>
                        </a>
                        <a href="combat.php?action=join" class="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-700">
                            <i data-lucide="key-round" class="w-3.5 h-3.5 text-purple-600"></i>
                            <span>Join Battle Room</span>
                        </a>
                        <a href="combat.php?tab=profile" class="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-700">
                            <i data-lucide="trophy" class="w-3.5 h-3.5 text-purple-600"></i>
                            <span>My Gamer Profile</span>
                        </a>
                        <a href="combat.php?tab=leaderboard" class="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-700">
                            <i data-lucide="crown" class="w-3.5 h-3.5 text-amber-500"></i>
                            <span>Leaderboard</span>
                        </a>
                    </div>
                    <?php endif; ?>
                </div>

                <!-- Study Room (Locked) -->
                <a href="active_study.php" class="px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 <?= $currentPage === 'active_study.php' ? 'bg-amber-50 text-amber-800 font-bold shadow-xs border border-amber-200/50' : 'hover:bg-slate-100 hover:text-slate-900' ?>">
                    <i data-lucide="lock" class="w-3.5 h-3.5 text-amber-500"></i>
                    <span>Study Room</span>
                    <span class="text-[9px] font-black uppercase text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-md leading-none">Locked</span>
                </a>

                <!-- Academic Resources -->
                <a href="question_search.php" class="px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 <?= $currentPage === 'question_search.php' ? 'bg-teal-50 text-teal-800 font-bold shadow-xs border border-teal-200/50' : 'hover:bg-slate-100 hover:text-slate-900' ?>">
                    <i data-lucide="book-open-check" class="w-4 h-4 text-teal-600"></i>
                    <span>Academic Resources</span>
                </a>

                <!-- Past Question Practice -->
                <a href="practice.php" class="px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 <?= $currentPage === 'practice.php' ? 'bg-teal-50 text-teal-800 font-bold shadow-xs border border-teal-200/50' : 'hover:bg-slate-100 hover:text-slate-900' ?>">
                    <i data-lucide="layers" class="w-4 h-4 text-teal-600"></i>
                    <span>Past Question Practice</span>
                </a>

                <!-- Results -->
                <a href="history.php" class="px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 <?= in_array($currentPage, ['results.php', 'history.php']) ? 'bg-teal-50 text-teal-800 font-bold shadow-xs border border-teal-200/50' : 'hover:bg-slate-100 hover:text-slate-900' ?>">
                    <i data-lucide="bar-chart-3" class="w-4 h-4 text-teal-600"></i>
                    <span>Results</span>
                </a>

                <?php if ($isAdmin): ?>
                <a href="admin_dashboard.php" class="px-2.5 py-1.5 rounded-lg text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors ml-1">
                    <span>Admin</span>
                </a>
                <?php endif; ?>

                <button type="button" id="appThemeToggleBtn" title="Toggle Dark/Light Mode" class="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none ml-1">
                    <i data-lucide="moon" class="w-4 h-4 hidden dark:block text-amber-400"></i>
                    <i data-lucide="sun" class="w-4 h-4 block dark:hidden text-amber-500"></i>
                </button>
            </nav>

            <!-- 3. Right User Profile & Hamburger Toggle -->
            <div class="flex items-center gap-2">
                <?php if ($student): ?>
                <a href="profile.php" class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-teal-100 hover:border-teal-400 bg-teal-50/40 hover:bg-teal-50 transition-all text-xs">
                    <div class="w-7 h-7 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                        <?= strtoupper(substr($student['name'] ?? 'S', 0, 1)) ?>
                    </div>
                    <div class="flex flex-col text-left">
                        <span class="font-bold text-slate-800 leading-tight truncate max-w-[120px]"><?= htmlspecialchars(explode(' ', $student['name'] ?? 'Student')[0]) ?></span>
                        <span class="text-[10px] text-teal-700 font-mono font-semibold leading-tight"><?= htmlspecialchars($student['matric_no'] ?? '') ?></span>
                    </div>
                </a>
                <?php endif; ?>

                <a href="logout.php" title="Log Out" class="hidden sm:flex items-center gap-1 px-3 py-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors">
                    <i data-lucide="log-out" class="w-4 h-4"></i>
                    <span>Log Out</span>
                </a>

                <!-- Mobile Hamburger Toggle Button -->
                <button type="button" id="mobileMenuBtn" aria-label="Toggle navigation menu" class="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none">
                    <i data-lucide="menu" id="menuIconClosed" class="w-5 h-5"></i>
                    <i data-lucide="x" id="menuIconOpen" class="w-5 h-5 hidden"></i>
                </button>
            </div>
        </div>
    </div>

    <!-- ================= MOBILE COLLAPSIBLE MENU ================= -->
    <div id="mobileCollapsibleMenu" class="hidden lg:hidden border-t border-slate-100 bg-white/98 backdrop-blur-md px-4 py-3 space-y-1 shadow-md">
        <!-- 6 Nav Links -->
        <a href="index.php" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold <?= $currentPage === 'index.php' ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-700 hover:bg-slate-50' ?>">
            <i data-lucide="home" class="w-4 h-4 text-teal-600"></i>
            <span>Home</span>
        </a>

        <a href="courses.php" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold <?= in_array($currentPage, ['courses.php', 'exam.php']) ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-700 hover:bg-slate-50' ?>">
            <i data-lucide="file-check-2" class="w-4 h-4 text-teal-600"></i>
            <span>Tests</span>
        </a>

        <!-- Study Combat Mobile Links -->
        <a href="combat.php" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-purple-900 bg-purple-50 dark:bg-purple-950/50">
            <i data-lucide="swords" class="w-4 h-4 text-purple-600"></i>
            <span>Study Combat Arena ⚔️</span>
        </a>

        <a href="active_study.php" class="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold <?= $currentPage === 'active_study.php' ? 'bg-amber-50 text-amber-800 font-bold' : 'text-slate-700 hover:bg-slate-50' ?>">
            <div class="flex items-center gap-3">
                <i data-lucide="lock" class="w-4 h-4 text-amber-500"></i>
                <span>Study Room</span>
            </div>
            <span class="text-[9px] font-black uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">Locked</span>
        </a>

        <a href="question_search.php" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold <?= $currentPage === 'question_search.php' ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-700 hover:bg-slate-50' ?>">
            <i data-lucide="book-open-check" class="w-4 h-4 text-teal-600"></i>
            <span>Academic Resources</span>
        </a>

        <a href="practice.php" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold <?= $currentPage === 'practice.php' ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-700 hover:bg-slate-50' ?>">
            <i data-lucide="layers" class="w-4 h-4 text-teal-600"></i>
            <span>Past Question Practice</span>
        </a>

        <!-- Results -->
        <a href="history.php" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold <?= in_array($currentPage, ['results.php', 'history.php']) ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-700 hover:bg-slate-50' ?>">
            <i data-lucide="bar-chart-3" class="w-4 h-4 text-teal-600"></i>
            <span>Results</span>
        </a>

        <?php if ($isAdmin): ?>
        <a href="admin_dashboard.php" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200">
            <i data-lucide="shield" class="w-4 h-4 text-rose-600"></i>
            <span>Admin Console</span>
        </a>
        <?php endif; ?>

        <!-- Mobile Theme Toggle -->
        <div class="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-600 dark:text-slate-300">Appearance</span>
            <button type="button" id="mobileThemeToggleBtn" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800">
                <i data-lucide="sun" class="w-3.5 h-3.5 text-amber-500 block dark:hidden"></i>
                <i data-lucide="moon" class="w-3.5 h-3.5 text-amber-400 hidden dark:block"></i>
                <span class="block dark:hidden">Light</span>
                <span class="hidden dark:block">Dark</span>
            </button>
        </div>

        <!-- Student Profile & Logout in Mobile Menu -->
        <div class="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
            <?php if ($student): ?>
            <a href="profile.php" class="flex items-center gap-2 text-xs font-bold text-slate-700">
                <div class="w-6 h-6 rounded-md bg-teal-100 text-teal-700 flex items-center justify-center text-xs">
                    <?= strtoupper(substr($student['name'] ?? 'S', 0, 1)) ?>
                </div>
                <span><?= htmlspecialchars($student['name'] ?? 'Student') ?></span>
            </a>
            <?php endif; ?>

            <a href="logout.php" class="text-xs font-semibold text-rose-600 hover:underline flex items-center gap-1">
                <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
                <span>Log Out</span>
            </a>
        </div>
    </div>
</header>

<script>
    // Collapsible Mobile Menu Toggle Logic
    document.addEventListener('DOMContentLoaded', function () {
        const btn = document.getElementById('mobileMenuBtn');
        const menu = document.getElementById('mobileCollapsibleMenu');
        const closedIcon = document.getElementById('menuIconClosed');
        const openIcon = document.getElementById('menuIconOpen');

        if (btn && menu) {
            btn.addEventListener('click', function () {
                const isHidden = menu.classList.contains('hidden');
                if (isHidden) {
                    menu.classList.remove('hidden');
                    if (closedIcon) closedIcon.classList.add('hidden');
                    if (openIcon) openIcon.classList.remove('hidden');
                } else {
                    menu.classList.add('hidden');
                    if (closedIcon) closedIcon.classList.remove('hidden');
                    if (openIcon) openIcon.classList.add('hidden');
                }
            });
        }

        // Theme Toggle Handler
        function toggleTheme() {
            const isDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('appTheme', isDark ? 'dark' : 'light');
            localStorage.setItem('adminTheme', isDark ? 'dark' : 'light');
            if (window.lucide) lucide.createIcons();
        }

        const themeBtn = document.getElementById('appThemeToggleBtn');
        if (themeBtn) {
            themeBtn.addEventListener('click', toggleTheme);
        }

        const mobileThemeBtn = document.getElementById('mobileThemeToggleBtn');
        if (mobileThemeBtn) {
            mobileThemeBtn.addEventListener('click', toggleTheme);
        }

        // Secret Knock on Header Brand Logo (5 rapid taps)
        let hKnock = 0;
        let hLastTime = 0;
        const brandCross = document.getElementById('secretBrandCross');
        if (brandCross) {
            brandCross.addEventListener('click', function(e) {
                const now = Date.now();
                if (now - hLastTime > 2500) hKnock = 0;
                hLastTime = now;
                hKnock++;
                if (hKnock >= 5) {
                    e.preventDefault();
                    e.stopPropagation();
                    hKnock = 0;
                    window.location.href = 'login.php?portal=faculty';
                }
            });
        }
    });
</script>
<?php endif; ?>

<!-- Main Content Area with offset for fixed top navbar (suppressed on exam.php) -->
<main class="flex-grow <?= (!$isPublicPage && $currentPage !== 'exam.php') ? 'pt-20 sm:pt-24' : '' ?>">
