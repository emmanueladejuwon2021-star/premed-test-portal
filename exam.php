<?php
/**
 * Prometric / Board Examination CBT Simulation Environment - Enterprise Production Edition
 * Apex Pre-Medical Sciences Examination Council (PMSEC)
 */

$pageTitle = 'Proctored Examination Administration';
require_once __DIR__ . '/config/db.php';

$db = DB::connect();

$testId = $_GET['test_id'] ?? '';
$test = null;

$courseId = $_GET['course_id'] ?? '';
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
$duration = isset($_GET['duration']) ? (int)$_GET['duration'] : 30;
$topicFilters = $_GET['topics'] ?? [];

// If test_id is provided, load specific test settings & course
if (!empty($testId)) {
    $tStmt = $db->prepare("SELECT * FROM tests WHERE id = ? LIMIT 1");
    $tStmt->execute([$testId]);
    $test = $tStmt->fetch();
    if ($test) {
        $courseId = $test['course_id'];
        $limit = (int)$test['question_limit'];
        $duration = (int)$test['duration'];
        $rawTopics = json_decode($test['topic_ids'] ?? '[]', true);
        if (!empty($rawTopics) && is_array($rawTopics) && !in_array('ALL', $rawTopics)) {
            $topicFilters = $rawTopics;
        }
    }
}

if (empty($courseId)) {
    header('Location: courses.php');
    exit;
}

// 1. Fetch Course details
$cStmt = $db->prepare("SELECT * FROM courses WHERE id = ? LIMIT 1");
$cStmt->execute([$courseId]);
$course = $cStmt->fetch();

if (!$course) {
    die("Accredited Examination Course not found.");
}

