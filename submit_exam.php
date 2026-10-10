<?php
/**
 * Exam Submission & Auto-Grading Engine
 * Premed Test Portal (PHP Edition)
 */

require_once __DIR__ . '/config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: index.php');
    exit;
}

$db = DB::connect();
$student = $_SESSION['student'] ?? null;

if (!$student) {
    die("Student authentication session lost. Please log in again.");
}

$courseId = $_POST['course_id'] ?? '';
$answersJson = $_POST['answers_json'] ?? '{}';
$questionIdsJson = $_POST['question_ids_json'] ?? '[]';

$answers = json_decode($answersJson, true) ?: [];
$questionIds = json_decode($questionIdsJson, true) ?: [];

if (empty($questionIds)) {
    die("No question submissions provided.");
}

// Fetch ground-truth questions from MySQL
$placeholders = implode(',', array_fill(0, count($questionIds), '?'));
$stmt = $db->prepare("SELECT * FROM questions WHERE id IN ($placeholders)");
$stmt->execute($questionIds);
$dbQuestions = $stmt->fetchAll();

$questionsMap = [];
foreach ($dbQuestions as $q) {
    $questionsMap[$q['id']] = $q;
}

$totalScore = 0;
$totalQuestions = count($questionIds);
$topicScores = [];

foreach ($questionIds as $qid) {
    $q = $questionsMap[$qid] ?? null;
    if (!$q) continue;

    $studentPick = strtolower(trim((string)($answers[$qid] ?? '')));
    $correctPick = strtolower(trim((string)$q['correct_option']));

    $isCorrect = ($studentPick === $correctPick);
    if ($isCorrect) {
        $totalScore++;
    }

    $tid = $q['topic_id'];
    if (!isset($topicScores[$tid])) {
        $topicScores[$tid] = ['correct' => 0, 'total' => 0];
    }
    $topicScores[$tid]['total']++;
    if ($isCorrect) $topicScores[$tid]['correct']++;
}

$percentage = $totalQuestions > 0 ? round(($totalScore / $totalQuestions) * 100, 2) : 0;

// Grade allocation
$grade = 'F';
if ($percentage >= 70) $grade = 'A';
elseif ($percentage >= 60) $grade = 'B';
elseif ($percentage >= 50) $grade = 'C';
elseif ($percentage >= 45) $grade = 'D';
elseif ($percentage >= 40) $grade = 'E';

$sessionId = $_POST['session_id'] ?? '';
$tabSwitches = isset($_POST['tab_switches']) ? (int)$_POST['tab_switches'] : 0;
$isFlaggedCheating = isset($_POST['is_flagged_cheating']) ? (int)$_POST['is_flagged_cheating'] : ($tabSwitches >= 3 ? 1 : 0);
$cheatingLog = $_POST['cheating_log'] ?? '[]';

$resultId = bin2hex(random_bytes(12));

$insert = $db->prepare("
    INSERT INTO results (
        id, student_id, course_id, total_score, total_questions, percentage, grade,
        question_ids, topic_breakdown, student_answers,
        tab_switches, is_flagged_cheating, cheating_log
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
");

$insert->execute([
    $resultId,
    $student['id'],
    $courseId,
    $totalScore,
    $totalQuestions,
    $percentage,
    $grade,
    json_encode($questionIds),
    json_encode($topicScores),
    json_encode($answers),
    $tabSwitches,
    $isFlaggedCheating,
    $cheatingLog
]);

if (!empty($sessionId)) {
    try {
        $sessStatus = $isFlaggedCheating ? 'TERMINATED_FOR_CHEATING' : 'COMPLETED';
        $uStmt = $db->prepare("
            UPDATE exam_sessions SET 
                status = ?, 
                tab_switches = ?, 
                cheating_log = ?, 
                total_score = ?, 
                total_questions = ?, 
                percentage = ?, 
                grade = ?, 
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        ");
        $uStmt->execute([
            $sessStatus,
            $tabSwitches,
            $cheatingLog,
            $totalScore,
            $totalQuestions,
            $percentage,
            $grade,
            $sessionId
        ]);
    } catch (Exception $e) {}
}

header("Location: results.php?id=" . urlencode($resultId));
exit;
