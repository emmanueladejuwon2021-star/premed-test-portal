<?php
/**
 * Master Academic & Examination Command Console
 * Premed Test Portal (Enterprise Production Grade Edition)
 */

$pageTitle = 'Faculty & Administration Console';
require_once __DIR__ . '/config/db.php';

// Verify Admin Authentication
if (empty($_SESSION['admin'])) {
    header('Location: login.php?tab=admin');
    exit;
}

$db = DB::connect();

$adminUser = $_SESSION['admin'];
$feedbackMsg = null;
$feedbackError = null;

// ==========================================
// 1. HIGH-SPEED CSV EXPORT HANDLERS
// ==========================================
if (isset($_GET['export'])) {
    $exportType = $_GET['export'];

    // A. Export Cash Prize Banking Disbursement CSV
    if ($exportType === 'prizes_csv' || $exportType === 'candidates_csv') {
        $stmt = $db->query("
            SELECT s.*, COUNT(r.id) as tests_count 
            FROM students s
            LEFT JOIN results r ON s.id = r.student_id
            GROUP BY s.id
            ORDER BY s.created_at DESC
        ");
        $studentsList = $stmt->fetchAll();

        $filename = 'premed_candidates_' . ($exportType === 'prizes_csv' ? 'cash_prizes_banking_' : 'directory_') . date('Y-m-d_Hi') . '.csv';
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Pragma: no-cache');
        header('Expires: 0');

        $out = fopen('php://output', 'w');
        // UTF-8 BOM for Microsoft Excel compatibility
        fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF));

        if ($exportType === 'prizes_csv') {
            fputcsv($out, ['S/N', 'Candidate Name', 'Matric / JAMB Number', 'Department', 'Phone Number', 'Bank Name', 'Account Number', 'Verified Account Name', 'Tests Completed', 'Registration Date']);
            $sn = 1;
            foreach ($studentsList as $st) {
                // For prize disbursement, highlight candidates with bank details
                fputcsv($out, [
                    $sn++,
                    $st['name'] ?? '',
                    $st['matric_no'] ?? '',
                    $st['department'] ?? '',
                    $st['phone'] ?? '',
                    $st['bank'] ?: 'NOT PROVIDED',
                    $st['account_number'] ? "'" . $st['account_number'] : 'NOT PROVIDED', // Leading single quote prevents Excel from stripping leading zeroes
                    $st['account_name'] ?: 'NOT PROVIDED',
                    (int)($st['tests_count'] ?? 0),
                    $st['created_at'] ?? ''
                ]);
            }
        } else {
            fputcsv($out, ['S/N', 'Candidate Name', 'Matric / JAMB Number', 'Department', 'Phone', 'Tests Completed', 'Bank Name', 'Account Number', 'Account Name', 'Registration Date']);
            $sn = 1;
            foreach ($studentsList as $st) {
                fputcsv($out, [
                    $sn++,
                    $st['name'] ?? '',
                    $st['matric_no'] ?? '',
                    $st['department'] ?? '',
                    $st['phone'] ?? '',
                    (int)($st['tests_count'] ?? 0),
                    $st['bank'] ?? '',
                    $st['account_number'] ? "'" . $st['account_number'] : '',
                    $st['account_name'] ?? '',
                    $st['created_at'] ?? ''
                ]);
            }
        }
        fclose($out);
        exit;
    }

    // B. Export Examination Gradebook CSV
    if ($exportType === 'gradebook_csv') {
        $stmt = $db->query("
            SELECT r.*, s.name as student_name, s.matric_no, s.department, c.code as course_code, c.title as course_title
            FROM results r
            LEFT JOIN students s ON r.student_id = s.id
            LEFT JOIN courses c ON r.course_id = c.id
            ORDER BY r.created_at DESC
        ");
        $resultsList = $stmt->fetchAll();

        $filename = 'premed_examination_gradebook_' . date('Y-m-d_Hi') . '.csv';
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Pragma: no-cache');
        header('Expires: 0');

        $out = fopen('php://output', 'w');
        fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF));
        fputcsv($out, ['S/N', 'Candidate Name', 'Matric / JAMB Number', 'Department', 'Course Code', 'Course Title', 'Score', 'Total Questions', 'Percentage (%)', 'Grade', 'Proctor Tab Switches', 'Flagged For Cheating', 'Date & Time']);

        $sn = 1;
        foreach ($resultsList as $sub) {
            fputcsv($out, [
                $sn++,
                $sub['student_name'] ?? 'Unknown',
                $sub['matric_no'] ?? '',
                $sub['department'] ?? '',
                $sub['course_code'] ?? '',
                $sub['course_title'] ?? '',
                (int)($sub['total_score'] ?? 0),
                (int)($sub['total_questions'] ?? 0),
                round((float)($sub['percentage'] ?? 0), 1),
                $sub['grade'] ?? '',
                (int)($sub['tab_switches'] ?? 0),
                !empty($sub['is_flagged_cheating']) ? 'YES' : 'NO',
                $sub['created_at'] ?? ''
            ]);
        }
        fclose($out);
        exit;
    }

    // C. Export Question Bank CSV
    if ($exportType === 'questions_csv') {
        $stmt = $db->query("
            SELECT q.*, c.code as course_code, c.title as course_title, t.name as topic_name
            FROM questions q
            JOIN topics t ON q.topic_id = t.id
            JOIN courses c ON t.course_id = c.id
            ORDER BY c.code ASC, q.created_at DESC
        ");
        $qList = $stmt->fetchAll();

        $filename = 'premed_question_bank_export_' . date('Y-m-d_Hi') . '.csv';
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Pragma: no-cache');
        header('Expires: 0');

        $out = fopen('php://output', 'w');
        fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF));
        fputcsv($out, ['Course Code', 'Topic', 'Question Prompt', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Option (A/B/C/D)', 'Clinical Explanation']);

        foreach ($qList as $q) {
            fputcsv($out, [
                $q['course_code'],
                $q['topic_name'],
                $q['text'],
                $q['a'],
                $q['b'],
                $q['c'],
                $q['d'],
                strtoupper(trim($q['correct_option'])),
                $q['explanation'] ?? ''
            ]);
        }
        fclose($out);
        exit;
    }
}

