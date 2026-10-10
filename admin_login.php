<?php
/**
 * Instructor & Administrator Login
 * Premed Test Portal (PHP Edition)
 */

require_once __DIR__ . '/config/db.php';

// Strict Localhost-Only Security Restriction
$remoteAddr = $_SERVER['REMOTE_ADDR'] ?? '';
$httpHost = $_SERVER['HTTP_HOST'] ?? '';
$isLocal = in_array($remoteAddr, ['127.0.0.1', '::1', 'localhost']) || 
           str_starts_with($httpHost, 'localhost') || 
           str_starts_with($httpHost, '127.0.0.1');

if (!empty(getenv('VERCEL')) || !empty($_ENV['VERCEL']) || !$isLocal) {
    http_response_code(403);
    die('<!DOCTYPE html><html><head><title>403 Forbidden</title></head><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;"><div style="background:#fff;padding:40px;border-radius:24px;box-shadow:0 10px 25px rgba(0,0,0,0.05);text-align:center;max-width:440px;"><h2 style="color:#e11d48;margin:0 0 10px 0;">403 - Restricted Access</h2><p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 20px 0;">Administrative controls are strictly isolated from the public cloud and can only be accessed locally on the administrator\'s computer (localhost).</p><a href="login.php" style="display:inline-block;padding:10px 20px;border-radius:12px;background:#4f46e5;color:#fff;text-decoration:none;font-size:13px;font-weight:bold;">Return to Student Portal</a></div></body></html>');
}

header('Location: admin_dashboard.php');
exit;
