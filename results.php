<?php
/**
 * Test Results & Detailed Review
 * Premed Test Portal
 */

require_once __DIR__ . '/config/db.php';

if (empty($_SESSION['student'])) {
    header('Location: login.php');
    exit;
}

$pageTitle = 'Test Results';
require_once __DIR__ . '/includes/header.php';

$db = DB::connect();

$resultId = $_GET['result_id'] ?? '';
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
    echo "<div class='max-w-2xl mx-auto p-6 text-center text-slate-500'>Result not found. <a href='history.php' class='text-indigo-600 font-bold'>Return to Results</a></div>";
    require_once __DIR__ . '/includes/footer.php';
    exit;
}

$questionIds = json_decode($res['question_ids'] ?? '[]', true) ?: [];
$studentAnswers = json_decode($res['student_answers'] ?? '{}', true) ?: [];

// Fetch question details for review
$questions = [];
$correctCount = 0;
$incorrectCount = 0;

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
            if ($u === $k) {
                $correctCount++;
            } else {
                $incorrectCount++;
            }
        }
    }
}

$tabSwitches = (int)($res['tab_switches'] ?? 0);
$isCheating = (int)($res['is_flagged_cheating'] ?? 0);
?>

<div class="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5" id="resultsApp">

    <!-- 1. Result Summary Card -->
    <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div class="space-y-1">
            <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-black uppercase text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200 font-mono">
                    <?= htmlspecialchars($res['course_code']) ?>
                </span>
                <span class="text-xs text-slate-500">
                    <?= date('M d, Y &bull; h:i A', strtotime($res['created_at'])) ?>
                </span>
                <?php if ($isCheating || $tabSwitches >= 3): ?>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <i data-lucide="alert-triangle" class="w-3 h-3 text-amber-600"></i> Tab Switched (<?= $tabSwitches ?> times)
                </span>
                <?php else: ?>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <i data-lucide="check" class="w-3 h-3 text-emerald-600"></i> Completed
                </span>
                <?php endif; ?>
            </div>
            <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                <?= htmlspecialchars($res['course_title']) ?>
            </h1>
            <p class="text-xs text-slate-500">Review your questions, selected answers, and full explanations below.</p>
        </div>

        <!-- 3 Score Badges -->
        <div class="flex items-center gap-2.5 w-full md:w-auto">
            <div class="flex-1 md:flex-none px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-center min-w-[90px]">
                <span class="block text-xl font-black text-slate-800 font-mono"><?= (int)$res['total_score'] ?> / <?= (int)$res['total_questions'] ?></span>
                <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Score</span>
            </div>
            <div class="flex-1 md:flex-none px-4 py-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-center min-w-[90px]">
                <span class="block text-xl font-black text-indigo-700 font-mono"><?= round((float)$res['percentage'], 1) ?>%</span>
                <span class="text-[10px] text-indigo-800 font-bold uppercase tracking-wider">Percentage</span>
            </div>
            <div class="flex-1 md:flex-none px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center min-w-[80px]">
                <span class="block text-xl font-black text-emerald-700 font-mono"><?= htmlspecialchars($res['grade'] ?: 'Passed') ?></span>
                <span class="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Grade</span>
            </div>
        </div>
    </div>

    <!-- 2. Filter Tabs & Action Buttons -->
    <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-1.5" id="reviewFilterGroup">
            <button type="button" onclick="filterReview('all')" id="btnFilterAll" class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-xs transition-colors">
                All Questions (<?= count($questions) ?>)
            </button>
            <button type="button" onclick="filterReview('incorrect')" id="btnFilterIncorrect" class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors">
                Wrong (<?= $incorrectCount ?>)
            </button>
            <button type="button" onclick="filterReview('correct')" id="btnFilterCorrect" class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors">
                Correct (<?= $correctCount ?>)
            </button>
        </div>

        <div class="flex items-center gap-2">
            <a href="practice.php?course_id=<?= urlencode($res['course_id']) ?>" class="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5">
                <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
                <span>Practice Again</span>
            </a>
            <button type="button" onclick="window.print()" class="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors flex items-center gap-1.5">
                <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                <span>Print</span>
            </button>
            <a href="index.php" class="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors flex items-center gap-1.5">
                <i data-lucide="home" class="w-3.5 h-3.5"></i>
                <span>Home</span>
            </a>
        </div>
    </div>

    <!-- 3. Question-by-Question Review List -->
    <div class="space-y-4" id="questionsReviewStream">
        <?php foreach ($questions as $idx => $q): 
            $userAns = strtolower(trim((string)($studentAnswers[$q['id']] ?? '')));
            $correctAns = strtolower(trim((string)$q['correct_option']));
            $isCorrect = ($userAns === $correctAns);
        ?>
        <div class="review-item bg-white rounded-2xl p-5 border <?= $isCorrect ? 'border-slate-200' : 'border-rose-200 bg-rose-50/20' ?> shadow-xs space-y-3.5" data-status="<?= $isCorrect ? 'correct' : 'incorrect' ?>">
            <!-- Question Header -->
            <div class="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-700">Question <?= $idx + 1 ?></span>
                    <?php if ($isCorrect): ?>
                    <span class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <i data-lucide="check" class="w-3 h-3 text-emerald-600"></i> Correct
                    </span>
                    <?php else: ?>
                    <span class="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                        <i data-lucide="x" class="w-3 h-3 text-rose-600"></i> Incorrect
                    </span>
                    <?php endif; ?>
                </div>
            </div>

            <!-- Question Text -->
            <div class="text-sm font-medium text-slate-900 leading-relaxed math-content">
                <?= $q['text'] ?>
            </div>

            <?php if (!empty($q['diagram_url'])): ?>
            <div class="text-center my-2">
                <img src="<?= htmlspecialchars($q['diagram_url']) ?>" alt="Diagram" class="max-h-48 rounded-xl border border-slate-200 mx-auto shadow-xs">
            </div>
            <?php endif; ?>

            <!-- Answer Comparison -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div class="p-3 rounded-xl border <?= $isCorrect ? 'border-emerald-200 bg-emerald-50/60 text-emerald-950' : 'border-rose-200 bg-rose-50/70 text-rose-950' ?>">
                    <span class="font-bold uppercase tracking-wider text-[10px] block opacity-70 mb-0.5">Your Choice</span>
                    <span class="font-semibold">
                        Option <?= strtoupper($userAns ?: 'Skipped') ?>: <?= htmlspecialchars($q[$userAns] ?? 'No answer selected') ?>
                    </span>
                </div>
                <div class="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 text-emerald-950">
                    <span class="font-bold uppercase tracking-wider text-[10px] block opacity-70 mb-0.5">Correct Answer</span>
                    <span class="font-semibold">
                        Option <?= strtoupper($correctAns) ?>: <?= htmlspecialchars($q[$correctAns] ?? '') ?>
                    </span>
                </div>
            </div>

            <!-- Explanation Accordion -->
            <?php if (!empty($q['explanation'])): ?>
            <details <?= !$isCorrect ? 'open' : '' ?> class="group p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <summary class="font-bold text-slate-800 cursor-pointer flex items-center justify-between select-none">
                    <span class="flex items-center gap-1.5">
                        <i data-lucide="help-circle" class="w-3.5 h-3.5 text-indigo-600"></i>
                        <span>Explanation & Solution</span>
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

<script>
function filterReview(type) {
    const items = document.querySelectorAll('.review-item');
    const btnAll = document.getElementById('btnFilterAll');
    const btnIncorrect = document.getElementById('btnFilterIncorrect');
    const btnCorrect = document.getElementById('btnFilterCorrect');

    [btnAll, btnIncorrect, btnCorrect].forEach(b => {
        b.className = "px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors";
    });

    if (type === 'all') {
        btnAll.className = "px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-xs transition-colors";
        items.forEach(el => el.classList.remove('hidden'));
    } else if (type === 'incorrect') {
        btnIncorrect.className = "px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 text-white shadow-xs transition-colors";
        items.forEach(el => {
            if (el.dataset.status === 'incorrect') el.classList.remove('hidden');
            else el.classList.add('hidden');
        });
    } else if (type === 'correct') {
        btnCorrect.className = "px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-xs transition-colors";
        items.forEach(el => {
            if (el.dataset.status === 'correct') el.classList.remove('hidden');
            else el.classList.add('hidden');
        });
    }
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
