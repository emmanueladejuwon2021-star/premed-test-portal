<?php
/**
 * Test Results & History
 * Premed Test Portal
 */

require_once __DIR__ . '/config/db.php';

if (empty($_SESSION['student'])) {
    header('Location: login.php');
    exit;
}

$pageTitle = 'Results';
require_once __DIR__ . '/includes/header.php';

$db = DB::connect();
$studentId = $student['id'] ?? '';

$stmt = $db->prepare("
    SELECT r.*, c.title AS course_title, c.code AS course_code 
    FROM results r
    LEFT JOIN courses c ON r.course_id = c.id
    WHERE r.student_id = ?
    ORDER BY r.created_at DESC
");
$stmt->execute([$studentId]);
$history = $stmt->fetchAll();
?>

<div class="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-200">
        <div>
            <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">My Test Results</h1>
            <p class="text-xs text-slate-500 mt-0.5">See all tests you have completed, your scores, and review question explanations.</p>
        </div>
        <a href="practice.php" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors">
            <i data-lucide="check-circle-2" class="w-4 h-4"></i>
            <span>Practice New Questions</span>
        </a>
    </div>

    <?php if (empty($history)): ?>
    <div class="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-xs max-w-md mx-auto space-y-3">
        <div class="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <i data-lucide="clipboard-list" class="w-6 h-6"></i>
        </div>
        <div>
            <h3 class="text-sm font-extrabold text-slate-900">No Test Results Yet</h3>
            <p class="text-xs text-slate-500 mt-1">You haven't written any tests or practice sessions yet. Start a quick test or practice session to see your progress here.</p>
        </div>
        <a href="courses.php" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-xs hover:bg-indigo-700 transition-colors">
            <span>Browse Available Tests</span>
            <i data-lucide="arrow-right" class="w-4 h-4"></i>
        </a>
    </div>
    <?php else: ?>
    <div class="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-slate-50/80 border-b border-slate-200 font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                    <tr>
                        <th class="px-5 py-3.5">Course</th>
                        <th class="px-5 py-3.5">Date & Time</th>
                        <th class="px-5 py-3.5 text-center">Score</th>
                        <th class="px-5 py-3.5 text-center">Percentage</th>
                        <th class="px-5 py-3.5 text-center">Grade</th>
                        <th class="px-5 py-3.5 text-right">Action</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <?php foreach ($history as $h): ?>
                    <tr class="hover:bg-slate-50/70 transition-colors">
                        <td class="px-5 py-4 font-bold text-slate-900">
                            <span class="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] mr-2">
                                <?= htmlspecialchars($h['course_code']) ?>
                            </span>
                            <span><?= htmlspecialchars($h['course_title']) ?></span>
                        </td>
                        <td class="px-5 py-4 text-slate-500 font-medium">
                            <?= date('M d, Y &bull; h:i A', strtotime($h['created_at'])) ?>
                        </td>
                        <td class="px-5 py-4 text-center font-bold text-slate-800 font-mono">
                            <?= (int)$h['total_score'] ?> / <?= (int)$h['total_questions'] ?>
                        </td>
                        <td class="px-5 py-4 text-center font-extrabold text-indigo-600 font-mono">
                            <?= round((float)$h['percentage'], 1) ?>%
                        </td>
                        <td class="px-5 py-4 text-center">
                            <span class="px-2.5 py-1 rounded-lg text-xs font-bold <?= (float)$h['percentage'] >= 70 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : ((float)$h['percentage'] >= 50 ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-rose-50 text-rose-700 border border-rose-200') ?>">
                                <?= htmlspecialchars($h['grade'] ?: 'Passed') ?>
                            </span>
                        </td>
                        <td class="px-5 py-4 text-right">
                            <a href="results.php?result_id=<?= urlencode($h['id']) ?>" class="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:text-indigo-600 font-bold text-slate-700 transition-colors inline-block">
                                Review Answers
                            </a>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
    <?php endif; ?>

</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