// 2. Fetch Questions from Turso DB
if (!empty($topicFilters) && is_array($topicFilters)) {
    $placeholders = implode(',', array_fill(0, count($topicFilters), '?'));
    $qStmt = $db->prepare("SELECT * FROM questions WHERE topic_id IN ($placeholders)");
    $qStmt->execute($topicFilters);
    $questions = $qStmt->fetchAll();
} else {
    $qStmt = $db->prepare("
        SELECT q.* 
        FROM questions q
        JOIN topics t ON q.topic_id = t.id
        WHERE t.course_id = ?
    ");
    $qStmt->execute([$courseId]);
    $questions = $qStmt->fetchAll();
}

if (empty($questions)) {
    require_once __DIR__ . '/includes/header.php';
    echo "<div class='max-w-md mx-auto p-8 my-12 bg-white rounded-3xl border border-slate-200 text-center space-y-3 shadow-xs'>
        <div class='w-12 h-12 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center'><i data-lucide='help-circle' class='w-6 h-6'></i></div>
        <h2 class='text-base font-bold text-slate-800'>No Questions Available Yet</h2>
        <p class='text-xs text-slate-500'>There are currently no questions added to this test. Please check back later or contact your instructor.</p>
        <a href='courses.php' class='inline-block px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors'>Return to Tests</a>
    </div>";
    require_once __DIR__ . '/includes/footer.php';
    exit;
}

// 3. Security & Test Administration Settings
$antiCheatBlur = 1;
$enforceFullscreen = 1;
$maxTabSwitches = 3;
$watermarkEnabled = 1;
$autoSubmit = 1;
$calculatorAllowed = 1;
$shuffleQuestions = 1;
$shuffleOptions = 1;

try {
    $sStmt = $db->query("SELECT key_name, value FROM settings");
    $sRows = $sStmt ? $sStmt->fetchAll() : [];
    $sMap = [];
    foreach ($sRows as $row) $sMap[$row['key_name']] = $row['value'];
    if (isset($sMap['anti_cheat_blur'])) $antiCheatBlur = (int)$sMap['anti_cheat_blur'];
    if (isset($sMap['enforce_fullscreen'])) $enforceFullscreen = (int)$sMap['enforce_fullscreen'];
    if (isset($sMap['max_tab_switches'])) $maxTabSwitches = (int)$sMap['max_tab_switches'];
    if (isset($sMap['watermark_enabled'])) $watermarkEnabled = (int)$sMap['watermark_enabled'];
} catch (Exception $e) {}

// Test-specific overrides (per-test settings supersede global defaults if $test is loaded)
if ($test) {
    if (isset($test['enforce_fullscreen'])) $enforceFullscreen = (int)$test['enforce_fullscreen'];
    if (isset($test['max_tab_switches'])) $maxTabSwitches = (int)$test['max_tab_switches'];
    if (isset($test['auto_submit'])) $autoSubmit = (int)$test['auto_submit'];
    if (isset($test['calculator_allowed'])) $calculatorAllowed = (int)$test['calculator_allowed'];
    if (isset($test['shuffle_questions'])) $shuffleQuestions = (int)$test['shuffle_questions'];
    if (isset($test['shuffle_options'])) $shuffleOptions = (int)$test['shuffle_options'];
}

// Randomize and constrain to item volume limit
if ($shuffleQuestions) {
    shuffle($questions);
}
if (count($questions) > $limit) {
    $questions = array_slice($questions, 0, $limit);
}

// Strip ground-truth key for client-side security
$clientQuestions = [];
foreach ($questions as $idx => $q) {
    $clientQuestions[] = [
        'index' => $idx,
        'id' => $q['id'],
        'text' => $q['text'],
        'a' => $q['a'],
        'b' => $q['b'],
        'c' => $q['c'],
        'd' => $q['d'],
        'diagram_url' => $q['diagram_url']
    ];
}

$student = $_SESSION['student'] ?? null;
if (!$student) {
    header('Location: login.php');
    exit;
}

$sessionId = bin2hex(random_bytes(12));
$totalQuestions = count($clientQuestions);

// Register active session in Turso cloud DB
try {
    $sessStmt = $db->prepare("
        INSERT OR REPLACE INTO exam_sessions (
            id, student_id, matric_no, student_name, course_id, course_code, status, tab_switches, cheating_log, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'IN_PROGRESS', 0, '[]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ");
    $sessStmt->execute([
        $sessionId,
        $student['id'],
        $student['matric_no'],
        $student['name'],
        $course['id'],
        $course['code']
    ]);
} catch (Exception $e) {}

require_once __DIR__ . '/includes/header.php';
?>

<div class="max-w-5xl mx-auto px-3 sm:px-4 py-4 space-y-3.5" id="examApp">

    <!-- 1. Test Header & Timer -->
    <div class="bg-slate-900 text-white rounded-2xl p-3 sm:p-3.5 border border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-3 sticky top-14 z-30">
        <!-- Left: Course Code & Question Tracking -->
        <div class="flex items-center gap-2.5 min-w-0">
            <span class="text-xs font-black uppercase text-teal-300 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800 font-mono shrink-0">
                <?= htmlspecialchars($course['code']) ?>
            </span>
            <span class="text-xs font-bold text-slate-200 truncate hidden sm:inline max-w-[170px]">
                <?= htmlspecialchars($course['title']) ?>
            </span>
            <span class="text-xs text-slate-500 font-semibold">&bull;</span>
            <span class="text-xs font-extrabold text-teal-400 bg-slate-800 px-2.5 py-0.5 rounded-lg font-mono" id="progressIndicator">
                Question 1 of <?= $totalQuestions ?>
            </span>
        </div>

        <!-- Center: Countdown Clock Pill -->
        <div id="timerContainer" class="px-3.5 py-1.5 rounded-xl bg-slate-950 text-white font-mono font-bold text-xs flex items-center gap-2 border border-slate-800 shadow-inner">
            <i data-lucide="timer" class="w-3.5 h-3.5 text-teal-400"></i>
            <span id="timerDisplay">--:--</span>
        </div>

        <!-- Right: Tools & Submit -->
        <div class="flex items-center gap-1.5">
            <button type="button" onclick="speakCurrentQuestion()" title="Read question out loud" class="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-teal-300 hover:bg-slate-750 transition-colors">
                <i data-lucide="volume-2" class="w-4 h-4"></i>
            </button>
            <?php if ($calculatorAllowed): ?>
            <button type="button" onclick="toggleCalculator()" title="Calculator" class="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-teal-300 hover:bg-slate-750 transition-colors">
                <i data-lucide="calculator" class="w-4 h-4"></i>
            </button>
            <?php endif; ?>
            <button type="button" onclick="toggleFontSize()" title="Text size" class="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-teal-300 hover:bg-slate-750 transition-colors font-bold text-xs">
                A<span class="text-[10px]">±</span>
            </button>
            <button type="button" onclick="confirmSubmit()" class="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-colors flex items-center gap-1.5 ml-1">
                <i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i>
                <span>Submit Test</span>
            </button>
        </div>
    </div>

    <!-- 2. Test Workspace -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-3.5">

        <!-- LEFT STAGE: Question & Choices (8 cols on lg) -->
        <div class="lg:col-span-8 space-y-3">
            <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between min-h-[460px]">
                <div>
                    <!-- Question Header & Flag Button -->
                    <div class="flex justify-between items-center pb-3 mb-3 border-b border-slate-100">
                        <span class="text-xs font-black uppercase tracking-wider text-teal-700 font-mono" id="questionHeaderNumber">
                            Question 1 of <?= $totalQuestions ?>
                        </span>
                        <div class="flex items-center gap-3">
                            <button type="button" onclick="clearCurrentSelection()" class="text-[11px] font-semibold text-slate-400 hover:text-rose-600 transition-colors">
                                Clear Choice
                            </button>
                            <button type="button" onclick="toggleFlag()" id="flagBtn" class="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-amber-500 transition-colors">
                                <i data-lucide="bookmark" class="w-3.5 h-3.5"></i>
                                <span id="flagLabel">Flag for Review</span>
                            </button>
                        </div>
                    </div>

                    <!-- Question Stem -->
                    <div id="questionStem" class="text-sm sm:text-base font-medium text-slate-900 leading-relaxed mb-4 select-none">
                        <!-- Stem inserted by JS -->
                    </div>

                    <!-- Diagram (if present) -->
                    <div id="diagramContainer" class="mb-4 hidden text-center">
                        <img id="questionDiagram" src="" alt="Question diagram" class="max-h-52 rounded-xl mx-auto border border-slate-200 shadow-xs cursor-zoom-in" onclick="zoomDiagram(this.src)">
                    </div>

                    <!-- Response Choices (A, B, C, D) -->
                    <div class="space-y-2 select-none" id="optionsContainer">
                        <!-- Options generated by JS -->
                    </div>
                </div>

                <!-- Bottom Navigation Buttons -->
                <div class="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                    <button type="button" id="prevBtn" onclick="prevQuestion()" class="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
                        <span>Previous</span>
                    </button>

                    <span class="text-[11px] text-slate-400 font-mono hidden sm:inline">Keys: [A-D] or [1-4] &bull; Arrows</span>

                    <button type="button" id="nextBtn" onclick="nextQuestion()" class="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors">
                        <span>Next</span>
                        <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- RIGHT STAGE: Question List Palette (4 cols on lg) -->
        <div class="lg:col-span-4">
            <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3.5 sticky top-28">
                <!-- Palette Header & Progress -->
                <div class="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <span class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <i data-lucide="grid" class="w-3.5 h-3.5 text-teal-600"></i>
                        <span>Question List</span>
                    </span>
                    <span class="text-[11px] font-mono text-slate-500 font-bold" id="statsPill">
                        <span id="answeredCount" class="text-teal-600">0</span>/<?= $totalQuestions ?> Answered
                    </span>
                </div>

                <!-- Status Badges -->
                <div class="grid grid-cols-3 gap-1.5 text-center text-[10px] font-semibold">
                    <div class="p-1.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-100">
                        <span class="block font-black text-xs font-mono" id="answeredBadge">0</span> Answered
                    </div>
                    <div class="p-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-100">
                        <span class="block font-black text-xs font-mono" id="flaggedBadge">0</span> Flagged
                    </div>
                    <div class="p-1.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200">
                        <span class="block font-black text-xs font-mono" id="remainingBadge"><?= $totalQuestions ?></span> Left
                    </div>
                </div>

                <!-- Numerical Item Matrix -->
                <div class="grid grid-cols-5 gap-1.5 max-h-[290px] overflow-y-auto pr-0.5" id="paletteGrid">
                    <!-- Numbers inserted by JS -->
                </div>

                <!-- Submit CTA -->
                <button type="button" onclick="confirmSubmit()" class="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5">
                    <i data-lucide="send" class="w-3.5 h-3.5"></i>
                    <span>Submit Test</span>
                </button>
            </div>
        </div>

    </div>

    </div>

</div>

<!-- Diagram Zoom Modal -->
<div id="zoomModal" class="fixed inset-0 bg-slate-950/85 backdrop-blur-xs z-50 hidden flex items-center justify-center p-4" onclick="this.classList.add('hidden')">
    <div class="bg-white p-2.5 rounded-2xl max-w-2xl max-h-[90vh] overflow-auto shadow-2xl" onclick="event.stopPropagation()">
        <img id="zoomedImg" src="" alt="Zoomed Diagram" class="w-full rounded-xl">
    </div>
</div>

<?php if ($calculatorAllowed): ?>
<!-- On-Screen Calculator -->
<div id="calcModal" class="fixed bottom-4 right-4 bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl z-50 hidden w-60 border border-slate-800">
    <div class="flex justify-between items-center mb-2.5">
        <span class="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-mono">
            <i data-lucide="calculator" class="w-3.5 h-3.5 text-teal-400"></i>
            <span>Calculator</span>
        </span>
        <button type="button" onclick="toggleCalculator()" class="text-slate-400 hover:text-white"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
    </div>
    <input type="text" id="calcDisplay" readonly class="w-full bg-slate-800 text-right px-2.5 py-1.5 rounded-lg text-base font-mono mb-2 text-white border border-slate-700" value="0">
    <div class="grid grid-cols-4 gap-1 text-xs font-bold font-mono">
        <button onclick="calcClear()" class="p-1.5 bg-slate-800 rounded hover:bg-slate-750 text-rose-400">C</button>
        <button onclick="calcInput('/')" class="p-1.5 bg-slate-800 rounded hover:bg-slate-750 text-teal-400">&divide;</button>
        <button onclick="calcInput('*')" class="p-1.5 bg-slate-800 rounded hover:bg-slate-750 text-teal-400">&times;</button>
        <button onclick="calcInput('-')" class="p-1.5 bg-slate-800 rounded hover:bg-slate-750 text-teal-400">-</button>
        <button onclick="calcInput('7')" class="p-1.5 bg-slate-800 rounded hover:bg-slate-750">7</button>
        <button onclick="calcInput('8')" class="p-1.5 bg-slate-800 rounded hover:bg-slate-750">8</button>
        <button onclick="calcInput('9')" class="p-1.5 bg-slate-800 rounded hover:bg-slate-750">9</button>
        <button onclick="calcInput('+')" class="p-1.5 bg-slate-800 rounded hover:bg-slate-750 text-teal-400">+</button>
        <button onclick="calcInput('4')" class="p-1.5 bg-slate-800 rounded hover:bg-slate-750">4</button>
        <button onclick="calcInput('5')" class="p-1.5 bg-slate-800 rounded hover:bg-slate-750">5</button>
        <button onclick="calcInput('6')" class="p-1.5 bg-slate-800 rounded hover:bg-slate-750">6</button>
        <button onclick="calcEqual()" class="row-span-2 p-1.5 bg-teal-600 text-white rounded hover:bg-teal-700 flex items-center justify-center">=</button>
        <button onclick="calcInput('1')" class="p-1.5 bg-slate-800 rounded hover:bg-slate-750">1</button>
        <button onclick="calcInput('2')" class="p-1.5 bg-slate-800 rounded hover:bg-slate-750">2</button>
        <button onclick="calcInput('3')" class="p-1.5 bg-slate-800 rounded hover:bg-slate-750">3</button>
        <button onclick="calcInput('0')" class="col-span-2 p-1.5 bg-slate-800 rounded hover:bg-slate-750">0</button>
        <button onclick="calcInput('.')" class="p-1.5 bg-slate-800 rounded hover:bg-slate-750">.</button>
    </div>
</div>
<?php endif; ?>

<!-- Hidden submission form to submit_exam.php -->
<form id="submissionForm" method="POST" action="submit_exam.php">
    <input type="hidden" name="course_id" value="<?= htmlspecialchars($courseId) ?>">
    <input type="hidden" name="test_id" value="<?= htmlspecialchars($testId) ?>">
    <input type="hidden" name="session_id" value="<?= htmlspecialchars($sessionId) ?>">
    <input type="hidden" name="answers_json" id="answersJsonInput" value="">
    <input type="hidden" name="question_ids_json" id="questionIdsJsonInput" value="">
    <input type="hidden" name="tab_switches" id="tabSwitchesInput" value="0">
    <input type="hidden" name="is_flagged_cheating" id="isFlaggedCheatingInput" value="0">
    <input type="hidden" name="cheating_log" id="cheatingLogInput" value="[]">
</form>

<!-- Warning Modal -->
<div id="cheatingModal" class="hidden fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-sm w-full p-5 text-center space-y-3.5 shadow-2xl border-2 border-rose-500">
        <div class="w-12 h-12 mx-auto rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <i data-lucide="shield-alert" class="w-6 h-6"></i>
        </div>
        <div class="space-y-1">
            <h3 class="text-sm font-black text-rose-600 uppercase tracking-wider" id="cheatModalTitle">Warning: Switched Tabs</h3>
            <p class="text-xs text-slate-600 leading-snug font-medium" id="cheatModalMsg">
                You clicked away from this test window. Please stay on this page until you finish your test.
            </p>
        </div>
        <div class="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono font-bold">
            <span id="cheatModalCount">Warning 1 of 3</span>
        </div>
        <button type="button" onclick="dismissCheatingModal()" class="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs">
            Return to Test
        </button>
    </div>
</div>

<?php if ($watermarkEnabled): ?>
<!-- Candidate Translucent Watermark Overlay -->
<div class="pointer-events-none fixed inset-0 z-20 select-none overflow-hidden opacity-[0.035] flex flex-wrap gap-12 p-6 text-base font-black text-slate-900 font-mono rotate-[-12deg]">
    <?php for ($i = 0; $i < 24; $i++): ?>
    <span><?= htmlspecialchars($student['matric_no']) ?> &bull; <?= htmlspecialchars($student['name']) ?> &bull; PMSEC CBT</span>
    <?php endfor; ?>
</div>
<?php endif; ?>

<script>
const QUESTIONS = <?= json_encode($clientQuestions) ?>;
const DURATION_MINUTES = <?= (int)$duration ?>;
let currentIndex = 0;
let userAnswers = {};
let flaggedQuestions = new Set();
let secondsRemaining = DURATION_MINUTES > 0 ? DURATION_MINUTES * 60 : null;
let timerInterval = null;
let isLargeFont = false;

// Initialize examination state
function initExam() {
    renderCurrentQuestion();
    renderPalette();

    // Start countdown timer if timed
    if (secondsRemaining !== null) {
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            secondsRemaining--;
            updateTimerDisplay();
            if (secondsRemaining <= 0) {
                clearInterval(timerInterval);
                alert("Time is up! Your answers are being submitted now.");
                executeSubmit();
            }
        }, 1000);
    } else {
        document.getElementById('timerDisplay').innerText = "Self-Paced";
    }

    // Keyboard shortcuts & security
    setupKeyboardShortcuts();
    setupAntiCheatingListeners();
}

function updateTimerDisplay() {
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    const str = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const display = document.getElementById('timerDisplay');
    const container = document.getElementById('timerContainer');
    if (display) display.innerText = str;
    if (container) {
        if (secondsRemaining < 180) {
            container.className = "px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-mono font-bold text-xs flex items-center gap-2 shadow-xs animate-pulse";
        } else if (secondsRemaining < 600) {
            container.className = "px-3.5 py-1.5 rounded-xl bg-amber-600 text-white font-mono font-bold text-xs flex items-center gap-2 shadow-xs";
        }
    }
}

function renderCurrentQuestion() {
    const q = QUESTIONS[currentIndex];
    const headEl = document.getElementById('questionHeaderNumber');
    const progEl = document.getElementById('progressIndicator');
    if (headEl) headEl.innerText = `Question ${currentIndex + 1} of ${QUESTIONS.length}`;
    if (progEl) progEl.innerText = `Question ${currentIndex + 1} of ${QUESTIONS.length}`;

    // Render stem text
    const stemEl = document.getElementById('questionStem');
    stemEl.innerHTML = q.text;
    stemEl.className = isLargeFont 
        ? "text-base sm:text-lg font-medium text-slate-900 leading-relaxed mb-4 select-none"
        : "text-sm sm:text-base font-medium text-slate-900 leading-relaxed mb-4 select-none";

    // Render diagram
    const diagContainer = document.getElementById('diagramContainer');
    if (q.diagram_url) {
        document.getElementById('questionDiagram').src = q.diagram_url;
        diagContainer.classList.remove('hidden');
    } else {
        diagContainer.classList.add('hidden');
    }

    // Render Options
    const optContainer = document.getElementById('optionsContainer');
    optContainer.innerHTML = '';

    const currentPick = userAnswers[q.id] || null;
    const optionKeys = ['a', 'b', 'c', 'd'];

    optionKeys.forEach(opt => {
        if (!q[opt]) return;
        const isSelected = (currentPick === opt);

        const btn = document.createElement('div');
        btn.className = `p-3 sm:p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
            isSelected 
            ? 'border-teal-600 bg-teal-50/80 text-teal-950 font-semibold ring-2 ring-teal-500/20' 
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
        }`;
        btn.onclick = () => selectOption(opt);

        btn.innerHTML = `
            <div class="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold uppercase shrink-0 transition-colors font-mono ${
                isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
            }">
                ${opt}
            </div>
            <div class="text-xs sm:text-sm pt-0.5 leading-snug flex-1">${q[opt]}</div>
        `;
        optContainer.appendChild(btn);
    });

    updateFlagButton();

    // Prev / Next button states
    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) prevBtn.disabled = (currentIndex === 0);
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        if (currentIndex === QUESTIONS.length - 1) {
            nextBtn.innerHTML = `<span>Review & Finalize</span><i data-lucide="check" class="w-3.5 h-3.5"></i>`;
        } else {
            nextBtn.innerHTML = `<span>Next Item</span><i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>`;
        }
    }

    // Auto-render KaTeX math formulas in stem and options
    if (typeof renderMathInElement === 'function') {
        renderMathInElement(document.getElementById('examApp'), {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false}
            ],
            throwOnError: false
        });
    }

    if (window.lucide) lucide.createIcons();
}

