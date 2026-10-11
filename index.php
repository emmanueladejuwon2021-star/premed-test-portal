<?php
/**
 * Student Home Dashboard
 * Premed Test Portal
 */

require_once __DIR__ . '/config/db.php';

if (empty($_SESSION['student'])) {
    header('Location: login.php');
    exit;
}

$pageTitle = 'Home';
require_once __DIR__ . '/includes/header.php';

$db = DB::connect();
$studentId = $student['id'] ?? '';

// Student test stats
$statsStmt = $db->prepare("
    SELECT 
        COUNT(id) as total_tests,
        COALESCE(AVG(percentage), 0) as avg_score,
        COALESCE(MAX(percentage), 0) as max_score
    FROM results 
    WHERE student_id = ?
");
$statsStmt->execute([$studentId]);
$stats = $statsStmt->fetch() ?: ['total_tests' => 0, 'avg_score' => 0, 'max_score' => 0];

// Check if any test is currently live
$examStmt = $db->query("
    SELECT t.*, c.code AS course_code, c.title AS course_title 
    FROM tests t
    JOIN courses c ON t.course_id = c.id
    WHERE t.is_live = 1 
    ORDER BY t.created_at DESC 
    LIMIT 1
");
$liveTest = $examStmt ? $examStmt->fetch() : null;

// Recent 5 test results
$recentStmt = $db->prepare("
    SELECT r.*, c.code AS course_code, c.title AS course_title 
    FROM results r
    LEFT JOIN courses c ON r.course_id = c.id
    WHERE r.student_id = ?
    ORDER BY r.created_at DESC 
    LIMIT 5
");
$recentStmt->execute([$studentId]);
$recentTests = $recentStmt->fetchAll();

$firstName = htmlspecialchars(explode(' ', $student['name'] ?? 'Student')[0]);
?>

<div class="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

    <!-- 1. Friendly Welcome Banner & Simple Stats -->
    <div class="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div class="space-y-1.5 max-w-lg">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-indigo-100 text-xs font-semibold backdrop-blur-xs">
                <span>Matric No: <?= htmlspecialchars($student['matric_no'] ?? '') ?></span>
                <span>&bull;</span>
                <span><?= htmlspecialchars($student['department'] ?? 'Pre-Med') ?></span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome back, <?= $firstName ?>! 👋
            </h1>
            <p class="text-indigo-100 text-xs sm:text-sm leading-relaxed">
                Ready to study today? Take an active test, practice past questions, or use the study room to review your notes.
            </p>
        </div>

        <!-- 3 Simple Stat Cards -->
        <div class="grid grid-cols-3 gap-2 sm:gap-3 w-full md:w-auto">
            <div class="px-4 py-3 rounded-2xl bg-white/10 border border-white/15 text-center">
                <span class="block text-xl sm:text-2xl font-black text-white"><?= (int)$stats['total_tests'] ?></span>
                <span class="text-[11px] text-indigo-200 font-semibold">Tests Taken</span>
            </div>
            <div class="px-4 py-3 rounded-2xl bg-white/10 border border-white/15 text-center">
                <span class="block text-xl sm:text-2xl font-black text-white"><?= round((float)$stats['avg_score']) ?>%</span>
                <span class="text-[11px] text-indigo-200 font-semibold">Average</span>
            </div>
            <div class="px-4 py-3 rounded-2xl bg-white/10 border border-white/15 text-center">
                <span class="block text-xl sm:text-2xl font-black text-emerald-300"><?= round((float)$stats['max_score']) ?>%</span>
                <span class="text-[11px] text-indigo-200 font-semibold">Highest</span>
            </div>
        </div>
    </div>

    <!-- 2. Active Test Alert (If Live Test Exists) -->
    <?php if ($liveTest): ?>
    <div class="bg-amber-50 border-2 border-amber-300/80 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div class="flex items-start sm:items-center gap-3.5">
            <div class="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <i data-lucide="bell-ring" class="w-5 h-5"></i>
            </div>
            <div>
                <div class="flex items-center gap-2 mb-0.5">
                    <span class="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">Active Test Available</span>
                    <span class="text-xs font-bold text-slate-700"><?= htmlspecialchars($liveTest['course_code']) ?></span>
                </div>
                <h3 class="text-base font-extrabold text-slate-900"><?= htmlspecialchars($liveTest['title']) ?></h3>
                <p class="text-xs text-slate-600 mt-0.5">
                    <?= (int)$liveTest['duration'] ?> minutes &bull; <?= (int)$liveTest['question_limit'] ?> questions
                </p>
            </div>
        </div>

        <a href="exam.php?test_id=<?= urlencode($liveTest['id']) ?>" class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 shrink-0">
            <span>Start Test Now</span>
            <i data-lucide="arrow-right" class="w-4 h-4"></i>
        </a>
    </div>
    <?php endif; ?>

    <!-- 3. Quick Action Cards (6 Clear Features) -->
    <div class="space-y-3">
        <h2 class="text-sm font-bold text-slate-700 uppercase tracking-wider">Quick Actions</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">

            <!-- Card 1: Past Question Practice -->
            <a href="practice.php" class="group bg-white hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-400 p-4 sm:p-5 rounded-2xl transition-all shadow-xs flex items-start gap-3.5">
                <div class="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <i data-lucide="check-circle-2" class="w-5 h-5"></i>
                </div>
                <div>
                    <h3 class="text-sm font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors">Past Question Practice</h3>
                    <p class="text-xs text-slate-500 mt-0.5 leading-relaxed">Practice real exam questions topic by topic at your own speed.</p>
                </div>
            </a>

            <!-- Card 2: Tests -->
            <a href="courses.php" class="group bg-white hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-400 p-4 sm:p-5 rounded-2xl transition-all shadow-xs flex items-start gap-3.5">
                <div class="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <i data-lucide="file-text" class="w-5 h-5"></i>
                </div>
                <div>
                    <h3 class="text-sm font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors">Tests & Exams</h3>
                    <p class="text-xs text-slate-500 mt-0.5 leading-relaxed">Check available mock exams, scheduled tests, and all courses.</p>
                </div>
            </a>

            <!-- Card 3: Study Room -->
            <a href="active_study.php" class="group bg-white hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-400 p-4 sm:p-5 rounded-2xl transition-all shadow-xs flex items-start gap-3.5">
                <div class="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <i data-lucide="sparkles" class="w-5 h-5"></i>
                </div>
                <div>
                    <h3 class="text-sm font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors">Study Room</h3>
                    <p class="text-xs text-slate-500 mt-0.5 leading-relaxed">Paste your lecture notes, ask AI questions, and get quick quizzes.</p>
                </div>
            </a>

            <!-- Card 4: Academic Resources -->
            <a href="question_search.php" class="group bg-white hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-400 p-4 sm:p-5 rounded-2xl transition-all shadow-xs flex items-start gap-3.5">
                <div class="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <i data-lucide="book-open" class="w-5 h-5"></i>
                </div>
                <div>
                    <h3 class="text-sm font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors">Academic Resources</h3>
                    <p class="text-xs text-slate-500 mt-0.5 leading-relaxed">Search through questions, definitions, formulas, and explanations.</p>
                </div>
            </a>

            <!-- Card 5: Results -->
            <a href="history.php" class="group bg-white hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-400 p-4 sm:p-5 rounded-2xl transition-all shadow-xs flex items-start gap-3.5">
                <div class="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <i data-lucide="bar-chart-3" class="w-5 h-5"></i>
                </div>
                <div>
                    <h3 class="text-sm font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors">My Results</h3>
                    <p class="text-xs text-slate-500 mt-0.5 leading-relaxed">See all your previous test scores, grades, and answers.</p>
                </div>
            </a>

            <!-- Card 6: My Profile -->
            <a href="profile.php" class="group bg-white hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-400 p-4 sm:p-5 rounded-2xl transition-all shadow-xs flex items-start gap-3.5">
                <div class="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <i data-lucide="user" class="w-5 h-5"></i>
                </div>
                <div>
                    <h3 class="text-sm font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors">My Profile</h3>
                    <p class="text-xs text-slate-500 mt-0.5 leading-relaxed">View your account information, department, and phone number.</p>
                </div>
            </a>

        </div>
    </div>

    <!-- 4. Recent Test Results Section -->
    <div class="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
                <h2 class="text-sm sm:text-base font-extrabold text-slate-900">Recent Test Results</h2>
                <p class="text-xs text-slate-500 mt-0.5">Your latest completed test submissions</p>
            </div>
            <a href="history.php" class="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline">
                View All Results &rarr;
            </a>
        </div>

        <?php if (empty($recentTests)): ?>
        <div class="py-8 text-center text-slate-400 space-y-2">
            <i data-lucide="clipboard" class="w-8 h-8 mx-auto text-slate-300"></i>
            <p class="text-xs font-medium">You haven't written any tests yet.</p>
            <a href="practice.php" class="inline-block px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors">
                Start Practicing Questions
            </a>
        </div>
        <?php else: ?>
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead>
                    <tr class="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        <th class="py-2.5 pr-4">Course</th>
                        <th class="py-2.5 px-4">Date</th>
                        <th class="py-2.5 px-4 text-center">Score</th>
                        <th class="py-2.5 px-4 text-center">Percentage</th>
                        <th class="py-2.5 px-4 text-center">Grade</th>
                        <th class="py-2.5 pl-4 text-right">Action</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <?php foreach ($recentTests as $r): ?>
                    <tr class="hover:bg-slate-50/70 transition-colors">
                        <td class="py-3 pr-4 font-bold text-slate-800">
                            <span class="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] mr-1.5"><?= htmlspecialchars($r['course_code']) ?></span>
                            <span><?= htmlspecialchars($r['course_title']) ?></span>
                        </td>
                        <td class="py-3 px-4 text-slate-500">
                            <?= date('M d, Y', strtotime($r['created_at'])) ?>
                        </td>
                        <td class="py-3 px-4 text-center font-bold text-slate-700">
                            <?= (int)$r['total_score'] ?> / <?= (int)$r['total_questions'] ?>
                        </td>
                        <td class="py-3 px-4 text-center font-extrabold text-indigo-600">
                            <?= round((float)$r['percentage'], 1) ?>%
                        </td>
                        <td class="py-3 px-4 text-center">
                            <span class="px-2 py-0.5 rounded-lg text-xs font-bold <?= (float)$r['percentage'] >= 70 ? 'bg-emerald-50 text-emerald-700' : ((float)$r['percentage'] >= 50 ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700') ?>">
                                <?= htmlspecialchars($r['grade'] ?: 'Completed') ?>
                            </span>
                        </td>
                        <td class="py-3 pl-4 text-right">
                            <a href="results.php?result_id=<?= urlencode($r['id']) ?>" class="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:text-indigo-600 font-bold text-slate-700 transition-colors inline-block">
                                Review
                            </a>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <?php endif; ?>
    </div>

</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
