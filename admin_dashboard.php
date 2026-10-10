<?php
/**
 * Master Localhost Instructor Control Center
 * Premed Test Portal (Isolated Local Admin Engine)
 */

$pageTitle = 'Local Admin Control Center';
require_once __DIR__ . '/config/db.php';

// ==========================================
// STRICT LOCALHOST-ONLY SECURITY RESTRICTION
// ==========================================
$remoteAddr = $_SERVER['REMOTE_ADDR'] ?? '';
$httpHost = $_SERVER['HTTP_HOST'] ?? '';
$isLocal = in_array($remoteAddr, ['127.0.0.1', '::1', 'localhost']) || 
           str_starts_with($httpHost, 'localhost') || 
           str_starts_with($httpHost, '127.0.0.1');

if (!empty(getenv('VERCEL')) || !empty($_ENV['VERCEL']) || !$isLocal) {
    http_response_code(403);
    die('<!DOCTYPE html><html><head><title>403 Forbidden</title></head><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;"><div style="background:#fff;padding:40px;border-radius:24px;box-shadow:0 10px 25px rgba(0,0,0,0.05);text-align:center;max-width:440px;"><h2 style="color:#e11d48;margin:0 0 10px 0;">403 - Restricted Access</h2><p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 20px 0;">Administrative controls are strictly isolated from the public cloud and can only be accessed locally on the administrator\'s computer (localhost).</p><a href="login.php" style="display:inline-block;padding:10px 20px;border-radius:12px;background:#4f46e5;color:#fff;text-decoration:none;font-size:13px;font-weight:bold;">Return to Student Portal</a></div></body></html>');
}

// Auto-authenticate administrator on local PC
$_SESSION['admin'] = true;
$db = DB::connect();

$syncMsg = null;
$syncError = null;

// Handle Admin Actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    // 1. Toggle Lock
    if ($action === 'toggle_lock') {
        $cid = $_POST['course_id'] ?? '';
        $current = (int)($_POST['current_locked'] ?? 0);
        $new = $current ? 0 : 1;
        $db->prepare("UPDATE courses SET is_locked = ? WHERE id = ?")->execute([$new, $cid]);
        header('Location: admin_dashboard.php?tab=deployments');
        exit;
    }

    // 2. Add New Course
    if ($action === 'add_course') {
        $code = strtoupper(trim($_POST['code'] ?? ''));
        $title = trim($_POST['title'] ?? '');
        $duration = (int)($_POST['duration'] ?? 30);
        $limit = (int)($_POST['question_limit'] ?? 20);

        if (!empty($code) && !empty($title)) {
            $cid = 'course_' . strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $code)) . '_' . time();
            $stmt = $db->prepare("INSERT INTO courses (id, code, title, duration, question_limit, is_mock, is_locked) VALUES (?, ?, ?, ?, ?, 1, 0)");
            $stmt->execute([$cid, $code, $title, $duration, $limit]);

            // Add default general topic
            $tid = 'topic_' . bin2hex(random_bytes(6));
            $db->prepare("INSERT INTO topics (id, course_id, name) VALUES (?, ?, ?)")->execute([$tid, $cid, 'General Curriculum']);

            header('Location: admin_dashboard.php?tab=deployments');
            exit;
        }
    }

    // 3. Add New Question
    if ($action === 'add_question') {
        $courseId = $_POST['course_id'] ?? '';
        $text = trim($_POST['text'] ?? '');
        $optA = trim($_POST['a'] ?? '');
        $optB = trim($_POST['b'] ?? '');
        $optC = trim($_POST['c'] ?? '');
        $optD = trim($_POST['d'] ?? '');
        $correct = strtoupper(trim($_POST['correct_option'] ?? 'A'));
        $explanation = trim($_POST['explanation'] ?? '');

        if (!empty($text) && !empty($optA) && !empty($optB)) {
            // Find or create topic
            $tStmt = $db->prepare("SELECT id FROM topics WHERE course_id = ? LIMIT 1");
            $tStmt->execute([$courseId]);
            $topic = $tStmt->fetch();
            $topicId = $topic ? $topic['id'] : null;

            if (!$topicId) {
                $topicId = 'topic_' . bin2hex(random_bytes(6));
                $db->prepare("INSERT INTO topics (id, course_id, name) VALUES (?, ?, 'General Curriculum')")->execute([$topicId, $courseId]);
            }

            $qid = 'q_' . bin2hex(random_bytes(8));
            $ins = $db->prepare("INSERT INTO questions (id, topic_id, text, a, b, c, d, correct_option, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $ins->execute([$qid, $topicId, $text, $optA, $optB, $optC, $optD, $correct, $explanation]);

            header('Location: admin_dashboard.php?tab=questions&added=1');
            exit;
        }
    }

    // 4. Delete Question
    if ($action === 'delete_question') {
        $qid = $_POST['question_id'] ?? '';
        $db->prepare("DELETE FROM questions WHERE id = ?")->execute([$qid]);
        header('Location: admin_dashboard.php?tab=questions');
        exit;
    }

    // 5. Sync to Cloud
    if ($action === 'sync_to_cloud') {
        $gitPath = 'C:\\tools\\mingit\\cmd\\git.exe';
        $cmd = "\"{$gitPath}\" add premed_portal.sqlite && \"{$gitPath}\" commit -m \"Local Admin Sync: update questions and portal database\" && \"{$gitPath}\" -c credential.helper=\"\" -c http.sslVerify=false push origin main 2>&1";
        $output = shell_exec($cmd);

        if ($output && (str_contains($output, 'main -> main') || str_contains($output, 'nothing to commit'))) {
            $syncMsg = "Database successfully synced to GitHub & Vercel! Live website will refresh within 15 seconds.";
        } else {
            $syncMsg = "Sync command executed: " . htmlspecialchars(substr($output ?? '', 0, 200));
        }
    }
}

