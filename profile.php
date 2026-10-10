<?php
/**
 * Student Profile View & Editor
 * Premed Test Portal (PHP Edition)
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

    if (empty($name)) {
        $error = 'Full name is required.';
    } else {
        $upd = $db->prepare("UPDATE students SET name = ?, department = ?, phone = ?, email = ?, strength = ? WHERE id = ?");
        $upd->execute([$name, $department, $phone, $email, $strength, $student['id']]);

        // Refresh session
        $ref = $db->prepare("SELECT * FROM students WHERE id = ? LIMIT 1");
        $ref->execute([$student['id']]);
        $_SESSION['student'] = $ref->fetch();
        $student = $_SESSION['student'];
        $success = 'Profile details updated successfully!';
    }
}

require_once __DIR__ . '/includes/header.php';
?>

<div class="max-w-2xl mx-auto px-4 py-8 space-y-6">
    <div>
        <h1 class="text-2xl font-black text-slate-900 tracking-tight">Candidate Profile</h1>
        <p class="text-xs text-slate-500 mt-1">Manage your academic profile credentials and subject focus.</p>
    </div>

    <?php if ($success): ?>
    <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
        <i data-lucide="check-circle" class="w-4 h-4"></i>
        <span><?= htmlspecialchars($success) ?></span>
    </div>
    <?php endif; ?>

    <?php if ($error): ?>
    <div class="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
        <i data-lucide="alert-circle" class="w-4 h-4"></i>
        <span><?= htmlspecialchars($error) ?></span>
    </div>
    <?php endif; ?>

    <form method="POST" action="profile.php" class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
        <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Matriculation Number (Permanent ID)</label>
            <input type="text" disabled value="<?= htmlspecialchars($student['matric_no']) ?>" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-sm font-mono cursor-not-allowed">
        </div>

        <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Candidate Full Name</label>
            <input type="text" name="name" required value="<?= htmlspecialchars($student['name']) ?>" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
        </div>

        <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Department / Faculty</label>
            <select name="department" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="Medicine & Surgery" <?= $student['department'] === 'Medicine & Surgery' ? 'selected' : '' ?>>Medicine & Surgery</option>
                <option value="Dentistry" <?= $student['department'] === 'Dentistry' ? 'selected' : '' ?>>Dentistry</option>
                <option value="Physiotherapy" <?= $student['department'] === 'Physiotherapy' ? 'selected' : '' ?>>Physiotherapy</option>
                <option value="Physiology" <?= $student['department'] === 'Physiology' ? 'selected' : '' ?>>Physiology</option>
                <option value="Anatomy" <?= $student['department'] === 'Anatomy' ? 'selected' : '' ?>>Anatomy</option>
                <option value="Nursing Science" <?= $student['department'] === 'Nursing Science' ? 'selected' : '' ?>>Nursing Science</option>
                <option value="Medical Laboratory" <?= $student['department'] === 'Medical Laboratory' ? 'selected' : '' ?>>Medical Laboratory Science</option>
                <option value="Pharmacy" <?= $student['department'] === 'Pharmacy' ? 'selected' : '' ?>>Pharmacy</option>
            </select>
        </div>

        <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Primary Subject Strength</label>
            <select name="strength" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="Biology" <?= $student['strength'] === 'Biology' ? 'selected' : '' ?>>Biology / Life Sciences</option>
                <option value="Chemistry" <?= $student['strength'] === 'Chemistry' ? 'selected' : '' ?>>Chemistry / Organic Chemistry</option>
                <option value="Physics" <?= $student['strength'] === 'Physics' ? 'selected' : '' ?>>Physics / Biophysics</option>
                <option value="Mathematics" <?= $student['strength'] === 'Mathematics' ? 'selected' : '' ?>>Calculus & Biostatistics</option>
                <option value="General" <?= $student['strength'] === 'General' ? 'selected' : '' ?>>General Pre-Med</option>
            </select>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Phone Number</label>
                <input type="text" name="phone" value="<?= htmlspecialchars($student['phone'] ?? '') ?>" placeholder="e.g. 08012345678" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Address</label>
                <input type="email" name="email" value="<?= htmlspecialchars($student['email'] ?? '') ?>" placeholder="candidate@student.edu" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            </div>
        </div>

        <button type="submit" class="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-100 transition-colors flex items-center justify-center gap-2">
            <i data-lucide="save" class="w-4 h-4"></i>
            <span>Save Profile Changes</span>
        </button>
    </form>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
