<?php
/**
 * Study Combat - Native PHP API Handler & Fallback Engine
 * Handles PREMED- Code Generation, Room Validation & DB Operations in Pure PHP
 */

require_once __DIR__ . '/../config/db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$pdo = DB::connect();

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$action = $_GET['action'] ?? ($_POST['action'] ?? '');
$rawBody = file_get_contents('php://input');
$data = json_decode($rawBody, true) ?: $_POST;

$sessionStudent = $_SESSION['student'] ?? null;
$sessionAdmin = $_SESSION['admin'] ?? null;

if ($action === 'create_room' || isset($data['create_room'])) {
    $userId = $data['userId'] ?? ($_SESSION['student_id'] ?? ($sessionStudent['id'] ?? ($sessionAdmin['id'] ?? 'usr_' . bin2hex(random_bytes(4)))));
    $studentName = $data['studentName'] ?? ($_SESSION['student_name'] ?? ($sessionStudent['name'] ?? ($sessionAdmin['name'] ?? 'Warrior')));
    $matricNo = $data['matricNo'] ?? ($_SESSION['student_matric'] ?? ($sessionStudent['matric_no'] ?? ($sessionAdmin['matric_no'] ?? 'STU001')));
    $roomName = trim($data['roomName'] ?? ($studentName . "'s Battle"));
    $courseId = $data['courseId'] ?? '';
    $topicId = $data['topicId'] ?? '';
    $courseCode = $data['courseCode'] ?? 'COURSE';
    $topicName = $data['topicName'] ?? 'Topic';
    $mode = $data['mode'] ?? '1v1';
    $questionsPerRound = (int)($data['questionsPerRound'] ?? 4);
    $totalRounds = (int)($data['totalRounds'] ?? 4);

    if (!$userId || !$courseId || !$topicId) {
        echo json_encode(['success' => false, 'message' => 'Please select a course and topic.']);
        exit;
    }

    // Generate Unique PREMED- Code in DB
    $code = '';
    $attempts = 0;
    while ($attempts < 100) {
        $attempts++;
        $randomCode = 'PREMED-' . rand(10000, 99999);
        $chk = $pdo->prepare("SELECT id FROM combat_rooms WHERE room_code = ? AND status IN ('waiting', 'playing', 'round_break') LIMIT 1");
        $chk->execute([$randomCode]);
        if (!$chk->fetch()) {
            $code = $randomCode;
            break;
        }
    }
    if (!$code) {
        $code = 'PREMED-' . rand(10000, 99999);
    }

    $totalQuestions = min($questionsPerRound * 2 * $totalRounds, 40);

    // Fetch Questions Pool
    $pastQs = $pdo->prepare("SELECT id, text, a, b, c, d, correct_option, explanation FROM questions WHERE topic_id = ?");
    $pastQs->execute([$topicId]);
    $questionsPool = $pastQs->fetchAll(PDO::FETCH_ASSOC);

    if (empty($questionsPool)) {
        $fallback = $pdo->query("SELECT id, text, a, b, c, d, correct_option, explanation FROM questions LIMIT 40");
        $questionsPool = $fallback->fetchAll(PDO::FETCH_ASSOC);
    }

    shuffle($questionsPool);

    // Repeat pool if needed up to totalQuestions
    $finalPool = [];
    while (count($finalPool) < $totalQuestions && !empty($questionsPool)) {
        foreach ($questionsPool as $q) {
            if (count($finalPool) >= $totalQuestions) break;
            $finalPool[] = $q;
        }
    }

    $hostPlayer = [
        'userId' => $userId,
        'name' => $studentName,
        'matricNo' => $matricNo,
        'team' => 'A',
        'isHost' => true,
        'socketId' => null,
        'joinedAt' => date('Y-m-d H:i:s'),
        'connected' => true
    ];

    $roomId = 'room_' . bin2hex(random_bytes(6));
    $stmt = $pdo->prepare("
        INSERT INTO combat_rooms (
            id, room_code, room_name, course_id, topic_id, created_by, mode,
            questions_per_round, total_rounds, total_questions, status, players, scores,
            questions_pool, current_round, current_question_index, current_turn_user_id, turn_type,
            created_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'waiting', ?, ?, ?, 1, 0, ?, 'main', CURRENT_TIMESTAMP, datetime('now', '+1 day'))
    ");
    $stmt->execute([
        $roomId, $code, $roomName, $courseId, $topicId, $userId, $mode,
        $questionsPerRound, $totalRounds, $totalQuestions,
        json_encode([$hostPlayer]), json_encode([(string)$userId => 0]),
        json_encode($finalPool), (string)$userId
    ]);

    $roomState = [
        'roomCode' => $code,
        'roomName' => $roomName,
        'courseId' => $courseId,
        'topicId' => $topicId,
        'courseCode' => $courseCode,
        'topicName' => $topicName,
        'createdBy' => $userId,
        'hostName' => $studentName,
        'mode' => $mode,
        'questionsPerRound' => $questionsPerRound,
        'totalRounds' => $totalRounds,
        'totalQuestions' => $totalQuestions,
        'status' => 'waiting',
        'players' => [$hostPlayer],
        'questionsPool' => $finalPool,
        'scores' => [$userId => 0]
    ];

    echo json_encode([
        'success' => true,
        'roomCode' => $code,
        'room' => $roomState
    ]);
    exit;
}

if ($action === 'get_room_status' || isset($data['get_room_status'])) {
    $code = strtoupper(trim($data['roomCode'] ?? ($_GET['roomCode'] ?? '')));

    $stmt = $pdo->prepare("SELECT * FROM combat_rooms WHERE room_code = ? LIMIT 1");
    $stmt->execute([$code]);
    $room = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$room) {
        echo json_encode(['success' => false, 'message' => 'Room not found.']);
        exit;
    }

    $players = json_decode($room['players'] ?? '[]', true);
    $scores = json_decode($room['scores'] ?? '{}', true);

    $questionsPool = json_decode($room['questions_pool'] ?? '[]', true);
    if (empty($questionsPool)) {
        $pastQs = $pdo->prepare("SELECT id, text, a, b, c, d, correct_option, explanation FROM questions WHERE topic_id = ?");
        $pastQs->execute([$room['topic_id']]);
        $questionsPool = $pastQs->fetchAll(PDO::FETCH_ASSOC);
        if (empty($questionsPool)) {
            $fallback = $pdo->query("SELECT id, text, a, b, c, d, correct_option, explanation FROM questions LIMIT 40");
            $questionsPool = $fallback->fetchAll(PDO::FETCH_ASSOC);
        }
        shuffle($questionsPool);
        try {
            $updPool = $pdo->prepare("UPDATE combat_rooms SET questions_pool = ? WHERE room_code = ?");
            $updPool->execute([json_encode($questionsPool), $code]);
        } catch (Exception $e) {}
    }
    $lastAnswerResult = json_decode($room['last_answer_result'] ?? 'null', true);

    $roomState = [
        'roomCode' => $code,
        'roomName' => $room['room_name'],
        'courseId' => $room['course_id'],
        'topicId' => $room['topic_id'],
        'createdBy' => (string)$room['created_by'],
        'mode' => $room['mode'],
        'questionsPerRound' => (int)$room['questions_per_round'],
        'totalRounds' => (int)$room['total_rounds'],
        'totalQuestions' => (int)$room['total_questions'],
        'status' => $room['status'],
        'currentRound' => (int)($room['current_round'] ?? 1),
        'currentQuestionIndex' => (int)($room['current_question_index'] ?? 0),
        'currentTurnUserId' => (string)($room['current_turn_user_id'] ?? ($players[0]['userId'] ?? '')),
        'turnType' => $room['turn_type'] ?? 'main',
        'bonusUserId' => $room['bonus_user_id'] ?? null,
        'lastAnswerResult' => $lastAnswerResult,
        'lastAnswerTimestamp' => (float)($room['last_answer_timestamp'] ?? 0),
        'players' => $players,
        'scores' => $scores,
        'questionsPool' => $questionsPool
    ];

    echo json_encode(['success' => true, 'room' => $roomState]);
    exit;
}

