<?php
/**
 * Active CBT Examination Engine
 * Premed Test Portal (PHP Edition)
 */

$pageTitle = 'Examination In Progress';
require_once __DIR__ . '/config/db.php';

$db = DB::connect();

$courseId = $_GET['course_id'] ?? '';
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
$duration = isset($_GET['duration']) ? (int)$_GET['duration'] : 30;
$topicFilters = $_GET['topics'] ?? [];

if (empty($courseId)) {
    header('Location: index.php');
    exit;
}

// 1. Fetch Course details
$cStmt = $db->prepare("SELECT * FROM courses WHERE id = ? LIMIT 1");
$cStmt->execute([$courseId]);
$course = $cStmt->fetch();

if (!$course) {
    die("Assessment Course not found.");
}

// 2. Fetch Questions
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
    die("No questions found for this assessment.");
}

// Shuffle and limit
shuffle($questions);
if (count($questions) > $limit) {
    $questions = array_slice($questions, 0, $limit);
}

// Strip correct_option for student-facing JSON payload to prevent devtools inspection cheating
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

// Fetch Security Settings
$antiCheatBlur = 1;
$enforceFullscreen = 1;
$maxTabSwitches = 3;
$watermarkEnabled = 1;

try {
    $sRows = $db->query("SELECT key_name, value FROM settings")->fetchAll(PDO::FETCH_KEY_PAIR);
    if (isset($sRows['anti_cheat_blur'])) $antiCheatBlur = (int)$sRows['anti_cheat_blur'];
    if (isset($sRows['enforce_fullscreen'])) $enforceFullscreen = (int)$sRows['enforce_fullscreen'];
    if (isset($sRows['max_tab_switches'])) $maxTabSwitches = (int)$sRows['max_tab_switches'];
    if (isset($sRows['watermark_enabled'])) $watermarkEnabled = (int)$sRows['watermark_enabled'];
} catch (Exception $e) {}

// Register active session in exam_sessions table
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

<div class="max-w-5xl mx-auto px-4 sm:px-6 py-6" id="examApp">
    <!-- Top Bar: Course Title, Question Tracker, and Countdown Timer -->
    <div class="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
            <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200"><?= htmlspecialchars($course['code']) ?></span>
                <span class="text-xs font-semibold text-slate-500">Academic CBT Simulator</span>
            </div>
            <h2 class="text-lg font-black text-slate-900"><?= htmlspecialchars($course['title']) ?></h2>
        </div>

        <div class="flex items-center gap-3">
            <!-- Audio text-to-speech button -->
            <button type="button" onclick="speakCurrentQuestion()" title="Read Question" class="p-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors">
                <i data-lucide="volume-2" class="w-5 h-5"></i>
            </button>

            <!-- Calculator trigger -->
            <button type="button" onclick="toggleCalculator()" title="Calculator" class="p-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors">
                <i data-lucide="calculator" class="w-5 h-5"></i>
            </button>

            <!-- Question Grid Drawer toggle -->
            <button type="button" onclick="toggleGridModal()" class="px-3 py-2 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5">
                <i data-lucide="grid" class="w-4 h-4"></i>
                <span id="progressIndicator">1 / <?= $totalQuestions ?></span>
            </button>

            <!-- Countdown Timer Pill -->
            <div id="timerContainer" class="px-4 py-2 rounded-2xl bg-slate-900 text-white font-mono font-bold text-sm flex items-center gap-2 shadow-inner">
                <i data-lucide="timer" class="w-4 h-4 text-emerald-400"></i>
                <span id="timerDisplay">--:--</span>
            </div>
        </div>
    </div>

    <!-- Active Question Card -->
    <div class="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm relative">
        <!-- Question Header & Flag -->
        <div class="flex justify-between items-center pb-4 mb-6 border-b border-slate-100">
            <span class="text-xs font-black uppercase tracking-widest text-indigo-600" id="questionHeaderNumber">Question 1 of <?= $totalQuestions ?></span>
            <button type="button" onclick="toggleFlag()" id="flagBtn" class="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-amber-500 transition-colors">
                <i data-lucide="bookmark" class="w-4 h-4"></i>
                <span id="flagLabel">Bookmark for Review</span>
            </button>
        </div>

        <!-- Question Stem Text -->
        <div id="questionStem" class="text-base sm:text-lg font-medium text-slate-900 leading-relaxed mb-8 select-none">
            <!-- Rendered by JS with KaTeX -->
        </div>

        <!-- Diagram if exists -->
        <div id="diagramContainer" class="mb-6 hidden text-center">
            <img id="questionDiagram" src="" alt="Question Diagram" class="max-h-72 rounded-2xl mx-auto border border-slate-200 shadow-sm">
        </div>

        <!-- Options Container -->
        <div class="space-y-3" id="optionsContainer">
            <!-- Options A, B, C, D generated by JS -->
        </div>

        <!-- Bottom Navigation & Action Buttons -->
        <div class="flex items-center justify-between pt-8 mt-8 border-t border-slate-100">
            <button type="button" id="prevBtn" onclick="prevQuestion()" class="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                <i data-lucide="chevron-left" class="w-4 h-4"></i>
                <span>Previous</span>
            </button>

            <button type="button" onclick="confirmSubmit()" class="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-100 transition-colors flex items-center gap-2">
                <i data-lucide="check-circle" class="w-4 h-4"></i>
                <span>Submit Exam</span>
            </button>

            <button type="button" id="nextBtn" onclick="nextQuestion()" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 flex items-center gap-2 transition-colors">
                <span>Next</span>
                <i data-lucide="chevron-right" class="w-4 h-4"></i>
            </button>
        </div>
    </div>
