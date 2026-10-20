<?php
/**
 * Student Login & Registration Portal
 * Premed Test Portal (Strict Validation Edition)
 */

$pageTitle = 'Sign In or Register';
require_once __DIR__ . '/config/db.php';

// If student is already logged in, redirect to home hub
if (!empty($_SESSION['student'])) {
    header('Location: index.php');
    exit;
}
if (!empty($_SESSION['admin'])) {
    header('Location: admin_dashboard.php');
    exit;
}

$error = !empty($_GET['error']) ? htmlspecialchars($_GET['error']) : null;
$success = !empty($_GET['success']) ? htmlspecialchars($_GET['success']) : null;
$activeTab = $_GET['tab'] ?? 'login'; // 'login', 'register'

// Stealth Faculty Portal Detection (Secret URL param or 60-day stealth cookie)
$portalParam = strtolower(trim($_GET['portal'] ?? ($_GET['access'] ?? ($_GET['gate'] ?? ($_GET['staff'] ?? '')))));
$hasSecretParam = in_array($portalParam, ['faculty', 'director', 'admin', 'apex', 'staff', 'dean', '1']);
$hasStealthCookie = !empty($_COOKIE['premed_admin_stealth']);
$isStealthUnlocked = $hasSecretParam || $hasStealthCookie || ($activeTab === 'admin');

