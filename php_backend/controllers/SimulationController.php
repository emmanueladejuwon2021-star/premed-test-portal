<?php
/**
 * Simulation Controller (CBT Exam Engine)
 * Premed Test Portal (PHP + MySQL Backend)
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/auth.php';

class SimulationController {
    public static function startTest(): void {
        $user = AuthHelper::verifyToken();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Authentication required']);
            return;
        }

        $input = AuthHelper::getJsonInput();
        $courseId = trim($input['courseId'] ?? '');
        $limit = isset($input['limit']) ? (int)$input['limit'] : null;
        $topics = isset($input['topics']) && is_array($input['topics']) ? $input['topics'] : [];
        $shuffleQuestions = $input['shuffleQuestions'] ?? true;

        if (empty($courseId)) {
            http_response_code(400);
            echo json_encode(['error' => 'Course ID is required']);
            return;
        }

        $db = Database::getConnection();

        // 1. Fetch course details
        $stmt = $db->prepare("SELECT * FROM courses WHERE id = ? LIMIT 1");
        $stmt->execute([$courseId]);
        $course = $stmt->fetch();

        if (!$course) {
            http_response_code(404);
            echo json_encode(['error' => 'Course not found']);
            return;
        }

        if ((bool)$course['is_locked']) {
            http_response_code(403);
            echo json_encode(['error' => 'This assessment is currently locked by the instructor.']);
            return;
        }

        // 2. Fetch questions
        if (!empty($topics)) {
            $inPlaceholders = implode(',', array_fill(0, count($topics), '?'));
            $qStmt = $db->prepare("SELECT * FROM questions WHERE topic_id IN ($inPlaceholders)");
            $qStmt->execute($topics);
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
            http_response_code(404);
            echo json_encode(['error' => 'No questions are available for this assessment yet.']);
            return;
        }

        // 3. Shuffle questions if requested
        if ($shuffleQuestions) {
            shuffle($questions);
        }

        // 4. Apply question limit
        $limitCount = $limit ?: ((int)$course['question_limit'] ?: 20);
        if (count($questions) > $limitCount) {
            $questions = array_slice($questions, 0, $limitCount);
        }

        // 5. Strip correct_option and explanations for anti-cheating before sending to client
        $sanitizedQuestions = array_map(function($q) {
            return [
                'id' => $q['id'],
                'topic_id' => $q['topic_id'],
                'text' => $q['text'],
                'question_text' => $q['text'],
                'a' => $q['a'],
                'b' => $q['b'],
                'c' => $q['c'],
                'd' => $q['d'],
                'option_a' => $q['a'],
                'option_b' => $q['b'],
                'option_c' => $q['c'],
                'option_d' => $q['d'],
                'diagram_url' => $q['diagram_url']
            ];
        }, $questions);

        $sessionId = bin2hex(random_bytes(12));
        $duration = (int)($course['duration'] ?: 30);

        echo json_encode([
            'sessionId' => $sessionId,
            'courseId' => $courseId,
            'courseTitle' => $course['title'],
            'courseCode' => $course['code'],
            'expectedDuration' => $duration,
            'durationMinutes' => $duration,
            'startTime' => time() * 1000,
            'questions' => $sanitizedQuestions
        ]);
    }

    public static function submitTest(): void {
        $user = AuthHelper::verifyToken();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Authentication required']);
            return;
        }

        $input = AuthHelper::getJsonInput();
        $courseId = trim($input['courseId'] ?? '');
        $answers = $input['answers'] ?? []; // Map of question ID or index => student selected option
        $questionIds = $input['questionIds'] ?? [];

        $db = Database::getConnection();

        // Fetch questions to grade
        if (empty($questionIds)) {
            $questionIds = array_keys($answers);
        }

        if (empty($questionIds)) {
            http_response_code(400);
            echo json_encode(['error' => 'No question submissions provided']);
            return;
        }

        $inPlaceholders = implode(',', array_fill(0, count($questionIds), '?'));
        $stmt = $db->prepare("SELECT * FROM questions WHERE id IN ($inPlaceholders)");
        $stmt->execute($questionIds);
        $questions = $stmt->fetchAll();

        $questionsById = [];
        foreach ($questions as $q) {
            $questionsById[$q['id']] = $q;
        }

        $totalScore = 0;
        $totalQuestions = count($questionIds);
        $topicScores = [];
        $breakdown = [];

        foreach ($questionIds as $qid) {
            $q = $questionsById[$qid] ?? null;
            if (!$q) continue;

            $studentAnswer = strtolower(trim((string)($answers[$qid] ?? '')));
            $correctOption = strtolower(trim((string)$q['correct_option']));

            $isCorrect = ($studentAnswer === $correctOption);
            if ($isCorrect) {
                $totalScore++;
            }

            $topicId = $q['topic_id'];
            if (!isset($topicScores[$topicId])) {
                $topicScores[$topicId] = ['correct' => 0, 'total' => 0];
            }
            $topicScores[$topicId]['total']++;
            if ($isCorrect) $topicScores[$topicId]['correct']++;

            $breakdown[] = [
                'question_id' => $qid,
                'question_text' => $q['text'],
                'student_answer' => $studentAnswer,
                'correct_answer' => $correctOption,
                'is_correct' => $isCorrect,
                'explanation' => $q['explanation'],
                'options' => [
                    'a' => $q['a'],
                    'b' => $q['b'],
                    'c' => $q['c'],
                    'd' => $q['d']
                ]
            ];
        }

        $percentage = $totalQuestions > 0 ? round(($totalScore / $totalQuestions) * 100, 2) : 0;
        
        // Grading scale
        $grade = 'F';
        if ($percentage >= 70) $grade = 'A';
        elseif ($percentage >= 60) $grade = 'B';
        elseif ($percentage >= 50) $grade = 'C';
        elseif ($percentage >= 45) $grade = 'D';
        elseif ($percentage >= 40) $grade = 'E';

        $resultId = bin2hex(random_bytes(12));
        $studentId = $user['id'];

        $insert = $db->prepare("
            INSERT INTO results (
                id, student_id, course_id, total_score, total_questions, percentage, grade, 
                question_ids, topic_breakdown, student_answers
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $insert->execute([
            $resultId,
            $studentId,
            $courseId,
            $totalScore,
            $totalQuestions,
            $percentage,
            $grade,
            json_encode($questionIds),
            json_encode($topicScores),
            json_encode($answers)
        ]);

        echo json_encode([
            'id' => $resultId,
            'student_id' => $studentId,
            'course_id' => $courseId,
            'total_score' => $totalScore,
            'total_questions' => $totalQuestions,
            'percentage' => $percentage,
            'grade' => $grade,
            'breakdown' => $breakdown,
            'topic_breakdown' => $topicScores
        ]);
    }

    public static function getHistory(): void {
        $user = AuthHelper::verifyToken();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Authentication required']);
            return;
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT r.*, c.title AS course_title, c.code AS course_code 
            FROM results r
            LEFT JOIN courses c ON r.course_id = c.id
            WHERE r.student_id = ?
            ORDER BY r.created_at DESC
        ");
        $stmt->execute([$user['id']]);
        $results = $stmt->fetchAll();

        echo json_encode($results);
    }

    public static function getLeaderboard(): void {
        $db = Database::getConnection();
        $stmt = $db->query("
            SELECT 
                s.name, 
                s.department, 
                COUNT(r.id) AS tests_taken,
                ROUND(AVG(r.percentage), 2) AS average_score,
                MAX(r.percentage) AS top_score
            FROM results r
            JOIN students s ON r.student_id = s.id
            GROUP BY s.id, s.name, s.department
            ORDER BY average_score DESC, tests_taken DESC
            LIMIT 50
        ");
        $leaders = $stmt->fetchAll();

        echo json_encode($leaders);
    }
}
