<?php
/**
 * Standalone Admin Study Note Manager
 * Apex Pre-Medical Sciences Examination Portal
 */

$pageTitle = 'Study Note Manager';
require_once __DIR__ . '/config/db.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (empty($_SESSION['admin'])) {
    header('Location: login.php?tab=admin');
    exit;
}

$pdo = DB::connect();
$message = '';
$error = '';

$courseId = trim($_GET['course_id'] ?? '');
$topicId = trim($_GET['topic_id'] ?? '');

// Fetch list of courses
$coursesStmt = $pdo->query("SELECT * FROM courses ORDER BY code ASC");
$courses = $coursesStmt->fetchAll();

if (!$courseId && !empty($courses)) {
    $courseId = $courses[0]['id'];
}

// Fetch topics for selected course
$topics = [];
if ($courseId) {
    $topicsStmt = $pdo->prepare("SELECT * FROM topics WHERE course_id = ? ORDER BY id ASC");
    $topicsStmt->execute([$courseId]);
    $topics = $topicsStmt->fetchAll();
}

if (!$topicId && !empty($topics)) {
    $topicId = $topics[0]['id'];
}

// Handle POST actions: Create/Update Note Sessions & 10 Questions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'save_note_sessions') {
        $pCourseId = trim($_POST['course_id'] ?? '');
        $pTopicId = trim($_POST['topic_id'] ?? '');
        $noteTitle = trim($_POST['note_title'] ?? '');

        if (!$pCourseId || !$pTopicId || !$noteTitle) {
            $error = 'Please provide Course, Topic, and Note Title.';
        } else {
            try {
                // Ensure note record exists
                $nStmt = $pdo->prepare("SELECT id FROM study_notes WHERE course_id = ? AND topic_id = ? LIMIT 1");
                $nStmt->execute([$pCourseId, $pTopicId]);
                $note = $nStmt->fetch();

                if (!$note) {
                    $noteId = 'note_' . uniqid();
                    $insN = $pdo->prepare("INSERT INTO study_notes (id, course_id, topic_id, title) VALUES (?, ?, ?, ?)");
                    $insN->execute([$noteId, $pCourseId, $pTopicId, $noteTitle]);
                } else {
                    $noteId = $note['id'];
                    $updN = $pdo->prepare("UPDATE study_notes SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
                    $updN->execute([$noteTitle, $noteId]);
                }

                // Process Sessions 1 to 5
                for ($s = 1; $s <= 5; $s++) {
                    $sTitle = trim($_POST["session_{$s}_title"] ?? "Session {$s}");
                    $sContent = trim($_POST["session_{$s}_content"] ?? '');

                    $sStmt = $pdo->prepare("SELECT id FROM study_note_sessions WHERE note_id = ? AND session_number = ? LIMIT 1");
                    $sStmt->execute([$noteId, $s]);
                    $sess = $sStmt->fetch();

                    if (!$sess) {
                        $sessionId = 'sess_' . uniqid();
                        $insS = $pdo->prepare("INSERT INTO study_note_sessions (id, note_id, session_number, title, content) VALUES (?, ?, ?, ?, ?)");
                        $insS->execute([$sessionId, $noteId, $s, $sTitle, $sContent]);
                    } else {
                        $sessionId = $sess['id'];
                        $updS = $pdo->prepare("UPDATE study_note_sessions SET title = ?, content = ? WHERE id = ?");
                        $updS->execute([$sTitle, $sContent, $sessionId]);
                    }

                    // Process Questions 1 to 10 for Session s
                    for ($q = 1; $q <= 10; $q++) {
                        $qText = trim($_POST["q_{$s}_{$q}_text"] ?? '');
                        $qA = trim($_POST["q_{$s}_{$q}_a"] ?? '');
                        $qB = trim($_POST["q_{$s}_{$q}_b"] ?? '');
                        $qC = trim($_POST["q_{$s}_{$q}_c"] ?? '');
                        $qD = trim($_POST["q_{$s}_{$q}_d"] ?? '');
                        $qCorrect = strtoupper(trim($_POST["q_{$s}_{$q}_correct"] ?? 'A'));
                        $qExp = trim($_POST["q_{$s}_{$q}_exp"] ?? '');

                        if ($qText && $qA && $qB && $qCorrect) {
                            $qCheck = $pdo->prepare("SELECT id FROM study_session_questions WHERE session_id = ? AND question_number = ? LIMIT 1");
                            $qCheck->execute([$sessionId, $q]);
                            $qRow = $qCheck->fetch();

                            if (!$qRow) {
                                $insQ = $pdo->prepare("INSERT INTO study_session_questions (id, session_id, question_number, question_text, option_a, option_b, option_c, option_d, correct_option, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                                $insQ->execute(['q_' . uniqid(), $sessionId, $q, $qText, $qA, $qB, $qC, $qD, $qCorrect, $qExp]);
                            } else {
                                $updQ = $pdo->prepare("UPDATE study_session_questions SET question_text = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_option = ?, explanation = ? WHERE id = ?");
                                $updQ->execute([$qText, $qA, $qB, $qC, $qD, $qCorrect, $qExp, $qRow['id']]);
                            }
                        }
                    }
                }

                $message = 'Study note and 5-session knowledge test questions saved successfully!';
                $courseId = $pCourseId;
                $topicId = $pTopicId;
            } catch (Exception $e) {
                $error = 'Error saving note: ' . $e->getMessage();
            }
        }
    }
}

