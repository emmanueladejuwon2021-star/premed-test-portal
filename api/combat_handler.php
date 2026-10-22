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

try {
    $pdo = DB::connect();

    // Auto-migrate extended combat columns if not already present
    $schemaCols = [
        'questions_pool' => 'TEXT',
        'used_question_ids' => 'TEXT',
        'current_round' => 'INTEGER DEFAULT 1',
        'current_question_index' => 'INTEGER DEFAULT 0',
        'current_turn_user_id' => 'TEXT',
        'turn_type' => "TEXT DEFAULT 'main'",
        'bonus_user_id' => 'TEXT',
        'last_answer_result' => 'TEXT',
        'last_answer_timestamp' => 'REAL DEFAULT 0',
        'turn_start_timestamp' => 'REAL DEFAULT 0',
        'turn_duration' => 'INTEGER DEFAULT 30',
        'allow_bonus' => 'INTEGER DEFAULT 1',
        'scores' => 'TEXT',
        'players' => 'TEXT'
    ];
    foreach ($schemaCols as $col => $def) {
        try {
            $pdo->exec("ALTER TABLE combat_rooms ADD COLUMN {$col} {$def}");
        } catch (Exception $e) {}
    }

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
    $questionsPerRound = max(1, (int)($data['questionsPerRound'] ?? 4));
    $totalRounds = max(1, (int)($data['totalRounds'] ?? 4));
    $allowBonus = isset($data['allowBonus']) ? ($data['allowBonus'] ? 1 : 0) : 1;

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

    $totalQuestions = max(1, $questionsPerRound * $totalRounds);

    // Fetch Questions Pool
    $pastQs = $pdo->prepare("SELECT id, text, a, b, c, d, correct_option, explanation FROM questions WHERE topic_id = ?");
    $pastQs->execute([$topicId]);
    $questionsPool = $pastQs->fetchAll(PDO::FETCH_ASSOC);

    if (empty($questionsPool)) {
        $fallback = $pdo->query("SELECT id, text, a, b, c, d, correct_option, explanation FROM questions LIMIT 100");
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

    $combatCols = [
        'questions_pool' => 'TEXT',
        'used_question_ids' => 'TEXT',
        'current_round' => 'INTEGER DEFAULT 1',
        'current_question_index' => 'INTEGER DEFAULT 0',
        'current_turn_user_id' => 'TEXT',
        'turn_type' => "TEXT DEFAULT 'main'",
        'bonus_user_id' => 'TEXT',
        'last_answer_result' => 'TEXT',
        'last_answer_timestamp' => 'REAL DEFAULT 0',
        'allow_bonus' => 'INTEGER DEFAULT 1',
        'scores' => 'TEXT',
        'players' => 'TEXT'
    ];
    foreach ($combatCols as $col => $def) {
        try {
            $pdo->exec("ALTER TABLE combat_rooms ADD COLUMN {$col} {$def}");
        } catch (Exception $e) {}
    }

    $roomId = 'room_' . bin2hex(random_bytes(6));
    try {
    $stmt = $pdo->prepare("
        INSERT INTO combat_rooms (
            id, room_code, room_name, course_id, topic_id, created_by, mode,
            questions_per_round, total_rounds, total_questions, allow_bonus, status, players, scores,
            questions_pool, current_round, current_question_index, current_turn_user_id, turn_type,
            created_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'waiting', ?, ?, ?, 1, 0, ?, 'main', CURRENT_TIMESTAMP, datetime('now', '+1 day'))
    ");
    $stmt->execute([
        $roomId, $code, $roomName, $courseId, $topicId, $userId, $mode,
        $questionsPerRound, $totalRounds, $totalQuestions, $allowBonus,
        json_encode([$hostPlayer]), json_encode([(string)$userId => 0]),
        json_encode($finalPool), (string)$userId
    ]);
    } catch (Exception $ex) {
        // Fallback: base insert without extended columns if table has legacy schema
        $fallbackStmt = $pdo->prepare("
            INSERT INTO combat_rooms (
                id, room_code, room_name, course_id, topic_id, created_by, mode,
                questions_per_round, total_rounds, total_questions, allow_bonus, status, players, scores,
                created_at, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'waiting', ?, ?, CURRENT_TIMESTAMP, datetime('now', '+1 day'))
        ");
        $fallbackStmt->execute([
            $roomId, $code, $roomName, $courseId, $topicId, $userId, $mode,
            $questionsPerRound, $totalRounds, $totalQuestions, $allowBonus,
            json_encode([$hostPlayer]), json_encode([(string)$userId => 0])
        ]);

        try {
            $upd = $pdo->prepare("UPDATE combat_rooms SET questions_pool = ?, current_turn_user_id = ?, turn_type = 'main' WHERE id = ?");
            $upd->execute([json_encode($finalPool), (string)$userId, $roomId]);
        } catch (Exception $ignored) {}
    }

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
        'allowBonus' => ((int)$allowBonus === 1),
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

/**
 * Atomic Server-Authoritative Combat Answer Processing Engine
 * Handles scoring, fair turn switching, bonus passing, round tracking, and timeout resolution
 */
function processCombatAnswer($pdo, $room, $code, $userId, $selectedOption, $questionId = null) {
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
    // 1. If main turn correct -> question complete -> advance to next question, deterministic turn alternation
    // 2. If main turn wrong & bonus allowed -> same question -> bonus turn for opponent (HIDE CORRECT OPTION)
    // 3. If bonus turn (either correct or wrong) -> question complete -> REVEAL correct option -> advance to next question
    $allowBonus = (int)($room['allow_bonus'] ?? 1);
    $pCount = max(1, count($players));

    $nextIdx = $currentIdx;
    $nextTurnType = 'main';
    $bonusUserId = null;
    $hideCorrectOption = false;
    $correctOptionToSend = $currentQ ? $currentQ['correct_option'] : 'A';
    $explanationToSend = $currentQ ? $currentQ['explanation'] : '';

    if ($turnType === 'main') {
        if ($isCorrect) {
            // Main player answered correctly: advance to next question
            $nextIdx = $currentIdx + 1;
            $nextTurnType = 'main';
            $nextTurnUserId = (string)($players[$nextIdx % $pCount]['userId'] ?? $opponentId);
            $hideCorrectOption = false;
        } else {
            // Main player answered wrongly!
            if ($allowBonus && $pCount > 1) {
                // Opponent gets bonus turn on the SAME question!
                // CRUCIAL: HIDE the correct answer so opponent does not cheat!
                $nextIdx = $currentIdx;
                $nextTurnType = 'bonus';
                $nextTurnUserId = $opponentId;
                $bonusUserId = $opponentId;
                $hideCorrectOption = true;
                $correctOptionToSend = null;
                $explanationToSend = null;
            } else {
                // Bonus disabled: question is finished!
                // Reveal answer and advance to next question
                $nextIdx = $currentIdx + 1;
                $nextTurnType = 'main';
                $nextTurnUserId = (string)($players[$nextIdx % $pCount]['userId'] ?? $opponentId);
                $hideCorrectOption = false;
            }
        }
    } else {
        // Bonus turn answered (either correct or wrong): BOTH players have now attempted!
        // Question is finished: REVEAL answer and advance to next question
        $nextIdx = $currentIdx + 1;
        $nextTurnType = 'main';
        $nextTurnUserId = (string)($players[$nextIdx % $pCount]['userId'] ?? $opponentId);
        $hideCorrectOption = false;
    }

    $totalRounds = max(1, (int)($room['total_rounds'] ?? 4));
    $qPerRound = max(1, (int)($room['questions_per_round'] ?? 4));
    $totalQuestions = max(1, $qPerRound * $totalRounds);
    $isFinished = ($nextIdx >= $totalQuestions);
    $nextRound = $isFinished ? $totalRounds : min($totalRounds, (int)floor($nextIdx / $qPerRound) + 1);
    $nextStatus = $isFinished ? 'finished' : 'playing';

    $now = microtime(true);
    $reviewDuration = 2.0;
    $nextTurnStart = $now + $reviewDuration;
    $nextTurnDuration = ($nextTurnType === 'bonus') ? 15 : 30;

    $resPayload = [
        'isCorrect' => $isCorrect,
        'correctOption' => $correctOptionToSend,
        'hideCorrectOption' => $hideCorrectOption,
        'selectedOption' => $selectedOption,
        'explanation' => $explanationToSend,
        'pointsAwarded' => $pts,
        'scores' => $scores,
        'turnUserId' => (string)($room['current_turn_user_id'] ?? $userId),
        'userId' => (string)$userId,
        'turnType' => $turnType,
        'questionIndex' => $currentIdx,
        'nextQuestionIndex' => $nextIdx,
        'nextTurnType' => $nextTurnType,
        'nextTurnUserId' => $nextTurnUserId,
        'roundNumber' => $nextRound,
        'totalRounds' => $totalRounds,
        'totalQuestions' => $totalQuestions,
        'questionsPerRound' => $qPerRound,
        'status' => $nextStatus,
        'bothMissed' => ($turnType === 'bonus' && !$isCorrect),
        'timestamp' => $now,
        'serverTime' => $now,
        'reviewDuration' => $reviewDuration,
        'nextTurnStart' => $nextTurnStart,
        'nextTurnDuration' => $nextTurnDuration,
        'timeRemaining' => $nextTurnDuration
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
                turn_start_timestamp = ?,
                turn_duration = ?,
                status = ?,
                total_questions = ?
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
            $now,
            $nextTurnStart,
            $nextTurnDuration,
            $nextStatus,
            $totalQuestions,
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
            $logId, $code, min($totalRounds, max(1, (int)floor($currentIdx / $qPerRound) + 1)), (($currentIdx % $qPerRound) + 1),
            $turnType, $currentQ['id'] ?? '', (string)$userId, $selectedOption ?: 'TIMEOUT', $isCorrect ? 1 : 0,
            json_encode([(string)$userId => $pts])
        ]);
    } catch (Exception $e) {}

    return $resPayload;
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

    $now = microtime(true);
    $turnStart = (float)($room['turn_start_timestamp'] ?? 0);
    $turnDuration = (int)($room['turn_duration'] ?? 30);
    $lastAnsTs = (float)($room['last_answer_timestamp'] ?? 0);
    $elapsedSinceAnswer = ($lastAnsTs > 0) ? ($now - $lastAnsTs) : 999;
    $isReviewingAnswer = ($lastAnsTs > 0 && $elapsedSinceAnswer < 2.0 && !empty($room['last_answer_result']));

    // Server-side watchdog anti-freeze:
    // If turn duration exceeded by more than 1.5s grace period and not in review overlay, auto-timeout
    if ($room['status'] === 'playing' && !$isReviewingAnswer && $turnStart > 0 && ($now >= ($turnStart + $turnDuration + 1.5))) {
        $activeUserId = (string)($room['current_turn_user_id'] ?? ($players[0]['userId'] ?? ''));
        if ($room['turn_type'] === 'bonus' && !empty($room['bonus_user_id'])) {
            $activeUserId = (string)$room['bonus_user_id'];
        }
        $lastAnswerResult = processCombatAnswer($pdo, $room, $code, $activeUserId, 'TIMEOUT');

        // Reload fresh room record after timeout
        $stmt = $pdo->prepare("SELECT * FROM combat_rooms WHERE room_code = ? LIMIT 1");
        $stmt->execute([$code]);
        $room = $stmt->fetch(PDO::FETCH_ASSOC);

        $now = microtime(true);
        $turnStart = (float)($room['turn_start_timestamp'] ?? 0);
        $turnDuration = (int)($room['turn_duration'] ?? 30);
        $lastAnsTs = (float)($room['last_answer_timestamp'] ?? 0);
        $elapsedSinceAnswer = ($lastAnsTs > 0) ? ($now - $lastAnsTs) : 999;
        $isReviewingAnswer = ($lastAnsTs > 0 && $elapsedSinceAnswer < 2.0 && !empty($room['last_answer_result']));
        $scores = json_decode($room['scores'] ?? '{}', true);
    }

    $totalRounds = max(1, (int)($room['total_rounds'] ?? 4));
    $qPerRound = max(1, (int)($room['questions_per_round'] ?? 4));
    $totalQuestions = max(1, $qPerRound * $totalRounds);
    $currentQIdx = (int)($room['current_question_index'] ?? 0);
    $isFinished = ($room['status'] === 'finished' || $currentQIdx >= $totalQuestions);
    $currentRound = min($totalRounds, max(1, (int)floor($currentQIdx / $qPerRound) + 1));

    if ($isFinished && $room['status'] !== 'finished') {
        try {
            $updFin = $pdo->prepare("UPDATE combat_rooms SET status = 'finished', current_round = ?, total_questions = ? WHERE room_code = ?");
            $updFin->execute([$totalRounds, $totalQuestions, $code]);
        } catch (Exception $e) {}
    }

    $timeRemaining = 0;
    if ($isReviewingAnswer) {
        $timeRemaining = $turnDuration;
    } else if ($turnStart > 0) {
        $timeRemaining = max(0, (int)ceil(($turnStart + $turnDuration) - $now));
    } else {
        $timeRemaining = $turnDuration;
    }

    $roomState = [
        'roomCode' => $code,
        'roomName' => $room['room_name'],
        'courseId' => $room['course_id'],
        'topicId' => $room['topic_id'],
        'createdBy' => (string)$room['created_by'],
        'mode' => $room['mode'],
        'questionsPerRound' => $qPerRound,
        'totalRounds' => $totalRounds,
        'allowBonus' => ((int)($room['allow_bonus'] ?? 1) === 1),
        'totalQuestions' => $totalQuestions,
        'status' => $isFinished ? 'finished' : $room['status'],
        'currentRound' => min($totalRounds, $currentRound),
        'currentQuestionIndex' => $currentQIdx,
        'currentTurnUserId' => (string)($room['current_turn_user_id'] ?? ($players[0]['userId'] ?? '')),
        'turnType' => $room['turn_type'] ?? 'main',
        'bonusUserId' => $room['bonus_user_id'] ?? null,
        'lastAnswerResult' => $lastAnswerResult,
        'lastAnswerTimestamp' => $lastAnsTs,
        'turnStartTimestamp' => $turnStart,
        'turnDuration' => $turnDuration,
        'isReviewingAnswer' => $isReviewingAnswer,
        'timeRemaining' => $timeRemaining,
        'serverTime' => $now,
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
        'allowBonus' => ((int)($room['allow_bonus'] ?? 1) === 1),
        'totalQuestions' => (int)$room['total_questions'],
        'allowBonus' => ((int)($room['allow_bonus'] ?? 1) === 1),
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

    $resPayload = processCombatAnswer($pdo, $room, $code, $userId, $selectedOption, $questionId);
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

    $now = microtime(true);
    $updPool = $pdo->prepare("
        UPDATE combat_rooms 
        SET status = 'playing',
            questions_pool = ?,
            current_round = 1,
            current_question_index = 0,
            current_turn_user_id = ?,
            turn_type = 'main',
            bonus_user_id = NULL,
            last_answer_result = NULL,
            last_answer_timestamp = 0,
            turn_start_timestamp = ?,
            turn_duration = 30
        WHERE room_code = ?
    ");
    $updPool->execute([json_encode($questionsPool), (string)($players[0]['userId'] ?? $userId), $now, $code]);

    $totalRounds = max(1, (int)($room['total_rounds'] ?? 4));
    $qPerRound = max(1, (int)($room['questions_per_round'] ?? 4));
    $totalQuestions = max(1, $qPerRound * $totalRounds);

    $roomState = [
        'roomCode' => $code,
        'roomName' => $room['room_name'],
        'courseId' => $room['course_id'],
        'topicId' => $room['topic_id'],
        'createdBy' => $room['created_by'],
        'mode' => $room['mode'],
        'questionsPerRound' => $qPerRound,
        'totalRounds' => $totalRounds,
        'allowBonus' => ((int)($room['allow_bonus'] ?? 1) === 1),
        'totalQuestions' => $totalQuestions,
        'status' => 'playing',
        'players' => $players,
        'questionsPool' => $questionsPool,
        'currentRound' => 1,
        'currentQuestionIndex' => 0,
        'currentTurnUserId' => $players[0]['userId'] ?? $userId,
        'turnType' => 'main',
        'turnStartTimestamp' => $now,
        'turnDuration' => 30,
        'timeRemaining' => 30,
        'isReviewingAnswer' => false,
        'serverTime' => $now,
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
        'totalRounds' => (int)$room['total_rounds'],
        'allowBonus' => ((int)($room['allow_bonus'] ?? 1) === 1)
    ]);
    exit;
}

    echo json_encode(['success' => false, 'message' => 'Invalid endpoint action.']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
    exit;
}