</div>

<!-- Question Palette Modal -->
<div id="gridModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-base font-bold text-slate-900">Question Palette</h3>
            <button type="button" onclick="toggleGridModal()" class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <div class="grid grid-cols-5 sm:grid-cols-6 gap-2.5 max-h-72 overflow-y-auto p-1" id="paletteGrid">
            <!-- Question numbers -->
        </div>
    </div>
</div>

<!-- On-Screen Calculator -->
<div id="calcModal" class="fixed bottom-6 right-6 bg-slate-900 text-white p-4 rounded-3xl shadow-2xl z-50 hidden w-64 border border-slate-800">
    <div class="flex justify-between items-center mb-3">
        <span class="text-xs font-bold text-slate-400">Calculator</span>
        <button type="button" onclick="toggleCalculator()" class="text-slate-400 hover:text-white"><i data-lucide="x" class="w-4 h-4"></i></button>
    </div>
    <input type="text" id="calcDisplay" readonly class="w-full bg-slate-800 text-right px-3 py-2 rounded-xl text-lg font-mono mb-3 text-white border border-slate-700" value="0">
    <div class="grid grid-cols-4 gap-1.5 text-xs font-bold font-mono">
        <button onclick="calcClear()" class="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-rose-400">C</button>
        <button onclick="calcInput('/')" class="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-indigo-400">&divide;</button>
        <button onclick="calcInput('*')" class="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-indigo-400">&times;</button>
        <button onclick="calcInput('-')" class="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-indigo-400">-</button>
        <button onclick="calcInput('7')" class="p-2 bg-slate-800 rounded-lg hover:bg-slate-700">7</button>
        <button onclick="calcInput('8')" class="p-2 bg-slate-800 rounded-lg hover:bg-slate-700">8</button>
        <button onclick="calcInput('9')" class="p-2 bg-slate-800 rounded-lg hover:bg-slate-700">9</button>
        <button onclick="calcInput('+')" class="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-indigo-400">+</button>
        <button onclick="calcInput('4')" class="p-2 bg-slate-800 rounded-lg hover:bg-slate-700">4</button>
        <button onclick="calcInput('5')" class="p-2 bg-slate-800 rounded-lg hover:bg-slate-700">5</button>
        <button onclick="calcInput('6')" class="p-2 bg-slate-800 rounded-lg hover:bg-slate-700">6</button>
        <button onclick="calcEqual()" class="row-span-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center">=</button>
        <button onclick="calcInput('1')" class="p-2 bg-slate-800 rounded-lg hover:bg-slate-700">1</button>
        <button onclick="calcInput('2')" class="p-2 bg-slate-800 rounded-lg hover:bg-slate-700">2</button>
        <button onclick="calcInput('3')" class="p-2 bg-slate-800 rounded-lg hover:bg-slate-700">3</button>
        <button onclick="calcInput('0')" class="col-span-2 p-2 bg-slate-800 rounded-lg hover:bg-slate-700">0</button>
        <button onclick="calcInput('.')" class="p-2 bg-slate-800 rounded-lg hover:bg-slate-700">.</button>
    </div>
