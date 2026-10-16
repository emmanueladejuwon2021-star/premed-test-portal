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
$isPublicPage = in_array($currentPage, ['login.php', 'admin_login.php', 'index.php']) && ($cleanUri === 'login' || $cleanUri === 'login.php' || $cleanUri === 'admin_login' || $cleanUri === 'admin_login.php' || $cleanUri === '' || in_array($currentPage, ['login.php', 'admin_login.php']));

if (!$isPublicPage && empty($_SESSION['student']) && empty($_SESSION['admin'])) {
    header('Location: login.php');
    exit;
}

$student = $_SESSION['student'] ?? null;
$isAdmin = !empty($_SESSION['admin']);
$pageTitle = $pageTitle ?? 'PreMed Portal';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($pageTitle) ?> | PreMed Student Portal</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
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
<body class="bg-[#f8fafc] text-slate-800 min-h-screen flex flex-col antialiased selection:bg-teal-600 selection:text-white">

<?php if (!$isPublicPage && $currentPage !== 'exam.php'): ?>
<!-- ================= FIXED & COLLAPSIBLE CLINICAL NAVBAR ================= -->
<header class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-teal-100/70 shadow-xs">
    <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <div class="flex items-center justify-between h-16 gap-3">

            <!-- 1. Left Brand / Logo with Medical Cross Emblem -->
            <a href="index.php" class="flex items-center gap-2.5 shrink-0 group">
                <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-700 text-white flex items-center justify-center shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
                    <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 6v12m-6-6h12"></path>
                        <path d="M4 12h2l2 4 4-8 3 6h5" stroke-width="1.8" stroke="currentColor" opacity="0.8"></path>
                    </svg>
                </div>
                <div>
                    <span class="text-base font-black text-slate-900 tracking-tight">PreMed<span class="text-teal-600">Pulse</span></span>
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

                <!-- Study Room -->
                <a href="active_study.php" class="px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 <?= $currentPage === 'active_study.php' ? 'bg-teal-50 text-teal-800 font-bold shadow-xs border border-teal-200/50' : 'hover:bg-slate-100 hover:text-slate-900' ?>">
                    <i data-lucide="sparkles" class="w-4 h-4 text-teal-600"></i>
                    <span>Study Room</span>
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
                <a href="admin_dashboard.php" class="px-2.5 py-1.5 rounded-lg text-rose-700 bg-rose-50 border border-rose-200 font-bold hover:bg-rose-100 transition-colors ml-1">
                    <span>Admin</span>
                </a>
                <?php endif; ?>
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

        <a href="active_study.php" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold <?= $currentPage === 'active_study.php' ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-700 hover:bg-slate-50' ?>">
            <i data-lucide="sparkles" class="w-4 h-4 text-teal-600"></i>
            <span>Study Room</span>
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
    });
</script>
<?php endif; ?>

<!-- Main Content Area with offset for fixed top navbar (suppressed on exam.php) -->
<main class="flex-grow <?= (!$isPublicPage && $currentPage !== 'exam.php') ? 'pt-20 sm:pt-24' : '' ?>">
