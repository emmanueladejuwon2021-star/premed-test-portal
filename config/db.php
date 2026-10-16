<?php
/**
 * Database Configuration & Production Turso / SQLite Handler
 * Premed Test Portal (Enterprise Production Edition)
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/turso.php';
require_once __DIR__ . '/../includes/csrf.php';

class DB {
    private static mixed $connection = null;

    public static function connect(): mixed {
        if (self::$connection !== null) {
            return self::$connection;
        }

        $defaultUrl = 'https://premed-test-portal-emmanueladejuwon2021-star.aws-us-east-1.turso.io';
        $defaultToken = ''; // Token must be provided via TURSO_AUTH_TOKEN environment variable

        $url = getenv('TURSO_DATABASE_URL') ?: (getenv('TURSO_URL') ?: $defaultUrl);
        $token = getenv('TURSO_AUTH_TOKEN') ?: getenv('TURSO_TOKEN');

        // Normalize libsql:// to https://
        if ($url) {
            $url = preg_replace('/^libsql:\/\//i', 'https://', $url);
        }

        if (empty($url) || empty($token)) {
            die("Turso Cloud Database credentials missing.");
        }

        try {
            self::$connection = new TursoPDO($url, $token);
            return self::$connection;
        } catch (Exception $e) {
            die("Turso Cloud Database Connection Error: " . htmlspecialchars($e->getMessage()));
        }
    }
}
