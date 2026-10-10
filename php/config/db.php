<?php
/**
 * Database Configuration & PDO Handler
 * Premed Test Portal (Option 1: SQLite with MySQL fallback)
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

class DB {
    private static ?PDO $pdo = null;

    public static function connect(): PDO {
        if (self::$pdo === null) {
            // Check if user explicitly wants MySQL via environment variables
            $mysqlHost = getenv('DB_HOST');
            
            if ($mysqlHost) {
                // Connect via MySQL
                $port = getenv('DB_PORT') ?: '3306';
                $dbname = getenv('DB_NAME') ?: 'premed_portal';
                $user = getenv('DB_USER') ?: 'root';
                $pass = getenv('DB_PASS') !== false ? getenv('DB_PASS') : '';

                $dsn = "mysql:host={$mysqlHost};port={$port};dbname={$dbname};charset=utf8mb4";
                $options = [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ];

                try {
                    self::$pdo = new PDO($dsn, $user, $pass, $options);
                    return self::$pdo;
                } catch (PDOException $e) {
                    // Fall back to SQLite if MySQL fails
                }
            }

            // OPTION 1: Zero-Setup SQLite Database File
            $possibleSqlitePaths = [
                __DIR__ . '/../premed_portal.sqlite',
                __DIR__ . '/../../premed_portal.sqlite',
                dirname(__DIR__) . '/premed_portal.sqlite',
                'premed_portal.sqlite'
            ];

            $sqlitePath = null;
            foreach ($possibleSqlitePaths as $p) {
                if (file_exists($p)) {
                    $sqlitePath = $p;
                    break;
                }
            }

            if (!$sqlitePath) {
                $sqlitePath = __DIR__ . '/../premed_portal.sqlite';
            }

            try {
                self::$pdo = new PDO("sqlite:" . $sqlitePath, null, null, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_TIMEOUT => 30
                ]);

                // Enable SQLite foreign keys & WAL mode
                self::$pdo->exec("PRAGMA foreign_keys = ON;");
            } catch (PDOException $e) {
                die("
                <div style='font-family:sans-serif;max-width:600px;margin:50px auto;padding:24px;border:1px solid #f87171;background:#fef2f2;border-radius:12px;color:#991b1b;'>
                    <h2 style='margin-top:0;'>SQLite Database Error</h2>
                    <p>Unable to initialize SQLite database at <code>" . htmlspecialchars($sqlitePath) . "</code></p>
                    <p style='font-family:monospace;background:#fee2e2;padding:8px;border-radius:6px;font-size:13px;'>" . htmlspecialchars($e->getMessage()) . "</p>
                </div>");
            }
        }
        return self::$pdo;
    }
}
