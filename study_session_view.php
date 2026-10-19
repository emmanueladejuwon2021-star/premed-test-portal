<?php
/**
 * Student Study Note 5-Session View Engine
 * Apex Pre-Medical Sciences Examination Portal
 */

$pageTitle = 'Topic Note Reader';
require_once __DIR__ . '/config/db.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (empty($_SESSION['student'])) {
    header('Location: login.php');
    exit;
}

$student = $_SESSION['student'];
$studentId = $student['id'];
$pdo = DB::connect();

$courseId = trim($_GET['course_id'] ?? '');
$topicId = trim($_GET['topic_id'] ?? '');

if (!$courseId || !$topicId) {
    header('Location: active_study.php');
    exit;
}

// Fetch Course & Topic details
$courseStmt = $pdo->prepare("SELECT * FROM courses WHERE id = ? LIMIT 1");
$courseStmt->execute([$courseId]);
$course = $courseStmt->fetch();

$topicStmt = $pdo->prepare("SELECT * FROM topics WHERE id = ? LIMIT 1");
$topicStmt->execute([$topicId]);
$topic = $topicStmt->fetch();

if (!$course || !$topic) {
    header('Location: active_study.php');
    exit;
}

// Fetch Study Note
$noteStmt = $pdo->prepare("SELECT * FROM study_notes WHERE course_id = ? AND topic_id = ? LIMIT 1");
$noteStmt->execute([$courseId, $topicId]);
$note = $noteStmt->fetch();

if (!$note) {
    header("Location: active_study.php?course_id=" . urlencode($courseId));
    exit;
}

// Fetch Sessions
$sessionsStmt = $pdo->prepare("SELECT * FROM study_note_sessions WHERE note_id = ? ORDER BY session_number ASC");
$sessionsStmt->execute([$note['id']]);
$sessionsList = $sessionsStmt->fetchAll();

// Map sessions by session_number (1 to 5)
$sessions = [];
foreach ($sessionsList as $s) {
    $sessions[$s['session_number']] = $s;
}

// Fetch Student Progress for this Topic
$progressStmt = $pdo->prepare("SELECT * FROM student_study_progress WHERE student_id = ? AND course_id = ? AND topic_id = ?");
$progressStmt->execute([$studentId, $courseId, $topicId]);
$progressRows = $progressStmt->fetchAll();

$progressMap = [];
foreach ($progressRows as $pr) {
    $progressMap[$pr['session_number']] = $pr;
}

// Session Unlock Rule:
// Session 1 is ALWAYS unlocked.
// Session N (2..5) is unlocked ONLY IF Session N-1 is passed with >= 90%.
$sessionStatuses = [];
for ($s = 1; $s <= 5; $s++) {
    if ($s === 1) {
        $sessionStatuses[1] = ['unlocked' => true, 'reason' => 'First Session Unlocked'];
    } else {
        $prevP = $progressMap[$s - 1] ?? null;
        $prevPassed = !empty($prevP['passed']) && (float)($prevP['best_score'] ?? 0) >= 90;
        $sessionStatuses[$s] = [
            'unlocked' => $prevPassed,
            'reason' => $prevPassed ? 'Unlocked' : "Locked (Pass Session " . ($s - 1) . " Knowledge Test with 90%+ score first)"
        ];
    }
}

// Selected Session Tab (default to first unlocked or requested)
$requestedSession = (int)($_GET['session'] ?? 1);
if ($requestedSession < 1 || $requestedSession > 5) $requestedSession = 1;

// If requested session is locked, fallback to highest unlocked session
$activeSession = $requestedSession;
if (empty($sessionStatuses[$activeSession]['unlocked'])) {
    for ($s = 5; $s >= 1; $s--) {
        if (!empty($sessionStatuses[$s]['unlocked'])) {
            $activeSession = $s;
            break;
        }
    }
}

$currentSessionData = $sessions[$activeSession] ?? null;
$currentProgress = $progressMap[$activeSession] ?? null;
$isSessionPassed = !empty($currentProgress['passed']) && (float)($currentProgress['best_score'] ?? 0) >= 90;

require_once __DIR__ . '/includes/header.php';
?>

