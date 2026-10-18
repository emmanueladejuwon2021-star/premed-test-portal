<?php
/**
 * Prometric / Board Examination CBT Simulation Environment - Clinical Medical Edition
 * Apex Pre-Medical Sciences Examination Council (PMSEC)
 */

$pageTitle = 'Proctored Examination Administration';
require_once __DIR__ . '/config/db.php';

// 1. Strict Cache-Control Headers to prevent browser history (bfcache) navigation
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");

$db = DB::connect();

$testId = $_GET['test_id'] ?? '';
$test = null;
$courseId = $_GET['course_id'] ?? '';

// 2. Strict Back-Navigation Lockout:
// If this student just completed and submitted this test/course and presses the browser back button,
// immediately route them to their official completed result page instead of opening a new test session.
$isRetry = isset($_GET['retry']) || isset($_GET['new']);
if (!$isRetry && !empty($_SESSION['last_result_id'])) {
    $timeSinceComplete = time() - ($_SESSION['last_completed_at'] ?? 0);
    $sameCourse = !empty($_SESSION['just_completed_course']) && $_SESSION['just_completed_course'] === $courseId;
    $sameTest = !empty($_SESSION['just_completed_test']) && $_SESSION['just_completed_test'] === $testId;

    if ($timeSinceComplete < 3600 && ($sameTest || (empty($testId) && $sameCourse))) {
        header("Location: results.php?result_id=" . urlencode($_SESSION['last_result_id']) . "&notice=already_completed");
        exit;
    }
}

$courseId = $_GET['course_id'] ?? '';
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
$duration = isset($_GET['duration']) ? (int)$_GET['duration'] : 30;

$rawTopicInput = $_GET['topics'] ?? ($_GET['topic_ids'] ?? []);
if (is_array($rawTopicInput)) {
    $topicFilters = array_values(array_filter($rawTopicInput, function($t) {
        return !empty($t) && strtoupper(trim((string)$t)) !== 'ALL';
    }));
} else {
    $topicFilters = [];
}

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
        if (!empty($rawTopics) && is_array($rawTopics)) {
            $topicFilters = array_values(array_filter($rawTopics, function($t) {
                return !empty($t) && strtoupper(trim((string)$t)) !== 'ALL';
            }));
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
    header('Location: courses.php?error=' . urlencode('Accredited Examination Course not found.'));
    exit;
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

// ... [truncated for brevity in this call - full content would be needed] 
