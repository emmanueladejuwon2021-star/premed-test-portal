<?php
/**
 * Logout Handler
 * Premed Test Portal (PHP Edition)
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$_SESSION = [];
session_destroy();

header('Location: login.php');
exit;
