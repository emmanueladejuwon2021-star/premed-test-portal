<?php
/**
 * Front Controller & API Gateway
 * Premed Test Portal (PHP + MySQL Backend)
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/auth.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/CourseController.php';
require_once __DIR__ . '/controllers/SimulationController.php';

// Handle CORS Pre-flight and headers
AuthHelper::setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';

// Normalize path: strip query parameters and subfolder prefixes
$parsedUrl = parse_url($requestUri, PHP_URL_PATH);
$path = preg_replace('#^.*?/api/#', '/api/', $parsedUrl);

// If URL didn't contain /api/, clean leading path
if (strpos($path, '/api/') !== 0) {
    $scriptDir = dirname($_SERVER['SCRIPT_NAME']);
    if ($scriptDir !== '/' && strpos($path, $scriptDir) === 0) {
        $path = substr($path, strlen($scriptDir));
    }
    if (!str_starts_with($path, '/api/')) {
        $path = '/api/' . ltrim($path, '/');
    }
}

// ----------------------------------------------------
// Router Dispatcher
// ----------------------------------------------------

try {
    // Health & DB diagnostics
    if ($path === '/api/health' && $method === 'GET') {
        echo json_encode(['status' => 'ok', 'runtime' => 'PHP ' . PHP_VERSION, 'timestamp' => date('c')]);
        exit;
    }

    if ($path === '/api/db-test' && $method === 'GET') {
        $db = Database::getConnection();
        $coursesCount = $db->query("SELECT COUNT(*) FROM courses")->fetchColumn();
        $questionsCount = $db->query("SELECT COUNT(*) FROM questions")->fetchColumn();
        echo json_encode([
            'status' => 'Connected via PDO',
            'database' => 'MySQL',
            'courses' => (int)$coursesCount,
            'questions' => (int)$questionsCount
        ]);
        exit;
    }

    // Auth Routes
    if ($path === '/api/auth/student-access' && $method === 'POST') {
        AuthController::studentAccess();
        exit;
    }

    if ($path === '/api/admin/login' && $method === 'POST') {
        AuthController::adminLogin();
        exit;
    }

    if ($path === '/api/student/update' && $method === 'POST') {
        AuthController::updateProfile();
        exit;
    }

    // Course & Question Routes
    if ($path === '/api/courses' && $method === 'GET') {
        CourseController::getAll();
        exit;
    }

    if (preg_match('#^/api/courses/([^/]+)/topics$#', $path, $matches) && $method === 'GET') {
        CourseController::getTopics($matches[1]);
        exit;
    }

    if (preg_match('#^/api/courses/([^/]+)$#', $path, $matches) && $method === 'GET') {
        CourseController::getById($matches[1]);
        exit;
    }

    // Simulation / Exam Routes
    if ($path === '/api/simulation/start' && $method === 'POST') {
        SimulationController::startTest();
        exit;
    }

    if ($path === '/api/simulation/submit' && $method === 'POST') {
        SimulationController::submitTest();
        exit;
    }

    if ($path === '/api/simulation/history' && $method === 'GET') {
        SimulationController::getHistory();
        exit;
    }

    if ($path === '/api/leaderboard' && $method === 'GET') {
        SimulationController::getLeaderboard();
        exit;
    }

    // Default 404
    http_response_code(404);
    echo json_encode(['error' => 'API Endpoint not found in PHP backend.', 'path' => $path, 'method' => $method]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
