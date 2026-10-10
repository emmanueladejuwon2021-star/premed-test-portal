<?php
/**
 * Detailed Results & Review View
 * Premed Test Portal (PHP Edition)
 */

$pageTitle = 'Examination Results';
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
    die("Result record not found.");
}

$questionIds = json_decode($res['question_ids'], true) ?: [];
$studentAnswers = json_decode($res['student_answers'], true) ?: [];

// Fetch question details for review
$questions = [];
if (!empty($questionIds)) {
    $placeholders = implode(',', array_fill(0, count($questionIds), '?'));
    $qStmt = $db->prepare("SELECT * FROM questions WHERE id IN ($placeholders)");
    $qStmt->execute($questionIds);
    $fetched = $qStmt->fetchAll();
    
    // Sort according to original attempt order
    $map = [];
    foreach ($fetched as $q) $map[$q['id']] = $q;
    foreach ($questionIds as $qid) {
        if (isset($map[$qid])) $questions[] = $map[$qid];
    }
}
?>

<div class="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
    <!-- Score Summary Card -->
    <div class="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm text-center relative overflow-hidden">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-xs mb-4">
            <span><?= htmlspecialchars($res['course_code']) ?></span> &bull;
            <span><?= htmlspecialchars($res['course_title']) ?></span>
        </div>

        <h1 class="text-3xl font-black text-slate-900 mb-6">Assessment Completed</h1>

        <div class="flex flex-wrap justify-center items-center gap-6 mb-8">
            <!-- Score Ring -->
            <div class="p-6 rounded-3xl bg-indigo-50/70 border border-indigo-100 min-w-[150px]">
                <span class="block text-4xl font-black text-indigo-600"><?= (int)$res['total_score'] ?> / <?= (int)$res['total_questions'] ?></span>
                <span class="text-xs font-bold text-indigo-900 uppercase tracking-wider mt-1 block">Score Achieved</span>
            </div>

            <!-- Percentage -->
            <div class="p-6 rounded-3xl bg-emerald-50/70 border border-emerald-100 min-w-[150px]">
                <span class="block text-4xl font-black text-emerald-600"><?= round((float)$res['percentage'], 1) ?>%</span>
                <span class="text-xs font-bold text-emerald-900 uppercase tracking-wider mt-1 block">Percentage</span>
            </div>

            <!-- Grade -->
            <div class="p-6 rounded-3xl bg-violet-50/70 border border-violet-100 min-w-[120px]">
                <span class="block text-4xl font-black text-violet-600"><?= htmlspecialchars($res['grade']) ?></span>
                <span class="text-xs font-bold text-violet-900 uppercase tracking-wider mt-1 block">Grade</span>
            </div>
        </div>

        <div class="flex justify-center gap-3">
            <a href="practice.php?course_id=<?= urlencode($res['course_id']) ?>" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-2">
                <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
                <span>Retake Drill</span>
            </a>
            <a href="index.php" class="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors flex items-center gap-2">
                <i data-lucide="home" class="w-4 h-4"></i>
                <span>Home Hub</span>
            </a>
        </div>
    </div>

    <!-- Question by Question Review -->
    <div class="space-y-4">
        <h2 class="text-xl font-bold text-slate-900">Question Performance Review</h2>

        <?php foreach ($questions as $idx => $q): 
            $userAns = strtolower(trim((string)($studentAnswers[$q['id']] ?? '')));
            $correctAns = strtolower(trim((string)$q['correct_option']));
            $isCorrect = ($userAns === $correctAns);
        ?>
        <div class="bg-white rounded-3xl p-6 border <?= $isCorrect ? 'border-emerald-200 bg-emerald-50/20' : 'border-rose-200 bg-rose-50/20' ?> shadow-sm space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <span class="text-xs font-black uppercase tracking-wider text-slate-500">Question <?= $idx + 1 ?></span>
                <?php if ($isCorrect): ?>
                <span class="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                    <i data-lucide="check" class="w-3.5 h-3.5"></i> Correct (+1)
                </span>
                <?php else: ?>
                <span class="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100/70 px-2.5 py-0.5 rounded-full">
                    <i data-lucide="x" class="w-3.5 h-3.5"></i> Incorrect
                </span>
                <?php endif; ?>
            </div>

            <!-- Stem -->
            <div class="text-sm font-semibold text-slate-900 leading-relaxed">
                <?= $q['text'] ?>
            </div>

            <?php if (!empty($q['diagram_url'])): ?>
            <img src="<?= htmlspecialchars($q['diagram_url']) ?>" alt="Diagram" class="max-h-56 rounded-xl border border-slate-200">
            <?php endif; ?>

            <!-- Answer comparison -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div class="p-3 rounded-xl border <?= $isCorrect ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900' ?>">
                    <span class="font-bold block uppercase tracking-wider mb-1">Your Selected Answer</span>
                    <span>Option <?= strtoupper($userAns ?: 'None (Omitted)') ?>: <?= htmlspecialchars($q[$userAns] ?? 'No Answer Picked') ?></span>
                </div>
                <div class="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900">
                    <span class="font-bold block uppercase tracking-wider mb-1">Correct Key</span>
                    <span>Option <?= strtoupper($correctAns) ?>: <?= htmlspecialchars($q[$correctAns] ?? '') ?></span>
                </div>
            </div>

            <!-- Explanation if present -->
            <?php if (!empty($q['explanation'])): ?>
            <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700">
                <span class="font-bold text-slate-900 block mb-1">Scientific Explanation:</span>
                <p class="leading-relaxed"><?= $q['explanation'] ?></p>
            </div>
            <?php endif; ?>
        </div>
        <?php endforeach; ?>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
