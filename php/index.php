<?php
/**
 * Student Home Hub
 * Premed Test Portal (PHP Edition)
 */

$pageTitle = 'Home Hub';
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/header.php';

$db = DB::connect();

// Fetch student performance stats
$studentId = $student['id'] ?? '';
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

// Fetch newest active exam (non-master courses that are unlocked)
$examStmt = $db->query("
    SELECT * FROM courses 
    WHERE is_master = 0 
    ORDER BY created_at DESC 
    LIMIT 1
");
$newestExam = $examStmt->fetch();
?>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
    <!-- Welcome Banner & Quick Metrics -->
    <div class="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-md mb-3 border border-white/20">
                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-amber-300"></i>
                <span>Academic Portal Session Active</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black tracking-tight">Welcome back, <?= htmlspecialchars($student['name'] ?? 'Candidate') ?></h1>
            <p class="text-indigo-100 text-sm mt-1 max-w-xl">Ready to test your clinical knowledge and master high-yield medical sciences questions?</p>
        </div>

        <!-- Metric Badges -->
        <div class="grid grid-cols-3 gap-3 w-full md:w-auto">
            <div class="bg-white/10 backdrop-blur-md rounded-2xl p-3 text-center border border-white/10 min-w-[90px]">
                <span class="block text-xl font-black"><?= (int)$stats['total_tests'] ?></span>
                <span class="text-[11px] text-indigo-100 font-medium">Tests Taken</span>
            </div>
            <div class="bg-white/10 backdrop-blur-md rounded-2xl p-3 text-center border border-white/10 min-w-[90px]">
                <span class="block text-xl font-black"><?= round((float)$stats['avg_score'], 1) ?>%</span>
                <span class="text-[11px] text-indigo-100 font-medium">Average</span>
            </div>
            <div class="bg-white/10 backdrop-blur-md rounded-2xl p-3 text-center border border-white/10 min-w-[90px]">
                <span class="block text-xl font-black text-amber-300"><?= round((float)$stats['max_score'], 1) ?>%</span>
                <span class="text-[11px] text-indigo-100 font-medium">Highest</span>
            </div>
        </div>
    </div>

    <!-- Active Deployed Exam Card (if available) -->
    <?php if ($newestExam): ?>
    <div class="bg-rose-50 border-2 border-rose-200 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-200">
                <i data-lucide="award" class="w-6 h-6"></i>
            </div>
            <div>
                <div class="flex items-center gap-2">
                    <span class="text-xs font-black uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">Official Exam</span>
                    <span class="text-xs font-bold text-slate-500"><?= htmlspecialchars($newestExam['code']) ?></span>
                </div>
                <h3 class="text-lg font-black text-slate-900 mt-1"><?= htmlspecialchars($newestExam['title']) ?></h3>
                <p class="text-xs text-slate-600 mt-0.5">Duration: <?= (int)$newestExam['duration'] ?> mins &bull; <?= (int)$newestExam['question_limit'] ?> Questions</p>
            </div>
        </div>

        <a href="exam.php?course_id=<?= urlencode($newestExam['id']) ?>" class="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-200 transition-all flex items-center gap-2 shrink-0">
            <span>Launch Exam</span>
            <i data-lucide="play" class="w-4 h-4 fill-current"></i>
        </a>
    </div>
    <?php endif; ?>

    <!-- Main Navigation Hub Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <!-- Card 1: Practice For Premed -->
        <a href="practice.php" class="group bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-100 p-6 rounded-3xl transition-all duration-200 shadow-sm hover:shadow-md">
            <div class="w-12 h-12 rounded-2xl bg-indigo-200/80 text-indigo-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <i data-lucide="rocket" class="w-6 h-6"></i>
            </div>
            <h3 class="text-base font-bold text-indigo-950 mb-1">Practice For Premed</h3>
            <p class="text-xs text-indigo-800/80 leading-relaxed">Customize subjects, select specific topics, and test your speed with 5,600+ questions.</p>
        </a>

        <!-- Card 2: Classroom & Subjects -->
        <a href="courses.php" class="group bg-pink-50/70 hover:bg-pink-100/70 border border-pink-100 p-6 rounded-3xl transition-all duration-200 shadow-sm hover:shadow-md">
            <div class="w-12 h-12 rounded-2xl bg-pink-200/80 text-pink-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <i data-lucide="graduation-cap" class="w-6 h-6"></i>
            </div>
            <h3 class="text-base font-bold text-pink-950 mb-1">Classroom</h3>
            <p class="text-xs text-pink-800/80 leading-relaxed">Explore active study curriculums for Biology, Chemistry, Physics, and Mathematics.</p>
        </a>

        <!-- Card 3: Science Note -->
        <div class="bg-teal-50/70 border border-teal-100 p-6 rounded-3xl shadow-sm">
            <div class="w-12 h-12 rounded-2xl bg-teal-200/80 text-teal-700 flex items-center justify-center mb-4">
                <i data-lucide="book-open" class="w-6 h-6"></i>
            </div>
            <h3 class="text-base font-bold text-teal-950 mb-1">Science Note</h3>
            <p class="text-xs text-teal-800/80 leading-relaxed">Digital high-yield notes covering physiology, organic mechanisms, and kinematics.</p>
        </div>

        <!-- Card 4: Result History -->
        <a href="history.php" class="group bg-lime-50/70 hover:bg-lime-100/70 border border-lime-200/80 p-6 rounded-3xl transition-all duration-200 shadow-sm hover:shadow-md">
            <div class="w-12 h-12 rounded-2xl bg-lime-200/80 text-lime-800 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <i data-lucide="clipboard-check" class="w-6 h-6"></i>
            </div>
            <h3 class="text-base font-bold text-lime-950 mb-1">Result History</h3>
            <p class="text-xs text-lime-900/80 leading-relaxed">Review past test scores, inspect correct answers, and read comprehensive explanations.</p>
        </a>

        <!-- Card 5: CBT Leaderboard -->
        <a href="leaderboard.php" class="group bg-violet-50/70 hover:bg-violet-100/70 border border-violet-100 p-6 rounded-3xl transition-all duration-200 shadow-sm hover:shadow-md">
            <div class="w-12 h-12 rounded-2xl bg-violet-200/80 text-violet-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <i data-lucide="trophy" class="w-6 h-6"></i>
            </div>
            <h3 class="text-base font-bold text-violet-950 mb-1">CBT Challenge Ranks</h3>
            <p class="text-xs text-violet-900/80 leading-relaxed">See how you rank among fellow pre-med students across all departments and faculties.</p>
        </a>

        <!-- Card 6: Performance Analysis -->
        <div class="bg-amber-50/70 border border-amber-100 p-6 rounded-3xl shadow-sm">
            <div class="w-12 h-12 rounded-2xl bg-amber-200/80 text-amber-700 flex items-center justify-center mb-4">
                <i data-lucide="trending-up" class="w-6 h-6"></i>
            </div>
            <h3 class="text-base font-bold text-amber-950 mb-1">Performance Analysis</h3>
            <p class="text-xs text-amber-900/80 leading-relaxed">Track score progress, speed benchmarks, and subject strengths over time.</p>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