if ($action === 'join_room' || isset($data['join_room'])) {
    $code = strtoupper(trim($data['roomCode'] ?? ''));
    $userId = $data['userId'] ?? ($_SESSION['student_id'] ?? ($sessionStudent['id'] ?? ($sessionAdmin['id'] ?? 'usr_' . bin2hex(random_bytes(4)))));
    $studentName = $data['studentName'] ?? ($_SESSION['student_name'] ?? ($sessionStudent['name'] ?? ($sessionAdmin['name'] ?? 'Warrior')));
    $matricNo = $data['matricNo'] ?? ($_SESSION['student_matric'] ?? ($sessionStudent['matric_no'] ?? ($sessionAdmin['matric_no'] ?? 'STU001')));

    $stmt = $pdo->prepare("SELECT * FROM combat_rooms WHERE room_code = ? LIMIT 1");
    $stmt->execute([$code]);
    $room = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$room) {
        echo json_encode(['success' => false, 'message' => 'Room code not found.']);
        exit;
    }

    if (in_array($room['status'], ['finished', 'terminated'])) {
        echo json_encode(['success' => false, 'message' => 'This room has finished or expired.']);
        exit;
    }

    $players = json_decode($room['players'] ?? '[]', true);
    $scores = json_decode($room['scores'] ?? '{}', true);

    $existing = false;
    foreach ($players as &$p) {
        if ($p['userId'] === $userId) {
            $existing = true;
            $p['connected'] = true;
            break;
        }
    }

    if (!$existing) {
        $maxPlayers = ($room['mode'] === '2v1') ? 3 : 2;
        if (count($players) >= $maxPlayers) {
            echo json_encode(['success' => false, 'message' => 'Room is full.']);
            exit;
        }

        $newPlayer = [
            'userId' => $userId,
            'name' => $studentName,
            'matricNo' => $matricNo,
            'team' => 'B',
            'isHost' => false,
            'socketId' => null,
            'joinedAt' => date('Y-m-d H:i:s'),
            'connected' => true
        ];
        $players[] = $newPlayer;
        $scores[$userId] = 0;

        $upd = $pdo->prepare("UPDATE combat_rooms SET players = ?, scores = ? WHERE room_code = ?");
        $upd->execute([json_encode($players), json_encode($scores), $code]);
    }

    $roomState = [
        'roomCode' => $code,
        'roomName' => $room['room_name'],
        'courseId' => $room['course_id'],
        'topicId' => $room['topic_id'],
        'createdBy' => $room['created_by'],
        'mode' => $room['mode'],
        'questionsPerRound' => (int)$room['questions_per_round'],
        'totalRounds' => (int)$room['total_rounds'],
        'totalQuestions' => (int)$room['total_questions'],
        'status' => $room['status'],
        'players' => $players,
        'scores' => $scores
    ];

    echo json_encode(['success' => true, 'roomCode' => $code, 'room' => $roomState]);
    exit;
}

