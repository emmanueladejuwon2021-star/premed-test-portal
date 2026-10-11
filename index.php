<?php
/**
 * Candidate Examination Command Center - Enterprise Production Edition
 * Apex Pre-Medical Sciences Examination Council (PMSEC)
 */

require_once __DIR__ . '/config/db.php';

if (empty($_SESSION['student'])) {
    header('Location: login.php');
    exit;
}

$pageTitle = 'Examination Command Center';
require_once __DIR__ . '/includes/header.php';

$db = DB::connect();
$studentId = $student['id'] ?? '';

// Fetch candidate longitudinal performance analytics
$statsStmt = $db->prepare("
    SELECT 
        COUNT(id) as total_tests,
        COALESCE(AVG(percentage), 0) as avg_score,
        COALESCE(MAX(percentage), 0) as max_score
    FROM results 
    WHERE student_id = ?
");
$statsStmt->execute([$studentId]);
$stats = $statsStmt->fetch();

// Fetch scheduled official proctored examinations
$examStmt = $db->query("
    SELECT t.*, c.code AS course_code, c.title AS course_title 
    FROM tests t
    JOIN courses c ON t.course_id = c.id
    WHERE t.is_live = 1 
    ORDER BY t.created_at DESC 
    LIMIT 1
");
$newestExam = $examStmt ? $examStmt->fetch() : null;

// Fetch recent 3 official assessment transcripts
$recentStmt = $db->prepare("
    SELECT r.*, c.code AS course_code, c.title AS course_title 
    FROM results r
    LEFT JOIN courses c ON r.course_id = c.id
    WHERE r.student_id = ?
    ORDER BY r.created_at DESC 
    LIMIT 3
");
$recentStmt->execute([$studentId]);
$recentTests = $recentStmt->fetchAll();
?>

<div class="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">

    <!-- 1. Candidate Identity & Psychometric Command Ribbon -->
    <div class="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div class="absolute right-0 top-0 w-96 h-96 bg-gradient-to-bl from-teal-500/10 via-transparent to-transparent pointer-events-none"></div>
        <div>
            <div class="flex items-center gap-2 mb-1.5">
                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Candidate Verified &bull; Active Session
                </span>
                <span class="text-xs text-slate-400 font-mono"><?= htmlspecialchars($student['matric_no'] ?? '') ?></span>
            </div>
            <h1 class="text-xl sm:text-2xl font-black tracking-tight text-white">
                <?= htmlspecialchars($student['name'] ?? 'Candidate') ?>
            </h1>
            <p class="text-xs text-slate-400 mt-0.5">Faculty of Basic Medical Sciences &bull; Department of <?= htmlspecialchars($student['department'] ?? 'Clinical Medicine') ?></p>
        </div>

        <!-- Psychometric Proficiency Metrics Bar -->
        <div class="flex items-center gap-2 w-full md:w-auto">
            <div class="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-center min-w-[90px]">
                <span class="block text-lg font-black text-white"><?= (int)$stats['total_tests'] ?></span>
                <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Completed</span>
            </div>
            <div class="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-center min-w-[90px]">
                <span class="block text-lg font-black text-teal-300 font-mono"><?= round((float)$stats['avg_score'], 1) ?>%</span>
                <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mean Proficiency</span>
            </div>
            <div class="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-center min-w-[90px]">
                <span class="block text-lg font-black text-emerald-400 font-mono"><?= round((float)$stats['max_score'], 1) ?>%</span>
                <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Peak Score</span>
            </div>
        </div>
    </div>

    <!-- 2. High-Stakes Proctored Examination Dispatcher Banner (Conditional) -->
    <?php if ($newestExam): ?>
    <div class="bg-white rounded-2xl p-4 sm:p-5 border-2 border-rose-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
        <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-200">
                <i data-lucide="shield-alert" class="w-6 h-6"></i>
            </div>
            <div>
                <div class="flex items-center gap-2 mb-0.5">
                    <span class="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-mono">Official Proctored Board Exam</span>
                    <span class="text-xs font-black font-mono text-slate-700"><?= htmlspecialchars($newestExam['course_code']) ?></span>
                </div>
                <h3 class="text-base font-extrabold text-slate-900"><?= htmlspecialchars($newestExam['title']) ?></h3>
                <p class="text-xs text-slate-500 mt-0.5">Time Limit: <?= (int)$newestExam['duration'] ?> mins &bull; <?= (int)$newestExam['question_limit'] ?> Standardized Items &bull; Strict Proctor Lockdown</p>
            </div>
        </div>

        <a href="exam.php?test_id=<?= urlencode($newestExam['id']) ?>" class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-200 transition-all flex items-center justify-center gap-2 shrink-0">
            <span>Authorize & Enter Examination Room</span>
            <i data-lucide="arrow-right" class="w-4 h-4"></i>
        </a>
    </div>
    <?php endif; ?>

    <!-- 3. Enterprise Assessment & Disciplinary Modules (6-Tile Matrix) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <!-- 1: Formative Assessment Studio -->
        <a href="practice.php" class="group bg-white hover:bg-teal-50/30 border border-slate-200 hover:border-teal-400 p-4 rounded-2xl transition-all shadow-xs flex items-start gap-3.5">
            <div class="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-teal-100">
                <i data-lucide="file-check-2" class="w-5 h-5"></i>
            </div>
            <div class="min-w-0">
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors">Formative Assessment</h3>
                    <span class="text-[9px] font-mono font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">5,630 Items</span>
                </div>
                <p class="text-xs text-slate-500 leading-snug mt-1">Configure diagnostic mocks across specific preclinical topics with strict board pacing.</p>
            </div>
        </a>

        <!-- 2: Curriculum Syllabi & Banks -->
        <a href="courses.php" class="group bg-white hover:bg-indigo-50/30 border border-slate-200 hover:border-indigo-400 p-4 rounded-2xl transition-all shadow-xs flex items-start gap-3.5">
            <div class="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-indigo-100">
                <i data-lucide="graduation-cap" class="w-5 h-5"></i>
            </div>
            <div class="min-w-0">
                <h3 class="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">Curricula & Item Banks</h3>
                <p class="text-xs text-slate-500 leading-snug mt-1">Browse accredited curricula, official summative examinations, and departmental repositories.</p>
            </div>
        </a>

        <!-- 3: High-Yield Clinical Compendiums -->
        <a href="active_study.php" class="group bg-white hover:bg-violet-50/30 border border-slate-200 hover:border-violet-400 p-4 rounded-2xl transition-all shadow-xs flex items-start gap-3.5">
            <div class="w-11 h-11 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-violet-100">
                <i data-lucide="book-marked" class="w-5 h-5"></i>
            </div>
            <div class="min-w-0">
                <h3 class="text-sm font-bold text-slate-900 group-hover:text-violet-700 transition-colors">Clinical Compendiums</h3>
                <p class="text-xs text-slate-500 leading-snug mt-1">High-yield revision compendiums, biochemical metabolic pathways, and physiological equations.</p>
            </div>
        </a>

        <!-- 4: Examination Transcripts -->
        <a href="history.php" class="group bg-white hover:bg-sky-50/30 border border-slate-200 hover:border-sky-400 p-4 rounded-2xl transition-all shadow-xs flex items-start gap-3.5">
            <div class="w-11 h-11 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-sky-100">
                <i data-lucide="history" class="w-5 h-5"></i>
            </div>
            <div class="min-w-0">
                <h3 class="text-sm font-bold text-slate-900 group-hover:text-sky-700 transition-colors">Official Transcripts</h3>
                <p class="text-xs text-slate-500 leading-snug mt-1">Inspect past assessment records, psychometric item rationales, and longitudinal progress.</p>
            </div>
        </a>

        <!-- 5: Cohort Percentile Rankings -->
        <a href="leaderboard.php" class="group bg-white hover:bg-amber-50/30 border border-slate-200 hover:border-amber-400 p-4 rounded-2xl transition-all shadow-xs flex items-start gap-3.5">
            <div class="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-amber-100">
                <i data-lucide="award" class="w-5 h-5"></i>
            </div>
            <div class="min-w-0">
                <h3 class="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors">Cohort Rankings</h3>
                <p class="text-xs text-slate-500 leading-snug mt-1">Psychometric percentile comparisons across Pre-Medicine, Dentistry, and Nursing cohorts.</p>
            </div>
        </a>

        <!-- 6: Item Bank Search -->
        <a href="question_search.php" class="group bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-400 p-4 rounded-2xl transition-all shadow-xs flex items-start gap-3.5">
            <div class="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-slate-200">
                <i data-lucide="search" class="w-5 h-5"></i>
            </div>
            <div class="min-w-0">
                <h3 class="text-sm font-bold text-slate-900 group-hover:text-slate-800 transition-colors">Item Bank Search</h3>
                <p class="text-xs text-slate-500 leading-snug mt-1">Instant full-text query indexing across 5,630+ accredited medical sciences examination items.</p>
            </div>
        </a>
    </div>

    <!-- 4. Recent Assessment Transcripts Table -->
    <?php if (!empty($recentTests)): ?>
    <div class="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div class="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
            <div class="flex items-center gap-2">
                <i data-lucide="file-text" class="w-4 h-4 text-slate-400"></i>
                <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Recent Examination Administrations</h3>
            </div>
            <a href="history.php" class="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1">
                <span>View Full Academic Transcript</span>
                <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
            </a>
        </div>

        <div class="divide-y divide-slate-100">
            <?php foreach ($recentTests as $rt): ?>
            <div class="py-3 flex items-center justify-between gap-3 text-xs">
                <div class="flex items-center gap-3 min-w-0">
                    <span class="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                        <?= htmlspecialchars($rt['course_code'] ?? 'MED') ?>
                    </span>
                    <span class="font-semibold text-slate-800 truncate"><?= htmlspecialchars($rt['course_title'] ?? 'Assessment Examination') ?></span>
                    <span class="hidden sm:inline text-[11px] text-slate-400">&bull; <?= date('M d, Y - H:i', strtotime($rt['created_at'])) ?></span>
                </div>
                <div class="flex items-center gap-3 shrink-0">
                    <span class="font-bold text-slate-700 font-mono"><?= (int)$rt['total_score'] ?>/<?= (int)$rt['total_questions'] ?></span>
                    <span class="px-2.5 py-0.5 rounded text-[11px] font-bold font-mono <?= (float)$rt['percentage'] >= 70 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : ((float)$rt['percentage'] >= 50 ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-rose-50 text-rose-700 border border-rose-200') ?>">
                        <?= round((float)$rt['percentage'], 1) ?>% (Grade <?= htmlspecialchars($rt['grade']) ?>)
                    </span>
                    <a href="results.php?id=<?= urlencode($rt['id']) ?>" class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-teal-600 transition-colors" title="Inspect Performance Report">
                        <i data-lucide="arrow-up-right" class="w-4 h-4"></i>
                    </a>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>

</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
