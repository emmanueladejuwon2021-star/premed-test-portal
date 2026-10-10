<?php
/**
 * Courses & Subjects Browser
 * Premed Test Portal (PHP Edition)
 */

$pageTitle = 'Courses & Subjects';
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/header.php';

$db = DB::connect();

$stmt = $db->query("
    SELECT 
        c.*,
        COUNT(DISTINCT t.id) AS topics_count,
        COUNT(q.id) AS questions_count
    FROM courses c
    LEFT JOIN topics t ON c.id = t.course_id
    LEFT JOIN questions q ON t.id = q.topic_id
    GROUP BY c.id
    ORDER BY c.is_master DESC, c.code ASC
");
$courses = $stmt->fetchAll();
?>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight">Available Courses & Question Banks</h1>
            <p class="text-xs text-slate-500 mt-1">Select an academic subject to practice or take a timed assessment.</p>
        </div>
        <a href="practice.php" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm flex items-center gap-2">
            <i data-lucide="sliders-horizontal" class="w-4 h-4"></i>
            <span>Custom Practice Setup</span>
        </a>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <?php foreach ($courses as $c): ?>
        <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
                <div class="flex items-center justify-between mb-4">
                    <span class="text-xs font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                        <?= htmlspecialchars($c['code']) ?>
                    </span>
                    <?php if ($c['is_master']): ?>
                    <span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Master Subject</span>
                    <?php elseif ($c['is_locked']): ?>
                    <span class="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                        <i data-lucide="lock" class="w-3 h-3"></i> Locked
                    </span>
                    <?php else: ?>
                    <span class="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">Live Exam</span>
                    <?php endif; ?>
                </div>

                <h3 class="text-base font-bold text-slate-900 mb-2 leading-snug"><?= htmlspecialchars($c['title']) ?></h3>

                <div class="flex items-center gap-4 text-xs text-slate-500 mb-6">
                    <span class="flex items-center gap-1"><i data-lucide="layers" class="w-3.5 h-3.5"></i> <?= (int)$c['topics_count'] ?> Topics</span>
                    <span class="flex items-center gap-1"><i data-lucide="help-circle" class="w-3.5 h-3.5"></i> <?= (int)$c['questions_count'] ?> Questions</span>
                </div>
            </div>

            <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span class="text-xs text-slate-400 font-medium"><?= (int)$c['duration'] ?> mins &bull; <?= (int)$c['question_limit'] ?> Qs</span>
                
                <?php if ($c['is_locked'] && !$c['is_master']): ?>
                <button disabled class="px-4 py-2 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs cursor-not-allowed">
                    Locked
                </button>
                <?php else: ?>
                <a href="exam.php?course_id=<?= urlencode($c['id']) ?>" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors">
                    <span>Start Test</span>
                    <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                </a>
                <?php endif; ?>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
