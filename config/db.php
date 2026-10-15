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

        $defaultUrl = 'https://premed-test-portal-emmanueladejuwon2021-star.aws-us-east-1.turso.io';
        $defaultToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE3NDk0MzQsImlkIjoiMDFhMTJiNTYtZmEwMS03MmMzLWJlMjctYzRmMDhmMjkxNmJiIiwia2lkIjoiel90TE1SckVpVnk2a28xZ0tEbGc4RkgyUnpWUkJJd1FUcG05UV9PdXRhZyIsInJpZCI6IjNlZmQ3MDQ0LWU2ZTAtNDQ1NS05MGQ5LTY0N2EwNjlkZjcwMyJ9.08Klb4LcVxUkzyLgz6G8s6RnshFl7cMHpVKYaygdBcZpYI8jiyXtEQEw7TNoq66rRCta9ajGYxWiaUBCTs_zBA';

        $url = getenv('TURSO_DATABASE_URL') ?: (getenv('TURSO_URL') ?: $defaultUrl);
        $token = getenv('TURSO_AUTH_TOKEN') ?: (getenv('TURSO_TOKEN') ?: $defaultToken);

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