// ==========================================
// 2. PRODUCTION ACTIONS (POST)
// ==========================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    // 1. Toggle Assessment Lock
    if ($action === 'toggle_lock') {
        $cid = $_POST['course_id'] ?? '';
        $current = (int)($_POST['current_locked'] ?? 0);
        $new = $current ? 0 : 1;
        try {
            $db->prepare("UPDATE courses SET is_locked = ? WHERE id = ?")->execute([$new, $cid]);
            $statusStr = $new ? 'locked (disabled)' : 'unlocked (active live for students)';
            header("Location: admin_dashboard.php?tab=deployments&msg=" . urlencode("Assessment successfully {$statusStr}."));
            exit;
        } catch (Exception $e) {
            $feedbackError = "Failed to update assessment status: " . $e->getMessage();
        }
    }

    // 2. Add New Subject / Course
    if ($action === 'add_course') {
        $code = strtoupper(trim($_POST['code'] ?? ''));
        $title = trim($_POST['title'] ?? '');
        $duration = max(5, (int)($_POST['duration'] ?? 30));
        $limit = max(5, (int)($_POST['question_limit'] ?? 20));

        if (empty($code) || empty($title)) {
            $feedbackError = "Both Course Code and Title are required.";
        } else {
            try {
                $cid = 'course_' . strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $code)) . '_' . time();
                $stmt = $db->prepare("INSERT INTO courses (id, code, title, duration, question_limit, is_mock, is_locked) VALUES (?, ?, ?, ?, ?, 1, 0)");
                $stmt->execute([$cid, $code, $title, $duration, $limit]);

                // Create default topic for the course
                $tid = 'topic_' . bin2hex(random_bytes(6));
                $db->prepare("INSERT INTO topics (id, course_id, name) VALUES (?, ?, ?)")->execute([$tid, $cid, 'Clinical & Theoretical Curriculum']);

                header("Location: admin_dashboard.php?tab=deployments&msg=" . urlencode("Subject {$code} created successfully!"));
                exit;
            } catch (Exception $e) {
                $feedbackError = "Could not create subject: " . $e->getMessage();
            }
        }
    }

    // 3. Edit Existing Subject / Course Parameters
    if ($action === 'update_course') {
        $cid = $_POST['course_id'] ?? '';
        $code = strtoupper(trim($_POST['code'] ?? ''));
        $title = trim($_POST['title'] ?? '');
        $duration = max(5, (int)($_POST['duration'] ?? 30));
        $limit = max(5, (int)($_POST['question_limit'] ?? 20));

        if (empty($cid) || empty($code) || empty($title)) {
            $feedbackError = "Invalid course parameters supplied.";
        } else {
            try {
                $stmt = $db->prepare("UPDATE courses SET code = ?, title = ?, duration = ?, question_limit = ? WHERE id = ?");
                $stmt->execute([$code, $title, $duration, $limit, $cid]);
                header("Location: admin_dashboard.php?tab=deployments&msg=" . urlencode("Subject {$code} configuration updated successfully!"));
                exit;
            } catch (Exception $e) {
                $feedbackError = "Failed to update subject: " . $e->getMessage();
            }
        }
    }

    // 4. Delete Course
    if ($action === 'delete_course') {
        $cid = $_POST['course_id'] ?? '';
        try {
            // Find all topic IDs
            $tStmt = $db->prepare("SELECT id FROM topics WHERE course_id = ?");
            $tStmt->execute([$cid]);
            $topicIds = $tStmt->fetchAll(PDO::FETCH_COLUMN);

            if (!empty($topicIds)) {
                $placeholders = implode(',', array_fill(0, count($topicIds), '?'));
                $db->prepare("DELETE FROM questions WHERE topic_id IN ($placeholders)")->execute($topicIds);
                $db->prepare("DELETE FROM topics WHERE course_id = ?")->execute([$cid]);
            }
            $db->prepare("DELETE FROM courses WHERE id = ?")->execute([$cid]);

            header("Location: admin_dashboard.php?tab=deployments&msg=" . urlencode("Subject and all its questions removed cleanly."));
            exit;
        } catch (Exception $e) {
            $feedbackError = "Failed to delete course: " . $e->getMessage();
        }
    }

    // 5. Add Single Question
    if ($action === 'add_question') {
        $courseId = $_POST['course_id'] ?? '';
        $text = trim($_POST['text'] ?? '');
        $optA = trim($_POST['a'] ?? '');
        $optB = trim($_POST['b'] ?? '');
        $optC = trim($_POST['c'] ?? '');
        $optD = trim($_POST['d'] ?? '');
        $correct = strtoupper(trim($_POST['correct_option'] ?? 'A'));
        $explanation = trim($_POST['explanation'] ?? '');

        if (empty($courseId) || empty($text) || empty($optA) || empty($optB)) {
            $feedbackError = "Question text, target subject, and at least Options A and B are required.";
        } else {
            try {
                // Find or create topic
                $tStmt = $db->prepare("SELECT id FROM topics WHERE course_id = ? LIMIT 1");
                $tStmt->execute([$courseId]);
                $topic = $tStmt->fetch();
                $topicId = $topic ? $topic['id'] : null;

                if (!$topicId) {
                    $topicId = 'topic_' . bin2hex(random_bytes(6));
                    $db->prepare("INSERT INTO topics (id, course_id, name) VALUES (?, ?, 'Clinical & Theoretical Curriculum')")->execute([$topicId, $courseId]);
                }

                $qid = 'q_' . bin2hex(random_bytes(8));
                $ins = $db->prepare("INSERT INTO questions (id, topic_id, text, a, b, c, d, correct_option, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $ins->execute([$qid, $topicId, $text, $optA, $optB, $optC, $optD, $correct, $explanation]);

                header("Location: admin_dashboard.php?tab=questions&msg=" . urlencode("Question added successfully to the question bank!"));
                exit;
            } catch (Exception $e) {
                $feedbackError = "Failed to add question: " . $e->getMessage();
            }
        }
    }

    // 6. Edit Existing Question
    if ($action === 'edit_question') {
        $qid = $_POST['question_id'] ?? '';
        $text = trim($_POST['text'] ?? '');
        $optA = trim($_POST['a'] ?? '');
        $optB = trim($_POST['b'] ?? '');
        $optC = trim($_POST['c'] ?? '');
        $optD = trim($_POST['d'] ?? '');
        $correct = strtoupper(trim($_POST['correct_option'] ?? 'A'));
        $explanation = trim($_POST['explanation'] ?? '');

        if (empty($qid) || empty($text) || empty($optA) || empty($optB)) {
            $feedbackError = "Question text and minimum Options A and B are mandatory.";
        } else {
            try {
                $up = $db->prepare("UPDATE questions SET text = ?, a = ?, b = ?, c = ?, d = ?, correct_option = ?, explanation = ? WHERE id = ?");
                $up->execute([$text, $optA, $optB, $optC, $optD, $correct, $explanation, $qid]);
                header("Location: admin_dashboard.php?tab=questions&msg=" . urlencode("Question updated successfully!"));
                exit;
            } catch (Exception $e) {
                $feedbackError = "Failed to update question: " . $e->getMessage();
            }
        }
    }

    // 7. Delete Single Question
    if ($action === 'delete_question') {
        $qid = $_POST['question_id'] ?? '';
        try {
            $db->prepare("DELETE FROM questions WHERE id = ?")->execute([$qid]);
            header("Location: admin_dashboard.php?tab=questions&msg=" . urlencode("Question removed from bank."));
            exit;
        } catch (Exception $e) {
            $feedbackError = "Failed to delete question: " . $e->getMessage();
        }
    }

    // 8. Bulk Import Questions (JSON or CSV)
    if ($action === 'bulk_import_questions') {
        $courseId = $_POST['course_id'] ?? '';
        $rawPayload = trim($_POST['raw_data'] ?? '');

        if (empty($courseId) || empty($rawPayload)) {
            $feedbackError = "Please select a target course and paste valid question data.";
        } else {
            try {
                // Ensure target topic exists
                $tStmt = $db->prepare("SELECT id FROM topics WHERE course_id = ? LIMIT 1");
                $tStmt->execute([$courseId]);
                $topic = $tStmt->fetch();
                $topicId = $topic ? $topic['id'] : null;

                if (!$topicId) {
                    $topicId = 'topic_' . bin2hex(random_bytes(6));
                    $db->prepare("INSERT INTO topics (id, course_id, name) VALUES (?, ?, 'Clinical Curriculum')")->execute([$topicId, $courseId]);
                }

                $importedCount = 0;
                $ins = $db->prepare("INSERT INTO questions (id, topic_id, text, a, b, c, d, correct_option, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

                // Try JSON parsing first
                $jsonData = json_decode($rawPayload, true);
                if (is_array($jsonData)) {
                    foreach ($jsonData as $item) {
                        $qText = trim($item['text'] ?? $item['question'] ?? '');
                        $qA = trim($item['a'] ?? $item['option_a'] ?? '');
                        $qB = trim($item['b'] ?? $item['option_b'] ?? '');
                        $qC = trim($item['c'] ?? $item['option_c'] ?? '');
                        $qD = trim($item['d'] ?? $item['option_d'] ?? '');
                        $qAns = strtoupper(trim($item['correct'] ?? $item['correct_option'] ?? $item['answer'] ?? 'A'));
                        $qExp = trim($item['explanation'] ?? $item['rationale'] ?? '');

                        if (!empty($qText) && !empty($qA) && !empty($qB)) {
                            $qid = 'q_' . bin2hex(random_bytes(8));
                            $ins->execute([$qid, $topicId, $qText, $qA, $qB, $qC, $qD, $qAns, $qExp]);
                            $importedCount++;
                        }
                    }
                } else {
                    // Fallback to CSV / TSV lines
                    $lines = preg_split("/\r\n|\n|\r/", $rawPayload);
                    foreach ($lines as $line) {
                        $line = trim($line);
                        if (empty($line) || str_starts_with($line, '#')) continue;

                        $row = str_getcsv($line);
                        // Skip header line if present
                        if (isset($row[0]) && in_array(strtolower(trim($row[0])), ['question', 'question prompt', 'text', 's/n'])) continue;

                        if (count($row) >= 3) {
                            $qText = trim($row[0] ?? '');
                            $qA = trim($row[1] ?? '');
                            $qB = trim($row[2] ?? '');
                            $qC = trim($row[3] ?? '');
                            $qD = trim($row[4] ?? '');
                            $qAns = strtoupper(trim($row[5] ?? 'A'));
                            $qExp = trim($row[6] ?? '');

                            if (!in_array($qAns, ['A', 'B', 'C', 'D'])) $qAns = 'A';

                            if (!empty($qText) && !empty($qA)) {
                                $qid = 'q_' . bin2hex(random_bytes(8));
                                $ins->execute([$qid, $topicId, $qText, $qA, $qB, $qC, $qD, $qAns, $qExp]);
                                $importedCount++;
                            }
                        }
                    }
                }

                header("Location: admin_dashboard.php?tab=questions&msg=" . urlencode("Successfully imported {$importedCount} questions into the course bank!"));
                exit;
            } catch (Exception $e) {
                $feedbackError = "Bulk import encountered an error: " . $e->getMessage();
            }
        }
    }

    // 9. Reset Student Password to Default ('premed2026')
    if ($action === 'reset_student_password') {
        $studentId = $_POST['student_id'] ?? '';
        $newPass = 'premed2026';
        try {
            $hashed = password_hash($newPass, PASSWORD_DEFAULT);
            $db->prepare("UPDATE students SET password = ? WHERE id = ?")->execute([$hashed, $studentId]);
            header("Location: admin_dashboard.php?tab=students&msg=" . urlencode("Password reset successfully. The candidate can now sign in with default password: premed2026"));
            exit;
        } catch (Exception $e) {
            $feedbackError = "Could not reset password: " . $e->getMessage();
        }
    }

    // 10. Clear Student Test Attempt (Allows retake)
    if ($action === 'clear_submission') {
        $resultId = $_POST['result_id'] ?? '';
        try {
            $db->prepare("DELETE FROM results WHERE id = ?")->execute([$resultId]);
            header("Location: admin_dashboard.php?tab=results&msg=" . urlencode("Test submission record cleared. The candidate is now free to retake the assessment."));
            exit;
        } catch (Exception $e) {
            $feedbackError = "Failed to clear submission: " . $e->getMessage();
        }
    }

    // 11. Delete Registered Candidate
    if ($action === 'delete_student') {
        $studentId = $_POST['student_id'] ?? '';
        try {
            $db->prepare("DELETE FROM results WHERE student_id = ?")->execute([$studentId]);
            $db->prepare("DELETE FROM students WHERE id = ?")->execute([$studentId]);
            header("Location: admin_dashboard.php?tab=students&msg=" . urlencode("Candidate profile and test records deleted cleanly."));
            exit;
        } catch (Exception $e) {
            $feedbackError = "Failed to delete student: " . $e->getMessage();
        }
    }
}

// ==========================================
// 3. AGGREGATE SYSTEM METRICS & DATA QUERIES
// ==========================================
$tab = $_GET['tab'] ?? 'deployments';
$feedbackMsg = $_GET['msg'] ?? $feedbackMsg;

// Top Statistics
$totalQuestions = (int)$db->query("SELECT COUNT(*) FROM questions")->fetchColumn();
$totalStudents = (int)$db->query("SELECT COUNT(*) FROM students")->fetchColumn();
$studentsWithBank = (int)$db->query("SELECT COUNT(*) FROM students WHERE account_number IS NOT NULL AND TRIM(account_number) != ''")->fetchColumn();
$bankPct = $totalStudents > 0 ? round(($studentsWithBank / $totalStudents) * 100) : 0;

$totalResults = (int)$db->query("SELECT COUNT(*) FROM results")->fetchColumn();
$avgScore = (float)$db->query("SELECT COALESCE(AVG(percentage), 0) FROM results")->fetchColumn();
$totalCourses = (int)$db->query("SELECT COUNT(*) FROM courses")->fetchColumn();
$activeUnlockedCourses = (int)$db->query("SELECT COUNT(*) FROM courses WHERE is_locked = 0")->fetchColumn();

// 1. All Courses with live Question & Submission Counts
$courses = $db->query("
    SELECT c.*, 
           COUNT(DISTINCT q.id) as q_count,
           COUNT(DISTINCT r.id) as sub_count
    FROM courses c
    LEFT JOIN topics t ON c.id = t.course_id
    LEFT JOIN questions q ON t.id = q.topic_id
    LEFT JOIN results r ON c.id = r.course_id
    GROUP BY c.id
    ORDER BY c.created_at DESC
")->fetchAll();

// 2. Question Bank Query with filtering
$selectedCourseFilter = $_GET['filter_course'] ?? '';
$searchQuestionKeyword = trim($_GET['q_search'] ?? '');

$qSql = "
    SELECT q.*, c.code as course_code, c.title as course_title, t.name as topic_name
    FROM questions q
    JOIN topics t ON q.topic_id = t.id
    JOIN courses c ON t.course_id = c.id
    WHERE 1=1
";
$qParams = [];

if (!empty($selectedCourseFilter)) {
    $qSql .= " AND c.id = ? ";
    $qParams[] = $selectedCourseFilter;
}
if (!empty($searchQuestionKeyword)) {
    $qSql .= " AND (q.text LIKE ? OR q.explanation LIKE ?) ";
    $qParams[] = '%' . $searchQuestionKeyword . '%';
    $qParams[] = '%' . $searchQuestionKeyword . '%';
}

$qSql .= " ORDER BY q.created_at DESC LIMIT 100";
$qStmt = $db->prepare($qSql);
$qStmt->execute($qParams);
$questionsList = $qStmt->fetchAll();

// 3. Test Submissions / Gradebook
$resultsFilterCourse = $_GET['results_course'] ?? '';
$resultsSearch = trim($_GET['results_search'] ?? '');

$resSql = "
    SELECT r.*, s.name as student_name, s.matric_no, s.department, c.code as course_code, c.title as course_title
    FROM results r
    LEFT JOIN students s ON r.student_id = s.id
    LEFT JOIN courses c ON r.course_id = c.id
    WHERE 1=1
";
$resParams = [];

if (!empty($resultsFilterCourse)) {
    $resSql .= " AND r.course_id = ? ";
    $resParams[] = $resultsFilterCourse;
}
if (!empty($resultsSearch)) {
    $resSql .= " AND (s.name LIKE ? OR s.matric_no LIKE ?) ";
    $resParams[] = '%' . $resultsSearch . '%';
    $resParams[] = '%' . $resultsSearch . '%';
}

$resSql .= " ORDER BY r.created_at DESC LIMIT 100";
$resStmt = $db->prepare($resSql);
$resStmt->execute($resParams);
$submissions = $resStmt->fetchAll();

// 4. Candidates Directory with Bank Status
$studentSearch = trim($_GET['student_search'] ?? '');
$studentBankFilter = $_GET['bank_filter'] ?? '';

$stuSql = "
    SELECT s.*, 
           COUNT(r.id) as tests_count,
           COALESCE(AVG(r.percentage), 0) as avg_score,
           COALESCE(MAX(r.percentage), 0) as peak_score
    FROM students s
    LEFT JOIN results r ON s.id = r.student_id
    WHERE 1=1
";
$stuParams = [];

if ($studentBankFilter === 'verified') {
    $stuSql .= " AND s.account_number IS NOT NULL AND TRIM(s.account_number) != '' ";
} elseif ($studentBankFilter === 'pending') {
    $stuSql .= " AND (s.account_number IS NULL OR TRIM(s.account_number) = '') ";
}

if (!empty($studentSearch)) {
    $stuSql .= " AND (s.name LIKE ? OR s.matric_no LIKE ? OR s.department LIKE ? OR s.phone LIKE ?) ";
    $stuParams[] = '%' . $studentSearch . '%';
    $stuParams[] = '%' . $studentSearch . '%';
    $stuParams[] = '%' . $studentSearch . '%';
    $stuParams[] = '%' . $studentSearch . '%';
}

$stuSql .= " GROUP BY s.id ORDER BY s.created_at DESC LIMIT 150";
$stuStmt = $db->prepare($stuSql);
$stuStmt->execute($stuParams);
$students = $stuStmt->fetchAll();

// 5. Exam Integrity & Proctoring Live Feed (from exam_sessions)
$proctorSessions = [];
try {
    $procStmt = $db->query("
        SELECT es.*, c.title as course_title
        FROM exam_sessions es
        LEFT JOIN courses c ON es.course_id = c.id
        ORDER BY es.updated_at DESC
        LIMIT 60
    ");
    $proctorSessions = $procStmt ? $procStmt->fetchAll() : [];
} catch (Exception $e) {
    // exam_sessions will be auto-populated during live exams
}

require_once __DIR__ . '/includes/header.php';
?>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

    <!-- 1. Executive Faculty Header -->
    <div class="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-slate-800 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="space-y-1.5 relative z-10">
            <div class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-mono">
                    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Production Cloud Engine &bull; Turso Online</span>
                </span>
                <span class="text-xs text-slate-400">ID: <?= htmlspecialchars($adminUser['matric_no'] ?? '250811024') ?></span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                <span>Faculty &amp; Administration Control Console</span>
            </h1>
            <p class="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
                Comprehensive CBT test deployment, question authoring with LaTeX support, candidate banking records for cash prizes, and live exam integrity surveillance.
            </p>
        </div>

        <div class="relative z-10 flex flex-wrap items-center gap-2.5">
            <a href="index.php" target="_blank" class="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all border border-white/15 flex items-center gap-2 shadow-xs">
                <i data-lucide="external-link" class="w-4 h-4"></i>
                <span>Open Student Hub</span>
            </a>
            <a href="logout.php" class="px-4 py-2.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs">
                <i data-lucide="log-out" class="w-4 h-4"></i>
                <span>Sign Out</span>
            </a>
        </div>
    </div>

    <!-- Alert Banners -->
    <?php if ($feedbackMsg): ?>
    <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
        <div class="flex items-center gap-2.5">
            <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600 shrink-0"></i>
            <span><?= htmlspecialchars($feedbackMsg) ?></span>
        </div>
        <button type="button" onclick="this.parentElement.remove()" class="text-emerald-600 hover:text-emerald-800"><i data-lucide="x" class="w-4 h-4"></i></button>
    </div>
    <?php endif; ?>

    <?php if ($feedbackError): ?>
    <div class="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
        <div class="flex items-center gap-2.5">
            <i data-lucide="alert-octagon" class="w-4 h-4 text-rose-600 shrink-0"></i>
            <span><?= htmlspecialchars($feedbackError) ?></span>
        </div>
        <button type="button" onclick="this.parentElement.remove()" class="text-rose-600 hover:text-rose-800"><i data-lucide="x" class="w-4 h-4"></i></button>
    </div>
    <?php endif; ?>

    <!-- 2. High-Yield KPI Analytics -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- 1. Registered Candidates -->
        <div class="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div class="flex items-center justify-between mb-2">
                <span class="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Candidates</span>
                <span class="p-2 rounded-xl bg-indigo-50 text-indigo-600"><i data-lucide="users" class="w-4 h-4"></i></span>
            </div>
            <div class="space-y-1">
                <span class="text-2xl sm:text-3xl font-black text-slate-900"><?= number_format($totalStudents) ?></span>
                <div class="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span><strong><?= $studentsWithBank ?></strong> with bank details (<?= $bankPct ?>%)</span>
                </div>
            </div>
        </div>

        <!-- 2. Question Bank Total -->
        <div class="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div class="flex items-center justify-between mb-2">
                <span class="text-[11px] font-black uppercase tracking-wider text-slate-400">Question Bank</span>
                <span class="p-2 rounded-xl bg-emerald-50 text-emerald-600"><i data-lucide="book-open" class="w-4 h-4"></i></span>
            </div>
            <div class="space-y-1">
                <span class="text-2xl sm:text-3xl font-black text-emerald-700"><?= number_format($totalQuestions) ?></span>
                <div class="text-[11px] text-slate-500 font-medium">
                    Spread across <strong><?= $totalCourses ?></strong> configured subjects
                </div>
            </div>
        </div>

        <!-- 3. Submissions & Pass Rate -->
        <div class="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div class="flex items-center justify-between mb-2">
                <span class="text-[11px] font-black uppercase tracking-wider text-slate-400">Exam Submissions</span>
                <span class="p-2 rounded-xl bg-violet-50 text-violet-600"><i data-lucide="award" class="w-4 h-4"></i></span>
            </div>
            <div class="space-y-1">
                <span class="text-2xl sm:text-3xl font-black text-violet-700"><?= number_format($totalResults) ?></span>
                <div class="text-[11px] text-slate-500 font-medium">
                    Average score: <strong><?= round($avgScore, 1) ?>%</strong>
                </div>
            </div>
        </div>

        <!-- 4. Active Live Assessments -->
        <div class="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div class="flex items-center justify-between mb-2">
                <span class="text-[11px] font-black uppercase tracking-wider text-slate-400">Live Status</span>
                <span class="p-2 rounded-xl bg-amber-50 text-amber-600"><i data-lucide="activity" class="w-4 h-4"></i></span>
            </div>
            <div class="space-y-1">
                <span class="text-2xl sm:text-3xl font-black <?= $activeUnlockedCourses > 0 ? 'text-emerald-600' : 'text-slate-400' ?>">
                    <?= $activeUnlockedCourses ?> <span class="text-xs font-bold text-slate-500">Live</span>
                </span>
                <div class="text-[11px] text-slate-500 font-medium">
                    <?= $totalCourses - $activeUnlockedCourses ?> assessments currently locked
                </div>
            </div>
        </div>
    </div>

    <!-- 3. Tabbed Navigation Bar -->
    <div class="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xs flex flex-wrap gap-1 text-xs font-bold">
        <a href="?tab=deployments" class="px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 <?= $tab === 'deployments' ? 'bg-indigo-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' ?>">
            <i data-lucide="layers" class="w-4 h-4"></i>
            <span>Assessments &amp; Deployment</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] <?= $tab === 'deployments' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600' ?>"><?= count($courses) ?></span>
        </a>
        <a href="?tab=questions" class="px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 <?= $tab === 'questions' ? 'bg-indigo-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' ?>">
            <i data-lucide="file-question" class="w-4 h-4"></i>
            <span>Question Bank &amp; Importer</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] <?= $tab === 'questions' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600' ?>"><?= $totalQuestions ?></span>
        </a>
        <a href="?tab=results" class="px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 <?= $tab === 'results' ? 'bg-indigo-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' ?>">
            <i data-lucide="graduation-cap" class="w-4 h-4"></i>
            <span>Gradebook &amp; Transcripts</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] <?= $tab === 'results' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600' ?>"><?= $totalResults ?></span>
        </a>
        <a href="?tab=students" class="px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 <?= $tab === 'students' ? 'bg-indigo-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' ?>">
            <i data-lucide="id-card" class="w-4 h-4"></i>
            <span>Candidates &amp; Cash Prizes</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] <?= $tab === 'students' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600' ?>"><?= $totalStudents ?></span>
        </a>
        <a href="?tab=proctoring" class="px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 <?= $tab === 'proctoring' ? 'bg-indigo-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' ?>">
            <i data-lucide="shield-alert" class="w-4 h-4"></i>
            <span>Integrity &amp; Proctoring</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] <?= $tab === 'proctoring' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600' ?>"><?= count($proctorSessions) ?></span>
        </a>
    </div>

    <!-- ========================================================================= -->
    <!-- TAB 1: ASSESSMENTS & COURSE DEPLOYMENT                                   -->
    <!-- ========================================================================= -->
    <?php if ($tab === 'deployments'): ?>
    <div class="space-y-6">
        
        <!-- Add New Assessment Card -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-black text-slate-900 flex items-center gap-2">
                    <i data-lucide="plus-circle" class="w-4 h-4 text-indigo-600"></i>
                    <span>Add New Subject or Clinical Assessment</span>
                </h3>
                <span class="text-[11px] text-slate-400">All assessments immediately synchronize to student dashboards</span>
            </div>
            <form method="POST" action="admin_dashboard.php" class="grid grid-cols-1 sm:grid-cols-5 gap-3.5">
                <input type="hidden" name="action" value="add_course">
                <div>
                    <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">Course Code</label>
                    <input type="text" name="code" required placeholder="e.g. BIO 101" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono uppercase focus:ring-2 focus:ring-indigo-500">
                </div>
                <div class="sm:col-span-2">
                    <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">Full Course Title</label>
                    <input type="text" name="title" required placeholder="e.g. General Biology & Cell Organization" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500">
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">Time Limit (Mins)</label>
                    <input type="number" name="duration" required value="30" min="5" max="300" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-500">
                </div>
                <div class="flex items-end">
                    <button type="submit" class="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-1.5">
                        <i data-lucide="check" class="w-4 h-4"></i>
                        <span>Create Subject</span>
                    </button>
                </div>
            </form>
        </div>

        <!-- Assessments Table -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 class="text-base font-black text-slate-900">Configured Assessments &amp; Exam Timers</h2>
                    <p class="text-xs text-slate-500 mt-0.5">Control time limits, question allotments, and lock or unlock examinations for candidate sittings.</p>
                </div>
                <a href="?export=questions_csv" class="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-2">
                    <i data-lucide="download" class="w-4 h-4"></i>
                    <span>Export Entire Question Bank (CSV)</span>
                </a>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead class="bg-slate-50 border-b border-slate-200 uppercase font-black text-slate-500">
                        <tr>
                            <th class="px-6 py-3.5">Code</th>
                            <th class="px-6 py-3.5">Course Title</th>
                            <th class="px-6 py-3.5 text-center">Questions Available</th>
                            <th class="px-6 py-3.5 text-center">Exam Duration</th>
                            <th class="px-6 py-3.5 text-center">Allotment</th>
                            <th class="px-6 py-3.5 text-center">Candidate Status</th>
                            <th class="px-6 py-3.5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <?php if (empty($courses)): ?>
                        <tr><td colspan="7" class="py-8 text-center text-slate-400">No courses configured yet.</td></tr>
                        <?php else: ?>
                        <?php foreach ($courses as $c): ?>
                        <tr class="hover:bg-slate-50/70 transition-colors">
                            <td class="px-6 py-4 font-mono font-black text-indigo-700"><?= htmlspecialchars($c['code']) ?></td>
                            <td class="px-6 py-4 font-bold text-slate-900"><?= htmlspecialchars($c['title']) ?></td>
                            <td class="px-6 py-4 text-center">
                                <a href="?tab=questions&filter_course=<?= urlencode($c['id']) ?>" class="inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                                    <span><?= (int)$c['q_count'] ?> Qs</span>
                                    <i data-lucide="arrow-right" class="w-3 h-3"></i>
                                </a>
                            </td>
                            <td class="px-6 py-4 text-center font-mono font-bold text-slate-600"><?= (int)$c['duration'] ?> mins</td>
                            <td class="px-6 py-4 text-center font-mono text-slate-600"><?= (int)$c['question_limit'] ?> / exam</td>
                            <td class="px-6 py-4 text-center">
                                <?php if ($c['is_locked']): ?>
                                <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[11px]">
                                    <i data-lucide="lock" class="w-3 h-3"></i> Locked
                                </span>
                                <?php else: ?>
                                <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[11px]">
                                    <i data-lucide="unlock" class="w-3 h-3"></i> Active Live
                                </span>
                                <?php endif; ?>
                            </td>
                            <td class="px-6 py-4 text-right">
                                <div class="flex items-center justify-end gap-2">
                                    <!-- Lock / Unlock Toggle -->
                                    <form method="POST" action="admin_dashboard.php" class="inline">
                                        <input type="hidden" name="action" value="toggle_lock">
                                        <input type="hidden" name="course_id" value="<?= htmlspecialchars($c['id']) ?>">
                                        <input type="hidden" name="current_locked" value="<?= (int)$c['is_locked'] ?>">
                                        <button type="submit" class="px-3 py-1.5 rounded-xl border text-xs font-bold transition-all <?= $c['is_locked'] ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100' ?>">
                                            <?= $c['is_locked'] ? 'Unlock for Sittings' : 'Lock Exam' ?>
                                        </button>
                                    </form>

                                    <!-- Edit Parameters Modal Trigger -->
                                    <button type="button" onclick="openEditCourseModal(<?= htmlspecialchars(json_encode($c)) ?>)" class="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100" title="Edit Parameters">
                                        <i data-lucide="settings" class="w-4 h-4"></i>
                                    </button>

                                    <!-- Delete Course Button -->
                                    <form method="POST" action="admin_dashboard.php" class="inline" onsubmit="return confirm('WARNING: Are you sure you want to permanently delete <?= htmlspecialchars($c['code']) ?> and all its associated questions?')">
                                        <input type="hidden" name="action" value="delete_course">
                                        <input type="hidden" name="course_id" value="<?= htmlspecialchars($c['id']) ?>">
                                        <button type="submit" class="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50" title="Delete Course">
                                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                                        </button>
                                    </form>
                                </div>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

    </div>
    <?php endif; ?>

    <!-- ========================================================================= -->
    <!-- TAB 2: QUESTION BANK & BULK IMPORTER                                     -->
    <!-- ========================================================================= -->
    <?php if ($tab === 'questions'): ?>
    <div class="space-y-6">

        <!-- Top Controls: Filter & Bulk Importer Switcher -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
            <form method="GET" action="admin_dashboard.php" class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <input type="hidden" name="tab" value="questions">
                <select name="filter_course" onchange="this.form.submit()" class="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-bold text-slate-700">
                    <option value="">All Subjects (<?= $totalQuestions ?> Qs)</option>
                    <?php foreach ($courses as $c): ?>
                    <option value="<?= htmlspecialchars($c['id']) ?>" <?= $selectedCourseFilter === $c['id'] ? 'selected' : '' ?>>
                        <?= htmlspecialchars($c['code']) ?> (<?= (int)$c['q_count'] ?> questions)
                    </option>
                    <?php endforeach; ?>
                </select>

                <div class="relative flex-1 sm:w-64">
                    <input type="text" name="q_search" value="<?= htmlspecialchars($searchQuestionKeyword) ?>" placeholder="Search questions..." class="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs">
                    <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5"></i>
                </div>
                <button type="submit" class="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs">Filter</button>
                <?php if ($selectedCourseFilter || $searchQuestionKeyword): ?>
                <a href="?tab=questions" class="text-xs text-rose-600 font-bold hover:underline">Reset</a>
                <?php endif; ?>
            </form>

            <div class="flex items-center gap-2 shrink-0">
                <button type="button" onclick="document.getElementById('bulkImportCard').classList.toggle('hidden')" class="px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs flex items-center gap-1.5 hover:bg-indigo-100">
                    <i data-lucide="upload-cloud" class="w-4 h-4"></i>
                    <span>Bulk Importer (CSV / JSON)</span>
                </button>
                <a href="?export=questions_csv" class="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center gap-1.5">
                    <i data-lucide="download" class="w-4 h-4"></i>
                    <span>Export</span>
                </a>
            </div>
        </div>

        <!-- Bulk Importer Expandable Panel -->
        <div id="bulkImportCard" class="hidden bg-white rounded-3xl p-6 border-2 border-indigo-200 shadow-md space-y-4 animate-in fade-in">
            <div class="flex items-start justify-between">
                <div>
                    <h3 class="text-sm font-black text-indigo-900 flex items-center gap-2">
                        <i data-lucide="upload-cloud" class="w-5 h-5 text-indigo-600"></i>
                        <span>High-Capacity Bulk Question Importer</span>
                    </h3>
                    <p class="text-xs text-slate-500 mt-0.5">Upload dozens or hundreds of medical multiple-choice questions in seconds using JSON or comma-separated CSV text.</p>
                </div>
                <button type="button" onclick="document.getElementById('bulkImportCard').classList.add('hidden')" class="text-slate-400 hover:text-slate-600">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <form method="POST" action="admin_dashboard.php" class="space-y-4">
                <input type="hidden" name="action" value="bulk_import_questions">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Target Subject <span class="text-rose-500">*</span></label>
                        <select name="course_id" required class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-bold">
                            <option value="" disabled selected>-- Select Target Course --</option>
                            <?php foreach ($courses as $c): ?>
                            <option value="<?= htmlspecialchars($c['id']) ?>"><?= htmlspecialchars($c['code']) ?> - <?= htmlspecialchars($c['title']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="sm:col-span-2 flex items-center justify-end gap-2 text-xs">
                        <button type="button" onclick="loadSampleCsv()" class="text-indigo-600 hover:underline font-bold text-[11px]">Load Sample CSV Template</button>
                        <span class="text-slate-300">&bull;</span>
                        <button type="button" onclick="loadSampleJson()" class="text-indigo-600 hover:underline font-bold text-[11px]">Load Sample JSON Template</button>
                    </div>
                </div>

                <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Paste Question Rows (CSV or JSON Array)</label>
                    <textarea name="raw_data" id="bulkTextarea" required rows="6" placeholder="Paste CSV lines or JSON array here..." class="w-full p-3 rounded-2xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-500"></textarea>
                </div>

                <div class="flex items-center justify-end gap-3">
                    <button type="button" onclick="document.getElementById('bulkImportCard').classList.add('hidden')" class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">Cancel</button>
                    <button type="submit" class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 flex items-center gap-2">
                        <i data-lucide="check" class="w-4 h-4"></i>
                        <span>Start Bulk Import</span>
                    </button>
                </div>
            </form>
        </div>

        <!-- Add Single Question Form -->
        <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <h3 class="text-sm font-black text-slate-900 flex items-center gap-2">
                <i data-lucide="edit-3" class="w-4 h-4 text-indigo-600"></i>
                <span>Author Single Question (LaTeX Math Supported)</span>
            </h3>
            <form method="POST" action="admin_dashboard.php" class="space-y-4">
                <input type="hidden" name="action" value="add_question">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="sm:col-span-2">
                        <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Target Course / Subject <span class="text-rose-500">*</span></label>
                        <select name="course_id" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-bold text-slate-800">
                            <option value="" disabled selected>-- Select Subject --</option>
                            <?php foreach ($courses as $c): ?>
                            <option value="<?= htmlspecialchars($c['id']) ?>" <?= $selectedCourseFilter === $c['id'] ? 'selected' : '' ?>>
                                <?= htmlspecialchars($c['code']) ?> - <?= htmlspecialchars($c['title']) ?>
                            </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Correct Answer Key <span class="text-rose-500">*</span></label>
                        <select name="correct_option" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-black text-indigo-700">
                            <option value="A">Option A</option>
                            <option value="B">Option B</option>
                            <option value="C">Option C</option>
                            <option value="D">Option D</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Question Prompt <span class="text-rose-500">*</span></label>
                    <textarea name="text" required rows="3" placeholder="Enter clinical or scientific question prompt (LaTeX $formula$ supported)..." class="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"></textarea>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Option A <span class="text-rose-500">*</span></label>
                        <input type="text" name="a" required placeholder="Option A text" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs">
                    </div>
                    <div>
                        <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Option B <span class="text-rose-500">*</span></label>
                        <input type="text" name="b" required placeholder="Option B text" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs">
                    </div>
                    <div>
                        <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Option C</label>
                        <input type="text" name="c" placeholder="Option C text" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs">
                    </div>
                    <div>
                        <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Option D</label>
                        <input type="text" name="d" placeholder="Option D text" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs">
                    </div>
                </div>

                <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Clinical Explanation &amp; Rationale</label>
                    <input type="text" name="explanation" placeholder="Detailed rationale for candidates explaining why the key is correct..." class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs">
                </div>

                <div class="pt-2 flex justify-end">
                    <button type="submit" class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 flex items-center gap-2">
                        <i data-lucide="check" class="w-4 h-4"></i>
                        <span>Save Question to Bank</span>
                    </button>
                </div>
            </form>
        </div>

        <!-- Question Bank Viewer List -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-base font-black text-slate-900">Question Bank Records (<?= count($questionsList) ?> displayed)</h2>
                    <p class="text-xs text-slate-500">Live question library with inline answer keys and clinical rationale.</p>
                </div>
            </div>

            <div class="divide-y divide-slate-100">
                <?php if (empty($questionsList)): ?>
                <div class="py-12 text-center text-slate-400 text-xs">No questions matched your search criteria.</div>
                <?php else: ?>
                <?php foreach ($questionsList as $idx => $rq): ?>
                <div class="py-4 space-y-2">
                    <div class="flex items-start justify-between gap-4">
                        <div class="space-y-1">
                            <div class="flex items-center gap-2">
                                <span class="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 font-black text-[10px] font-mono"><?= htmlspecialchars($rq['course_code']) ?></span>
                                <span class="text-[11px] text-slate-400">ID: <?= substr($rq['id'], 0, 8) ?></span>
                            </div>
                            <p class="text-xs font-semibold text-slate-900 leading-relaxed"><?= htmlspecialchars($rq['text']) ?></p>
                        </div>
                        <div class="flex items-center gap-1.5 shrink-0">
                            <!-- Edit Question Trigger -->
                            <button type="button" onclick="openEditQuestionModal(<?= htmlspecialchars(json_encode($rq)) ?>)" class="p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors" title="Edit Question">
                                <i data-lucide="edit" class="w-4 h-4"></i>
                            </button>
                            <!-- Delete Question -->
                            <form method="POST" action="admin_dashboard.php" onsubmit="return confirm('Delete this question permanently?')">
                                <input type="hidden" name="action" value="delete_question">
                                <input type="hidden" name="question_id" value="<?= htmlspecialchars($rq['id']) ?>">
                                <button type="submit" class="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors" title="Delete Question">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </form>
                        </div>
                    </div>

                    <!-- Options Grid -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div class="p-2 rounded-xl <?= $rq['correct_option'] === 'A' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold' : 'bg-slate-50 text-slate-600' ?>">
                            <span class="font-bold">A:</span> <?= htmlspecialchars($rq['a']) ?>
                        </div>
                        <div class="p-2 rounded-xl <?= $rq['correct_option'] === 'B' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold' : 'bg-slate-50 text-slate-600' ?>">
                            <span class="font-bold">B:</span> <?= htmlspecialchars($rq['b']) ?>
                        </div>
                        <?php if (!empty($rq['c'])): ?>
                        <div class="p-2 rounded-xl <?= $rq['correct_option'] === 'C' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold' : 'bg-slate-50 text-slate-600' ?>">
                            <span class="font-bold">C:</span> <?= htmlspecialchars($rq['c']) ?>
                        </div>
                        <?php endif; ?>
                        <?php if (!empty($rq['d'])): ?>
                        <div class="p-2 rounded-xl <?= $rq['correct_option'] === 'D' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold' : 'bg-slate-50 text-slate-600' ?>">
                            <span class="font-bold">D:</span> <?= htmlspecialchars($rq['d']) ?>
                        </div>
                        <?php endif; ?>
                    </div>

                    <?php if (!empty($rq['explanation'])): ?>
                    <p class="text-[11px] text-slate-500 italic bg-amber-50/50 p-2 rounded-xl border border-amber-100">
                        <strong class="text-amber-800 not-italic">Rationale:</strong> <?= htmlspecialchars($rq['explanation']) ?>
                    </p>
                    <?php endif; ?>
                </div>
                <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>

    </div>
    <?php endif; ?>

    <!-- ========================================================================= -->
    <!-- TAB 3: GRADEBOOK & TEST SUBMISSIONS                                      -->
    <!-- ========================================================================= -->
    <?php if ($tab === 'results'): ?>
    <div class="space-y-6">

        <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 class="text-base font-black text-slate-900">Examination Transcripts &amp; Gradebook</h2>
                    <p class="text-xs text-slate-500 mt-0.5">Real-time candidate scorecards, percentage benchmarks, and proctoring status.</p>
                </div>
                <a href="?export=gradebook_csv" class="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-sm">
                    <i data-lucide="download" class="w-4 h-4"></i>
                    <span>Export Official Gradebook (CSV)</span>
                </a>
            </div>

            <!-- Filter Toolbar -->
            <form method="GET" action="admin_dashboard.php" class="flex flex-wrap items-center gap-3 pt-2">
                <input type="hidden" name="tab" value="results">
                <div class="relative flex-1 min-w-[200px]">
                    <input type="text" name="results_search" value="<?= htmlspecialchars($resultsSearch) ?>" placeholder="Search by candidate name or matric..." class="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs">
                    <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5"></i>
                </div>
                <select name="results_course" class="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-bold">
                    <option value="">All Subjects</option>
                    <?php foreach ($courses as $c): ?>
                    <option value="<?= htmlspecialchars($c['id']) ?>" <?= $resultsFilterCourse === $c['id'] ? 'selected' : '' ?>>
                        <?= htmlspecialchars($c['code']) ?>
                    </option>
                    <?php endforeach; ?>
                </select>
                <button type="submit" class="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs">Apply</button>
                <?php if ($resultsSearch || $resultsFilterCourse): ?>
                <a href="?tab=results" class="text-xs text-rose-600 font-bold hover:underline">Clear</a>
                <?php endif; ?>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead class="bg-slate-50 border-b border-slate-200 uppercase font-black text-slate-500">
                        <tr>
                            <th class="px-6 py-3.5">Candidate</th>
                            <th class="px-6 py-3.5">Matric / ID</th>
                            <th class="px-6 py-3.5">Subject</th>
                            <th class="px-6 py-3.5 text-center">Score</th>
                            <th class="px-6 py-3.5 text-center">Percentage</th>
                            <th class="px-6 py-3.5 text-center">Grade</th>
                            <th class="px-6 py-3.5 text-center">Integrity</th>
                            <th class="px-6 py-3.5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <?php if (empty($submissions)): ?>
                        <tr><td colspan="8" class="py-8 text-center text-slate-400">No examination submissions match the current filter.</td></tr>
                        <?php else: ?>
                        <?php foreach ($submissions as $sub): ?>
                        <tr class="hover:bg-slate-50/70 transition-colors">
                            <td class="px-6 py-3.5">
                                <div class="font-bold text-slate-900"><?= htmlspecialchars($sub['student_name'] ?? 'Unknown Candidate') ?></div>
                                <div class="text-[10px] text-slate-400 truncate max-w-[150px]"><?= htmlspecialchars($sub['department'] ?? '') ?></div>
                            </td>
                            <td class="px-6 py-3.5 font-mono text-slate-600 font-bold"><?= htmlspecialchars($sub['matric_no'] ?? 'N/A') ?></td>
                            <td class="px-6 py-3.5 font-bold text-slate-800"><?= htmlspecialchars($sub['course_code'] ?? 'Exam') ?></td>
                            <td class="px-6 py-3.5 text-center font-bold text-slate-900">
                                <?= (int)$sub['total_score'] ?> / <?= (int)$sub['total_questions'] ?>
                            </td>
                            <td class="px-6 py-3.5 text-center font-black text-indigo-700">
                                <?= round((float)$sub['percentage'], 1) ?>%
                            </td>
                            <td class="px-6 py-3.5 text-center">
                                <span class="px-2.5 py-0.5 rounded-full font-black text-[10px] <?= $sub['percentage'] >= 70 ? 'bg-emerald-100 text-emerald-800' : ($sub['percentage'] >= 50 ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800') ?>">
                                    <?= htmlspecialchars($sub['grade'] ?: ($sub['percentage'] >= 50 ? 'PASS' : 'FAIL')) ?>
                                </span>
                            </td>
                            <td class="px-6 py-3.5 text-center">
                                <?php if ((int)($sub['tab_switches'] ?? 0) > 0 || !empty($sub['is_flagged_cheating'])): ?>
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800" title="Tab switches logged during test sitting">
                                    <i data-lucide="alert-triangle" class="w-3 h-3 text-amber-600"></i>
                                    <span><?= (int)$sub['tab_switches'] ?> Switches</span>
                                </span>
                                <?php else: ?>
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">
                                    <i data-lucide="check" class="w-3 h-3"></i> Clean
                                </span>
                                <?php endif; ?>
                            </td>
                            <td class="px-6 py-3.5 text-right">
                                <div class="flex items-center justify-end gap-2">
                                    <!-- Working Admin Inspect Transcript Link -->
                                    <a href="results.php?result_id=<?= urlencode($sub['id']) ?>" class="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold text-xs inline-flex items-center gap-1">
                                        <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                                        <span>Transcript</span>
                                    </a>

                                    <!-- Clear Attempt Button -->
                                    <form method="POST" action="admin_dashboard.php" class="inline" onsubmit="return confirm('Clear this test submission so candidate can retake?')">
                                        <input type="hidden" name="action" value="clear_submission">
                                        <input type="hidden" name="result_id" value="<?= htmlspecialchars($sub['id']) ?>">
                                        <button type="submit" class="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50" title="Clear / Reset Sitting">
                                            <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
                                        </button>
                                    </form>
                                </div>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

    </div>
    <?php endif; ?>

    <!-- ========================================================================= -->
    <!-- TAB 4: REGISTERED CANDIDATES & CASH PRIZES                               -->
    <!-- ========================================================================= -->
    <?php if ($tab === 'students'): ?>
    <div class="space-y-6">

        <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 class="text-base font-black text-slate-900">Candidate Directory &amp; Cash Prize Accounts</h2>
                    <p class="text-xs text-slate-500 mt-0.5">Verified candidate accounts, university matric numbers, and linked bank details for cash prize disbursements.</p>
                </div>
                <div class="flex items-center gap-2">
                    <a href="?export=prizes_csv" class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-sm">
                        <i data-lucide="bank" class="w-4 h-4"></i>
                        <span>Export Cash Prizes Banking CSV</span>
                    </a>
                </div>
            </div>

            <!-- Filter & Search Toolbar -->
            <form method="GET" action="admin_dashboard.php" class="flex flex-wrap items-center gap-3 pt-2">
                <input type="hidden" name="tab" value="students">
                <div class="relative flex-1 min-w-[200px]">
                    <input type="text" name="student_search" value="<?= htmlspecialchars($studentSearch) ?>" placeholder="Search name, matric number, department, or phone..." class="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs">
                    <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5"></i>
                </div>
                <select name="bank_filter" class="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-bold">
                    <option value="">All Candidates (<?= $totalStudents ?>)</option>
                    <option value="verified" <?= $studentBankFilter === 'verified' ? 'selected' : '' ?>>Bank Details Linked (<?= $studentsWithBank ?>)</option>
                    <option value="pending" <?= $studentBankFilter === 'pending' ? 'selected' : '' ?>>Bank Details Pending (<?= $totalStudents - $studentsWithBank ?>)</option>
                </select>
                <button type="submit" class="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs">Search</button>
                <?php if ($studentSearch || $studentBankFilter): ?>
                <a href="?tab=students" class="text-xs text-rose-600 font-bold hover:underline">Clear</a>
                <?php endif; ?>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead class="bg-slate-50 border-b border-slate-200 uppercase font-black text-slate-500">
                        <tr>
                            <th class="px-6 py-3.5">Candidate Name</th>
                            <th class="px-6 py-3.5">Matric / JAMB ID</th>
                            <th class="px-6 py-3.5">Department</th>
                            <th class="px-6 py-3.5">Contact Phone</th>
                            <th class="px-6 py-3.5">Bank Account (Cash Prize Disbursement)</th>
                            <th class="px-6 py-3.5 text-center">Tests Taken</th>
                            <th class="px-6 py-3.5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <?php if (empty($students)): ?>
                        <tr><td colspan="7" class="py-8 text-center text-slate-400">No candidates match the specified filter.</td></tr>
                        <?php else: ?>
                        <?php foreach ($students as $st): ?>
                        <tr class="hover:bg-slate-50/70 transition-colors">
                            <td class="px-6 py-4 font-bold text-slate-900"><?= htmlspecialchars($st['name']) ?></td>
                            <td class="px-6 py-4 font-mono font-bold text-indigo-700"><?= htmlspecialchars($st['matric_no']) ?></td>
                            <td class="px-6 py-4 text-slate-700 font-medium"><?= htmlspecialchars($st['department']) ?></td>
                            <td class="px-6 py-4 font-mono text-slate-500"><?= htmlspecialchars($st['phone'] ?: '—') ?></td>
                            <td class="px-6 py-4">
                                <?php if (!empty($st['account_number'])): ?>
                                    <div class="space-y-0.5">
                                        <div class="flex items-center gap-1.5">
                                            <span class="font-mono font-black text-slate-900 tracking-wider"><?= htmlspecialchars($st['account_number']) ?></span>
                                            <button type="button" onclick="copyToClipboard('<?= htmlspecialchars($st['account_number']) ?>', this)" class="text-slate-400 hover:text-indigo-600 transition-colors" title="Copy Account Number">
                                                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                                            </button>
                                        </div>
                                        <div class="text-[11px] text-indigo-700 font-bold"><?= htmlspecialchars($st['bank'] ?? '') ?></div>
                                        <div class="text-[10px] text-slate-500 font-medium"><?= htmlspecialchars($st['account_name'] ?? '') ?></div>
                                    </div>
                                <?php else: ?>
                                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                        <i data-lucide="clock" class="w-3 h-3"></i> Pending Link
                                    </span>
                                <?php endif; ?>
                            </td>
                            <td class="px-6 py-4 text-center font-bold text-slate-800">
                                <span class="px-2 py-0.5 rounded-lg bg-slate-100"><?= (int)$st['tests_count'] ?></span>
                            </td>
                            <td class="px-6 py-4 text-right">
                                <div class="flex items-center justify-end gap-1.5">
                                    <!-- Reset Password to Default -->
                                    <form method="POST" action="admin_dashboard.php" class="inline" onsubmit="return confirm('Reset password for <?= htmlspecialchars($st['name']) ?> to default (premed2026)?')">
                                        <input type="hidden" name="action" value="reset_student_password">
                                        <input type="hidden" name="student_id" value="<?= htmlspecialchars($st['id']) ?>">
                                        <button type="submit" class="px-2.5 py-1 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-[11px]" title="Reset password to premed2026">
                                            Reset Pass
                                        </button>
                                    </form>

                                    <!-- Delete Candidate -->
                                    <form method="POST" action="admin_dashboard.php" class="inline" onsubmit="return confirm('Delete candidate <?= htmlspecialchars($st['name']) ?> permanently?')">
                                        <input type="hidden" name="action" value="delete_student">
                                        <input type="hidden" name="student_id" value="<?= htmlspecialchars($st['id']) ?>">
                                        <button type="submit" class="p-1 rounded-xl text-rose-500 hover:bg-rose-50" title="Delete Candidate">
                                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                        </button>
                                    </form>
                                </div>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

    </div>
    <?php endif; ?>

    <!-- ========================================================================= -->
    <!-- TAB 5: INTEGRITY & PROCTORING LIVE MONITOR                               -->
    <!-- ========================================================================= -->
    <?php if ($tab === 'proctoring'): ?>
    <div class="space-y-6">

        <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-base font-black text-slate-900 flex items-center gap-2">
                        <i data-lucide="shield-alert" class="w-5 h-5 text-indigo-600"></i>
                        <span>Live Exam Proctoring Surveillance &amp; Infraction Logs</span>
                    </h2>
                    <p class="text-xs text-slate-500 mt-0.5">Real-time candidate focus monitoring, tab switch infractions, and anti-cheating tracking.</p>
                </div>
                <button type="button" onclick="window.location.reload()" class="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center gap-1.5">
                    <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
                    <span>Refresh Feed</span>
                </button>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead class="bg-slate-50 border-b border-slate-200 uppercase font-black text-slate-500">
                        <tr>
                            <th class="px-6 py-3.5">Candidate</th>
                            <th class="px-6 py-3.5">Matric No</th>
                            <th class="px-6 py-3.5">Assessment</th>
                            <th class="px-6 py-3.5 text-center">Session Status</th>
                            <th class="px-6 py-3.5 text-center">Tab Switches</th>
                            <th class="px-6 py-3.5 text-center">Infraction Level</th>
                            <th class="px-6 py-3.5 text-right">Last Ping</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <?php if (empty($proctorSessions)): ?>
                        <tr><td colspan="7" class="py-12 text-center text-slate-400">No active exam sessions currently in progress.</td></tr>
                        <?php else: ?>
                        <?php foreach ($proctorSessions as $sess): ?>
                        <tr class="hover:bg-slate-50/70 transition-colors">
                            <td class="px-6 py-3.5 font-bold text-slate-900"><?= htmlspecialchars($sess['student_name'] ?? 'Candidate') ?></td>
                            <td class="px-6 py-3.5 font-mono text-slate-600"><?= htmlspecialchars($sess['matric_no'] ?? '') ?></td>
                            <td class="px-6 py-3.5 font-bold text-indigo-700"><?= htmlspecialchars($sess['course_code'] ?? '') ?></td>
                            <td class="px-6 py-3.5 text-center">
                                <span class="px-2.5 py-0.5 rounded-full font-bold text-[10px] <?= $sess['status'] === 'IN_PROGRESS' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600' ?>">
                                    <?= htmlspecialchars($sess['status']) ?>
                                </span>
                            </td>
                            <td class="px-6 py-3.5 text-center font-mono font-bold text-slate-900">
                                <?= (int)($sess['tab_switches'] ?? 0) ?>
                            </td>
                            <td class="px-6 py-3.5 text-center">
                                <?php $sw = (int)($sess['tab_switches'] ?? 0); ?>
                                <?php if ($sw >= 4): ?>
                                    <span class="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-black text-[10px]">CRITICAL VIOLATION</span>
                                <?php elseif ($sw >= 2): ?>
                                    <span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">SUSPICIOUS (<?= $sw ?>)</span>
                                <?php else: ?>
                                    <span class="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">NORMAL</span>
                                <?php endif; ?>
                            </td>
                            <td class="px-6 py-3.5 text-right font-mono text-slate-400 text-[11px]">
                                <?= htmlspecialchars($sess['updated_at'] ?? '') ?>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

    </div>
    <?php endif; ?>

</div>

<!-- ========================================================================= -->
<!-- MODAL: EDIT COURSE PARAMETERS                                            -->
<!-- ========================================================================= -->
<div id="editCourseModal" class="hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-4 shadow-2xl border border-slate-200">
        <div class="flex items-center justify-between">
            <h3 class="text-sm font-black text-slate-900 flex items-center gap-2">
                <i data-lucide="settings" class="w-4 h-4 text-indigo-600"></i>
                <span>Edit Assessment Parameters</span>
            </h3>
            <button type="button" onclick="closeEditCourseModal()" class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-4 h-4"></i></button>
        </div>

        <form method="POST" action="admin_dashboard.php" class="space-y-4">
            <input type="hidden" name="action" value="update_course">
            <input type="hidden" name="course_id" id="editCourseId">

            <div>
                <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Course Code</label>
                <input type="text" name="code" id="editCourseCode" required class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono uppercase">
            </div>

            <div>
                <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Course Title</label>
                <input type="text" name="title" id="editCourseTitle" required class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs">
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Duration (Mins)</label>
                    <input type="number" name="duration" id="editCourseDuration" required min="5" max="300" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono">
                </div>
                <div>
                    <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Question Limit</label>
                    <input type="number" name="question_limit" id="editCourseLimit" required min="5" max="300" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono">
                </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-2">
                <button type="button" onclick="closeEditCourseModal()" class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">Cancel</button>
                <button type="submit" class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">Save Changes</button>
            </div>
        </form>
    </div>
</div>

<!-- ========================================================================= -->
<!-- MODAL: EDIT QUESTION                                                     -->
<!-- ========================================================================= -->
<div id="editQuestionModal" class="hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="relative bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between">
            <h3 class="text-sm font-black text-slate-900 flex items-center gap-2">
                <i data-lucide="edit-3" class="w-4 h-4 text-indigo-600"></i>
                <span>Edit Question Details</span>
            </h3>
            <button type="button" onclick="closeEditQuestionModal()" class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-4 h-4"></i></button>
        </div>

        <form method="POST" action="admin_dashboard.php" class="space-y-3.5">
            <input type="hidden" name="action" value="edit_question">
            <input type="hidden" name="question_id" id="editQuestionId">

            <div>
                <label class="block text-[11px] font-bold text-slate-600 uppercase mb-1">Question Prompt</label>
                <textarea name="text" id="editQuestionText" required rows="3" class="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"></textarea>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">Option A</label>
                    <input type="text" name="a" id="editQuestionA" required class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs">
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">Option B</label>
                    <input type="text" name="b" id="editQuestionB" required class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs">
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">Option C</label>
                    <input type="text" name="c" id="editQuestionC" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs">
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">Option D</label>
                    <input type="text" name="d" id="editQuestionD" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs">
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">Correct Key</label>
                    <select name="correct_option" id="editQuestionCorrect" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-black text-indigo-700 bg-white">
                        <option value="A">Option A</option>
                        <option value="B">Option B</option>
                        <option value="C">Option C</option>
                        <option value="D">Option D</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">Clinical Rationale</label>
                    <input type="text" name="explanation" id="editQuestionExplanation" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs">
                </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-2">
                <button type="button" onclick="closeEditQuestionModal()" class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">Cancel</button>
                <button type="submit" class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">Save Question</button>
            </div>
        </form>
    </div>
</div>

<script>
function copyToClipboard(text, btn) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5 text-emerald-600"></i>';
            if (window.lucide) lucide.createIcons();
            setTimeout(() => {
                btn.innerHTML = originalHtml;
                if (window.lucide) lucide.createIcons();
            }, 2000);
        });
    }
}