<div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

    <!-- Back & Title Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
            <a href="active_study.php?course_id=<?= urlencode($courseId) ?>" class="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 mb-2">
                <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i> Back to Study Room Topics
            </a>
            <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-mono text-[10px] font-black uppercase">
                    <?= htmlspecialchars($course['code']) ?>
                </span>
                <span class="text-xs text-slate-400">&bull;</span>
                <span class="text-xs font-bold text-slate-500"><?= htmlspecialchars($topic['name']) ?></span>
            </div>
            <h1 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                <?= htmlspecialchars($note['title']) ?>
            </h1>
        </div>

        <div class="shrink-0 flex items-center gap-3">
            <a href="study_test.php?course_id=<?= urlencode($courseId) ?>&topic_id=<?= urlencode($topicId) ?>&session=<?= $activeSession ?>" class="px-5 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs transition-all shadow-md shadow-teal-600/20 flex items-center gap-2">
                <i data-lucide="file-check-2" class="w-4 h-4"></i>
                <span>Take Knowledge Test (Session <?= $activeSession ?>)</span>
            </a>
        </div>
    </div>

    <!-- 5 Session Stepper Navigation -->
    <div class="grid grid-cols-5 gap-2">
        <?php for ($s = 1; $s <= 5; $s++):
            $sStatus = $sessionStatuses[$s];
            $sProg = $progressMap[$s] ?? null;
            $sPassed = !empty($sProg['passed']) && (float)($sProg['best_score'] ?? 0) >= 90;
            $isCurrent = ($s === $activeSession);
        ?>
        <a href="<?= $sStatus['unlocked'] ? "study_session_view.php?course_id=" . urlencode($courseId) . "&topic_id=" . urlencode($topicId) . "&session={$s}" : "#" ?>" class="p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 <?= $isCurrent ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20' : ($sPassed ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : ($sStatus['unlocked'] ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-teal-400' : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed opacity-60')) ?>">
            <div class="flex items-center gap-1 text-[10px] font-mono font-black uppercase">
                <span>Session <?= $s ?></span>
                <?php if ($sPassed): ?>
                <i data-lucide="check-circle-2" class="w-3 h-3 text-emerald-500"></i>
                <?php elseif (!$sStatus['unlocked']): ?>
                <i data-lucide="lock" class="w-3 h-3 text-slate-400"></i>
                <?php endif; ?>
            </div>
            <span class="text-[9px] font-bold">
                <?= $sPassed ? 'Passed (' . (float)$sProg['best_score'] . '%)' : ($sStatus['unlocked'] ? 'Available' : 'Locked') ?>
            </span>
        </a>
        <?php endfor; ?>
    </div>

    <!-- Main Session Reading Material -->
    <div class="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">

        <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
            <div>
                <span class="text-[10px] font-mono font-black text-teal-600 uppercase tracking-wider">
                    Session 0<?= $activeSession ?> of 05
                </span>
                <h2 class="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    <?= htmlspecialchars($currentSessionData['title'] ?? "Session {$activeSession}: Overview & Principles") ?>
                </h2>
            </div>

            <?php if ($isSessionPassed): ?>
            <span class="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 self-start sm:self-center">
                <i data-lucide="award" class="w-4 h-4 text-emerald-600"></i> Session Mastered (+20 Coins Earned)
            </span>
            <?php endif; ?>
        </div>

        <!-- Content Body with Markdown/Formatted Support -->
        <div class="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-sm leading-relaxed space-y-4">
            <?php if (!empty($currentSessionData['content'])): ?>
            <?= nl2br(htmlspecialchars($currentSessionData['content'])) ?>
            <?php else: ?>
            <div class="p-8 text-center text-slate-400 italic">
                Note content for Session <?= $activeSession ?> is currently being curated.
            </div>
            <?php endif; ?>
        </div>

        <!-- Knowledge Test Prompt Banner at bottom of session note -->
        <div class="p-6 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-slate-900 border border-teal-200/80 dark:border-teal-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
            <div class="space-y-1 text-center sm:text-left">
                <h3 class="text-sm font-black text-slate-900 dark:text-white">
                    Ready to test your comprehension?
                </h3>
                <p class="text-xs text-slate-600 dark:text-slate-400">
                    Take the 10-question Knowledge Test for Session <?= $activeSession ?>. Score 90%+ to unlock Session <?= min(5, $activeSession + 1) ?>.
                </p>
            </div>

            <a href="study_test.php?course_id=<?= urlencode($courseId) ?>&topic_id=<?= urlencode($topicId) ?>&session=<?= $activeSession ?>" class="px-5 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs transition-all shadow-md shadow-teal-600/20 shrink-0 flex items-center gap-2">
                <i data-lucide="shield-check" class="w-4 h-4"></i>
                <span>Take Knowledge Test</span>
            </a>
        </div>

    </div>

</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
