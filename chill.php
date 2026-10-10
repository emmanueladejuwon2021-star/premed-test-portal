<?php
/**
 * Post-Exam Chill / Cooldown View
 * Premed Test Portal (PHP Edition)
 */

$pageTitle = 'Decompress & Chill';
require_once __DIR__ . '/config/db.php';

$resultId = $_GET['result_id'] ?? '';
require_once __DIR__ . '/includes/header.php';
?>

<div class="min-h-[75vh] flex items-center justify-center px-4">
    <div class="text-center space-y-8 max-w-md">
        <!-- Calming animated breathing circle -->
        <div class="relative w-40 h-40 mx-auto flex items-center justify-center">
            <div class="absolute inset-0 rounded-full bg-teal-100 animate-ping opacity-75"></div>
            <div class="relative w-32 h-32 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-xl shadow-teal-100">
                <i data-lucide="heart" class="w-12 h-12"></i>
            </div>
        </div>

        <div>
            <h2 class="text-2xl font-black text-slate-900">Assessment Submitted!</h2>
            <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Take a slow breath. Academic rigor requires cognitive recovery. Whenever you are ready, view your metrics.</p>
        </div>

        <div class="pt-2">
            <a href="results.php?id=<?= urlencode($resultId) ?>" class="px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md shadow-indigo-100 transition-colors inline-flex items-center gap-2">
                <span>View My Performance Breakdown</span>
                <i data-lucide="arrow-right" class="w-4 h-4"></i>
            </a>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
