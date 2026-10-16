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
require_once __DIR__ . '/../includes/auth_helper.php';

class DB {
    private static mixed $connection = null;
    private static bool $migrated = false;

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
            self::ensureSchema(self::$connection);
            restore_auth_sessions(self::$connection);
            return self::$connection;
        } catch (Exception $e) {
            die("Turso Cloud Database Connection Error: " . htmlspecialchars($e->getMessage()));
        }
    }

    public static function ensureSchema(TursoPDO $pdo): void {
        if (self::$migrated) {
            return;
        }
        self::$migrated = true;

        // 1. Ensure students columns exist
        $studentCols = [
            'email' => 'TEXT',
            'phone' => 'TEXT',
            'account_number' => 'TEXT',
            'bank' => 'TEXT',
            'account_name' => 'TEXT',
            'strength' => 'TEXT'
        ];
        foreach ($studentCols as $col => $type) {
            try {
                $pdo->exec("ALTER TABLE students ADD COLUMN {$col} {$type}");
            } catch (Exception $e) {}
        }

        // 2. Ensure results proctoring columns exist
        $resultCols = [
            'tab_switches' => 'INTEGER DEFAULT 0',
            'is_flagged_cheating' => 'INTEGER DEFAULT 0',
            'cheating_log' => 'TEXT'
        ];
        foreach ($resultCols as $col => $type) {
            try {
                $pdo->exec("ALTER TABLE results ADD COLUMN {$col} {$type}");
            } catch (Exception $e) {}
        }

        // 3. Ensure courses lock status exists
        try {
            $pdo->exec("ALTER TABLE courses ADD COLUMN is_locked INTEGER DEFAULT 0");
        } catch (Exception $e) {}

        // 4. Ensure questions explanation & diagram columns exist
        try {
            $pdo->exec("ALTER TABLE questions ADD COLUMN diagram_url TEXT");
        } catch (Exception $e) {}
        try {
            $pdo->exec("ALTER TABLE questions ADD COLUMN explanation TEXT");
        } catch (Exception $e) {}

        // 5. Ensure exam_sessions table exists
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS exam_sessions (
                id TEXT PRIMARY KEY,
                student_id TEXT,
                course_id TEXT,
                test_id TEXT,
                status TEXT DEFAULT 'IN_PROGRESS',
                tab_switches INTEGER DEFAULT 0,
                cheating_log TEXT,
                total_score INTEGER DEFAULT 0,
                total_questions INTEGER DEFAULT 0,
                percentage REAL DEFAULT 0,
                grade TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )");
        } catch (Exception $e) {}
    }
}

// Auto-initialize DB connection, run schema check, and restore sessions if credentials are present
if (!empty(getenv('TURSO_AUTH_TOKEN')) || !empty(getenv('TURSO_TOKEN'))) {
    try {
        DB::connect();
    } catch (Exception $e) {
        // Silently continue if DB connection cannot be established immediately
    }
}
