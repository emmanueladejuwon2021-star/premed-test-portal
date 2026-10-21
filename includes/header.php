<?php
/**
 * Global Header Component - Dual Navigation Engine
 * Distinct Dedicated Navbars for Student CBT vs Faculty/Admin Console
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
$adminUser = $_SESSION['admin'] ?? null;
$isAdmin = !empty($adminUser);
$pageTitle = $pageTitle ?? 'PreMed Test Portal';

// Determine if this is an Admin/Faculty page
$adminPages = ['admin_dashboard.php', 'admin_combat.php', 'admin.php', 'admin_login.php'];
$isAdminPage = in_array($currentPage, $adminPages);
$currentAdminTab = $_GET['tab'] ?? '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($pageTitle) ?> | <?= $isAdminPage ? 'Faculty Admin Console' : 'PreMed Portal' ?></title>
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
        
        /* Study Combat Focused Game Mode Support */
        body.combat-active-focus #siteHeader { display: none !important; }
        body.combat-active-focus main { padding-top: 0 !important; }
        body.combat-active-focus footer { display: none !important; }
    </style>
</head>
<body class="bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-100 min-h-screen flex flex-col antialiased selection:bg-teal-600 selection:text-white transition-colors duration-200">

<?php if (!$isPublicPage && $currentPage !== 'exam.php'): ?>