if ($action === 'submit_answer' || isset($data['submit_answer'])) {
    $code = strtoupper(trim($data['roomCode'] ?? ''));
    $userId = $data['userId'] ?? '';
    $selectedOption = $data['selectedOption'] ?? null;
    $questionId = $data['questionId'] ?? null;

    $stmt = $pdo->prepare("SELECT * FROM combat_rooms WHERE room_code = ? LIMIT 1");
    $stmt->execute([$code]);
    $room = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$room) {
        echo json_encode(['success' => false, 'message' => 'Room not found.']);
        exit;
    }

    $scores = json_decode($room['scores'] ?? '{}', true);

    // Get exact question correct_option
    $currentQ = null;
    if ($questionId) {
        $qStmt = $pdo->prepare("SELECT id, correct_option, explanation FROM questions WHERE id = ? LIMIT 1");
        $qStmt->execute([$questionId]);
        $currentQ = $qStmt->fetch(PDO::FETCH_ASSOC);
    }

    if (!$currentQ) {
        $pastQs = $pdo->prepare("SELECT id, correct_option, explanation FROM questions WHERE topic_id = ? LIMIT 100");
        $pastQs->execute([$room['topic_id']]);
        $questions = $pastQs->fetchAll(PDO::FETCH_ASSOC);
        $currentIdx = (int)($room['current_question_index'] ?? 0);
        $currentQ = $questions[$currentIdx % max(1, count($questions))] ?? null;
    }

    $storedPool = json_decode($room['questions_pool'] ?? '[]', true);
    $currentIdx = (int)($room['current_question_index'] ?? 0);
    if (!empty($storedPool)) {
        $currentQ = $storedPool[$currentIdx % count($storedPool)] ?? $currentQ;
    }

    $turnType = $room['turn_type'] ?? 'main';
    $isCorrect = ($currentQ && $selectedOption === $currentQ['correct_option']);

    if ($turnType === 'main') {
        $pts = $isCorrect ? 2 : 0;
    } else {
        // Bonus Turn Scoring (+1 for correct, -1 for wrong, 0 for timeout)
        $pts = $isCorrect ? 1 : ($selectedOption === 'TIMEOUT' ? 0 : -1);
    }

    $scores[(string)$userId] = ($scores[(string)$userId] ?? 0) + $pts;

    $players = json_decode($room['players'] ?? '[]', true);
    $opponentId = (string)$userId;
    if (is_array($players) && count($players) > 1) {
        foreach ($players as $p) {
            if ((string)$p['userId'] !== (string)$userId) {
                $opponentId = (string)$p['userId'];
                break;
            }
        }
    }

    // Progression rules:
    // 1. If main turn correct -> question complete -> advance to next question, switch to opponent
    // 2. If main turn wrong -> same question -> bonus turn for opponent!
    // 3. If bonus turn (either correct or wrong) -> question complete -> advance to next question, turn to opponent
    $nextIdx = $currentIdx;
    $nextTurnType = 'main';
    $nextTurnUserId = $opponentId;
    $bonusUserId = null;

    if ($turnType === 'main') {
        if ($isCorrect) {
            $nextIdx = $currentIdx + 1;
            $nextTurnType = 'main';
            $nextTurnUserId = $opponentId;
        } else {
            // Give bonus chance on same question
            $nextIdx = $currentIdx;
            $nextTurnType = 'bonus';
            $nextTurnUserId = $opponentId;
            $bonusUserId = $opponentId;
        }
    } else {
        // Conclude bonus turn, advance to next question
        $nextIdx = $currentIdx + 1;
        $nextTurnType = 'main';
        $nextTurnUserId = $opponentId;
    }

    $totalQuestions = (int)($room['total_questions'] ?? 16);
    $qPerRound = (int)($room['questions_per_round'] ?? 4);
    $nextRound = (int)floor($nextIdx / max(1, $qPerRound)) + 1;
    $nextStatus = ($nextIdx >= $totalQuestions) ? 'finished' : 'playing';

    $resPayload = [
        'isCorrect' => $isCorrect,
        'correctOption' => $currentQ ? $currentQ['correct_option'] : 'A',
        'selectedOption' => $selectedOption,
        'explanation' => $currentQ ? $currentQ['explanation'] : '',
        'pointsAwarded' => $pts,
        'scores' => $scores,
        'turnUserId' => (string)($room['current_turn_user_id'] ?? $userId),
        'userId' => (string)$userId,
        'turnType' => $turnType,
        'questionIndex' => $currentIdx,
        'nextQuestionIndex' => $nextIdx,
        'nextTurnType' => $nextTurnType,
        'nextTurnUserId' => $nextTurnUserId,
        'timestamp' => microtime(true)
    ];

    try {
        $upd = $pdo->prepare("
            UPDATE combat_rooms
            SET scores = ?,
                current_question_index = ?,
                current_round = ?,
                current_turn_user_id = ?,
                turn_type = ?,
                bonus_user_id = ?,
                last_answer_result = ?,
                last_answer_timestamp = ?,
                status = ?
            WHERE room_code = ?
        ");
        $upd->execute([
            json_encode($scores),
            $nextIdx,
            $nextRound,
            $nextTurnUserId,
            $nextTurnType,
            $bonusUserId,
            json_encode($resPayload),
            microtime(true),
            $nextStatus,
            $code
        ]);
    } catch (Exception $e) {}

    // Insert match log into DB
    try {
        $logId = 'log_' . bin2hex(random_bytes(4));
        $logStmt = $pdo->prepare("
            INSERT INTO combat_match_logs (
                id, room_code, round_number, question_number_in_round, turn_type,
                question_id, asked_to_user_id, main_selected_option, main_is_correct,
                main_time_used, points_awarded, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, ?, CURRENT_TIMESTAMP)
        ");
        $logStmt->execute([
            $logId, $code, (int)($room['current_round'] ?? 1), $currentIdx + 1,
            $turnType, $currentQ['id'] ?? '', (string)$userId, $selectedOption ?: 'TIMEOUT', $isCorrect ? 1 : 0,
            json_encode([(string)$userId => $pts])
        ]);
    } catch (Exception $e) {}

    echo json_encode($resPayload);
    exit;
}

if ($action === 'start_game' || isset($data['start_game'])) {
    $code = strtoupper(trim($data['roomCode'] ?? ''));
    $userId = $data['userId'] ?? '';

    $stmt = $pdo->prepare("SELECT * FROM combat_rooms WHERE room_code = ? LIMIT 1");
    $stmt->execute([$code]);
    $room = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$room) {
        echo json_encode(['success' => false, 'message' => 'Room not found.']);
        exit;
    }

    $upd = $pdo->prepare("UPDATE combat_rooms SET status = 'playing' WHERE room_code = ?");
    $upd->execute([$code]);

    $players = json_decode($room['players'] ?? '[]', true);
    $scores = json_decode($room['scores'] ?? '{}', true);

    // Fetch Questions Pool from room or populate once
    $questionsPool = json_decode($room['questions_pool'] ?? '[]', true);
    if (empty($questionsPool)) {
        $pastQs = $pdo->prepare("SELECT id, text, a, b, c, d, correct_option, explanation FROM questions WHERE topic_id = ?");
        $pastQs->execute([$room['topic_id']]);
        $questionsPool = $pastQs->fetchAll(PDO::FETCH_ASSOC);
        if (empty($questionsPool)) {
            $fallback = $pdo->query("SELECT id, text, a, b, c, d, correct_option, explanation FROM questions LIMIT 40");
            $questionsPool = $fallback->fetchAll(PDO::FETCH_ASSOC);
        }
        shuffle($questionsPool);
    }
    $updPool = $pdo->prepare("UPDATE combat_rooms SET questions_pool = ?, current_round = 1, current_question_index = 0, current_turn_user_id = ?, turn_type = 'main', last_answer_result = NULL WHERE room_code = ?");
    $updPool->execute([json_encode($questionsPool), (string)($players[0]['userId'] ?? $userId), $code]);

    $roomState = [
        'roomCode' => $code,
        'roomName' => $room['room_name'],
        'courseId' => $room['course_id'],
        'topicId' => $room['topic_id'],
        'createdBy' => $room['created_by'],
        'mode' => $room['mode'],
        'questionsPerRound' => (int)$room['questions_per_round'],
        'totalRounds' => (int)$room['total_rounds'],
        'totalQuestions' => (int)$room['total_questions'],
        'status' => 'playing',
        'players' => $players,
        'questionsPool' => $questionsPool,
        'currentRound' => 1,
        'currentQuestionIndex' => 0,
        'currentTurnUserId' => $players[0]['userId'] ?? $userId,
        'scores' => $scores
    ];

    echo json_encode(['success' => true, 'room' => $roomState]);
    exit;
}

