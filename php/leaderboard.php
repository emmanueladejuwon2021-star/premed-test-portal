<?php
/**
 * Leaderboard & Ranks View
 * Premed Test Portal (PHP Edition)
 */

$pageTitle = 'Leaderboard & Rankings';
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/header.php';

$db = DB::connect();

$stmt = $db->query("
    SELECT 
        s.name, 
        s.department, 
        COUNT(r.id) AS tests_taken,
        ROUND(AVG(r.percentage), 1) AS average_score,
        MAX(r.percentage) AS top_score
    FROM results r
    JOIN students s ON r.student_id = s.id
    GROUP BY s.id, s.name, s.department
    ORDER BY average_score DESC, tests_taken DESC
    LIMIT 50
");
$leaders = $stmt->fetchAll();
?>

<div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
    <div class="text-center max-w-xl mx-auto mb-8">
        <div class="w-12 h-12 mx-auto rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
            <i data-lucide="trophy" class="w-6 h-6"></i>
        </div>
        <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Academic Leaderboard</h1>
        <p class="text-xs text-slate-500 mt-1">Ranking the top performing pre-medical candidates based on cumulative performance and examination metrics.</p>
    </div>

    <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 border-b border-slate-200 font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                        <th class="px-6 py-4 text-center w-16">Rank</th>
                        <th class="px-6 py-4">Candidate</th>
                        <th class="px-6 py-4">Department</th>
                        <th class="px-6 py-4 text-center">Drills Taken</th>
                        <th class="px-6 py-4 text-center">Average Score</th>
                        <th class="px-6 py-4 text-right">Top Score</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                    <?php foreach ($leaders as $idx => $lead): 
                        $rank = $idx + 1;
                    ?>
                    <tr class="hover:bg-slate-50/70 transition-colors <?= $rank <= 3 ? 'bg-amber-50/20' : '' ?>">
                        <td class="px-6 py-4 text-center">
                            <?php if ($rank === 1): ?>
                            <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-sm shadow-amber-200">1</span>
                            <?php elseif ($rank === 2): ?>
                            <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-slate-900 font-black text-xs">2</span>
                            <?php elseif ($rank === 3): ?>
                            <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700 text-white font-black text-xs">3</span>
                            <?php else: ?>
                            <span class="font-bold text-slate-400"><?= $rank ?></span>
                            <?php endif; ?>
                        </td>
                        <td class="px-6 py-4 font-bold text-slate-900">
                            <?= htmlspecialchars($lead['name']) ?>
                        </td>
                        <td class="px-6 py-4 text-slate-500">
                            <?= htmlspecialchars($lead['department']) ?>
                        </td>
                        <td class="px-6 py-4 text-center text-slate-600 font-semibold">
                            <?= (int)$lead['tests_taken'] ?>
                        </td>
                        <td class="px-6 py-4 text-center font-extrabold text-indigo-600 text-sm">
                            <?= (float)$lead['average_score'] ?>%
                        </td>
                        <td class="px-6 py-4 text-right font-black text-emerald-600">
                            <?= round((float)$lead['top_score'], 1) ?>%
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
