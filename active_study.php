<?php
/**
 * Clinical Study Room Dashboard
 * Apex Pre-Medical Sciences Examination Portal
 */

$pageTitle = 'Study Room';
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

// Fetch Courses
$coursesStmt = $pdo->query("SELECT * FROM courses ORDER BY code ASC");
$courses = $coursesStmt->fetchAll();

$selectedCourseId = trim($_GET['course_id'] ?? ($courses[0]['id'] ?? ''));

// Fetch Course Coins Balance
$coinsStmt = $pdo->prepare("SELECT coins_balance FROM student_course_coins WHERE student_id = ? AND course_id = ? LIMIT 1");
$coinsStmt->execute([$studentId, $selectedCourseId]);
$coinsRow = $coinsStmt->fetch();
$currentCoins = (int)($coinsRow['coins_balance'] ?? 0);

// Fetch Topics for Selected Course
$topics = [];
if ($selectedCourseId) {
    $topicsStmt = $pdo->prepare("SELECT * FROM topics WHERE course_id = ? ORDER BY id ASC");
    $topicsStmt->execute([$selectedCourseId]);
    $topics = $topicsStmt->fetchAll();
}

// Fetch Progress for current student in selected course
$progressStmt = $pdo->prepare("SELECT * FROM student_study_progress WHERE student_id = ? AND course_id = ?");
$progressStmt->execute([$studentId, $selectedCourseId]);
$progressRows = $progressStmt->fetchAll();

$progressMap = []; // [topic_id][session_number] => progressRow
foreach ($progressRows as $pr) {
    $progressMap[$pr['topic_id']][$pr['session_number']] = $pr;
}

// Check Topic Lock/Unlock Status
// Rule: First Topic (Topic 0 in list) is ALWAYS unlocked for every course.
// Topic N is unlocked ONLY IF Topic N-1 has all 5 sessions passed with >= 90%.
$topicStatuses = [];
for ($idx = 0; $idx < count($topics); $idx++) {
    $top = $topics[$idx];
    $topId = $top['id'];

    if ($idx === 0) {
        $topicStatuses[$topId] = ['unlocked' => true, 'reason' => 'First Topic Unlocked'];
    } else {
        $prevTopId = $topics[$idx - 1]['id'];
        $prevAllPassed = true;
        for ($s = 1; $s <= 5; $s++) {
            $prevP = $progressMap[$prevTopId][$s] ?? null;
            if (empty($prevP['passed']) || (float)($prevP['best_score'] ?? 0) < 90) {
                $prevAllPassed = false;
                break;
            }
        }
        $topicStatuses[$topId] = [
            'unlocked' => $prevAllPassed,
            'reason' => $prevAllPassed ? 'Unlocked' : 'Locked (Complete previous topic note first)'
        ];
    }
}

