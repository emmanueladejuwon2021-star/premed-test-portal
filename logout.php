<?php
/**
 * Logout Handler
 * Premed Test Portal (PHP Edition)
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/includes/auth_helper.php';

$_SESSION = [];
session_destroy();

clear_student_auth_cookie();
clear_admin_auth_cookie();

header('Location: login.php');
exit;
