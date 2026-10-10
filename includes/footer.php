</main>

<footer class="bg-white border-t border-slate-200 py-6 mt-12">
    <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
        <p>&copy; <?= date('Y') ?> Premed Test Portal &bull; Pure PHP & SQLite Edition</p>
        <div class="flex items-center gap-4">
            <a href="active_study.php" class="hover:text-indigo-600 transition-colors">AI Study Lab</a>
            <a href="question_search.php" class="hover:text-indigo-600 transition-colors">Question Search</a>
            <a href="leaderboard.php" class="hover:text-indigo-600 transition-colors">Leaderboard</a>
            <a href="admin_login.php" class="hover:text-indigo-600 transition-colors">Instructor Login</a>
        </div>
    </div>
</footer>

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
