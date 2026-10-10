<?php
/**
 * Vercel Serverless Entrypoint & Front Controller
 * Premed Test Portal
 */

$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($requestUri, PHP_URL_PATH);
$path = trim($path, '/');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Default route
if (empty($path)) {
    if (empty($_SESSION['student'])) {
        require __DIR__ . '/../login.php';
        exit;
    }
    require __DIR__ . '/../index.php';
    exit;
}

// Remove .php if present to find the base route
$cleanPath = preg_replace('/\.php$/', '', $path);

// Allowed standalone scripts
$allowedScripts = [
    'index',
    'login',
    'admin_login',
    'admin_dashboard',
    'admin',
    'courses',
    'practice',
    'readiness',
    'countdown',
    'exam',
    'submit_exam',
    'chill',
    'results',
    'history',
    'leaderboard',
    'profile',
    'combat',
    'active_study',
    'question_search',
    'logout'
];

if (in_array($cleanPath, $allowedScripts)) {
    $target = __DIR__ . '/../' . $cleanPath . '.php';
    if (file_exists($target)) {
        require $target;
        exit;
    }
}

// Direct file check
$directFile = __DIR__ . '/../' . $path;
if (file_exists($directFile) && is_file($directFile) && str_ends_with($directFile, '.php')) {
    require $directFile;
    exit;
}

// Fallback to Home Hub
require __DIR__ . '/../index.php';