// Metrics
$totalQuestions = $db->query("SELECT COUNT(*) FROM questions")->fetchColumn();
$totalStudents = $db->query("SELECT COUNT(*) FROM students")->fetchColumn();
$totalResults = $db->query("SELECT COUNT(*) FROM results")->fetchColumn();
$totalCourses = $db->query("SELECT COUNT(*) FROM courses")->fetchColumn();

// Active Tab
$tab = $_GET['tab'] ?? 'deployments';

// Data for tabs
$courses = $db->query("
    SELECT c.*, COUNT(q.id) as q_count 
    FROM courses c
    LEFT JOIN topics t ON c.id = t.course_id
    LEFT JOIN questions q ON t.id = q.topic_id
    GROUP BY c.id
    ORDER BY c.created_at DESC
")->fetchAll();

$recentQuestions = $db->query("
    SELECT q.*, c.code as course_code, c.title as course_title 
    FROM questions q
    JOIN topics t ON q.topic_id = t.id
    JOIN courses c ON t.course_id = c.id
    ORDER BY q.created_at DESC
    LIMIT 30
")->fetchAll();

$submissions = $db->query("
    SELECT r.*, s.name as student_name, s.matric_no, c.code as course_code
    FROM results r
    JOIN students s ON r.student_id = s.id
    JOIN courses c ON r.course_id = c.id
    ORDER BY r.created_at DESC
    LIMIT 50
")->fetchAll();

$students = $db->query("
    SELECT s.*, COUNT(r.id) as tests_count
    FROM students s
    LEFT JOIN results r ON s.id = r.student_id
    GROUP BY s.id
    ORDER BY s.created_at DESC
    LIMIT 50
")->fetchAll();

require_once __DIR__ . '/includes/header.php';
?>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
    
    <!-- Local Admin Banner & Sync Button -->
    <div class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-slate-800">
        <div>
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 mb-3">
                <i data-lucide="shield-check" class="w-3.5 h-3.5 text-emerald-400"></i>
                <span>Private Localhost Control Center (PC Only)</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black tracking-tight">Admin Master Console</h1>
            <p class="text-slate-400 text-xs mt-1 max-w-xl">You have complete local authority to author questions, control exam timers, and lock or unlock tests. Changes sync directly to the live cloud website.</p>
        </div>

        <form method="POST" action="admin_dashboard.php" class="shrink-0">
            <input type="hidden" name="action" value="sync_to_cloud">
            <button type="submit" class="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-black text-xs shadow-lg shadow-indigo-900/50 flex items-center gap-2.5 transition-all">
                <i data-lucide="cloud-upload" class="w-4 h-4 text-white"></i>
                <span>Push Updates to Live Website</span>
            </button>
        </form>
    </div>

    <?php if ($syncMsg): ?>
    <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
        <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i>
        <span><?= htmlspecialchars($syncMsg) ?></span>
    </div>
    <?php endif; ?>

    <!-- Quick Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <span class="text-xs font-bold uppercase text-slate-400 block mb-1">Total Question Bank</span>
            <span class="text-3xl font-black text-indigo-600"><?= number_format((int)$totalQuestions) ?></span>
        </div>
        <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <span class="text-xs font-bold uppercase text-slate-400 block mb-1">Registered Students</span>
            <span class="text-3xl font-black text-emerald-600"><?= number_format((int)$totalStudents) ?></span>
        </div>
        <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <span class="text-xs font-bold uppercase text-slate-400 block mb-1">Total Submissions</span>
            <span class="text-3xl font-black text-violet-600"><?= number_format((int)$totalResults) ?></span>
        </div>
        <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <span class="text-xs font-bold uppercase text-slate-400 block mb-1">Configured Courses</span>
            <span class="text-3xl font-black text-amber-600"><?= number_format((int)$totalCourses) ?></span>
        </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex border-b border-slate-200 space-x-6 text-xs font-bold">
        <a href="?tab=deployments" class="pb-3 border-b-2 <?= $tab === 'deployments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800' ?>">
            Courses & Exam Deployments
        </a>
        <a href="?tab=questions" class="pb-3 border-b-2 <?= $tab === 'questions' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800' ?>">
            Question Bank Creator & Manager
        </a>
        <a href="?tab=results" class="pb-3 border-b-2 <?= $tab === 'results' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800' ?>">
            Student Test Submissions
        </a>
        <a href="?tab=students" class="pb-3 border-b-2 <?= $tab === 'students' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800' ?>">
            Registered Candidates
        </a>
    </div>

    <!-- TAB 1: DEPLOYMENTS & COURSES -->
    <?php if ($tab === 'deployments'): ?>
    <div class="space-y-6">
        <!-- Add New Course Form -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 class="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                <i data-lucide="plus-circle" class="w-4 h-4 text-indigo-600"></i> Add New Subject / Mock Exam
            </h3>
            <form method="POST" action="admin_dashboard.php" class="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <input type="hidden" name="action" value="add_course">
                <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Course Code</label>
                    <input type="text" name="code" required placeholder="e.g. ZOO 102" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono uppercase">
                </div>
                <div class="sm:col-span-2">
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Course Title</label>
                    <input type="text" name="title" required placeholder="e.g. Introductory Zoology & Animalia" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs">
                </div>
                <div class="flex items-end">
                    <button type="submit" class="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100">
                        Create Course
                    </button>
                </div>
            </form>
        </div>

        <!-- Courses Table -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h2 class="text-base font-bold text-slate-900">Configured Assessments</h2>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead class="bg-slate-50 border-b border-slate-200 uppercase font-bold text-slate-500">
                        <tr>
                            <th class="px-6 py-3">Code</th>
                            <th class="px-6 py-3">Title</th>
                            <th class="px-6 py-3 text-center">Questions</th>
                            <th class="px-6 py-3 text-center">Time Limit</th>
                            <th class="px-6 py-3 text-center">Status</th>
                            <th class="px-6 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <?php foreach ($courses as $c): ?>
                        <tr class="hover:bg-slate-50/70">
                            <td class="px-6 py-3 font-mono font-bold text-indigo-700"><?= htmlspecialchars($c['code']) ?></td>
                            <td class="px-6 py-3 font-semibold text-slate-800"><?= htmlspecialchars($c['title']) ?></td>
                            <td class="px-6 py-3 text-center font-bold text-slate-600"><?= (int)$c['q_count'] ?> Qs</td>
                            <td class="px-6 py-3 text-center font-mono text-slate-600"><?= (int)$c['duration'] ?> mins</td>
                            <td class="px-6 py-3 text-center">
                                <?php if ($c['is_locked']): ?>
                                <span class="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]">Locked</span>
                                <?php else: ?>
                                <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">Active (Unlocked)</span>
                                <?php endif; ?>
                            </td>
                            <td class="px-6 py-3 text-right">
                                <form method="POST" action="admin_dashboard.php" class="inline">
                                    <input type="hidden" name="action" value="toggle_lock">
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
    </div>
    <?php endif; ?>

    <!-- TAB 2: QUESTIONS CREATOR & MANAGER -->
    <?php if ($tab === 'questions'): ?>
    <div class="space-y-6">
        <!-- Question Creator Form -->
        <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <h3 class="text-sm font-black text-slate-900 flex items-center gap-2">
                <i data-lucide="edit-3" class="w-4 h-4 text-indigo-600"></i> Add New Question to Database
            </h3>
            <form method="POST" action="admin_dashboard.php" class="space-y-4">
                <input type="hidden" name="action" value="add_question">
                <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Target Subject / Course</label>
                    <select name="course_id" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white">
                        <?php foreach ($courses as $c): ?>
                        <option value="<?= htmlspecialchars($c['id']) ?>"><?= htmlspecialchars($c['code']) ?> - <?= htmlspecialchars($c['title']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Question Text</label>
                    <textarea name="text" required rows="3" placeholder="Enter clinical or scientific question prompt (LaTeX $formula$ supported)..." class="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"></textarea>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Option A</label>
                        <input type="text" name="a" required placeholder="Option A text" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs">
                    </div>
                    <div>
                        <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Option B</label>
                        <input type="text" name="b" required placeholder="Option B text" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs">
                    </div>
                    <div>
                        <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Option C</label>
                        <input type="text" name="c" placeholder="Option C text" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs">
                    </div>
                    <div>
                        <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Option D</label>
                        <input type="text" name="d" placeholder="Option D text" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs">
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Correct Answer Key</label>
                        <select name="correct_option" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-bold text-indigo-700">
                            <option value="A">Option A</option>
                            <option value="B">Option B</option>
                            <option value="C">Option C</option>
                            <option value="D">Option D</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Explanation / High-Yield Rationale</label>
                        <input type="text" name="explanation" placeholder="Rationale for why this answer is correct..." class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs">
                    </div>
                </div>
                <div class="pt-2">
                    <button type="submit" class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 flex items-center gap-2">
                        <i data-lucide="check" class="w-4 h-4"></i>
                        <span>Save Question to Bank</span>
                    </button>
                </div>
            </form>
        </div>

        <!-- Recent Questions List -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h2 class="text-base font-bold text-slate-900">Recently Added Questions (<?= count($recentQuestions) ?>)</h2>
            <div class="divide-y divide-slate-100">
                <?php if (empty($recentQuestions)): ?>
                <div class="py-8 text-center text-slate-400 text-xs">No questions in the database yet. Use the form above to add questions!</div>
                <?php else: ?>
                <?php foreach ($recentQuestions as $rq): ?>
                <div class="py-4 flex justify-between items-start gap-4">
                    <div class="space-y-1">
                        <span class="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px]"><?= htmlspecialchars($rq['course_code']) ?></span>
                        <p class="text-xs font-medium text-slate-800"><?= htmlspecialchars($rq['text']) ?></p>
                        <p class="text-[11px] text-emerald-700 font-bold">Answer: Option <?= htmlspecialchars($rq['correct_option']) ?></p>
                    </div>
                    <form method="POST" action="admin_dashboard.php">
                        <input type="hidden" name="action" value="delete_question">
                        <input type="hidden" name="question_id" value="<?= htmlspecialchars($rq['id']) ?>">
                        <button type="submit" onclick="return confirm('Delete this question?')" class="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </form>
                </div>
                <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>
    </div>
    <?php endif; ?>

    <!-- TAB 3: RESULTS -->
    <?php if ($tab === 'results'): ?>
    <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 class="text-base font-bold text-slate-900">Student Test Submissions</h2>
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
                        <th class="px-6 py-3 text-right">Inspect</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <?php if (empty($submissions)): ?>
                    <tr><td colspan="7" class="py-8 text-center text-slate-400">No test submissions yet.</td></tr>
                    <?php else: ?>
                    <?php foreach ($submissions as $sub): ?>
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
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
    <?php endif; ?>

    <!-- TAB 4: STUDENTS -->
    <?php if ($tab === 'students'): ?>
    <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 class="text-base font-bold text-slate-900">Registered Students Directory</h2>
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 border-b border-slate-200 uppercase font-bold text-slate-500">
                    <tr>
                        <th class="px-6 py-3">Name</th>
                        <th class="px-6 py-3">Matric No</th>
                        <th class="px-6 py-3">Department</th>
                        <th class="px-6 py-3">Phone</th>
                        <th class="px-6 py-3 text-center">Tests Completed</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <?php if (empty($students)): ?>
                    <tr><td colspan="5" class="py-8 text-center text-slate-400">No registered students yet.</td></tr>
                    <?php else: ?>
                    <?php foreach ($students as $st): ?>
                    <tr class="hover:bg-slate-50/70">
                        <td class="px-6 py-3 font-bold text-slate-900"><?= htmlspecialchars($st['name']) ?></td>
                        <td class="px-6 py-3 font-mono text-slate-500"><?= htmlspecialchars($st['matric_no']) ?></td>
                        <td class="px-6 py-3 text-slate-700 font-medium"><?= htmlspecialchars($st['department']) ?></td>
                        <td class="px-6 py-3 text-slate-500"><?= htmlspecialchars($st['phone'] ?? '—') ?></td>
                        <td class="px-6 py-3 text-center font-bold text-indigo-600"><?= (int)$st['tests_count'] ?></td>
                    </tr>
                    <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
    <?php endif; ?>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
