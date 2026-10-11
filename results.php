<?php
/**
 * Official Examination Performance Report & Item Analysis - Enterprise Production Edition
 * Apex Pre-Medical Sciences Examination Council (PMSEC)
 */

$pageTitle = 'Examination Performance Report';
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/header.php';

$db = DB::connect();

$resultId = $_GET['id'] ?? '';
if (empty($resultId)) {
    header('Location: history.php');
    exit;
}

$stmt = $db->prepare("
    SELECT r.*, c.title AS course_title, c.code AS course_code 
    FROM results r
    LEFT JOIN courses c ON r.course_id = c.id
    WHERE r.id = ?
    LIMIT 1
");
$stmt->execute([$resultId]);
$res = $stmt->fetch();

if (!$res) {
    die("Official Examination Record not found.");
}

$questionIds = json_decode($res['question_ids'], true) ?: [];
$studentAnswers = json_decode($res['student_answers'], true) ?: [];

// Fetch question details for review
$questions = [];
$correctCount = 0;
$incorrectCount = 0;

if (!empty($questionIds)) {
    $placeholders = implode(',', array_fill(0, count($questionIds), '?'));
    $qStmt = $db->prepare("SELECT * FROM questions WHERE id IN ($placeholders)");
    $qStmt->execute($questionIds);
    $fetched = $qStmt->fetchAll();
    
    // Sort according to original attempt order
    $map = [];
    foreach ($fetched as $q) $map[$q['id']] = $q;
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

<div class="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4" id="resultsApp">

    <!-- 1. Official Board Performance Report Banner -->
    <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
            <div class="flex items-center gap-2 mb-1.5">
                <span class="text-xs font-black uppercase text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200 font-mono">
                    <?= htmlspecialchars($res['course_code']) ?>
                </span>
                <span class="text-xs text-slate-500 font-medium">
                    <?= date('M d, Y &bull; h:i A', strtotime($res['created_at'])) ?>
                </span>
                <?php if ($isCheating): ?>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1 font-mono">
                    <i data-lucide="shield-alert" class="w-3 h-3 text-rose-600"></i> Proctor Flagged (<?= $tabSwitches ?> Violations)
                </span>
                <?php else: ?>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 font-mono">
                    <i data-lucide="shield-check" class="w-3 h-3 text-emerald-600"></i> Integrity Verified Clean
                </span>
                <?php endif; ?>
            </div>
            <h1 class="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                <?= htmlspecialchars($res['course_title']) ?>
            </h1>
            <p class="text-xs text-slate-500 mt-0.5">Official Examination Record & Comprehensive Psychometric Item Rationales</p>
        </div>

        <!-- Metric Badges Strip -->
        <div class="flex items-center gap-2 w-full md:w-auto">
            <div class="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center min-w-[85px]">
                <span class="block text-lg font-black text-slate-800 font-mono"><?= (int)$res['total_score'] ?> / <?= (int)$res['total_questions'] ?></span>
                <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Raw Score</span>
            </div>
            <div class="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-teal-50 border border-teal-200 text-center min-w-[85px]">
                <span class="block text-lg font-black text-teal-700 font-mono"><?= round((float)$res['percentage'], 1) ?>%</span>
                <span class="text-[10px] text-teal-800 font-bold uppercase tracking-wider">Proficiency</span>
            </div>
            <div class="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-center min-w-[75px]">
                <span class="block text-lg font-black text-indigo-700 font-mono"><?= htmlspecialchars($res['grade']) ?></span>
                <span class="text-[10px] text-indigo-800 font-bold uppercase tracking-wider">Grade</span>
            </div>
        </div>
    </div>

    <!-- Quick Action Bar & Filter Chips -->
    <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-1.5" id="reviewFilterGroup">
            <button type="button" onclick="filterReview('all')" id="btnFilterAll" class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-teal-600 text-white shadow-xs transition-colors">
                All Evaluated Items (<?= count($questions) ?>)
            </button>
            <button type="button" onclick="filterReview('incorrect')" id="btnFilterIncorrect" class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors">
                Incorrect (<?= $incorrectCount ?>)
            </button>
            <button type="button" onclick="filterReview('correct')" id="btnFilterCorrect" class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors">
                Correct (<?= $correctCount ?>)
            </button>
        </div>

        <div class="flex items-center gap-2">
            <a href="practice.php?course_id=<?= urlencode($res['course_id']) ?>" class="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5">
                <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
                <span>Re-attempt Assessment</span>
            </a>
            <button type="button" onclick="window.print()" class="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors flex items-center gap-1.5">
                <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                <span>Print Record</span>
            </button>
            <a href="index.php" class="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors flex items-center gap-1.5">
                <i data-lucide="home" class="w-3.5 h-3.5"></i>
                <span>Command Center</span>
            </a>
        </div>
    </div>

    <!-- 2. Question-by-Question Review Stream -->
    <div class="space-y-3.5" id="questionsReviewStream">
        <?php foreach ($questions as $idx => $q): 
            $userAns = strtolower(trim((string)($studentAnswers[$q['id']] ?? '')));
            $correctAns = strtolower(trim((string)$q['correct_option']));
            $isCorrect = ($userAns === $correctAns);
        ?>
        <div class="review-item bg-white rounded-2xl p-4 sm:p-5 border <?= $isCorrect ? 'border-slate-200' : 'border-rose-200 bg-rose-50/20' ?> shadow-xs space-y-3" data-status="<?= $isCorrect ? 'correct' : 'incorrect' ?>">
            <!-- Item Header -->
            <div class="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-black uppercase tracking-wider text-slate-600 font-mono">Item <?= $idx + 1 ?></span>
                    <?php if ($isCorrect): ?>
                    <span class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <i data-lucide="check" class="w-3 h-3 text-emerald-600"></i> Correct (+1)
                    </span>
                    <?php else: ?>
                    <span class="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                        <i data-lucide="x" class="w-3 h-3 text-rose-600"></i> Incorrect (0)
                    </span>
                    <?php endif; ?>
                </div>
                <span class="text-[11px] text-slate-400 font-mono">Item ID: <?= substr($q['id'], 0, 8) ?></span>
            </div>

            <!-- Stem -->
            <div class="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed math-content">
                <?= $q['text'] ?>
            </div>

            <?php if (!empty($q['diagram_url'])): ?>
            <div class="text-center my-2">
                <img src="<?= htmlspecialchars($q['diagram_url']) ?>" alt="Clinical Imaging Specimen" class="max-h-48 rounded-xl border border-slate-200 mx-auto shadow-xs">
            </div>
            <?php endif; ?>

            <!-- Answer Comparison Strip -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div class="p-3 rounded-xl border <?= $isCorrect ? 'border-emerald-200 bg-emerald-50/60 text-emerald-950' : 'border-rose-200 bg-rose-50/70 text-rose-950' ?>">
                    <span class="font-bold uppercase tracking-wider text-[10px] block opacity-80 mb-0.5">Candidate Recorded Response</span>
                    <span class="font-semibold">
                        Option <?= strtoupper($userAns ?: 'Omitted') ?>: <?= htmlspecialchars($q[$userAns] ?? 'No Selection Picked') ?>
                    </span>
                </div>
                <div class="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 text-emerald-950">
                    <span class="font-bold uppercase tracking-wider text-[10px] block opacity-80 mb-0.5">Accredited Ground-Truth Key</span>
                    <span class="font-semibold">
                        Option <?= strtoupper($correctAns) ?>: <?= htmlspecialchars($q[$correctAns] ?? '') ?>
                    </span>
                </div>
            </div>

            <!-- Clinical Explanation Accordion -->
            <?php if (!empty($q['explanation'])): ?>
            <details <?= !$isCorrect ? 'open' : '' ?> class="group p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <summary class="font-bold text-slate-800 cursor-pointer flex items-center justify-between select-none">
                    <span class="flex items-center gap-1.5">
                        <i data-lucide="book-open" class="w-3.5 h-3.5 text-teal-600"></i>
                        <span>High-Yield Clinical Rationale & Diagnostic Synthesis</span>
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
        btnAll.className = "px-3.5 py-1.5 rounded-xl text-xs font-bold bg-teal-600 text-white shadow-xs transition-colors";
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
