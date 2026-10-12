<?php
/**
 * Prometric / Board Examination CBT Simulation Environment - Clinical Medical Edition
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
    echo "<div class='max-w-md mx-auto p-8 my-12 bg-white rounded-3xl border border-teal-200 text-center space-y-3 shadow-xs'>
        <div class='w-12 h-12 mx-auto rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center'><i data-lucide='help-circle' class='w-6 h-6'></i></div>
        <h2 class='text-base font-bold text-slate-800'>No Questions Available Yet</h2>
        <p class='text-xs text-slate-500'>There are currently no questions added to this test. Please check back later or contact your instructor.</p>
        <a href='courses.php' class='inline-block px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 transition-colors'>Return to Tests</a>
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

<div class="w-full max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-3 select-none" id="examRoot">

    <!-- ================= BRAND NEW PROCTOR VIEW & EXAM HUD ================= -->
    <div class="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl border border-teal-500/25 p-3 sm:p-4 mb-3 sm:mb-4 shadow-xl relative overflow-hidden">
        
        <!-- Subtle Background Glow -->
        <div class="absolute -right-16 -top-16 w-56 h-56 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -left-16 -bottom-16 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 relative z-10">

            <!-- 1. LEFT: Medical Examination Badge & Course Info -->
            <div class="flex items-center gap-3">
                <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-600/30 border border-teal-400/40 flex items-center justify-center text-teal-300 shrink-0 shadow-inner">
                    <svg class="w-6 h-6 sm:w-7 sm:h-7 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                        <path d="M2 17l10 5 10-5"></path>
                        <path d="M2 12l10 5 10-5"></path>
                    </svg>
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded-md bg-teal-400/15 border border-teal-400/30 text-teal-300 font-mono font-black text-xs sm:text-sm tracking-wider">
                            <?= htmlspecialchars($course['code']) ?>
                        </span>
                        <span class="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden sm:inline">
                            Apex Medical Examination
                        </span>
                    </div>
                    <h1 class="text-xs sm:text-sm font-extrabold text-white tracking-tight mt-0.5 truncate max-w-[260px] sm:max-w-md">
                        <?= htmlspecialchars($course['title']) ?>
                    </h1>
                </div>
            </div>

            <!-- 2. CENTER: Digital Countdown Timer Capsule -->
            <div class="flex items-center justify-center">
                <div class="flex items-center gap-2 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-2xl bg-black/60 border border-teal-500/30 text-white shadow-inner" id="timerContainer">
                    <div class="w-2 h-2 rounded-full bg-rose-500 animate-ping"></div>
                    <span class="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">TIME LEFT:</span>
                    <span id="timerDisplay" class="font-mono text-base sm:text-xl font-black text-rose-400 tracking-wider">--:--</span>
                </div>
            </div>

            <!-- 3. RIGHT: REDESIGNED PROCTOR SUPERVISION POD -->
            <div class="flex items-center justify-between lg:justify-end gap-3 sm:gap-4 shrink-0 border-t lg:border-t-0 border-white/10 pt-2 lg:pt-0">
                
                <!-- Rebuilt Live Camera Viewfinder Lens with Futuristic Status Aura -->
                <div class="relative w-24 h-16 sm:w-28 sm:h-18 rounded-2xl overflow-hidden bg-black border-2 border-teal-400/50 shadow-[0_0_20px_rgba(20,184,166,0.25)] flex items-center justify-center shrink-0">
                    <video id="liveWebcam" autoplay playsinline muted class="w-full h-full object-cover hidden"></video>
                    
                    <!-- Fallback placeholder icon -->
                    <div id="webcamPlaceholder" class="flex flex-col items-center justify-center text-slate-400">
                        <i data-lucide="user-check" class="w-5 h-5 sm:w-6 sm:h-6 text-teal-400/80"></i>
                    </div>

                    <!-- Modern Target / Viewfinder Brackets -->
                    <div class="absolute inset-1 pointer-events-none border border-teal-400/20 rounded-xl"></div>

                    <!-- Live Proctoring Status Pill Overlay -->
                    <div class="absolute bottom-1 left-1 right-1 bg-black/85 backdrop-blur-md rounded-md px-1.5 py-0.5 flex items-center justify-center gap-1 shadow-xs border border-white/10">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                        <span class="text-[7px] sm:text-[8px] font-black tracking-wider uppercase text-emerald-300 font-mono">LIVE PROCTOR</span>
                    </div>
                </div>

                <!-- Candidate Credentials & Quick Actions Capsule -->
                <div class="text-xs space-y-1">
                    <div class="flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-teal-400"></span>
                        <span class="font-black text-white text-[12px] sm:text-[13px] tracking-tight truncate max-w-[140px] sm:max-w-[190px]">
                            <?= strtoupper(htmlspecialchars($student['name'])) ?>
                        </span>
                    </div>
                    <div class="font-mono text-[10px] sm:text-[11px] text-teal-300 font-bold truncate max-w-[140px] sm:max-w-[190px]">
                        ID: <span class="text-white"><?= htmlspecialchars($student['matric_no']) ?></span>
                    </div>
                    
                    <!-- Controls Bar -->
                    <div class="flex items-center gap-1.5 pt-0.5">
                        <!-- Mobile Palette Button -->
                        <button type="button" onclick="toggleMobilePalette()" class="lg:hidden px-2 py-0.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 border border-teal-400/30 font-bold text-[10px] flex items-center gap-1 transition-all active:scale-95">
                            <i data-lucide="layout-grid" class="w-3 h-3 text-teal-300"></i>
                            <span>Grid (<span id="mobileHeaderAnsCount">0</span>/<?= $totalQuestions ?>)</span>
                        </button>
                        
                        <button type="button" onclick="toggleFullscreen()" title="Toggle Fullscreen" class="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] flex items-center gap-1 transition-all">
                            <i data-lucide="maximize-2" class="w-3 h-3 text-teal-300"></i>
                            <span class="hidden sm:inline">Screen</span>
                        </button>

                        <button type="button" onclick="toggleHelpModal()" class="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] transition-all">
                            Help
                        </button>
                    </div>
                </div>

            </div>

        </div>
    </div>

    <!-- ================= MAIN TWO-COLUMN CBT WORKSPACE ================= -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start" id="examApp">

        <!-- RIGHT/MAIN COLUMN: Question Stage (1st on mobile, 8 cols on lg) -->
        <div class="order-1 lg:order-2 lg:col-span-8 bg-white rounded-3xl border border-teal-100 shadow-sm p-4 sm:p-7 space-y-4 flex flex-col justify-between min-h-[480px] sm:min-h-[530px] relative overflow-hidden">
            
            <!-- Sleek Top Micro Progress Bar -->
            <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-1">
                <div id="testProgressBar" class="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-300" style="width: 0%"></div>
            </div>

            <div>
                <!-- Top Status Bar: Question Progress, Speech, Font Size, Calculator & Prominent Submit -->
                <div class="flex flex-wrap items-center justify-between gap-2.5 pb-3.5 border-b border-slate-100">
                    
                    <!-- Question Counter & Tools -->
                    <div class="flex items-center gap-2">
                        <span class="text-xs sm:text-sm font-black text-slate-800 font-mono px-2.5 py-1 rounded-xl bg-teal-50 border border-teal-200/60 text-teal-900" id="questionHeaderNumber">
                            Question 1 of <?= $totalQuestions ?>
                        </span>
                        
                        <div class="flex items-center gap-1">
                            <button type="button" onclick="speakCurrentQuestion()" title="Listen to question" class="p-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-all">
                                <i data-lucide="volume-2" class="w-3.5 h-3.5"></i>
                            </button>
                            <?php if ($calculatorAllowed): ?>
                            <button type="button" onclick="toggleCalculator()" title="Calculator" class="p-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-all">
                                <i data-lucide="calculator" class="w-3.5 h-3.5"></i>
                            </button>
                            <?php endif; ?>
                            <button type="button" onclick="toggleFontSize()" title="Adjust font size" class="p-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 font-bold text-[11px] sm:text-xs transition-all">
                                A<span class="text-[9px]">±</span>
                            </button>
                        </div>
                    </div>

                    <!-- Prominent Red Submit Exam Button -->
                    <button type="button" onclick="confirmSubmit()" class="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold text-[11px] sm:text-xs uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 active:scale-95">
                        <i data-lucide="send" class="w-3.5 h-3.5"></i>
                        <span>SUBMIT EXAM</span>
                    </button>

                </div>

                <!-- Question Stem -->
                <div class="py-2 sm:py-3">
                    <div id="questionStem" class="text-sm sm:text-base font-medium text-slate-900 leading-relaxed select-none mb-3 sm:mb-4">
                        <!-- Stem inserted by JS -->
                    </div>

                    <!-- Diagram (if present) -->
                    <div id="diagramContainer" class="mb-3 sm:mb-4 hidden text-center">
                        <img id="questionDiagram" src="" alt="Question diagram" class="max-h-48 sm:max-h-56 rounded-2xl mx-auto border border-teal-100 shadow-xs cursor-zoom-in" onclick="zoomDiagram(this.src)">
                    </div>

                    <!-- Response Choices (Radio CBT Style) -->
                    <div class="space-y-2.5 select-none pt-1" id="optionsContainer">
                        <!-- Options generated by JS -->
                    </div>
                </div>
            </div>

            <!-- Bottom Navigation Action Bar -->
            <div class="pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                <div class="flex items-center gap-2">
                    <button type="button" id="prevBtn" onclick="prevQuestion()" class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs uppercase flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-xs">
                        <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i>
                        <span>PREV</span>
                    </button>
                    <button type="button" id="nextBtn" onclick="nextQuestion()" class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs uppercase flex items-center gap-1.5 transition-all active:scale-95 shadow-xs">
                        <span>NEXT</span>
                        <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                    </button>
                </div>

                <div class="flex items-center gap-2 sm:gap-3">
                    <button type="button" onclick="clearCurrentSelection()" class="text-xs font-semibold text-slate-400 hover:text-rose-600 transition-colors">
                        Clear Choice
                    </button>
                    <button type="button" onclick="toggleFlag()" id="flagBtn" class="px-3.5 py-2.5 rounded-xl bg-slate-500 hover:bg-slate-600 text-white font-bold text-xs uppercase flex items-center gap-1.5 transition-colors shadow-xs">
                        <i data-lucide="bookmark" class="w-3.5 h-3.5"></i>
                        <span id="flagLabel">BOOKMARK</span>
                    </button>
                </div>
            </div>

        </div>

        <!-- LEFT COLUMN: Desktop Question Navigation Grid (hidden on mobile, visible on lg) -->
        <div class="order-2 lg:order-1 lg:col-span-4 hidden lg:block bg-white rounded-3xl border border-teal-100 shadow-sm p-4 space-y-3.5 sticky top-4">
            
            <!-- Navigation Grid Header -->
            <div class="border-b border-slate-100 pb-2.5 flex items-center justify-between">
                <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <i data-lucide="layout-grid" class="w-4 h-4 text-teal-600"></i>
                    <span>Question Palette</span>
                </h3>
                <span class="text-[11px] font-mono font-bold text-slate-400"><?= $totalQuestions ?> Items</span>
            </div>

            <!-- Legend -->
            <div class="flex items-center justify-between text-[11px] font-semibold text-slate-600 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                <div class="flex items-center gap-1.5">
                    <span class="w-3.5 h-3.5 rounded bg-emerald-500 inline-block shadow-xs"></span>
                    <span>Answered</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="w-3.5 h-3.5 rounded bg-slate-200 border border-slate-300 inline-block"></span>
                    <span>Unanswered</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="w-3.5 h-3.5 rounded bg-amber-400 inline-block shadow-xs"></span>
                    <span>Flagged</span>
                </div>
            </div>

            <!-- 5-Column Grid Numbers Container -->
            <div class="grid grid-cols-5 gap-1.5 max-h-[380px] overflow-y-auto pr-1" id="paletteGrid">
                <!-- Numbers inserted by JS -->
            </div>

            <!-- Summary Counter Footer -->
            <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500 font-bold">
                <span>Ans: <strong id="answeredCount" class="text-emerald-600">0</strong>/<?= $totalQuestions ?></span>
                <span>Flagged: <strong id="flaggedBadge" class="text-amber-500">0</strong></span>
                <span>Left: <strong id="remainingBadge" class="text-slate-600"><?= $totalQuestions ?></strong></span>
            </div>

        </div>

    </div>

</div>

<!-- Mobile Question Palette Drawer / Bottom Sheet -->
<div id="mobilePaletteModal" class="hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4" onclick="toggleMobilePalette()">
    <div class="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[85vh] p-4 sm:p-5 text-slate-800 shadow-2xl border border-slate-200 flex flex-col space-y-3" onclick="event.stopPropagation()">
        
        <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                    <i data-lucide="layout-grid" class="w-4 h-4"></i>
                </div>
                <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider">Question Navigation Palette</h3>
            </div>
            <button type="button" onclick="toggleMobilePalette()" class="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>

        <!-- Legend -->
        <div class="flex items-center justify-between text-[10px] font-semibold text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
            <div class="flex items-center gap-1">
                <span class="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
                <span>Answered</span>
            </div>
            <div class="flex items-center gap-1">
                <span class="w-3 h-3 rounded bg-slate-200 border border-slate-300 inline-block"></span>
                <span>Unanswered</span>
            </div>
            <div class="flex items-center gap-1">
                <span class="w-3 h-3 rounded bg-amber-400 inline-block"></span>
                <span>Flagged</span>
            </div>
        </div>

        <!-- Grid Numbers (6 columns on mobile phones) -->
        <div class="grid grid-cols-6 gap-1.5 overflow-y-auto max-h-[50vh] p-1" id="mobilePaletteGrid">
            <!-- Injected by JS -->
        </div>

        <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono font-bold text-slate-600">
            <span>Ans: <strong id="mobileAnsweredCount" class="text-emerald-600">0</strong>/<?= $totalQuestions ?></span>
            <button type="button" onclick="toggleMobilePalette()" class="px-4 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-bold uppercase">
                Return to Question
            </button>
        </div>

    </div>
</div>

<!-- Custom Submit Examination Confirmation Dialog -->
<div id="submitConfirmModal" class="hidden fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 text-slate-800 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-200">
        
        <!-- Modal Header -->
        <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                <i data-lucide="send" class="w-6 h-6"></i>
            </div>
            <div>
                <h3 class="text-base font-black text-slate-900 tracking-tight">Finalize &amp; Submit Test?</h3>
                <p class="text-xs text-slate-500 font-medium">Apex Pre-Medical Sciences Examination Council</p>
            </div>
        </div>

        <!-- Metric Badges Grid -->
        <div class="grid grid-cols-3 gap-2 text-center">
            <div class="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100">
                <div class="text-base sm:text-lg font-black text-emerald-700" id="submitModalAnswered">0</div>
                <div class="text-[9px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Answered</div>
            </div>
            <div class="p-2.5 rounded-2xl bg-rose-50 border border-rose-100">
                <div class="text-base sm:text-lg font-black text-rose-700" id="submitModalUnanswered">0</div>
                <div class="text-[9px] sm:text-[10px] font-bold text-rose-600 uppercase tracking-wider">Unanswered</div>
            </div>
            <div class="p-2.5 rounded-2xl bg-amber-50 border border-amber-100">
                <div class="text-base sm:text-lg font-black text-amber-700" id="submitModalFlagged">0</div>
                <div class="text-[9px] sm:text-[10px] font-bold text-amber-600 uppercase tracking-wider">Flagged</div>
            </div>
        </div>

        <!-- Dynamic Notice Box -->
        <div id="submitModalNotice" class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700"></div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2.5 pt-1">
            <button type="button" onclick="dismissSubmitModal()" class="flex-1 py-2.5 sm:py-3 px-3 rounded-2xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors">
                Keep Reviewing
            </button>
            <button type="button" onclick="executeSubmit()" class="flex-1 py-2.5 sm:py-3 px-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95">
                <i data-lucide="check-circle" class="w-4 h-4"></i>
                <span>Yes, Submit Now</span>
            </button>
        </div>

    </div>
</div>

<!-- Fullscreen Gateway Modal (When Enforced in Admin Settings) -->
<div id="fullscreenGatewayModal" class="hidden fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200">
        <div class="w-14 h-14 mx-auto rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center">
            <i data-lucide="maximize" class="w-7 h-7"></i>
        </div>
        <div class="space-y-1">
            <h3 class="text-base font-black text-slate-900 tracking-tight">Proctored Fullscreen Mode Required</h3>
            <p class="text-xs text-slate-600 leading-relaxed">
                The administrator has configured this examination to require Fullscreen Mode. To prevent window switching and maintain examination security, you must enter fullscreen to proceed.
            </p>
        </div>
        <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 font-medium">
            Please close any background tabs or external applications before beginning.
        </div>
        <button type="button" onclick="enterFullscreenExam()" class="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 active:scale-95">
            <i data-lucide="shield-check" class="w-4 h-4"></i>
            <span>Enter Fullscreen &amp; Begin Test</span>
        </button>
    </div>
</div>

<!-- Fullscreen Exited Warning Modal -->
<div id="fullscreenExitModal" class="hidden fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl border-2 border-rose-500">
        <div class="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
            <i data-lucide="alert-octagon" class="w-7 h-7"></i>
        </div>
        <div class="space-y-1">
            <h3 class="text-base font-black text-rose-600 tracking-tight">Security Notice: Fullscreen Exited</h3>
            <p class="text-xs text-slate-600 leading-snug">
                You exited proctored fullscreen mode. This event has been recorded in your security audit log. Please re-enter fullscreen immediately to continue.
            </p>
        </div>
        <div class="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono font-bold" id="fullscreenExitWarningCount">
            Warning 1 of 3 allowed
        </div>
        <button type="button" onclick="reEnterFullscreenExam()" class="w-full py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 active:scale-95">
            <i data-lucide="maximize" class="w-4 h-4"></i>
            <span>Re-Enter Fullscreen Immediately</span>
        </button>
    </div>
</div>

<!-- Screen Blur Overlay when Window Loses Focus -->
<div id="blurScreenOverlay" class="hidden fixed inset-0 z-40 bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
    <div class="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-teal-300 animate-pulse">
        <i data-lucide="lock" class="w-8 h-8"></i>
    </div>
    <h3 class="text-lg font-black tracking-tight">Test Window Paused &bull; Focus Lost</h3>
    <p class="text-xs text-slate-300 max-w-xs leading-relaxed">
        You switched away from the active test window. Leaving the examination tab is prohibited and has been recorded.
    </p>
    <button type="button" onclick="resumeTestFromBlur()" class="mt-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider transition-all">
        Resume Examination
    </button>
</div>

<!-- "Need Help?" Modal -->
<div id="helpModal" class="hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
        <div class="flex items-center justify-between border-b pb-3">
            <h3 class="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <i data-lucide="help-circle" class="w-4 h-4 text-teal-600"></i>
                <span>Examination Instructions &amp; Help</span>
            </h3>
            <button type="button" onclick="toggleHelpModal()" class="text-slate-400 hover:text-slate-800 text-lg">&times;</button>
        </div>
        <div class="text-xs text-slate-600 space-y-2.5 leading-relaxed">
            <p><strong>1. Navigation:</strong> Use the <em>Question Navigation Grid</em> or the <em>Previous / Next</em> buttons to navigate between questions.</p>
            <p><strong>2. Color Codes:</strong> <span class="text-emerald-600 font-bold">Green</span> indicates answered questions, <span class="text-teal-600 font-bold">Teal</span> shows active question, and <span class="text-amber-500 font-bold">Yellow</span> marks questions flagged for review.</p>
            <p><strong>3. Keyboard Shortcuts:</strong> Press <code>A</code>, <code>B</code>, <code>C</code>, <code>D</code> to select options; use <code>Arrow keys</code> to move, and <code>F</code> to bookmark.</p>
            <p><strong>4. Security Rules:</strong> Do not switch tabs or minimize the window. Text copying and external shortcuts are strictly disabled.</p>
        </div>
        <button type="button" onclick="toggleHelpModal()" class="w-full py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs">
            Return to Examination
        </button>
    </div>
</div>

<!-- Diagram Zoom Modal -->
<div id="zoomModal" class="fixed inset-0 bg-slate-950/85 backdrop-blur-xs z-50 hidden flex items-center justify-center p-4" onclick="this.classList.add('hidden')">
    <div class="bg-white p-2.5 rounded-3xl max-w-2xl max-h-[90vh] overflow-auto shadow-2xl" onclick="event.stopPropagation()">
        <img id="zoomedImg" src="" alt="Zoomed Diagram" class="w-full rounded-2xl">
    </div>
</div>

<?php if ($calculatorAllowed): ?>
<!-- On-Screen Calculator -->
<div id="calcModal" class="fixed bottom-4 right-4 bg-slate-900 text-white p-3.5 rounded-3xl shadow-2xl z-50 hidden w-60 border border-teal-500/30">
    <div class="flex justify-between items-center mb-2.5">
        <span class="text-xs font-bold text-teal-300 flex items-center gap-1.5 font-mono">
            <i data-lucide="calculator" class="w-3.5 h-3.5 text-teal-400"></i>
            <span>Calculator</span>
        </span>
        <button type="button" onclick="toggleCalculator()" class="text-slate-400 hover:text-white"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
    </div>
    <input type="text" id="calcDisplay" readonly class="w-full bg-slate-800 text-right px-2.5 py-1.5 rounded-xl text-base font-mono mb-2 text-white border border-slate-700" value="0">
    <div class="grid grid-cols-4 gap-1 text-xs font-bold font-mono">
        <button onclick="calcClear()" class="p-1.5 bg-slate-800 rounded-lg hover:bg-slate-750 text-rose-400">C</button>
        <button onclick="calcInput('/')" class="p-1.5 bg-slate-800 rounded-lg hover:bg-slate-750 text-teal-400">&divide;</button>
        <button onclick="calcInput('*')" class="p-1.5 bg-slate-800 rounded-lg hover:bg-slate-750 text-teal-400">&times;</button>
        <button onclick="calcInput('-')" class="p-1.5 bg-slate-800 rounded-lg hover:bg-slate-750 text-teal-400">-</button>
        <button onclick="calcInput('7')" class="p-1.5 bg-slate-800 rounded-lg hover:bg-slate-750">7</button>
        <button onclick="calcInput('8')" class="p-1.5 bg-slate-800 rounded-lg hover:bg-slate-750">8</button>
        <button onclick="calcInput('9')" class="p-1.5 bg-slate-800 rounded-lg hover:bg-slate-750">9</button>
        <button onclick="calcInput('+')" class="p-1.5 bg-slate-800 rounded-lg hover:bg-slate-750 text-teal-400">+</button>
        <button onclick="calcInput('4')" class="p-1.5 bg-slate-800 rounded-lg hover:bg-slate-750">4</button>
        <button onclick="calcInput('5')" class="p-1.5 bg-slate-800 rounded-lg hover:bg-slate-750">5</button>
        <button onclick="calcInput('6')" class="p-1.5 bg-slate-800 rounded-lg hover:bg-slate-750">6</button>
        <button onclick="calcEqual()" class="row-span-2 p-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center justify-center">=</button>
        <button onclick="calcInput('1')" class="p-1.5 bg-slate-800 rounded-lg hover:bg-slate-750">1</button>
        <button onclick="calcInput('2')" class="p-1.5 bg-slate-800 rounded-lg hover:bg-slate-750">2</button>
        <button onclick="calcInput('3')" class="p-1.5 bg-slate-800 rounded-lg hover:bg-slate-750">3</button>
        <button onclick="calcInput('0')" class="col-span-2 p-1.5 bg-slate-800 rounded-lg hover:bg-slate-750">0</button>
        <button onclick="calcInput('.')" class="p-1.5 bg-slate-800 rounded-lg hover:bg-slate-750">.</button>
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

<!-- Tab Switch Warning Modal -->
<div id="cheatingModal" class="hidden fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-sm w-full p-5 text-center space-y-3.5 shadow-2xl border-2 border-rose-500">
        <div class="w-12 h-12 mx-auto rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <i data-lucide="shield-alert" class="w-6 h-6"></i>
        </div>
        <div class="space-y-1">
            <h3 class="text-sm font-black text-rose-600 uppercase tracking-wider" id="cheatModalTitle">Warning: Switched Tabs</h3>
            <p class="text-xs text-slate-600 leading-snug font-medium" id="cheatModalMsg">
                You clicked away from this test window. Please stay on this page until you finish your test.
            </p>
        </div>
        <div class="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono font-bold">
            <span id="cheatModalCount">Warning 1 of 3</span>
        </div>
        <button type="button" onclick="dismissCheatingModal()" class="w-full py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs">
            Return to Test
        </button>
    </div>
</div>

<!-- Live Proctor Direct Warning Modal -->
<div id="proctorLiveWarningModal" class="hidden fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl max-w-sm w-full p-5 text-center space-y-3.5 shadow-2xl border-2 border-amber-500">
        <div class="w-12 h-12 mx-auto rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <i data-lucide="video" class="w-6 h-6"></i>
        </div>
        <div class="space-y-1.5">
            <h3 class="text-sm font-black text-amber-600 uppercase tracking-wider">Live Proctor Notice</h3>
            <p class="text-xs text-slate-700 leading-snug font-medium p-3 rounded-2xl bg-amber-50 border border-amber-200 text-left" id="proctorLiveWarningMsg">
                The examination proctor is watching your camera live and flagged an activity.
            </p>
        </div>
        <p class="text-[11px] text-slate-500 font-medium">Please face your webcam directly and maintain focus on your screen.</p>
        <button type="button" onclick="dismissProctorWarning()" class="w-full py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs">
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

// Anti Cheating Telemetry Settings
let tabSwitchCount = 0;
let cheatingLogs = [];
const MAX_TAB_SWITCHES = <?= (int)$maxTabSwitches ?>;
const ANTI_CHEAT_BLUR = <?= (int)$antiCheatBlur ?>;
const ENFORCE_FULLSCREEN = <?= (int)$enforceFullscreen ?>;
const AUTO_SUBMIT = <?= (int)$autoSubmit ?>;
const SESSION_ID = '<?= htmlspecialchars($sessionId) ?>';

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

    // Keyboard shortcuts & strict security listeners
    setupKeyboardShortcuts();
    setupStrictSecurity();
    setupTabSecurity();
    setupFullscreenSecurity();
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
            container.className = "flex items-center gap-2 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-white shadow-inner animate-pulse";
            display.className = "font-mono text-base sm:text-xl font-black text-rose-400";
        } else if (secondsRemaining < 600) {
            container.className = "flex items-center gap-2 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-2xl bg-amber-950/80 border border-amber-500/50 text-white shadow-inner";
            display.className = "font-mono text-base sm:text-xl font-black text-amber-400";
        }
    }
}

function renderCurrentQuestion() {
    const q = QUESTIONS[currentIndex];
    const headEl = document.getElementById('questionHeaderNumber');
    if (headEl) headEl.innerText = `Question ${currentIndex + 1} of ${QUESTIONS.length}`;

    // Update progress bar
    const progBar = document.getElementById('testProgressBar');
    if (progBar) {
        const pct = Math.round((Object.keys(userAnswers).length / QUESTIONS.length) * 100);
        progBar.style.width = pct + '%';
    }

    // Render stem text
    const stemEl = document.getElementById('questionStem');
    stemEl.innerHTML = q.text;
    stemEl.className = isLargeFont 
        ? "text-base sm:text-lg font-medium text-slate-900 leading-relaxed mb-3 sm:mb-4 select-none"
        : "text-sm sm:text-base font-medium text-slate-900 leading-relaxed mb-3 sm:mb-4 select-none";

    // Render diagram
    const diagContainer = document.getElementById('diagramContainer');
    if (q.diagram_url) {
        document.getElementById('questionDiagram').src = q.diagram_url;
        diagContainer.classList.remove('hidden');
    } else {
        diagContainer.classList.add('hidden');
    }

    // Render Options (CBT Radio Style with Glowing Medallions)
    const optContainer = document.getElementById('optionsContainer');
    optContainer.innerHTML = '';

    const currentPick = userAnswers[q.id] || null;
    const optionKeys = ['a', 'b', 'c', 'd'];

    optionKeys.forEach(opt => {
        if (!q[opt]) return;
        const isSelected = (currentPick === opt);

        const btn = document.createElement('div');
        btn.className = `p-3 sm:p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 sm:gap-3.5 select-none active:scale-[0.99] min-h-[50px] ${
            isSelected 
            ? 'border-teal-500 bg-teal-50/90 text-teal-950 font-semibold ring-2 ring-teal-400/30 shadow-xs' 
            : 'border-slate-200 hover:border-teal-200 hover:bg-slate-50/80 text-slate-800'
        }`;
        btn.onclick = () => selectOption(opt);

        btn.innerHTML = `
            <div class="w-6 h-6 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all ${
                isSelected ? 'border-teal-600 bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-xs' : 'border-slate-300 bg-white text-slate-600'
            }">
                <span class="text-[11px] font-black uppercase font-mono">${opt.toUpperCase()}</span>
            </div>
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
                {left: '$', right: '$', display: false},
                {left: '\\(', right: '\\)', display: false},
                {left: '\\[', right: '\\]', display: true}
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
    const m = document.getElementById('mobilePaletteModal');
    if (m && !m.classList.contains('hidden')) {
        m.classList.add('hidden');
    }
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
        btn.className = "px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs uppercase flex items-center gap-1.5 transition-colors shadow-xs";
        label.innerText = "BOOKMARKED";
    } else {
        btn.className = "px-3.5 py-2.5 rounded-xl bg-slate-500 hover:bg-slate-600 text-white font-bold text-xs uppercase flex items-center gap-1.5 transition-colors shadow-xs";
        label.innerText = "BOOKMARK";
    }
}

function renderPalette() {
    const desktopGrid = document.getElementById('paletteGrid');
    const mobileGrid = document.getElementById('mobilePaletteGrid');

    let answeredCount = 0;
    let flaggedCount = 0;

    const desktopFrag = document.createDocumentFragment();
    const mobileFrag = document.createDocumentFragment();

    QUESTIONS.forEach((q, idx) => {
        const isAnswered = !!userAnswers[q.id];
        const isFlagged = flaggedQuestions.has(q.id);
        const isCurrent = (idx === currentIndex);

        if (isAnswered) answeredCount++;
        if (isFlagged) flaggedCount++;

        let bgClass = 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200';
        if (isCurrent) {
            bgClass = 'bg-teal-600 text-white font-black ring-2 ring-teal-300 shadow-sm';
        } else if (isAnswered) {
            bgClass = 'bg-emerald-500 text-white font-bold shadow-xs';
        } else if (isFlagged) {
            bgClass = 'bg-amber-400 text-slate-900 font-bold';
        }

        // Desktop Button
        const dBtn = document.createElement('button');
        dBtn.type = 'button';
        dBtn.onclick = () => jumpToQuestion(idx);
        dBtn.className = `h-9 w-full rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center relative ${bgClass}`;
        dBtn.innerText = idx + 1;
        if (isFlagged && !isCurrent && isAnswered) {
            const dot = document.createElement('span');
            dot.className = "absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-300 ring-1 ring-white";
            dBtn.appendChild(dot);
        }
        desktopFrag.appendChild(dBtn);

        // Mobile Button
        const mBtn = document.createElement('button');
        mBtn.type = 'button';
        mBtn.onclick = () => jumpToQuestion(idx);
        mBtn.className = `h-9 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center relative ${bgClass}`;
        mBtn.innerText = idx + 1;
        if (isFlagged && !isCurrent && isAnswered) {
            const dot = document.createElement('span');
            dot.className = "absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-300 ring-1 ring-white";
            mBtn.appendChild(dot);
        }
        mobileFrag.appendChild(mBtn);
    });

    if (desktopGrid) {
        desktopGrid.innerHTML = '';
        desktopGrid.appendChild(desktopFrag);
    }
    if (mobileGrid) {
        mobileGrid.innerHTML = '';
        mobileGrid.appendChild(mobileFrag);
    }

    const remaining = QUESTIONS.length - answeredCount;
    
    // Desktop Counters
    const answeredEl = document.getElementById('answeredCount');
    if (answeredEl) answeredEl.innerText = answeredCount;
    const flaggedEl = document.getElementById('flaggedBadge');
    if (flaggedEl) flaggedEl.innerText = flaggedCount;
    const remainingEl = document.getElementById('remainingBadge');
    if (remainingEl) remainingEl.innerText = remaining;

    // Mobile Badges
    const mobHeader = document.getElementById('mobileHeaderAnsCount');
    if (mobHeader) mobHeader.innerText = answeredCount;
    const mobCount = document.getElementById('mobileAnsweredCount');
    if (mobCount) mobCount.innerText = answeredCount;

    // Update progress bar
    const progBar = document.getElementById('testProgressBar');
    if (progBar) {
        const pct = Math.round((answeredCount / QUESTIONS.length) * 100);
        progBar.style.width = pct + '%';
    }
}

function toggleMobilePalette() {
    const m = document.getElementById('mobilePaletteModal');
    if (m) {
        m.classList.toggle('hidden');
        if (window.lucide) lucide.createIcons();
    }
}

function toggleHelpModal() {
    const m = document.getElementById('helpModal');
    if (m) m.classList.toggle('hidden');
}

// Custom Submit Confirmation Dialog Logic
function confirmSubmit() {
    const answeredCount = Object.keys(userAnswers).length;
    const unanswered = QUESTIONS.length - answeredCount;
    const flagged = flaggedQuestions.size;

    document.getElementById('submitModalAnswered').innerText = answeredCount;
    document.getElementById('submitModalUnanswered').innerText = unanswered;
    document.getElementById('submitModalFlagged').innerText = flagged;

    const noticeEl = document.getElementById('submitModalNotice');
    if (unanswered > 0) {
        noticeEl.className = "p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-1";
        noticeEl.innerHTML = `
            <div class="font-bold flex items-center gap-1.5 text-amber-800">
                <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-600"></i>
                <span>Attention: ${unanswered} Unanswered Question(s)</span>
            </div>
            <p>You still have <strong>${unanswered}</strong> question(s) without an answer. Submitting now will finalize your test and grade all unanswered questions as zero.</p>
        `;
    } else {
        noticeEl.className = "p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs leading-relaxed space-y-1";
        noticeEl.innerHTML = `
            <div class="font-bold flex items-center gap-1.5 text-emerald-800">
                <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-600"></i>
                <span>All Questions Answered</span>
            </div>
            <p>Excellent! You have answered all <strong>${QUESTIONS.length}</strong> questions. Confirm below to grade and compute your results.</p>
        `;
    }

    const modal = document.getElementById('submitConfirmModal');
    if (modal) {
        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }
}

function dismissSubmitModal() {
    const modal = document.getElementById('submitConfirmModal');
    if (modal) modal.classList.add('hidden');
}

function executeSubmit() {
    document.getElementById('answersJsonInput').value = JSON.stringify(userAnswers);
    document.getElementById('questionIdsJsonInput').value = JSON.stringify(QUESTIONS.map(q => q.id));
    document.getElementById('submissionForm').submit();
}

// Live Webcam & Real-Time Proctoring Stream
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

    let proctorTick = 0;
    // High-rate transmission every 500ms (0.5s / 2 FPS)
    proctorInterval = setInterval(() => {
        try {
            if (videoEl.readyState >= 2) {
                ctx.drawImage(videoEl, 0, 0, 240, 180);
                const frameJpeg = proctorCanvas.toDataURL('image/jpeg', 0.42);
                proctorTick++;

                const payload = JSON.stringify({
                    session_id: SESSION_ID,
                    student_name: '<?= addslashes(htmlspecialchars($student['name'])) ?>',
                    matric_no: '<?= addslashes(htmlspecialchars($student['matric_no'])) ?>',
                    course_code: '<?= addslashes(htmlspecialchars($course['code'])) ?>',
                    tab_switches: tabSwitchCount,
                    frame: frameJpeg
                });

                // 1. Direct transmission to Local Admin Server on Port 8899
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

                // 2. Cloud DB sync (every 3rd frame ~1.5s or on infraction)
                if (proctorTick % 3 === 0 || tabSwitchCount > 0) {
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
            }
        } catch (e) {}
    }, 500);
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

// Text to speech
function speakCurrentQuestion() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const q = QUESTIONS[currentIndex];
        const utterance = new SpeechSynthesisUtterance(q.text.replace(/[$*]/g, ''));
        window.speechSynthesis.speak(utterance);
    }
}

// Keyboard navigation
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

// STRICT SECURITY: Disable Copy, Cut, Paste, Selection, Context Menu & Inspection
function setupStrictSecurity() {
    // 1. Disable Right Click Context Menu
    document.addEventListener('contextmenu', e => {
        e.preventDefault();
        return false;
    }, { capture: true });

    // 2. Disable Copy, Cut & Paste
    document.addEventListener('copy', e => {
        e.preventDefault();
        return false;
    }, { capture: true });

    document.addEventListener('cut', e => {
        e.preventDefault();
        return false;
    }, { capture: true });

    document.addEventListener('paste', e => {
        e.preventDefault();
        return false;
    }, { capture: true });

    // 3. Disable Text Selection Start & Dragging
    document.addEventListener('selectstart', e => {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            return false;
        }
    }, { capture: true });

    document.addEventListener('dragstart', e => {
        e.preventDefault();
        return false;
    }, { capture: true });

    // 4. Block Inspection & Copy Key Chords
    document.addEventListener('keydown', e => {
        const key = e.key.toLowerCase();
        const ctrl = e.ctrlKey || e.metaKey;

        // F12 or devtools chords
        if (e.key === 'F12' || (ctrl && e.shiftKey && ['i', 'j', 'c'].includes(key))) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        // Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A, Ctrl+U, Ctrl+S, Ctrl+P
        if (ctrl && ['c', 'v', 'x', 'a', 'u', 's', 'p'].includes(key)) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }, { capture: true });
}

// TAB LEAVING & WINDOW BLUR SECURITY
function setupTabSecurity() {
    if (!ANTI_CHEAT_BLUR) return;

    let isBlurred = false;

    function handleBlur(reason) {
        if (isBlurred) return;
        isBlurred = true;

        const overlay = document.getElementById('blurScreenOverlay');
        if (overlay) overlay.classList.remove('hidden');

        recordCheatingEvent('TAB_SWITCH', reason);
    }

    function handleFocus() {
        if (!isBlurred) return;
        isBlurred = false;

        const overlay = document.getElementById('blurScreenOverlay');
        if (overlay) overlay.classList.add('hidden');
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            handleBlur('Switched browser tab or minimized window');
        } else {
            handleFocus();
        }
    });

    window.addEventListener('blur', () => {
        handleBlur('Browser window lost focus to background application');
    });

    window.addEventListener('focus', () => {
        handleFocus();
    });

    document.addEventListener('mouseleave', (e) => {
        if (e.clientY <= 0) {
            handleBlur('Pointer left examination window boundary');
        }
    });
}

function resumeTestFromBlur() {
    const overlay = document.getElementById('blurScreenOverlay');
    if (overlay) overlay.classList.add('hidden');
}

// FULLSCREEN SECURITY ENFORCEMENT
function setupFullscreenSecurity() {
    if (!ENFORCE_FULLSCREEN) return;

    // Check if initial fullscreen gateway is needed
    if (!document.fullscreenElement) {
        const gateway = document.getElementById('fullscreenGatewayModal');
        if (gateway) gateway.classList.remove('hidden');
    }

    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            recordCheatingEvent('FULLSCREEN_EXIT', 'Exited proctored fullscreen window');
            const exitModal = document.getElementById('fullscreenExitModal');
            const exitBadge = document.getElementById('fullscreenExitWarningCount');
            if (exitBadge) {
                exitBadge.innerText = MAX_TAB_SWITCHES > 0 
                    ? `Warning ${tabSwitchCount} of ${MAX_TAB_SWITCHES} allowed`
                    : `Warning #${tabSwitchCount}`;
            }
            if (exitModal) exitModal.classList.remove('hidden');
        } else {
            const gateway = document.getElementById('fullscreenGatewayModal');
            if (gateway) gateway.classList.add('hidden');
            const exitModal = document.getElementById('fullscreenExitModal');
            if (exitModal) exitModal.classList.add('hidden');
        }
    });
}

function enterFullscreenExam() {
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
            console.warn('Fullscreen request failed:', err.message);
        });
    }
    const gateway = document.getElementById('fullscreenGatewayModal');
    if (gateway) gateway.classList.add('hidden');
}

function reEnterFullscreenExam() {
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
    }
    const exitModal = document.getElementById('fullscreenExitModal');
    if (exitModal) exitModal.classList.add('hidden');
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    } else {
        document.exitFullscreen().catch(() => {});
    }
}

// Infraction Telemetry Dispatcher
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
                alert(`Security Notice: Maximum allowed warnings (${MAX_TAB_SWITCHES}) reached. Your test is now being submitted.`);
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
