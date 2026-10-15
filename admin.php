<?php
/**
 * Administrator & Instructor Console Gateway
 * Premed Test Portal (Enterprise Production Edition)
 */

require_once __DIR__ . '/config/db.php';

// Verify Admin Session
if (empty($_SESSION['admin'])) {
    header('Location: login.php?tab=admin');
    exit;
}

header('Location: admin_dashboard.php');
exit;

