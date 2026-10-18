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

if (!csrf_verify()) {
    // Check if valid student auth token is present before aborting
    $hasValidAuthToken = false;
    if (!empty($_POST['student_token'])) {
        $tokenData = verify_student_token($_POST['student_token']);
        if ($tokenData && !empty($tokenData['id'])) {
            $hasValidAuthToken = true;
        }
    }

    // Also accept if active logged in student session exists
    if (!$hasValidAuthToken && !empty($_SESSION['student']['id'])) {
        $hasValidAuthToken = true;
    }

    if (!$hasValidAuthToken) {
        csrf_abort();
    }
}
$student = $_SESSION['student'] ?? null;

// Graceful session restoration via signed student token
if (!$student && !empty($_POST['student_token'])) {
    $tokenData = verify_student_token($_POST['student_token']);
    if ($tokenData && !empty($tokenData['id'])) {
        try {
            $sStmt = $db->prepare("SELECT * FROM students WHERE id = ? LIMIT 1");
            $sStmt->execute([$tokenData['id']]);
            $found = $sStmt->fetch();
            if ($found) {
                $student = $found;
                $_SESSION['student'] = $student;
                set_student_auth_cookie($student);
            }
        } catch (Exception $e) {}
    }
}

if (!$student) {
    header('Location: login.php?error=' . urlencode('Your examination session expired. Please log in again to review your results or take an exam.'));
    exit;
}

$courseId = $_POST['course_id'] ?? '';
$answersJson = $_POST['answers_json'] ?? '{}';
$questionIdsJson = $_POST['question_ids_json'] ?? '[]';

$answers = json_decode($answersJson, true) ?: [];
$questionIds = json_decode($questionIdsJson, true) ?: [];

if (empty($questionIds)) {
    header('Location: exam.php?error=' . urlencode('No questions were submitted. Please try again.'));
    exit;
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

// Store session completion states to strictly block browser back-navigation re-entry
$testId = $_POST['test_id'] ?? '';
$_SESSION['last_result_id'] = $resultId;
$_SESSION['just_completed_course'] = $courseId;
$_SESSION['just_completed_test'] = $testId;
$_SESSION['last_completed_at'] = time();

if (!isset($_SESSION['completed_sessions']) || !is_array($_SESSION['completed_sessions'])) {
    $_SESSION['completed_sessions'] = [];
}
if (!empty($sessionId)) {
    $_SESSION['completed_sessions'][$sessionId] = $resultId;
}

// Redirect immediately to the completed Results page
header("Location: results.php?result_id=" . urlencode($resultId));
exit;
