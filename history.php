<?php
/**
 * Candidate Examination Transcript & Historical Progression - Enterprise Production Edition
 * Apex Pre-Medical Sciences Examination Council (PMSEC)
 */

$pageTitle = 'Candidate Examination Transcript';
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

<div class="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
    <div class="flex justify-between items-center pb-3 border-b border-slate-200">
        <div>
            <h1 class="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Candidate Examination Transcript</h1>
            <p class="text-xs text-slate-500">Official longitudinal performance records, scaled psychometric proficiencies, and item analyses.</p>
        </div>
        <a href="practice.php" class="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5">
            <i data-lucide="file-check-2" class="w-3.5 h-3.5"></i>
            <span>New Formative Assessment</span>
        </a>
    </div>

    <?php if (empty($history)): ?>
    <div class="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-xs max-w-sm mx-auto space-y-3">
        <div class="w-12 h-12 mx-auto rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <i data-lucide="clipboard-list" class="w-6 h-6"></i>
        </div>
        <div>
            <h3 class="text-sm font-bold text-slate-900">No Historical Transcripts Recorded</h3>
            <p class="text-xs text-slate-500 mt-0.5">You have not completed any examination administrations yet. Launch a formative assessment to begin logging your academic credentials.</p>
        </div>
        <a href="practice.php" class="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs shadow-xs inline-flex items-center gap-1.5">
            <span>Commence Assessment Drill</span>
            <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
        </a>
    </div>
    <?php else: ?>
    <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 border-b border-slate-200 font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                        <th class="px-5 py-3.5">Curriculum / Assessment Module</th>
                        <th class="px-5 py-3.5">Administration Date & Time</th>
                        <th class="px-5 py-3.5 text-center">Raw Score</th>
                        <th class="px-5 py-3.5 text-center">Scaled Proficiency</th>
                        <th class="px-5 py-3.5 text-center">Classification</th>
                        <th class="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <?php foreach ($history as $h): ?>
                    <tr class="hover:bg-slate-50/70 transition-colors">
                        <td class="px-5 py-3.5 font-semibold text-slate-900">
                            <span class="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold font-mono text-[10px] mr-2 border border-slate-200">
                                <?= htmlspecialchars($h['course_code']) ?>
                            </span>
                            <span class="text-xs"><?= htmlspecialchars($h['course_title']) ?></span>
                        </td>
                        <td class="px-5 py-3.5 text-slate-500 font-medium font-mono text-[11px]">
                            <?= date('M d, Y &bull; h:i A', strtotime($h['created_at'])) ?>
                        </td>
                        <td class="px-5 py-3.5 text-center font-bold text-slate-800 font-mono">
                            <?= (int)$h['total_score'] ?> / <?= (int)$h['total_questions'] ?>
                        </td>
                        <td class="px-5 py-3.5 text-center font-extrabold text-teal-700 font-mono">
                            <?= round((float)$h['percentage'], 1) ?>%
                        </td>
                        <td class="px-5 py-3.5 text-center">
                            <span class="inline-block px-2.5 py-0.5 rounded text-[11px] font-black font-mono <?= $h['grade'] === 'A' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : ($h['grade'] === 'F' ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-teal-50 text-teal-800 border border-teal-200') ?>">
                                Grade <?= htmlspecialchars($h['grade']) ?>
                            </span>
                        </td>
                        <td class="px-5 py-3.5 text-right">
                            <a href="results.php?id=<?= urlencode($h['id']) ?>" class="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-teal-700 hover:bg-teal-50 font-bold text-xs inline-flex items-center gap-1 transition-colors">
                                <span>Inspect Report</span>
                                <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i>
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