// Fetch Existing Note data for current Course & Topic
$existingNote = null;
$sessionsData = [];
if ($courseId && $topicId) {
    $nStmt = $pdo->prepare("SELECT * FROM study_notes WHERE course_id = ? AND topic_id = ? LIMIT 1");
    $nStmt->execute([$courseId, $topicId]);
    $existingNote = $nStmt->fetch();

    if ($existingNote) {
        for ($s = 1; $s <= 5; $s++) {
            $sStmt = $pdo->prepare("SELECT * FROM study_note_sessions WHERE note_id = ? AND session_number = ? LIMIT 1");
            $sStmt->execute([$existingNote['id'], $s]);
            $sess = $sStmt->fetch();

            $qList = [];
            if ($sess) {
                $qStmt = $pdo->prepare("SELECT * FROM study_session_questions WHERE session_id = ? ORDER BY question_number ASC");
                $qStmt->execute([$sess['id']]);
                $qList = $qStmt->fetchAll();
            }

            $sessionsData[$s] = [
                'session' => $sess,
                'questions' => $qList
            ];
        }
    }
}

require_once __DIR__ . '/includes/header.php';
?>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

    <!-- Header Banner -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
            <div class="flex items-center gap-2">
                <a href="admin_dashboard.php" class="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1">
                    <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i> Admin Dashboard
                </a>
                <span class="text-slate-300">&bull;</span>
                <span class="text-xs font-bold text-slate-500 uppercase">Study Room Manager</span>
            </div>
            <h1 class="text-2xl font-black text-slate-900 dark:text-white mt-1">Topic Note &amp; Session Test Manager</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage 5-session reading notes and manually configure 10 Knowledge Test questions per session.</p>
        </div>

        <div class="flex items-center gap-2">
            <a href="admin_study_leaderboard.php" class="px-4 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center gap-2">
                <i data-lucide="trophy" class="w-4 h-4 text-indigo-600"></i>
                <span>Study Room Leaderboard</span>
            </a>
        </div>
    </div>

    <?php if ($message): ?>
    <div class="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
        <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i>
        <span><?= htmlspecialchars($message) ?></span>
    </div>
    <?php endif; ?>

    <?php if ($error): ?>
    <div class="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
        <i data-lucide="alert-triangle" class="w-4 h-4 text-rose-600"></i>
        <span><?= htmlspecialchars($error) ?></span>
    </div>
    <?php endif; ?>

    <!-- Course & Topic Selector Bar -->
    <div class="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <form method="GET" action="admin_study_notes.php" class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Select Course</label>
                <select name="course_id" onchange="this.form.submit()" class="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800">
                    <?php foreach ($courses as $c): ?>
                    <option value="<?= htmlspecialchars($c['id']) ?>" <?= $c['id'] === $courseId ? 'selected' : '' ?>>
                        <?= htmlspecialchars($c['code'] . ' - ' . $c['title']) ?>
                    </option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Select Topic</label>
                <select name="topic_id" onchange="this.form.submit()" class="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800">
                    <?php foreach ($topics as $t): ?>
                    <option value="<?= htmlspecialchars($t['id']) ?>" <?= $t['id'] === $topicId ? 'selected' : '' ?>>
                        <?= htmlspecialchars($t['name']) ?>
                    </option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div>
                <button type="submit" class="w-full px-4 py-2.5 rounded-2xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 transition-colors shadow-xs">
                    Load Topic Note
                </button>
            </div>
        </form>
    </div>

    <!-- Main Note & 5-Session Editor -->
    <form method="POST" action="admin_study_notes.php" class="space-y-6">
        <input type="hidden" name="action" value="save_note_sessions">
        <input type="hidden" name="course_id" value="<?= htmlspecialchars($courseId) ?>">
        <input type="hidden" name="topic_id" value="<?= htmlspecialchars($topicId) ?>">

        <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h2 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <i data-lucide="book-open" class="w-4 h-4 text-teal-600"></i>
                <span>Main Topic Note Title</span>
            </h2>
            <input type="text" name="note_title" required value="<?= htmlspecialchars($existingNote['title'] ?? 'Comprehensive Study Note: ' . ($topics[0]['name'] ?? 'Topic 1')) ?>" placeholder="e.g. Fundamental Principles & Concepts" class="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500">
        </div>

        <!-- 5 Session Accordions / Sections -->
        <?php for ($s = 1; $s <= 5; $s++):
            $sData = $sessionsData[$s] ?? null;
            $sSession = $sData['session'] ?? null;
            $sQuestions = $sData['questions'] ?? [];
        ?>
        <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-mono font-black text-xs flex items-center justify-center">
                        0<?= $s ?>
                    </span>
                    <div>
                        <h3 class="text-sm font-black text-slate-900 dark:text-white">Session <?= $s ?> Reading &amp; Knowledge Test</h3>
                        <p class="text-[11px] text-slate-500">Note content and 10 manually created quiz questions for Session <?= $s ?></p>
                    </div>
                </div>
                <span class="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-[10px] font-black uppercase">
                    Session <?= $s ?> / 5
                </span>
            </div>

            <!-- Session Title & Content -->
            <div class="grid grid-cols-1 gap-4">
                <div>
                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Session <?= $s ?> Sub-Title</label>
                    <input type="text" name="session_<?= $s ?>_title" value="<?= htmlspecialchars($sSession['title'] ?? "Session {$s}: Overview & Key Principles") ?>" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Session <?= $s ?> Reading Content (Markdown &amp; KaTeX supported)</label>
                    <textarea name="session_<?= $s ?>_content" rows="6" placeholder="Enter high-yield study material for session <?= $s ?>..." class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 font-mono"><?= htmlspecialchars($sSession['content'] ?? '') ?></textarea>
                </div>
            </div>

            <!-- Session 10 Knowledge Test Questions -->
            <div class="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <h4 class="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <i data-lucide="help-circle" class="w-4 h-4 text-indigo-600"></i>
                    <span>Session <?= $s ?> Knowledge Test Questions (10 Questions Required)</span>
                </h4>

                <div class="grid grid-cols-1 gap-4">
                    <?php for ($q = 1; $q <= 10; $q++):
                        $qData = $sQuestions[$q - 1] ?? null;
                    ?>
                    <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">Q<?= $q ?> of 10</span>
                            <span class="text-[10px] text-slate-400">Required for 90%+ pass check</span>
                        </div>

                        <div>
                            <input type="text" name="q_<?= $s ?>_<?= $q ?>_text" value="<?= htmlspecialchars($qData['question_text'] ?? '') ?>" placeholder="Question <?= $q ?> prompt..." class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <input type="text" name="q_<?= $s ?>_<?= $q ?>_a" value="<?= htmlspecialchars($qData['option_a'] ?? '') ?>" placeholder="Option A" class="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                            <input type="text" name="q_<?= $s ?>_<?= $q ?>_b" value="<?= htmlspecialchars($qData['option_b'] ?? '') ?>" placeholder="Option B" class="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                            <input type="text" name="q_<?= $s ?>_<?= $q ?>_c" value="<?= htmlspecialchars($qData['option_c'] ?? '') ?>" placeholder="Option C" class="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                            <input type="text" name="q_<?= $s ?>_<?= $q ?>_d" value="<?= htmlspecialchars($qData['option_d'] ?? '') ?>" placeholder="Option D" class="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Correct Choice</label>
                                <select name="q_<?= $s ?>_<?= $q ?>_correct" class="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200">
                                    <option value="A" <?= ($qData['correct_option'] ?? '') === 'A' ? 'selected' : '' ?>>Option A</option>
                                    <option value="B" <?= ($qData['correct_option'] ?? '') === 'B' ? 'selected' : '' ?>>Option B</option>
                                    <option value="C" <?= ($qData['correct_option'] ?? '') === 'C' ? 'selected' : '' ?>>Option C</option>
                                    <option value="D" <?= ($qData['correct_option'] ?? '') === 'D' ? 'selected' : '' ?>>Option D</option>
                                </select>
                            </div>
                            <div class="sm:col-span-2">
                                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Explanation</label>
                                <input type="text" name="q_<?= $s ?>_<?= $q ?>_exp" value="<?= htmlspecialchars($qData['explanation'] ?? '') ?>" placeholder="Explanation for correct answer..." class="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200">
                            </div>
                        </div>
                    </div>
                    <?php endfor; ?>
                </div>
            </div>
        </div>
        <?php endfor; ?>

        <div class="pt-4">
            <button type="submit" class="w-full py-4 rounded-3xl bg-teal-600 text-white font-black text-sm hover:bg-teal-700 transition-all shadow-md shadow-teal-600/20 flex items-center justify-center gap-2">
                <i data-lucide="save" class="w-5 h-5"></i>
                <span>Save Note &amp; All 5 Session Knowledge Tests</span>
            </button>
        </div>
    </form>

</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
