<?php
/**
 * Exam Readiness & Hardware Checks
 * Premed Test Portal (PHP Edition)
 */

$pageTitle = 'Readiness & Integrity Verification';
require_once __DIR__ . '/config/db.php';

$courseId = $_GET['course_id'] ?? '';
if (empty($courseId)) {
    header('Location: index.php');
    exit;
}

$db = DB::connect();
$stmt = $db->prepare("SELECT * FROM courses WHERE id = ? LIMIT 1");
$stmt->execute([$courseId]);
$course = $stmt->fetch();

if (!$course) {
    header('Location: index.php');
    exit;
}

require_once __DIR__ . '/includes/header.php';
?>

<div class="max-w-2xl mx-auto px-4 py-8 space-y-6">
    <div class="text-center">
        <div class="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
            <i data-lucide="shield-check" class="w-6 h-6"></i>
        </div>
        <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">System Readiness Verification</h1>
        <p class="text-xs text-slate-500 mt-1"><?= htmlspecialchars($course['code']) ?> &bull; <?= htmlspecialchars($course['title']) ?></p>
    </div>

    <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <!-- Checklist items -->
        <div class="space-y-3">
            <div class="p-3.5 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                <span class="flex items-center gap-2.5 font-bold text-slate-800">
                    <i data-lucide="monitor" class="w-4 h-4 text-emerald-600"></i> Viewport & Browser Dimensions
                </span>
                <span class="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">Optimal</span>
            </div>

            <div class="p-3.5 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                <span class="flex items-center gap-2.5 font-bold text-slate-800">
                    <i data-lucide="clock" class="w-4 h-4 text-emerald-600"></i> Assessment Duration Limit
                </span>
                <span class="font-bold text-slate-700"><?= (int)$course['duration'] ?> Minutes</span>
            </div>

            <div class="p-3.5 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                <span class="flex items-center gap-2.5 font-bold text-slate-800">
                    <i data-lucide="help-circle" class="w-4 h-4 text-emerald-600"></i> Question Allocation
                </span>
                <span class="font-bold text-slate-700"><?= (int)$course['question_limit'] ?> Questions</span>
            </div>
        </div>

        <!-- Rules -->
        <div class="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
            <span class="font-bold block uppercase tracking-wider">Integrity Guidelines:</span>
            <ul class="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
                <li>Do not leave the browser tab or minimize your examination screen.</li>
                <li>Right-click, copy, paste, and developer inspection keys are strictly monitored.</li>
                <li>Ensure you submit before the timer expires or your assessment will auto-finalize.</li>
            </ul>
        </div>

        <a href="countdown.php?course_id=<?= urlencode($courseId) ?>" class="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 transition-colors">
            <span>Proceed to Examination Countdown</span>
            <i data-lucide="arrow-right" class="w-4 h-4"></i>
        </a>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