if ($action === 'validate_code' || isset($data['validate_code'])) {
    $code = strtoupper(trim($data['code'] ?? ''));

    if (!str_starts_with($code, 'PREMED-')) {
        echo json_encode(['valid' => false, 'message' => 'Invalid PREMED- code format.']);
        exit;
    }

    $stmt = $pdo->prepare("
        SELECT cr.*, c.code as course_code, t.name as topic_name, st.name as host_name
        FROM combat_rooms cr
        LEFT JOIN courses c ON cr.course_id = c.id
        LEFT JOIN topics t ON cr.topic_id = t.id
        LEFT JOIN students st ON cr.created_by = st.id
        WHERE cr.room_code = ? LIMIT 1
    ");
    $stmt->execute([$code]);
    $room = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$room) {
        echo json_encode(['valid' => false, 'message' => 'This PREMED- code does not exist. Check code.']);
        exit;
    }

    if (in_array($room['status'], ['finished', 'terminated'])) {
        echo json_encode(['valid' => false, 'message' => 'This room has finished or expired.']);
        exit;
    }

    $players = json_decode($room['players'] ?? '[]', true);
    $maxPlayers = ($room['mode'] === '2v1') ? 3 : 2;

    if (count($players) >= $maxPlayers) {
        echo json_encode(['valid' => false, 'message' => 'Room is full.']);
        exit;
    }

    echo json_encode([
        'valid' => true,
        'roomName' => $room['room_name'],
        'courseCode' => $room['course_code'] ?? 'Course',
        'topicName' => $room['topic_name'] ?? 'Topic',
        'hostName' => $room['host_name'] ?? 'Host',
        'mode' => $room['mode'],
        'questionsPerRound' => (int)$room['questions_per_round'],
        'totalRounds' => (int)$room['total_rounds']
    ]);
    exit;
}

echo json_encode(['success' => false, 'message' => 'Invalid endpoint action.']);
