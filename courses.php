<?php
/**
 * Academic Curricula & Item Banks Browser - Enterprise Production Edition
 * Apex Pre-Medical Sciences Examination Council (PMSEC)
 */

$pageTitle = 'Academic Curricula & Item Banks';
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/header.php';

$db = DB::connect();

// 1. Fetch Active Published Board Examinations
$liveTestsStmt = $db->query("
    SELECT t.*, c.code AS course_code, c.title AS course_title
    FROM tests t
    JOIN courses c ON t.course_id = c.id
    WHERE t.is_live = 1
    ORDER BY t.created_at DESC
");
$liveTests = $liveTestsStmt ? $liveTestsStmt->fetchAll() : [];

// 2. Fetch Accredited Curriculum Banks
$stmt = $db->query("
    SELECT 
        c.*,
        COUNT(DISTINCT t.id) AS topics_count,
        COUNT(q.id) AS questions_count
    FROM courses c
    LEFT JOIN topics t ON c.id = t.course_id
    LEFT JOIN questions q ON t.id = q.topic_id
    GROUP BY c.id
    ORDER BY c.code ASC
");
$courses = $stmt->fetchAll();
?>

<div class="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

    <!-- ================= SECTION 1: ACTIVE PROCTORED BOARD EXAMINATIONS ================= -->
    <div class="space-y-3.5">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2.5 border-b border-slate-200">
            <div>
                <div class="flex items-center gap-2">
                    <h1 class="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Active Proctored Board Examinations</h1>
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold <?= count($liveTests) > 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600' ?>">
                        <span class="w-1.5 h-1.5 rounded-full <?= count($liveTests) > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400' ?>"></span>
                        <span><?= count($liveTests) ?> Active</span>
                    </span>
                </div>
                <p class="text-xs text-slate-500">Official summative board assessments currently open for proctored candidate administration.</p>
            </div>
            <a href="practice.php" class="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5">
                <i data-lucide="file-check-2" class="w-3.5 h-3.5"></i>
                <span>Formative Assessment Studio</span>
            </a>
        </div>

        <?php if (!empty($liveTests)): ?>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <?php foreach ($liveTests as $t): 
                $topicScope = 'Comprehensive Curriculum Syllabus';
                $rawTopics = json_decode($t['topic_ids'] ?? '[]', true);
                if (is_array($rawTopics) && !in_array('ALL', $rawTopics)) {
                    $topicScope = count($rawTopics) . ' Specific Subspecialties';
                }
            ?>
            <div class="bg-white rounded-2xl p-4 sm:p-5 border-2 border-teal-200/90 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between space-y-3 relative overflow-hidden">
                <div>
                    <div class="flex items-center justify-between mb-2.5">
                        <span class="text-xs font-black uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-mono">
                            <?= htmlspecialchars($t['course_code']) ?>
                        </span>
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>PROCTORED CBT</span>
                        </span>
                    </div>

                    <h3 class="text-sm font-extrabold text-slate-900 leading-snug"><?= htmlspecialchars($t['title']) ?></h3>
                    <p class="text-xs text-slate-500 mt-0.5 truncate"><?= htmlspecialchars($t['course_title']) ?></p>

                    <div class="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200 my-2.5">
                        <i data-lucide="layers" class="w-3.5 h-3.5 text-teal-600 shrink-0"></i>
                        <span class="truncate text-[11px] font-medium"><?= htmlspecialchars($topicScope) ?></span>
                    </div>

                    <div class="flex items-center gap-2 text-[11px] text-slate-500 font-mono font-medium">
                        <span><strong class="text-slate-800"><?= (int)$t['duration'] ?></strong> Mins</span>
                        <span>&bull;</span>
                        <span><strong class="text-slate-800"><?= (int)$t['question_limit'] ?></strong> Items</span>
                        <span>&bull;</span>
                        <span><?= (int)$t['attempts_allowed'] === 1 ? '1 Official Attempt' : ((int)$t['attempts_allowed'] === 0 ? 'Unlimited' : (int)$t['attempts_allowed'] . ' Attempts') ?></span>
                    </div>
                </div>

                <div class="pt-3 border-t border-slate-100">
                    <a href="exam.php?test_id=<?= urlencode($t['id']) ?>" class="w-full py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-xs transition-colors flex items-center justify-center gap-2">
                        <span>Authorize & Enter Examination Room</span>
                        <i data-lucide="play" class="w-3.5 h-3.5 fill-current"></i>
                    </a>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
        <?php else: ?>
        <div class="p-6 rounded-2xl bg-white border border-slate-200 text-center space-y-2">
            <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <i data-lucide="calendar" class="w-5 h-5"></i>
            </div>
            <h3 class="text-xs font-bold text-slate-800">No Summative Board Examinations Currently Scheduled</h3>
            <p class="text-[11px] text-slate-500 max-w-sm mx-auto">Official proctored examination administrations will appear here once published by the examination board. In the interim, candidates may access accredited curricula and formative item banks below.</p>
        </div>
        <?php endif; ?>
    </div>

    <!-- ================= SECTION 2: ACCREDITED PRECLINICAL CURRICULA ================= -->
    <div class="space-y-3 pt-2">
        <div class="pb-2.5 border-b border-slate-200">
            <h2 class="text-lg font-black text-slate-900 tracking-tight">Accredited Academic Curricula & Question Repositories</h2>
            <p class="text-xs text-slate-500">Access accredited preclinical disciplines, explore syllabus subspecialties, and evaluate mastery across 5,630+ validated items.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <?php foreach ($courses as $c): ?>
            <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:border-teal-400 hover:shadow-sm transition-all flex flex-col justify-between space-y-3">
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-black uppercase tracking-wider text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">
                            <?= htmlspecialchars($c['code']) ?>
                        </span>
                        <span class="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-mono">
                            Accredited
                        </span>
                    </div>

                    <h3 class="text-sm font-bold text-slate-900 leading-snug"><?= htmlspecialchars($c['title']) ?></h3>

                    <div class="flex items-center gap-3 text-xs text-slate-500 my-2.5">
                        <span class="flex items-center gap-1 text-[11px]"><i data-lucide="layers" class="w-3.5 h-3.5 text-teal-600"></i> <?= (int)$c['topics_count'] ?> Subspecialties</span>
                        <span class="flex items-center gap-1 text-[11px] font-mono"><i data-lucide="help-circle" class="w-3.5 h-3.5 text-teal-600"></i> <?= (int)$c['questions_count'] ?> Items</span>
                    </div>
                </div>

                <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span class="text-[11px] text-slate-400 font-medium">Formative Item Pool</span>
                    <a href="practice.php?course_id=<?= urlencode($c['id']) ?>" class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-700 font-bold text-xs border border-slate-200 transition-colors flex items-center gap-1">
                        <span>Configure Drill</span>
                        <i data-lucide="chevron-right" class="w-3 h-3"></i>
                    </a>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>

</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