function selectOption(opt) {
    const q = QUESTIONS[currentIndex];
    userAnswers[q.id] = opt;
    renderCurrentQuestion();
    renderPalette();
}

function clearCurrentSelection() {
    const q = QUESTIONS[currentIndex];
    if (userAnswers[q.id]) {
        delete userAnswers[q.id];
        renderCurrentQuestion();
        renderPalette();
    }
}

function prevQuestion() {
    if (currentIndex > 0) {
        currentIndex--;
        renderCurrentQuestion();
        renderPalette();
    }
}

function nextQuestion() {
    if (currentIndex < QUESTIONS.length - 1) {
        currentIndex++;
        renderCurrentQuestion();
        renderPalette();
    } else {
        confirmSubmit();
    }
}

function jumpToQuestion(idx) {
    currentIndex = idx;
    renderCurrentQuestion();
    renderPalette();
}

function toggleFlag() {
    const q = QUESTIONS[currentIndex];
    if (flaggedQuestions.has(q.id)) {
        flaggedQuestions.delete(q.id);
    } else {
        flaggedQuestions.add(q.id);
    }
    updateFlagButton();
    renderPalette();
}

function updateFlagButton() {
    const q = QUESTIONS[currentIndex];
    const isFlagged = flaggedQuestions.has(q.id);
    const btn = document.getElementById('flagBtn');
    const label = document.getElementById('flagLabel');

    if (isFlagged) {
        btn.className = "flex items-center gap-1 text-xs font-bold text-amber-500 transition-colors";
        label.innerText = "Marked for Review";
    } else {
        btn.className = "flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-amber-500 transition-colors";
        label.innerText = "Mark for Review";
    }
}

