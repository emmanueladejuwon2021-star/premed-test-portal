<?php
/**
 * Admin Study Room Leaderboard & Student Progress Monitor
 * Apex Pre-Medical Sciences Examination Portal
 */

$pageTitle = 'Study Room Leaderboard';
require_once __DIR__ . '/config/db.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (empty($_SESSION['admin'])) {
    header('Location: login.php?tab=admin');
    exit;
}

$pdo = DB::connect();

// Fetch Courses
$coursesStmt = $pdo->query("SELECT * FROM courses ORDER BY code ASC");
$courses = $coursesStmt->fetchAll();

$filterCourseId = trim($_GET['course_id'] ?? '');

// Query Student Progress & Coins
// Rank students by: 1) Completion rate (number of sessions passed), 2) First try passes count, 3) Course Coins balance
$query = "
    SELECT
        s.id AS student_id,
        s.name AS student_name,
        s.matric_no,
        c.id AS course_id,
        c.code AS course_code,
        c.title AS course_title,
        COIN.coins_balance,
        COUNT(CASE WHEN p.passed = 1 THEN 1 END) AS passed_sessions_count,
        COUNT(CASE WHEN p.first_try_pass = 1 THEN 1 END) AS first_try_passes_count,
        COUNT(p.id) AS total_attempts_recorded
    FROM students s
    CROSS JOIN courses c
    LEFT JOIN student_course_coins COIN ON COIN.student_id = s.id AND COIN.course_id = c.id
    LEFT JOIN student_study_progress p ON p.student_id = s.id AND p.course_id = c.id
";

if ($filterCourseId) {
    $query .= " WHERE c.id = " . $pdo->quote($filterCourseId);
}

$query .= "
    GROUP BY s.id, c.id
    ORDER BY passed_sessions_count DESC, first_try_passes_count DESC, COIN.coins_balance DESC, s.name ASC
";

$leaderboardStmt = $pdo->query($query);
$leaderboardRows = $leaderboardStmt->fetchAll();

require_once __DIR__ . '/includes/header.php';
?>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

    <!-- Header Banner -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
            <div class="flex items-center gap-2">
                <a href="admin_dashboard.php" class="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1">
                    <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i> Admin Dashboard
                </a>
                <span class="text-slate-300">&bull;</span>
                <span class="text-xs font-bold text-slate-500 uppercase">Faculty Analytics</span>
            </div>
            <h1 class="text-2xl font-black text-slate-900 dark:text-white mt-1">Study Room Master Leaderboard</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Track student note session completion rates, first-try 90%+ pass counts, and course coins balances.</p>
        </div>

        <div class="flex items-center gap-2">
            <a href="admin_study_notes.php" class="px-4 py-2.5 rounded-2xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors flex items-center gap-2 shadow-xs">
                <i data-lucide="book-open" class="w-4 h-4"></i>
                <span>Manage Study Notes</span>
            </a>
        </div>
    </div>

    <!-- Course Filter Tabs -->
    <div class="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-2 overflow-x-auto scrollbar-none">
        <a href="admin_study_leaderboard.php" class="px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all shrink-0 <?= empty($filterCourseId) ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400' ?>">
            Overall Leaderboard
        </a>

        <?php foreach ($courses as $c):
            $isSel = ($c['id'] === $filterCourseId);
        ?>
        <a href="admin_study_leaderboard.php?course_id=<?= urlencode($c['id']) ?>" class="px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all shrink-0 <?= $isSel ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400' ?>">
            <?= htmlspecialchars($c['code']) ?>
        </a>
        <?php endforeach; ?>
    </div>

    <!-- Leaderboard Table / Cards -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">

        <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 class="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <i data-lucide="trophy" class="w-4 h-4 text-amber-500"></i>
                <span>Student Progress Rankings</span>
            </h2>
            <span class="text-xs text-slate-400 font-mono"><?= count($leaderboardRows) ?> Student Records</span>
        </div>

        <?php if (empty($leaderboardRows)): ?>
        <div class="p-8 text-center text-slate-400 text-xs">
            No study progress data recorded yet.
        </div>
        <?php else: ?>

        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] font-black border-b border-slate-100 dark:border-slate-800">
                    <tr>
                        <th class="py-3.5 px-6">Rank</th>
                        <th class="py-3.5 px-6">Student</th>
                        <th class="py-3.5 px-6">Course</th>
                        <th class="py-3.5 px-6">Mastered Sessions (90%+)</th>
                        <th class="py-3.5 px-6">First-Try Passes</th>
                        <th class="py-3.5 px-6">Course Coins</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    <?php foreach ($leaderboardRows as $idx => $row):
                        $rank = $idx + 1;
                    ?>
                    <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td class="py-4 px-6 font-mono font-black text-xs">
                            <?php if ($rank === 1): ?>
                            <span class="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 font-bold">🥇 #1</span>
                            <?php elseif ($rank === 2): ?>
                            <span class="px-2.5 py-1 rounded-xl bg-slate-200 text-slate-800 font-bold">🥈 #2</span>
                            <?php elseif ($rank === 3): ?>
                            <span class="px-2.5 py-1 rounded-xl bg-amber-900/20 text-amber-700 font-bold">🥉 #3</span>
                            <?php else: ?>
                            <span class="text-slate-400">#<?= $rank ?></span>
                            <?php endif; ?>
                        </td>

                        <td class="py-4 px-6 font-bold">
                            <div class="text-slate-900 dark:text-white"><?= htmlspecialchars($row['student_name']) ?></div>
                            <div class="text-[10px] text-teal-600 dark:text-teal-400 font-mono font-semibold"><?= htmlspecialchars($row['matric_no']) ?></div>
                        </td>

                        <td class="py-4 px-6 font-mono font-bold text-slate-600 dark:text-slate-300">
                            <?= htmlspecialchars($row['course_code']) ?>
                        </td>

                        <td class="py-4 px-6 font-mono font-black text-emerald-600 dark:text-emerald-400">
                            <?= (int)$row['passed_sessions_count'] ?> Sessions
                        </td>

                        <td class="py-4 px-6 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            <?= (int)$row['first_try_passes_count'] ?> First-Tries
                        </td>

                        <td class="py-4 px-6 font-mono font-black text-amber-600 dark:text-amber-400">
                            🪙 <?= number_format((int)($row['coins_balance'] ?? 0)) ?> Coins
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