function openEditCourseModal(c) {
    document.getElementById('editCourseId').value = c.id;
    document.getElementById('editCourseCode').value = c.code;
    document.getElementById('editCourseTitle').value = c.title;
    document.getElementById('editCourseDuration').value = c.duration;
    document.getElementById('editCourseLimit').value = c.question_limit;
    document.getElementById('editCourseModal').classList.remove('hidden');
}

function closeEditCourseModal() {
    document.getElementById('editCourseModal').classList.add('hidden');
}

function openEditQuestionModal(q) {
    document.getElementById('editQuestionId').value = q.id;
    document.getElementById('editQuestionText').value = q.text;
    document.getElementById('editQuestionA').value = q.a;
    document.getElementById('editQuestionB').value = q.b;
    document.getElementById('editQuestionC').value = q.c || '';
    document.getElementById('editQuestionD').value = q.d || '';
    document.getElementById('editQuestionCorrect').value = q.correct_option;
    document.getElementById('editQuestionExplanation').value = q.explanation || '';
    document.getElementById('editQuestionModal').classList.remove('hidden');
}

function closeEditQuestionModal() {
    document.getElementById('editQuestionModal').classList.add('hidden');
}

function loadSampleCsv() {
    const sample = `Which cranial nerve is primarily responsible for sensory innervation of the anterior two-thirds of the tongue?,Facial Nerve (CN VII),Trigeminal Nerve (CN V3),Glossopharyngeal Nerve (CN IX),Hypoglossal Nerve (CN XII),B,The lingual branch of CN V3 provides general sensation while chorda tympani of CN VII carries taste.
What is the standard adult glomerular filtration rate (GFR)?,60 mL/min,90-120 mL/min,150 mL/min,40 mL/min,B,Normal resting adult GFR ranges between 90 and 120 mL/min per 1.73m2.`;
    document.getElementById('bulkTextarea').value = sample;
}

function loadSampleJson() {
    const sample = JSON.stringify([
        {
            "text": "What is the primary buffer system in human arterial extracellular fluid?",
            "a": "Phosphate buffer system",
            "b": "Bicarbonate-carbonic acid buffer system",
            "c": "Protein and hemoglobin buffer system",
            "d": "Ammonia buffer system",
            "correct": "B",
            "explanation": "The carbonic acid-bicarbonate buffer system is the primary extracellular buffer controlling physiological blood pH (7.35-7.45)."
        }
    ], null, 2);
    document.getElementById('bulkTextarea').value = sample;
}

document.addEventListener('DOMContentLoaded', function() {
    if (window.lucide) {
        lucide.createIcons();
    }
});
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
