<?php
/**
 * Real-Time Live Proctoring Frame Receiver & Warning Dispatcher
 * Premed Test Portal - Cloud Proctoring Engine
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'ready']);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

$sessionId = $data['session_id'] ?? '';
$frame = $data['frame'] ?? '';
$switches = isset($data['tab_switches']) ? (int)$data['tab_switches'] : null;

if (!empty($sessionId)) {
    try {
        $db = DB::connect();

        // 1. Check for any pending proctor warning from administrator
        $wStmt = $db->prepare("SELECT proctor_warning FROM exam_sessions WHERE id = ? LIMIT 1");
        $wStmt->execute([$sessionId]);
        $row = $wStmt->fetch();
        $warning = $row['proctor_warning'] ?? null;

        // 2. Update latest frame and timestamp in Turso Cloud DB
        if (!empty($frame)) {
            if ($switches !== null) {
                $uStmt = $db->prepare("
                    UPDATE exam_sessions SET 
                        latest_frame = ?, 
                        tab_switches = ?,
                        updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                ");
                $uStmt->execute([$frame, $switches, $sessionId]);
            } else {
                $uStmt = $db->prepare("
                    UPDATE exam_sessions SET 
                        latest_frame = ?, 
                        updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                ");
                $uStmt->execute([$frame, $sessionId]);
            }
        }

        // If warning was read, clear it so it doesn't trigger multiple alerts
        if (!empty($warning)) {
            $cStmt = $db->prepare("UPDATE exam_sessions SET proctor_warning = NULL WHERE id = ?");
            $cStmt->execute([$sessionId]);
        }

        echo json_encode([
            'status' => 'ok',
            'warning' => $warning
        ]);
        exit;
    } catch (Exception $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        exit;
    }
}

echo json_encode(['status' => 'no_session']);
