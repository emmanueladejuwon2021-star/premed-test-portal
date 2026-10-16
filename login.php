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
            $passMatch = ($adminPassword === '12345678' || $adminPassword === '123456789' || (!empty($envPass) && $adminPassword === $envPass));

            $envMatric = strtoupper(trim(getenv('ADMIN_MATRIC') ?: ''));
            $matricMatch = ($adminMatric === '250811024' || 
                            strtolower($adminMatric) === 'emmanueladejuwon2025@gmail.com' || 
                            (!empty($envMatric) && $adminMatric === $envMatric));

            if (empty($adminMatric) || empty($adminPassword)) {
                $error = 'Both Admin Matric Number and Password are required.';
            } elseif ($matricMatch && $passMatch) {
                unset($_SESSION['admin_fail_count'], $_SESSION['admin_locked_until']);
                $adminData = [
                    'matric_no' => '250811024',
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
            <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">PreMed Student Portal</h1>
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
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <i data-lucide="user-check" class="w-4 h-4"></i>
                    </span>
                    <input type="text" name="matric_no" required placeholder="e.g. 230911024 or 202412345678AB" minlength="4" maxlength="25" value="<?= htmlspecialchars($_POST['matric_no'] ?? '') ?>" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono uppercase bg-slate-50/50">
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password</label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <i data-lucide="lock" class="w-4 h-4"></i>
                    </span>
                    <input type="password" name="password" required placeholder="Enter your password" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50">
                </div>
            </div>

            <button type="submit" class="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2">
                <span>Sign In</span>
                <i data-lucide="arrow-right" class="w-4 h-4"></i>
            </button>

            <div class="pt-2 text-center">
                <p class="text-xs text-slate-500">
                    New here? 
                    <button type="button" onclick="showTab('register')" class="text-teal-700 font-bold hover:underline">Create an account</button>
                </p>
            </div>
        </form>

        <!-- 2. STUDENT REGISTRATION FORM (NEW STUDENTS WITH STRICT VALIDATION) -->
        <form id="registerSection" method="POST" action="" onsubmit="return validateRegisterForm()" class="space-y-4 <?= $activeTab === 'register' ? '' : 'hidden' ?>">
            <input type="hidden" name="action" value="student_register">

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Full Name <span class="text-rose-500">*</span></label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <i data-lucide="id-card" class="w-4 h-4"></i>
                    </span>
                    <input type="text" name="name" id="regName" required minlength="4" placeholder="Firstname & Surname" value="<?= htmlspecialchars($_POST['name'] ?? '') ?>" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>
                <span class="text-[10px] text-slate-400 mt-0.5 block">Must include both first name and surname</span>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Matric Number / JAMB Reg Number <span class="text-rose-500">*</span></label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <i data-lucide="hash" class="w-4 h-4"></i>
                    </span>
                    <input type="text" name="matric_no" id="regMatric" required minlength="4" maxlength="25" placeholder="e.g. 230911024, 202412345678AB" value="<?= htmlspecialchars($_POST['matric_no'] ?? '') ?>" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase">
                </div>
                <span class="text-[10px] text-slate-400 mt-0.5 block">Use your university Matric No or JAMB Registration Number</span>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Department <span class="text-rose-500">*</span></label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <i data-lucide="building" class="w-4 h-4"></i>
                    </span>
                    <select name="department" id="regDept" required class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                        <option value="" disabled <?= empty($_POST['department']) ? 'selected' : '' ?>>-- Select your Department --</option>
                        <?php foreach ($allowedDepts as $dept): ?>
                        <option value="<?= htmlspecialchars($dept) ?>" <?= (($_POST['department'] ?? '') === $dept) ? 'selected' : '' ?>><?= htmlspecialchars($dept) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Phone Number (Optional)</label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <i data-lucide="phone" class="w-4 h-4"></i>
                    </span>
                    <input type="tel" name="phone" id="regPhone" placeholder="08012345678" maxlength="15" value="<?= htmlspecialchars($_POST['phone'] ?? '') ?>" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>
            </div>

            <!-- Banking Details (optional, required for cash prizes) -->
            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Account Number (Optional)</label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <i data-lucide="credit-card" class="w-4 h-4"></i>
                    </span>
                    <input type="text" name="account_number" id="regAccountNumber" placeholder="e.g. 0123456789" maxlength="12" value="<?= htmlspecialchars($_POST['account_number'] ?? '') ?>" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
                </div>
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Bank (Optional)</label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <i data-lucide="building-2" class="w-4 h-4"></i>
                    </span>
                    <select name="bank" id="regBank" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                        <option value="" <?= empty($_POST['bank']) ? 'selected' : '' ?>>-- Select your Bank (Optional) --</option>
                        <?php foreach ($allowedBanks as $b): ?>
                        <option value="<?= htmlspecialchars($b) ?>" <?= (($_POST['bank'] ?? '') === $b) ? 'selected' : '' ?>><?= htmlspecialchars($b) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Full Account Name (Optional)</label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <i data-lucide="user" class="w-4 h-4"></i>
                    </span>
                    <input type="text" name="account_name" id="regAccountName" placeholder="e.g. John Doe" value="<?= htmlspecialchars($_POST['account_name'] ?? '') ?>" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password <span class="text-rose-500">*</span></label>
                    <div class="relative">
                        <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                            <i data-lucide="key" class="w-4 h-4"></i>
                        </span>
                        <input type="password" name="password" id="regPass" required minlength="6" placeholder="Min. 6 characters" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Confirm Password <span class="text-rose-500">*</span></label>
                    <div class="relative">
                        <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                            <i data-lucide="check-check" class="w-4 h-4"></i>
                        </span>
                        <input type="password" name="confirm_password" id="regConfirmPass" required minlength="6" placeholder="Repeat password" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    </div>
                </div>
            </div>

            <div id="jsClientError" class="hidden p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold"></div>

            <button type="submit" class="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-emerald-100 transition-all flex items-center justify-center gap-2">
                <span>Create Account</span>
                <i data-lucide="check" class="w-4 h-4"></i>
            </button>

            <div class="pt-2 text-center">
                <p class="text-xs text-slate-500">
                    Already have an account? 
                    <button type="button" onclick="showTab('login')" class="text-indigo-600 font-bold hover:underline">Sign In here</button>
                </p>
            </div>
        </form>

        <!-- 3. ADMINISTRATOR SIGN IN FORM -->
        <form id="adminSection" method="POST" action="" class="space-y-4 <?= $activeTab === 'admin' ? '' : 'hidden' ?>">
            <input type="hidden" name="action" value="admin_login">

            <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
                <i data-lucide="shield-alert" class="w-4 h-4 shrink-0 text-amber-600 mt-0.5"></i>
                <span class="leading-relaxed">Restricted to authorized faculty administrators and test coordinators only.</span>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Admin Matric / ID</label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <i data-lucide="shield" class="w-4 h-4"></i>
                    </span>
                    <input type="text" name="admin_matric" required placeholder="e.g. 250811024" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50/50 font-mono">
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password</label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <i data-lucide="lock" class="w-4 h-4"></i>
                    </span>
                    <input type="password" name="admin_password" required placeholder="Enter admin password" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50/50">
                </div>
            </div>

            <button type="submit" class="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2">
                <i data-lucide="shield-check" class="w-4 h-4"></i>
                <span>Sign In as Admin</span>
            </button>
        </form>

    </div>
</div>

<script>
function showTab(type) {
    const loginSec = document.getElementById('loginSection');
    const registerSec = document.getElementById('registerSection');
    const adminSec = document.getElementById('adminSection');
    const tabLogin = document.getElementById('tabLoginBtn');
    const tabRegister = document.getElementById('tabRegisterBtn');
    const tabAdmin = document.getElementById('tabAdminBtn');

    loginSec.classList.add('hidden');
    registerSec.classList.add('hidden');
    adminSec.classList.add('hidden');

    tabLogin.className = "flex-1 py-2 rounded-lg transition-all hover:text-slate-900";
    tabRegister.className = "flex-1 py-2 rounded-lg transition-all hover:text-slate-900";
    if (tabAdmin) {
        const isHidden = tabAdmin.classList.contains('hidden');
        tabAdmin.className = "flex-1 py-2 rounded-lg transition-all hover:text-slate-900 text-slate-500" + (isHidden ? " hidden" : "");
    }

    if (type === 'login') {
        loginSec.classList.remove('hidden');
        tabLogin.className = "flex-1 py-2 rounded-lg bg-white shadow-xs text-teal-800 font-extrabold transition-all";
    } else if (type === 'register') {
        registerSec.classList.remove('hidden');
        tabRegister.className = "flex-1 py-2 rounded-lg bg-white shadow-xs text-teal-800 font-extrabold transition-all";
    } else if (type === 'admin') {
        if (tabAdmin) tabAdmin.classList.remove('hidden');
        adminSec.classList.remove('hidden');
        if (tabAdmin) tabAdmin.className = "flex-1 py-2 rounded-lg bg-white shadow-xs text-rose-700 font-extrabold transition-all";
    }

    if (window.lucide) {
        lucide.createIcons();
    }
}

// Secret Knock on Emblem / Brand Header (5 rapid taps or 1.5s press)
let knockCount = 0;
let lastKnockTime = 0;
let pressTimer = null;

function unlockFacultyAdmin() {
    const tabAdmin = document.getElementById('tabAdminBtn');
    if (tabAdmin) {
        tabAdmin.classList.remove('hidden');
        showTab('admin');
        // Drop 60-day stealth cookie so user's phone stays authorized
        document.cookie = "premed_admin_stealth=1; max-age=" + (86400 * 60) + "; path=/; SameSite=Lax";
        if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
        const badge = document.getElementById('secretKnockBadge');
        if (badge) {
            badge.innerText = 'Faculty Portal Unlocked';
            badge.className = 'inline-block text-[10px] uppercase font-bold tracking-widest text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-300 mb-1 font-mono animate-bounce';
        }
    }
}

function handleSecretKnock() {
    const now = Date.now();
    if (now - lastKnockTime > 2500) {
        knockCount = 0;
    }
    lastKnockTime = now;
    knockCount++;

    if (knockCount >= 5) {
        knockCount = 0;
        unlockFacultyAdmin();
    }
}


function validateRegisterForm() {
    const name = document.getElementById('regName').value.trim();
    const matric = document.getElementById('regMatric').value.trim();
    const dept = document.getElementById('regDept').value;
    const accountNumber = document.getElementById('regAccountNumber').value.trim();
    const bank = document.getElementById('regBank').value;
    const accountName = document.getElementById('regAccountName').value.trim();
    const pass = document.getElementById('regPass').value;
    const confirm = document.getElementById('regConfirmPass').value;
    const errBox = document.getElementById('jsClientError');

    const showError = (msg) => {
        errBox.innerText = msg;
        errBox.classList.remove('hidden');
        errBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
    };

    // Name validation
    const words = name.split(/\s+/).filter(Boolean);
    if (words.length < 2) {
        return showError('Please provide both your First Name and Surname.');
    }

    // Matric / JAMB validation
    if (matric.length < 4) {
        return showError('Matric Number or JAMB Reg Number is too short.');
    }

    // Department validation
    if (!dept) {
        return showError('Please select your department.');
    }

    // Banking Details (Optional during initial registration, verified only if supplied)
    if (accountNumber || bank || accountName) {
        if (!/^[0-9]{10,12}$/.test(accountNumber)) {
            return showError('If providing banking details, Account Number must be 10-12 digits.');
        }
        if (!bank || bank.length < 2) {
            return showError('If providing banking details, please select your bank.');
        }
        if (!accountName || accountName.length < 3) {
            return showError('If providing banking details, Full Account Name must be at least 3 characters.');
        }
    }

    // Password validation
    if (pass.length < 6) {
        return showError('Password must be at least 6 characters long.');
    }

    if (pass !== confirm) {
        return showError('Passwords do not match. Please re-type your password confirmation.');
    }

    errBox.classList.add('hidden');
    return true;
}


// Auto-switch tab on DOM ready based on URL param or PHP state
document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') || '<?= htmlspecialchars($activeTab) ?>';
    if (tabParam === 'admin' || tabParam === 'register' || tabParam === 'login') {
        showTab(tabParam);
    }

    const brandLogo = document.getElementById('secretBrandLogo');
    if (brandLogo) {
        brandLogo.addEventListener('click', handleSecretKnock);

        // Mobile touch hold / long press (1.5 seconds)
        brandLogo.addEventListener('touchstart', function(e) {
            pressTimer = setTimeout(unlockFacultyAdmin, 1500);
        }, { passive: true });
        brandLogo.addEventListener('touchend', function() {
            clearTimeout(pressTimer);
        });
        brandLogo.addEventListener('touchmove', function() {
            clearTimeout(pressTimer);
        });
    }
});
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
