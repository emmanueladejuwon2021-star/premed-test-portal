<?php
/**
 * Authentication and Serverless Session Persistence Helper
 * Apex PreMed Portal (Vercel Serverless Edition)
 */

if (!function_exists('get_auth_secret')) {
    function get_auth_secret(): string {
        $key = getenv('TURSO_AUTH_TOKEN') ?: (getenv('TURSO_TOKEN') ?: 'premed_secure_portal_salt_2026_key');
        return hash('sha256', $key . '_premed_salt');
    }
}

if (!function_exists('set_student_auth_cookie')) {
    function set_student_auth_cookie(array $student): void {
        $secret = get_auth_secret();
        $payload = json_encode([
            'id' => $student['id'],
            'matric_no' => $student['matric_no'] ?? '',
            'exp' => time() + (86400 * 14) // 14 days
        ]);
        $b64 = rtrim(strtr(base64_encode($payload), '+/', '-_'), '=');
        $sig = hash_hmac('sha256', $b64, $secret);
        $token = $b64 . '.' . $sig;

        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || 
                   (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

        setcookie('premed_student_auth', $token, [
            'expires' => time() + (86400 * 14),
            'path' => '/',
            'domain' => '',
            'secure' => $isHttps,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
    }
}

if (!function_exists('clear_student_auth_cookie')) {
    function clear_student_auth_cookie(): void {
        setcookie('premed_student_auth', '', [
            'expires' => time() - 3600,
            'path' => '/',
            'domain' => '',
            'secure' => false,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
    }
}

if (!function_exists('set_admin_auth_cookie')) {
    function set_admin_auth_cookie(array $admin): void {
        $secret = get_auth_secret();
        $payload = json_encode([
            'matric_no' => $admin['matric_no'] ?? '250811024',
            'email' => $admin['email'] ?? 'admin@premedportal.edu',
            'exp' => time() + (86400 * 7)
        ]);
        $b64 = rtrim(strtr(base64_encode($payload), '+/', '-_'), '=');
        $sig = hash_hmac('sha256', $b64, $secret);
        $token = $b64 . '.' . $sig;

        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || 
                   (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

        setcookie('premed_admin_auth', $token, [
            'expires' => time() + (86400 * 7),
            'path' => '/',
            'domain' => '',
            'secure' => $isHttps,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
    }
}

if (!function_exists('clear_admin_auth_cookie')) {
    function clear_admin_auth_cookie(): void {
        setcookie('premed_admin_auth', '', [
            'expires' => time() - 3600,
            'path' => '/',
            'domain' => '',
            'secure' => false,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
    }
}

if (!function_exists('restore_auth_sessions')) {
    function restore_auth_sessions($db): void {
        $secret = get_auth_secret();

        // 1. Restore Student Session if missing
        if (empty($_SESSION['student']) && !empty($_COOKIE['premed_student_auth'])) {
            $token = $_COOKIE['premed_student_auth'];
            $parts = explode('.', $token);
            if (count($parts) === 2) {
                [$b64, $sig] = $parts;
                $expectedSig = hash_hmac('sha256', $b64, $secret);
                if (hash_equals($expectedSig, $sig)) {
                    $json = base64_decode(strtr($b64, '-_', '+/'));
                    $data = json_decode($json, true);
                    if (is_array($data) && !empty($data['id']) && (!isset($data['exp']) || $data['exp'] > time())) {
                        try {
                            $stmt = $db->prepare("SELECT * FROM students WHERE id = ? LIMIT 1");
                            $stmt->execute([$data['id']]);
                            $found = $stmt->fetch();
                            if ($found) {
                                $_SESSION['student'] = $found;
                            }
                        } catch (Exception $e) {
                            // Turso query failed, ignore
                        }
                    }
                }
            }
        }

        // 2. Restore Admin Session if missing
        if (empty($_SESSION['admin']) && !empty($_COOKIE['premed_admin_auth'])) {
            $token = $_COOKIE['premed_admin_auth'];
            $parts = explode('.', $token);
            if (count($parts) === 2) {
                [$b64, $sig] = $parts;
                $expectedSig = hash_hmac('sha256', $b64, $secret);
                if (hash_equals($expectedSig, $sig)) {
                    $json = base64_decode(strtr($b64, '-_', '+/'));
                    $data = json_decode($json, true);
                    if (is_array($data) && (!isset($data['exp']) || $data['exp'] > time())) {
                        $_SESSION['admin'] = [
                            'matric_no' => $data['matric_no'] ?? '250811024',
                            'email' => $data['email'] ?? 'admin@premedportal.edu',
                            'name' => 'System Administrator',
                            'logged_in_at' => time()
                        ];
                    }
                }
            }
        }
    }
}
