<?php

namespace {
    // Global override for getallheaders in the AuthHelper namespace / test context
    if (!function_exists('getallheaders')) {
        function getallheaders(): array {
            return $GLOBALS['mock_headers'] ?? [];
        }
    }
}

namespace Tests {

    use PHPUnit\Framework\TestCase;
    use AuthHelper;
    use ReflectionClass;

    class AuthHelperTest extends TestCase
    {
        private string $originalJwtSecret;
        private string $originalAppEnv;
        private array $originalServer;

        protected function setUp(): void
        {
            parent::setUp();
            $this->originalJwtSecret = getenv('JWT_SECRET') ?: '';
            $this->originalAppEnv = getenv('APP_ENV') ?: '';
            $this->originalServer = $_SERVER;
            $GLOBALS['mock_headers'] = [];

            // Reset static cache in AuthHelper before each test
            $this->resetAuthHelperSecretKey();
        }

        protected function tearDown(): void
        {
            // Restore environment variables
            if ($this->originalJwtSecret !== '') {
                putenv("JWT_SECRET={$this->originalJwtSecret}");
            } else {
                putenv("JWT_SECRET");
            }

            if ($this->originalAppEnv !== '') {
                putenv("APP_ENV={$this->originalAppEnv}");
            } else {
                putenv("APP_ENV");
            }

            $_SERVER = $this->originalServer;
            unset($GLOBALS['mock_headers']);
            $this->resetAuthHelperSecretKey();
            parent::tearDown();
        }

        private function resetAuthHelperSecretKey(): void
        {
            $reflection = new ReflectionClass(AuthHelper::class);
            $property = $reflection->getProperty('secretKey');
            $property->setValue(null, null);
        }

        private function invokeGetSecretKey(): string
        {
            $reflection = new ReflectionClass(AuthHelper::class);
            $method = $reflection->getMethod('getSecretKey');
            return $method->invoke(null);
        }

        /**
         * Test secret key retrieval defaults and env override
         */
        public function testGetSecretKeyDefault(): void
        {
            putenv("JWT_SECRET");
            putenv("APP_ENV=development");
            $this->resetAuthHelperSecretKey();

            $key = $this->invokeGetSecretKey();
            $this->assertEquals('super-secret-first-class-freshers-vault-CHANGE-ME', $key);
        }

        public function testGetSecretKeyFromEnvironment(): void
        {
            putenv("JWT_SECRET=custom-test-secret-key-12345");
            $this->resetAuthHelperSecretKey();

            $key = $this->invokeGetSecretKey();
            $this->assertEquals('custom-test-secret-key-12345', $key);
        }

        /**
         * Test token generation format, signature and claims
         */
        public function testGenerateTokenStructureAndClaims(): void
        {
            putenv("JWT_SECRET=test-secret");
            $this->resetAuthHelperSecretKey();

            $payload = ['user_id' => 42, 'role' => 'student', 'nested' => ['a' => 1]];
            $token = AuthHelper::generateToken($payload, 3600);

            $parts = explode('.', $token);
            $this->assertCount(3, $parts, 'JWT should contain exactly 3 dot-separated parts');

            [$headerB64, $payloadB64, $sigB64] = $parts;

            // Decode Header
            $headerJson = base64_decode(str_replace(['-', '_'], ['+', '/'], $headerB64));
            $header = json_decode($headerJson, true);
            $this->assertEquals(['typ' => 'JWT', 'alg' => 'HS256'], $header);

            // Decode Payload
            $payloadDecodedJson = base64_decode(str_replace(['-', '_'], ['+', '/'], $payloadB64));
            $payloadDecoded = json_decode($payloadDecodedJson, true);

            $this->assertEquals(42, $payloadDecoded['user_id']);
            $this->assertEquals('student', $payloadDecoded['role']);
            $this->assertEquals(['a' => 1], $payloadDecoded['nested']);
            $this->assertArrayHasKey('iat', $payloadDecoded);
            $this->assertArrayHasKey('exp', $payloadDecoded);
            $this->assertEquals($payloadDecoded['iat'] + 3600, $payloadDecoded['exp']);
        }

        /**
         * Test verifyToken with standard valid Authorization header
         */
        public function testVerifyTokenSuccessWithStandardAuthorizationHeader(): void
        {
            putenv("JWT_SECRET=test-secret");
            $this->resetAuthHelperSecretKey();

            $payload = ['user_id' => 10, 'email' => 'student@example.com'];
            $token = AuthHelper::generateToken($payload, 3600);

            $GLOBALS['mock_headers'] = [
                'Authorization' => "Bearer {$token}"
            ];

            $verifiedPayload = AuthHelper::verifyToken();
            $this->assertNotNull($verifiedPayload);
            $this->assertEquals(10, $verifiedPayload['user_id']);
            $this->assertEquals('student@example.com', $verifiedPayload['email']);
        }

        /**
         * Test verifyToken with lowercase authorization header
         */
        public function testVerifyTokenSuccessWithLowercaseAuthorizationHeader(): void
        {
            putenv("JWT_SECRET=test-secret");
            $this->resetAuthHelperSecretKey();

            $payload = ['user_id' => 10, 'email' => 'student@example.com'];
            $token = AuthHelper::generateToken($payload, 3600);

            $GLOBALS['mock_headers'] = [
                'authorization' => "Bearer {$token}"
            ];

            $verifiedPayload = AuthHelper::verifyToken();
            $this->assertNotNull($verifiedPayload);
            $this->assertEquals(10, $verifiedPayload['user_id']);
        }

