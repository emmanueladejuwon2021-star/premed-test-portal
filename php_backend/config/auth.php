<?php
/**
 * Auth & JWT Helpers
 * Premed Test Portal (PHP + MySQL Backend)
 */

class AuthHelper {
    private static string $secretKey = 'super-secret-first-class-freshers-vault';

    public static function setCorsHeaders(): void {
        header("Access-Control-Allow-Origin: *");
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
        
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit;
        }
    }

    public static function getJsonInput(): array {
        $raw = file_get_contents('php://input');
        if (empty($raw)) return [];
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    public static function generateToken(array $payload, int $expirySeconds = 86400): string {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload['exp'] = time() + $expirySeconds;
        $payload['iat'] = time();
        $payloadEncoded = json_encode($payload);

        $base64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payloadEncoded));

        $signature = hash_hmac('sha256', "{$base64Header}.{$base64Payload}", self::$secretKey, true);
        $base64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        return "{$base64Header}.{$base64Payload}.{$base64Signature}";
    }

    public static function verifyToken(): ?array {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

        if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return null;
        }

        $jwt = trim($matches[1]);
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) return null;

        [$headerB64, $payloadB64, $sigB64] = $parts;
        $expectedSig = hash_hmac('sha256', "{$headerB64}.{$payloadB64}", self::$secretKey, true);
        $expectedSigB64 = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($expectedSig));

        if (!hash_equals($expectedSigB64, $sigB64)) {
            return null;
        }

        $payloadJson = base64_decode(str_replace(['-', '_'], ['+', '/'], $payloadB64));
        $payload = json_decode($payloadJson, true);

        if (!is_array($payload) || (isset($payload['exp']) && $payload['exp'] < time())) {
            return null;
        }

        return $payload;
    }
}
