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

<!-- Authentic University / Council Institutional Header Banner -->
<div class="bg-[#103a71] text-white rounded-2xl shadow-md border border-[#0d2e5a] p-3 sm:p-4 mb-4">
    <div class="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        
        <!-- Left: Institution Crest & Title -->
        <div class="flex items-center gap-3">
            <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
                <svg class="w-6 h-6 sm:w-7 sm:h-7 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5"></path>
                    <path d="M2 12l10 5 10-5"></path>
                </svg>
            </div>
            <div>
                <h1 class="text-xs sm:text-base font-black tracking-tight uppercase text-white leading-tight">
                    Apex Pre-Medical Sciences Examination Council
                </h1>
                <p class="text-[10px] sm:text-[11px] font-bold text-sky-200 tracking-wider uppercase mt-0.5">
                    Online CBT Examination Portal &bull; <span class="text-amber-300"><?= htmlspecialchars($course['code']) ?> - <?= htmlspecialchars($course['title']) ?></span>
                </p>
            </div>
        </div>

        <!-- Right: Candidate Camera & Details -->
        <div class="flex items-center gap-3 sm:gap-4 shrink-0">
            <!-- Live Camera / Proctor Box -->
            <div class="relative w-20 h-16 sm:w-24 sm:h-18 rounded-lg overflow-hidden bg-slate-950 border border-white/30 shadow-inner flex items-center justify-center">
                <video id="liveWebcam" autoplay playsinline muted class="w-full h-full object-cover hidden"></video>
                <div id="webcamPlaceholder" class="flex flex-col items-center justify-center text-slate-400">
                    <i data-lucide="user" class="w-6 h-6 text-slate-300"></i>
                </div>
                <div class="absolute bottom-1 left-1 right-1 bg-black/75 backdrop-blur-xs rounded px-1 py-0.2 flex items-center justify-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                    <span class="text-[8px] font-black tracking-wider uppercase text-white font-mono">Live Camera</span>
                </div>
            </div>

            <!-- Candidate Info -->
            <div class="text-xs space-y-0.5">
                <div class="font-extrabold text-white text-[12px] sm:text-[13px] leading-tight truncate max-w-[170px]">
                    Name: <span class="text-amber-200"><?= strtoupper(htmlspecialchars($student['name'])) ?></span>
                </div>
                <div class="font-mono text-[11px] text-sky-200 font-semibold">
                    Matric No: <span class="text-white"><?= htmlspecialchars($student['matric_no']) ?></span>
                </div>
                <div class="pt-0.5">
                    <button type="button" onclick="toggleHelpModal()" class="px-2.5 py-0.5 rounded-md bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/30 font-bold text-[10px] transition-colors">
                        Need Help?
                    </button>
                </div>
            </div>

        </div>

    </div>
</div>

