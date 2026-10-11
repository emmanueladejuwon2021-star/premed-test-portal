<?php
/**
 * Past Question Practice
 * Premed Test Portal
 */

require_once __DIR__ . '/config/db.php';

if (empty($_SESSION['student'])) {
    header('Location: login.php');
    exit;
}

$pageTitle = 'Past Question Practice';
require_once __DIR__ . '/includes/header.php';

$db = DB::connect();

// Fetch all available courses
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

// Fetch topics for the selected course
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

<div class="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

    <!-- Header -->
    <div class="pb-3 border-b border-slate-200">
        <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Past Question Practice</h1>
        <p class="text-xs text-slate-500 mt-0.5">Select a course and topic to practice questions at your own speed with instant solutions.</p>
    </div>

    <form method="GET" action="exam.php" id="practiceForm" class="space-y-5">
        <input type="hidden" name="mode" value="practice">

        <div class="grid grid-cols-1 md:grid-cols-12 gap-5">

            <!-- LEFT COLUMN: Choose Course & Settings (5 cols) -->
            <div class="md:col-span-5 space-y-4">

                <!-- Step 1: Select Course -->
                <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
                    <label class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <i data-lucide="book-open" class="w-4 h-4 text-indigo-600"></i>
                        <span>Step 1: Choose Course</span>
                    </label>

                    <div class="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                        <?php foreach ($courses as $c): 
                            $isSelected = ($c['id'] === $selectedCourseId);
                        ?>
                        <label class="flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all <?= $isSelected ? 'border-indigo-600 bg-indigo-50/70 shadow-xs' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50' ?>">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <input type="radio" name="course_id" value="<?= htmlspecialchars($c['id']) ?>" <?= $isSelected ? 'checked' : '' ?> onchange="window.location.href='practice.php?course_id=' + this.value" class="text-indigo-600 focus:ring-indigo-500">
                                <div class="min-w-0">
                                    <span class="block text-xs font-extrabold text-slate-900 leading-tight"><?= htmlspecialchars($c['code']) ?></span>
                                    <span class="block text-[11px] text-slate-500 truncate leading-tight mt-0.5"><?= htmlspecialchars($c['title']) ?></span>
                                </div>
                            </div>
                            <span class="text-[10px] font-bold text-slate-400 shrink-0 ml-2 bg-white px-2 py-0.5 rounded border border-slate-200"><?= (int)$c['q_count'] ?> Qs</span>
                        </label>
                        <?php endforeach; ?>
                    </div>
                </div>

                <!-- Step 2: Number of Questions -->
                <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
                    <label class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <i data-lucide="sliders" class="w-4 h-4 text-indigo-600"></i>
                        <span>Step 2: How Many Questions?</span>
                    </label>

                    <div class="grid grid-cols-4 gap-2">
                        <?php foreach ([10 => '10', 20 => '20', 30 => '30', 50 => '50'] as $lim => $label): ?>
                        <label class="text-center p-2 rounded-xl border border-slate-200 hover:border-indigo-400 cursor-pointer has-[:checked]:bg-indigo-600 has-[:checked]:text-white has-[:checked]:border-indigo-600 transition-all">
                            <input type="radio" name="limit" value="<?= $lim ?>" <?= $lim === 20 ? 'checked' : '' ?> class="sr-only">
                            <span class="block text-xs font-bold"><?= $label ?></span>
                            <span class="block text-[10px] opacity-80">Questions</span>
                        </label>
                        <?php endforeach; ?>
                    </div>
                </div>

            </div>

            <!-- RIGHT COLUMN: Choose Topics (7 cols) -->
            <div class="md:col-span-7">
                <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                    <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div>
                            <label class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <i data-lucide="layers" class="w-4 h-4 text-indigo-600"></i>
                                <span>Step 3: Choose Topics</span>
                            </label>
                            <p class="text-xs text-slate-500 mt-0.5">Select specific topics or practice all of them.</p>
                        </div>

                        <button type="button" onclick="toggleAllTopics()" id="selectAllBtn" class="text-xs font-bold text-indigo-600 hover:underline">
                            Select All
                        </button>
                    </div>

                    <?php if (empty($topics)): ?>
                    <div class="py-12 text-center text-slate-400 text-xs">
                        No topics found for this course yet.
                    </div>
                    <?php else: ?>
                    <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
                        <!-- Option: All Topics -->
                        <label class="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer transition-all has-[:checked]:bg-indigo-50 has-[:checked]:border-indigo-400">
                            <div class="flex items-center gap-3">
                                <input type="checkbox" name="topic_ids[]" value="ALL" checked id="checkboxAll" onchange="handleAllCheckboxChange(this)" class="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500">
                                <div>
                                    <span class="block text-xs font-extrabold text-slate-900">All Topics Combined</span>
                                    <span class="block text-[11px] text-slate-500">Practice questions randomly across the entire course</span>
                                </div>
                            </div>
                            <span class="text-[11px] font-bold text-indigo-700 font-mono"><?= $totalCourseQuestions ?> Qs</span>
                        </label>

                        <!-- Individual Topics -->
                        <?php foreach ($topics as $t): ?>
                        <label class="topic-label flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 cursor-pointer transition-all has-[:checked]:bg-indigo-50/60 has-[:checked]:border-indigo-300">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <input type="checkbox" name="topic_ids[]" value="<?= htmlspecialchars($t['id']) ?>" onchange="handleIndividualCheckboxChange(this)" class="topic-checkbox w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500">
                                <span class="text-xs font-medium text-slate-800 truncate"><?= htmlspecialchars($t['name']) ?></span>
                            </div>
                            <span class="text-[10px] font-bold text-slate-400 shrink-0 ml-2"><?= (int)$t['q_count'] ?> Qs</span>
                        </label>
                        <?php endforeach; ?>
                    </div>
                    <?php endif; ?>
                </div>
            </div>

        </div>

        <!-- Submit Launch Bar -->
        <div class="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div class="flex items-center gap-3 text-xs">
                <div class="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center font-bold">
                    <i data-lucide="play" class="w-4 h-4"></i>
                </div>
                <div>
                    <span class="font-extrabold text-white block">Course: <?= htmlspecialchars($currentCourse['code'] ?? 'Select Course') ?></span>
                    <span class="text-[11px] text-slate-400">Untimed practice with instant explanations</span>
                </div>
            </div>

            <button type="submit" class="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer">
                <span>Start Practice Now</span>
                <i data-lucide="arrow-right" class="w-4 h-4"></i>
            </button>
        </div>
    </form>

</div>

<script>
    function handleAllCheckboxChange(allBox) {
        if (allBox.checked) {
            document.querySelectorAll('.topic-checkbox').forEach(cb => {
                cb.checked = false;
            });
        }
    }

    function handleIndividualCheckboxChange(indBox) {
        const allBox = document.getElementById('checkboxAll');
        if (indBox.checked && allBox) {
            allBox.checked = false;
        }
    }

    function toggleAllTopics() {
        const allBox = document.getElementById('checkboxAll');
        if (allBox) {
            allBox.checked = true;
            handleAllCheckboxChange(allBox);
        }
    }
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
