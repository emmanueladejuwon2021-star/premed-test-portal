<?php
/**
 * Global Institutional Header Component - Enterprise Production Edition
 * Apex Pre-Medical Sciences Examination Council (PMSEC)
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
$pageTitle = $pageTitle ?? 'Pre-Medical Sciences Examination Council';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($pageTitle) ?> | PMSEC Board Examination Portal</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        slate: {
                            850: '#151f33',
                            950: '#0a0f1d'
                        },
                        institutional: {
                            50: '#f0fdfa',
                            600: '#0d9488',
                            700: '#0f766e',
                            900: '#134e4a'
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
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
        body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .proctor-scanline {
            background: linear-gradient(180deg, rgba(16, 185, 129, 0) 0%, rgba(16, 185, 129, 0.05) 50%, rgba(16, 185, 129, 0) 100%);
        }
    </style>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen flex flex-col antialiased selection:bg-teal-600 selection:text-white">

<?php if (!$isPublicPage): ?>
<!-- Enterprise Institutional Header -->
<header class="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
    <!-- Top Security & Proctor Protocol Strip -->
    <div class="bg-slate-950 border-b border-slate-800/80 px-4 sm:px-6 py-1 text-[11px] font-mono text-slate-400 flex items-center justify-between">
        <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                PROCTOR PROTOCOL ENFORCED
            </span>
            <span class="hidden md:inline text-slate-500">&bull;</span>
            <span class="hidden md:inline">Apex Pre-Medical Sciences Examination Council (PMSEC)</span>
        </div>
        <div class="flex items-center gap-3">
            <span class="text-slate-400">Turso Cloud Cluster: <span class="text-emerald-400 font-bold">AWS-US-EAST-1</span></span>
            <span class="text-slate-600">&bull;</span>
            <span class="text-slate-400">Lockdown: <span class="text-teal-300 font-bold">Active</span></span>
        </div>
    </div>

    <!-- Main Navigation Bar -->
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
        <div class="flex justify-between items-center h-14 py-2">
            <!-- Institutional Emblem & Brand -->
            <div class="flex items-center space-x-3">
                <a href="index.php" class="flex items-center space-x-2.5 group">
                    <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-teal-900/30 group-hover:scale-105 transition-transform">
                        <i data-lucide="shield-plus" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-1.5">
                            <span class="font-extrabold tracking-tight text-base text-white">PMSEC<span class="text-teal-400 font-normal">.portal</span></span>
                            <span class="text-[9px] uppercase font-bold tracking-widest text-teal-300 bg-teal-950/90 px-1.5 py-0.5 rounded border border-teal-800">BOARD CBT</span>
                        </div>
                        <span class="hidden sm:block text-[10px] text-slate-400 font-medium tracking-wide">Pre-Medical Sciences Examination Portal</span>
                    </div>
                </a>
            </div>

            <!-- Executive Navigation Links -->
            <nav class="hidden lg:flex items-center space-x-1 text-xs font-semibold text-slate-300">
                <a href="index.php" class="px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-slate-800 transition-colors <?= $currentPage === 'index.php' ? 'text-teal-300 bg-slate-800/90 font-bold border border-slate-700' : '' ?>">
                    <span class="flex items-center gap-1.5"><i data-lucide="layout-dashboard" class="w-3.5 h-3.5 text-teal-400"></i> Command Center</span>
                </a>
                <a href="practice.php" class="px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-slate-800 transition-colors <?= $currentPage === 'practice.php' ? 'text-teal-300 bg-slate-800/90 font-bold border border-slate-700' : '' ?>">
                    <span class="flex items-center gap-1.5"><i data-lucide="file-check-2" class="w-3.5 h-3.5 text-teal-400"></i> Formative Assessments</span>
                </a>
                <a href="courses.php" class="px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-slate-800 transition-colors <?= $currentPage === 'courses.php' ? 'text-teal-300 bg-slate-800/90 font-bold border border-slate-700' : '' ?>">
                    <span class="flex items-center gap-1.5"><i data-lucide="graduation-cap" class="w-3.5 h-3.5 text-teal-400"></i> Curricula & Banks</span>
                </a>
                <a href="active_study.php" class="px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-slate-800 transition-colors <?= $currentPage === 'active_study.php' ? 'text-teal-300 bg-slate-800/90 font-bold border border-slate-700' : '' ?>">
                    <span class="flex items-center gap-1.5"><i data-lucide="book-marked" class="w-3.5 h-3.5 text-teal-400"></i> Clinical Notes</span>
                </a>
                <a href="question_search.php" class="px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-slate-800 transition-colors <?= $currentPage === 'question_search.php' ? 'text-teal-300 bg-slate-800/90 font-bold border border-slate-700' : '' ?>">
                    <span class="flex items-center gap-1.5"><i data-lucide="search" class="w-3.5 h-3.5 text-teal-400"></i> Item Search</span>
                </a>
                <a href="history.php" class="px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-slate-800 transition-colors <?= $currentPage === 'history.php' ? 'text-teal-300 bg-slate-800/90 font-bold border border-slate-700' : '' ?>">
                    <span class="flex items-center gap-1.5"><i data-lucide="history" class="w-3.5 h-3.5 text-teal-400"></i> Transcripts</span>
                </a>
                <a href="leaderboard.php" class="px-2.5 py-1.5 rounded-lg hover:text-white hover:bg-slate-800 transition-colors <?= $currentPage === 'leaderboard.php' ? 'text-teal-300 bg-slate-800/90 font-bold border border-slate-700' : '' ?>">
                    <span class="flex items-center gap-1.5"><i data-lucide="award" class="w-3.5 h-3.5 text-teal-400"></i> Cohort Ranks</span>
                </a>
                <?php if ($isAdmin): ?>
                <a href="admin_dashboard.php" class="px-2.5 py-1.5 rounded-lg text-rose-300 bg-rose-950/80 border border-rose-800 font-bold hover:bg-rose-900 transition-colors">
                    <span class="flex items-center gap-1.5"><i data-lucide="lock" class="w-3.5 h-3.5"></i> Admin Console</span>
                </a>
                <?php endif; ?>
            </nav>

            <!-- Verified Candidate Identity Badge -->
            <div class="flex items-center space-x-2.5">
                <?php if ($student): ?>
                <a href="profile.php" class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-teal-500/50 transition-all">
                    <div class="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 font-bold flex items-center justify-center text-xs border border-teal-500/30">
                        <?= strtoupper(substr($student['name'] ?? 'C', 0, 1)) ?>
                    </div>
                    <div class="hidden sm:flex flex-col text-left">
                        <span class="text-xs font-bold text-white leading-none truncate max-w-[130px]"><?= htmlspecialchars($student['name'] ?? 'Candidate') ?></span>
                        <span class="text-[10px] font-mono text-teal-400 leading-none mt-1"><?= htmlspecialchars($student['matric_no'] ?? '') ?></span>
                    </div>
                </a>
                <?php endif; ?>

                <a href="logout.php" title="Terminate Candidate Session" class="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors">
                    <i data-lucide="log-out" class="w-4 h-4"></i>
                </a>
            </div>
        </div>
    </div>
</header>
<?php endif; ?>

<main class="flex-grow">
