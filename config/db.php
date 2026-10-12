<?php
/**
 * Database Configuration & Production Turso / SQLite Handler
 * Premed Test Portal (Enterprise Production Edition)
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/turso.php';

class DB {
    private static mixed $connection = null;

    public static function connect(): mixed {
        if (self::$connection !== null) {
            return self::$connection;
        }

        $url = getenv('TURSO_DATABASE_URL') ?: getenv('TURSO_URL');
        $token = getenv('TURSO_AUTH_TOKEN') ?: getenv('TURSO_TOKEN');

        // Normalize libsql:// to https://
        if ($url) {
            $url = preg_replace('/^libsql:\/\//i', 'https://', $url);
        }

        if (empty($url) || empty($token)) {
            die("Turso Cloud Database credentials missing. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables.");
        }

        try {
            self::$connection = new TursoPDO($url, $token);
            return self::$connection;
        } catch (Exception $e) {
            die("Turso Cloud Database Connection Error: " . htmlspecialchars($e->getMessage()));
        }
    }
}
