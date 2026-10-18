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

$pageTitle = 'Tests & Practice Hub';
require_once __DIR__ . '/includes/header.php';

$db = DB::connect();

// 1. Fetch Active Tests set by Admin (Test Question Bank)
$liveTestsStmt = $db->query("
    SELECT t.*, c.code AS course_code, c.title AS course_title
    FROM tests t
    JOIN courses c ON t.course_id = c.id
    WHERE t.is_live = 1
    ORDER BY t.created_at DESC
");
$liveTests = $liveTestsStmt ? $liveTestsStmt->fetchAll() : [];

// 2. Fetch All Courses with Single Source of Truth live counts
$courses = getCourseListWithCounts($db);

// Synthesize active assessments if no explicit tests are live
$activeAssessments = $liveTests;
if (empty($activeAssessments)) {
    foreach ($courses as $c) {
        if (empty($c['is_locked']) && (int)$c['test_q_count'] > 0) {
            $activeAssessments[] = [
                'id' => null,
                'course_id' => $c['id'],
                'course_code' => $c['code'],
                'course_title' => $c['title'],
                'title' => $c['title'] . ' Official Assessment',
                'duration' => 30,
                'question_limit' => min(30, (int)$c['test_q_count']),
                'topic_ids' => '[]',
                'is_course_sitting' => true
            ];
        }
    }
}
?>

<div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">

    <!-- Hero Hub Header -->
    <div class="bg-gradient-to-r from-slate-950 via-teal-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-teal-500/30 shadow-xl relative overflow-hidden">
        <div class="absolute -right-16 -top-16 w-56 h-56 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="relative z-10 space-y-2 max-w-2xl">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30 font-mono uppercase tracking-wider">
                <i data-lucide="shield-check" class="w-3.5 h-3.5 text-teal-400"></i>
                <span>Student Examination Hub</span>
            </span>
            <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight">Proctored Tests &amp; Past Questions Practice</h1>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Sit for proctored tests set by administrators from the Test Question Bank, or launch customizable self-paced practice sessions using the Past Question Bank.
            </p>
        </div>
    </div>

    <!-- ================= SIDE-BY-SIDE DUAL CARDS SECTION ================= -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

        <!-- CARD 1: ADMIN SET TESTS (Test Question Bank) -->
        <div class="bg-white rounded-3xl p-6 border-2 border-indigo-100 shadow-sm hover:border-indigo-300 transition-all flex flex-col justify-between space-y-5">
            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <span class="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
                        <i data-lucide="clock" class="w-3.5 h-3.5 text-indigo-600"></i>
                        <span>Admin Scheduled Tests</span>
                    </span>
                    <span class="text-xs font-mono font-bold text-slate-400">
                        <?= count($activeAssessments) ?> Live
                    </span>
                </div>

                <div>
                    <h2 class="text-lg font-black text-slate-900 tracking-tight">Official CBT Examinations</h2>
                    <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                        Assessments configured by faculty administrators. Questions are drawn directly from the <strong>Test Question Bank</strong> with proctored tab-switch monitoring and strict countdown timing.
                    </p>
                </div>

                <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs text-slate-600">
                    <div class="flex items-center justify-between">
                        <span class="text-slate-400">Question Source:</span>
                        <span class="font-bold text-indigo-700 font-mono">Test Question Bank</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-slate-400">Proctoring Rules:</span>
                        <span class="font-bold text-slate-800">Fullscreen &amp; Tab-Switch Logs</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-slate-400">Corrections:</span>
                        <span class="font-bold text-slate-800">Shown After Final Submission</span>
                    </div>
                </div>
            </div>

            <div>
                <?php if (!empty($activeAssessments)): ?>
                <a href="#activeTestsList" class="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95">
                    <span>View Scheduled Tests (<?= count($activeAssessments) ?>)</span>
                    <i data-lucide="arrow-down" class="w-4 h-4"></i>
                </a>
                <?php else: ?>
                <button type="button" disabled class="w-full py-3 px-4 rounded-2xl bg-slate-100 text-slate-400 font-black text-xs uppercase tracking-wider cursor-not-allowed">
                    No Admin Test Live Right Now
                </button>
                <?php endif; ?>
            </div>
        </div>

        <!-- CARD 2: PAST QUESTIONS PRACTICE (Past Question Bank) -->
        <div class="bg-white rounded-3xl p-6 border-2 border-teal-100 shadow-sm hover:border-teal-300 transition-all flex flex-col justify-between space-y-5">
            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <span class="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1.5">
                        <i data-lucide="book-open-check" class="w-3.5 h-3.5 text-teal-600"></i>
                        <span>Past Question Practice</span>
                    </span>
                    <span class="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-100">
                        Self-Controlled
                    </span>
                </div>

                <div>
                    <h2 class="text-lg font-black text-slate-900 tracking-tight">Flexible Self-Paced Practice</h2>
                    <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                        Control your own study session. Select courses, specific topics, item counts, and switch between <strong>Study Mode</strong> (instant KaTeX answers) or <strong>Mock Mode</strong> (self-paced timing).
                    </p>
                </div>

                <div class="p-3.5 rounded-2xl bg-teal-50/50 border border-teal-100 space-y-2 text-xs text-slate-600">
                    <div class="flex items-center justify-between">
                        <span class="text-slate-400">Question Source:</span>
                        <span class="font-bold text-teal-700 font-mono">Past Questions Bank</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-slate-400">Mode Options:</span>
                        <span class="font-bold text-slate-800">Study Mode vs. Mock Mode</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-slate-400">Customization:</span>
                        <span class="font-bold text-slate-800">Set Course, Topics &amp; Item Limit</span>
                    </div>
                </div>
            </div>

            <div>
                <a href="practice.php" class="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 active:scale-95">
                    <span>Configure Practice Session</span>
                    <i data-lucide="arrow-right" class="w-4 h-4"></i>
                </a>
            </div>
        </div>

    </div>

    <!-- ================= SECTION 1: ACTIVE ADMIN SCHEDULED TESTS ================= -->
    <div class="space-y-4 pt-2" id="activeTestsList">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3.5 border-b border-teal-100">
            <div>
                <div class="flex items-center gap-2.5">
                    <h2 class="text-xl font-black text-slate-900 tracking-tight">Admin-Scheduled Tests</h2>
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold <?= count($activeAssessments) > 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs' : 'bg-slate-100 text-slate-600' ?>">
                        <span class="w-2 h-2 rounded-full <?= count($activeAssessments) > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400' ?>"></span>
                        <span><?= count($activeAssessments) ?> Active</span>
                    </span>
                </div>
                <p class="text-xs text-slate-500 mt-0.5">Click "Enter Exam" to begin your proctored sitting.</p>
            </div>
        </div>

        <?php if (!empty($activeAssessments)): ?>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <?php foreach ($activeAssessments as $t): 
                $topicScope = 'All Topics';
                $rawTopics = json_decode($t['topic_ids'] ?? '[]', true);
                if (is_array($rawTopics) && !in_array('ALL', $rawTopics) && count($rawTopics) > 0) {
                    $topicScope = count($rawTopics) . ' Specific Topics';
                }
                $examUrl = !empty($t['id']) ? 'exam.php?test_id=' . urlencode($t['id']) : 'exam.php?course_id=' . urlencode($t['course_id']);
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

                <a href="<?= $examUrl ?>" class="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95">
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
            <p class="text-xs text-slate-500 mt-0.5">Explore each subject syllabus, topic outlines, and live question bank tallies.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <?php foreach ($courses as $c): 
                $canEnter = empty($c['is_locked']) && (int)$c['questions_count'] > 0;
            ?>
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

                <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div class="flex flex-col text-[11px] font-mono">
                        <span class="text-teal-700 font-bold">📚 <?= (int)$c['past_q_count'] ?> Past Qs</span>
                        <span class="text-indigo-700 font-bold">⏱️ <?= (int)$c['test_q_count'] ?> Test Qs</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <a href="practice.php?course_id=<?= urlencode($c['id']) ?>" class="px-3 py-1.5 rounded-xl border border-teal-200 hover:bg-teal-50 hover:text-teal-700 font-bold text-xs text-slate-700 transition-colors flex items-center gap-1">
                            <span>Practice</span>
                            <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                        </a>
                        <?php if ($canEnter): ?>
                        <a href="exam.php?course_id=<?= urlencode($c['id']) ?>" class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1">
                            <span>Exam</span>
                            <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                        </a>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>

</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
