<?php
/**
 * Submit & Grade Study Session Knowledge Test
 * Apex Pre-Medical Sciences Examination Portal
 */

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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: active_study.php');
    exit;
}

$courseId = trim($_POST['course_id'] ?? '');
$topicId = trim($_POST['topic_id'] ?? '');
$sessionNumber = (int)($_POST['session_number'] ?? 1);
$userAnswers = $_POST['answers'] ?? []; // [question_id => selected_option]

if (!$courseId || !$topicId || $sessionNumber < 1 || $sessionNumber > 5) {
    header('Location: active_study.php');
    exit;
}

// Fetch Note & Session
$noteStmt = $pdo->prepare("SELECT id FROM study_notes WHERE course_id = ? AND topic_id = ? LIMIT 1");
$noteStmt->execute([$courseId, $topicId]);
$note = $noteStmt->fetch();

if (!$note) {
    header("Location: active_study.php");
    exit;
}

$sessionStmt = $pdo->prepare("SELECT id FROM study_note_sessions WHERE note_id = ? AND session_number = ? LIMIT 1");
$sessionStmt->execute([$note['id'], $sessionNumber]);
$sessionData = $sessionStmt->fetch();

if (!$sessionData) {
    header("Location: active_study.php");
    exit;
}

// Fetch 10 Session Questions
$questionsStmt = $pdo->prepare("SELECT * FROM study_session_questions WHERE session_id = ?");
$questionsStmt->execute([$sessionData['id']]);
$questions = $questionsStmt->fetchAll();

$totalQuestions = count($questions);
if ($totalQuestions === 0) {
    header("Location: study_session_view.php?course_id=" . urlencode($courseId) . "&topic_id=" . urlencode($topicId));
    exit;
}

// Grade test
$correctCount = 0;
foreach ($questions as $q) {
    $qId = $q['id'];
    $selected = strtoupper(trim($userAnswers[$qId] ?? ''));
    if ($selected && $selected === strtoupper(trim($q['correct_option']))) {
        $correctCount++;
    }
}

$scorePercentage = round(($correctCount / $totalQuestions) * 100, 1);
$isPassed = ($scorePercentage >= 90);

// Check existing progress
$progCheck = $pdo->prepare("SELECT * FROM student_study_progress WHERE student_id = ? AND course_id = ? AND topic_id = ? AND session_number = ? LIMIT 1");
$progCheck->execute([$studentId, $courseId, $topicId, $sessionNumber]);
$existingProg = $progCheck->fetch();

$attempts = (int)($existingProg['attempts'] ?? 0) + 1;
$prevBestScore = (float)($existingProg['best_score'] ?? 0);
$newBestScore = max($prevBestScore, $scorePercentage);
$prevPassed = !empty($existingProg['passed']) && $prevBestScore >= 90;

$firstTryPass = (int)($existingProg['first_try_pass'] ?? 0);
if ($attempts === 1 && $isPassed) {
    $firstTryPass = 1;
}

// Coins Awarding Rule:
// +20 coins ONLY on first successful completion (first time score >= 90%).
$coinsToAward = 0;
if ($isPassed && !$prevPassed) {
    $coinsToAward = 20;
}

if (!$existingProg) {
    $insProg = $pdo->prepare("INSERT INTO student_study_progress (id, student_id, course_id, topic_id, session_number, passed, best_score, attempts, first_try_pass, coins_awarded, unlocked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)");
    $insProg->execute(['sp_' . uniqid(), $studentId, $courseId, $topicId, $sessionNumber, $isPassed ? 1 : 0, $newBestScore, $attempts, $firstTryPass, $coinsToAward]);
} else {
    $alreadyAwarded = (int)($existingProg['coins_awarded'] ?? 0);
    $finalAwarded = $alreadyAwarded + $coinsToAward;

    $updProg = $pdo->prepare("UPDATE student_study_progress SET passed = ?, best_score = ?, attempts = ?, first_try_pass = ?, coins_awarded = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
    $updProg->execute([($isPassed || $prevPassed) ? 1 : 0, $newBestScore, $attempts, $firstTryPass, $finalAwarded, $existingProg['id']]);
}

// Update Course Coins Balance if awarded
if ($coinsToAward > 0) {
    $coinStmt = $pdo->prepare("SELECT coins_balance FROM student_course_coins WHERE student_id = ? AND course_id = ? LIMIT 1");
    $coinStmt->execute([$studentId, $courseId]);
    $coinRow = $coinStmt->fetch();

    if (!$coinRow) {
        $insCoin = $pdo->prepare("INSERT INTO student_course_coins (id, student_id, course_id, coins_balance) VALUES (?, ?, ?, ?)");
        $insCoin->execute(['cc_' . uniqid(), $studentId, $courseId, $coinsToAward]);
    } else {
        $updCoin = $pdo->prepare("UPDATE student_course_coins SET coins_balance = coins_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE student_id = ? AND course_id = ?");
        $updCoin->execute([$coinsToAward, $studentId, $courseId]);
    }
}

// Render Result View
$pageTitle = 'Knowledge Test Result';
require_once __DIR__ . '/includes/header.php';
?>

<div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

    <div class="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6">

        <?php if ($isPassed): ?>
        <div class="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-emerald-500/10">
            🏆
        </div>
        <div class="space-y-2">
            <span class="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono text-xs font-black uppercase tracking-wider">
                Passed &bull; 90%+ Mastery Achieved
            </span>
            <h1 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Congratulations! Session Passed</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                You scored <strong class="text-emerald-600 dark:text-emerald-400 font-mono"><?= $scorePercentage ?>%</strong> (<?= $correctCount ?>/<?= $totalQuestions ?> correct).
                <?= $sessionNumber < 5 ? 'Session ' . ($sessionNumber + 1) . ' is now unlocked for you!' : 'You have completed all 5 sessions of this topic note!' ?>
            </p>
        </div>

        <?php if ($coinsToAward > 0): ?>
        <div class="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs font-bold flex items-center justify-center gap-2">
            <span class="text-lg">🪙</span>
            <span>+20 Course Coins Awarded!</span>
        </div>
        <?php endif; ?>

        <?php else: ?>
        <div class="w-20 h-20 rounded-3xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-rose-500/10">
            ⚠️
        </div>
        <div class="space-y-2">
            <span class="px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-mono text-xs font-black uppercase tracking-wider">
                Pass Mark Not Reached (Requires 90%+)
            </span>
            <h1 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Keep Trying! Score: <?= $scorePercentage ?>%</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                You answered <?= $correctCount ?> out of <?= $totalQuestions ?> questions correctly. You must achieve at least 90% to unlock the next session.
            </p>
        </div>
        <?php endif; ?>

        <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="study_test.php?course_id=<?= urlencode($courseId) ?>&topic_id=<?= urlencode($topicId) ?>&session=<?= $sessionNumber ?>" class="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors">
                Retry Session <?= $sessionNumber ?> Test
            </a>

            <a href="study_session_view.php?course_id=<?= urlencode($courseId) ?>&topic_id=<?= urlencode($topicId) ?>&session=<?= $isPassed ? min(5, $sessionNumber + 1) : $sessionNumber ?>" class="w-full sm:w-auto px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs transition-colors shadow-md shadow-teal-600/20">
                <?= $isPassed ? ($sessionNumber < 5 ? 'Proceed to Session ' . ($sessionNumber + 1) : 'Back to Topic Overview') : 'Return to Reading Note' ?>
            </a>
        </div>

    </div>

</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
