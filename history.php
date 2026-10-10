<?php
/**
 * Test History View
 * Premed Test Portal (PHP Edition)
 */

$pageTitle = 'Examination History';
require_once __DIR__ . '/config/db.php';
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

<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
    <div class="flex justify-between items-center pb-4 border-b border-slate-200">
        <div>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight">Examination History</h1>
            <p class="text-xs text-slate-500 mt-1">Review your past scores, attempt records, and performance progression.</p>
        </div>
        <a href="practice.php" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5">
            <i data-lucide="play" class="w-3.5 h-3.5"></i>
            <span>New Practice Session</span>
        </a>
    </div>

    <?php if (empty($history)): ?>
    <div class="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto">
        <div class="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
            <i data-lucide="clipboard" class="w-6 h-6"></i>
        </div>
        <h3 class="text-base font-bold text-slate-900 mb-1">No Past Attempts Found</h3>
        <p class="text-xs text-slate-500 mb-6">You haven't completed any test sessions yet. Launch a practice drill to begin tracking your records.</p>
        <a href="practice.php" class="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md inline-flex items-center gap-2">
            <span>Start Practice Drill</span>
            <i data-lucide="arrow-right" class="w-4 h-4"></i>
        </a>
    </div>
    <?php else: ?>
    <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 border-b border-slate-200 font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                        <th class="px-6 py-4">Assessment / Course</th>
                        <th class="px-6 py-4">Date & Time</th>
                        <th class="px-6 py-4 text-center">Score</th>
                        <th class="px-6 py-4 text-center">Percentage</th>
                        <th class="px-6 py-4 text-center">Grade</th>
                        <th class="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <?php foreach ($history as $h): ?>
                    <tr class="hover:bg-slate-50/70 transition-colors">
                        <td class="px-6 py-4 font-semibold text-slate-900">
                            <span class="inline-block px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold font-mono text-[11px] mr-2">
                                <?= htmlspecialchars($h['course_code']) ?>
                            </span>
                            <span><?= htmlspecialchars($h['course_title']) ?></span>
                        </td>
                        <td class="px-6 py-4 text-slate-500 font-medium">
                            <?= date('M d, Y - h:i A', strtotime($h['created_at'])) ?>
                        </td>
                        <td class="px-6 py-4 text-center font-bold text-slate-800">
                            <?= (int)$h['total_score'] ?> / <?= (int)$h['total_questions'] ?>
                        </td>
                        <td class="px-6 py-4 text-center font-extrabold text-indigo-600">
                            <?= round((float)$h['percentage'], 1) ?>%
                        </td>
                        <td class="px-6 py-4 text-center">
                            <span class="inline-block px-2.5 py-0.5 rounded-full font-black text-xs <?= $h['grade'] === 'A' ? 'bg-emerald-100 text-emerald-800' : ($h['grade'] === 'F' ? 'bg-rose-100 text-rose-800' : 'bg-indigo-100 text-indigo-800') ?>">
                                <?= htmlspecialchars($h['grade']) ?>
                            </span>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <a href="results.php?id=<?= urlencode($h['id']) ?>" class="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 font-bold text-xs inline-flex items-center gap-1 transition-colors">
                                <span>Inspect</span>
                                <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
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
