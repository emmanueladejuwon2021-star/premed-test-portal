<?php
/**
 * Test Countdown Screen
 * Premed Test Portal (PHP Edition)
 */

$pageTitle = 'Commencing Examination...';
require_once __DIR__ . '/config/db.php';

$courseId = $_GET['course_id'] ?? '';
if (empty($courseId)) {
    header('Location: index.php');
    exit;
}

require_once __DIR__ . '/includes/header.php';
?>

<div class="min-h-[75vh] flex items-center justify-center px-4">
    <div class="text-center space-y-6 max-w-sm">
        <div class="w-24 h-24 mx-auto rounded-full bg-indigo-50 border-4 border-indigo-600 flex items-center justify-center text-indigo-600 text-4xl font-black shadow-xl shadow-indigo-100" id="countdownNumber">
            5
        </div>
        <h2 class="text-xl font-black text-slate-900">Preparing Secure Assessment Workspace</h2>
        <p class="text-xs text-slate-500">Connecting to secure question bank and locking viewport. Please do not close this window.</p>
    </div>
</div>

<script>
let count = 5;
const el = document.getElementById('countdownNumber');
const interval = setInterval(() => {
    count--;
    if (count > 0) {
        el.innerText = count;
    } else {
        clearInterval(interval);
        window.location.href = 'exam.php?course_id=<?= urlencode($courseId) ?>';
    }
}, 1000);
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
