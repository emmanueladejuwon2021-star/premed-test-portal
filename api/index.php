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

if (in_array($cleanPath, ['admin', 'admin_dashboard', 'admin_login'])) {
    http_response_code(403);
    die('<!DOCTYPE html><html><head><title>403 Forbidden</title></head><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;"><div style="background:#fff;padding:40px;border-radius:24px;box-shadow:0 10px 25px rgba(0,0,0,0.05);text-align:center;max-width:440px;"><h2 style="color:#e11d48;margin:0 0 10px 0;">403 - Restricted Access</h2><p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 20px 0;">Administrative controls are strictly isolated from the public cloud and can only be accessed locally on the administrator\'s computer (localhost).</p><a href="/login.php" style="display:inline-block;padding:10px 20px;border-radius:12px;background:#4f46e5;color:#fff;text-decoration:none;font-size:13px;font-weight:bold;">Return to Student Portal</a></div></body></html>');
}

// Allowed standalone scripts
$allowedScripts = [
    'index',
    'login',
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
    'sync_live_data',
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
