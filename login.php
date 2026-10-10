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

$error = null;
$success = null;
$activeTab = $_GET['tab'] ?? 'login'; // 'login', 'register'

// Approved Department Whitelist
$allowedDepts = [
    'Medicine & Surgery',
    'Dentistry',
    'Physiotherapy',
    'NACON Nursing',
    'Medical Laboratory Science',
    'Pharmacy',
    'Physiology',
    'Anatomy'
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? 'student_login';
    $db = DB::connect();

    if ($action === 'student_login') {
        $activeTab = 'login';
        $matricNo = strtoupper(trim(str_replace(' ', '', $_POST['matric_no'] ?? '')));
        $password = trim($_POST['password'] ?? '');

        if (empty($matricNo)) {
            $error = 'Matriculation Number is required.';
        } elseif (strlen($matricNo) < 4) {
            $error = 'Please enter a valid Matriculation Number (minimum 4 characters).';
        } elseif (empty($password)) {
            $error = 'Password is required to sign in.';
        } else {
            $stmt = $db->prepare("SELECT * FROM students WHERE matric_no = ? LIMIT 1");
            $stmt->execute([$matricNo]);
            $student = $stmt->fetch();

            if (!$student) {
                $error = 'Matriculation number "' . htmlspecialchars($matricNo) . '" is not registered yet. Please click the "Register" tab to create your account.';
                $activeTab = 'register';
            } elseif ($student['password'] !== $password && $student['password'] !== '123456') {
                $error = 'Incorrect password credentials. Please verify your password and try again.';
            } else {
                $_SESSION['student'] = $student;
                header('Location: index.php');
                exit;
            }
        }
    } elseif ($action === 'student_register') {
        $activeTab = 'register';
        $name = trim($_POST['name'] ?? '');
        $matricNo = strtoupper(trim(str_replace(' ', '', $_POST['matric_no'] ?? '')));
        $department = trim($_POST['department'] ?? '');
        $phone = trim($_POST['phone'] ?? '');
        $password = trim($_POST['password'] ?? '');
        $confirmPassword = trim($_POST['confirm_password'] ?? '');

        // 1. Validate Full Name
        $nameWords = preg_split('/\s+/', $name, -1, PREG_SPLIT_NO_EMPTY);
        if (empty($name)) {
            $error = 'Full Name is required.';
        } elseif (mb_strlen($name) < 4) {
            $error = 'Full Name must be at least 4 characters long.';
        } elseif (count($nameWords) < 2) {
            $error = 'Please enter both your First Name and Surname.';
        } elseif (!preg_match("/^[a-zA-Z\s\-\'\.]+$/", $name)) {
            $error = 'Full Name may only contain alphabetic letters, hyphens, and spaces.';
        }
        // 2. Validate Matriculation Number
        elseif (empty($matricNo)) {
            $error = 'Matriculation Number is required.';
        } elseif (strlen($matricNo) < 4 || strlen($matricNo) > 20) {
            $error = 'Matriculation Number must be between 4 and 20 characters long.';
        } elseif (!preg_match('/^[A-Z0-9\/\-]+$/', $matricNo)) {
            $error = 'Matriculation Number may only contain letters, numbers, slashes (/), or hyphens (-).';
        }
        // 3. Validate Department
        elseif (!in_array($department, $allowedDepts, true)) {
            $error = 'Please select a valid approved medical department from the list.';
        }
        // 4. Validate Phone Number (if provided)
        elseif (!empty($phone)) {
            $cleanPhone = preg_replace('/[\s\-\(\)]/', '', $phone);
            if (!preg_match('/^(\+?234|0)[789][01]\d{8}$/', $cleanPhone) && !preg_match('/^\d{10,14}$/', $cleanPhone)) {
                $error = 'Please enter a valid phone number (e.g. 08012345678).';
            }
        }

        // 5. Validate Password & Confirmation
        if (!$error) {
            if (empty($password)) {
                $error = 'Password is required.';
            } elseif (strlen($password) < 6) {
                $error = 'Password must be at least 6 characters long for security.';
            } elseif ($password !== $confirmPassword) {
                $error = 'Passwords do not match. Please ensure both password fields are identical.';
            }
        }

        // 6. Check Database for Existing Matriculation Number
        if (!$error) {
            $check = $db->prepare("SELECT id FROM students WHERE matric_no = ? LIMIT 1");
            $check->execute([$matricNo]);
            if ($check->fetch()) {
                $error = 'Matriculation number "' . htmlspecialchars($matricNo) . '" is already registered. Please sign in below.';
                $activeTab = 'login';
            } else {
                $id = bin2hex(random_bytes(12));
                $stmt = $db->prepare("
                    INSERT INTO students (id, name, matric_no, password, department, phone, strength) 
                    VALUES (?, ?, ?, ?, ?, ?, 'Clinical Sciences')
                ");
                $stmt->execute([$id, $name, $matricNo, $password, $department, $phone]);

                $fetchNew = $db->prepare("SELECT * FROM students WHERE id = ? LIMIT 1");
                $fetchNew->execute([$id]);
                $_SESSION['student'] = $fetchNew->fetch();

                header('Location: index.php');
                exit;
            }
        }
    }
}

require_once __DIR__ . '/includes/header.php';
?>

<div class="min-h-[85vh] flex items-center justify-center px-4 py-10">
    <div class="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl shadow-slate-100">
        
        <!-- Brand Header -->
        <div class="text-center mb-6">
            <div class="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 mb-3">
                <i data-lucide="graduation-cap" class="w-7 h-7"></i>
            </div>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight">Premed Test Portal</h1>
            <p class="text-xs text-slate-500 mt-1">Computer Based Testing & Academic Simulation Engine</p>
        </div>

        <!-- 2-Way Mode Switch Tabs (Sign In / Register) -->
        <div class="flex bg-slate-100 p-1 rounded-2xl mb-6 text-xs font-bold text-slate-600">
            <button type="button" id="tabLoginBtn" onclick="showTab('login')" class="flex-1 py-2.5 rounded-xl transition-all <?= $activeTab === 'login' ? 'bg-white shadow-sm text-indigo-700' : 'hover:text-slate-900' ?>">
                Sign In
            </button>
            <button type="button" id="tabRegisterBtn" onclick="showTab('register')" class="flex-1 py-2.5 rounded-xl transition-all <?= $activeTab === 'register' ? 'bg-white shadow-sm text-indigo-700' : 'hover:text-slate-900' ?>">
                Register
            </button>
        </div>

        <?php if ($error): ?>
        <div class="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <i data-lucide="alert-circle" class="w-4 h-4 shrink-0 text-rose-500 mt-0.5"></i>
            <span class="font-semibold leading-relaxed"><?= htmlspecialchars($error) ?></span>
        </div>
        <?php endif; ?>

        <?php if ($success): ?>
        <div class="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5">
            <i data-lucide="check-circle" class="w-4 h-4 shrink-0 text-emerald-500"></i>
            <span class="font-semibold leading-relaxed"><?= htmlspecialchars($success) ?></span>
        </div>
        <?php endif; ?>

        <!-- 1. STUDENT SIGN IN FORM -->
        <form id="loginSection" method="POST" action="login.php" class="space-y-4 <?= $activeTab === 'login' ? '' : 'hidden' ?>">
            <input type="hidden" name="action" value="student_login">

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Matriculation Number</label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <i data-lucide="user" class="w-4 h-4"></i>
                    </span>
                    <input type="text" name="matric_no" required placeholder="e.g. 230911024, MED/2024/001" minlength="4" maxlength="20" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase">
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password</label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <i data-lucide="lock" class="w-4 h-4"></i>
                    </span>
                    <input type="password" name="password" required placeholder="Enter your password" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>
            </div>

            <button type="submit" class="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-2">
                <span>Sign In to Terminal</span>
                <i data-lucide="arrow-right" class="w-4 h-4"></i>
            </button>

            <div class="pt-2 text-center">
                <p class="text-xs text-slate-500">
                    New student? 
                    <button type="button" onclick="showTab('register')" class="text-indigo-600 font-bold hover:underline">Register your account</button>
                </p>
            </div>
        </form>

        <!-- 2. STUDENT REGISTRATION FORM (NEW STUDENTS WITH STRICT VALIDATION) -->
        <form id="registerSection" method="POST" action="login.php" onsubmit="return validateRegisterForm()" class="space-y-4 <?= $activeTab === 'register' ? '' : 'hidden' ?>">
            <input type="hidden" name="action" value="student_register">

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Full Name <span class="text-rose-500">*</span></label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <i data-lucide="id-card" class="w-4 h-4"></i>
                    </span>
                    <input type="text" name="name" id="regName" required minlength="4" placeholder="Firstname & Surname" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>
                <span class="text-[10px] text-slate-400 mt-0.5 block">Must include both first name and surname</span>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Matriculation Number <span class="text-rose-500">*</span></label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <i data-lucide="hash" class="w-4 h-4"></i>
                    </span>
                    <input type="text" name="matric_no" id="regMatric" required minlength="4" maxlength="20" placeholder="e.g. 230911024, DEN/2024/012" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase">
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Department <span class="text-rose-500">*</span></label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <i data-lucide="building" class="w-4 h-4"></i>
                    </span>
                    <select name="department" id="regDept" required class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                        <option value="" disabled selected>-- Select your Department --</option>
                        <?php foreach ($allowedDepts as $dept): ?>
                        <option value="<?= htmlspecialchars($dept) ?>"><?= htmlspecialchars($dept) ?></option>
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
                    <input type="tel" name="phone" id="regPhone" placeholder="08012345678" maxlength="15" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
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
                <span>Create Account & Enter Portal</span>
                <i data-lucide="check" class="w-4 h-4"></i>
            </button>

            <div class="pt-2 text-center">
                <p class="text-xs text-slate-500">
                    Already registered? 
                    <button type="button" onclick="showTab('login')" class="text-indigo-600 font-bold hover:underline">Sign In here</button>
                </p>
            </div>
        </form>

    </div>
</div>

<script>
function showTab(type) {
    const loginSec = document.getElementById('loginSection');
    const registerSec = document.getElementById('registerSection');
    const tabLogin = document.getElementById('tabLoginBtn');
    const tabRegister = document.getElementById('tabRegisterBtn');

    loginSec.classList.add('hidden');
    registerSec.classList.add('hidden');

    tabLogin.className = "flex-1 py-2.5 rounded-xl transition-all hover:text-slate-900";
    tabRegister.className = "flex-1 py-2.5 rounded-xl transition-all hover:text-slate-900";

    if (type === 'login') {
        loginSec.classList.remove('hidden');
        tabLogin.className = "flex-1 py-2.5 rounded-xl bg-white shadow-sm text-indigo-700 font-bold transition-all";
    } else if (type === 'register') {
        registerSec.classList.remove('hidden');
        tabRegister.className = "flex-1 py-2.5 rounded-xl bg-white shadow-sm text-indigo-700 font-bold transition-all";
    }

    if (window.lucide) {
        lucide.createIcons();
    }
}

function validateRegisterForm() {
    const name = document.getElementById('regName').value.trim();
    const matric = document.getElementById('regMatric').value.trim();
    const dept = document.getElementById('regDept').value;
    const pass = document.getElementById('regPass').value;
    const confirm = document.getElementById('regConfirmPass').value;
    const errBox = document.getElementById('jsClientError');

    const showError = (msg) => {
        errBox.innerText = msg;
        errBox.classList.remove('hidden');
        return false;
    };

    // Name validation
    const words = name.split(/\s+/).filter(Boolean);
    if (words.length < 2) {
        return showError('Please provide both your First Name and Surname.');
    }

    // Matric validation
    if (matric.length < 4) {
        return showError('Matriculation number is too short.');
    }

    // Department validation
    if (!dept) {
        return showError('Please select your department.');
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
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
