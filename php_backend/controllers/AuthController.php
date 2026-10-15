<?php
/**
 * Auth Controller
 * Premed Test Portal (PHP + MySQL Backend)
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/auth.php';

class AuthController {
    public static function studentAccess(): void {
        $db = Database::getConnection();
        $input = AuthHelper::getJsonInput();

        $matricNo = strtoupper(trim(str_replace(' ', '', $input['matric_no'] ?? '')));
        if (empty($matricNo)) {
            http_response_code(400);
            echo json_encode(['error' => 'Matriculation number is required']);
            return;
        }

        // Check if student exists
        $stmt = $db->prepare("SELECT * FROM students WHERE matric_no = ? LIMIT 1");
        $stmt->execute([$matricNo]);
        $student = $stmt->fetch();

        if ($student) {
            // Existing student login - require password
            $password = trim($input['password'] ?? '');
            if (empty($password)) {
                http_response_code(401);
                echo json_encode(['error' => 'Password is required']);
                return;
            }

            $stored = $student['password'];
            $valid = false;
            if (strlen($stored) > 50 && str_starts_with($stored, '$2y$')) {
                $valid = password_verify($password, $stored);
            } else {
                $valid = ($stored === $password);
                if ($valid) {
                    $hashed = password_hash($password, PASSWORD_DEFAULT);
                    $up = $db->prepare("UPDATE students SET password = ? WHERE id = ?");
                    $up->execute([$hashed, $student['id']]);
                    $student['password'] = $hashed;
                }
            }

            if (!$valid) {
                http_response_code(401);
                echo json_encode(['error' => 'Invalid password credentials']);
                return;
            }

            // Generate session token
            $token = AuthHelper::generateToken([
                'id' => $student['id'],
                'matric_no' => $student['matric_no'],
                'name' => $student['name'],
                'role' => 'student'
            ]);

            unset($student['password']);
            echo json_encode([
                'token' => $token,
                'student' => $student,
                'isNew' => false
            ]);
            return;
        }

        // New student registration
        $name = trim($input['name'] ?? '');
        $password = trim($input['password'] ?? '');
        if (empty($password)) {
            $password = '123456'; // temporary default, will be hashed
        }
        $department = trim($input['department'] ?? 'Medicine & Surgery');
        $strength = trim($input['strength'] ?? 'Biology');
        $phone = trim($input['phone'] ?? '');
        $email = trim($input['email'] ?? '');

        if (empty($name)) {
            http_response_code(400);
            echo json_encode(['error' => 'Student full name is required for first-time registration']);
            return;
        }

        $id = bin2hex(random_bytes(12));
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $insert = $db->prepare("INSERT INTO students (id, name, email, matric_no, phone, password, department, strength) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $insert->execute([$id, $name, $email, $matricNo, $phone, $hashedPassword, $department, $strength]);

        $token = AuthHelper::generateToken([
            'id' => $id,
            'matric_no' => $matricNo,
            'name' => $name,
            'role' => 'student'
        ]);

        $newStudent = [
            'id' => $id,
            'name' => $name,
            'email' => $email,
            'matric_no' => $matricNo,
            'phone' => $phone,
            'department' => $department,
            'strength' => $strength
        ];

        echo json_encode([
            'token' => $token,
            'student' => $newStudent,
            'isNew' => true
        ]);
    }

    public static function adminLogin(): void {
        $input = AuthHelper::getJsonInput();
        $submittedMatric = strtolower(trim($input['matricNo'] ?? ''));
        $submittedKey = trim($input['adminKey'] ?? '');

        $validAdminIds = [
            '250811024',
            'default-admin-key-first-class',
            'emmanueladejuwon2021@gmail.com',
            'emmanuel',
            'manuel',
            'admin'
        ];

        $validKeys = [
            '12345678',
            '20252026',
            'polymath-master-key',
            'default-admin-key-first-class'
        ];

        if (in_array($submittedMatric, $validAdminIds, true) && in_array($submittedKey, $validKeys, true)) {
            $token = AuthHelper::generateToken([
                'matric_no' => $submittedMatric,
                'role' => 'admin'
            ]);
            echo json_encode(['token' => $token, 'message' => 'Welcome Admin']);
            return;
        }

        http_response_code(401);
        echo json_encode(['error' => 'Invalid admin ID or access key']);
    }

    public static function updateProfile(): void {
        $user = AuthHelper::verifyToken();
        if (!$user || ($user['role'] ?? '') !== 'student') {
            http_response_code(403);
            echo json_encode(['error' => 'Authentication required']);
            return;
        }

        $input = AuthHelper::getJsonInput();
        $db = Database::getConnection();

        $stmt = $db->prepare("SELECT * FROM students WHERE id = ? LIMIT 1");
        $stmt->execute([$user['id']]);
        $student = $stmt->fetch();

        if (!$student) {
            http_response_code(404);
            echo json_encode(['error' => 'Student record not found']);
            return;
        }

        $name = trim($input['name'] ?? $student['name']);
        $department = trim($input['department'] ?? $student['department']);
        $phone = trim($input['phone'] ?? $student['phone']);
        $email = trim($input['email'] ?? $student['email']);
        $strength = trim($input['strength'] ?? $student['strength']);

        $update = $db->prepare("UPDATE students SET name = ?, department = ?, phone = ?, email = ?, strength = ? WHERE id = ?");
        $update->execute([$name, $department, $phone, $email, $strength, $user['id']]);

        $student['name'] = $name;
        $student['department'] = $department;
        $student['phone'] = $phone;
        $student['email'] = $email;
        $student['strength'] = $strength;
        unset($student['password']);

        echo json_encode([
            'success' => true,
            'message' => 'Profile updated successfully!',
            'student' => $student
        ]);
    }
}
