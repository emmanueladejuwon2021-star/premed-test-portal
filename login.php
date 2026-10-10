<?php
/**
 * Login & Registration View
 * Premed Test Portal (PHP Edition)
 */

$pageTitle = 'Sign In';
require_once __DIR__ . '/config/db.php';

$error = null;
$success = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? 'student_login';
    $db = DB::connect();

    if ($action === 'student_login') {
        $matricNo = strtoupper(trim(str_replace(' ', '', $_POST['matric_no'] ?? '')));
        $password = trim($_POST['password'] ?? '');

        if (empty($matricNo)) {
            $error = 'Matriculation number is required.';
        } else {
            $stmt = $db->prepare("SELECT * FROM students WHERE matric_no = ? LIMIT 1");
            $stmt->execute([$matricNo]);
            $student = $stmt->fetch();

            if ($student) {
                // Verify password if provided
                if (!empty($password) && $student['password'] !== $password) {
                    $error = 'Invalid password credentials.';
                } else {
                    $_SESSION['student'] = $student;
                    header('Location: index.php');
                    exit;
                }
            } else {
                // First time registration
                $name = trim($_POST['name'] ?? '');
                $dept = trim($_POST['department'] ?? 'Medicine & Surgery');
                $phone = trim($_POST['phone'] ?? '');

                if (empty($name)) {
                    $error = 'Matric not recognized. Please provide your Full Name to complete first-time registration.';
                } else {
                    $id = bin2hex(random_bytes(12));
                    $pass = $password ?: '123456';
                    $insert = $db->prepare("INSERT INTO students (id, name, matric_no, password, department, phone, strength) VALUES (?, ?, ?, ?, ?, ?, 'General')");
                    $insert->execute([$id, $name, $matricNo, $pass, $dept, $phone]);

                    $stmt = $db->prepare("SELECT * FROM students WHERE id = ? LIMIT 1");
                    $stmt->execute([$id]);
                    $_SESSION['student'] = $stmt->fetch();
                    header('Location: index.php');
                    exit;
                }
            }
        }
    } elseif ($action === 'admin_login') {
        $adminId = strtolower(trim($_POST['admin_id'] ?? ''));
        $adminKey = trim($_POST['admin_key'] ?? '');

        $validIds = ['default-admin-key-first-class', 'emmanuel', 'admin', 'manuel'];
        $validKeys = ['20252026', 'polymath-master-key', 'default-admin-key-first-class'];

        if (in_array($adminId, $validIds, true) && in_array($adminKey, $validKeys, true)) {
            $_SESSION['admin'] = true;
            header('Location: admin.php');
            exit;
        } else {
            $error = 'Invalid administrative credentials.';
        }
    }
}

require_once __DIR__ . '/includes/header.php';
?>

<div class="min-h-[85vh] flex items-center justify-center px-4 py-12">
    <div class="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl shadow-slate-100">
        <!-- Brand Header -->
        <div class="text-center mb-8">
            <div class="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-100 mb-4">
                <i data-lucide="graduation-cap" class="w-7 h-7"></i>
            </div>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight">Premed Test Portal</h1>
            <p class="text-xs text-slate-500 mt-1">Computer Based Testing & Academic Simulation Engine</p>
        </div>

        <!-- Mode Toggle Tabs -->
        <div class="flex bg-slate-100 p-1 rounded-xl mb-6 text-xs font-bold text-slate-600">
            <button type="button" id="tabStudent" onclick="switchTab('student')" class="flex-1 py-2 rounded-lg bg-white shadow-sm text-indigo-700 transition-all">
                Student Terminal
            </button>
            <button type="button" id="tabAdmin" onclick="switchTab('admin')" class="flex-1 py-2 rounded-lg hover:text-slate-900 transition-all">
                Instructor / Admin
            </button>
        </div>

        <?php if ($error): ?>
        <div class="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <i data-lucide="alert-circle" class="w-4 h-4 shrink-0"></i>
            <span><?= htmlspecialchars($error) ?></span>
        </div>
        <?php endif; ?>

        <!-- Student Form -->
        <form id="studentForm" method="POST" action="login.php" class="space-y-4">
            <input type="hidden" name="action" value="student_login">

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Matriculation Number</label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                        <i data-lucide="user" class="w-4 h-4"></i>
                    </span>
                    <input type="text" name="matric_no" required placeholder="e.g. 230911, MED/2024/001" class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase">
                </div>
            </div>

            <div id="newStudentFields" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Full Name (New Students)</label>
                    <input type="text" name="name" placeholder="Firstname & Surname" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Department</label>
                    <select name="department" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                        <option value="Medicine & Surgery">Medicine & Surgery</option>
                        <option value="Physiology">Physiology</option>
                        <option value="Anatomy">Anatomy</option>
                        <option value="Nursing Science">Nursing Science</option>
                        <option value="Medical Laboratory">Medical Laboratory</option>
                        <option value="Pharmacy">Pharmacy</option>
                    </select>
                </div>
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password</label>
                <input type="password" name="password" placeholder="Default: 123456" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            </div>

            <button type="submit" class="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2">
                <span>Enter Academic Portal</span>
                <i data-lucide="arrow-right" class="w-4 h-4"></i>
            </button>
        </form>

        <!-- Admin Form -->
        <form id="adminForm" method="POST" action="login.php" class="space-y-4 hidden">
            <input type="hidden" name="action" value="admin_login">

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Admin ID</label>
                <input type="text" name="admin_id" placeholder="admin or emmanuel" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Security Master Key</label>
                <input type="password" name="admin_key" placeholder="••••••••" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            </div>

            <button type="submit" class="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2">
                <span>Access Instructor Console</span>
                <i data-lucide="shield-check" class="w-4 h-4"></i>
            </button>
        </form>
    </div>
</div>

<script>
function switchTab(type) {
    const sForm = document.getElementById('studentForm');
    const aForm = document.getElementById('adminForm');
    const sTab = document.getElementById('tabStudent');
    const aTab = document.getElementById('tabAdmin');

    if (type === 'student') {
        sForm.classList.remove('hidden');
        aForm.classList.add('hidden');
        sTab.className = "flex-1 py-2 rounded-lg bg-white shadow-sm text-indigo-700 font-bold transition-all";
        aTab.className = "flex-1 py-2 rounded-lg hover:text-slate-900 transition-all";
    } else {
        sForm.classList.add('hidden');
        aForm.classList.remove('hidden');
        aTab.className = "flex-1 py-2 rounded-lg bg-white shadow-sm text-slate-900 font-bold transition-all";
        sTab.className = "flex-1 py-2 rounded-lg hover:text-slate-900 transition-all";
    }
    lucide.createIcons();
}
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
