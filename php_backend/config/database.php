<?php
/**
 * Database Configuration & PDO Connection
 * Premed Test Portal (Option 1: SQLite with MySQL fallback)
 */

class Database {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            $mysqlHost = getenv('DB_HOST');
            if ($mysqlHost) {
                $dbName = getenv('DB_NAME') ?: 'premed_portal';
                $user = getenv('DB_USER') ?: 'root';
                $pass = getenv('DB_PASS') !== false ? getenv('DB_PASS') : '';
                $port = getenv('DB_PORT') ?: 3306;

                $dsn = "mysql:host={$mysqlHost};port={$port};dbname={$dbName};charset=utf8mb4";
                try {
                    self::$instance = new PDO($dsn, $user, $pass, [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        PDO::ATTR_EMULATE_PREPARES => false
                    ]);
                    return self::$instance;
                } catch (PDOException $e) {
                    // Fall back to SQLite
                }
            }

            // SQLite zero-setup path
            $possibleSqlitePaths = [
                __DIR__ . '/../../premed_portal.sqlite',
                __DIR__ . '/../premed_portal.sqlite',
                __DIR__ . '/../../php/premed_portal.sqlite',
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
                $sqlitePath = __DIR__ . '/../../premed_portal.sqlite';
            }

            try {
                self::$instance = new PDO("sqlite:" . $sqlitePath, null, null, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                ]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(['error' => 'SQLite connection failed: ' . $e->getMessage()]);
                exit;
            }
        }

        return self::$instance;
    }
}
