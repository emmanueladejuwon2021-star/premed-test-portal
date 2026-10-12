<?php
/**
 * Academic Resources & Question Search - Clinical Medical Edition
 * Apex Pre-Medical Sciences Examination Portal
 */

$pageTitle = 'Academic Resources';
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/header.php';

$db = DB::connect();

$query = trim($_GET['q'] ?? '');
$courseFilter = trim($_GET['course_id'] ?? '');

$courses = $db->query("SELECT id, code, title FROM courses ORDER BY code ASC")->fetchAll();

$results = [];
if (!empty($query)) {
    $sql = "
        SELECT q.*, t.name as topic_name, c.code as course_code, c.title as course_title
        FROM questions q
        JOIN topics t ON q.topic_id = t.id
        JOIN courses c ON t.course_id = c.id
        WHERE (q.text LIKE ? OR q.explanation LIKE ?)
    ";
    $params = ["%{$query}%", "%{$query}%"];

    if (!empty($courseFilter)) {
        $sql .= " AND c.id = ?";
        $params[] = $courseFilter;
    }

    $sql .= " LIMIT 50";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $results = $stmt->fetchAll();
}
?>

<div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
    <div class="text-center max-w-xl mx-auto space-y-2">
        <div class="w-12 h-12 mx-auto rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200/60 shadow-xs">
            <i data-lucide="book-open-check" class="w-6 h-6"></i>
        </div>
        <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Academic Resources &amp; Search</h1>
        <p class="text-xs text-slate-500">Query questions, scientific concepts, and step-by-step solutions across all pre-medical syllabi.</p>
    </div>

    <!-- Search Box Form -->
    <form method="GET" action="question_search.php" class="bg-white rounded-3xl p-4 sm:p-6 border border-teal-100 shadow-sm flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
            <span class="absolute inset-y-0 left-0 pl-4 flex items-center text-teal-600 pointer-events-none">
                <i data-lucide="search" class="w-4 h-4"></i>
            </span>
            <input type="text" name="q" value="<?= htmlspecialchars($query) ?>" placeholder="Search terms (e.g. velocity, acceleration, thermodynamics, kinematics, blood)..." class="w-full pl-11 pr-4 py-3 rounded-2xl border border-teal-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
        </div>

        <select name="course_id" class="px-4 py-3 rounded-2xl border border-teal-100 text-xs font-bold bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">All Subjects</option>
            <?php foreach ($courses as $c): ?>
            <option value="<?= htmlspecialchars($c['id']) ?>" <?= $c['id'] === $courseFilter ? 'selected' : '' ?>>
                <?= htmlspecialchars($c['code']) ?> - <?= htmlspecialchars($c['title']) ?>
            </option>
            <?php endforeach; ?>
        </select>

        <button type="submit" class="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center justify-center gap-1.5 transition-all active:scale-95">
            <span>Search</span>
            <i data-lucide="arrow-right" class="w-4 h-4"></i>
        </button>
    </form>

    <!-- Results Section -->
    <?php if (!empty($query)): ?>
    <div class="space-y-4">
        <div class="flex justify-between items-center text-xs text-slate-500 font-mono">
            <span>Results matching "<strong><?= htmlspecialchars($query) ?></strong>": <?= count($results) ?></span>
        </div>

        <?php if (empty($results)): ?>
        <div class="bg-white rounded-3xl p-12 text-center border border-teal-100 shadow-xs space-y-2">
            <p class="text-sm font-black text-slate-800">No matching questions found.</p>
            <p class="text-xs text-slate-500">Try broader terms such as "acceleration", "force", "energy", or "gravity".</p>
        </div>
        <?php else: ?>
        <div class="space-y-4">
            <?php foreach ($results as $idx => $r): ?>
            <div class="bg-white rounded-3xl p-6 border border-teal-100 shadow-sm space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div class="flex items-center gap-2">
                        <span class="px-2.5 py-0.5 rounded-lg bg-teal-50 border border-teal-200/60 text-teal-800 font-mono font-black text-xs"><?= htmlspecialchars($r['course_code']) ?></span>
                        <span class="text-xs font-medium text-slate-500"><?= htmlspecialchars($r['topic_name']) ?></span>
                    </div>
                    <span class="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Answer: Option <?= strtoupper($r['correct_option']) ?>
                    </span>
                </div>

                <div class="text-sm font-semibold text-slate-900 leading-relaxed math-content">
                    <?= $r['text'] ?>
                </div>

                <!-- Options Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div class="p-3 rounded-2xl border <?= strtolower($r['correct_option']) === 'a' ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-bold' : 'border-slate-100 bg-slate-50 text-slate-700' ?>">
                        A) <?= htmlspecialchars($r['a']) ?>
                    </div>
                    <div class="p-3 rounded-2xl border <?= strtolower($r['correct_option']) === 'b' ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-bold' : 'border-slate-100 bg-slate-50 text-slate-700' ?>">
                        B) <?= htmlspecialchars($r['b']) ?>
                    </div>
                    <?php if (!empty($r['c'])): ?>
                    <div class="p-3 rounded-2xl border <?= strtolower($r['correct_option']) === 'c' ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-bold' : 'border-slate-100 bg-slate-50 text-slate-700' ?>">
                        C) <?= htmlspecialchars($r['c']) ?>
                    </div>
                    <?php endif; ?>
                    <?php if (!empty($r['d'])): ?>
                    <div class="p-3 rounded-2xl border <?= strtolower($r['correct_option']) === 'd' ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-bold' : 'border-slate-100 bg-slate-50 text-slate-700' ?>">
                        D) <?= htmlspecialchars($r['d']) ?>
                    </div>
                    <?php endif; ?>
                </div>

                <?php if (!empty($r['explanation'])): ?>
                <div class="p-3.5 rounded-2xl bg-teal-50/50 border border-teal-100 text-xs text-slate-700 leading-relaxed math-content">
                    <strong class="text-teal-900 font-bold">Solution:</strong> <?= $r['explanation'] ?>
                </div>
                <?php endif; ?>
            </div>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>
    </div>
    <?php endif; ?>
</div>

<script>
window.addEventListener('DOMContentLoaded', () => {
    if (typeof renderMathInElement === 'function') {
        renderMathInElement(document.body, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false}
            ],
            throwOnError: false
        });
    }
});
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
