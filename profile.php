<?php
/**
 * Student Profile View & Editor - Clinical Medical Edition
 * Apex Pre-Medical Sciences Examination Portal
 */

$pageTitle = 'Student Profile';
require_once __DIR__ . '/config/db.php';

$db = DB::connect();
$student = $_SESSION['student'] ?? null;

if (!$student) {
    header('Location: login.php');
    exit;
}

$success = null;
$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? '');
    $department = trim($_POST['department'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $strength = trim($_POST['strength'] ?? 'General');
    $accountNumber = trim($_POST['account_number'] ?? '');
    $bank = trim($_POST['bank'] ?? '');
    $accountName = trim($_POST['account_name'] ?? '');

    if (empty($name)) {
        $error = 'Full name is required.';
    } else {
        try {
            $upd = $db->prepare("UPDATE students SET name = ?, department = ?, phone = ?, email = ?, strength = ?, account_number = ?, bank = ?, account_name = ? WHERE id = ?");
            $upd->execute([$name, $department, $phone, $email, $strength, $accountNumber, $bank, $accountName, $student['id']]);
        } catch (Exception $e) {
            try {
                $upd = $db->prepare("UPDATE students SET name = ?, department = ?, phone = ?, account_number = ?, bank = ?, account_name = ? WHERE id = ?");
                $upd->execute([$name, $department, $phone, $accountNumber, $bank, $accountName, $student['id']]);
            } catch (Exception $e2) {
                $upd = $db->prepare("UPDATE students SET name = ?, department = ? WHERE id = ?");
                $upd->execute([$name, $department, $student['id']]);
            }
        }

        // Refresh session
        $ref = $db->prepare("SELECT * FROM students WHERE id = ? LIMIT 1");
        $ref->execute([$student['id']]);
        $_SESSION['student'] = $ref->fetch();
        $student = $_SESSION['student'];
        if (function_exists('set_student_auth_cookie') && $student) {
            set_student_auth_cookie($student);
        }
        $success = 'Profile & bank details updated successfully!';
    }
}

require_once __DIR__ . '/includes/header.php';
?>

<div class="max-w-2xl mx-auto px-4 py-8 space-y-6">
    <div>
        <h1 class="text-2xl font-black text-slate-900 tracking-tight">Candidate Profile</h1>
        <p class="text-xs text-slate-500 mt-1">Manage your academic credentials, registered department, and contact information.</p>
    </div>

    <?php if ($success): ?>
    <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
        <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i>
        <span><?= htmlspecialchars($success) ?></span>
    </div>
    <?php endif; ?>

    <?php if ($error): ?>
    <div class="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
        <i data-lucide="alert-circle" class="w-4 h-4 text-rose-600"></i>
        <span><?= htmlspecialchars($error) ?></span>
    </div>
    <?php endif; ?>

    <form method="POST" action="profile.php" class="bg-white rounded-3xl p-6 sm:p-8 border border-teal-100 shadow-sm space-y-5">
        <div>
            <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Matriculation Number (Permanent Examination ID)</label>
            <input type="text" disabled value="<?= htmlspecialchars($student['matric_no']) ?>" class="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 text-sm font-mono cursor-not-allowed">
        </div>

        <div>
            <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Candidate Full Name</label>
            <input type="text" name="name" required value="<?= htmlspecialchars($student['name']) ?>" class="w-full px-4 py-3 rounded-2xl border border-teal-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
        </div>

        <div>
            <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Department / Faculty</label>
            <select name="department" class="w-full px-4 py-3 rounded-2xl border border-teal-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                <option value="Medicine & Surgery" <?= $student['department'] === 'Medicine & Surgery' ? 'selected' : '' ?>>Medicine & Surgery (MBBS)</option>
                <option value="Dentistry" <?= $student['department'] === 'Dentistry' ? 'selected' : '' ?>>Dentistry (BDS)</option>
                <option value="Pharmacy" <?= $student['department'] === 'Pharmacy' ? 'selected' : '' ?>>Pharmacy (PharmD)</option>
                <option value="NACON Nursing" <?= $student['department'] === 'NACON Nursing' ? 'selected' : '' ?>>Nursing Science (BNSc)</option>
                <option value="Medical Laboratory Science" <?= $student['department'] === 'Medical Laboratory Science' ? 'selected' : '' ?>>Medical Laboratory Science (BMLS)</option>
                <option value="Radiography" <?= $student['department'] === 'Radiography' ? 'selected' : '' ?>>Radiography (B.Rad)</option>
                <option value="Physiotherapy" <?= $student['department'] === 'Physiotherapy' ? 'selected' : '' ?>>Physiotherapy (BMR)</option>
                <option value="Anatomy" <?= $student['department'] === 'Anatomy' ? 'selected' : '' ?>>Human Anatomy</option>
                <option value="Physiology" <?= $student['department'] === 'Physiology' ? 'selected' : '' ?>>Human Physiology</option>
            </select>
        </div>

        <div>
            <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Primary Subject Focus</label>
            <select name="strength" class="w-full px-4 py-3 rounded-2xl border border-teal-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                <option value="Physics" <?= $student['strength'] === 'Physics' ? 'selected' : '' ?>>Physics / Biophysics</option>
                <option value="Chemistry" <?= $student['strength'] === 'Chemistry' ? 'selected' : '' ?>>Chemistry / Organic Chemistry</option>
                <option value="Biology" <?= $student['strength'] === 'Biology' ? 'selected' : '' ?>>Biology / Life Sciences</option>
                <option value="Mathematics" <?= $student['strength'] === 'Mathematics' ? 'selected' : '' ?>>Calculus & Biostatistics</option>
                <option value="General" <?= $student['strength'] === 'General' ? 'selected' : '' ?>>General Pre-Med</option>
            </select>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Phone Number</label>
                <input type="text" name="phone" value="<?= htmlspecialchars($student['phone'] ?? '') ?>" placeholder="e.g. 08012345678" class="w-full px-4 py-3 rounded-2xl border border-teal-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            </div>
            <div>
                <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Email Address</label>
                <input type="email" name="email" value="<?= htmlspecialchars($student['email'] ?? '') ?>" placeholder="candidate@student.edu" class="w-full px-4 py-3 rounded-2xl border border-teal-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            </div>
        </div>

        <!-- Banking Information -->
        <div class="border-t border-teal-100/60 pt-4 space-y-4">
            <div>
                <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 text-teal-800">
                    <i data-lucide="award" class="w-4 h-4 text-amber-500"></i>
                    <span>Banking Credentials (Cash Prizes &amp; Disbursement)</span>
                </h3>
                <p class="text-[11px] text-slate-500 mt-0.5">Used exclusively for verified cash prizes and scholarship payouts.</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Bank Name</label>
                    <select name="bank" class="w-full px-4 py-3 rounded-2xl border border-teal-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                        <option value="" disabled <?= empty($student['bank']) ? 'selected' : '' ?>>-- Select Bank --</option>
                        <?php 
                        $bankList = [
                            'Opay', 'PalmPay', 'Kuda Bank', 'Moniepoint', 'SmartCash PSB',
                            'Access Bank', 'GTBank', 'FirstBank', 'Zenith Bank', 'UBA',
                            'Stanbic IBTC', 'Wema Bank', 'FCMB', 'Union Bank', 'Fidelity Bank',
                            'Polaris Bank', 'Sterling Bank', 'Ecobank', 'Keystone Bank',
                            'Unity Bank', 'Providus Bank', 'Jaiz Bank', 'Taj Bank', 'Heritage Bank', 'Other Bank'
                        ];
                        foreach ($bankList as $b): 
                        ?>
                        <option value="<?= $b ?>" <?= ($student['bank'] ?? '') === $b ? 'selected' : '' ?>><?= $b ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div>
                    <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Account Number</label>
                    <input type="text" name="account_number" maxlength="12" value="<?= htmlspecialchars($student['account_number'] ?? '') ?>" placeholder="e.g. 0123456789" class="w-full px-4 py-3 rounded-2xl border border-teal-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono">
                </div>
            </div>

            <div>
                <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Full Account Name</label>
                <input type="text" name="account_name" value="<?= htmlspecialchars($student['account_name'] ?? '') ?>" placeholder="e.g. Adejuwon Emmanuel" class="w-full px-4 py-3 rounded-2xl border border-teal-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            </div>
        </div>

        <button type="submit" class="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 active:scale-95">
            <i data-lucide="save" class="w-4 h-4"></i>
            <span>Save Profile &amp; Banking Details</span>
        </button>
    </form>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
