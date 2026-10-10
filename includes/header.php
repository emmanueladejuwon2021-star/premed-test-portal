<?php
/**
 * Global Header Component
 * Premed Test Portal (Pure PHP Edition)
 */

require_once __DIR__ . '/../config/db.php';

$currentPage = basename($_SERVER['PHP_SELF']);
$isPublicPage = in_array($currentPage, ['login.php', 'admin_login.php']);

if (!$isPublicPage && empty($_SESSION['student']) && empty($_SESSION['admin'])) {
    header('Location: login.php');
    exit;
}

$student = $_SESSION['student'] ?? null;
$isAdmin = !empty($_SESSION['admin']);
$pageTitle = $pageTitle ?? 'Premed Test Portal';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($pageTitle) ?> | Premed Portal</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        brand: {
                            50: '#eff6ff',
                            500: '#3b82f6',
                            600: '#2563eb',
                            700: '#1d4ed8',
                        }
                    }
                }
            }
        }
    </script>
    <!-- Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest"></script>
    <!-- KaTeX CSS & JS for math formulas -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        body { font-family: 'Inter', sans-serif; }
    </style>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen flex flex-col antialiased selection:bg-indigo-500 selection:text-white">

<?php if (!$isPublicPage): ?>
<header class="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
            <!-- Brand -->
            <div class="flex items-center space-x-3">
                <a href="index.php" class="flex items-center space-x-2.5">
                    <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
                        <i data-lucide="graduation-cap" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <span class="font-black text-slate-900 tracking-tight text-lg">Premed<span class="text-indigo-600">Portal</span></span>
                        <span class="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200 ml-1.5">PHP CBT</span>
                    </div>
                </a>
            </div>

            <!-- Navigation Links -->
            <nav class="hidden md:flex items-center space-x-1 font-medium text-xs text-slate-600">
                <a href="index.php" class="px-3 py-2 rounded-xl hover:text-slate-900 hover:bg-slate-100 transition-colors <?= $currentPage === 'index.php' ? 'text-indigo-600 bg-indigo-50 font-bold' : '' ?>">
                    <span class="flex items-center gap-1.5"><i data-lucide="layout-grid" class="w-4 h-4"></i> Home</span>
                </a>
                <a href="practice.php" class="px-3 py-2 rounded-xl hover:text-slate-900 hover:bg-slate-100 transition-colors <?= $currentPage === 'practice.php' ? 'text-indigo-600 bg-indigo-50 font-bold' : '' ?>">
                    <span class="flex items-center gap-1.5"><i data-lucide="rocket" class="w-4 h-4"></i> Practice</span>
                </a>
                <a href="courses.php" class="px-3 py-2 rounded-xl hover:text-slate-900 hover:bg-slate-100 transition-colors <?= $currentPage === 'courses.php' ? 'text-indigo-600 bg-indigo-50 font-bold' : '' ?>">
                    <span class="flex items-center gap-1.5"><i data-lucide="book-open" class="w-4 h-4"></i> Classroom</span>
                </a>
                <a href="active_study.php" class="px-3 py-2 rounded-xl hover:text-slate-900 hover:bg-slate-100 transition-colors <?= $currentPage === 'active_study.php' ? 'text-indigo-600 bg-indigo-50 font-bold' : '' ?>">
                    <span class="flex items-center gap-1.5"><i data-lucide="brain" class="w-4 h-4"></i> Active Study</span>
                </a>
                <a href="question_search.php" class="px-3 py-2 rounded-xl hover:text-slate-900 hover:bg-slate-100 transition-colors <?= $currentPage === 'question_search.php' ? 'text-indigo-600 bg-indigo-50 font-bold' : '' ?>">
                    <span class="flex items-center gap-1.5"><i data-lucide="search" class="w-4 h-4"></i> Search</span>
                </a>
                <a href="history.php" class="px-3 py-2 rounded-xl hover:text-slate-900 hover:bg-slate-100 transition-colors <?= $currentPage === 'history.php' ? 'text-indigo-600 bg-indigo-50 font-bold' : '' ?>">
                    <span class="flex items-center gap-1.5"><i data-lucide="clipboard-check" class="w-4 h-4"></i> History</span>
                </a>
                <a href="leaderboard.php" class="px-3 py-2 rounded-xl hover:text-slate-900 hover:bg-slate-100 transition-colors <?= $currentPage === 'leaderboard.php' ? 'text-indigo-600 bg-indigo-50 font-bold' : '' ?>">
                    <span class="flex items-center gap-1.5"><i data-lucide="trophy" class="w-4 h-4"></i> Rankings</span>
                </a>
                <a href="combat.php" class="px-3 py-2 rounded-xl hover:text-slate-900 hover:bg-slate-100 transition-colors <?= $currentPage === 'combat.php' ? 'text-indigo-600 bg-indigo-50 font-bold' : '' ?>">
                    <span class="flex items-center gap-1.5"><i data-lucide="swords" class="w-4 h-4 text-rose-500"></i> Combat</span>
                </a>
                <?php if ($isAdmin): ?>
                <a href="admin_dashboard.php" class="px-3 py-2 rounded-xl text-rose-600 bg-rose-50 font-bold hover:bg-rose-100 transition-colors">
                    <span class="flex items-center gap-1.5"><i data-lucide="shield" class="w-4 h-4"></i> Console</span>
                </a>
                <?php endif; ?>
            </nav>

            <!-- User Menu -->
            <div class="flex items-center space-x-3">
                <?php if ($student): ?>
                <a href="profile.php" class="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div class="hidden sm:flex flex-col text-right">
                        <span class="text-xs font-bold text-slate-800 leading-tight"><?= htmlspecialchars($student['name']) ?></span>
                        <span class="text-[11px] font-medium text-slate-500"><?= htmlspecialchars($student['matric_no']) ?></span>
                    </div>
                    <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-xs border border-indigo-200">
                        <?= strtoupper(substr($student['name'], 0, 1)) ?>
                    </div>
                </a>
                <?php endif; ?>

                <a href="logout.php" title="Sign Out" class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                    <i data-lucide="log-out" class="w-4 h-4"></i>
                </a>
            </div>
        </div>
    </div>
</header>
<?php endif; ?>

<main class="flex-grow">
