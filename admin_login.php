<?php
/**
 * Instructor & Administrator Login
 * Premed Test Portal (PHP Edition)
 */

$pageTitle = 'Instructor Console Login';
require_once __DIR__ . '/config/db.php';

$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $adminId = strtolower(trim($_POST['admin_id'] ?? ''));
    $adminKey = trim($_POST['admin_key'] ?? '');

    $validIds = ['default-admin-key-first-class', 'emmanuel', 'admin', 'manuel'];
    $validKeys = ['20252026', 'polymath-master-key', 'default-admin-key-first-class'];

    if (in_array($adminId, $validIds, true) && in_array($adminKey, $validKeys, true)) {
        $_SESSION['admin'] = true;
        header('Location: admin_dashboard.php');
        exit;
    } else {
        $error = 'Invalid administrator credentials or security key.';
    }
}

require_once __DIR__ . '/includes/header.php';
?>

<div class="min-h-[80vh] flex items-center justify-center px-4 py-12">
    <div class="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-100">
        <div class="text-center mb-8">
            <div class="w-14 h-14 mx-auto rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg mb-4">
                <i data-lucide="shield-check" class="w-7 h-7 text-emerald-400"></i>
            </div>
            <h1 class="text-2xl font-black text-slate-900">Instructor Admin Console</h1>
            <p class="text-xs text-slate-500 mt-1">Authorized access only &bull; Examination monitoring & deployment</p>
        </div>

        <?php if ($error): ?>
        <div class="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <i data-lucide="alert-circle" class="w-4 h-4 shrink-0"></i>
            <span><?= htmlspecialchars($error) ?></span>
        </div>
        <?php endif; ?>

        <form method="POST" action="admin_login.php" class="space-y-4">
            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Admin ID</label>
                <input type="text" name="admin_id" placeholder="admin or emmanuel" required class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
            </div>

            <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Security Master Key</label>
                <input type="password" name="admin_key" placeholder="••••••••" required class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
            </div>

            <button type="submit" class="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2">
                <span>Enter Administration</span>
                <i data-lucide="arrow-right" class="w-4 h-4"></i>
            </button>
        </form>

        <div class="mt-6 pt-6 border-t border-slate-100 text-center">
            <a href="login.php" class="text-xs font-bold text-indigo-600 hover:text-indigo-800">&larr; Return to Student Portal</a>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