<!-- Main Two-Column CBT Layout -->
<div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start" id="examApp">

    <!-- LEFT COLUMN: Question Navigation Grid (4 cols on lg) -->
    <div class="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3.5 sticky top-20">
        
        <!-- Navigation Grid Header -->
        <div class="border-b border-slate-100 pb-2.5">
            <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <i data-lucide="layout-grid" class="w-4 h-4 text-[#103a71]"></i>
                <span>Question Navigation Grid</span>
            </h3>
        </div>

        <!-- Legend -->
        <div class="flex items-center justify-between text-[11px] font-semibold text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
            <div class="flex items-center gap-1.5">
                <span class="w-3.5 h-3.5 rounded bg-[#22c55e] inline-block shadow-xs"></span>
                <span>Answered</span>
            </div>
            <div class="flex items-center gap-1.5">
                <span class="w-3.5 h-3.5 rounded bg-slate-200 border border-slate-300 inline-block"></span>
                <span>Unanswered</span>
            </div>
            <div class="flex items-center gap-1.5">
                <span class="w-3.5 h-3.5 rounded bg-amber-400 inline-block shadow-xs"></span>
                <span>Bookmarked</span>
            </div>
        </div>

        <!-- 5-Column Grid Numbers Container -->
        <div class="grid grid-cols-5 gap-1.5 max-h-[380px] overflow-y-auto pr-1" id="paletteGrid">
            <!-- Numbers inserted by JS -->
        </div>

        <!-- Summary Counter Footer -->
        <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500 font-bold">
            <span>Answered: <strong id="answeredCount" class="text-emerald-600">0</strong>/<?= $totalQuestions ?></span>
            <span>Flagged: <strong id="flaggedBadge" class="text-amber-500">0</strong></span>
            <span>Remaining: <strong id="remainingBadge" class="text-slate-600"><?= $totalQuestions ?></strong></span>
        </div>

    </div>

    <!-- RIGHT COLUMN: Question & Testing Stage (8 cols on lg) -->
    <div class="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5 flex flex-col justify-between min-h-[520px]">
        
        <div>
            <!-- Top Bar above Question: Tools, Time Remaining & Submit Button -->
            <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                
                <!-- Left: Question Progress & Tools -->
                <div class="flex items-center gap-2">
                    <span class="text-sm font-black text-slate-800 font-mono" id="questionHeaderNumber">
                        Question 1 of <?= $totalQuestions ?>
                    </span>
                    <div class="flex items-center gap-1 ml-2">
                        <button type="button" onclick="speakCurrentQuestion()" title="Read out loud" class="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100">
                            <i data-lucide="volume-2" class="w-3.5 h-3.5"></i>
                        </button>
                        <?php if ($calculatorAllowed): ?>
                        <button type="button" onclick="toggleCalculator()" title="Calculator" class="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100">
                            <i data-lucide="calculator" class="w-3.5 h-3.5"></i>
                        </button>
                        <?php endif; ?>
                        <button type="button" onclick="toggleFontSize()" title="Text size" class="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 font-bold text-xs">
                            A<span class="text-[10px]">±</span>
                        </button>
                    </div>
                </div>

                <!-- Right: Digital Timer & Red Submit Exam Button -->
                <div class="flex items-center gap-3">
                    <!-- Digital Red Timer -->
                    <div class="flex items-center gap-1.5 text-xs font-black uppercase text-slate-600" id="timerContainer">
                        <span class="text-slate-500 font-bold text-[11px] hidden sm:inline">TIME REMAINING:</span>
                        <span id="timerDisplay" class="font-mono text-base sm:text-lg font-black text-[#dc2626]">--:--</span>
                    </div>

                    <!-- Prominent Red Submit Exam Button -->
                    <button type="button" onclick="confirmSubmit()" class="px-4 py-2 rounded-lg bg-[#dc2626] hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-sm transition-colors flex items-center gap-1.5">
                        <span>SUBMIT EXAM</span>
                    </button>
                </div>

            </div>

            <!-- Question Stem -->
            <div class="py-4">
                <div id="questionStem" class="text-sm sm:text-base font-medium text-slate-900 leading-relaxed select-none mb-4">
                    <!-- Stem inserted by JS -->
                </div>

                <!-- Diagram (if present) -->
                <div id="diagramContainer" class="mb-4 hidden text-center">
                    <img id="questionDiagram" src="" alt="Question diagram" class="max-h-56 rounded-xl mx-auto border border-slate-200 shadow-xs cursor-zoom-in" onclick="zoomDiagram(this.src)">
                </div>

                <!-- Response Choices (Radio CBT Style) -->
                <div class="space-y-2.5 select-none pt-2" id="optionsContainer">
                    <!-- Options generated by JS -->
                </div>
            </div>
        </div>

        <!-- Bottom Navigation Action Bar -->
        <div class="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
                <button type="button" id="prevBtn" onclick="prevQuestion()" class="px-4 py-2 rounded-lg bg-[#103a71] hover:bg-[#0d2e5a] text-white font-bold text-xs uppercase flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
                    <span>PREVIOUS</span>
                </button>
                <button type="button" id="nextBtn" onclick="nextQuestion()" class="px-4 py-2 rounded-lg bg-[#103a71] hover:bg-[#0d2e5a] text-white font-bold text-xs uppercase flex items-center gap-1.5 transition-all">
                    <span>NEXT</span>
                    <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                </button>
            </div>

            <div class="flex items-center gap-3">
                <button type="button" onclick="clearCurrentSelection()" class="text-xs font-semibold text-slate-400 hover:text-rose-600 transition-colors">
                    Clear Choice
                </button>
                <button type="button" onclick="toggleFlag()" id="flagBtn" class="px-3.5 py-2 rounded-lg bg-slate-500 hover:bg-slate-600 text-white font-bold text-xs uppercase flex items-center gap-1.5 transition-colors">
                    <i data-lucide="bookmark" class="w-3.5 h-3.5"></i>
                    <span id="flagLabel">MARK FOR REVIEW</span>
                </button>
            </div>
        </div>

    </div>

