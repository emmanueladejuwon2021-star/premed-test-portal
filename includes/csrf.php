<?php
/**
 * CSRF Protection Helper
 * Premed Test Portal — Production Grade
 *
 * Usage:
 *   - Call csrf_field() inside every <form method="POST">
 *   - Call csrf_verify() at the top of every POST handler
 *   - Tokens are stored in the session and validated with hash_equals
 *   - Token is regenerated after successful verification (one-time use)
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function csrf_generate_token(): string {
    if (empty($_SESSION['csrf_token']) || empty($_SESSION['csrf_token_time']) || (time() - $_SESSION['csrf_token_time']) > 3600) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        $_SESSION['csrf_token_time'] = time();
    }
    return $_SESSION['csrf_token'];
}

function csrf_token(): string {
    return csrf_generate_token();
}

function csrf_field(): string {
    $token = htmlspecialchars(csrf_token(), ENT_QUOTES, 'UTF-8');
    return '<input type="hidden" name="csrf_token" value="' . $token . '">';
}

function csrf_verify(bool $regenerate = true): bool {
    $submitted = $_POST['csrf_token'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $stored = $_SESSION['csrf_token'] ?? '';

    if ($submitted === '' || $stored === '' || !hash_equals($stored, $submitted)) {
        return false;
    }

    if ($regenerate) {
        unset($_SESSION['csrf_token'], $_SESSION['csrf_token_time']);
        csrf_generate_token(); // generate fresh token for next request
    }

    return true;
}

function csrf_abort(): void {
    http_response_code(403);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html><head><title>Security Error</title></head><body style="font-family:system-ui,sans-serif;padding:2rem;text-align:center;">';
    echo '<h1>403 Forbidden</h1><p>Invalid or missing security token. Please refresh the page and try again.</p>';
    echo '<p><a href="javascript:history.back()">Go back</a></p></body></html>';
    exit;
}