require_once __DIR__ . '/includes/header.php';
?>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

    <!-- Header & Course Coin Banner -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-br from-teal-900 via-slate-900 to-teal-950 p-6 sm:p-8 rounded-3xl border border-teal-800/40 shadow-xl text-white relative overflow-hidden">
        <div class="absolute -right-10 -top-10 w-60 h-60 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="space-y-2 relative z-10">
            <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-400/30 font-mono text-[10px] font-black uppercase tracking-wider">
                    Interactive Clinical Study
                </span>
                <span class="text-xs text-slate-300">&bull; 5-Session Mastery Engine</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-white">PreMed Knowledge Study Room</h1>
            <p class="text-xs text-slate-300 leading-relaxed max-w-xl">
                Read topic notes section by section and complete strict 10-question Knowledge Tests (90%+ score required) to unlock the next session and earn 20 coins per test.
            </p>
        </div>

        <!-- Course Coins Card -->
        <div class="shrink-0 bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 flex items-center gap-4 relative z-10">
            <div class="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center font-bold text-xl shadow-lg shadow-amber-500/10">
                🪙
            </div>
            <div>
                <span class="text-[10px] uppercase font-black tracking-wider text-teal-200">Course Coins Earned</span>
                <div class="text-2xl font-black text-white font-mono"><?= number_format($currentCoins) ?> <span class="text-xs font-normal text-amber-300">Coins</span></div>
            </div>
        </div>
    </div>

    <!-- Course Selector Tabs -->
    <div class="space-y-3">
        <h2 class="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <i data-lucide="book-open" class="w-4 h-4 text-teal-600"></i>
            <span>Select Course Syllabus</span>
        </h2>

        <div class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <?php foreach ($courses as $c):
                $isSelected = ($c['id'] === $selectedCourseId);
            ?>
            <a href="active_study.php?course_id=<?= urlencode($c['id']) ?>" class="px-4 py-3 rounded-2xl border text-xs font-bold transition-all shrink-0 flex items-center gap-2.5 <?= $isSelected ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-teal-400' ?>">
                <span class="font-mono text-xs"><?= htmlspecialchars($c['code']) ?></span>
                <span class="text-[11px] opacity-90 hidden sm:inline"><?= htmlspecialchars($c['title']) ?></span>
            </a>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- Topic Note Cards Grid -->
    <div class="space-y-4">
        <div>
            <h2 class="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Curriculum Topic Notes &amp; Progress
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Topic 1 note is unlocked by default. Score 90%+ in all 5 session tests to unlock subsequent topic notes.</p>
        </div>

        <?php if (empty($topics)): ?>
        <div class="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
            <i data-lucide="book-open" class="w-8 h-8 text-slate-400 mx-auto"></i>
            <p class="text-xs font-bold text-slate-600 dark:text-slate-300">No topics configured for this course yet.</p>
        </div>
        <?php else: ?>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <?php foreach ($topics as $idx => $t):
                $tId = $t['id'];
                $tStatus = $topicStatuses[$tId] ?? ['unlocked' => false, 'reason' => 'Locked'];
                $isUnlocked = $tStatus['unlocked'];

                // Check note exists in DB
                $nStmt = $pdo->prepare("SELECT id, title FROM study_notes WHERE course_id = ? AND topic_id = ? LIMIT 1");
                $nStmt->execute([$selectedCourseId, $tId]);
                $noteRow = $nStmt->fetch();
                $hasNote = !empty($noteRow);
            ?>
            <div class="p-6 rounded-3xl border transition-all flex flex-col justify-between space-y-6 relative overflow-hidden <?= $isUnlocked ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs hover:border-teal-400' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800/60 opacity-80' ?>">

                <div class="space-y-3">
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded-md <?= $isUnlocked ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400' ?>">
                            Topic <?= $idx + 1 ?>
                        </span>

                        <?php if ($isUnlocked): ?>
                        <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                            <i data-lucide="unlock" class="w-3 h-3"></i> Unlocked
                        </span>
                        <?php else: ?>
                        <span class="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/60 flex items-center gap-1">
                            <i data-lucide="lock" class="w-3 h-3"></i> Locked
                        </span>
                        <?php endif; ?>
                    </div>

                    <h3 class="text-base font-black text-slate-900 dark:text-white leading-snug">
                        <?= htmlspecialchars($t['name']) ?>
                    </h3>

                    <?php if (!$hasNote): ?>
                    <p class="text-xs text-slate-400 dark:text-slate-500 italic">
                        No study note published for this topic yet.
                    </p>
                    <?php endif; ?>
                </div>

                <!-- 5 Session Progress Indicators -->
                <div class="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Session Mastery Progress (5 Sessions)
                    </span>

                    <div class="grid grid-cols-5 gap-1.5">
                        <?php for ($s = 1; $s <= 5; $s++):
                            $sProg = $progressMap[$tId][$s] ?? null;
                            $sPassed = !empty($sProg['passed']) && (float)($sProg['best_score'] ?? 0) >= 90;
                            $sAttempts = (int)($sProg['attempts'] ?? 0);
                        ?>
                        <div title="Session <?= $s ?>: <?= $sPassed ? 'Passed (' . (float)$sProg['best_score'] . '%)' : ($sAttempts > 0 ? 'Failed (' . (float)$sProg['best_score'] . '%)' : 'Not Attempted') ?>" class="py-1.5 rounded-lg border text-center font-mono text-[10px] font-bold <?= $sPassed ? 'bg-emerald-500 text-white border-emerald-600' : ($sAttempts > 0 ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700') ?>">
                            S<?= $s ?>
                        </div>
                        <?php endfor; ?>
                    </div>
                </div>

                <!-- Action Button -->
                <div class="pt-2">
                    <?php if ($isUnlocked && $hasNote): ?>
                    <a href="study_session_view.php?course_id=<?= urlencode($selectedCourseId) ?>&topic_id=<?= urlencode($tId) ?>" class="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs">
                        <i data-lucide="book-open" class="w-4 h-4"></i>
                        <span>Open Topic Note Sessions</span>
                    </a>
                    <?php elseif (!$isUnlocked): ?>
                    <button disabled class="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-xs cursor-not-allowed flex items-center justify-center gap-2">
                        <i data-lucide="lock" class="w-4 h-4"></i>
                        <span>Locked (Complete Topic <?= $idx ?> First)</span>
                    </button>
                    <?php else: ?>
                    <button disabled class="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-xs cursor-not-allowed">
                        <span>Note Unavailable</span>
                    </button>
                    <?php endif; ?>
                </div>

            </div>
            <?php endforeach; ?>
        </div>

        <?php endif; ?>
    </div>

</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