</div>

<!-- "Need Help?" Modal -->
<div id="helpModal" class="hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
        <div class="flex items-center justify-between border-b pb-3">
            <h3 class="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <i data-lucide="help-circle" class="w-4 h-4 text-[#103a71]"></i>
                <span>Examination Instructions &amp; Help</span>
            </h3>
            <button type="button" onclick="toggleHelpModal()" class="text-slate-400 hover:text-slate-800 text-lg">&times;</button>
        </div>
        <div class="text-xs text-slate-600 space-y-2.5 leading-relaxed">
            <p><strong>1. Navigation:</strong> Use the <em>Question Navigation Grid</em> on the left or the <em>Previous / Next</em> buttons below to move across items.</p>
            <p><strong>2. Color Codes:</strong> <span class="text-emerald-600 font-bold">Green</span> indicates answered questions, <span class="text-blue-600 font-bold">Blue</span> shows your active item, and <span class="text-amber-500 font-bold">Yellow</span> marks questions flagged for review.</p>
            <p><strong>3. Keyboard Shortcuts:</strong> Press <code>A</code>, <code>B</code>, <code>C</code>, <code>D</code> to select answers; use <code>Left/Right Arrow keys</code> to browse items, and <code>F</code> to mark for review.</p>
            <p><strong>4. Anti-Cheating Notice:</strong> Do not leave or switch browser tabs. Switching tabs or exiting fullscreen triggers proctor warning alerts and may submit your exam.</p>
        </div>
        <button type="button" onclick="toggleHelpModal()" class="w-full py-2.5 rounded-xl bg-[#103a71] text-white font-bold text-xs">
            Return to Examination
        </button>
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

<!-- Live Proctor Direct Warning Modal -->
<div id="proctorLiveWarningModal" class="hidden fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-sm w-full p-5 text-center space-y-3.5 shadow-2xl border-2 border-amber-500">
        <div class="w-12 h-12 mx-auto rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <i data-lucide="video" class="w-6 h-6"></i>
        </div>
        <div class="space-y-1.5">
            <h3 class="text-sm font-black text-amber-600 uppercase tracking-wider">Live Proctor Notice</h3>
            <p class="text-xs text-slate-700 leading-snug font-medium p-3 rounded-xl bg-amber-50 border border-amber-200 text-left" id="proctorLiveWarningMsg">
                The examination proctor is watching your camera live and flagged an activity.
            </p>
        </div>
        <p class="text-[11px] text-slate-500 font-medium">Please face your webcam directly and maintain focus on your screen.</p>
        <button type="button" onclick="dismissProctorWarning()" class="w-full py-2.5 rounded-xl bg-[#103a71] hover:bg-[#0d2e5a] text-white font-bold text-xs shadow-xs">
            Acknowledge &amp; Return to Test
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

    // Render Options (CBT Radio Style)
    const optContainer = document.getElementById('optionsContainer');
    optContainer.innerHTML = '';

    const currentPick = userAnswers[q.id] || null;
    const optionKeys = ['a', 'b', 'c', 'd'];

    optionKeys.forEach(opt => {
        if (!q[opt]) return;
        const isSelected = (currentPick === opt);

        const btn = document.createElement('div');
        btn.className = `p-3 sm:p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 select-none ${
            isSelected 
            ? 'border-blue-600 bg-blue-50/80 text-blue-950 font-semibold ring-2 ring-blue-500/20 shadow-xs' 
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
        }`;
        btn.onclick = () => selectOption(opt);

        btn.innerHTML = `
            <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'
            }">
                ${isSelected ? '<div class="w-2 h-2 rounded-full bg-white"></div>' : ''}
            </div>
            <div class="text-xs font-bold text-slate-700 uppercase font-mono mr-1">${opt})</div>
            <div class="text-xs sm:text-sm font-medium leading-snug flex-1">${q[opt]}</div>
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
            nextBtn.innerHTML = `<span>REVIEW &amp; SUBMIT</span><i data-lucide="check" class="w-3.5 h-3.5"></i>`;
        } else {
            nextBtn.innerHTML = `<span>NEXT</span><i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>`;
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
        btn.className = "px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs uppercase flex items-center gap-1.5 transition-colors";
        label.innerText = "BOOKMARKED";
    } else {
        btn.className = "px-3.5 py-2 rounded-lg bg-slate-500 hover:bg-slate-600 text-white font-bold text-xs uppercase flex items-center gap-1.5 transition-colors";
        label.innerText = "MARK FOR REVIEW";
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

        let bgClass = 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200';
        if (isCurrent) {
            bgClass = 'bg-[#1d4ed8] text-white font-black ring-2 ring-blue-300 shadow-sm';
        } else if (isAnswered) {
            bgClass = 'bg-[#22c55e] text-white font-bold shadow-xs';
        } else if (isFlagged) {
            bgClass = 'bg-amber-400 text-slate-900 font-bold';
        }

        item.className = `h-9 w-full rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center relative ${bgClass}`;
        item.innerText = idx + 1;

        if (isFlagged && !isCurrent && isAnswered) {
            const dot = document.createElement('span');
            dot.className = "absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-300 ring-1 ring-white";
            item.appendChild(dot);
        }

        grid.appendChild(item);
    });

    const remaining = QUESTIONS.length - answeredCount;
    const answeredEl = document.getElementById('answeredCount');
    if (answeredEl) answeredEl.innerText = answeredCount;
    const flaggedEl = document.getElementById('flaggedBadge');
    if (flaggedEl) flaggedEl.innerText = flaggedCount;
    const remainingEl = document.getElementById('remainingBadge');
    if (remainingEl) remainingEl.innerText = remaining;
}

function toggleHelpModal() {
    const m = document.getElementById('helpModal');
    if (m) m.classList.toggle('hidden');
}

let proctorCanvas = null;
let proctorInterval = null;

function initLiveWebcam() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 320 }, 
                height: { ideal: 240 },
                facingMode: "user"
            } 
        })
        .then(stream => {
            const vid = document.getElementById('liveWebcam');
            const ph = document.getElementById('webcamPlaceholder');
            if (vid) {
                vid.srcObject = stream;
                vid.classList.remove('hidden');
                if (ph) ph.classList.add('hidden');

                // Start Live Real-Time Proctoring Stream to Admin Panel
                startProctorStream(vid);
            }
        })
        .catch(err => {
            console.log('Webcam feed unavailable or blocked:', err.message);
        });
    }
}

function startProctorStream(videoEl) {
    if (!proctorCanvas) {
        proctorCanvas = document.createElement('canvas');
        proctorCanvas.width = 240;
        proctorCanvas.height = 180;
    }
    const ctx = proctorCanvas.getContext('2d');

    // Stream a frame every 1000ms (1 second) for continuous live motion
    proctorInterval = setInterval(() => {
        try {
            if (videoEl.readyState >= 2) {
                ctx.drawImage(videoEl, 0, 0, 240, 180);
                const frameJpeg = proctorCanvas.toDataURL('image/jpeg', 0.45);

                const payload = JSON.stringify({
                    session_id: SESSION_ID,
                    student_name: '<?= addslashes(htmlspecialchars($student['name'])) ?>',
                    matric_no: '<?= addslashes(htmlspecialchars($student['matric_no'])) ?>',
                    course_code: '<?= addslashes(htmlspecialchars($course['code'])) ?>',
                    tab_switches: tabSwitchCount,
                    frame: frameJpeg
                });

                // 1. Direct transmission to Local Admin Server on Port 8899 (ultra-low latency)
                fetch('http://localhost:8899/api/proctor_frame', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: payload,
                    mode: 'cors'
                }).then(r => r.json()).then(res => {
                    if (res && res.warning) {
                        showProctorDirectWarning(res.warning);
                    }
                }).catch(() => {});

                // 2. Also save to cloud PHP proctoring receiver
                fetch('log_proctor_frame.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: payload
                })
                .then(r => r.json())
                .then(res => {
                    if (res && res.warning) {
                        showProctorDirectWarning(res.warning);
                    }
                })
                .catch(() => {});
            }
        } catch (e) {}
    }, 1000);
}

function showProctorDirectWarning(msg) {
    const modal = document.getElementById('proctorLiveWarningModal');
    const msgEl = document.getElementById('proctorLiveWarningMsg');
    if (modal && msgEl) {
        msgEl.innerText = msg;
        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }
}

function dismissProctorWarning() {
    const modal = document.getElementById('proctorLiveWarningModal');
    if (modal) modal.classList.add('hidden');
}
window.addEventListener('DOMContentLoaded', initLiveWebcam);

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
