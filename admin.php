<?php
/**
 * Administrator & Instructor Console
 * Premed Test Portal (PHP Edition)
 */

$pageTitle = 'Instructor Admin Console';
require_once __DIR__ . '/config/db.php';

// Auth check
if (empty($_SESSION['admin'])) {
    header('Location: login.php');
    exit;
}

$db = DB::connect();

// Handle Course Toggle Lock Action
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['toggle_lock'])) {
    $cid = $_POST['course_id'] ?? '';
    $currentLocked = (int)($_POST['current_locked'] ?? 0);
    $newLock = $currentLocked ? 0 : 1;
    $upd = $db->prepare("UPDATE courses SET is_locked = ? WHERE id = ?");
    $upd->execute([$newLock, $cid]);
    header('Location: admin.php');
    exit;
}

// System Metrics
$totalStudents = $db->query("SELECT COUNT(*) FROM students")->fetchColumn();
$totalQuestions = $db->query("SELECT COUNT(*) FROM questions")->fetchColumn();
$totalResults = $db->query("SELECT COUNT(*) FROM results")->fetchColumn();
$totalCourses = $db->query("SELECT COUNT(*) FROM courses")->fetchColumn();

// Fetch Courses
$courses = $db->query("
    SELECT c.*, COUNT(q.id) as q_count 
    FROM courses c
    LEFT JOIN topics t ON c.id = t.course_id
    LEFT JOIN questions q ON t.id = q.topic_id
    GROUP BY c.id
    ORDER BY c.created_at DESC
")->fetchAll();

// Fetch Recent Student Submissions
$recentSubmissions = $db->query("
    SELECT r.*, s.name as student_name, s.matric_no, c.code as course_code
    FROM results r
    JOIN students s ON r.student_id = s.id
    JOIN courses c ON r.course_id = c.id
    ORDER BY r.created_at DESC
    LIMIT 25
")->fetchAll();

require_once __DIR__ . '/includes/header.php';
?>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-200">
        <div>
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 mb-2">
                <i data-lucide="shield" class="w-3.5 h-3.5"></i>
                <span>Administrative Access Verified</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Instructor Management Console</h1>
            <p class="text-xs text-slate-500 mt-1">Manage assessment deployments, unlock live CBT tests, and monitor student metrics.</p>
        </div>
    </div>

    <!-- Quick Stats Grid -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <span class="text-xs font-bold uppercase text-slate-400 block mb-1">Total Question Bank</span>
            <span class="text-3xl font-black text-indigo-600"><?= number_format((int)$totalQuestions) ?></span>
        </div>
        <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <span class="text-xs font-bold uppercase text-slate-400 block mb-1">Registered Candidates</span>
            <span class="text-3xl font-black text-emerald-600"><?= number_format((int)$totalStudents) ?></span>
        </div>
        <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <span class="text-xs font-bold uppercase text-slate-400 block mb-1">Completed Submissions</span>
            <span class="text-3xl font-black text-violet-600"><?= number_format((int)$totalResults) ?></span>
        </div>
        <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <span class="text-xs font-bold uppercase text-slate-400 block mb-1">Courses & Batches</span>
            <span class="text-3xl font-black text-slate-900"><?= number_format((int)$totalCourses) ?></span>
        </div>
    </div>

    <!-- Course Deployment & Lock Controller -->
    <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
            <i data-lucide="sliders" class="w-5 h-5 text-indigo-600"></i>
            <span>Course Access & Lock Controls</span>
        </h2>
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 border-b border-slate-200 uppercase font-bold text-slate-500">
                    <tr>
                        <th class="px-6 py-3">Code</th>
                        <th class="px-6 py-3">Course Title</th>
                        <th class="px-6 py-3 text-center">Questions</th>
                        <th class="px-6 py-3 text-center">Duration</th>
                        <th class="px-6 py-3 text-center">Status</th>
                        <th class="px-6 py-3 text-right">Action</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <?php foreach ($courses as $c): ?>
                    <tr class="hover:bg-slate-50/70">
                        <td class="px-6 py-3 font-mono font-bold text-indigo-700"><?= htmlspecialchars($c['code']) ?></td>
                        <td class="px-6 py-3 font-semibold text-slate-900"><?= htmlspecialchars($c['title']) ?></td>
                        <td class="px-6 py-3 text-center text-slate-600 font-bold"><?= (int)$c['q_count'] ?></td>
                        <td class="px-6 py-3 text-center text-slate-500"><?= (int)$c['duration'] ?> mins</td>
                        <td class="px-6 py-3 text-center">
                            <?php if ($c['is_locked']): ?>
                            <span class="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]">Locked</span>
                            <?php else: ?>
                            <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">Active (Unlocked)</span>
                            <?php endif; ?>
                        </td>
                        <td class="px-6 py-3 text-right">
                            <form method="POST" action="admin.php" class="inline">
                                <input type="hidden" name="toggle_lock" value="1">
                                <input type="hidden" name="course_id" value="<?= htmlspecialchars($c['id']) ?>">
                                <input type="hidden" name="current_locked" value="<?= (int)$c['is_locked'] ?>">
                                <button type="submit" class="px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors <?= $c['is_locked'] ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100' ?>">
                                    <?= $c['is_locked'] ? 'Unlock for Students' : 'Lock Assessment' ?>
                                </button>
                            </form>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Recent Submissions Table -->
    <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
            <i data-lucide="clipboard-check" class="w-5 h-5 text-emerald-600"></i>
            <span>Recent Test Submissions</span>
        </h2>
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 border-b border-slate-200 uppercase font-bold text-slate-500">
                    <tr>
                        <th class="px-6 py-3">Candidate</th>
                        <th class="px-6 py-3">Matric No</th>
                        <th class="px-6 py-3">Course</th>
                        <th class="px-6 py-3 text-center">Score</th>
                        <th class="px-6 py-3 text-center">Percentage</th>
                        <th class="px-6 py-3 text-center">Grade</th>
                        <th class="px-6 py-3 text-right">Details</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <?php foreach ($recentSubmissions as $sub): ?>
                    <tr class="hover:bg-slate-50/70">
                        <td class="px-6 py-3 font-bold text-slate-900"><?= htmlspecialchars($sub['student_name']) ?></td>
                        <td class="px-6 py-3 font-mono text-slate-500"><?= htmlspecialchars($sub['matric_no']) ?></td>
                        <td class="px-6 py-3 font-semibold text-slate-700"><?= htmlspecialchars($sub['course_code']) ?></td>
                        <td class="px-6 py-3 text-center font-bold text-slate-900"><?= (int)$sub['total_score'] ?> / <?= (int)$sub['total_questions'] ?></td>
                        <td class="px-6 py-3 text-center font-extrabold text-indigo-600"><?= round((float)$sub['percentage'], 1) ?>%</td>
                        <td class="px-6 py-3 text-center">
                            <span class="px-2 py-0.5 rounded-full font-black <?= $sub['grade'] === 'A' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700' ?>">
                                <?= htmlspecialchars($sub['grade']) ?>
                            </span>
                        </td>
                        <td class="px-6 py-3 text-right">
                            <a href="results.php?id=<?= urlencode($sub['id']) ?>" class="text-indigo-600 hover:text-indigo-800 font-bold">Inspect</a>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
