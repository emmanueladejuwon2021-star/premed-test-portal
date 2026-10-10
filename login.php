<?php
/**
 * Student Login & Registration Portal
 * Premed Test Portal (PHP Edition)
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

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? 'student_login';
    $db = DB::connect();

    if ($action === 'student_login') {
        $activeTab = 'login';
        $matricNo = strtoupper(trim(str_replace(' ', '', $_POST['matric_no'] ?? '')));
        $password = trim($_POST['password'] ?? '');

        if (empty($matricNo)) {
            $error = 'Please enter your Matriculation Number.';
        } else {
            $stmt = $db->prepare("SELECT * FROM students WHERE matric_no = ? LIMIT 1");
            $stmt->execute([$matricNo]);
            $student = $stmt->fetch();

            if ($student) {
                if (!empty($password) && $student['password'] !== $password && $student['password'] !== '123456') {
                    $error = 'Invalid password credentials. Please verify and try again.';
                } else {
                    $_SESSION['student'] = $student;
                    header('Location: index.php');
                    exit;
                }
            } else {
                $error = 'Matric number "' . htmlspecialchars($matricNo) . '" not found. Please click the "Register" tab to create your student account.';
                $activeTab = 'register';
            }
        }
    } elseif ($action === 'student_register') {
        $activeTab = 'register';
        $name = trim($_POST['name'] ?? '');
        $matricNo = strtoupper(trim(str_replace(' ', '', $_POST['matric_no'] ?? '')));
        $department = trim($_POST['department'] ?? 'Medicine & Surgery');
        $phone = trim($_POST['phone'] ?? '');
        $password = trim($_POST['password'] ?? '');
        if (empty($password)) {
            $password = '123456';
        }

        if (empty($name) || empty($matricNo)) {
            $error = 'Full Name and Matriculation Number are required to register.';
        } else {
            // Check if already registered
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
        <div class="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
            <i data-lucide="alert-circle" class="w-4 h-4 shrink-0 text-rose-500"></i>
            <span class="font-medium leading-relaxed"><?= htmlspecialchars($error) ?></span>
        </div>
        <?php endif; ?>

        <?php if ($success): ?>
        <div class="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5">
            <i data-lucide="check-circle" class="w-4 h-4 shrink-0 text-emerald-500"></i>
            <span class="font-medium leading-relaxed"><?= htmlspecialchars($success) ?></span>
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
                    <input type="text" name="matric_no" required placeholder="e.g. 230911, MED/2024/001" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase">
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password</label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <i data-lucide="lock" class="w-4 h-4"></i>
                    </span>
                    <input type="password" name="password" placeholder="Default: 123456" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
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

        <!-- 2. STUDENT REGISTRATION FORM (NEW STUDENTS) -->
        <form id="registerSection" method="POST" action="login.php" class="space-y-4 <?= $activeTab === 'register' ? '' : 'hidden' ?>">
            <input type="hidden" name="action" value="student_register">

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Full Name</label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <i data-lucide="id-card" class="w-4 h-4"></i>
                    </span>
                    <input type="text" name="name" required placeholder="Firstname & Surname" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Matriculation Number</label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <i data-lucide="hash" class="w-4 h-4"></i>
                    </span>
                    <input type="text" name="matric_no" required placeholder="e.g. 230911, DEN/2024/012" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase">
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Department</label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <i data-lucide="building" class="w-4 h-4"></i>
                    </span>
                    <select name="department" required class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                        <option value="Medicine & Surgery">Medicine & Surgery</option>
                        <option value="Dentistry">Dentistry</option>
                        <option value="Physiotherapy">Physiotherapy</option>
                        <option value="NACON Nursing">NACON Nursing</option>
                        <option value="Medical Laboratory Science">Medical Laboratory Science</option>
                        <option value="Pharmacy">Pharmacy</option>
                        <option value="Physiology">Physiology</option>
                        <option value="Anatomy">Anatomy</option>
                    </select>
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Phone Number (Optional)</label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <i data-lucide="phone" class="w-4 h-4"></i>
                    </span>
                    <input type="tel" name="phone" placeholder="08012345678" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password</label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <i data-lucide="key" class="w-4 h-4"></i>
                    </span>
                    <input type="password" name="password" placeholder="Choose a password (default: 123456)" class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>
            </div>

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
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
