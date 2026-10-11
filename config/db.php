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

    const TURSO_URL = 'https://premed-test-portal-emmanueladejuwon2021-star.aws-us-east-1.turso.io';
    const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE3NDk0MzQsImlkIjoiMDFhMTJiNTYtZmEwMS03MmMzLWJlMjctYzRmMDhmMjkxNmJiIiwia2lkIjoiel90TE1SckVpVnk2a28xZ0tEbGc4RkgyUnpWUkJJd1FUcG05UV9PdXRhZyIsInJpZCI6IjNlZmQ3MDQ0LWU2ZTAtNDQ1NS05MGQ5LTY0N2EwNjlkZjcwMyJ9.08Klb4LcVxUkzyLgz6G8s6RnshFl7cMHpVKYaygdBcZpYI8jiyXtEQEw7TNoq66rRCta9ajGYxWiaUBCTs_zBA';

    public static function connect(): mixed {
        if (self::$connection !== null) {
            return self::$connection;
        }

        $url = getenv('TURSO_DATABASE_URL') ?: (getenv('TURSO_URL') ?: self::TURSO_URL);
        $token = getenv('TURSO_AUTH_TOKEN') ?: (getenv('TURSO_TOKEN') ?: self::TURSO_TOKEN);

        // Normalize libsql:// to https://
        $url = preg_replace('/^libsql:\/\//i', 'https://', $url);

        // 1. Connect to Turso Cloud DB (Primary)
        if (!empty($url) && !empty($token)) {
            try {
                $turso = new TursoPDO($url, $token);
                self::$connection = $turso;
                return self::$connection;
            } catch (Exception $e) {
                error_log("Turso Connection Notice: " . $e->getMessage() . " - Falling back to local store.");
            }
        }

        // 2. Resilient Local Fallback (SQLite)
        $sqlitePath = __DIR__ . '/../premed_portal.sqlite';
        if (!file_exists($sqlitePath)) {
            $sqlitePath = dirname(__DIR__) . '/premed_portal.sqlite';
        }

        if (getenv('VERCEL') || !empty($_ENV['VERCEL']) || (file_exists($sqlitePath) && !is_writable(dirname($sqlitePath)))) {
            $tmpDb = sys_get_temp_dir() . '/premed_portal.sqlite';
            if (!file_exists($tmpDb) || (file_exists($sqlitePath) && filesize($tmpDb) !== filesize($sqlitePath))) {
                if (file_exists($sqlitePath)) {
                    @copy($sqlitePath, $tmpDb);
                }
            }
            if (file_exists($tmpDb)) {
                $sqlitePath = $tmpDb;
            }
        }

        try {
            self::$connection = new PDO("sqlite:" . $sqlitePath, null, null, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT => 30
            ]);
            self::$connection->exec("PRAGMA foreign_keys = ON;");
            return self::$connection;
        } catch (PDOException $e) {
            die("Database Connection Error: " . htmlspecialchars($e->getMessage()));
        }
    }
}
