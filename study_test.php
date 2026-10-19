<?php
/**
 * Strict Proctored Knowledge Test Engine (Study Room)
 * Apex Pre-Medical Sciences Examination Portal
 */

$pageTitle = 'Session Knowledge Test';
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
$sessionNumber = (int)($_GET['session'] ?? 1);

if (!$courseId || !$topicId || $sessionNumber < 1 || $sessionNumber > 5) {
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

// Fetch Note
$noteStmt = $pdo->prepare("SELECT * FROM study_notes WHERE course_id = ? AND topic_id = ? LIMIT 1");
$noteStmt->execute([$courseId, $topicId]);
$note = $noteStmt->fetch();

if (!$note) {
    header("Location: active_study.php?course_id=" . urlencode($courseId));
    exit;
}

// Fetch Session Record
$sessionStmt = $pdo->prepare("SELECT * FROM study_note_sessions WHERE note_id = ? AND session_number = ? LIMIT 1");
$sessionStmt->execute([$note['id'], $sessionNumber]);
$sessionData = $sessionStmt->fetch();

if (!$sessionData) {
    header("Location: study_session_view.php?course_id=" . urlencode($courseId) . "&topic_id=" . urlencode($topicId));
    exit;
}

// Fetch 10 Session Questions
$questionsStmt = $pdo->prepare("SELECT * FROM study_session_questions WHERE session_id = ? ORDER BY question_number ASC");
$questionsStmt->execute([$sessionData['id']]);
$questions = $questionsStmt->fetchAll();

if (empty($questions)) {
    // If no manually curated questions exist yet, redirect back to study view with alert
    header("Location: study_session_view.php?course_id=" . urlencode($courseId) . "&topic_id=" . urlencode($topicId) . "&msg=no_questions");
    exit;
}

$csrfToken = csrf_token();
require_once __DIR__ . '/includes/header.php';
?>

<!-- ================= STRICT PROCTORED TEST ENVIRONMENT ================= -->
<div id="proctoredExamContainer" class="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col select-none overflow-hidden">

    <!-- Top Security Bar -->
    <header class="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center font-bold text-xs">
                S<?= $sessionNumber ?>
            </div>
            <div>
                <h1 class="text-sm font-black text-white leading-tight">
                    <?= htmlspecialchars($topic['name']) ?> &bull; Session <?= $sessionNumber ?> Knowledge Test
                </h1>
                <p class="text-[10px] text-teal-400 font-mono">10 Questions &bull; 90%+ Passing Score Required</p>
            </div>
        </div>

        <div class="flex items-center gap-4">
            <!-- Proctored Warning Indicator -->
            <div id="tabWarningBadge" class="hidden px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                <i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-rose-400"></i>
                <span id="tabWarningCount">0 Tab Switch Warnings</span>
            </div>

            <!-- Fullscreen Toggle Button -->
            <button type="button" onclick="toggleExamFullscreen()" class="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold text-slate-300 transition-colors flex items-center gap-1.5">
                <i data-lucide="maximize" class="w-3.5 h-3.5"></i>
                <span>Fullscreen</span>
            </button>
        </div>
    </header>

    <!-- Main Exam Body -->
    <form id="studyTestForm" method="POST" action="submit_study_test.php" class="flex-grow flex flex-col min-h-0">
        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken) ?>">
        <input type="hidden" name="course_id" value="<?= htmlspecialchars($courseId) ?>">
        <input type="hidden" name="topic_id" value="<?= htmlspecialchars($topicId) ?>">
        <input type="hidden" name="session_number" value="<?= $sessionNumber ?>">
        <input type="hidden" name="tab_switches" id="tabSwitchesInput" value="0">

        <main class="flex-grow flex flex-col md:flex-row min-h-0 overflow-hidden">

            <!-- Question Card Area -->
            <div class="flex-grow p-6 md:p-8 overflow-y-auto space-y-6">

                <?php foreach ($questions as $idx => $q):
                    $qNum = $idx + 1;
                ?>
                <div id="question_card_<?= $qNum ?>" class="question-card p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5 <?= $qNum === 1 ? '' : 'hidden' ?>">

                    <div class="flex items-center justify-between pb-3 border-b border-slate-800">
                        <span class="text-xs font-mono font-black text-teal-400 uppercase tracking-wider">
                            Question <?= $qNum ?> of <?= count($questions) ?>
                        </span>
                        <span class="text-[10px] text-slate-400 font-mono">
                            Select 1 Correct Choice
                        </span>
                    </div>

                    <!-- Question Text -->
                    <div class="text-sm sm:text-base font-bold text-white leading-relaxed">
                        <?= nl2br(htmlspecialchars($q['question_text'])) ?>
                    </div>

                    <!-- Options -->
                    <div class="grid grid-cols-1 gap-3 pt-2">
                        <?php foreach (['A' => 'option_a', 'B' => 'option_b', 'C' => 'option_c', 'D' => 'option_d'] as $optKey => $optCol):
                            if (empty($q[$optCol])) continue;
                        ?>
                        <label class="option-label p-4 rounded-2xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 hover:border-teal-500/50 transition-all cursor-pointer flex items-start gap-3 group">
                            <input type="radio" name="answers[<?= $q['id'] ?>]" value="<?= $optKey ?>" onchange="updatePalette(<?= $qNum ?>)" class="mt-1 text-teal-500 focus:ring-0">
                            <div class="text-xs sm:text-sm text-slate-200 group-hover:text-white leading-snug">
                                <span class="font-bold text-teal-400 mr-1.5"><?= $optKey ?>.</span>
                                <?= htmlspecialchars($q[$optCol]) ?>
                            </div>
                        </label>
                        <?php endforeach; ?>
                    </div>

                </div>
                <?php endforeach; ?>

            </div>

            <!-- Question Navigation Sidebar -->
            <aside class="w-full md:w-80 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-6 flex flex-col justify-between shrink-0 space-y-6">
                <div class="space-y-4">
                    <h3 class="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span>Question Palette</span>
                        <span id="answeredCountBadge" class="text-teal-400 font-mono">0/<?= count($questions) ?> Answered</span>
                    </h3>

                    <div class="grid grid-cols-5 gap-2">
                        <?php for ($q = 1; $q <= count($questions); $q++): ?>
                        <button type="button" id="palette_btn_<?= $q ?>" onclick="showQuestionCard(<?= $q ?>)" class="palette-btn py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-white font-mono font-bold text-xs transition-all">
                            <?= $q ?>
                        </button>
                        <?php endfor; ?>
                    </div>
                </div>

                <!-- Submit Button -->
                <button type="submit" onclick="return confirmSubmitTest()" class="w-full py-4 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-black text-sm transition-all shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2">
                    <i data-lucide="check-circle-2" class="w-5 h-5"></i>
                    <span>Submit Knowledge Test</span>
                </button>
            </aside>

        </main>
    </form>
