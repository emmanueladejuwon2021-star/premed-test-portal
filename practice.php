<?php
/**
 * Formative Assessment & Item Bank Studio - Enterprise Production Edition
 * Apex Pre-Medical Sciences Examination Council (PMSEC)
 */

$pageTitle = 'Formative Assessment Studio';
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/header.php';

$db = DB::connect();

// Fetch all courses and total accredited question counts
$stmt = $db->query("
    SELECT c.*, COUNT(q.id) as q_count 
    FROM courses c
    LEFT JOIN topics t ON c.id = t.course_id
    LEFT JOIN questions q ON t.id = q.topic_id
    GROUP BY c.id
    ORDER BY c.code ASC
");
$courses = $stmt->fetchAll();

$selectedCourseId = $_GET['course_id'] ?? ($courses[0]['id'] ?? '');

// Fetch accredited topics for selected curriculum
$topics = [];
$totalCourseQuestions = 0;
if (!empty($selectedCourseId)) {
    $tStmt = $db->prepare("
        SELECT t.*, COUNT(q.id) as q_count 
        FROM topics t
        LEFT JOIN questions q ON t.id = q.topic_id
        WHERE t.course_id = ?
        GROUP BY t.id
        ORDER BY t.name ASC
    ");
    $tStmt->execute([$selectedCourseId]);
    $topics = $tStmt->fetchAll();

    foreach ($topics as $t) {
        $totalCourseQuestions += (int)$t['q_count'];
    }
}

$currentCourse = null;
foreach ($courses as $c) {
    if ($c['id'] === $selectedCourseId) {
        $currentCourse = $c;
        break;
    }
}
?>

<div class="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">

    <!-- Header & Institutional Breadcrumb -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
        <div>
            <div class="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-1">
                <a href="index.php" class="hover:text-teal-700 transition-colors">Command Center</a>
                <i data-lucide="chevron-right" class="w-3.5 h-3.5 text-slate-400"></i>
                <span class="text-teal-700 font-bold">Formative Assessment Studio</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Formative Clinical Assessment Studio</h1>
            <p class="text-xs text-slate-500 mt-0.5">Configure item volume limits, subspecialties, and examination pacing parameters for targeted preclinical mastery.</p>
        </div>
        <div class="flex items-center gap-2">
            <span class="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-teal-50 text-teal-800 border border-teal-200">
                <?= count($courses) ?> Disciplines Active
            </span>
        </div>
    </div>

    <form method="GET" action="exam.php" id="assessmentForm" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4">

            <!-- LEFT COLUMN: Curriculum & Assessment Parameters (5 cols) -->
            <div class="md:col-span-5 space-y-4">

                <!-- 1. Curriculum Discipline Picker -->
                <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
                    <div class="flex items-center justify-between">
                        <label class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <i data-lucide="book-open" class="w-3.5 h-3.5 text-teal-600"></i>
                            <span>1. Select Disciplinary Curriculum</span>
                        </label>
                        <span class="text-[10px] text-slate-400 font-bold uppercase font-mono">Mandatory</span>
                    </div>

                    <div class="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
                        <?php foreach ($courses as $c): 
                            $isSelected = ($c['id'] === $selectedCourseId);
                        ?>
                        <label class="flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all <?= $isSelected ? 'border-teal-600 bg-teal-50/70 shadow-xs' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50' ?>">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <input type="radio" name="course_id" value="<?= htmlspecialchars($c['id']) ?>" <?= $isSelected ? 'checked' : '' ?> onchange="window.location.href='practice.php?course_id=' + this.value" class="text-teal-600 focus:ring-teal-500">
                                <div class="min-w-0">
                                    <span class="block text-xs font-black text-slate-900 leading-tight"><?= htmlspecialchars($c['code']) ?></span>
                                    <span class="block text-[11px] text-slate-500 truncate leading-tight mt-0.5"><?= htmlspecialchars($c['title']) ?></span>
                                </div>
                            </div>
                            <span class="text-[10px] font-mono font-bold text-slate-400 shrink-0 ml-2 bg-white px-1.5 py-0.5 rounded border border-slate-200"><?= (int)$c['q_count'] ?> Items</span>
                        </label>
                        <?php endforeach; ?>
                    </div>
                </div>

                <!-- 2. Assessment Pacing & Item Volume -->
                <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3.5">
                    <label class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <i data-lucide="sliders" class="w-3.5 h-3.5 text-teal-600"></i>
                        <span>2. Item Volume & Pacing</span>
                    </label>

                    <!-- Item Limit Chips -->
                    <div>
                        <span class="block text-[11px] font-bold text-slate-600 mb-1.5">Item Volume Limit:</span>
                        <div class="grid grid-cols-4 gap-1.5">
                            <?php foreach ([10 => '10 Items', 20 => '20 Items', 40 => '40 Items', 60 => '60 Items'] as $lim => $label): ?>
                            <label class="cursor-pointer">
                                <input type="radio" name="limit" value="<?= $lim ?>" <?= $lim === 20 ? 'checked' : '' ?> class="peer sr-only">
                                <span class="block text-center py-2 px-1 text-xs font-bold font-mono rounded-xl border border-slate-200 peer-checked:border-teal-600 peer-checked:bg-teal-600 peer-checked:text-white hover:bg-slate-50 transition-all">
                                    <?= $label ?>
                                </span>
                            </label>
                            <?php endforeach; ?>
                        </div>
                    </div>

                    <!-- Pacing Duration Chips -->
                    <div>
                        <span class="block text-[11px] font-bold text-slate-600 mb-1.5">Examination Pacing:</span>
                        <div class="grid grid-cols-4 gap-1.5">
                            <?php foreach ([15 => '15 Mins', 30 => '30 Mins', 45 => '45 Mins', 0 => 'Untimed'] as $dur => $dlabel): ?>
                            <label class="cursor-pointer">
                                <input type="radio" name="duration" value="<?= $dur ?>" <?= $dur === 30 ? 'checked' : '' ?> class="peer sr-only">
                                <span class="block text-center py-2 px-1 text-xs font-bold font-mono rounded-xl border border-slate-200 peer-checked:border-teal-600 peer-checked:bg-teal-600 peer-checked:text-white hover:bg-slate-50 transition-all">
                                    <?= $dlabel ?>
                                </span>
                            </label>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </div>

            </div>

            <!-- RIGHT COLUMN: Subspecialty & Topics Selector (7 cols) -->
            <div class="md:col-span-7">
                <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col h-full space-y-3">
                    <div class="flex items-center justify-between pb-2.5 border-b border-slate-100">
                        <div>
                            <label class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <i data-lucide="layers" class="w-3.5 h-3.5 text-teal-600"></i>
                                <span>3. Subspecialty Topic Filter</span>
                            </label>
                            <p class="text-[11px] text-slate-400 mt-0.5">Leave unselected to evaluate across the comprehensive curriculum</p>
                        </div>
                        <button type="button" onclick="toggleAllTopics()" class="text-xs text-teal-700 hover:text-teal-800 font-bold px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 transition-colors">
                            Select All / Clear
                        </button>
                    </div>

                    <!-- Topics Checklist -->
                    <div class="space-y-1 overflow-y-auto max-h-[350px] pr-1 divide-y divide-slate-100">
                        <?php if (empty($topics)): ?>
                        <div class="p-8 text-center text-slate-400">
                            <i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
                            <p class="text-xs">No subspecialties mapped for this curriculum yet.</p>
                        </div>
                        <?php else: ?>
                            <?php foreach ($topics as $t): ?>
                            <label class="flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-slate-50 cursor-pointer text-xs text-slate-700 group transition-colors">
                                <div class="flex items-center gap-2.5 min-w-0">
                                    <input type="checkbox" name="topics[]" value="<?= htmlspecialchars($t['id']) ?>" class="topic-cb rounded text-teal-600 focus:ring-teal-500">
                                    <span class="truncate font-medium group-hover:text-slate-900"><?= htmlspecialchars($t['name']) ?></span>
                                </div>
                                <span class="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded ml-2 shrink-0">
                                    <?= (int)$t['q_count'] ?> Items
                                </span>
                            </label>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </div>
            </div>

        </div>

        <!-- Sticky / Bottom Action Bar -->
        <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                    <i data-lucide="play" class="w-5 h-5 fill-current"></i>
                </div>
                <div>
                    <span class="block text-xs font-bold text-slate-900">
                        Configured: <?= htmlspecialchars($currentCourse['code'] ?? 'Curriculum') ?> &bull; <?= htmlspecialchars($currentCourse['title'] ?? '') ?>
                    </span>
                    <span class="block text-[11px] text-slate-500">
                        Accredited Item Pool: <?= $totalCourseQuestions ?> validated board items across <?= count($topics) ?> subspecialties
                    </span>
                </div>
            </div>

            <button type="submit" class="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-sm transition-colors flex items-center justify-center gap-2 shrink-0">
                <span>Commence Formative Assessment</span>
                <i data-lucide="arrow-right" class="w-4 h-4"></i>
            </button>
        </div>
    </form>

</div>

<script>
function toggleAllTopics() {
    const checkboxes = document.querySelectorAll('.topic-cb');
    const allChecked = Array.from(checkboxes).every(c => c.checked);
    checkboxes.forEach(c => c.checked = !allChecked);
}
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