        /**
         * Test verifyToken fails when Authorization header is missing or invalid format
         */
        public function testVerifyTokenFailsWhenHeaderMissingOrInvalidFormat(): void
        {
            putenv("JWT_SECRET=test-secret");
            $this->resetAuthHelperSecretKey();

            // Missing header
            $GLOBALS['mock_headers'] = [];
            $this->assertNull(AuthHelper::verifyToken());

            // Header without Bearer prefix
            $GLOBALS['mock_headers'] = ['Authorization' => 'Basic dXNlcjpwYXNz'];
            $this->assertNull(AuthHelper::verifyToken());

            // Empty Bearer token
            $GLOBALS['mock_headers'] = ['Authorization' => 'Bearer '];
            $this->assertNull(AuthHelper::verifyToken());
        }

        /**
         * Test verifyToken fails when JWT format is invalid (not 3 parts)
         */
        public function testVerifyTokenFailsWithMalformedJwt(): void
        {
            putenv("JWT_SECRET=test-secret");
            $this->resetAuthHelperSecretKey();

            $GLOBALS['mock_headers'] = ['Authorization' => 'Bearer invalid.jwt.token.extrapart'];
            $this->assertNull(AuthHelper::verifyToken());

            $GLOBALS['mock_headers'] = ['Authorization' => 'Bearer invalid.jwt'];
            $this->assertNull(AuthHelper::verifyToken());
        }

        /**
         * Test verifyToken fails when signature is tampered with
         */
        public function testVerifyTokenFailsWithTamperedSignature(): void
        {
            putenv("JWT_SECRET=test-secret");
            $this->resetAuthHelperSecretKey();

            $payload = ['user_id' => 10];
            $token = AuthHelper::generateToken($payload, 3600);
            $parts = explode('.', $token);
            $parts[2] = 'tamperedSignature123';
            $tamperedToken = implode('.', $parts);

            $GLOBALS['mock_headers'] = ['Authorization' => "Bearer {$tamperedToken}"];
            $this->assertNull(AuthHelper::verifyToken());
        }

        /**
         * Test verifyToken fails when payload is tampered with after signing
         */
        public function testVerifyTokenFailsWithTamperedPayload(): void
        {
            putenv("JWT_SECRET=test-secret");
            $this->resetAuthHelperSecretKey();

            $payload = ['user_id' => 10, 'admin' => false];
            $token = AuthHelper::generateToken($payload, 3600);
            $parts = explode('.', $token);

            // Create a tampered payload with admin => true
            $tamperedPayloadJson = json_encode(['user_id' => 10, 'admin' => true, 'exp' => time() + 3600, 'iat' => time()]);
            $parts[1] = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($tamperedPayloadJson));
            $tamperedToken = implode('.', $parts);

            $GLOBALS['mock_headers'] = ['Authorization' => "Bearer {$tamperedToken}"];
            $this->assertNull(AuthHelper::verifyToken());
        }

        /**
         * Test verifyToken fails when signed with a different secret key
         */
        public function testVerifyTokenFailsWithDifferentSecret(): void
        {
            putenv("JWT_SECRET=secret-a");
            $this->resetAuthHelperSecretKey();
            $token = AuthHelper::generateToken(['user_id' => 10], 3600);

            // Change secret key for verification
            putenv("JWT_SECRET=secret-b");
            $this->resetAuthHelperSecretKey();

            $GLOBALS['mock_headers'] = ['Authorization' => "Bearer {$token}"];
            $this->assertNull(AuthHelper::verifyToken());
        }

        /**
         * Test verifyToken fails when token is expired
         */
        public function testVerifyTokenFailsWhenExpired(): void
        {
            putenv("JWT_SECRET=test-secret");
            $this->resetAuthHelperSecretKey();

            // Generate token expired 10 seconds ago
            $payload = ['user_id' => 10];
            $token = AuthHelper::generateToken($payload, -10);

            $GLOBALS['mock_headers'] = ['Authorization' => "Bearer {$token}"];
            $this->assertNull(AuthHelper::verifyToken());
        }

        /**
         * Test verifyToken with invalid JSON in payload
         */
        public function testVerifyTokenFailsWithInvalidPayloadJson(): void
        {
            putenv("JWT_SECRET=test-secret");
            $this->resetAuthHelperSecretKey();

            $headerB64 = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256'])));
            $invalidJsonB64 = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode('not-a-json-string'));
            $sig = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(hash_hmac('sha256', "{$headerB64}.{$invalidJsonB64}", "test-secret", true)));

            $jwt = "{$headerB64}.{$invalidJsonB64}.{$sig}";
            $GLOBALS['mock_headers'] = ['Authorization' => "Bearer {$jwt}"];

            $this->assertNull(AuthHelper::verifyToken());
        }

        /**
         * Test setCorsHeaders sets CORS headers for standard GET request
         */
        public function testSetCorsHeadersNonOptions(): void
        {
            $_SERVER['REQUEST_METHOD'] = 'GET';
            AuthHelper::setCorsHeaders();
            $this->assertTrue(true, 'setCorsHeaders executed without errors for GET request');
        }

        /**
         * Test getJsonInput method returns empty array on empty input
         */
        public function testGetJsonInputEmpty(): void
        {
            $result = AuthHelper::getJsonInput();
            $this->assertIsArray($result);
            $this->assertEmpty($result);
        }
    }
}
