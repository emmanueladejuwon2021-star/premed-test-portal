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

/**
 * Smart MCQ Question Parser
 * Supports:
 * 1. Natural Question Text (Word / PDF / WhatsApp / ChatGPT copy-paste):
 *    - Numbered ("1.", "1)", "**1**", "Q1.", etc.) or unnumbered questions
 *    - Option markers: A., B., C., D. or (A), (B), [A], Option A:
 *    - Answer keys: "Answer: A", "**Answer: A.**", "Ans: B", "Correct: C", "Key: D"
 *    - Solutions: "Explanation: ...", "Solution: ...", "Rationale: ..." or text following Answer
 * 2. Standard CSV / TSV format
 * 3. JSON format
 */
function parse_smart_questions(string $rawPayload): array {
    $rawPayload = trim($rawPayload);
    if (empty($rawPayload)) return [];

    // 1. JSON Array check
    $jsonData = json_decode($rawPayload, true);
    if (is_array($jsonData)) {
        $parsed = [];
        foreach ($jsonData as $item) {
            $qText = trim($item['text'] ?? $item['question'] ?? $item['prompt'] ?? '');
            $qA = trim($item['a'] ?? $item['option_a'] ?? $item['opt_a'] ?? '');
            $qB = trim($item['b'] ?? $item['option_b'] ?? $item['opt_b'] ?? '');
            $qC = trim($item['c'] ?? $item['option_c'] ?? $item['opt_c'] ?? '');
            $qD = trim($item['d'] ?? $item['option_d'] ?? $item['opt_d'] ?? '');
            $qAns = strtoupper(trim($item['correct'] ?? $item['correct_option'] ?? $item['answer'] ?? 'A'));
            $qExp = trim($item['explanation'] ?? $item['solution'] ?? $item['rationale'] ?? '');

            if (!empty($qText) && !empty($qA) && !empty($qB)) {
                $parsed[] = [
                    'text' => $qText,
                    'a' => $qA,
                    'b' => $qB,
                    'c' => $qC,
                    'd' => $qD,
                    'correct_option' => in_array($qAns, ['A', 'B', 'C', 'D']) ? $qAns : 'A',
                    'explanation' => $qExp
                ];
            }
        }
        if (!empty($parsed)) return $parsed;
    }

    // 2. Smart Natural Text Parser (State Machine)
    $lines = preg_split("/\r\n|\n|\r/", $rawPayload);
    $questions = [];
    $current = null;
    $state = 'IDLE';

    $finalizeCurrent = function() use (&$questions, &$current) {
        if ($current && !empty(trim($current['text'])) && !empty(trim($current['a'])) && !empty(trim($current['b']))) {
            $cleanText = preg_replace('/^\s*(?:\*\*)?(?:Question\s*|Q\s*)?\d+[\.\)\]\:]?(?:\s*\[[^\]]+\])?(?:\*\*)?\s*/i', '', trim($current['text']));
            if (empty($cleanText)) {
                $cleanText = trim($current['text']);
            }
            $ans = strtoupper(trim($current['correct_option'] ?: 'A'));
            if (!in_array($ans, ['A', 'B', 'C', 'D'])) $ans = 'A';

            $questions[] = [
                'text' => $cleanText,
                'a' => trim($current['a']),
                'b' => trim($current['b']),
                'c' => trim($current['c']),
                'd' => trim($current['d']),
                'correct_option' => $ans,
                'explanation' => trim($current['explanation'])
            ];
        }
        $current = null;
    };

    foreach ($lines as $line) {
        $trimmed = trim($line);
        if ($trimmed === '') {
            if ($current) {
                if ($state === 'IN_PROMPT') {
                    $current['text'] .= "\n";
                } elseif ($state === 'IN_EXPLANATION') {
                    $current['explanation'] .= "\n";
                }
            }
            continue;
        }

        // Detect New Question Number: "1.", "1)", "**1**", "Q1.", "Question 1:", "**1 [revised]**"
        if (preg_match('/^\s*(?:\*\*)?(?:Question\s*|Q\s*)?(\d+)[\.\)\]\:]?(?:\s*\[[^\]]+\])?(?:\*\*)?\s+(.*)$/i', $trimmed, $m)
            && ($state === 'IN_EXPLANATION' || $state === 'IDLE' || ($state !== 'IN_PROMPT' && !empty($current['correct_option'])))) {
            $finalizeCurrent();
            $state = 'IN_PROMPT';
            $current = [
                'text' => $m[2],
                'a' => '',
                'b' => '',
                'c' => '',
                'd' => '',
                'correct_option' => '',
                'explanation' => ''
            ];
            continue;
        }

        // Detect Options: A., B., C., D. (also handles (A), A), **A.**, Option A:, etc.)
        if (preg_match('/^\s*(?:\*\*)?(?:\(?([A-D])[\.\)\:\]]|\bOption\s*([A-D])\:?)(?:\*\*)?\s*(.*)$/i', $trimmed, $optMatch)) {
            $optLetter = strtoupper($optMatch[1] ?: $optMatch[2]);
            $optContent = $optMatch[3];

            if ($current === null) {
                $state = 'IN_PROMPT';
                $current = ['text' => 'Question', 'a' => '', 'b' => '', 'c' => '', 'd' => '', 'correct_option' => '', 'explanation' => ''];
            }

            if ($optLetter === 'A') {
                $state = 'IN_OPT_A';
                $current['a'] = $optContent;
                continue;
            } elseif ($optLetter === 'B') {
                $state = 'IN_OPT_B';
                $current['b'] = $optContent;
                continue;
            } elseif ($optLetter === 'C') {
                $state = 'IN_OPT_C';
                $current['c'] = $optContent;
                continue;
            } elseif ($optLetter === 'D') {
                $state = 'IN_OPT_D';
                $current['d'] = $optContent;
                continue;
            }
        }

        // Detect Answer / Key Line: "Answer: A.", "**Answer: B.**", "Ans: C", "Correct: D", "Key: A"
        if (preg_match('/^\s*(?:\*\*)?(?:Answer|Ans|Correct(?:\s*Option)?|Key)\s*[\:\-\.]?\s*(?:\*\*)?\s*\(?([A-D])\)?(?:\.|\b)(?:\*\*)?(.*)$/i', $trimmed, $ansMatch)) {
            if ($current === null) {
                $current = ['text' => 'Question', 'a' => '', 'b' => '', 'c' => '', 'd' => '', 'correct_option' => '', 'explanation' => ''];
            }
            $current['correct_option'] = strtoupper($ansMatch[1]);
            $state = 'IN_EXPLANATION';
            $trail = trim($ansMatch[2] ?? '');
            if (!empty($trail)) {
                $current['explanation'] .= ($current['explanation'] ? "\n" : "") . $trail;
            }
            continue;
        }

        // Detect Explanation Header: "Explanation: ...", "Solution: ...", "Rationale: ..."
        if (preg_match('/^\s*(?:\*\*)?(?:Explanation|Solution|Rationale|Reason)\s*[\:\-]\s*(?:\*\*)?(.*)$/i', $trimmed, $expMatch)) {
            $state = 'IN_EXPLANATION';
            if ($current) {
                $current['explanation'] .= ($current['explanation'] ? "\n" : "") . trim($expMatch[1]);
            }
            continue;
        }

        // Append to current state
        if ($current) {
            if ($state === 'IN_PROMPT') {
                $current['text'] .= ($current['text'] ? "\n" : "") . $trimmed;
            } elseif ($state === 'IN_OPT_A') {
                $current['a'] .= ($current['a'] ? " " : "") . $trimmed;
            } elseif ($state === 'IN_OPT_B') {
                $current['b'] .= ($current['b'] ? " " : "") . $trimmed;
            } elseif ($state === 'IN_OPT_C') {
                $current['c'] .= ($current['c'] ? " " : "") . $trimmed;
            } elseif ($state === 'IN_OPT_D') {
                $current['d'] .= ($current['d'] ? " " : "") . $trimmed;
            } elseif ($state === 'IN_EXPLANATION') {
                $current['explanation'] .= ($current['explanation'] ? "\n" : "") . $trimmed;
            }
        } else {
            $state = 'IN_PROMPT';
            $current = [
                'text' => $trimmed,
                'a' => '',
                'b' => '',
                'c' => '',
                'd' => '',
                'correct_option' => '',
                'explanation' => ''
            ];
        }
    }
    $finalizeCurrent();

    if (!empty($questions)) {
        return $questions;
    }

    // 3. Fallback CSV Parser
    $csvQuestions = [];
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || str_starts_with($line, '#')) continue;
        $row = str_getcsv($line);
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
                $csvQuestions[] = [
                    'text' => $qText,
                    'a' => $qA,
                    'b' => $qB,
                    'c' => $qC,
                    'd' => $qD,
                    'correct_option' => $qAns,
                    'explanation' => $qExp
                ];
            }
        }
    }

    return $csvQuestions;
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

    // 4b. Add New Topic to Subject
    if ($action === 'add_topic') {
        $courseId = $_POST['course_id'] ?? '';
        $name = trim($_POST['name'] ?? '');
        if (empty($courseId) || empty($name)) {
            $feedbackError = "Both Subject and Topic Name are required.";
        } else {
            try {
                $tid = 'topic_' . bin2hex(random_bytes(6));
                $db->prepare("INSERT INTO topics (id, course_id, name, question_count) VALUES (?, ?, ?, 0)")->execute([$tid, $courseId, $name]);
                header("Location: admin_dashboard.php?tab=deployments&msg=" . urlencode("Topic '{$name}' created successfully!"));
                exit;
            } catch (Exception $e) {
                $feedbackError = "Failed to create topic: " . $e->getMessage();
            }
        }
    }

    // 4c. Update / Rename Existing Topic
    if ($action === 'update_topic') {
        $topicId = $_POST['topic_id'] ?? '';
        $name = trim($_POST['name'] ?? '');
        if (empty($topicId) || empty($name)) {
            $feedbackError = "Topic name cannot be empty.";
        } else {
            try {
                $db->prepare("UPDATE topics SET name = ? WHERE id = ?")->execute([$name, $topicId]);
                header("Location: admin_dashboard.php?tab=deployments&msg=" . urlencode("Topic renamed to '{$name}'!"));
                exit;
            } catch (Exception $e) {
                $feedbackError = "Failed to update topic: " . $e->getMessage();
            }
        }
    }

    // 4d. Delete Topic (Re-assigns or cleans up questions safely)
    if ($action === 'delete_topic') {
        $topicId = $_POST['topic_id'] ?? '';
        try {
            $tStmt = $db->prepare("SELECT course_id, name FROM topics WHERE id = ?");
            $tStmt->execute([$topicId]);
            $topic = $tStmt->fetch();
            if ($topic) {
                $courseId = $topic['course_id'];
                $otherStmt = $db->prepare("SELECT id FROM topics WHERE course_id = ? AND id != ? LIMIT 1");
                $otherStmt->execute([$courseId, $topicId]);
                $other = $otherStmt->fetch();

                if ($other) {
                    $db->prepare("UPDATE questions SET topic_id = ? WHERE topic_id = ?")->execute([$other['id'], $topicId]);
                } else {
                    $db->prepare("DELETE FROM questions WHERE topic_id = ?")->execute([$topicId]);
                }
                $db->prepare("DELETE FROM topics WHERE id = ?")->execute([$topicId]);
                header("Location: admin_dashboard.php?tab=deployments&msg=" . urlencode("Topic '{$topic['name']}' deleted."));
                exit;
            }
        } catch (Exception $e) {
            $feedbackError = "Failed to delete topic: " . $e->getMessage();
        }
    }

    // 5. Add Single Question (Supports Topic & Past vs Test Bank Type)
    if ($action === 'add_question') {
        $courseId = $_POST['course_id'] ?? '';
        $topicId = $_POST['topic_id'] ?? '';
        $newTopicName = trim($_POST['new_topic_name'] ?? '');
        $bankType = ($_POST['bank_type'] ?? '') === 'test' ? 'test' : 'past';
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
                // If admin typed a new topic on the fly, create it
                if (!empty($newTopicName)) {
                    $topicId = 'topic_' . bin2hex(random_bytes(6));
                    $db->prepare("INSERT INTO topics (id, course_id, name, question_count) VALUES (?, ?, ?, 0)")->execute([$topicId, $courseId, $newTopicName]);
                } elseif (empty($topicId)) {
                    $tStmt = $db->prepare("SELECT id FROM topics WHERE course_id = ? LIMIT 1");
                    $tStmt->execute([$courseId]);
                    $topic = $tStmt->fetch();
                    $topicId = $topic ? $topic['id'] : null;

                    if (!$topicId) {
                        $topicId = 'topic_' . bin2hex(random_bytes(6));
                        $db->prepare("INSERT INTO topics (id, course_id, name, question_count) VALUES (?, ?, 'General Curriculum', 0)")->execute([$topicId, $courseId]);
                    }
                }

                $qid = 'q_' . bin2hex(random_bytes(8));
                $ins = $db->prepare("INSERT INTO questions (id, topic_id, text, a, b, c, d, correct_option, explanation, bank_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $ins->execute([$qid, $topicId, $text, $optA, $optB, $optC, $optD, $correct, $explanation, $bankType]);

                // Update topic count
                $cnt = $db->prepare("SELECT COUNT(*) FROM questions WHERE topic_id = ?");
                $cnt->execute([$topicId]);
                $totalQ = (int)$cnt->fetchColumn();
                $db->prepare("UPDATE topics SET question_count = ? WHERE id = ?")->execute([$totalQ, $topicId]);

                $bankName = $bankType === 'test' ? 'Test Question Bank' : 'Past Question Bank';
                header("Location: admin_dashboard.php?tab=questions&bank_type={$bankType}&filter_course=" . urlencode($courseId) . "&msg=" . urlencode("Question added successfully to {$bankName}!"));
                exit;
            } catch (Exception $e) {
                $feedbackError = "Failed to add question: " . $e->getMessage();
            }
        }
    }

    // 6. Edit Existing Question (Supports Topic & Past vs Test Bank Type)
    if ($action === 'edit_question') {
        $qid = $_POST['question_id'] ?? '';
        $topicId = $_POST['topic_id'] ?? '';
        $bankType = ($_POST['bank_type'] ?? '') === 'test' ? 'test' : 'past';
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
                if (!empty($topicId)) {
                    $up = $db->prepare("UPDATE questions SET text = ?, a = ?, b = ?, c = ?, d = ?, correct_option = ?, explanation = ?, topic_id = ?, bank_type = ? WHERE id = ?");
                    $up->execute([$text, $optA, $optB, $optC, $optD, $correct, $explanation, $topicId, $bankType, $qid]);
                } else {
                    $up = $db->prepare("UPDATE questions SET text = ?, a = ?, b = ?, c = ?, d = ?, correct_option = ?, explanation = ?, bank_type = ? WHERE id = ?");
                    $up->execute([$text, $optA, $optB, $optC, $optD, $correct, $explanation, $bankType, $qid]);
                }
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

    // 7b. Fast 1-Click Move between Past and Test Question Bank
    if ($action === 'switch_bank_type') {
        $qid = $_POST['question_id'] ?? '';
        $targetType = ($_POST['target_type'] ?? '') === 'test' ? 'test' : 'past';
        try {
            $db->prepare("UPDATE questions SET bank_type = ? WHERE id = ?")->execute([$targetType, $qid]);
            $label = $targetType === 'test' ? 'Test Question Bank' : 'Past Question Bank';
            header("Location: admin_dashboard.php?tab=questions&bank_type={$targetType}&msg=" . urlencode("Question moved to {$label}!"));
            exit;
        } catch (Exception $e) {
            $feedbackError = "Failed to move question: " . $e->getMessage();
        }
    }

    // 8. Smart Bulk Import Questions (Natural Text, Word, PDF, CSV, or JSON)
    if ($action === 'bulk_import_questions') {
        $courseId = $_POST['course_id'] ?? '';
        $topicId = $_POST['topic_id'] ?? '';
        $newTopicName = trim($_POST['new_topic_name'] ?? '');
        $bankType = ($_POST['bank_type'] ?? '') === 'test' ? 'test' : 'past';
        $rawPayload = trim($_POST['raw_data'] ?? '');

        if (empty($courseId) || empty($rawPayload)) {
            $feedbackError = "Please select a target course and paste question text.";
        } else {
            try {
                // Ensure target topic exists or create on the fly
                if (!empty($newTopicName)) {
                    $topicId = 'topic_' . bin2hex(random_bytes(6));
                    $db->prepare("INSERT INTO topics (id, course_id, name, question_count) VALUES (?, ?, ?, 0)")->execute([$topicId, $courseId, $newTopicName]);
                } elseif (empty($topicId)) {
                    $tStmt = $db->prepare("SELECT id FROM topics WHERE course_id = ? ORDER BY id ASC LIMIT 1");
                    $tStmt->execute([$courseId]);
                    $topic = $tStmt->fetch();
                    $topicId = $topic ? $topic['id'] : null;

                    if (!$topicId) {
                        $topicId = 'topic_' . bin2hex(random_bytes(6));
                        $db->prepare("INSERT INTO topics (id, course_id, name, question_count) VALUES (?, ?, 'General Curriculum', 0)")->execute([$topicId, $courseId]);
                    }
                }

                $parsedList = parse_smart_questions($rawPayload);

                if (empty($parsedList)) {
                    $feedbackError = "Could not detect any questions. Please check the sample format provided below the text box.";
                } else {
                    $importedCount = 0;
                    $ins = $db->prepare("INSERT INTO questions (id, topic_id, text, a, b, c, d, correct_option, explanation, bank_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

                    foreach ($parsedList as $item) {
                        $qid = 'q_' . bin2hex(random_bytes(8));
                        $ins->execute([
                            $qid,
                            $topicId,
                            $item['text'],
                            $item['a'],
                            $item['b'],
                            $item['c'],
                            $item['d'],
                            $item['correct_option'],
                            $item['explanation'],
                            $bankType
                        ]);
                        $importedCount++;
                    }

                    // Update topic question count
                    $cnt = $db->prepare("SELECT COUNT(*) FROM questions WHERE topic_id = ?");
                    $cnt->execute([$topicId]);
                    $totalQ = (int)$cnt->fetchColumn();
                    $db->prepare("UPDATE topics SET question_count = ? WHERE id = ?")->execute([$totalQ, $topicId]);

                    $bankLabel = $bankType === 'test' ? 'Test Question Bank' : 'Past Question Bank';
                    header("Location: admin_dashboard.php?tab=questions&bank_type={$bankType}&filter_course=" . urlencode($courseId) . "&msg=" . urlencode("Successfully parsed and imported {$importedCount} questions into {$bankLabel}!"));
                    exit;
                }
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

// Top Statistics & Question Bank Counts
$totalQuestions = (int)$db->query("SELECT COUNT(*) FROM questions")->fetchColumn();
$totalPastQuestions = (int)$db->query("SELECT COUNT(*) FROM questions WHERE bank_type = 'past' OR bank_type IS NULL OR bank_type = ''")->fetchColumn();
$totalTestQuestions = (int)$db->query("SELECT COUNT(*) FROM questions WHERE bank_type = 'test'")->fetchColumn();

$totalStudents = (int)$db->query("SELECT COUNT(*) FROM students")->fetchColumn();
$studentsWithBank = (int)$db->query("SELECT COUNT(*) FROM students WHERE account_number IS NOT NULL AND TRIM(account_number) != ''")->fetchColumn();
$bankPct = $totalStudents > 0 ? round(($studentsWithBank / $totalStudents) * 100) : 0;

$totalResults = (int)$db->query("SELECT COUNT(*) FROM results")->fetchColumn();
$avgScore = (float)$db->query("SELECT COALESCE(AVG(percentage), 0) FROM results")->fetchColumn();
$totalCourses = (int)$db->query("SELECT COUNT(*) FROM courses")->fetchColumn();
$activeUnlockedCourses = (int)$db->query("SELECT COUNT(*) FROM courses WHERE is_locked = 0")->fetchColumn();

// 1. All Courses with Single Source of Truth live Question & Topic Breakdown
$courses = getCourseListWithCounts($db);
foreach ($courses as &$c) {
    $c['q_count'] = $c['questions_count'];
}
unset($c);

// 1b. Fetch all Topics with Single Source of Truth live breakdown
$allTopics = getTopicListWithCounts($db);
foreach ($allTopics as &$top) {
    $top['total_q_count'] = $top['questions_count'];
}
unset($top);

$topicsByCourse = [];
foreach ($allTopics as $top) {
    $topicsByCourse[$top['course_id']][] = $top;
}

// 2. Question Bank Query with filtering (Course, Topic, Bank Type, Keyword)
$selectedCourseFilter = $_GET['filter_course'] ?? '';
$selectedTopicFilter = $_GET['filter_topic'] ?? '';
$selectedBankType = $_GET['bank_type'] ?? ''; // '', 'past', 'test'
$searchQuestionKeyword = trim($_GET['q_search'] ?? '');

$qSql = "
    SELECT q.*, c.id as course_id, c.code as course_code, c.title as course_title, t.id as topic_id, t.name as topic_name
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
if (!empty($selectedTopicFilter)) {
    $qSql .= " AND q.topic_id = ? ";
    $qParams[] = $selectedTopicFilter;
}
if ($selectedBankType === 'past') {
    $qSql .= " AND (q.bank_type = 'past' OR q.bank_type IS NULL OR q.bank_type = '') ";
} elseif ($selectedBankType === 'test') {
    $qSql .= " AND q.bank_type = 'test' ";
}
if (!empty($searchQuestionKeyword)) {
    $qSql .= " AND (q.text LIKE ? OR q.explanation LIKE ?) ";
    $qParams[] = '%' . $searchQuestionKeyword . '%';
    $qParams[] = '%' . $searchQuestionKeyword . '%';
}

$qSql .= " ORDER BY q.created_at DESC LIMIT 150";
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

    <!-- 3. Non-Technical Faculty 1-Click Action Bar & Quick Guide -->
    <div class="bg-gradient-to-r from-teal-900 via-indigo-900 to-slate-900 rounded-3xl p-5 text-white shadow-md border border-teal-800/40 space-y-4">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 font-bold text-[10px] uppercase tracking-wider">
                    <i data-lucide="sparkles" class="w-3 h-3 text-emerald-400"></i>
                    <span>Quick Faculty Hub &bull; Non-Technical Friendly</span>
                </span>
                <h2 class="text-sm sm:text-base font-black tracking-tight text-white mt-1">What would you like to do?</h2>
                <p class="text-xs text-slate-300">Fast 1-click buttons for daily exam and prize operations without dealing with technical settings.</p>
            </div>
            <button type="button" onclick="document.getElementById('facultyHelpGuide').classList.toggle('hidden')" class="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-teal-200 transition-all flex items-center gap-1.5">
                <i data-lucide="help-circle" class="w-4 h-4 text-teal-300"></i>
                <span>Open Beginner's Guide</span>
            </button>
        </div>

        <!-- 4 Primary Quick Action Buttons -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <!-- 1. Download Prize Money Sheet -->
            <a href="?export=prizes_csv" class="p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 transition-all flex items-center gap-3 group">
                <div class="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                    <i data-lucide="banknote" class="w-5 h-5"></i>
                </div>
                <div>
                    <span class="text-xs font-black text-white block">Download Prize Excel</span>
                    <span class="text-[10px] text-emerald-200">Bank accounts for cash payouts</span>
                </div>
            </a>

            <!-- 2. Download Exam Scores -->
            <a href="?export=gradebook_csv" class="p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 transition-all flex items-center gap-3 group">
                <div class="w-10 h-10 rounded-xl bg-violet-500 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                    <i data-lucide="file-spreadsheet" class="w-5 h-5"></i>
                </div>
                <div>
                    <span class="text-xs font-black text-white block">Download Gradebook</span>
                    <span class="text-[10px] text-violet-200">All student marks &amp; percentages</span>
                </div>
            </a>

            <!-- 3. Add a New Question -->
            <a href="?tab=questions#authorSection" class="p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 transition-all flex items-center gap-3 group">
                <div class="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                    <i data-lucide="plus-circle" class="w-5 h-5"></i>
                </div>
                <div>
                    <span class="text-xs font-black text-white block">Add a Question</span>
                    <span class="text-[10px] text-indigo-200">Author questions with 4 choices</span>
                </div>
            </a>

            <!-- 4. Turn Exams On / Off -->
            <a href="?tab=deployments" class="p-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 transition-all flex items-center gap-3 group">
                <div class="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                    <i data-lucide="toggle-right" class="w-5 h-5"></i>
                </div>
                <div>
                    <span class="text-xs font-black text-white block">Turn Exams On / Off</span>
                    <span class="text-[10px] text-amber-200">Control student exam access</span>
                </div>
            </a>
        </div>

        <!-- Expandable Non-Tech Explanation Card -->
        <div id="facultyHelpGuide" class="hidden bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-teal-500/30 space-y-3 animate-in fade-in text-xs">
            <div class="flex items-center justify-between border-b border-white/10 pb-2">
                <span class="font-black text-teal-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <i data-lucide="book-open" class="w-4 h-4"></i>
                    <span>Simple Plain-English Guide for Faculty &amp; Coordinators</span>
                </span>
                <button type="button" onclick="document.getElementById('facultyHelpGuide').classList.add('hidden')" class="text-slate-400 hover:text-white">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-slate-300">
                <div class="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <span class="font-bold text-emerald-400 block">1. Starting / Stopping Tests</span>
                    <p class="text-[11px] leading-relaxed">Go to <strong>Exams &amp; Sittings</strong>. When an exam shows <span class="text-emerald-300 font-bold">🟢 Live</span>, students can write it. If you want to pause it, simply click <strong>Pause Exam</strong>.</p>
                </div>
                <div class="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <span class="font-bold text-indigo-400 block">2. Adding Questions</span>
                    <p class="text-[11px] leading-relaxed">Go to <strong>Question Bank</strong>, select your subject, type the question, enter choices A, B, C, D, and pick the right answer. No coding required!</p>
                </div>
                <div class="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <span class="font-bold text-amber-400 block">3. Paying Cash Winners</span>
                    <p class="text-[11px] leading-relaxed">Click <strong>Download Prize Excel</strong> above. It gives you a clean spreadsheet containing each candidate's Bank Name, Account Number, and Verified Name for disbursement.</p>
                </div>
                <div class="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <span class="font-bold text-rose-400 block">4. Resetting a Password</span>
                    <p class="text-[11px] leading-relaxed">If a student forgot their password, go to <strong>Candidates</strong>, search their name, and click <strong>Reset Pass</strong>. Their password will instantly reset to <code class="bg-black/40 px-1 py-0.5 rounded text-white font-mono">premed2026</code>.</p>
                </div>
            </div>
        </div>
    </div>

    <!-- 4. Tabbed Navigation Bar -->
    <div class="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xs flex flex-wrap gap-1 text-xs font-bold">
        <a href="?tab=deployments" class="px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 <?= $tab === 'deployments' ? 'bg-indigo-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' ?>">
            <i data-lucide="layers" class="w-4 h-4"></i>
            <span>1. Exams &amp; Sittings</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] <?= $tab === 'deployments' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600' ?>"><?= count($courses) ?></span>
        </a>
        <a href="?tab=questions" class="px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 <?= $tab === 'questions' ? 'bg-indigo-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' ?>">
            <i data-lucide="file-question" class="w-4 h-4"></i>
            <span>2. Question Bank</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] <?= $tab === 'questions' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600' ?>"><?= $totalQuestions ?></span>
        </a>
        <a href="?tab=results" class="px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 <?= $tab === 'results' ? 'bg-indigo-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' ?>">
            <i data-lucide="graduation-cap" class="w-4 h-4"></i>
            <span>3. Scores &amp; Gradebook</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] <?= $tab === 'results' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600' ?>"><?= $totalResults ?></span>
        </a>
        <a href="?tab=students" class="px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 <?= $tab === 'students' ? 'bg-indigo-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' ?>">
            <i data-lucide="id-card" class="w-4 h-4"></i>
            <span>4. Candidates &amp; Cash Prizes</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] <?= $tab === 'students' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600' ?>"><?= $totalStudents ?></span>
        </a>
        <a href="?tab=proctoring" class="px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 <?= $tab === 'proctoring' ? 'bg-indigo-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' ?>">
            <i data-lucide="shield-alert" class="w-4 h-4"></i>
            <span>5. Live Exam Monitor</span>
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

        <!-- Assessments & Curriculum Topics Table -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 class="text-base font-black text-slate-900 flex items-center gap-2">
                        <i data-lucide="book-open" class="w-5 h-5 text-indigo-600"></i>
                        <span>Course &amp; Curriculum Topic Manager</span>
                    </h2>
                    <p class="text-xs text-slate-500 mt-0.5">Edit subject parameters, manage individual curriculum topics, monitor question allocations, and control live status.</p>
                </div>
                <div class="flex items-center gap-2">
                    <a href="?export=questions_csv" class="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-2">
                        <i data-lucide="download" class="w-4 h-4"></i>
                        <span>Export Entire Question Bank (CSV)</span>
                    </a>
                </div>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead class="bg-slate-50 border-b border-slate-200 uppercase font-black text-slate-500">
                        <tr>
                            <th class="px-5 py-3.5">Code</th>
                            <th class="px-5 py-3.5">Course Title</th>
                            <th class="px-5 py-3.5 text-center">Curriculum Topics</th>
                            <th class="px-5 py-3.5 text-center">Question Bank Allocation</th>
                            <th class="px-5 py-3.5 text-center">Duration</th>
                            <th class="px-5 py-3.5 text-center">Allotment</th>
                            <th class="px-5 py-3.5 text-center">Status</th>
                            <th class="px-5 py-3.5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <?php if (empty($courses)): ?>
                        <tr><td colspan="8" class="py-8 text-center text-slate-400">No courses configured yet.</td></tr>
                        <?php else: ?>
                        <?php foreach ($courses as $c): 
                            $cTopics = $topicsByCourse[$c['id']] ?? [];
                        ?>
                        <tr class="hover:bg-slate-50/70 transition-colors">
                            <td class="px-5 py-4 font-mono font-black text-indigo-700"><?= htmlspecialchars($c['code']) ?></td>
                            <td class="px-5 py-4 font-bold text-slate-900"><?= htmlspecialchars($c['title']) ?></td>
                            <td class="px-5 py-4 text-center">
                                <button type="button" onclick="openCourseTopicsModal(<?= htmlspecialchars(json_encode($c)) ?>)" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold text-xs transition-all shadow-xs" title="Click to view, add, or rename topics for this course">
                                    <i data-lucide="folder-tree" class="w-3.5 h-3.5 text-indigo-600"></i>
                                    <span><?= count($cTopics) ?> Topic<?= count($cTopics) === 1 ? '' : 's' ?></span>
                                    <span class="text-[10px] text-indigo-400 font-normal">Edit &rsaquo;</span>
                                </button>
                            </td>
                            <td class="px-5 py-4 text-center">
                                <div class="inline-flex flex-col items-center gap-1">
                                    <div class="flex items-center gap-1.5 text-[11px] font-bold">
                                        <a href="?tab=questions&bank_type=past&filter_course=<?= urlencode($c['id']) ?>" class="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors" title="View Past Questions for this course">
                                            📚 <?= (int)$c['past_q_count'] ?> Past
                                        </a>
                                        <a href="?tab=questions&bank_type=test&filter_course=<?= urlencode($c['id']) ?>" class="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100 transition-colors" title="View Test Questions for this course">
                                            ⏱️ <?= (int)$c['test_q_count'] ?> Test
                                        </a>
                                    </div>
                                    <span class="text-[10px] text-slate-400 font-medium">Total: <?= (int)$c['q_count'] ?> questions</span>
                                </div>
                            </td>
                            <td class="px-5 py-4 text-center font-mono font-bold text-slate-600"><?= (int)$c['duration'] ?>m</td>
                            <td class="px-5 py-4 text-center font-mono text-slate-600"><?= (int)$c['question_limit'] ?> / exam</td>
                            <td class="px-5 py-4 text-center">
                                <?php if ($c['is_locked']): ?>
                                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-700 font-bold text-[10px]">
                                    <i data-lucide="pause-circle" class="w-3 h-3 text-slate-500"></i>
                                    <span>Closed</span>
                                </span>
                                <?php else: ?>
                                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 font-black text-[10px]">
                                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span>🟢 LIVE</span>
                                </span>
                                <?php endif; ?>
                            </td>
                            <td class="px-5 py-4 text-right">
                                <div class="flex items-center justify-end gap-1.5">
                                    <!-- Manage Topics Button -->
                                    <button type="button" onclick="openCourseTopicsModal(<?= htmlspecialchars(json_encode($c)) ?>)" class="px-2.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all flex items-center gap-1" title="Manage Curriculum Topics">
                                        <i data-lucide="folder-plus" class="w-3.5 h-3.5"></i>
                                        <span>Topics</span>
                                    </button>

                                    <!-- Simple 1-Click Lock / Unlock Toggle -->
                                    <form method="POST" action="admin_dashboard.php" class="inline">
                                        <input type="hidden" name="action" value="toggle_lock">
                                        <input type="hidden" name="course_id" value="<?= htmlspecialchars($c['id']) ?>">
                                        <input type="hidden" name="current_locked" value="<?= (int)$c['is_locked'] ?>">
                                        <?php if ($c['is_locked']): ?>
                                        <button type="submit" class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition-all flex items-center gap-1" title="Make this exam available for students right now">
                                            <i data-lucide="play" class="w-3.5 h-3.5"></i>
                                            <span>Turn LIVE</span>
                                        </button>
                                        <?php else: ?>
                                        <button type="submit" class="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-xs transition-all flex items-center gap-1" title="Temporarily pause this exam from students">
                                            <i data-lucide="pause" class="w-3.5 h-3.5"></i>
                                            <span>Pause</span>
                                        </button>
                                        <?php endif; ?>
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
    <!-- TAB 2: QUESTION BANK & SMART BULK IMPORTER                               -->
    <!-- ========================================================================= -->
    <?php if ($tab === 'questions'): ?>
    <div class="space-y-6">

        <!-- Question Bank Type Switcher & Top Statistics -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a href="?tab=questions&filter_course=<?= urlencode($selectedCourseFilter) ?>" class="p-4 rounded-3xl border transition-all flex items-center justify-between <?= empty($selectedBankType) ? 'bg-white border-slate-900 shadow-md ring-2 ring-slate-900/10' : 'bg-white/80 border-slate-200 hover:border-slate-300' ?>">
                <div>
                    <span class="text-[10px] font-black uppercase tracking-wider text-slate-500 block">All Available Questions</span>
                    <span class="text-2xl font-black text-slate-900"><?= $totalQuestions ?></span>
                </div>
                <div class="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                    <i data-lucide="layers" class="w-5 h-5"></i>
                </div>
            </a>

            <a href="?tab=questions&bank_type=past&filter_course=<?= urlencode($selectedCourseFilter) ?>" class="p-4 rounded-3xl border transition-all flex items-center justify-between <?= $selectedBankType === 'past' ? 'bg-emerald-50/70 border-emerald-600 shadow-md ring-2 ring-emerald-500/20' : 'bg-white border-slate-200 hover:border-emerald-300' ?>">
                <div>
                    <span class="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">📚 Past Question Bank</span>
                    <span class="text-2xl font-black text-emerald-900"><?= $totalPastQuestions ?></span>
                    <span class="text-[10px] text-emerald-700 font-medium block mt-0.5">Used for student self-study &amp; practice</span>
                </div>
                <div class="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <i data-lucide="book-marked" class="w-5 h-5"></i>
                </div>
            </a>

            <a href="?tab=questions&bank_type=test&filter_course=<?= urlencode($selectedCourseFilter) ?>" class="p-4 rounded-3xl border transition-all flex items-center justify-between <?= $selectedBankType === 'test' ? 'bg-indigo-50/70 border-indigo-600 shadow-md ring-2 ring-indigo-500/20' : 'bg-white border-slate-200 hover:border-indigo-300' ?>">
                <div>
                    <span class="text-[10px] font-black uppercase tracking-wider text-indigo-800 block">⏱️ Test Question Bank</span>
                    <span class="text-2xl font-black text-indigo-900"><?= $totalTestQuestions ?></span>
                    <span class="text-[10px] text-indigo-700 font-medium block mt-0.5">Reserved for official timed CBT exams</span>
                </div>
                <div class="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                    <i data-lucide="timer" class="w-5 h-5"></i>
                </div>
            </a>
        </div>

        <!-- Filter Bar & Bulk Importer Trigger -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
            <form method="GET" action="admin_dashboard.php" class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <input type="hidden" name="tab" value="questions">
                <?php if (!empty($selectedBankType)): ?>
                <input type="hidden" name="bank_type" value="<?= htmlspecialchars($selectedBankType) ?>">
                <?php endif; ?>

                <!-- Subject Filter -->
                <select name="filter_course" onchange="this.form.submit()" class="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-bold text-slate-700">
                    <option value="">All Subjects (<?= $totalQuestions ?> Qs)</option>
                    <?php foreach ($courses as $c): ?>
                    <option value="<?= htmlspecialchars($c['id']) ?>" <?= $selectedCourseFilter === $c['id'] ? 'selected' : '' ?>>
                        <?= htmlspecialchars($c['code']) ?> (<?= (int)$c['q_count'] ?> Qs)
                    </option>
                    <?php endforeach; ?>
                </select>

                <!-- Topic Filter -->
                <select name="filter_topic" onchange="this.form.submit()" class="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-bold text-slate-700 max-w-[220px]">
                    <option value="">All Topics</option>
                    <?php 
                    $topicsToDisplay = !empty($selectedCourseFilter) ? ($topicsByCourse[$selectedCourseFilter] ?? []) : $allTopics;
                    foreach ($topicsToDisplay as $top): 
                    ?>
                    <option value="<?= htmlspecialchars($top['id']) ?>" <?= $selectedTopicFilter === $top['id'] ? 'selected' : '' ?>>
                        <?= htmlspecialchars($top['course_code']) ?>: <?= htmlspecialchars($top['name']) ?> (<?= (int)$top['total_q_count'] ?>)
                    </option>
                    <?php endforeach; ?>
                </select>

                <!-- Keyword Search -->
                <div class="relative flex-1 sm:w-56">
                    <input type="text" name="q_search" value="<?= htmlspecialchars($searchQuestionKeyword) ?>" placeholder="Search questions..." class="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs">
                    <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5"></i>
                </div>

                <button type="submit" class="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors">Filter</button>
                <?php if ($selectedCourseFilter || $selectedTopicFilter || $searchQuestionKeyword || $selectedBankType): ?>
                <a href="?tab=questions" class="text-xs text-rose-600 font-bold hover:underline px-1">Reset All</a>
                <?php endif; ?>
            </form>

            <div class="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                <button type="button" onclick="document.getElementById('bulkImportCard').classList.toggle('hidden')" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm shadow-indigo-200 transition-all">
                    <i data-lucide="upload-cloud" class="w-4 h-4"></i>
                    <span>Smart Bulk Importer</span>
                </button>
                <a href="?export=questions_csv" class="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center gap-1.5">
                    <i data-lucide="download" class="w-4 h-4"></i>
                    <span>Export</span>
                </a>
            </div>
        </div>

        <!-- ========================================================================= -->
        <!-- SMART BULK IMPORTER PANEL                                                -->
        <!-- ========================================================================= -->
        <div id="bulkImportCard" class="bg-white rounded-3xl p-6 sm:p-7 border-2 border-indigo-200 shadow-lg space-y-5 animate-in fade-in">
            <div class="flex items-start justify-between border-b border-indigo-100 pb-3">
                <div>
                    <h3 class="text-base font-black text-indigo-950 flex items-center gap-2">
                        <i data-lucide="sparkles" class="w-5 h-5 text-indigo-600"></i>
                        <span>Smart Bulk Question Parser &amp; Importer</span>
                    </h3>
                    <p class="text-xs text-slate-500 mt-1">Copy and paste questions directly from Microsoft Word, PDF documents, WhatsApp, or ChatGPT. The engine automatically detects questions, 4 options, answer keys, and full step-by-step explanations.</p>
                </div>
                <button type="button" onclick="document.getElementById('bulkImportCard').classList.add('hidden')" class="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <form method="POST" action="admin_dashboard.php" class="space-y-5">
                <input type="hidden" name="action" value="bulk_import_questions">

                <!-- 1. Selection Hierarchy: Subject & Topic -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div>
                        <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">1. Target Subject <span class="text-rose-500">*</span></label>
                        <select name="course_id" id="bulkCourseSelect" required onchange="onBulkCourseChange(this.value)" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500">
                            <option value="" disabled selected>-- Select Subject / Course --</option>
                            <?php foreach ($courses as $c): ?>
                            <option value="<?= htmlspecialchars($c['id']) ?>" <?= $selectedCourseFilter === $c['id'] ? 'selected' : '' ?>>
                                <?= htmlspecialchars($c['code']) ?> - <?= htmlspecialchars($c['title']) ?>
                            </option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">2. Target Topic <span class="text-rose-500">*</span></label>
                        <select name="topic_id" id="bulkTopicSelect" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500">
                            <option value="">-- Select an Existing Topic --</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Or Type New Topic Name</label>
                        <input type="text" name="new_topic_name" id="bulkNewTopicInput" placeholder="e.g. Physical Quantities & Dimensions" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500">
                        <span class="text-[10px] text-slate-400 mt-0.5 block">Leave empty to use the selected topic above</span>
                    </div>
                </div>

                <!-- 2. Choose Question Bank: Past Question Bank vs Test Question Bank -->
                <div class="space-y-1.5">
                    <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">3. Select Destination Question Bank Type <span class="text-rose-500">*</span></label>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label class="relative flex items-start gap-3 p-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 cursor-pointer hover:bg-emerald-50/80 transition-all has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50 shadow-xs">
                            <input type="radio" name="bank_type" value="past" checked class="mt-0.5 text-emerald-600 focus:ring-emerald-500">
                            <div>
                                <span class="block text-xs font-black text-emerald-950 flex items-center gap-1.5">
                                    <span>📚 Past Question Bank</span>
                                    <span class="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold">Recommended for Study</span>
                                </span>
                                <span class="block text-[11px] text-emerald-800/80 mt-0.5 leading-relaxed">
                                    Questions are placed in the student practice bank for self-paced revision with detailed answers and step-by-step explanations.
                                </span>
                            </div>
                        </label>

                        <label class="relative flex items-start gap-3 p-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 cursor-pointer hover:bg-indigo-50/80 transition-all has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-50 shadow-xs">
                            <input type="radio" name="bank_type" value="test" class="mt-0.5 text-indigo-600 focus:ring-indigo-500">
                            <div>
                                <span class="block text-xs font-black text-indigo-950 flex items-center gap-1.5">
                                    <span>⏱️ Test Question Bank</span>
                                    <span class="px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-900 text-[10px] font-bold">Official Exam CBT</span>
                                </span>
                                <span class="block text-[11px] text-indigo-800/80 mt-0.5 leading-relaxed">
                                    Questions are strictly reserved for official timed tests, mock examinations, and candidate proctored evaluations.
                                </span>
                            </div>
                        </label>
                    </div>
                </div>

                <!-- 3. Suggested Easiest Format Callout Box -->
                <div class="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-teal-50/40 to-slate-50 border border-indigo-200/80 space-y-2">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div class="flex items-center gap-2">
                            <span class="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">💡</span>
                            <span class="text-xs font-black text-indigo-950">Easiest Copy-Paste Format (Exam Standard):</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="loadSampleNaturalText()" class="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors">
                                <i data-lucide="clipboard" class="w-3.5 h-3.5"></i>
                                <span>Load Sample Natural Text</span>
                            </button>
                            <button type="button" onclick="loadSampleCsv()" class="text-xs text-indigo-700 hover:underline font-bold">Sample CSV</button>
                            <button type="button" onclick="loadSampleJson()" class="text-xs text-indigo-700 hover:underline font-bold">Sample JSON</button>
                        </div>
                    </div>
                    <p class="text-[11px] text-slate-600 leading-relaxed">
                        Simply copy and paste your questions. Each question needs a question line, options <strong class="text-slate-800">A.</strong>, <strong class="text-slate-800">B.</strong>, <strong class="text-slate-800">C.</strong>, <strong class="text-slate-800">D.</strong>, an <strong class="text-slate-800">Answer: X</strong> key, and an optional <strong class="text-slate-800">Explanation:</strong> with working or reasoning.
                    </p>
                </div>

                <!-- 4. Question Textarea -->
                <div>
                    <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">4. Paste Questions Below</label>
                    <textarea name="raw_data" id="bulkTextarea" required rows="9" placeholder="1. What is the unit of force?
A. Joule
B. Newton
C. Watt
D. Pascal
Answer: B
Explanation: The SI unit of force is the newton (N = kg m s⁻²).

2. Which relation does dimensional analysis give for frequency?
A. f = k (1/l) √(T/μ)
B. f = k l √(T/μ)
C. f = k (1/l) √(μ/T)
D. f = k l² (T/μ)
Answer: A
Explanation: With [f] = T⁻¹, [T] = MLT⁻², [μ] = ML⁻¹ and [l] = L..." class="w-full p-4 rounded-2xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-500 leading-relaxed"></textarea>
                </div>

                <div class="flex items-center justify-end gap-3 pt-1">
                    <button type="button" onclick="document.getElementById('bulkImportCard').classList.add('hidden')" class="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                    <button type="submit" class="px-7 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-200 flex items-center gap-2 transition-all">
                        <i data-lucide="check-circle" class="w-4 h-4"></i>
                        <span>Start Smart Bulk Import</span>
                    </button>
                </div>
            </form>
        </div>

        <!-- Add Single Question Form -->
        <div id="authorSection" class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
                <div>
                    <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
                        <i data-lucide="edit-3" class="w-5 h-5 text-indigo-600"></i>
                        <span>Add Single Question to Bank</span>
                    </h3>
                    <p class="text-xs text-slate-500 mt-0.5">Author a single question, assign it to a curriculum topic, and select whether it belongs to Past or Test Question Bank.</p>
                </div>
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs">
                    <i data-lucide="sparkles" class="w-3.5 h-3.5 text-indigo-500"></i>
                    <span>Math &amp; Science Friendly</span>
                </span>
            </div>

            <form method="POST" action="admin_dashboard.php" class="space-y-4">
                <input type="hidden" name="action" value="add_question">
                
                <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                        <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">1. Subject <span class="text-rose-500">*</span></label>
                        <select name="course_id" id="singleCourseSelect" required onchange="onSingleCourseChange(this.value)" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500">
                            <option value="" disabled selected>-- Select Subject --</option>
                            <?php foreach ($courses as $c): ?>
                            <option value="<?= htmlspecialchars($c['id']) ?>" <?= $selectedCourseFilter === $c['id'] ? 'selected' : '' ?>>
                                <?= htmlspecialchars($c['code']) ?> - <?= htmlspecialchars($c['title']) ?>
                            </option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">2. Topic <span class="text-rose-500">*</span></label>
                        <select name="topic_id" id="singleTopicSelect" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500">
                            <option value="">-- Select an Existing Topic --</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">3. Bank Group <span class="text-rose-500">*</span></label>
                        <select name="bank_type" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-black text-slate-800 focus:ring-2 focus:ring-indigo-500">
                            <option value="past">📚 Past Question Bank</option>
                            <option value="test">⏱️ Test Question Bank</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">4. Correct Key <span class="text-rose-500">*</span></label>
                        <select name="correct_option" class="w-full px-3.5 py-2.5 rounded-xl border-2 border-emerald-500 text-xs bg-emerald-50/50 font-black text-emerald-900 focus:ring-2 focus:ring-emerald-500">
                            <option value="A">Choice A is Correct</option>
                            <option value="B">Choice B is Correct</option>
                            <option value="C">Choice C is Correct</option>
                            <option value="D">Choice D is Correct</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">5. Question Prompt <span class="text-rose-500">*</span></label>
                    <textarea name="text" required rows="3" placeholder="Type the question here (e.g. A stretched string vibrates with frequency f...)" class="w-full p-3.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 leading-relaxed"></textarea>
                    <span class="text-[11px] text-slate-400 mt-1 block">Tip: Formulas work automatically or can be wrapped in dollar signs like <code class="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded font-mono">$f = \frac{1}{2l}\sqrt{\frac{T}{\mu}}$</code></span>
                </div>

                <!-- 4 Colored Option Cards -->
                <div class="space-y-1.5">
                    <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">6. Enter The Four Multiple-Choice Options</label>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div class="p-3 rounded-2xl bg-indigo-50/40 border border-indigo-200/70 space-y-1">
                            <span class="text-[11px] font-black uppercase text-indigo-700 flex items-center gap-1.5">
                                <span class="w-5 h-5 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">A</span>
                                <span>Option A <span class="text-rose-500">*</span></span>
                            </span>
                            <input type="text" name="a" required placeholder="Option A text or formula..." class="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white text-xs focus:ring-2 focus:ring-indigo-500">
                        </div>

                        <div class="p-3 rounded-2xl bg-purple-50/40 border border-purple-200/70 space-y-1">
                            <span class="text-[11px] font-black uppercase text-purple-700 flex items-center gap-1.5">
                                <span class="w-5 h-5 rounded-lg bg-purple-600 text-white flex items-center justify-center text-[10px] font-black">B</span>
                                <span>Option B <span class="text-rose-500">*</span></span>
                            </span>
                            <input type="text" name="b" required placeholder="Option B text or formula..." class="w-full px-3 py-2 rounded-xl border border-purple-200 bg-white text-xs focus:ring-2 focus:ring-purple-500">
                        </div>

                        <div class="p-3 rounded-2xl bg-amber-50/40 border border-amber-200/70 space-y-1">
                            <span class="text-[11px] font-black uppercase text-amber-800 flex items-center gap-1.5">
                                <span class="w-5 h-5 rounded-lg bg-amber-500 text-white flex items-center justify-center text-[10px] font-black">C</span>
                                <span>Option C</span>
                            </span>
                            <input type="text" name="c" placeholder="Option C text or formula..." class="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white text-xs focus:ring-2 focus:ring-amber-500">
                        </div>

                        <div class="p-3 rounded-2xl bg-emerald-50/40 border border-emerald-200/70 space-y-1">
                            <span class="text-[11px] font-black uppercase text-emerald-800 flex items-center gap-1.5">
                                <span class="w-5 h-5 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">D</span>
                                <span>Option D</span>
                            </span>
                            <input type="text" name="d" placeholder="Option D text or formula..." class="w-full px-3 py-2 rounded-xl border border-emerald-200 bg-white text-xs focus:ring-2 focus:ring-emerald-500">
                        </div>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">7. Explanation &amp; Working (Shown to students during review)</label>
                    <textarea name="explanation" rows="2" placeholder="Explain step-by-step why the answer is correct..." class="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"></textarea>
                </div>

                <div class="pt-2 flex justify-end">
                    <button type="submit" class="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-200 flex items-center gap-2 transition-all">
                        <i data-lucide="check-circle" class="w-4 h-4"></i>
                        <span>Save Question to Bank</span>
                    </button>
                </div>
            </form>
        </div>

        <!-- Question Bank Viewer List -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                    <h2 class="text-base font-black text-slate-900 flex items-center gap-2">
                        <span>Question Bank Records</span>
                        <span class="px-2.5 py-0.5 rounded-full text-xs font-bold <?= $selectedBankType === 'test' ? 'bg-indigo-100 text-indigo-800' : ($selectedBankType === 'past' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800') ?>">
                            <?= !empty($selectedBankType) ? ($selectedBankType === 'test' ? 'Test Question Bank' : 'Past Question Bank') : 'All Question Banks' ?> (<?= count($questionsList) ?> listed)
                        </span>
                    </h2>
                    <p class="text-xs text-slate-500 mt-0.5">Live questions with topic mapping, bank type tags, and 1-click bank transfer.</p>
                </div>
            </div>

            <div class="divide-y divide-slate-100">
                <?php if (empty($questionsList)): ?>
                <div class="py-12 text-center text-slate-400 text-xs">No questions matched your search criteria.</div>
                <?php else: ?>
                <?php foreach ($questionsList as $idx => $rq): 
                    $isTest = ($rq['bank_type'] ?? '') === 'test';
                ?>
                <div class="py-4 space-y-2.5">
                    <div class="flex items-start justify-between gap-4">
                        <div class="space-y-1">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-[10px] font-mono"><?= htmlspecialchars($rq['course_code']) ?></span>
                                <span class="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[10px]"><?= htmlspecialchars($rq['topic_name']) ?></span>
                                
                                <!-- Bank Type Badge -->
                                <?php if ($isTest): ?>
                                <span class="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-300 font-black text-[10px] flex items-center gap-1">
                                    <i data-lucide="timer" class="w-3 h-3 text-indigo-700"></i>
                                    <span>TEST BANK</span>
                                </span>
                                <?php else: ?>
                                <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-[10px] flex items-center gap-1">
                                    <i data-lucide="book-marked" class="w-3 h-3 text-emerald-700"></i>
                                    <span>PAST QUESTION BANK</span>
                                </span>
                                <?php endif; ?>

                                <span class="text-[10px] text-slate-400">ID: <?= substr($rq['id'], 0, 8) ?></span>
                            </div>
                            <p class="text-xs font-semibold text-slate-900 leading-relaxed pt-1"><?= htmlspecialchars($rq['text']) ?></p>
                        </div>

                        <div class="flex items-center gap-2 shrink-0">
                            <!-- 1-Click Bank Type Switcher -->
                            <form method="POST" action="admin_dashboard.php" class="inline">
                                <input type="hidden" name="action" value="switch_bank_type">
                                <input type="hidden" name="question_id" value="<?= htmlspecialchars($rq['id']) ?>">
                                <?php if ($isTest): ?>
                                <input type="hidden" name="target_type" value="past">
                                <button type="submit" class="px-2.5 py-1 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-[11px] font-bold transition-all flex items-center gap-1" title="Move to Past Question Bank">
                                    <i data-lucide="arrow-left-right" class="w-3 h-3"></i>
                                    <span>Move to Past Bank</span>
                                </button>
                                <?php else: ?>
                                <input type="hidden" name="target_type" value="test">
                                <button type="submit" class="px-2.5 py-1 rounded-xl border border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 text-[11px] font-bold transition-all flex items-center gap-1" title="Move to Test Question Bank">
                                    <i data-lucide="arrow-left-right" class="w-3 h-3"></i>
                                    <span>Move to Test Bank</span>
                                </button>
                                <?php endif; ?>
                            </form>

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
                        <div class="p-2.5 rounded-xl <?= $rq['correct_option'] === 'A' ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold' : 'bg-slate-50 text-slate-700' ?>">
                            <span class="font-bold">A:</span> <?= htmlspecialchars($rq['a']) ?>
                        </div>
                        <div class="p-2.5 rounded-xl <?= $rq['correct_option'] === 'B' ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold' : 'bg-slate-50 text-slate-700' ?>">
                            <span class="font-bold">B:</span> <?= htmlspecialchars($rq['b']) ?>
                        </div>
                        <?php if (!empty($rq['c'])): ?>
                        <div class="p-2.5 rounded-xl <?= $rq['correct_option'] === 'C' ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold' : 'bg-slate-50 text-slate-700' ?>">
                            <span class="font-bold">C:</span> <?= htmlspecialchars($rq['c']) ?>
                        </div>
                        <?php endif; ?>
                        <?php if (!empty($rq['d'])): ?>
                        <div class="p-2.5 rounded-xl <?= $rq['correct_option'] === 'D' ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold' : 'bg-slate-50 text-slate-700' ?>">
                            <span class="font-bold">D:</span> <?= htmlspecialchars($rq['d']) ?>
                        </div>
                        <?php endif; ?>
                    </div>

                    <?php if (!empty($rq['explanation'])): ?>
                    <p class="text-[11px] text-slate-600 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80 leading-relaxed">
                        <strong class="text-amber-900 not-italic font-bold">Solution / Rationale:</strong> <?= nl2br(htmlspecialchars($rq['explanation'])) ?>
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
                                    <form method="POST" action="admin_dashboard.php" class="inline" onsubmit="return confirm('Reset password for <?= htmlspecialchars($st['name']) ?> to default (premed2026)? The student can log in right away using premed2026.')">
                                        <input type="hidden" name="action" value="reset_student_password">
                                        <input type="hidden" name="student_id" value="<?= htmlspecialchars($st['id']) ?>">
                                        <button type="submit" class="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 font-bold text-xs inline-flex items-center gap-1 shadow-2xs transition-all" title="Reset password to premed2026">
                                            <i data-lucide="key" class="w-3 h-3 text-amber-700"></i>
                                            <span>Reset Pass</span>
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
                    <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">Target Curriculum Topic</label>
                    <select name="topic_id" id="editQuestionTopic" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-bold text-slate-800">
                        <?php foreach ($allTopics as $top): ?>
                        <option value="<?= htmlspecialchars($top['id']) ?>"><?= htmlspecialchars($top['course_code']) ?>: <?= htmlspecialchars($top['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">Question Bank Group</label>
                    <select name="bank_type" id="editQuestionBankType" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-black text-slate-800">
                        <option value="past">📚 Past Question Bank</option>
                        <option value="test">⏱️ Test Question Bank</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">Correct Key</label>
                    <select name="correct_option" id="editQuestionCorrect" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-black text-indigo-700 bg-white">
                        <option value="A">Choice A is Correct</option>
                        <option value="B">Choice B is Correct</option>
                        <option value="C">Choice C is Correct</option>
                        <option value="D">Choice D is Correct</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-slate-600 uppercase mb-1">Clinical Rationale / Working</label>
                    <input type="text" name="explanation" id="editQuestionExplanation" placeholder="Explanation for review..." class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs">
                </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-2">
                <button type="button" onclick="closeEditQuestionModal()" class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs">Save Question</button>
            </div>
        </form>
    </div>
</div>

<!-- ========================================================================= -->
<!-- MODAL: MANAGE COURSE TOPICS (COURSE & TOPIC EDITOR)                      -->
<!-- ========================================================================= -->
<div id="courseTopicsModal" class="hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="relative bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div class="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
                <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
                    <i data-lucide="folder-tree" class="w-5 h-5 text-indigo-600"></i>
                    <span>Curriculum Topics Editor: <span id="topicModalCourseHeader" class="text-indigo-700 font-mono"></span></span>
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">Add, rename, or organize syllabus topics for this subject.</p>
            </div>
            <button type="button" onclick="closeCourseTopicsModal()" class="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>

        <!-- Add New Topic to this Course Form -->
        <div class="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2">
            <label class="block text-xs font-black text-indigo-900 uppercase tracking-wider">Add a New Topic to this Subject</label>
            <form method="POST" action="admin_dashboard.php" class="flex gap-2">
                <input type="hidden" name="action" value="add_topic">
                <input type="hidden" name="course_id" id="topicModalCourseId">
                <input type="text" name="name" required placeholder="e.g. Physical Quantities, Units & Dimensions" class="flex-1 px-3.5 py-2 rounded-xl border border-indigo-200 bg-white text-xs font-medium focus:ring-2 focus:ring-indigo-500">
                <button type="submit" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0">
                    <i data-lucide="plus" class="w-4 h-4"></i>
                    <span>Add Topic</span>
                </button>
            </form>
        </div>

        <!-- List of Current Topics with live question count & rename -->
        <div class="space-y-2.5">
            <h4 class="text-xs font-black text-slate-700 uppercase tracking-wider">Current Course Topics</h4>
            <div id="topicModalListContainer" class="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                <!-- Injected dynamically via openCourseTopicsModal() -->
            </div>
        </div>

        <div class="flex justify-end pt-2">
            <button type="button" onclick="closeCourseTopicsModal()" class="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs">Done</button>
        </div>
    </div>
</div>

<script>
const topicsByCourseData = <?= json_encode($topicsByCourse) ?>;

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
    if (window.lucide) lucide.createIcons();
}

function closeEditCourseModal() {
    document.getElementById('editCourseModal').classList.add('hidden');
}

function openCourseTopicsModal(c) {
    document.getElementById('topicModalCourseId').value = c.id;
    document.getElementById('topicModalCourseHeader').textContent = (c.code || '') + ' - ' + (c.title || '');
    
    const container = document.getElementById('topicModalListContainer');
    const topics = topicsByCourseData[c.id] || [];
    
    if (topics.length === 0) {
        container.innerHTML = '<div class="p-6 text-center text-xs text-slate-400">No topics added to this subject yet. Use the form above to add your first topic!</div>';
    } else {
        container.innerHTML = topics.map((t, idx) => `
            <div class="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                <div class="space-y-1 min-w-0">
                    <form method="POST" action="admin_dashboard.php" class="flex items-center gap-2">
                        <input type="hidden" name="action" value="update_topic">
                        <input type="hidden" name="topic_id" value="${escapeHtml(t.id)}">
                        <input type="text" name="name" value="${escapeHtml(t.name)}" class="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:ring-1 focus:ring-indigo-500 w-full sm:w-72" title="Click to edit topic name">
                        <button type="submit" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-bold text-[11px] transition-colors shrink-0">Rename</button>
                    </form>
                    <div class="flex items-center gap-2 text-[10px]">
                        <span class="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">📚 ${parseInt(t.past_q_count || 0)} Past Qs</span>
                        <span class="text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded">⏱️ ${parseInt(t.test_q_count || 0)} Test Qs</span>
                    </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <a href="admin_dashboard.php?tab=questions&filter_course=${encodeURIComponent(c.id)}&filter_topic=${encodeURIComponent(t.id)}" class="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors">
                        View Questions &rsaquo;
                    </a>
                    <form method="POST" action="admin_dashboard.php" class="inline" onsubmit="return confirm('Are you sure you want to delete topic: ${escapeHtml(t.name)}?')">
                        <input type="hidden" name="action" value="delete_topic">
                        <input type="hidden" name="topic_id" value="${escapeHtml(t.id)}">
                        <button type="submit" class="p-1.5 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors" title="Delete Topic">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                    </form>
                </div>
            </div>
        `).join('');
    }

    document.getElementById('courseTopicsModal').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function closeCourseTopicsModal() {
    document.getElementById('courseTopicsModal').classList.add('hidden');
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
    
    if (document.getElementById('editQuestionTopic') && q.topic_id) {
        document.getElementById('editQuestionTopic').value = q.topic_id;
    }
    if (document.getElementById('editQuestionBankType')) {
        document.getElementById('editQuestionBankType').value = (q.bank_type === 'test') ? 'test' : 'past';
    }

    document.getElementById('editQuestionModal').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function closeEditQuestionModal() {
    document.getElementById('editQuestionModal').classList.add('hidden');
}

function onBulkCourseChange(courseId) {
    const topicSelect = document.getElementById('bulkTopicSelect');
    if (!topicSelect) return;
    const topics = topicsByCourseData[courseId] || [];
    
    topicSelect.innerHTML = '<option value="">-- Select an Existing Topic --</option>';
    topics.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.name + ' (' + (t.total_q_count || 0) + ' Qs)';
        topicSelect.appendChild(opt);
    });
}

function onSingleCourseChange(courseId) {
    const topicSelect = document.getElementById('singleTopicSelect');
    if (!topicSelect) return;
    const topics = topicsByCourseData[courseId] || [];
    
    topicSelect.innerHTML = '<option value="">-- Select an Existing Topic --</option>';
    topics.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.name + ' (' + (t.total_q_count || 0) + ' Qs)';
        topicSelect.appendChild(opt);
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function loadSampleNaturalText() {
    const sample = `1. A stretched string vibrates with frequency f. Assuming f depends on its tension T, mass per unit length μ and length l, which relation does dimensional analysis give?
A. f = k (1/l) √(T/μ)
B. f = k l √(T/μ)
C. f = k (1/l) √(μ/T)
D. f = k l² (T/μ)
Answer: A
Explanation: Assume f = k Tˣ μʸ lᶻ. With [f] = T⁻¹, [T] = MLT⁻², [μ] = ML⁻¹ and [l] = L:
T⁻¹ = M^(x+y) L^(x−y+z) T^(−2x)
- Time: −2x = −1, so x = ½
- Mass: x + y = 0, so y = −½
- Length: x − y + z = 0, so z = −1
So f = k (1/l)√(T/μ).

2. What is the SI unit of thermal conductivity?
A. J s⁻¹ m⁻¹ K⁻¹
B. J s m⁻¹ K⁻¹
C. W m K⁻¹
D. J m⁻² K⁻¹
Answer: A
Explanation: From Q/t = kAΔθ/l, k = (Q/t)·l/(AΔθ), giving (J s⁻¹)(m)/(m² K) = J s⁻¹ m⁻¹ K⁻¹ = W m⁻¹ K⁻¹.`;
    document.getElementById('bulkTextarea').value = sample;
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
    // Auto-populate topics for selected courses on page load
    const bulkCourse = document.getElementById('bulkCourseSelect');
    if (bulkCourse && bulkCourse.value) {
        onBulkCourseChange(bulkCourse.value);
    }
    const singleCourse = document.getElementById('singleCourseSelect');
    if (singleCourse && singleCourse.value) {
        onSingleCourseChange(singleCourse.value);
    }

    if (window.lucide) {
        lucide.createIcons();
    }
});
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
