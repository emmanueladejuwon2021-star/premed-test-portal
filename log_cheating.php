<?php
/**
 * Real-Time Cheating & Infraction Logger
 * Premed Test Portal
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    exit(json_encode(['status' => 'ignored']));
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

$sessionId = $data['session_id'] ?? '';
$type = $data['type'] ?? 'TAB_SWITCH';
$count = isset($data['count']) ? (int)$data['count'] : 1;
$logJson = isset($data['log']) ? (is_string($data['log']) ? $data['log'] : json_encode($data['log'])) : '[]';

if (!empty($sessionId)) {
    try {
        $db = DB::connect();
        $stmt = $db->prepare("
            UPDATE exam_sessions SET 
                tab_switches = ?, 
                cheating_log = ?, 
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        ");
        $stmt->execute([$count, $logJson, $sessionId]);
        echo json_encode(['status' => 'logged', 'count' => $count]);
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        exit;
    }
}

echo json_encode(['status' => 'no_session']);
