<?php
/**
 * Test Results & Detailed Review - Clinical Medical Edition
 * Apex Pre-Medical Sciences Examination Portal
 */

require_once __DIR__ . '/config/db.php';

if (empty($_SESSION['student'])) {
    header('Location: login.php');
    exit;
}

$pageTitle = 'Examination Performance Transcript';
require_once __DIR__ . '/includes/header.php';

$db = DB::connect();

// Support result_id, id, or fallback to the student's last completed result
$resultId = $_GET['result_id'] ?? $_GET['id'] ?? ($_SESSION['last_result_id'] ?? '');

$student = $_SESSION['student'];

// If no direct result ID was provided, attempt to retrieve the latest result for this student
if (empty($resultId)) {
    $latestStmt = $db->prepare("SELECT id FROM results WHERE student_id = ? ORDER BY created_at DESC LIMIT 1");
    $latestStmt->execute([$student['id']]);
    $latest = $latestStmt->fetch();
    if ($latest && !empty($latest['id'])) {
        $resultId = $latest['id'];
    }
}

if (empty($resultId)) {
    header('Location: history.php');
    exit;
}

$stmt = $db->prepare("
    SELECT r.*, c.code as course_code, c.title as course_title
    FROM results r
    LEFT JOIN courses c ON r.course_id = c.id
    WHERE r.id = ? AND r.student_id = ?
    LIMIT 1
");
$stmt->execute([$resultId, $student['id']]);
$res = $stmt->fetch();

if (!$res) {
    echo "<div class='max-w-2xl mx-auto p-8 my-12 bg-white rounded-3xl border border-teal-200 text-center space-y-4 shadow-sm'>
        <div class='w-12 h-12 mx-auto rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center'><i data-lucide='alert-circle' class='w-6 h-6'></i></div>
        <h2 class='text-base font-bold text-slate-800'>Examination Result Not Found</h2>
        <p class='text-xs text-slate-500'>We were unable to locate the requested examination record. It may still be processing or has been archived.</p>
        <a href='history.php' class='inline-block px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 transition-colors'>View Examination History</a>
    </div>";
    require_once __DIR__ . '/includes/footer.php';
    exit;
}

$questionIds = json_decode($res['question_ids'] ?? '[]', true) ?: [];
$studentAnswers = json_decode($res['student_answers'] ?? '{}', true) ?: [];
$rawTopicScores = json_decode($res['topic_breakdown'] ?? '{}', true) ?: [];

// Fetch question details for review
$questions = [];
$correctCount = 0;
$incorrectCount = 0;
$skippedCount = 0;

if (!empty($questionIds)) {
    $placeholders = implode(',', array_fill(0, count($questionIds), '?'));
    $qStmt = $db->prepare("SELECT * FROM questions WHERE id IN ($placeholders)");
    $qStmt->execute($questionIds);
    $rawQuestions = $qStmt->fetchAll();

    $map = [];
    foreach ($rawQuestions as $rq) $map[$rq['id']] = $rq;

    foreach ($questionIds as $qid) {
        if (isset($map[$qid])) {
            $questions[] = $map[$qid];
            $u = strtolower(trim((string)($studentAnswers[$qid] ?? '')));
            $k = strtolower(trim((string)$map[$qid]['correct_option']));
            if (empty($u)) {
                $skippedCount++;
            } elseif ($u === $k) {
                $correctCount++;
            } else {
                $incorrectCount++;
            }
        }
    }
}

// Fetch topic names for breakdown
$topicDetails = [];
if (!empty($rawTopicScores)) {
    $topicIds = array_keys($rawTopicScores);
    if (!empty($topicIds)) {
        $tPlaceholders = implode(',', array_fill(0, count($topicIds), '?'));
        $tStmt = $db->prepare("SELECT id, name FROM topics WHERE id IN ($tPlaceholders)");
        $tStmt->execute($topicIds);
        $tRows = $tStmt->fetchAll();
        $tNameMap = [];
        foreach ($tRows as $tr) $tNameMap[$tr['id']] = $tr['name'];

        foreach ($rawTopicScores as $tid => $tData) {
            $tName = $tNameMap[$tid] ?? ('Topic ' . substr($tid, 0, 8));
            $tTotal = (int)($tData['total'] ?? 0);
            $tCorrect = (int)($tData['correct'] ?? 0);
            $tPct = $tTotal > 0 ? round(($tCorrect / $tTotal) * 100, 1) : 0;
            $topicDetails[] = [
                'name' => $tName,
                'total' => $tTotal,
                'correct' => $tCorrect,
                'pct' => $tPct
            ];
        }
    }
}

$tabSwitches = (int)($res['tab_switches'] ?? 0);
$isCheating = (int)($res['is_flagged_cheating'] ?? 0);
$percentage = round((float)$res['percentage'], 1);
$grade = htmlspecialchars($res['grade'] ?: 'Passed');

$isFromBackNav = isset($_GET['notice']) && $_GET['notice'] === 'already_completed';
?>

<div class="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6" id="resultsApp">

    <!-- Notice Banner if User Tried to Navigate Back into the Completed Exam -->
    <?php if ($isFromBackNav): ?>
    <div class="p-4 rounded-3xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-3.5 shadow-sm animate-fade-in">
        <div class="w-10 h-10 rounded-2xl bg-amber-200/60 text-amber-800 flex items-center justify-center shrink-0">
            <i data-lucide="shield-alert" class="w-5 h-5 text-amber-700"></i>
        </div>
        <div class="space-y-0.5">
            <h4 class="text-sm font-black text-amber-900 tracking-tight">Examination Session Finalized &amp; Locked</h4>
            <p class="text-xs text-amber-800 leading-relaxed">
                You attempted to return to a test that was already completed and submitted. To preserve examination integrity, active test sessions cannot be re-entered. Your official score transcript is rendered below.
            </p>
        </div>
    </div>
    <?php endif; ?>

    <!-- In-App Back Navigation Locked Alert Modal / Toast -->
    <div id="backNavNoticeModal" class="hidden fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] p-4 rounded-2xl bg-slate-900/95 text-white border border-teal-400/40 shadow-2xl backdrop-blur-md flex items-center gap-3">
        <div class="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
            <i data-lucide="lock" class="w-4 h-4"></i>
        </div>
        <div class="text-xs flex-1">
            <div class="font-bold text-teal-200">Test Session Finalized</div>
            <div class="text-slate-300">You have completed this test. Back navigation into the active exam is disabled.</div>
        </div>
        <button type="button" onclick="document.getElementById('backNavNoticeModal').classList.add('hidden')" class="text-slate-400 hover:text-white p-1">
            <i data-lucide="x" class="w-4 h-4"></i>
        </button>
    </div>

    <!-- 1. Clinical Examination Performance Header Card -->
    <div class="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl border border-teal-500/30 p-5 sm:p-7 shadow-xl relative overflow-hidden">
        
        <!-- Glowing Ambient Lighting -->
        <div class="absolute -right-20 -top-20 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -left-20 -bottom-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            
            <!-- Left: Course Details & Verification Stamp -->
            <div class="space-y-2 max-w-xl">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="px-2.5 py-0.5 rounded-lg bg-teal-400/15 border border-teal-400/30 text-teal-300 font-mono font-black text-xs tracking-wider">
                        <?= htmlspecialchars($res['course_code']) ?>
                    </span>
                    <span class="text-xs text-slate-400 font-mono flex items-center gap-1">
                        <i data-lucide="calendar" class="w-3.5 h-3.5 text-teal-400"></i>
                        <?= date('M d, Y &bull; h:i A', strtotime($res['created_at'])) ?>
                    </span>

                    <?php if ($isCheating || $tabSwitches >= 3): ?>
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                        <i data-lucide="alert-triangle" class="w-3 h-3 text-amber-400"></i> Proctor Warning (<?= $tabSwitches ?> tab switches)
                    </span>
                    <?php else: ?>
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                        <i data-lucide="shield-check" class="w-3 h-3 text-emerald-400"></i> Verified Clean Session
                    </span>
                    <?php endif; ?>
                </div>
                
                <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">
                    <?= htmlspecialchars($res['course_title']) ?>
                </h1>
                <p class="text-xs text-slate-300 leading-relaxed">
                    Official PMSEC Diagnostic Transcript &bull; Candidate: <span class="font-bold text-teal-200"><?= htmlspecialchars($student['name']) ?></span> (<span class="font-mono text-slate-300"><?= htmlspecialchars($student['matric_no']) ?></span>)
                </p>
            </div>

            <!-- Right: Performance Score Metric Capsules -->
            <div class="grid grid-cols-3 gap-2.5 sm:gap-3 w-full lg:w-auto shrink-0">
                
                <!-- Score Capsule -->
                <div class="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center backdrop-blur-xs min-w-[95px]">
                    <span class="block text-xl sm:text-2xl font-black text-white font-mono"><?= (int)$res['total_score'] ?> <span class="text-xs text-slate-400 font-normal">/ <?= (int)$res['total_questions'] ?></span></span>
                    <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">Raw Score</span>
                </div>

                <!-- Percentage Capsule -->
                <div class="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-400/30 text-center backdrop-blur-xs min-w-[95px]">
                    <span class="block text-xl sm:text-2xl font-black text-teal-300 font-mono"><?= $percentage ?>%</span>
                    <span class="text-[10px] text-teal-300/80 font-bold uppercase tracking-wider block mt-0.5">Accuracy</span>
                </div>

                <!-- Grade Capsule -->
                <div class="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 text-center backdrop-blur-xs min-w-[95px]">
                    <span class="block text-xl sm:text-2xl font-black text-emerald-300 font-mono"><?= $grade ?></span>
                    <span class="text-[10px] text-emerald-300/80 font-bold uppercase tracking-wider block mt-0.5">Evaluation</span>
                </div>

            </div>

        </div>

    </div>

    <!-- 2. Breakdown Summary Strip & Quick Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        <div class="bg-white rounded-2xl p-4 border border-teal-100/70 shadow-xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <i data-lucide="help-circle" class="w-5 h-5"></i>
            </div>
            <div>
                <span class="text-xs text-slate-400 font-bold block">Total Items</span>
                <span class="text-lg font-black text-slate-900 font-mono"><?= count($questions) ?></span>
            </div>
        </div>

        <div class="bg-white rounded-2xl p-4 border border-emerald-100 shadow-xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <i data-lucide="check-circle" class="w-5 h-5"></i>
            </div>
            <div>
                <span class="text-xs text-slate-400 font-bold block">Correct</span>
                <span class="text-lg font-black text-emerald-600 font-mono"><?= $correctCount ?> <span class="text-xs text-slate-400 font-normal">(<?= count($questions) > 0 ? round(($correctCount / count($questions)) * 100) : 0 ?>%)</span></span>
            </div>
        </div>

        <div class="bg-white rounded-2xl p-4 border border-rose-100 shadow-xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <i data-lucide="x-circle" class="w-5 h-5"></i>
            </div>
            <div>
                <span class="text-xs text-slate-400 font-bold block">Incorrect</span>
                <span class="text-lg font-black text-rose-600 font-mono"><?= $incorrectCount ?> <span class="text-xs text-slate-400 font-normal">(<?= count($questions) > 0 ? round(($incorrectCount / count($questions)) * 100) : 0 ?>%)</span></span>
            </div>
        </div>

        <div class="bg-white rounded-2xl p-4 border border-amber-100 shadow-xs flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <i data-lucide="minus-circle" class="w-5 h-5"></i>
            </div>
            <div>
                <span class="text-xs text-slate-400 font-bold block">Skipped</span>
                <span class="text-lg font-black text-amber-600 font-mono"><?= $skippedCount ?> <span class="text-xs text-slate-400 font-normal">(<?= count($questions) > 0 ? round(($skippedCount / count($questions)) * 100) : 0 ?>%)</span></span>
            </div>
        </div>

    </div>

    <!-- 3. Topic Mastery Breakdown (if topic data exists) -->
    <?php if (!empty($topicDetails)): ?>
    <div class="bg-white rounded-3xl p-5 sm:p-6 border border-teal-100 shadow-xs space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div class="flex items-center gap-2">
                <i data-lucide="layers" class="w-5 h-5 text-teal-600"></i>
                <h3 class="text-sm font-black text-slate-900 uppercase tracking-wider">Topic Mastery Analysis</h3>
            </div>
            <span class="text-xs text-slate-500 font-medium">Domain Diagnostics</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <?php foreach ($topicDetails as $top): 
                $barColor = $top['pct'] >= 70 ? 'bg-emerald-500' : ($top['pct'] >= 50 ? 'bg-teal-500' : 'bg-rose-500');
                $textColor = $top['pct'] >= 70 ? 'text-emerald-700 bg-emerald-50' : ($top['pct'] >= 50 ? 'text-teal-700 bg-teal-50' : 'text-rose-700 bg-rose-50');
            ?>
            <div class="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-2">
                <div class="flex items-center justify-between text-xs">
                    <span class="font-extrabold text-slate-800 truncate max-w-[200px]"><?= htmlspecialchars($top['name']) ?></span>
                    <span class="font-mono font-bold px-2 py-0.5 rounded-md text-[11px] <?= $textColor ?>">
                        <?= $top['correct'] ?> / <?= $top['total'] ?> (<?= $top['pct'] ?>%)
                    </span>
                </div>
                <div class="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div class="h-full <?= $barColor ?> transition-all duration-500" style="width: <?= $top['pct'] ?>%"></div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>

    <!-- 4. Review Filter Header & Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        
        <!-- Filter Tabs -->
        <div class="flex flex-wrap items-center gap-1.5" id="reviewFilterGroup">
            <button type="button" onclick="filterReview('all')" id="btnFilterAll" class="px-3.5 py-2 rounded-2xl text-xs font-bold bg-teal-600 text-white shadow-xs transition-colors">
                All Items (<?= count($questions) ?>)
            </button>
            <button type="button" onclick="filterReview('incorrect')" id="btnFilterIncorrect" class="px-3.5 py-2 rounded-2xl text-xs font-bold bg-white text-slate-700 border border-teal-100 hover:bg-slate-50 transition-colors">
                Incorrect (<?= $incorrectCount ?>)
            </button>
            <button type="button" onclick="filterReview('correct')" id="btnFilterCorrect" class="px-3.5 py-2 rounded-2xl text-xs font-bold bg-white text-slate-700 border border-teal-100 hover:bg-slate-50 transition-colors">
                Correct (<?= $correctCount ?>)
            </button>
            <?php if ($skippedCount > 0): ?>
            <button type="button" onclick="filterReview('skipped')" id="btnFilterSkipped" class="px-3.5 py-2 rounded-2xl text-xs font-bold bg-white text-slate-700 border border-teal-100 hover:bg-slate-50 transition-colors">
                Skipped (<?= $skippedCount ?>)
            </button>
            <?php endif; ?>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2">
            <a href="practice.php?course_id=<?= urlencode($res['course_id']) ?>" class="px-4 py-2 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 active:scale-95">
                <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
                <span>Practice Again</span>
            </a>
            <button type="button" onclick="window.print()" class="px-3.5 py-2 rounded-2xl border border-teal-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors flex items-center gap-1.5">
                <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                <span class="hidden sm:inline">Print Transcript</span>
            </button>
            <a href="index.php" class="px-3.5 py-2 rounded-2xl border border-teal-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors flex items-center gap-1.5">
                <i data-lucide="home" class="w-3.5 h-3.5"></i>
                <span>Dashboard</span>
            </a>
        </div>

    </div>

    <!-- 5. Question-by-Question Review Stream -->
    <div class="space-y-4" id="questionsReviewStream">
        <?php foreach ($questions as $idx => $q): 
            $userAns = strtolower(trim((string)($studentAnswers[$q['id']] ?? '')));
            $correctAns = strtolower(trim((string)$q['correct_option']));
            
            $status = 'incorrect';
            if (empty($userAns)) {
                $status = 'skipped';
            } elseif ($userAns === $correctAns) {
                $status = 'correct';
            }
        ?>
        <div class="review-item bg-white rounded-3xl p-5 sm:p-6 border <?= $status === 'correct' ? 'border-teal-100' : ($status === 'skipped' ? 'border-amber-200 bg-amber-50/15' : 'border-rose-200 bg-rose-50/20') ?> shadow-xs space-y-3.5 transition-all" data-status="<?= $status ?>">
            
            <!-- Question Item Header -->
            <div class="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-mono font-bold text-slate-700">Question <?= $idx + 1 ?></span>
                    <?php if ($status === 'correct'): ?>
                    <span class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <i data-lucide="check" class="w-3 h-3 text-emerald-600"></i> Correct
                    </span>
                    <?php elseif ($status === 'skipped'): ?>
                    <span class="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        <i data-lucide="minus" class="w-3 h-3 text-amber-600"></i> Skipped / Unanswered
                    </span>
                    <?php else: ?>
                    <span class="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                        <i data-lucide="x" class="w-3 h-3 text-rose-600"></i> Incorrect
                    </span>
                    <?php endif; ?>
                </div>
            </div>

            <!-- Question Stem -->
            <div class="text-sm font-medium text-slate-900 leading-relaxed math-content">
                <?= $q['text'] ?>
            </div>

            <?php if (!empty($q['diagram_url'])): ?>
            <div class="text-center my-2">
                <img src="<?= htmlspecialchars($q['diagram_url']) ?>" alt="Diagram" class="max-h-52 rounded-2xl border border-teal-100 mx-auto shadow-xs">
            </div>
            <?php endif; ?>

            <!-- Answer Comparison Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                
                <!-- Candidate's Choice -->
                <div class="p-3 rounded-2xl border <?= $status === 'correct' ? 'border-emerald-200 bg-emerald-50/60 text-emerald-950' : ($status === 'skipped' ? 'border-amber-200 bg-amber-50/60 text-amber-950' : 'border-rose-200 bg-rose-50/70 text-rose-950') ?>">
                    <span class="font-bold uppercase tracking-wider text-[10px] block opacity-70 mb-0.5">Your Response</span>
                    <span class="font-semibold">
                        <?php if (empty($userAns)): ?>
                            <span class="text-amber-800 font-bold italic">No answer submitted (Skipped)</span>
                        <?php else: ?>
                            Option <?= strtoupper($userAns) ?>: <?= htmlspecialchars($q[$userAns] ?? '') ?>
                        <?php endif; ?>
                    </span>
                </div>

                <!-- Ground-Truth Correct Key -->
                <div class="p-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 text-emerald-950">
                    <span class="font-bold uppercase tracking-wider text-[10px] block opacity-70 mb-0.5">Accredited Key</span>
                    <span class="font-semibold">
                        Option <?= strtoupper($correctAns) ?>: <?= htmlspecialchars($q[$correctAns] ?? '') ?>
                    </span>
                </div>

            </div>

            <!-- Detailed Explanation & KaTeX Solution -->
            <?php if (!empty($q['explanation'])): ?>
            <details <?= $status !== 'correct' ? 'open' : '' ?> class="group p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <summary class="font-bold text-slate-800 cursor-pointer flex items-center justify-between select-none">
                    <span class="flex items-center gap-1.5">
                        <i data-lucide="help-circle" class="w-3.5 h-3.5 text-teal-600"></i>
                        <span>Step-by-Step Mathematical Explanation</span>
                    </span>
                    <span class="text-[10px] text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div class="pt-2.5 mt-2.5 border-t border-slate-200/70 leading-relaxed math-content text-slate-700">
                    <?= $q['explanation'] ?>
                </div>
            </details>
            <?php endif; ?>

        </div>
        <?php endforeach; ?>
    </div>

</div>

<!-- Trapping Browser Back Navigation on Completed Result Page -->
<script>
(function() {
    // 1. Trap browser back button: Push current results page onto history stack
    window.history.pushState(null, '', window.location.href);

    window.addEventListener('popstate', function(e) {
        // Prevent moving backwards to the test session
        window.history.pushState(null, '', window.location.href);
        
        // Show clear notification banner
        const noticeModal = document.getElementById('backNavNoticeModal');
        if (noticeModal) {
            noticeModal.classList.remove('hidden');
            setTimeout(() => {
                noticeModal.classList.add('hidden');
            }, 4500);
        }
    });

    // 2. Clear any active exam flags in sessionStorage
    try {
        sessionStorage.removeItem('active_exam_session');
    } catch (err) {}
})();

// Interactive Item Filter
function filterReview(type) {
    const items = document.querySelectorAll('.review-item');
    const buttons = {
        all: document.getElementById('btnFilterAll'),
        incorrect: document.getElementById('btnFilterIncorrect'),
        correct: document.getElementById('btnFilterCorrect'),
        skipped: document.getElementById('btnFilterSkipped')
    };

    Object.values(buttons).forEach(b => {
        if (b) b.className = "px-3.5 py-2 rounded-2xl text-xs font-bold bg-white text-slate-700 border border-teal-100 hover:bg-slate-50 transition-colors";
    });

    if (buttons[type]) {
        const activeColor = type === 'incorrect' ? 'bg-rose-600' : (type === 'correct' ? 'bg-emerald-600' : (type === 'skipped' ? 'bg-amber-500' : 'bg-teal-600'));
        buttons[type].className = `px-3.5 py-2 rounded-2xl text-xs font-bold ${activeColor} text-white shadow-xs transition-colors`;
    }

    items.forEach(el => {
        if (type === 'all' || el.dataset.status === type) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });
}

// Auto-render KaTeX math formulas
window.addEventListener('DOMContentLoaded', () => {
    if (typeof renderMathInElement === 'function') {
        renderMathInElement(document.getElementById('resultsApp'), {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false}
            ],
            throwOnError: false
        });
    }
    if (window.lucide) lucide.createIcons();
});
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
