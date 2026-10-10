<?php
/**
 * Premed Practice Configuration
 * Premed Test Portal (PHP Edition)
 */

$pageTitle = 'Custom Practice Configuration';
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/header.php';

$db = DB::connect();

// Fetch all courses and their question count
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

// Fetch topics for selected course
$topics = [];
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
}
?>

<div class="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
    <div>
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 mb-2">
            <i data-lucide="sliders" class="w-3.5 h-3.5"></i>
            <span>Interactive Simulator</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Practice For Premed</h1>
        <p class="text-xs text-slate-500 mt-1">Configure custom question counts, topics, and duration limits for targeted mastery.</p>
    </div>

    <form method="GET" action="exam.php" class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-8">
        <!-- 1. Select Subject -->
        <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">1. Select Subject / Course</label>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <?php foreach ($courses as $c): ?>
                <label class="cursor-pointer border rounded-2xl p-4 flex items-center justify-between transition-all <?= $c['id'] === $selectedCourseId ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-300' ?>">
                    <div class="flex items-center gap-3">
                        <input type="radio" name="course_id" value="<?= htmlspecialchars($c['id']) ?>" <?= $c['id'] === $selectedCourseId ? 'checked' : '' ?> onchange="window.location.href='practice.php?course_id=' + this.value" class="text-indigo-600 focus:ring-indigo-500">
                        <div>
                            <span class="block text-xs font-black text-slate-900"><?= htmlspecialchars($c['code']) ?></span>
                            <span class="block text-[11px] text-slate-500 line-clamp-1"><?= htmlspecialchars($c['title']) ?></span>
                        </div>
                    </div>
                    <span class="text-[10px] font-bold text-slate-400"><?= (int)$c['q_count'] ?> Qs</span>
                </label>
                <?php endforeach; ?>
            </div>
        </div>

        <!-- 2. Select Topics Filter (Optional) -->
        <?php if (!empty($topics)): ?>
        <div>
            <div class="flex justify-between items-center mb-3">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">2. Select Topics (Optional: defaults to all)</label>
                <button type="button" onclick="toggleAllTopics()" class="text-xs text-indigo-600 hover:text-indigo-700 font-bold">Select All / None</button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 border border-slate-100 rounded-2xl">
                <?php foreach ($topics as $t): ?>
                <label class="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 text-xs text-slate-700 cursor-pointer">
                    <input type="checkbox" name="topics[]" value="<?= htmlspecialchars($t['id']) ?>" class="topic-cb rounded text-indigo-600 focus:ring-indigo-500">
                    <span class="line-clamp-1 flex-1"><?= htmlspecialchars($t['name']) ?></span>
                    <span class="text-[10px] text-slate-400 font-medium"><?= (int)$t['q_count'] ?></span>
                </label>
                <?php endforeach; ?>
            </div>
        </div>
        <?php endif; ?>

        <!-- 3. Question Count & Duration -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">3. Question Count</label>
                <select name="limit" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="10">10 Questions (Quick Sprint)</option>
                    <option value="20" selected>20 Questions (Standard Drill)</option>
                    <option value="40">40 Questions (Deep Assessment)</option>
                    <option value="60">60 Questions (Exam Simulation)</option>
                </select>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">4. Time Limit</label>
                <select name="duration" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="15">15 Minutes</option>
                    <option value="30" selected>30 Minutes</option>
                    <option value="45">45 Minutes</option>
                    <option value="60">60 Minutes</option>
                    <option value="0">Untimed (Chill Study Mode)</option>
                </select>
            </div>
        </div>

        <button type="submit" class="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold text-sm shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2">
            <span>Launch Interactive Practice Session</span>
            <i data-lucide="play" class="w-4 h-4 fill-current"></i>
        </button>
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
