<?php
/**
 * Database Configuration & PDO Handler
 * Premed Test Portal (PHP + SQLite)
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

class DB {
    private static ?PDO $pdo = null;

    public static function connect(): PDO {
        if (self::$pdo === null) {
            $sqlitePath = __DIR__ . '/../premed_portal.sqlite';
            if (!file_exists($sqlitePath)) {
                $sqlitePath = dirname(__DIR__) . '/premed_portal.sqlite';
            }

            try {
                self::$pdo = new PDO("sqlite:" . $sqlitePath, null, null, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_TIMEOUT => 30
                ]);
                self::$pdo->exec("PRAGMA foreign_keys = ON;");
            } catch (PDOException $e) {
                die("SQLite Database Connection Error: " . htmlspecialchars($e->getMessage()));
            }
        }
        return self::$pdo;
    }
}
