<?php
/**
 * Tests & Available Courses
 * Premed Test Portal
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

<div class="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8">

    <!-- ================= SECTION 1: ACTIVE TESTS ================= -->
    <div class="space-y-4">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-200">
            <div>
                <div class="flex items-center gap-2">
                    <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Active Tests & Exams</h1>
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold <?= count($liveTests) > 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600' ?>">
                        <span class="w-2 h-2 rounded-full <?= count($liveTests) > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400' ?>"></span>
                        <span><?= count($liveTests) ?> Active</span>
                    </span>
                </div>
                <p class="text-xs text-slate-500 mt-0.5">These are timed tests set up for your class or mock practice.</p>
            </div>

            <a href="practice.php" class="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors flex items-center gap-1.5">
                <i data-lucide="check-circle-2" class="w-4 h-4 text-indigo-600"></i>
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
            <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            <?= htmlspecialchars($t['course_code']) ?>
                        </span>
                        <span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Ready to Write
                        </span>
                    </div>

                    <h3 class="text-sm font-extrabold text-slate-900 leading-snug"><?= htmlspecialchars($t['title']) ?></h3>
                    <p class="text-xs text-slate-500 mt-0.5 truncate"><?= htmlspecialchars($t['course_title']) ?></p>

                    <div class="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs text-slate-600">
                        <div class="flex items-center justify-between">
                            <span class="text-slate-400">Time Limit:</span>
                            <span class="font-bold text-slate-800"><?= (int)$t['duration'] ?> Minutes</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-slate-400">Questions:</span>
                            <span class="font-bold text-slate-800"><?= (int)$t['question_limit'] ?> Questions</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-slate-400">Coverage:</span>
                            <span class="font-bold text-slate-800"><?= htmlspecialchars($topicScope) ?></span>
                        </div>
                    </div>
                </div>

                <a href="exam.php?test_id=<?= urlencode($t['id']) ?>" class="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2">
                    <span>Start Test</span>
                    <i data-lucide="arrow-right" class="w-4 h-4"></i>
                </a>
            </div>
            <?php endforeach; ?>
        </div>
        <?php else: ?>
        <div class="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-xs max-w-md mx-auto space-y-3">
            <div class="w-10 h-10 mx-auto rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <i data-lucide="calendar" class="w-5 h-5"></i>
            </div>
            <div>
                <h3 class="text-sm font-bold text-slate-800">No Tests Scheduled Right Now</h3>
                <p class="text-xs text-slate-500 mt-0.5">When your teacher creates or schedules an exam, it will appear here. In the meantime, you can practice questions below!</p>
            </div>
            <a href="practice.php" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-xs hover:bg-indigo-700 transition-colors">
                <span>Practice Past Questions</span>
                <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </a>
        </div>
        <?php endif; ?>
    </div>

    <!-- ================= SECTION 2: ALL COURSES & SUBJECTS ================= -->
    <div class="space-y-4 pt-4">
        <div class="pb-3 border-b border-slate-200">
            <h2 class="text-base sm:text-lg font-black text-slate-900 tracking-tight">All Subjects & Courses</h2>
            <p class="text-xs text-slate-500 mt-0.5">Browse through your accredited courses and practice past questions for each.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <?php foreach ($courses as $c): ?>
            <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-3">
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-black uppercase text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            <?= htmlspecialchars($c['code']) ?>
                        </span>
                        <span class="text-[11px] font-bold text-slate-400">
                            <?= (int)$c['topics_count'] ?> Topics
                        </span>
                    </div>

                    <h3 class="text-sm font-bold text-slate-900 leading-snug"><?= htmlspecialchars($c['title']) ?></h3>
                </div>

                <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span class="text-[11px] font-semibold text-slate-500">
                        <?= (int)$c['questions_count'] ?> Questions
                    </span>
                    <a href="practice.php?course_id=<?= urlencode($c['id']) ?>" class="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:text-indigo-600 font-bold text-xs text-slate-700 transition-colors flex items-center gap-1">
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
