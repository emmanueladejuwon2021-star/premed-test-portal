<?php
/**
 * Live Data Sync Endpoint (for Administrator synchronization)
 * Premed Test Portal
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');

require_once __DIR__ . '/config/db.php';

try {
    $db = DB::connect();

    // 1. Fetch Students
    $studentsStmt = $db->query("SELECT id, name, matric_no, password, department, phone, strength, created_at FROM students ORDER BY created_at DESC");
    $students = $studentsStmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. Fetch Results
    $resultsStmt = $db->query("
        SELECT r.*, s.name AS student_name, s.matric_no, c.code AS course_code 
        FROM results r
        LEFT JOIN students s ON r.student_id = s.id
        LEFT JOIN courses c ON r.course_id = c.id
        ORDER BY r.created_at DESC
        LIMIT 100
    ");
    $results = $resultsStmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Fetch Live & Recent Exam Sessions
    $sessionsStmt = $db->query("SELECT * FROM exam_sessions ORDER BY updated_at DESC LIMIT 60");
    $sessions = $sessionsStmt ? $sessionsStmt->fetchAll(PDO::FETCH_ASSOC) : [];

    echo json_encode([
        'status' => 'success',
        'count_students' => count($students),
        'count_results' => count($results),
        'count_sessions' => count($sessions),
        'students' => $students,
        'results' => $results,
        'sessions' => $sessions,
        'server_time' => date('c')
    ], JSON_PRETTY_PRINT);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