function renderPalette() {
    const grid = document.getElementById('paletteGrid');
    if (!grid) return;
    grid.innerHTML = '';

    let answeredCount = 0;
    let flaggedCount = 0;

    QUESTIONS.forEach((q, idx) => {
        const isAnswered = !!userAnswers[q.id];
        const isFlagged = flaggedQuestions.has(q.id);
        const isCurrent = (idx === currentIndex);

        if (isAnswered) answeredCount++;
        if (isFlagged) flaggedCount++;

        const item = document.createElement('button');
        item.type = 'button';
        item.onclick = () => jumpToQuestion(idx);
        item.className = `h-8 w-full rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center relative ${
            isCurrent ? 'ring-2 ring-teal-600 ring-offset-1 ' : ''
        } ${
            isAnswered 
            ? 'bg-teal-600 text-white shadow-xs' 
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }`;

        item.innerText = idx + 1;

        if (isFlagged) {
            const dot = document.createElement('span');
            dot.className = "absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400";
            item.appendChild(dot);
        }

        grid.appendChild(item);
    });

    const remaining = QUESTIONS.length - answeredCount;
    document.getElementById('answeredCount').innerText = answeredCount;
    document.getElementById('answeredBadge').innerText = answeredCount;
    document.getElementById('flaggedBadge').innerText = flaggedCount;
    document.getElementById('remainingBadge').innerText = remaining;
}