<?php if ($isAdminPage): ?>
<!-- ========================================================================= -->
<!-- 1. DEDICATED FACULTY & ADMINISTRATION CONSOLE NAVBAR (EXCLUSIVE ADMIN UI) -->
<!-- ========================================================================= -->
<header id="siteHeader" class="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-indigo-900/60 shadow-lg text-white">
    <div class="max-w-7xl mx-auto px-3 sm:px-6">
        <div class="flex items-center justify-between h-14 sm:h-16 gap-2">

            <!-- Admin Console Brand Logo -->
            <a href="admin_dashboard.php" class="flex items-center gap-2.5 shrink-0 group">
                <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-800 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                    <i data-lucide="shield" class="w-5 h-5 text-indigo-100"></i>
                </div>
                <div>
                    <div class="flex items-center gap-1.5">
                        <span class="text-sm sm:text-base font-black text-white tracking-tight">Faculty<span class="text-indigo-400">Console</span></span>
                        <span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Live</span>
                    </div>
                    <p class="text-[10px] text-slate-400 font-semibold tracking-wider uppercase leading-none hidden sm:block">Examination & Academic Admin</p>
                </div>
            </a>

            <!-- Desktop Admin Navigation Items (Compact & Distinct) -->
            <nav class="hidden xl:flex items-center space-x-1 text-xs font-bold text-slate-300">
                <!-- 1. Exams & Sittings -->
                <a href="admin_dashboard.php?tab=deployments" class="px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 <?= ($currentPage === 'admin_dashboard.php' && ($currentAdminTab === 'deployments' || empty($currentAdminTab))) ? 'bg-indigo-600 text-white shadow-xs font-black' : 'hover:bg-slate-800 hover:text-white' ?>">
                    <i data-lucide="layers" class="w-3.5 h-3.5 text-indigo-400"></i>
                    <span>Exams & Sittings</span>
                </a>

                <!-- 2. Question Bank -->
                <a href="admin_dashboard.php?tab=questions" class="px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 <?= ($currentPage === 'admin_dashboard.php' && $currentAdminTab === 'questions') ? 'bg-indigo-600 text-white shadow-xs font-black' : 'hover:bg-slate-800 hover:text-white' ?>">
                    <i data-lucide="file-question" class="w-3.5 h-3.5 text-indigo-400"></i>
                    <span>Question Bank</span>
                </a>

                <!-- 3. Scores & Gradebook -->
                <a href="admin_dashboard.php?tab=results" class="px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 <?= ($currentPage === 'admin_dashboard.php' && $currentAdminTab === 'results') ? 'bg-indigo-600 text-white shadow-xs font-black' : 'hover:bg-slate-800 hover:text-white' ?>">
                    <i data-lucide="graduation-cap" class="w-3.5 h-3.5 text-indigo-400"></i>
                    <span>Gradebook</span>
                </a>

                <!-- 4. Candidates & Cash Prizes -->
                <a href="admin_dashboard.php?tab=students" class="px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 <?= ($currentPage === 'admin_dashboard.php' && $currentAdminTab === 'students') ? 'bg-indigo-600 text-white shadow-xs font-black' : 'hover:bg-slate-800 hover:text-white' ?>">
                    <i data-lucide="id-card" class="w-3.5 h-3.5 text-indigo-400"></i>
                    <span>Candidates & Prizes</span>
                </a>

                <!-- 5. Live Exam Monitor -->
                <a href="admin_dashboard.php?tab=proctoring" class="px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 <?= ($currentPage === 'admin_dashboard.php' && $currentAdminTab === 'proctoring') ? 'bg-indigo-600 text-white shadow-xs font-black' : 'hover:bg-slate-800 hover:text-white' ?>">
                    <i data-lucide="shield-alert" class="w-3.5 h-3.5 text-amber-400"></i>
                    <span>Live Proctor</span>
                </a>

                <!-- 6. Combat Admin -->
                <a href="admin_combat.php" class="px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 <?= $currentPage === 'admin_combat.php' ? 'bg-purple-600 text-white shadow-xs font-black' : 'hover:bg-purple-950/60 hover:text-purple-300 text-purple-300/90' ?>">
                    <i data-lucide="swords" class="w-3.5 h-3.5 text-purple-400"></i>
                    <span>Combat Admin ⚔️</span>
                </a>
            </nav>

            <!-- Right Controls: View Student Portal + Theme + Profile + Logout -->
            <div class="flex items-center gap-2">
                <!-- Switch to Student View -->
                <a href="index.php" target="_blank" title="Preview Student Experience" class="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition-colors">
                    <i data-lucide="external-link" class="w-3.5 h-3.5 text-emerald-400"></i>
                    <span>Student View</span>
                </a>

                <!-- Theme Toggle -->
                <button type="button" id="appThemeToggleBtn" title="Toggle Dark/Light Mode" class="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors focus:outline-none">
                    <i data-lucide="moon" class="w-4 h-4 hidden dark:block text-amber-400"></i>
                    <i data-lucide="sun" class="w-4 h-4 block dark:hidden text-amber-400"></i>
                </button>

                <!-- Admin Profile Pill -->
                <div class="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-indigo-950/70 border border-indigo-800/80 text-xs text-indigo-200">
                    <div class="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                        A
                    </div>
                    <span class="font-bold text-slate-200"><?= htmlspecialchars($adminUser['matric_no'] ?? 'Administrator') ?></span>
                </div>

                <!-- Sign Out -->
                <a href="logout.php" title="Sign Out of Faculty Console" class="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition-all">
                    <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
                    <span class="hidden sm:inline">Sign Out</span>
                </a>

                <!-- Mobile Hamburger Toggle Button -->
                <button type="button" id="mobileMenuBtn" aria-label="Toggle navigation menu" class="xl:hidden p-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors focus:outline-none">
                    <i data-lucide="menu" id="menuIconClosed" class="w-5 h-5"></i>
                    <i data-lucide="x" id="menuIconOpen" class="w-5 h-5 hidden"></i>
                </button>
            </div>
        </div>
    </div>

    <!-- Mobile Admin Drawer -->
    <div id="mobileCollapsibleMenu" class="hidden xl:hidden border-t border-slate-800 bg-slate-950 px-4 py-3 space-y-1 shadow-2xl">
        <a href="admin_dashboard.php?tab=deployments" class="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold <?= ($currentPage === 'admin_dashboard.php' && ($currentAdminTab === 'deployments' || empty($currentAdminTab))) ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900' ?>">
            <i data-lucide="layers" class="w-4 h-4 text-indigo-400"></i>
            <span>1. Exams & Sittings</span>
        </a>
        <a href="admin_dashboard.php?tab=questions" class="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold <?= ($currentPage === 'admin_dashboard.php' && $currentAdminTab === 'questions') ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900' ?>">
            <i data-lucide="file-question" class="w-4 h-4 text-indigo-400"></i>
            <span>2. Question Bank</span>
        </a>
        <a href="admin_dashboard.php?tab=results" class="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold <?= ($currentPage === 'admin_dashboard.php' && $currentAdminTab === 'results') ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900' ?>">
            <i data-lucide="graduation-cap" class="w-4 h-4 text-indigo-400"></i>
            <span>3. Scores & Gradebook</span>
        </a>
        <a href="admin_dashboard.php?tab=students" class="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold <?= ($currentPage === 'admin_dashboard.php' && $currentAdminTab === 'students') ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900' ?>">
            <i data-lucide="id-card" class="w-4 h-4 text-indigo-400"></i>
            <span>4. Candidates & Cash Prizes</span>
        </a>
        <a href="admin_dashboard.php?tab=proctoring" class="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold <?= ($currentPage === 'admin_dashboard.php' && $currentAdminTab === 'proctoring') ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-900' ?>">
            <i data-lucide="shield-alert" class="w-4 h-4 text-amber-400"></i>
            <span>5. Live Exam Monitor</span>
        </a>
        <a href="admin_combat.php" class="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold <?= $currentPage === 'admin_combat.php' ? 'bg-purple-600 text-white' : 'text-purple-300 hover:bg-purple-950/40' ?>">
            <i data-lucide="swords" class="w-4 h-4 text-purple-400"></i>
            <span>Study Combat Admin ⚔️</span>
        </a>
        <div class="pt-2 border-t border-slate-800 flex items-center justify-between">
            <a href="index.php" target="_blank" class="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <i data-lucide="external-link" class="w-4 h-4"></i>
                <span>Open Student View</span>
            </a>
            <a href="logout.php" class="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                <i data-lucide="log-out" class="w-4 h-4"></i>
                <span>Sign Out</span>
            </a>
        </div>
    </div>
