</main>

<?php if (($currentPage ?? basename($_SERVER['PHP_SELF'])) !== 'exam.php'): ?>
<footer class="bg-white border-t border-slate-200 py-6 mt-12">
    <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
        <p>&copy; <?= date('Y') ?> Premed Test Portal &bull; All Rights Reserved</p>
        <div class="flex items-center gap-4">
            <a href="login.php?tab=admin" class="hover:text-rose-600 transition-colors flex items-center gap-1 font-semibold">
                <i data-lucide="shield" class="w-3.5 h-3.5"></i>
                <span>Admin Login</span>
            </a>
        </div>
    </div>
</footer>
<?php endif; ?>

<script>
    // Initialize Lucide icons
    lucide.createIcons();

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