</div>

<!-- Anti-Cheating & Proctored Protection Script -->
<script>
let totalQuestions = <?= count($questions) ?>;
let currentQuestion = 1;
let tabSwitches = 0;

function showQuestionCard(qNum) {
    document.querySelectorAll('.question-card').forEach(card => card.classList.add('hidden'));
    const target = document.getElementById('question_card_' + qNum);
    if (target) {
        target.classList.remove('hidden');
        currentQuestion = qNum;
    }
}

function updatePalette(qNum) {
    const btn = document.getElementById('palette_btn_' + qNum);
    if (btn) {
        btn.classList.remove('bg-slate-950', 'text-slate-400', 'border-slate-800');
        btn.classList.add('bg-teal-600', 'text-white', 'border-teal-500');
    }

    // Count answered
    const answered = document.querySelectorAll('input[type="radio"]:checked').length;
    document.getElementById('answeredCountBadge').textContent = answered + '/' + totalQuestions + ' Answered';
}

function confirmSubmitTest() {
    const answered = document.querySelectorAll('input[type="radio"]:checked').length;
    if (answered < totalQuestions) {
        return confirm('You have answered ' + answered + ' of ' + totalQuestions + ' questions. Are you sure you want to submit? (90%+ score required to pass)');
    }
    return confirm('Are you sure you want to submit your Knowledge Test?');
}

function toggleExamFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {});
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
}

// Strict Proctored Handlers (Anti-Copy, Anti-Tab Switch, Anti-ContextMenu)
document.addEventListener('DOMContentLoaded', function() {
    // Disable right click
    document.addEventListener('contextmenu', e => e.preventDefault());

    // Disable copy / paste / select
    document.addEventListener('copy', e => e.preventDefault());
    document.addEventListener('paste', e => e.preventDefault());
    document.addEventListener('cut', e => e.preventDefault());

    // Tab Switch / Visibility Warning
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            tabSwitches++;
            document.getElementById('tabSwitchesInput').value = tabSwitches;

            const badge = document.getElementById('tabWarningBadge');
            const countSpan = document.getElementById('tabWarningCount');
            if (badge && countSpan) {
                badge.classList.remove('hidden');
                countSpan.textContent = tabSwitches + ' Tab Switch Warning' + (tabSwitches > 1 ? 's' : '');
            }
        }
    });
});
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
