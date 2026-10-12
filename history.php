<?php
/**
 * Test Results & History - Clinical Medical Edition
 * Apex Pre-Medical Sciences Examination Portal
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

<div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">

    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3.5 border-b border-teal-100">
        <div>
            <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Examination History &amp; Results</h1>
            <p class="text-xs text-slate-500 mt-0.5">Comprehensive audit log of all completed tests, score breakdowns, and question reviews.</p>
        </div>
        <a href="practice.php" class="px-4 py-2 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all active:scale-95">
            <i data-lucide="layers" class="w-4 h-4"></i>
            <span>Practice New Questions</span>
        </a>
    </div>

    <?php if (empty($history)): ?>
    <div class="bg-white rounded-3xl p-8 sm:p-12 text-center border border-teal-100 shadow-xs max-w-md mx-auto space-y-3.5">
        <div class="w-12 h-12 mx-auto rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <i data-lucide="clipboard-list" class="w-6 h-6"></i>
        </div>
        <div>
            <h3 class="text-sm font-black text-slate-900">No Examination Records Yet</h3>
            <p class="text-xs text-slate-500 mt-1 leading-relaxed">You haven't written any tests or practice sessions yet. Start a quick test or practice session to see your progress here.</p>
        </div>
        <a href="courses.php" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-teal-600 text-white font-bold text-xs shadow-xs hover:bg-teal-700 transition-colors">
            <span>Browse Available Tests</span>
            <i data-lucide="arrow-right" class="w-4 h-4"></i>
        </a>
    </div>
    <?php else: ?>
    <div class="bg-white rounded-3xl border border-teal-100 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-teal-50/50 border-b border-teal-100 font-bold uppercase tracking-wider text-teal-900 text-[11px]">
                    <tr>
                        <th class="px-6 py-4">Course</th>
                        <th class="px-6 py-4">Date &amp; Time</th>
                        <th class="px-6 py-4 text-center">Score</th>
                        <th class="px-6 py-4 text-center">Percentage</th>
                        <th class="px-6 py-4 text-center">Grade</th>
                        <th class="px-6 py-4 text-right">Action</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <?php foreach ($history as $h): ?>
                    <tr class="hover:bg-teal-50/20 transition-colors">
                        <td class="px-6 py-4 font-bold text-slate-900">
                            <span class="inline-block px-2.5 py-0.5 rounded-lg bg-teal-50 border border-teal-200/60 text-teal-800 font-mono text-[11px] mr-2">
                                <?= htmlspecialchars($h['course_code']) ?>
                            </span>
                            <span><?= htmlspecialchars($h['course_title']) ?></span>
                        </td>
                        <td class="px-6 py-4 text-slate-500 font-mono">
                            <?= date('M d, Y &bull; h:i A', strtotime($h['created_at'])) ?>
                        </td>
                        <td class="px-6 py-4 text-center font-bold text-slate-700 font-mono">
                            <?= (int)$h['total_score'] ?> / <?= (int)$h['total_questions'] ?>
                        </td>
                        <td class="px-6 py-4 text-center font-black text-teal-600 font-mono text-sm">
                            <?= round((float)$h['percentage'], 1) ?>%
                        </td>
                        <td class="px-6 py-4 text-center">
                            <span class="px-2.5 py-0.5 rounded-lg text-xs font-bold <?= (float)$h['percentage'] >= 70 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : ((float)$h['percentage'] >= 50 ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-rose-50 text-rose-700 border border-rose-200') ?>">
                                <?= htmlspecialchars($h['grade'] ?: 'Completed') ?>
                            </span>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <a href="results.php?result_id=<?= urlencode($h['id']) ?>" class="px-4 py-1.5 rounded-xl border border-teal-200 hover:bg-teal-50 text-teal-700 font-bold text-xs transition-colors inline-block">
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