function toggleFontSize() {
    isLargeFont = !isLargeFont;
    renderCurrentQuestion();
}

function zoomDiagram(src) {
    document.getElementById('zoomedImg').src = src;
    document.getElementById('zoomModal').classList.remove('hidden');
}

function confirmSubmit() {
    const answeredCount = Object.keys(userAnswers).length;
    const unanswered = QUESTIONS.length - answeredCount;
    let msg = `You have answered ${answeredCount} of ${QUESTIONS.length} questions.`;
    if (unanswered > 0) {
        msg += `\n\nNotice: You still have ${unanswered} unanswered question(s).`;
    }
    msg += "\n\nAre you sure you want to submit your test now?";

    if (confirm(msg)) {
        executeSubmit();
    }
}

function executeSubmit() {
    document.getElementById('answersJsonInput').value = JSON.stringify(userAnswers);
    document.getElementById('questionIdsJsonInput').value = JSON.stringify(QUESTIONS.map(q => q.id));
    document.getElementById('submissionForm').submit();
}

// Text to speech
function speakCurrentQuestion() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const q = QUESTIONS[currentIndex];
        const utterance = new SpeechSynthesisUtterance(q.text.replace(/[$*]/g, ''));
        window.speechSynthesis.speak(utterance);
    }
}

// Keyboard accelerators
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        const key = e.key.toLowerCase();
        if (['a', 'b', 'c', 'd'].includes(key)) {
            selectOption(key);
        } else if (['1', '2', '3', '4'].includes(key)) {
            const map = { '1': 'a', '2': 'b', '3': 'c', '4': 'd' };
            selectOption(map[key]);
        } else if (key === 'f') {
            toggleFlag();
        } else if (key === 'arrowleft' || key === 'p') {
            prevQuestion();
        } else if (key === 'arrowright' || key === 'n') {
            nextQuestion();
        }
    });
}

