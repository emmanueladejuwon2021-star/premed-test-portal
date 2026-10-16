</main>

<?php if (($currentPage ?? basename($_SERVER['PHP_SELF'])) !== 'exam.php'): ?>
<footer class="bg-white border-t border-slate-200 py-6 mt-12">
    <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
        <p id="footerSecretKnock" class="cursor-default select-none" title="">&copy; <?= date('Y') ?> Premed Test Portal &bull; All Rights Reserved</p>
        <div class="flex items-center gap-4">
            <?php if (!empty($_SESSION['admin'])): ?>
            <a href="admin_dashboard.php" class="hover:text-indigo-600 transition-colors flex items-center gap-1 font-semibold text-indigo-700">
                <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
                <span>Admin Console</span>
            </a>
            <?php else: ?>
            <span class="text-slate-400 select-none">Apex Medical Examination Council</span>
            <?php endif; ?>
        </div>
    </div>
</footer>
<?php endif; ?>

<script>
    // Initialize Lucide icons
    if (window.lucide) {
        lucide.createIcons();
    }

    // Secret Knock on Footer Copyright (5 taps opens faculty gateway)
    (function() {
        let fKnock = 0;
        let fLastTime = 0;
        const copyEl = document.getElementById('footerSecretKnock');
        if (copyEl) {
            copyEl.addEventListener('click', function() {
                const now = Date.now();
                if (now - fLastTime > 2500) fKnock = 0;
                fLastTime = now;
                fKnock++;
                if (fKnock >= 5) {
                    fKnock = 0;
                    window.location.href = 'login.php?portal=faculty';
                }
            });
        }
    })();

    // Auto-render KaTeX math formulas in $ ... $ or $$ ... $$
    document.addEventListener("DOMContentLoaded", function() {
        if (typeof renderMathInElement === 'function') {
            renderMathInElement(document.body, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false},
                    {left: '\\[', right: '\\]', display: true}
                ],
                throwOnError: false
            });
        }
    });
</script>
</body>
</html>
