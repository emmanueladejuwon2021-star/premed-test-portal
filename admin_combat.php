<?php
/**
 * Study Combat Admin Command Center - Production Management
 * Non-tech savvy interface for Live Monitor, Security Controls, Ranks & Questions Monitor
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (empty($_SESSION['admin'])) {
    header('Location: admin_login.php');
    exit;
}

require_once __DIR__ . '/config/db.php';
$pageTitle = "Study Combat Admin";
require_once __DIR__ . '/includes/header.php';

$pdo = DB::connect();

$tab = $_GET['tab'] ?? 'monitor';
$alertMsg = null;

// Handle Form Submissions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $postAction = $_POST['admin_action'] ?? '';

    if ($postAction === 'update_rank') {
        $rankId = $_POST['rank_id'];
        $rankName = trim($_POST['rank_name']);
        $winsNeeded = (int)$_POST['wins_needed'];

        $stmt = $pdo->prepare("UPDATE combat_rank_settings SET rank_name = ?, wins_needed = ? WHERE id = ?");
        $stmt->execute([$rankName, $winsNeeded, $rankId]);
        $alertMsg = "Rank threshold updated successfully!";
    } elseif ($postAction === 'give_coins') {
        $matric = trim($_POST['matric_no']);
        $coins = (int)$_POST['coins_amount'];

        $stu = $pdo->prepare("SELECT id FROM students WHERE matric_no = ? LIMIT 1");
        $stu->execute([$matric]);
        $studentRow = $stu->fetch();

        if ($studentRow) {
            $pdo->prepare("UPDATE user_combat_stats SET combat_coins = combat_coins + ? WHERE user_id = ?")->execute([$coins, $studentRow['id']]);
            $alertMsg = "Granted {$coins} combat coins to {$matric}.";
        } else {
            $alertMsg = "Candidate matric number not found.";
        }
    } elseif ($postAction === 'toggle_ban') {
        $userId = $_POST['user_id'];
        $currentBan = (int)$_POST['current_ban'];
        $newBan = $currentBan ? 0 : 1;

        $pdo->prepare("UPDATE user_combat_stats SET is_banned_from_combat = ? WHERE user_id = ?")->execute([$newBan, $userId]);
        $alertMsg = "User ban status updated.";
    } elseif ($postAction === 'clear_expired') {
        $pdo->exec("DELETE FROM combat_rooms WHERE created_at < datetime('now', '-1 day') AND status IN ('waiting', 'finished', 'terminated')");
        $alertMsg = "Cleared inactive waiting/expired rooms older than 24 hours.";
    }
}

// Fetch Data for Tabs
$activeRooms = $pdo->query("SELECT * FROM combat_rooms ORDER BY created_at DESC LIMIT 50")->fetchAll();
$allWarriors = $pdo->query("SELECT * FROM user_combat_stats ORDER BY wins DESC, total_points DESC LIMIT 100")->fetchAll();
$ranks = $pdo->query("SELECT * FROM combat_rank_settings ORDER BY wins_needed ASC")->fetchAll();
$antiCheatLogs = $pdo->query("SELECT * FROM combat_anticheat_logs ORDER BY created_at DESC LIMIT 50")->fetchAll();

// Questions Monitor per Topic
$topicsPool = $pdo->query("
    SELECT t.id, t.name as topic_name, c.code as course_code,
           (SELECT COUNT(*) FROM questions q WHERE q.topic_id = t.id) as past_count
    FROM topics t
    JOIN courses c ON t.course_id = c.id
    ORDER BY c.code ASC, t.id ASC
")->fetchAll();
?>

<div class="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4">

    <!-- Compact Top Bar -->
    <div class="bg-slate-900 rounded-2xl p-3.5 sm:p-4 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-purple-800/40">
        <div class="space-y-0.5">
            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-black uppercase">
                <i data-lucide="shield" class="w-3 h-3 text-purple-400"></i> Combat Command Center
            </div>
            <h1 class="text-lg sm:text-xl font-black flex items-center gap-2">STUDY COMBAT ADMIN ⚔️</h1>
            <p class="text-[11px] text-slate-300">Live battle surveillance, anti-cheat enforcement, rank thresholds, and question pool radar.</p>
        </div>
        <div class="flex items-center gap-2">
            <a href="admin_dashboard.php" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center gap-1.5">
                <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
                <span>Main Admin Console</span>
            </a>
        </div>
    </div>

    <?php if ($alertMsg): ?>
    <div class="p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
        ✅ <?= htmlspecialchars($alertMsg) ?>
    </div>
    <?php endif; ?>

    <!-- NAVIGATION TABS -->
    <div class="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2 border-b border-slate-200 dark:border-slate-800">
        <a href="admin_combat.php?tab=monitor" class="px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 <?= $tab === 'monitor' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300' ?>">
            <i data-lucide="activity" class="w-4 h-4"></i> Live Battle Monitor
        </a>

        <a href="admin_combat.php?tab=security" class="px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 <?= $tab === 'security' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300' ?>">
            <i data-lucide="lock" class="w-4 h-4"></i> Security & Anti-Cheat
        </a>

        <a href="admin_combat.php?tab=ranks" class="px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 <?= $tab === 'ranks' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300' ?>">
            <i data-lucide="award" class="w-4 h-4"></i> Ranks & Manual Coins
        </a>

        <a href="admin_combat.php?tab=players" class="px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 <?= $tab === 'players' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300' ?>">
            <i data-lucide="users" class="w-4 h-4"></i> Master Leaderboard
        </a>

        <a href="admin_combat.php?tab=questions" class="px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 <?= $tab === 'questions' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300' ?>">
            <i data-lucide="help-circle" class="w-4 h-4"></i> Questions Pool Radar
        </a>
    </div>

    <!-- TAB 1: LIVE GAME MONITOR -->
    <?php if ($tab === 'monitor'): ?>
    <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-800 space-y-4">
        <h2 class="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <i data-lucide="activity" class="w-4 h-4 text-purple-600"></i> Active PREMED- Battle Rooms
        </h2>

        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase text-slate-400">
                        <th class="py-3 px-4">Room Code</th>
                        <th class="py-3 px-4">Room Name</th>
                        <th class="py-3 px-4">Mode</th>
                        <th class="py-3 px-4">Status</th>
                        <th class="py-3 px-4">Created At</th>
                        <th class="py-3 px-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                    <?php if (empty($activeRooms)): ?>
                    <tr><td colspan="6" class="py-6 text-center text-slate-400">No active combat rooms right now.</td></tr>
                    <?php else: ?>
                    <?php foreach ($activeRooms as $r): ?>
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td class="py-3.5 px-4 font-mono font-black text-purple-600"><?= htmlspecialchars($r['room_code']) ?></td>
                        <td class="py-3.5 px-4 font-bold text-slate-900 dark:text-white"><?= htmlspecialchars($r['room_name']) ?></td>
                        <td class="py-3.5 px-4"><span class="px-2 py-0.5 rounded bg-purple-100 text-purple-700 text-[10px] font-bold"><?= htmlspecialchars($r['mode']) ?></span></td>
                        <td class="py-3.5 px-4">
                            <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase <?= $r['status'] === 'playing' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700' ?>">
                                <?= htmlspecialchars($r['status']) ?>
                            </span>
                        </td>
                        <td class="py-3.5 px-4 text-slate-400"><?= htmlspecialchars($r['created_at']) ?></td>
                        <td class="py-3.5 px-4 text-right space-x-2">
                            <a href="combat.php?room=<?= urlencode($r['room_code']) ?>" target="_blank" class="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 text-[11px] font-bold hover:bg-purple-100">Spectate</a>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>

    <!-- TAB 2: SECURITY & FAIRNESS CONTROLS -->
    <?php elseif ($tab === 'security'): ?>
    <div class="space-y-6">
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-800 space-y-4">
            <h2 class="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <i data-lucide="shield-check" class="w-4 h-4 text-purple-600"></i> Non-Tech Savvy Anti-Cheat Toggles
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                        <div class="text-xs font-bold text-slate-900 dark:text-white">Enforce Server-Side Timers</div>
                        <p class="text-[11px] text-slate-400">Timers controlled strictly by Node.js server.</p>
                    </div>
                    <span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black">ACTIVE</span>
                </div>

                <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                        <div class="text-xs font-bold text-slate-900 dark:text-white">Shuffle Options (A, B, C, D)</div>
                        <p class="text-[11px] text-slate-400">Prevent side-by-side screen peeking.</p>
                    </div>
                    <span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black">ACTIVE</span>
                </div>
            </div>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-800 space-y-4">
            <h2 class="text-base font-black text-slate-900 dark:text-white">Anti-Cheat Activity Logs</h2>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead>
                        <tr class="border-b border-slate-200 dark:border-slate-800 font-bold uppercase text-slate-400">
                            <th class="py-2 px-3">Matric No</th>
                            <th class="py-2 px-3">Room</th>
                            <th class="py-2 px-3">Activity</th>
                            <th class="py-2 px-3">Time</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                        <?php if (empty($antiCheatLogs)): ?>
                        <tr><td colspan="4" class="py-4 text-center text-slate-400">No suspicious anti-cheat logs recorded. All matches fair!</td></tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- TAB 3: RANKS & MANUAL COINS -->
    <?php elseif ($tab === 'ranks'): ?>
    <div class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Manual Coins Form -->
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-800 space-y-4">
                <h2 class="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <i data-lucide="coins" class="w-4 h-4 text-amber-500"></i> Give Combat Coins Manually
                </h2>

                <form method="POST" class="space-y-4">
                    <input type="hidden" name="admin_action" value="give_coins">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Candidate Matric Number</label>
                        <input type="text" name="matric_no" required placeholder="e.g. MED/2023/001" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Coins Amount</label>
                        <input type="number" name="coins_amount" value="50" required class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold">
                    </div>
                    <button type="submit" class="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase">
                        Grant Coins
                    </button>
                </form>
            </div>

            <!-- Room Cleanup -->
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-800 space-y-4">
                <h2 class="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <i data-lucide="trash-2" class="w-4 h-4 text-rose-500"></i> Maintenance & Room Cleanup
                </h2>

                <p class="text-xs text-slate-500">Purge stale waiting or expired rooms older than 24 hours from the database.</p>

                <form method="POST">
                    <input type="hidden" name="admin_action" value="clear_expired">
                    <button type="submit" onclick="return confirm('Clear all waiting rooms older than 24h?');" class="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase">
                        Clear Rooms > 24 Hours
                    </button>
                </form>
            </div>
        </div>

        <!-- Editable Rank Thresholds Table -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-800 space-y-4">
            <h2 class="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <i data-lucide="award" class="w-4 h-4 text-purple-600"></i> Edit Rank Thresholds & Spacing
            </h2>

            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr class="border-b border-slate-200 dark:border-slate-800 font-bold uppercase text-slate-400">
                            <th class="py-2 px-3">Rank Name</th>
                            <th class="py-2 px-3">Wins Needed</th>
                            <th class="py-2 px-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                        <?php foreach ($ranks as $rk): ?>
                        <tr>
                            <form method="POST">
                                <input type="hidden" name="admin_action" value="update_rank">
                                <input type="hidden" name="rank_id" value="<?= htmlspecialchars($rk['id']) ?>">
                                <td class="py-2 px-3">
                                    <input type="text" name="rank_name" value="<?= htmlspecialchars($rk['rank_name']) ?>" required class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white">
                                </td>
                                <td class="py-2 px-3">
                                    <input type="number" name="wins_needed" value="<?= $rk['wins_needed'] ?>" required class="w-24 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white">
                                </td>
                                <td class="py-2 px-3 text-right">
                                    <button type="submit" class="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold">Save</button>
                                </td>
                            </form>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- TAB 4: MASTER LEADERBOARD -->
    <?php elseif ($tab === 'players'): ?>
    <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-800 space-y-4">
        <h2 class="text-base font-black text-slate-900 dark:text-white">Master Player List (Top 100)</h2>
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
                <thead>
                    <tr class="border-b border-slate-200 dark:border-slate-800 font-bold uppercase text-slate-400">
                        <th class="py-2 px-3">Student Name</th>
                        <th class="py-2 px-3">Matric No</th>
                        <th class="py-2 px-3">Current Rank</th>
                        <th class="py-2 px-3 text-center">Wins</th>
                        <th class="py-2 px-3 text-center">Coins</th>
                        <th class="py-2 px-3 text-right">Ban Status</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                    <?php foreach ($allWarriors as $w): ?>
                    <tr>
                        <td class="py-3 px-3 font-bold text-slate-900 dark:text-white"><?= htmlspecialchars($w['student_name'] ?? 'Warrior') ?></td>
                        <td class="py-3 px-3 font-mono text-purple-600"><?= htmlspecialchars($w['matric_no'] ?? '') ?></td>
                        <td class="py-3 px-3"><span class="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold text-[10px]"><?= htmlspecialchars($w['current_rank']) ?></span></td>
                        <td class="py-3 px-3 text-center font-black text-emerald-600"><?= $w['wins'] ?></td>
                        <td class="py-3 px-3 text-center font-black text-amber-500"><?= $w['combat_coins'] ?></td>
                        <td class="py-3 px-3 text-right">
                            <form method="POST" class="inline">
                                <input type="hidden" name="admin_action" value="toggle_ban">
                                <input type="hidden" name="user_id" value="<?= htmlspecialchars($w['user_id']) ?>">
                                <input type="hidden" name="current_ban" value="<?= $w['is_banned_from_combat'] ?>">
                                <button type="submit" class="px-2.5 py-1 rounded-lg text-[10px] font-bold <?= $w['is_banned_from_combat'] ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700' ?>">
                                    <?= $w['is_banned_from_combat'] ? 'Unban' : 'Ban' ?>
                                </button>
                            </form>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>

    <!-- TAB 5: QUESTIONS POOL RADAR -->
    <?php elseif ($tab === 'questions'): ?>
    <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-800 space-y-4">
        <h2 class="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <i data-lucide="help-circle" class="w-4 h-4 text-purple-600"></i> Questions Pool Radar
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <?php foreach ($topicsPool as $tp): ?>
            <?php $count = (int)$tp['past_count']; ?>
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700"><?= htmlspecialchars($tp['course_code']) ?></span>
                    <?php if ($count < 20): ?>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700">Low Qs (&lt;20)</span>
                    <?php else: ?>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">OK (<?= $count ?> Qs)</span>
                    <?php endif; ?>
                </div>
                <div class="text-xs font-bold text-slate-900 dark:text-white truncate"><?= htmlspecialchars($tp['topic_name']) ?></div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>

</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