// Anti Cheating Telemetry
let tabSwitchCount = 0;
let cheatingLogs = [];
const MAX_TAB_SWITCHES = <?= (int)$maxTabSwitches ?>;
const ANTI_CHEAT_BLUR = <?= (int)$antiCheatBlur ?>;
const ENFORCE_FULLSCREEN = <?= (int)$enforceFullscreen ?>;
const AUTO_SUBMIT = <?= (int)$autoSubmit ?>;
const SESSION_ID = '<?= htmlspecialchars($sessionId) ?>';

function recordCheatingEvent(type, details) {
    tabSwitchCount++;
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    const logItem = { type, time: timeStr, count: tabSwitchCount, details };
    cheatingLogs.push(logItem);

    const inputSwitches = document.getElementById('tabSwitchesInput');
    const inputLog = document.getElementById('cheatingLogInput');
    if (inputSwitches) inputSwitches.value = tabSwitchCount;
    if (inputLog) inputLog.value = JSON.stringify(cheatingLogs);

    try {
        const payload = JSON.stringify({
            session_id: SESSION_ID,
            type: type,
            count: tabSwitchCount,
            log: cheatingLogs
        });
        if (navigator.sendBeacon) {
            navigator.sendBeacon('log_cheating.php', new Blob([payload], { type: 'application/json' }));
        } else {
            fetch('log_cheating.php', { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' } });
        }
    } catch (e) {}

    showCheatingWarningModal(tabSwitchCount, MAX_TAB_SWITCHES, type);

    if (MAX_TAB_SWITCHES > 0 && tabSwitchCount >= MAX_TAB_SWITCHES) {
        const flagInput = document.getElementById('isFlaggedCheatingInput');
        if (flagInput) flagInput.value = '1';
        if (AUTO_SUBMIT) {
            setTimeout(() => {
                alert(`Notice: Maximum allowed warnings (${MAX_TAB_SWITCHES}) reached. Your test is now being submitted.`);
                executeSubmit();
            }, 400);
        }
    }
}

function showCheatingWarningModal(count, max, type) {
    const modal = document.getElementById('cheatingModal');
    if (!modal) return;
    const title = document.getElementById('cheatModalTitle');
    const msg = document.getElementById('cheatModalMsg');
    const badge = document.getElementById('cheatModalCount');

    if (title) title.innerText = type === 'FULLSCREEN_EXIT' ? 'Warning: Fullscreen Exited' : 'Warning: Switched Away from Test';
    if (msg) msg.innerText = `You clicked outside the test window. Please stay on this screen until your test is complete.`;
    if (badge) badge.innerText = max > 0 ? `Warning ${count} of ${max} allowed` : `Warning #${count}`;

    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function dismissCheatingModal() {
    const modal = document.getElementById('cheatingModal');
    if (modal) modal.classList.add('hidden');
    if (ENFORCE_FULLSCREEN && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    }
}

function setupAntiCheatingListeners() {
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('copy', e => e.preventDefault());
    document.addEventListener('paste', e => e.preventDefault());

    if (ANTI_CHEAT_BLUR) {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                recordCheatingEvent('TAB_SWITCH', 'Switched browser tab or minimized window');
            }
        });

        window.addEventListener('blur', () => {
            recordCheatingEvent('WINDOW_BLUR', 'Window lost focus to background application');
        });
    }

    if (ENFORCE_FULLSCREEN) {
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) {
                recordCheatingEvent('FULLSCREEN_EXIT', 'Exited proctored fullscreen mode');
            }
        });
    }
}

// Calculator functions
function toggleCalculator() {
    const el = document.getElementById('calcModal');
    if (el) el.classList.toggle('hidden');
}
function calcInput(char) {
    const d = document.getElementById('calcDisplay');
    if (d.value === '0') d.value = '';
    d.value += char;
}
function calcClear() {
    document.getElementById('calcDisplay').value = '0';
}
function calcEqual() {
    const d = document.getElementById('calcDisplay');
    try {
        d.value = eval(d.value.replace(/[^0-9+\-*/.]/g, ''));
    } catch {
        d.value = 'Error';
    }
}

// Run on load
window.addEventListener('DOMContentLoaded', initExam);
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
