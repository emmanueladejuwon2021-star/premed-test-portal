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

            // If running on Vercel or a read-only environment, copy to /tmp for write permissions
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