</div>

<!-- Hidden submission form -->
<form id="submissionForm" method="POST" action="submit_exam.php">
    <input type="hidden" name="course_id" value="<?= htmlspecialchars($courseId) ?>">
    <input type="hidden" name="session_id" value="<?= htmlspecialchars($sessionId) ?>">
    <input type="hidden" name="answers_json" id="answersJsonInput" value="">
    <input type="hidden" name="question_ids_json" id="questionIdsJsonInput" value="">
    <input type="hidden" name="tab_switches" id="tabSwitchesInput" value="0">
    <input type="hidden" name="is_flagged_cheating" id="isFlaggedCheatingInput" value="0">
    <input type="hidden" name="cheating_log" id="cheatingLogInput" value="[]">
</form>

<!-- Cheating Warning Modal -->
<div id="cheatingModal" class="hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl border-2 border-rose-500">
        <div class="w-14 h-14 mx-auto rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <i data-lucide="shield-alert" class="w-7 h-7"></i>
        </div>
        <div class="space-y-1">
            <h3 class="text-base font-black text-rose-600" id="cheatModalTitle">Security Alert: Tab Switch Detected!</h3>
            <p class="text-xs text-slate-600 leading-relaxed font-medium" id="cheatModalMsg">
                You have navigated away from the exam viewport. This infraction has been logged and reported in real time to the exam administrator.
            </p>
        </div>
        <div class="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
            <span id="cheatModalCount">Violation 1 of 3</span>
        </div>
        <button type="button" onclick="dismissCheatingModal()" class="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md">
            I Understand & Return to Exam
        </button>
    </div>
</div>

<?php if ($watermarkEnabled): ?>
<!-- Candidate Translucent Watermark Overlay -->
<div class="pointer-events-none fixed inset-0 z-30 select-none overflow-hidden opacity-[0.05] flex flex-wrap gap-12 p-8 text-lg font-black text-slate-900 font-mono rotate-[-12deg]">
    <?php for ($i = 0; $i < 24; $i++): ?>
    <span><?= htmlspecialchars($student['matric_no']) ?> &bull; <?= htmlspecialchars($student['name']) ?></span>
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
                alert("Examination time has expired! Your responses will now be submitted automatically.");
                executeSubmit();
            }
        }, 1000);
    } else {
        document.getElementById('timerDisplay').innerText = "Untimed";
    }

    // Security listeners
    setupAntiCheatingListeners();
}

function updateTimerDisplay() {
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    const str = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    document.getElementById('timerDisplay').innerText = str;
    if (secondsRemaining < 300) {
        document.getElementById('timerContainer').className = "px-4 py-2 rounded-2xl bg-rose-600 text-white font-mono font-bold text-sm flex items-center gap-2 animate-pulse";
    }
}

function renderCurrentQuestion() {
    const q = QUESTIONS[currentIndex];
    document.getElementById('questionHeaderNumber').innerText = `Question ${currentIndex + 1} of ${QUESTIONS.length}`;
    document.getElementById('progressIndicator').innerText = `${currentIndex + 1} / ${QUESTIONS.length}`;

    // Render stem text
    const stemEl = document.getElementById('questionStem');
    stemEl.innerHTML = q.text;

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
        btn.className = `p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3.5 select-none ${
            isSelected 
            ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-semibold ring-2 ring-indigo-500/20' 
            : 'border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
        }`;
        btn.onclick = () => selectOption(opt);

        btn.innerHTML = `
            <div class="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold uppercase shrink-0 transition-colors ${
                isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
            }">
                ${opt}
            </div>
            <div class="text-sm pt-0.5 leading-relaxed flex-1">${q[opt]}</div>
        `;
        optContainer.appendChild(btn);
    });

    // Update flag label
    updateFlagButton();

    // Prev / Next button states
    document.getElementById('prevBtn').disabled = (currentIndex === 0);
    const nextBtn = document.getElementById('nextBtn');
    if (currentIndex === QUESTIONS.length - 1) {
        nextBtn.innerHTML = `<span>Review Finish</span><i data-lucide="check" class="w-4 h-4"></i>`;
    } else {
        nextBtn.innerHTML = `<span>Next</span><i data-lucide="chevron-right" class="w-4 h-4"></i>`;
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

    lucide.createIcons();
}