if ($hasSecretParam) {
    $activeTab = 'admin';
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || 
               (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
    setcookie('premed_admin_stealth', '1', [
        'expires' => time() + (86400 * 60), // 60 days
        'path' => '/',
        'domain' => '',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
}

// Approved Department Whitelist
$allowedDepts = [
    'Medicine & Surgery',
    'Dentistry',
    'Physiotherapy',
    'Nursing',
    'NACON Nursing',
    'Radiography',
    'Pharmacology',
    'Pharmacy',
    'Medical Laboratory Science',
    'Physiology',
    'Anatomy',
    'Medical Biochemistry',
    'Public Health',
    'Other Medical / Health Sciences'
];

// Comprehensive Nigerian Banks Whitelist
$allowedBanks = [
    'Opay',
    'PalmPay',
    'Kuda Bank',
    'Moniepoint',
    'SmartCash PSB',
    'Access Bank',
    'GTBank',
    'FirstBank',
    'Zenith Bank',
    'UBA',
    'Stanbic IBTC',
    'Wema Bank',
    'FCMB',
    'Union Bank',
    'Fidelity Bank',
    'Polaris Bank',
    'Sterling Bank',
    'Ecobank',
    'Keystone Bank',
    'Unity Bank',
    'Providus Bank',
    'Jaiz Bank',
    'Taj Bank',
    'Heritage Bank',
    'Other Bank'
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? 'student_login';

    if ($action === 'admin_login') {
        $activeTab = 'admin';
        $isStealthUnlocked = true;

        $lockUntil = $_SESSION['admin_locked_until'] ?? 0;
        if (time() < $lockUntil) {
            $waitMin = ceil(($lockUntil - time()) / 60);
            $error = "Security Lockout: Too many failed administrator attempts. Please wait {$waitMin} minute(s) before trying again.";
        } else {
            $adminMatric = strtoupper(trim(str_replace([' ', '-', '/'], '', $_POST['admin_matric'] ?? $_POST['admin_email'] ?? '')));
            $adminPassword = trim($_POST['admin_password'] ?? '');

            $envPass = getenv('ADMIN_PASSWORD') ?: getenv('ADMIN_PASS');
            $envMatric = strtoupper(trim(getenv('ADMIN_MATRIC') ?: ''));

            if (empty($envPass) || empty($envMatric)) {
                $error = 'Admin authentication is not configured. Please set ADMIN_PASSWORD and ADMIN_MATRIC environment variables.';
            } elseif (empty($adminMatric) || empty($adminPassword)) {
                $error = 'Both Admin Matric Number and Password are required.';
            } elseif ($adminMatric === $envMatric && $adminPassword === $envPass) {
                unset($_SESSION['admin_fail_count'], $_SESSION['admin_locked_until']);
                $adminData = [
                    'matric_no' => $envMatric,
                    'email' => 'admin@premedportal.edu',
                    'name' => 'System Administrator',
                    'logged_in_at' => time()
                ];
                $_SESSION['admin'] = $adminData;
                set_admin_auth_cookie($adminData);
                session_write_close();
                header('Location: admin_dashboard.php');
                exit;
            } else {
                $_SESSION['admin_fail_count'] = ($_SESSION['admin_fail_count'] ?? 0) + 1;
                if ($_SESSION['admin_fail_count'] >= 5) {
                    $_SESSION['admin_locked_until'] = time() + 900; // 15-minute lockout
                    $error = 'Security Alert: Maximum failed attempts exceeded. Access has been locked for 15 minutes.';
                } else {
                    $remaining = 5 - $_SESSION['admin_fail_count'];
                    $error = "Invalid Administrator credentials. Access denied. ({$remaining} attempt(s) remaining).";
                }
            }
        }
    } elseif ($action === 'student_login') {
        $db = DB::connect();
        $activeTab = 'login';
        $rawMatric = $_POST['matric_no'] ?? '';
        $matricNo = strtoupper(trim(str_replace(' ', '', $rawMatric)));
        $cleanMatric = strtoupper(trim(str_replace([' ', '-', '/'], '', $rawMatric)));
        $password = trim($_POST['password'] ?? '');

        if (empty($matricNo)) {
            $error = 'Matric Number or JAMB Reg Number is required.';
        } elseif (strlen($matricNo) < 4) {
            $error = 'Please enter a valid Matric Number or JAMB Reg Number (minimum 4 characters).';
        } elseif (empty($password)) {
            $error = 'Password is required to sign in.';
        } else {
            $stmt = $db->prepare("
                SELECT * FROM students 
                WHERE UPPER(TRIM(COALESCE(matric_no, ''))) = ? 
                   OR UPPER(TRIM(COALESCE(matric_no, ''))) = ? 
                   OR REPLACE(REPLACE(REPLACE(UPPER(COALESCE(matric_no, '')), ' ', ''), '-', ''), '/', '') = ? 
                LIMIT 1
            ");
            $stmt->execute([$matricNo, $cleanMatric, $cleanMatric]);
            $student = $stmt->fetch();

            if (!$student) {
                $error = 'Matric / JAMB Reg Number "' . htmlspecialchars($matricNo) . '" is not registered yet. Please click the "Register" tab to create your account.';
                $activeTab = 'register';
            } else {
                $stored = trim($student['password'] ?? '');
                $valid = false;
                if (password_verify($password, $stored) || password_verify(trim($password), $stored)) {
                    $valid = true;
                } elseif ($stored === $password || $stored === trim($password)) {
                    $valid = true;
                    // Auto-upgrade plaintext to hash on successful login
                    $hashed = password_hash(trim($password), PASSWORD_DEFAULT);
                    $up = $db->prepare("UPDATE students SET password = ? WHERE id = ?");
                    $up->execute([$hashed, $student['id']]);
                    $student['password'] = $hashed;
                }
                if (!$valid) {
                    $error = 'Incorrect password credentials. Please verify your password and try again.';
                } else {
                    $_SESSION['student'] = $student;
                    set_student_auth_cookie($student);
                    session_write_close();
                    header('Location: index.php');
                    exit;
                }
            }
        }
    } elseif ($action === 'update_bank') {
        $db = DB::connect();
        $accountNumber = trim($_POST['account_number'] ?? '');
        $bank = trim($_POST['bank'] ?? '');
        $accountName = trim($_POST['account_name'] ?? '');
        $id = $_SESSION['student']['id'] ?? null;
        // Validate fields
        if (empty($accountNumber) || !preg_match('/^[0-9]{10,12}$/', $accountNumber)) {
            $error = 'Account Number is required and must be 10-12 digits.';
        } elseif (empty($bank) || mb_strlen($bank) < 2) {
            $error = 'Bank is required and must be at least 2 characters.';
        } elseif (empty($accountName) || mb_strlen($accountName) < 3) {
            $error = 'Full Account Name is required and must be at least 3 characters.';
        } else {
            $stmt = $db->prepare("UPDATE students SET account_number = ?, bank = ?, account_name = ? WHERE id = ?");
            $stmt->execute([$accountNumber, $bank, $accountName, $id]);
            // Refresh session data
            $stmt = $db->prepare("SELECT * FROM students WHERE id = ? LIMIT 1");
            $stmt->execute([$id]);
            $fresh = $stmt->fetch();
            if ($fresh) {
                $_SESSION['student'] = $fresh;
                set_student_auth_cookie($fresh);
                session_write_close();
            }
            $success = 'Banking details saved successfully.';
        }
    } elseif ($action === 'student_register') {
        $db = DB::connect();
        $activeTab = 'register';
        $name = trim($_POST['name'] ?? '');
        $rawMatric = $_POST['matric_no'] ?? '';
        $matricNo = strtoupper(trim(str_replace(' ', '', $rawMatric)));
        $cleanMatric = strtoupper(trim(str_replace([' ', '-', '/'], '', $rawMatric)));
        $department = trim($_POST['department'] ?? '');
        $phone = trim($_POST['phone'] ?? '');
        $password = trim($_POST['password'] ?? '');
        $confirmPassword = trim($_POST['confirm_password'] ?? '');

        // 1. Validate Full Name
        $nameWords = preg_split('/\s+/', $name, -1, PREG_SPLIT_NO_EMPTY);
        if (empty($name)) {
            $error = 'Full Name is required.';
        } elseif (mb_strlen($name) < 3) {
            $error = 'Full Name must be at least 3 characters long.';
        } elseif (count($nameWords) < 2) {
            $error = 'Please enter both your First Name and Surname (e.g. Adebayo Johnson).';
        }

        // 2. Validate Matric / JAMB Reg Number
        elseif (empty($matricNo)) {
            $error = 'Matric Number or JAMB Reg Number is required.';
        } elseif (strlen($matricNo) < 4 || strlen($matricNo) > 25) {
            $error = 'Matric Number or JAMB Reg Number must be between 4 and 25 characters long.';
        }

        // 3. Validate Department
        elseif (empty($department)) {
            $error = 'Please select your department from the dropdown list.';
        }

        // 4. Validate Phone Number (if provided)
        elseif (!empty($phone)) {
            $cleanPhone = preg_replace('/[\s\-\(\)]/', '', $phone);
            if (!preg_match('/^(\+?234|0)[789][01]\d{8}$/', $cleanPhone) && !preg_match('/^\d{10,14}$/', $cleanPhone)) {
                $error = 'Please enter a valid phone number (e.g. 08012345678).';
            }
        }

        // 5. Banking Details (OPTIONAL at registration)
        $accountNumber = trim($_POST['account_number'] ?? '');
        $bank = trim($_POST['bank'] ?? '');
        $accountName = trim($_POST['account_name'] ?? '');

        if (!$error && (!empty($accountNumber) || !empty($bank) || !empty($accountName))) {
            if (empty($accountNumber) || !preg_match('/^[0-9]{10,12}$/', $accountNumber)) {
                $error = 'If providing banking details, Account Number must be 10 to 12 digits.';
            } elseif (empty($bank) || mb_strlen($bank) < 2) {
                $error = 'If providing banking details, please select your bank.';
            } elseif (empty($accountName) || mb_strlen($accountName) < 3) {
                $error = 'If providing banking details, Full Account Name must be at least 3 characters.';
            }
        }

        // 6. Validate Password & Confirmation
        if (!$error) {
            if (empty($password)) {
                $error = 'Password is required.';
            } elseif (strlen($password) < 6) {
                $error = 'Password must be at least 6 characters long for security.';
            } elseif ($password !== $confirmPassword) {
                $error = 'Passwords do not match. Please ensure both password fields are identical.';
            }
        }

        // 7. Check Database for Existing Matric / JAMB Reg Number
        if (!$error) {
            $check = $db->prepare("
                SELECT id FROM students 
                WHERE UPPER(TRIM(COALESCE(matric_no, ''))) = ? 
                   OR UPPER(TRIM(COALESCE(matric_no, ''))) = ? 
                   OR REPLACE(REPLACE(REPLACE(UPPER(COALESCE(matric_no, '')), ' ', ''), '-', ''), '/', '') = ? 
                LIMIT 1
            ");
            $check->execute([$matricNo, $cleanMatric, $cleanMatric]);
            if ($check->fetch()) {
                $error = 'Matric / JAMB Reg Number "' . htmlspecialchars($matricNo) . '" is already registered. Please sign in below.';
                $activeTab = 'login';
            } else {
                try {
                    $id = bin2hex(random_bytes(12));
                    $hashedPassword = password_hash(trim($password), PASSWORD_DEFAULT);
                    $stmt = $db->prepare("
                        INSERT INTO students (id, name, matric_no, password, department, phone, account_number, bank, account_name, strength) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Clinical Sciences')
                    ");
                    $stmt->execute([
                        $id, 
                        $name, 
                        $matricNo, 
                        $hashedPassword, 
                        $department, 
                        $phone, 
                        $accountNumber ?: null, 
                        $bank ?: null, 
                        $accountName ?: null
                    ]);

                    $fetchNew = $db->prepare("SELECT * FROM students WHERE id = ? LIMIT 1");
                    $fetchNew->execute([$id]);
                    $newStudent = $fetchNew->fetch();

                    if ($newStudent) {
                        $_SESSION['student'] = $newStudent;
                        set_student_auth_cookie($newStudent);
                        session_write_close();
                        header('Location: index.php');
                        exit;
                    } else {
                        $error = 'Account was created but could not be immediately loaded. Please sign in with your matric number and password.';
                        $activeTab = 'login';
                    }
                } catch (Exception $e) {
                    $error = 'Registration could not be completed: ' . $e->getMessage();
                    $activeTab = 'register';
                }
            }
        }
    }
}

require_once __DIR__ . '/includes/header.php';
?>

<div class="min-h-[85vh] flex items-center justify-center px-4 py-8">
    <div class="max-w-md w-full bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-md">
        
        <!-- Brand Header with Secret Knock Trigger -->
        <div class="text-center mb-6">
            <div id="secretBrandLogo" class="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-teal-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-teal-900/20 mb-3 cursor-pointer select-none active:scale-95 transition-transform" title="">
                <i data-lucide="graduation-cap" class="w-6 h-6"></i>
            </div>
            <span id="secretKnockBadge" class="inline-block text-[10px] uppercase font-bold tracking-widest text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 mb-1 font-mono">Student Access</span>
            <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">PreMed Test Portal</h1>
            <p class="text-xs text-slate-500 mt-0.5">Practice tests, past questions, and study tools</p>
        </div>

        <!-- Mode Switch Tabs (Sign In / Register / Faculty [Stealth]) -->
        <div class="flex bg-slate-100 p-1 rounded-xl mb-6 text-xs font-bold text-slate-600">
            <button type="button" id="tabLoginBtn" onclick="showTab('login')" class="flex-1 py-2 rounded-lg transition-all <?= $activeTab === 'login' ? 'bg-white shadow-xs text-teal-800 font-extrabold' : 'hover:text-slate-900' ?>">
                Sign In
            </button>
            <button type="button" id="tabRegisterBtn" onclick="showTab('register')" class="flex-1 py-2 rounded-lg transition-all <?= $activeTab === 'register' ? 'bg-white shadow-xs text-teal-800 font-extrabold' : 'hover:text-slate-900' ?>">
                Register
            </button>
            <button type="button" id="tabAdminBtn" onclick="showTab('admin')" class="flex-1 py-2 rounded-lg transition-all <?= $isStealthUnlocked ? '' : 'hidden' ?> <?= $activeTab === 'admin' ? 'bg-white shadow-xs text-rose-700 font-extrabold' : 'hover:text-slate-900 text-slate-500' ?>">
                <span class="flex items-center justify-center gap-1">
                    <i data-lucide="shield" class="w-3.5 h-3.5 text-rose-600"></i>
                    <span>Faculty</span>
                </span>
            </button>
        </div>

        <?php if ($error): ?>
        <div class="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <i data-lucide="alert-circle" class="w-4 h-4 shrink-0 text-rose-500 mt-0.5"></i>
            <span class="font-semibold leading-relaxed"><?= htmlspecialchars($error) ?></span>
        </div>
        <?php endif; ?>

        <?php if ($success): ?>
        <div class="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5">
            <i data-lucide="check-circle" class="w-4 h-4 shrink-0 text-emerald-500"></i>
            <span class="font-semibold leading-relaxed"><?= htmlspecialchars($success) ?></span>
        </div>
        <?php endif; ?>

        <!-- 1. STUDENT SIGN IN FORM -->
        <form id="loginSection" method="POST" action="" class="space-y-4 <?= $activeTab === 'login' ? '' : 'hidden' ?>">
            <input type="hidden" name="action" value="student_login">

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Matric Number / JAMB Reg Number</label>
                <input type="text" name="matric_no" required class="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500" placeholder="e.g. 2021/123456 or JAMB12345678" value="<?= htmlspecialchars($_POST['matric_no'] ?? '') ?>">
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password</label>
                <input type="password" name="password" required class="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500" placeholder="Enter your password">
            </div>

            <button type="submit" class="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-xl transition-colors text-sm shadow-sm">
                Sign In
            </button>
        </form>

        <!-- 2. STUDENT REGISTER FORM -->
        <form id="registerSection" method="POST" action="" class="space-y-4 <?= $activeTab === 'register' ? '' : 'hidden' ?>">
            <input type="hidden" name="action" value="student_register">

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Full Name</label>
                <input type="text" name="name" required class="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500" placeholder="First Name Surname" value="<?= htmlspecialchars($_POST['name'] ?? '') ?>">
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Matric Number / JAMB Reg Number</label>
                <input type="text" name="matric_no" required class="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500" placeholder="e.g. 2021/123456" value="<?= htmlspecialchars($_POST['matric_no'] ?? '') ?>">
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Department</label>
                <select name="department" required class="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 bg-white">
                    <option value="">Select Department</option>
                    <?php foreach ($allowedDepts as $dept): ?>
                        <option value="<?= htmlspecialchars($dept) ?>" <?= (($_POST['department'] ?? '') === $dept) ? 'selected' : '' ?>><?= htmlspecialchars($dept) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Phone Number (Optional)</label>
                <input type="tel" name="phone" class="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500" placeholder="08012345678" value="<?= htmlspecialchars($_POST['phone'] ?? '') ?>">
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password</label>
                    <input type="password" name="password" required minlength="6" class="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500" placeholder="Min 6 chars">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Confirm</label>
                    <input type="password" name="confirm_password" required class="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500" placeholder="Repeat">
                </div>
            </div>

            <!-- Optional Banking -->
            <details class="text-xs">
                <summary class="cursor-pointer text-teal-700 font-semibold">Add Banking Details (Optional)</summary>
                <div class="mt-3 space-y-3 pt-2 border-t border-slate-100">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Account Number</label>
                        <input type="text" name="account_number" class="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl" placeholder="10-12 digits" value="<?= htmlspecialchars($_POST['account_number'] ?? '') ?>">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Bank</label>
                        <select name="bank" class="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white">
                            <option value="">Select Bank</option>
                            <?php foreach ($allowedBanks as $b): ?>
                                <option value="<?= htmlspecialchars($b) ?>" <?= (($_POST['bank'] ?? '') === $b) ? 'selected' : '' ?>><?= htmlspecialchars($b) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Account Name</label>
                        <input type="text" name="account_name" class="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl" placeholder="Full name on account" value="<?= htmlspecialchars($_POST['account_name'] ?? '') ?>">
                    </div>
                </div>
            </details>

            <button type="submit" class="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-xl transition-colors text-sm shadow-sm">
                Create Account
            </button>
        </form>

        <!-- 3. ADMIN / FACULTY LOGIN FORM -->
        <form id="adminSection" method="POST" action="" class="space-y-4 <?= $activeTab === 'admin' ? '' : 'hidden' ?>">
            <input type="hidden" name="action" value="admin_login">

            <div class="text-center mb-2">
                <span class="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                    <i data-lucide="shield" class="w-3.5 h-3.5"></i>
                    Faculty / Admin Access
                </span>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Admin Matric / Email</label>
                <input type="text" name="admin_matric" required class="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500" placeholder="Configured admin identifier" value="<?= htmlspecialchars($_POST['admin_matric'] ?? '') ?>">
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password</label>
                <input type="password" name="admin_password" required class="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500" placeholder="Admin password">
            </div>

            <button type="submit" class="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-xl transition-colors text-sm shadow-sm">
                Admin Sign In
            </button>
        </form>

    </div>
</div>

<script>
function showTab(tab) {
    document.getElementById('loginSection').classList.toggle('hidden', tab !== 'login');
    document.getElementById('registerSection').classList.toggle('hidden', tab !== 'register');
    document.getElementById('adminSection').classList.toggle('hidden', tab !== 'admin');
    document.getElementById('tabLoginBtn').className = 'flex-1 py-2 rounded-lg transition-all ' + (tab === 'login' ? 'bg-white shadow-xs text-teal-800 font-extrabold' : 'hover:text-slate-900');
    document.getElementById('tabRegisterBtn').className = 'flex-1 py-2 rounded-lg transition-all ' + (tab === 'register' ? 'bg-white shadow-xs text-teal-800 font-extrabold' : 'hover:text-slate-900');
    document.getElementById('tabAdminBtn').className = 'flex-1 py-2 rounded-lg transition-all ' + (tab === 'admin' ? 'bg-white shadow-xs text-rose-700 font-extrabold' : 'hover:text-slate-900 text-slate-500');
}
// Secret knock on logo to unlock admin tab
let knockCount = 0;
let knockTimer = null;
document.getElementById('secretBrandLogo')?.addEventListener('click', function() {
    knockCount++;
    clearTimeout(knockTimer);
    knockTimer = setTimeout(() => { knockCount = 0; }, 1500);
    if (knockCount >= 5) {
        document.getElementById('tabAdminBtn').classList.remove('hidden');
        document.getElementById('secretKnockBadge').textContent = 'Faculty Unlocked';
        knockCount = 0;
    }
});
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>