</header>

<?php else: ?>
<!-- ========================================================================= -->
<!-- 2. STUDENT CLINICAL CBT PORTAL NAVBAR (STUDENT UI)                        -->
<!-- ========================================================================= -->
<header id="siteHeader" class="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-teal-100/70 dark:border-slate-800 shadow-xs">
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
                    <span class="text-base font-black text-slate-900 dark:text-white tracking-tight">PreMed <span class="text-teal-600">Test Portal</span></span>
                    <p class="text-[10px] text-teal-700 dark:text-teal-400 font-bold uppercase tracking-wider leading-none hidden sm:block">Clinical CBT Portal</p>
                </div>
            </a>

            <!-- 2. Desktop Navigation (Student Tabs) -->
            <nav class="hidden lg:flex items-center space-x-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <!-- Home -->
                <a href="index.php" class="px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 <?= $currentPage === 'index.php' ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-bold shadow-xs border border-teal-200/50' : 'hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white' ?>">
                    <i data-lucide="home" class="w-4 h-4 text-teal-600"></i>
                    <span>Home</span>
                </a>

                <!-- Tests -->
                <a href="courses.php" class="px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 <?= in_array($currentPage, ['courses.php', 'exam.php']) ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-bold shadow-xs border border-teal-200/50' : 'hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white' ?>">
                    <i data-lucide="file-check-2" class="w-4 h-4 text-teal-600"></i>
                    <span>Tests</span>
                </a>

                <!-- Study Combat (⚔️ Student Battle) -->
                <a href="combat.php" class="px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 <?= $currentPage === 'combat.php' ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-900 dark:text-purple-300 font-bold shadow-xs border border-purple-200/50' : 'hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white' ?>">
                    <i data-lucide="swords" class="w-4 h-4 text-purple-600"></i>
                    <span>Study Combat ⚔️</span>
                </a>

                <!-- Study Room (Locked) -->
                <a href="active_study.php" class="px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 <?= $currentPage === 'active_study.php' ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-bold shadow-xs border border-amber-200/50' : 'hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white' ?>">
                    <i data-lucide="lock" class="w-3.5 h-3.5 text-amber-500"></i>
                    <span>Study Room</span>
                    <span class="text-[9px] font-black uppercase text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 rounded-md leading-none">Locked</span>
                </a>

                <!-- Academic Resources -->
                <a href="question_search.php" class="px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 <?= $currentPage === 'question_search.php' ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-bold shadow-xs border border-teal-200/50' : 'hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white' ?>">
                    <i data-lucide="book-open-check" class="w-4 h-4 text-teal-600"></i>
                    <span>Academic Resources</span>
                </a>

                <!-- Past Question Practice -->
                <a href="practice.php" class="px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 <?= $currentPage === 'practice.php' ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-bold shadow-xs border border-teal-200/50' : 'hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white' ?>">
                    <i data-lucide="layers" class="w-4 h-4 text-teal-600"></i>
                    <span>Past Question Practice</span>
                </a>

                <!-- Results -->
                <a href="history.php" class="px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 <?= in_array($currentPage, ['results.php', 'history.php']) ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-bold shadow-xs border border-teal-200/50' : 'hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white' ?>">
                    <i data-lucide="bar-chart-3" class="w-4 h-4 text-teal-600"></i>
                    <span>Results</span>
                </a>

                <?php if ($isAdmin): ?>
                <a href="admin_dashboard.php" class="px-2.5 py-1.5 rounded-lg text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors ml-1 flex items-center gap-1">
                    <i data-lucide="shield" class="w-3.5 h-3.5"></i>
                    <span>Faculty Console</span>
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
                <a href="profile.php" class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-teal-100 dark:border-slate-800 hover:border-teal-400 bg-teal-50/40 dark:bg-slate-800 hover:bg-teal-50 transition-all text-xs">
                    <div class="w-7 h-7 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                        <?= strtoupper(substr($student['name'] ?? 'S', 0, 1)) ?>
                    </div>
                    <div class="flex flex-col text-left">
                        <span class="font-bold text-slate-800 dark:text-slate-200 leading-tight truncate max-w-[120px]"><?= htmlspecialchars(explode(' ', $student['name'] ?? 'Student')[0]) ?></span>
                        <span class="text-[10px] text-teal-700 dark:text-teal-400 font-mono font-semibold leading-tight"><?= htmlspecialchars($student['matric_no'] ?? '') ?></span>
                    </div>
                </a>
                <?php endif; ?>

                <a href="logout.php" title="Log Out" class="hidden sm:flex items-center gap-1 px-3 py-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors">
                    <i data-lucide="log-out" class="w-4 h-4"></i>
                    <span>Log Out</span>
                </a>

                <!-- Mobile Hamburger Toggle Button -->
                <button type="button" id="mobileMenuBtn" aria-label="Toggle navigation menu" class="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none">
                    <i data-lucide="menu" id="menuIconClosed" class="w-5 h-5"></i>
                    <i data-lucide="x" id="menuIconOpen" class="w-5 h-5 hidden"></i>
                </button>
            </div>
        </div>
    </div>

    <!-- Mobile Collapsible Menu for Students -->
    <div id="mobileCollapsibleMenu" class="hidden lg:hidden border-t border-slate-100 dark:border-slate-800 bg-white/98 dark:bg-slate-900/98 backdrop-blur-md px-4 py-3 space-y-1 shadow-md">
        <a href="index.php" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold <?= $currentPage === 'index.php' ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50' ?>">
            <i data-lucide="home" class="w-4 h-4 text-teal-600"></i>
            <span>Home</span>
        </a>
        <a href="courses.php" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold <?= in_array($currentPage, ['courses.php', 'exam.php']) ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50' ?>">
            <i data-lucide="file-check-2" class="w-4 h-4 text-teal-600"></i>
            <span>Tests</span>
        </a>
        <a href="combat.php" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-purple-900 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50">
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
        <a href="history.php" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold <?= in_array($currentPage, ['results.php', 'history.php']) ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-700 hover:bg-slate-50' ?>">
            <i data-lucide="bar-chart-3" class="w-4 h-4 text-teal-600"></i>
            <span>Results</span>
        </a>
        <?php if ($isAdmin): ?>
        <a href="admin_dashboard.php" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200">
            <i data-lucide="shield" class="w-4 h-4 text-indigo-600"></i>
            <span>Switch to Faculty Console</span>
        </a>
        <?php endif; ?>
        <div class="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-600 dark:text-slate-300">Appearance</span>
            <button type="button" id="mobileThemeToggleBtn" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800">
                <i data-lucide="sun" class="w-3.5 h-3.5 text-amber-500 block dark:hidden"></i>
                <i data-lucide="moon" class="w-3.5 h-3.5 text-amber-400 hidden dark:block"></i>
                <span class="block dark:hidden">Light</span>
                <span class="hidden dark:block">Dark</span>
            </button>
        </div>
        <div class="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <?php if ($student): ?>
            <a href="profile.php" class="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
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
<?php endif; ?>

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
<main class="flex-grow <?= (!$isPublicPage && $currentPage !== 'exam.php') ? ($isAdminPage ? 'pt-16 sm:pt-20' : 'pt-20 sm:pt-24') : '' ?>">