function selectOption(opt) {
    const q = QUESTIONS[currentIndex];
    userAnswers[q.id] = opt;
    renderCurrentQuestion();
    renderPalette();
}

function prevQuestion() {
    if (currentIndex > 0) {
        currentIndex--;
        renderCurrentQuestion();
    }
}

function nextQuestion() {
    if (currentIndex < QUESTIONS.length - 1) {
        currentIndex++;
        renderCurrentQuestion();
    } else {
        toggleGridModal();
    }
}

function jumpToQuestion(idx) {
    currentIndex = idx;
    renderCurrentQuestion();
    toggleGridModal();
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
        btn.className = "flex items-center gap-1.5 text-xs font-bold text-amber-500 transition-colors";
        label.innerText = "Bookmarked (Flagged)";
    } else {
        btn.className = "flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-amber-500 transition-colors";
        label.innerText = "Bookmark for Review";
    }
}

function renderPalette() {
    const grid = document.getElementById('paletteGrid');
    grid.innerHTML = '';

    QUESTIONS.forEach((q, idx) => {
        const isAnswered = !!userAnswers[q.id];
        const isFlagged = flaggedQuestions.has(q.id);
        const isCurrent = (idx === currentIndex);

        const item = document.createElement('button');
        item.type = 'button';
        item.onclick = () => jumpToQuestion(idx);
        item.className = `h-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center relative ${
            isCurrent ? 'ring-2 ring-indigo-600 ring-offset-2 ' : ''
        } ${
            isAnswered ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }`;

        item.innerText = idx + 1;

        if (isFlagged) {
            const dot = document.createElement('span');
            dot.className = "absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400";
            item.appendChild(dot);
        }

        grid.appendChild(item);
    });
}

function toggleGridModal() {
    const modal = document.getElementById('gridModal');
    modal.classList.toggle('hidden');
    lucide.createIcons();
}

function confirmSubmit() {
    const answeredCount = Object.keys(userAnswers).length;
    const unanswered = QUESTIONS.length - answeredCount;
    let msg = `You have answered ${answeredCount} of ${QUESTIONS.length} questions.`;
    if (unanswered > 0) {
        msg += `\nWarning: ${unanswered} question(s) remain unanswered!`;
    }
    msg += "\n\nAre you sure you want to finalize and submit your assessment?";

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

let tabSwitchCount = 0;
let cheatingLogs = [];
const MAX_TAB_SWITCHES = <?= (int)$maxTabSwitches ?>;
const ANTI_CHEAT_BLUR = <?= (int)$antiCheatBlur ?>;
const ENFORCE_FULLSCREEN = <?= (int)$enforceFullscreen ?>;
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

    // Send real-time beacon/fetch to log_cheating.php
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
        setTimeout(() => {
            alert(`🚨 EXAM TERMINATED: You exceeded the allowed limit of ${MAX_TAB_SWITCHES} violations. Your test is being automatically submitted and marked as FLAGGED FOR CHEATING.`);
            executeSubmit();
        }, 400);
    }
}

function showCheatingWarningModal(count, max, type) {
    const modal = document.getElementById('cheatingModal');
    if (!modal) return;
    const title = document.getElementById('cheatModalTitle');
    const msg = document.getElementById('cheatModalMsg');
    const badge = document.getElementById('cheatModalCount');

    if (title) title.innerText = type === 'FULLSCREEN_EXIT' ? 'Security Alert: Fullscreen Exited!' : 'Security Alert: Tab Switch Detected!';
    if (msg) msg.innerText = `You navigated away from the exam viewport. This infraction has been logged and reported in real time to the exam administrator.`;
    if (badge) badge.innerText = max > 0 ? `Violation ${count} of ${max} allowed` : `Violation #${count} logged`;

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

// Anti cheating listeners
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
                recordCheatingEvent('FULLSCREEN_EXIT', 'Exited fullscreen mode');
            }
        });
    }
}

// Calculator functions
function toggleCalculator() {
    document.getElementById('calcModal').classList.toggle('hidden');
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
