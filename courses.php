<?php
/**
 * Tests & Available Courses - Clinical Medical Edition
 * Apex Pre-Medical Sciences Examination Portal
 */

require_once __DIR__ . '/config/db.php';

if (empty($_SESSION['student'])) {
    header('Location: login.php');
    exit;
}

$pageTitle = 'Tests';
require_once __DIR__ . '/includes/header.php';

$db = DB::connect();

// 1. Fetch Active Tests
$liveTestsStmt = $db->query("
    SELECT t.*, c.code AS course_code, c.title AS course_title
    FROM tests t
    JOIN courses c ON t.course_id = c.id
    WHERE t.is_live = 1
    ORDER BY t.created_at DESC
");
$liveTests = $liveTestsStmt ? $liveTestsStmt->fetchAll() : [];

// 2. Fetch All Courses
$stmt = $db->query("
    SELECT 
        c.*,
        COUNT(DISTINCT t.id) AS topics_count,
        COUNT(q.id) AS questions_count
    FROM courses c
    LEFT JOIN topics t ON c.id = t.course_id
    LEFT JOIN questions q ON t.id = q.topic_id
    GROUP BY c.id
    ORDER BY c.code ASC
");
$courses = $stmt->fetchAll();
?>

<div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">

    <!-- ================= SECTION 1: ACTIVE TESTS ================= -->
    <div class="space-y-4">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3.5 border-b border-teal-100">
            <div>
                <div class="flex items-center gap-2.5">
                    <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Active Tests &amp; Exams</h1>
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold <?= count($liveTests) > 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs' : 'bg-slate-100 text-slate-600' ?>">
                        <span class="w-2 h-2 rounded-full <?= count($liveTests) > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400' ?>"></span>
                        <span><?= count($liveTests) ?> Active</span>
                    </span>
                </div>
                <p class="text-xs text-slate-500 mt-1">Official timed evaluations and practice simulations scheduled for candidates.</p>
            </div>

            <a href="practice.php" class="px-4 py-2 rounded-2xl bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs transition-colors flex items-center gap-1.5 border border-teal-200/60 shadow-xs">
                <i data-lucide="layers" class="w-4 h-4 text-teal-600"></i>
                <span>Past Question Practice</span>
            </a>
        </div>

        <?php if (!empty($liveTests)): ?>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <?php foreach ($liveTests as $t): 
                $topicScope = 'All Topics';
                $rawTopics = json_decode($t['topic_ids'] ?? '[]', true);
                if (is_array($rawTopics) && !in_array('ALL', $rawTopics)) {
                    $topicScope = count($rawTopics) . ' Specific Topics';
                }
            ?>
            <div class="bg-white rounded-3xl p-5 sm:p-6 border border-teal-100 shadow-xs hover:shadow-md hover:border-teal-300 transition-all flex flex-col justify-between space-y-4">
                <div>
                    <div class="flex items-center justify-between mb-2.5">
                        <span class="text-xs font-black uppercase text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 font-mono">
                            <?= htmlspecialchars($t['course_code']) ?>
                        </span>
                        <span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                            <span>Ready to Write</span>
                        </span>
                    </div>

                    <h3 class="text-sm sm:text-base font-black text-slate-900 leading-snug"><?= htmlspecialchars($t['title']) ?></h3>
                    <p class="text-xs text-slate-500 mt-0.5 truncate"><?= htmlspecialchars($t['course_title']) ?></p>

                    <div class="mt-3.5 p-3 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-1.5 text-xs text-slate-600">
                        <div class="flex items-center justify-between">
                            <span class="text-slate-400">Time Limit:</span>
                            <span class="font-bold text-slate-800 font-mono"><?= (int)$t['duration'] ?> Minutes</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-slate-400">Items:</span>
                            <span class="font-bold text-slate-800 font-mono"><?= (int)$t['question_limit'] ?> Questions</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-slate-400">Coverage:</span>
                            <span class="font-bold text-slate-800"><?= htmlspecialchars($topicScope) ?></span>
                        </div>
                    </div>
                </div>

                <a href="exam.php?test_id=<?= urlencode($t['id']) ?>" class="w-full py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95">
                    <span>Enter Exam</span>
                    <i data-lucide="arrow-right" class="w-4 h-4"></i>
                </a>
            </div>
            <?php endforeach; ?>
        </div>
        <?php else: ?>
        <div class="bg-white rounded-3xl p-8 sm:p-10 text-center border border-teal-100 shadow-xs max-w-md mx-auto space-y-3.5">
            <div class="w-12 h-12 mx-auto rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <i data-lucide="calendar-check" class="w-6 h-6"></i>
            </div>
            <div>
                <h3 class="text-sm font-black text-slate-900">No Active Tests Scheduled Right Now</h3>
                <p class="text-xs text-slate-500 mt-1 leading-relaxed">When examinations are activated by the administrator, they will appear here. In the meantime, you can practice unlimited questions below!</p>
            </div>
            <a href="practice.php" class="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-teal-600 text-white font-bold text-xs shadow-xs hover:bg-teal-700 transition-colors">
                <span>Practice Past Questions</span>
                <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </a>
        </div>
        <?php endif; ?>
    </div>

    <!-- ================= SECTION 2: ALL COURSES & SUBJECTS ================= -->
    <div class="space-y-4 pt-2">
        <div class="pb-3.5 border-b border-teal-100">
            <h2 class="text-base sm:text-lg font-black text-slate-900 tracking-tight">Accredited Pre-Medical Courses</h2>
            <p class="text-xs text-slate-500 mt-0.5">Explore each subject syllabus, topic outlines, and comprehensive question banks.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <?php foreach ($courses as $c): ?>
            <div class="bg-white rounded-3xl p-5 border border-teal-100 shadow-xs hover:border-teal-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3">
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-black uppercase text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200 font-mono">
                            <?= htmlspecialchars($c['code']) ?>
                        </span>
                        <span class="text-[11px] font-bold text-slate-400">
                            <?= (int)$c['topics_count'] ?> Topics
                        </span>
                    </div>

                    <h3 class="text-sm font-black text-slate-900 leading-snug"><?= htmlspecialchars($c['title']) ?></h3>
                </div>

                <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span class="text-xs font-bold text-teal-700 font-mono">
                        <?= (int)$c['questions_count'] ?> Questions
                    </span>
                    <a href="practice.php?course_id=<?= urlencode($c['id']) ?>" class="px-3.5 py-1.5 rounded-xl border border-teal-200 hover:bg-teal-50 hover:text-teal-700 font-bold text-xs text-slate-700 transition-colors flex items-center gap-1">
                        <span>Practice</span>
                        <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                    </a>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>

</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
