<?php
/**
 * STUDY COMBAT - Real-time Player-vs-Player Academic Battle Arena
 * Premed Test Portal
 */

require_once __DIR__ . '/config/db.php';
$pageTitle = "Study Combat Arena ⚔️";
require_once __DIR__ . '/includes/header.php';

$pdo = DB::connect();

$studentId = $_SESSION['student_id'] ?? ($_SESSION['student']['id'] ?? null);
$studentName = $_SESSION['student_name'] ?? ($_SESSION['student']['name'] ?? 'Student');
$matricNo = $_SESSION['student_matric'] ?? ($_SESSION['student']['matric_no'] ?? 'STU' . rand(1000, 9999));

if (!$studentId) {
    header('Location: login.php');
    exit;
}

$action = $_GET['action'] ?? 'lobby';
$tab = $_GET['tab'] ?? 'home';

// Fetch Courses & Topics for Form
$courses = $pdo->query("SELECT * FROM courses ORDER BY code ASC")->fetchAll();
$allTopics = $pdo->query("SELECT * FROM topics ORDER BY course_id ASC, id ASC")->fetchAll();

// Fetch User Combat Stats
$uStats = $pdo->prepare("SELECT * FROM user_combat_stats WHERE user_id = ? LIMIT 1");
$uStats->execute([$studentId]);
$userCombatStats = $uStats->fetch() ?: [
    'total_matches' => 0,
    'wins' => 0,
    'losses' => 0,
    'draws' => 0,
    'total_points' => 0,
    'combat_coins' => 0,
    'current_rank' => 'Noobie',
    'wins_for_rank' => 0
];

// Fetch Ranks
$rankRows = $pdo->query("SELECT * FROM combat_rank_settings ORDER BY wins_needed ASC")->fetchAll();

// Fetch Leaderboard Top 50
$leaderboard = $pdo->query("
    SELECT s.*, st.department
    FROM user_combat_stats s
    LEFT JOIN students st ON s.user_id = st.id
    ORDER BY s.wins DESC, s.total_points DESC
    LIMIT 50
")->fetchAll();

// Fetch Match History
$historyStmt = $pdo->prepare("
    SELECT * FROM combat_final_results
    WHERE players LIKE ?
    ORDER BY created_at DESC
    LIMIT 20
");
$historyStmt->execute(['%' . $studentId . '%']);
$matchHistory = $historyStmt->fetchAll();
?>

<!-- Include Socket.io Client & Canvas Confetti -->
<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">

    <!-- TOP ARENA HEADER / NAVIGATION TABS -->
    <div class="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden border border-purple-800/40">
        <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -left-10 -top-10 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div class="space-y-2">
                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-extrabold uppercase tracking-widest">
                    <i data-lucide="swords" class="w-3.5 h-3.5 text-purple-400 animate-pulse"></i>
                    <span>Real-Time PvP Academic Duel</span>
                </div>
                <h1 class="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                    STUDY COMBAT <span class="text-amber-400">⚔️</span>
                </h1>
                <p class="text-slate-300 text-xs sm:text-sm max-w-xl">
                    Challenge peers in live proctored question duels. Steal points on bonus turns, level up your rank badge, and win 50 coins!
                </p>
            </div>

            <!-- Gamer Quick Profile Badge -->
            <div class="flex items-center gap-4 bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-purple-500/30 shadow-lg">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md">
                    <?= strtoupper(substr($studentName, 0, 1)) ?>
                </div>
                <div>
                    <div class="text-xs text-slate-400 font-semibold"><?= htmlspecialchars($studentName) ?></div>
                    <div class="text-sm font-black text-amber-400 flex items-center gap-1.5">
                        <i data-lucide="shield-alert" class="w-4 h-4"></i>
                        <span><?= htmlspecialchars($userCombatStats['current_rank']) ?></span>
                    </div>
                    <div class="text-[11px] text-purple-300 font-bold"><?= $userCombatStats['wins'] ?> Wins | <?= $userCombatStats['combat_coins'] ?> Coins</div>
                </div>
            </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex items-center gap-2 mt-6 pt-6 border-t border-slate-800/80 overflow-x-auto scrollbar-none">
            <a href="combat.php?action=lobby" class="px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 <?= ($action === 'lobby' && $tab === 'home') ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800' ?>">
                <i data-lucide="gamepad-2" class="w-4 h-4"></i>
                <span>Arena Lobby</span>
            </a>

            <a href="combat.php?action=create" class="px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 <?= ($action === 'create') ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800' ?>">
                <i data-lucide="swords" class="w-4 h-4 text-purple-400"></i>
                <span>Create Battle Room</span>
            </a>

            <a href="combat.php?action=join" class="px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 <?= ($action === 'join') ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800' ?>">
                <i data-lucide="key-round" class="w-4 h-4 text-emerald-400"></i>
                <span>Join Battle Room</span>
            </a>

            <a href="combat.php?tab=profile" class="px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 <?= ($tab === 'profile') ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800' ?>">
                <i data-lucide="trophy" class="w-4 h-4 text-amber-400"></i>
                <span>My Gamer Profile</span>
            </a>

            <a href="combat.php?tab=leaderboard" class="px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 <?= ($tab === 'leaderboard') ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800' ?>">
                <i data-lucide="crown" class="w-4 h-4 text-yellow-400"></i>
                <span>Leaderboard</span>
            </a>
        </div>
    </div>

    <!-- MAIN DYNAMIC SECTION -->
    <div id="mainCombatContainer">

        <?php if ($action === 'create'): ?>
        <!-- ================= PART 3: CREATE BATTLE ROOM PAGE ================= -->
        <div class="max-w-3xl mx-auto space-y-6">
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 dark:border-slate-800 space-y-6">
                <div class="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h2 class="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <i data-lucide="swords" class="w-5 h-5 text-purple-600"></i>
                        <span>Configure Battle Settings</span>
                    </h2>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Set up your room preferences, pick a single topic, and generate a PREMED- code.</p>
                </div>

                <form id="createRoomForm" class="space-y-6">
                    <!-- Field 1: Room Name -->
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                            <i data-lucide="shield" class="w-4 h-4 text-purple-600"></i>
                            <span>Battle Room Name</span>
                        </label>
                        <input type="text" id="formRoomName" value="<?= htmlspecialchars($studentName) ?>'s Kings Battle" required placeholder="e.g. Pharma Kings Battle, Anatomy Warriors" class="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <p class="text-[11px] text-slate-400 mt-1">Give your battle room a cool name. Opponents will see this in the lobby.</p>
                    </div>

                    <!-- Field 2: Select Course -->
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                            <i data-lucide="book-open" class="w-4 h-4 text-purple-600"></i>
                            <span>Choose Course</span>
                        </label>
                        <select id="formCourseId" required class="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500">
                            <option value="">-- Select Course --</option>
                            <?php foreach ($courses as $c): ?>
                            <option value="<?= htmlspecialchars($c['id']) ?>" data-code="<?= htmlspecialchars($c['code']) ?>"><?= htmlspecialchars($c['code']) ?> - <?= htmlspecialchars($c['title']) ?></option>
                            <?php endforeach; ?>
                        </select>
                        <p class="text-[11px] text-slate-400 mt-1">Which course curriculum do you want to fight on?</p>
                    </div>

                    <!-- Field 3: Select Topic -->
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                            <i data-lucide="target" class="w-4 h-4 text-purple-600"></i>
                            <span>Choose ONE Topic for Whole Battle</span>
                        </label>
                        <select id="formTopicId" required class="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500">
                            <option value="">-- Select Course First --</option>
                        </select>
                        <p class="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">This ONE topic will be used for ALL rounds from start to end. Both players must agree on this topic.</p>
                    </div>

                    <!-- Field 4: Questions Per Round -->
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                            <i data-lucide="help-circle" class="w-4 h-4 text-purple-600"></i>
                            <span>How many questions per player per round?</span>
                        </label>
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2" id="qPerRoundPills">
                            <button type="button" data-val="3" class="q-pill py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-purple-500">3 Questions</button>
                            <button type="button" data-val="4" class="q-pill py-2.5 px-3 rounded-xl border-2 border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-xs font-bold text-purple-700 dark:text-purple-300">4 Questions</button>
                            <button type="button" data-val="5" class="q-pill py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-purple-500">5 Questions</button>
                            <button type="button" data-val="custom" class="q-pill py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-purple-500">Custom</button>
                        </div>
                        <input type="number" id="formCustomQs" min="1" max="10" placeholder="Type custom number (1-10)" class="hidden w-full mt-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                        <p class="text-[11px] text-slate-400 mt-1">If you choose 4 questions per round and 4 rounds, total duel equals 32 questions.</p>
                    </div>

                    <!-- Field 5: Number of Rounds -->
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                            <i data-lucide="rotate-cw" class="w-4 h-4 text-purple-600"></i>
                            <span>How many rounds?</span>
                        </label>
                        <div class="grid grid-cols-3 sm:grid-cols-5 gap-2" id="roundsPills">
                            <button type="button" data-val="2" class="r-pill py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300">2 Rounds</button>
                            <button type="button" data-val="3" class="r-pill py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300">3 Rounds</button>
                            <button type="button" data-val="4" class="r-pill py-2.5 px-3 rounded-xl border-2 border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-xs font-bold text-purple-700 dark:text-purple-300">4 (Rec)</button>
                            <button type="button" data-val="5" class="r-pill py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300">5 Rounds</button>
                            <button type="button" data-val="6" class="r-pill py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300">6 Rounds</button>
                        </div>
                    </div>

                    <!-- Field 6: Battle Mode -->
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                            <i data-lucide="users" class="w-4 h-4 text-purple-600"></i>
                            <span>Choose Battle Mode</span>
                        </label>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div id="modeCard1v1" onclick="selectMode('1v1')" class="mode-card p-4 rounded-2xl border-2 border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 cursor-pointer hover:shadow-md transition-all relative">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">1v1</div>
                                    <div>
                                        <div class="text-sm font-black text-slate-900 dark:text-white">1 vs 1 Duel</div>
                                        <p class="text-[11px] text-slate-500 dark:text-slate-400">Classic head-to-head duel.</p>
                                    </div>
                                </div>
                            </div>

                            <div id="modeCard2v1" onclick="selectMode('2v1')" class="mode-card p-4 rounded-2xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-md transition-all relative">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold">2v1</div>
                                    <div>
                                        <div class="text-sm font-black text-slate-900 dark:text-white">2 vs 1 Team Battle</div>
                                        <p class="text-[11px] text-slate-500 dark:text-slate-400">Team of 2 must agree on option.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Submit Button -->
                    <button type="submit" class="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-black uppercase tracking-wider shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2">
                        <i data-lucide="sparkles" class="w-5 h-5"></i>
                        <span>GENERATE PREMED- CODE & CREATE ROOM</span>
                    </button>
                </form>
            </div>
        </div>

        <?php elseif ($action === 'join'): ?>
        <!-- ================= PART 2 & 3: JOIN BATTLE ROOM PAGE ================= -->
        <div class="max-w-xl mx-auto space-y-6">
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 dark:border-slate-800 space-y-6 text-center">
                <div>
                    <div class="w-16 h-16 rounded-3xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center mx-auto mb-3">
                        <i data-lucide="key-round" class="w-8 h-8"></i>
                    </div>
                    <h2 class="text-2xl font-black text-slate-900 dark:text-white">JOIN BATTLE ROOM</h2>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Enter the 5-digit room code sent by your friend on WhatsApp.</p>
                </div>

                <div class="space-y-4">
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-mono font-bold text-lg">
                            PREMED-
                        </div>
                        <input type="text" id="joinCodeInput" maxlength="12" placeholder="83921" class="w-full pl-28 pr-4 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xl font-black tracking-widest uppercase focus:outline-none focus:border-purple-600 text-center">
                    </div>

                    <!-- Live REST API Validation Feedback Box -->
                    <div id="validationBox" class="hidden p-4 rounded-2xl text-xs font-bold transition-all text-left space-y-2"></div>

                    <!-- Preview Card -->
                    <div id="roomPreviewCard" class="hidden bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-left space-y-3">
                        <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                            <span class="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Room Preview</span>
                            <span id="prevModeBadge" class="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[10px] font-black">1v1</span>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-xs">
                            <div><span class="text-slate-400">Room Name:</span> <strong id="prevRoomName" class="block text-slate-800 dark:text-slate-100">--</strong></div>
                            <div><span class="text-slate-400">Host:</span> <strong id="prevHostName" class="block text-slate-800 dark:text-slate-100">--</strong></div>
                            <div><span class="text-slate-400">Course:</span> <strong id="prevCourseCode" class="block text-slate-800 dark:text-slate-100">--</strong></div>
                            <div><span class="text-slate-400">Topic:</span> <strong id="prevTopicName" class="block text-slate-800 dark:text-slate-100">--</strong></div>
                        </div>

                        <!-- Rules Summary -->
                        <div class="bg-purple-50 dark:bg-purple-950/40 p-3 rounded-xl border border-purple-100 dark:border-purple-900/50 text-[11px] text-purple-900 dark:text-purple-300 space-y-1">
                            <div class="font-bold flex items-center gap-1"><i data-lucide="shield-check" class="w-3.5 h-3.5"></i> Battle Rules:</div>
                            <div>• 30s per main turn | +2 pts correct answer</div>
                            <div>• 15s bonus turn on opponent fail | +1 pt correct | -1 pt fail</div>
                        </div>

                        <!-- Agree Checkbox -->
                        <label class="flex items-center gap-2 cursor-pointer pt-2">
                            <input type="checkbox" id="agreeRulesCheckbox" class="w-4 h-4 rounded text-purple-600 focus:ring-purple-500">
                            <span class="text-xs font-bold text-slate-700 dark:text-slate-300">I agree to play on this topic and these duel rules</span>
                        </label>
                    </div>

                    <!-- Join Button -->
                    <button type="button" id="joinBattleBtn" disabled class="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition-all">
                        Agree to Topic & Join Battle
                    </button>
                </div>
            </div>
        </div>

        <?php elseif ($tab === 'profile'): ?>
        <!-- ================= PART 9: GAMER PROFILE ================= -->
        <div class="space-y-6">
            <!-- Profile Banner -->
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-6">
                <div class="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-black text-3xl flex items-center justify-center shadow-xl ring-4 ring-purple-100 dark:ring-purple-950">
                    <?= strtoupper(substr($studentName, 0, 1)) ?>
                </div>

                <div class="text-center md:text-left space-y-2 flex-1">
                    <h2 class="text-2xl font-black text-slate-900 dark:text-white"><?= htmlspecialchars($studentName) ?></h2>
                    <div class="text-xs font-mono font-bold text-purple-600 dark:text-purple-400"><?= htmlspecialchars($matricNo) ?></div>

                    <div class="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                        <span class="px-3 py-1 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-black flex items-center gap-1.5">
                            <i data-lucide="shield" class="w-4 h-4"></i>
                            <span>Rank: <?= htmlspecialchars($userCombatStats['current_rank']) ?></span>
                        </span>
                        <span class="px-3 py-1 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-black flex items-center gap-1.5">
                            <i data-lucide="coins" class="w-4 h-4"></i>
                            <span><?= $userCombatStats['combat_coins'] ?> Combat Coins</span>
                        </span>
                    </div>
                </div>
            </div>

            <!-- Rank Progress Bar -->
            <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 space-y-3">
                <div class="flex items-center justify-between text-xs font-bold">
                    <span class="text-slate-500">Current Rank: <strong class="text-purple-600 dark:text-purple-400 font-black"><?= htmlspecialchars($userCombatStats['current_rank']) ?></strong></span>
                    <span class="text-slate-400"><?= $userCombatStats['wins'] ?> Total Wins</span>
                </div>
                <div class="w-full bg-slate-100 dark:bg-slate-800 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                    <div class="bg-gradient-to-r from-purple-600 to-pink-600 h-full rounded-full transition-all duration-500" style="width: <?= min(100, max(5, ($userCombatStats['wins'] / 50) * 100)) ?>%;"></div>
                </div>
                <p class="text-[11px] text-slate-400 font-medium">Keep winning battles to level up your rank badge and earn global prestige!</p>
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-md border border-slate-100 dark:border-slate-800 text-center">
                    <div class="text-xs font-bold text-slate-400 uppercase">Matches Played</div>
                    <div class="text-2xl font-black text-slate-900 dark:text-white mt-1"><?= $userCombatStats['total_matches'] ?></div>
                </div>

                <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-md border border-slate-100 dark:border-slate-800 text-center">
                    <div class="text-xs font-bold text-slate-400 uppercase">Wins / Losses / Draws</div>
                    <div class="text-2xl font-black text-emerald-600 mt-1"><?= $userCombatStats['wins'] ?> <span class="text-rose-500 text-base">/ <?= $userCombatStats['losses'] ?></span> <span class="text-slate-400 text-base">/ <?= $userCombatStats['draws'] ?></span></div>
                </div>

                <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-md border border-slate-100 dark:border-slate-800 text-center">
                    <div class="text-xs font-bold text-slate-400 uppercase">Win Rate</div>
                    <div class="text-2xl font-black text-purple-600 mt-1">
                        <?= $userCombatStats['total_matches'] > 0 ? round(($userCombatStats['wins'] / $userCombatStats['total_matches']) * 100) : 0 ?>%
                    </div>
                </div>

                <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-md border border-slate-100 dark:border-slate-800 text-center">
                    <div class="text-xs font-bold text-slate-400 uppercase">Total Points</div>
                    <div class="text-2xl font-black text-amber-500 mt-1"><?= $userCombatStats['total_points'] ?> pts</div>
                </div>
            </div>

            <!-- Match History -->
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-800 space-y-4">
                <h3 class="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <i data-lucide="history" class="w-4 h-4 text-purple-600"></i>
                    <span>Recent Battle History</span>
                </h3>

                <?php if (empty($matchHistory)): ?>
                <p class="text-xs text-slate-400 py-4 text-center">No battles fought yet. Go create or join a room to get started!</p>
                <?php else: ?>
                <div class="space-y-3">
                    <?php foreach ($matchHistory as $mh): ?>
                    <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div>
                            <div class="text-xs font-mono font-bold text-purple-600"><?= htmlspecialchars($mh['room_code']) ?></div>
                            <div class="text-[11px] text-slate-400"><?= htmlspecialchars($mh['created_at']) ?></div>
                        </div>
                        <div class="text-right">
                            <span class="text-xs font-bold px-2.5 py-1 rounded-lg <?= $mh['winner_user_id'] === $studentId ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700' ?>">
                                <?= $mh['winner_user_id'] === $studentId ? 'WIN (+50 Coins)' : 'LOSS (0 Coins)' ?>
                            </span>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
                <?php endif; ?>
            </div>
        </div>

        <?php elseif ($tab === 'leaderboard'): ?>
        <!-- ================= PART 8 & 10: LEADERBOARD PAGE ================= -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 dark:border-slate-800 space-y-6">
            <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h2 class="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <i data-lucide="crown" class="w-5 h-5 text-amber-500"></i>
                    <span>Study Combat Master Leaderboard</span>
                </h2>
                <a href="/api/combat/export-leaderboard" class="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-100 flex items-center gap-1.5">
                    <i data-lucide="download" class="w-3.5 h-3.5"></i> Export CSV
                </a>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase text-slate-400">
                            <th class="py-3 px-4">Rank</th>
                            <th class="py-3 px-4">Warrior</th>
                            <th class="py-3 px-4">Rank Badge</th>
                            <th class="py-3 px-4 text-center">Wins</th>
                            <th class="py-3 px-4 text-center">Matches</th>
                            <th class="py-3 px-4 text-center">Coins</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                        <?php $pos = 1; foreach ($leaderboard as $lb): ?>
                        <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            <td class="py-3.5 px-4 font-black">
                                <?php if ($pos === 1): ?> 🥇 1
                                <?php elseif ($pos === 2): ?> 🥈 2
                                <?php elseif ($pos === 3): ?> 🥉 3
                                <?php else: ?> #<?= $pos ?>
                                <?php endif; ?>
                            </td>
                            <td class="py-3.5 px-4 flex items-center gap-2.5">
                                <div class="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">
                                    <?= strtoupper(substr($lb['student_name'] ?? 'S', 0, 1)) ?>
                                </div>
                                <div>
                                    <div class="font-bold text-slate-900 dark:text-white"><?= htmlspecialchars($lb['student_name'] ?? 'Warrior') ?></div>
                                    <div class="text-[10px] text-slate-400 font-mono"><?= htmlspecialchars($lb['matric_no'] ?? '') ?></div>
                                </div>
                            </td>
                            <td class="py-3.5 px-4">
                                <span class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                                    <?= htmlspecialchars($lb['current_rank'] ?? 'Noobie') ?>
                                </span>
                            </td>
                            <td class="py-3.5 px-4 text-center font-black text-emerald-600"><?= $lb['wins'] ?></td>
                            <td class="py-3.5 px-4 text-center font-bold text-slate-500"><?= $lb['total_matches'] ?></td>
                            <td class="py-3.5 px-4 text-center font-black text-amber-500"><?= $lb['combat_coins'] ?></td>
                        </tr>
                        <?php $pos++; endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>

        <?php endif; ?>

        <!-- ================= ARENA LOBBY & LIVE GAME CONTAINER (ALWAYS PRESENT FOR DYNAMIC UI TRANSITIONS) ================= -->
        <div id="arenaLiveContainer" class="<?= ($action === 'create' || $action === 'join' || $tab === 'profile' || $tab === 'leaderboard') ? 'hidden' : '' ?> space-y-6">

            <!-- LOBBY / WAITING SCREEN -->
            <div id="lobbyScreen" class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 dark:border-slate-800 text-center space-y-6">
                <div class="max-w-md mx-auto space-y-4">
                    <div class="w-20 h-20 rounded-3xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 flex items-center justify-center mx-auto shadow-inner">
                        <i data-lucide="swords" class="w-10 h-10 animate-bounce"></i>
                    </div>
                    <h2 class="text-2xl font-black text-slate-900 dark:text-white">COMBAT ARENA LOBBY</h2>
                    <p class="text-xs text-slate-500 dark:text-slate-400">Create a new battle room or enter a PREMED- code to challenge a classmate live.</p>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                        <a href="combat.php?action=create" class="p-5 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-purple-600/30 hover:scale-[1.02] transition-transform flex flex-col items-center gap-2">
                            <i data-lucide="plus-circle" class="w-6 h-6"></i>
                            <span>Create Room</span>
                        </a>

                        <a href="combat.php?action=join" class="p-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-600/30 hover:scale-[1.02] transition-transform flex flex-col items-center gap-2">
                            <i data-lucide="key-round" class="w-6 h-6"></i>
                            <span>Join Room</span>
                        </a>
                    </div>
                </div>
            </div>

            <!-- WAITING FOR OPPONENT SCREEN (DYNAMICALY SHOWN BY SOCKET) -->
            <div id="waitingForOpponentScreen" class="hidden bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border border-purple-100 dark:border-purple-950 text-center space-y-6">
                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>Battle Room Active</span>
                </div>

                <div class="space-y-2">
                    <div class="text-xs text-slate-400 font-bold uppercase">SHARE THIS CODE WITH OPPONENT</div>
                    <div id="activeRoomCodeDisplay" class="text-4xl sm:text-5xl font-black font-mono tracking-widest text-purple-600 dark:text-purple-400">PREMED-83921</div>
                </div>

                <div class="flex items-center justify-center gap-3">
                    <button type="button" id="copyCodeBtn" class="px-4 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-black hover:bg-purple-100 flex items-center gap-1.5">
                        <i data-lucide="copy" class="w-4 h-4"></i> Copy Code
                    </button>
                    <a id="shareWhatsappBtn" target="_blank" href="#" class="px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-black hover:bg-emerald-600 flex items-center gap-1.5 shadow-md">
                        <i data-lucide="share-2" class="w-4 h-4"></i> Share on WhatsApp
                    </a>
                </div>

                <!-- Joined Players List -->
                <div class="max-w-md mx-auto bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-left space-y-3">
                    <div class="text-xs font-extrabold text-slate-400 uppercase">Players Joined:</div>
                    <div id="joinedPlayersList" class="space-y-2"></div>
                </div>

                <!-- Start Battle Button for Host -->
                <button type="button" id="startBattleBtn" class="hidden max-w-md mx-auto w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-black uppercase tracking-wider shadow-lg shadow-purple-600/30">
                    START BATTLE NOW ⚔️
                </button>
            </div>

            <!-- COMBAT ARENA SCREEN (DYNAMICALY SHOWN WHEN GAME STARTS) -->
            <div id="combatArenaScreen" class="hidden space-y-6">

                <!-- STICKY TOP SCOREBAR -->
                <div class="sticky top-20 z-40 bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-purple-800/50 flex items-center justify-between text-white">
                    <div class="flex items-center gap-3">
                        <span id="arenaRoundIndicator" class="px-3 py-1 rounded-xl bg-purple-600 text-white text-xs font-black">Round 1 / 4</span>
                        <span id="arenaRoomCode" class="text-xs font-mono font-bold text-slate-400 hidden sm:inline-block">PREMED-XXXXX</span>
                    </div>

                    <!-- Live Scores -->
                    <div id="arenaLiveScores" class="flex items-center gap-4 text-xs font-black"></div>
                </div>

                <!-- QUESTION CARD & TIMER AREA -->
                <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-6">

                    <!-- Header with Synced Circular Timer -->
                    <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div>
                            <span id="questionTurnBadge" class="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">Your Turn</span>
                            <div id="questionNumberHeader" class="text-sm font-black text-slate-900 dark:text-white">Question 1 of 4</div>
                        </div>

                        <!-- Circular Timer -->
                        <div class="relative w-14 h-14 flex items-center justify-center">
                            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <path class="text-slate-200 dark:text-slate-800" stroke-width="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path id="timerCircleProgress" class="text-emerald-500 transition-all duration-1000" stroke-dasharray="100, 100" stroke-width="3" stroke-linecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            </svg>
                            <span id="arenaTimerText" class="absolute font-black font-mono text-base text-slate-900 dark:text-white">30</span>
                        </div>
                    </div>

                    <!-- Spectator Status Bar -->
                    <div id="spectatorStatusBar" class="hidden p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
                        <i data-lucide="eye" class="w-4 h-4 text-amber-500 animate-pulse"></i>
                        <span id="spectatorStatusText">Opponent is thinking... You are spectating.</span>
                    </div>

                    <!-- Question Text -->
                    <div id="arenaQuestionText" class="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                        Loading question...
                    </div>

                    <!-- Options 2x2 Grid -->
                    <div id="arenaOptionsGrid" class="grid grid-cols-1 sm:grid-cols-2 gap-4"></div>

                    <!-- Explanation Box (Shows after answer) -->
                    <div id="explanationBox" class="hidden p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 text-xs text-purple-900 dark:text-purple-200 space-y-1">
                        <div class="font-black flex items-center gap-1.5"><i data-lucide="book-open" class="w-4 h-4"></i> Explanation:</div>
                        <div id="explanationText">--</div>
                    </div>
                </div>
            </div>

            <!-- ROUND VICTORY MODAL SCREEN -->
            <div id="roundVictoryModal" class="hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-purple-500/30 text-center space-y-6 animate-in zoom-in-95">
                    <div class="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center mx-auto shadow-inner">
                        <i data-lucide="crown" class="w-8 h-8 text-amber-500"></i>
                    </div>

                    <div class="space-y-1">
                        <h3 id="roundVictoryTitle" class="text-2xl font-black text-slate-900 dark:text-white">Round 1 Finished!</h3>
                        <p id="roundWinnerBanner" class="text-sm font-bold text-amber-500">John Won This Round!</p>
                    </div>

                    <div id="roundStatsTableContainer" class="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700"></div>

                    <button type="button" onclick="closeRoundVictoryModal()" class="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider shadow-lg">
                        Continue to Next Round
                    </button>
                </div>
            </div>

            <!-- FINAL VICTORY MODAL SCREEN -->
            <div id="finalVictoryModal" class="hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-purple-500/30 text-center space-y-6 animate-in zoom-in-95">
                    <div class="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 text-white flex items-center justify-center mx-auto shadow-2xl ring-4 ring-amber-300/40">
                        <i data-lucide="trophy" class="w-12 h-12"></i>
                    </div>

                    <div class="space-y-2">
                        <h2 id="victoryTitle" class="text-3xl font-black text-slate-900 dark:text-white">BATTLE FINISHED!</h2>
                        <div id="victorySubtitle" class="text-sm font-bold text-amber-500">Winner: --</div>
                    </div>

                    <!-- Final Scores Card -->
                    <div id="finalScoresTable" class="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2"></div>

                    <!-- Buttons -->
                    <div class="space-y-2">
                        <button type="button" id="rematchBtn" class="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider shadow-lg">
                            Rematch with New Questions
                        </button>
                        <a href="combat.php?tab=leaderboard" class="block w-full py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-black uppercase">
                            Go to Leaderboard
                        </a>
                    </div>
                </div>
            </div>

        </div>

    </div>
</div>

<script>
    // Global User & Socket State
    const STUDENT_ID = "<?= $studentId ?>";
    const STUDENT_NAME = "<?= htmlspecialchars($studentName, ENT_QUOTES) ?>";
    const MATRIC_NO = "<?= htmlspecialchars($matricNo, ENT_QUOTES) ?>";

    // Dynamic Socket.io Connection URL
    const SOCKET_URL = window.location.protocol + '//' + window.location.hostname + ':8899';
    let socket = null;
    let currentRoom = null;
    let selectedModeVal = '1v1';
    let selectedQPerRound = 4;
    let selectedRounds = 4;

    document.addEventListener('DOMContentLoaded', function () {
        if (window.lucide) lucide.createIcons();

        // Connect Socket.io
        try {
            socket = io(SOCKET_URL, {
                reconnection: true,
                reconnectionAttempts: 10
            });

            socket.on('connect', () => {
                console.log('[COMBAT SOCKET CONNECTED]', socket.id);
            });

            socket.on('errorMsg', (msg) => {
                alert('Combat Alert: ' + msg);
            });

            setupSocketListeners();
        } catch (e) {
            console.error('Socket connection error:', e);
        }

        setupFormInteractions();
        setupJoinCodeValidation();
    });

    // Handle Form Pills and Card Selections
    function setupFormInteractions() {
        // Course -> Topics Dropdown Filter
        const courseSelect = document.getElementById('formCourseId');
        const topicSelect = document.getElementById('formTopicId');
        const allTopicsData = <?= json_encode($allTopics) ?>;

        if (courseSelect && topicSelect) {
            courseSelect.addEventListener('change', function () {
                const cId = this.value;
                topicSelect.innerHTML = '<option value="">-- Select Topic --</option>';
                const filtered = allTopicsData.filter(t => t.course_id === cId);
                filtered.forEach(t => {
                    topicSelect.innerHTML += `<option value="${t.id}">${t.name} (${t.question_count || 0} Qs)</option>`;
                });
            });
        }

        // Questions per round pills
        const qPills = document.querySelectorAll('.q-pill');
        const customQInput = document.getElementById('formCustomQs');
        qPills.forEach(p => {
            p.addEventListener('click', function () {
                qPills.forEach(x => x.className = 'q-pill py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-purple-500');
                this.className = 'q-pill py-2.5 px-3 rounded-xl border-2 border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-xs font-bold text-purple-700 dark:text-purple-300';
                const val = this.dataset.val;
                if (val === 'custom') {
                    customQInput.classList.remove('hidden');
                    selectedQPerRound = parseInt(customQInput.value, 10) || 4;
                } else {
                    customQInput.classList.add('hidden');
                    selectedQPerRound = parseInt(val, 10);
                }
            });
        });

        // Rounds pills
        const rPills = document.querySelectorAll('.r-pill');
        rPills.forEach(p => {
            p.addEventListener('click', function () {
                rPills.forEach(x => x.className = 'r-pill py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300');
                this.className = 'r-pill py-2.5 px-3 rounded-xl border-2 border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-xs font-bold text-purple-700 dark:text-purple-300';
                selectedRounds = parseInt(this.dataset.val, 10);
            });
        });

        // Form Submit -> Create Room
        const createForm = document.getElementById('createRoomForm');
        if (createForm) {
            createForm.addEventListener('submit', function (e) {
                e.preventDefault();
                const roomName = document.getElementById('formRoomName').value;
                const courseId = document.getElementById('formCourseId').value;
                const topicId = document.getElementById('formTopicId').value;

                const cOpt = courseSelect.options[courseSelect.selectedIndex];
                const tOpt = topicSelect.options[topicSelect.selectedIndex];

                socket.emit('createRoom', {
                    userId: STUDENT_ID,
                    studentName: STUDENT_NAME,
                    matricNo: MATRIC_NO,
                    roomName,
                    courseId,
                    topicId,
                    courseCode: cOpt ? cOpt.dataset.code : 'COURSE',
                    topicName: tOpt ? tOpt.text : 'Topic',
                    mode: selectedModeVal,
                    questionsPerRound: selectedQPerRound,
                    totalRounds: selectedRounds
                });
            });
        }
    }

    function selectMode(m) {
        selectedModeVal = m;
        const c1 = document.getElementById('modeCard1v1');
        const c2 = document.getElementById('modeCard2v1');
        if (m === '1v1') {
            c1.className = 'mode-card p-4 rounded-2xl border-2 border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 cursor-pointer hover:shadow-md transition-all relative';
            c2.className = 'mode-card p-4 rounded-2xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-md transition-all relative';
        } else {
            c2.className = 'mode-card p-4 rounded-2xl border-2 border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 cursor-pointer hover:shadow-md transition-all relative';
            c1.className = 'mode-card p-4 rounded-2xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-md transition-all relative';
        }
    }

    // Join Room Live PREMED- Code Validation
    function setupJoinCodeValidation() {
        const input = document.getElementById('joinCodeInput');
        const box = document.getElementById('validationBox');
        const preview = document.getElementById('roomPreviewCard');
        const joinBtn = document.getElementById('joinBattleBtn');
        const checkbox = document.getElementById('agreeRulesCheckbox');

        if (!input) return;

        input.addEventListener('input', async function () {
            let val = this.value.trim().toUpperCase();
            if (!val.startsWith('PREMED-') && val.length > 0) {
                if (/^\d+$/.test(val)) {
                    val = 'PREMED-' + val;
                }
            }
            this.value = val;

            if (val.length >= 12) {
                box.classList.remove('hidden');
                box.className = 'p-4 rounded-2xl text-xs font-bold transition-all bg-amber-50 text-amber-800 border border-amber-200';
                box.innerHTML = 'Checking PREMED- code on server...';

                try {
                    const res = await fetch(SOCKET_URL + '/api/combat/validate-code', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code: val })
                    });
                    const data = await res.json();

                    if (data.valid) {
                        box.className = 'p-4 rounded-2xl text-xs font-bold transition-all bg-emerald-50 text-emerald-800 border border-emerald-200';
                        box.innerHTML = `✅ Valid Room Found! Room: <strong>${data.roomName}</strong> - Mode: ${data.mode}`;

                        preview.classList.remove('hidden');
                        document.getElementById('prevRoomName').textContent = data.roomName;
                        document.getElementById('prevHostName').textContent = data.hostName || 'Host';
                        document.getElementById('prevCourseCode').textContent = data.courseCode || 'Course';
                        document.getElementById('prevTopicName').textContent = data.topicName || 'Topic';
                        document.getElementById('prevModeBadge').textContent = data.mode;

                        updateJoinBtnState();
                    } else {
                        box.className = 'p-4 rounded-2xl text-xs font-bold transition-all bg-rose-50 text-rose-800 border border-rose-200';
                        box.innerHTML = `❌ ${data.message}`;
                        preview.classList.add('hidden');
                        joinBtn.disabled = true;
                    }
                } catch (e) {
                    console.error('Validation error:', e);
                }
            } else {
                box.classList.add('hidden');
                preview.classList.add('hidden');
                joinBtn.disabled = true;
            }
        });

        if (checkbox) {
            checkbox.addEventListener('change', updateJoinBtnState);
        }

        function updateJoinBtnState() {
            joinBtn.disabled = !checkbox.checked;
        }

        joinBtn.addEventListener('click', function () {
            const code = input.value.trim().toUpperCase();
            socket.emit('joinRoom', {
                roomCode: code,
                userId: STUDENT_ID,
                studentName: STUDENT_NAME,
                matricNo: MATRIC_NO
            });
        });
    }

    // SOCKET LISTENERS & GAME UI UPDATES
    function setupSocketListeners() {
        if (!socket) return;

        socket.on('roomCreated', (data) => {
            currentRoom = data.room;
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            renderWaitingRoom(data.roomCode, data.room);
        });

        socket.on('playerJoined', (data) => {
            currentRoom = data.room;
            renderWaitingRoom(data.room.roomCode, data.room);
        });

        socket.on('gameStarted', (data) => {
            currentRoom = data.room;
            document.getElementById('waitingForOpponentScreen').classList.add('hidden');
            document.getElementById('combatArenaScreen').classList.remove('hidden');
        });

        socket.on('nextQuestion', (data) => {
            renderQuestion(data);
        });

        socket.on('timerUpdate', (data) => {
            const text = document.getElementById('arenaTimerText');
            const progress = document.getElementById('timerCircleProgress');
            if (text) text.textContent = data.timeRemaining;

            if (progress) {
                const pct = (data.timeRemaining / 30) * 100;
                progress.setAttribute('stroke-dasharray', `${pct}, 100`);
                if (data.timeRemaining <= 5) {
                    progress.setAttribute('class', 'text-rose-500 transition-all duration-1000');
                } else if (data.timeRemaining <= 12) {
                    progress.setAttribute('class', 'text-amber-500 transition-all duration-1000');
                } else {
                    progress.setAttribute('class', 'text-emerald-500 transition-all duration-1000');
                }
            }
        });

        socket.on('mainAnswerResult', (data) => {
            showAnswerResult(data);
        });

        socket.on('triggerBonusTurn', (data) => {
            const turnsBadge = document.getElementById('questionTurnBadge');
            const spectatorBar = document.getElementById('spectatorStatusBar');
            const spectatorText = document.getElementById('spectatorStatusText');

            if (data.bonusUserId === STUDENT_ID) {
                turnsBadge.textContent = '⚡ BONUS TURN (+1 Pt) ⚡';
                turnsBadge.className = 'text-xs font-black uppercase tracking-wider text-amber-500 animate-pulse';
                spectatorBar.classList.add('hidden');
                enableOptionsForBonus();
            } else {
                turnsBadge.textContent = 'Spectating Bonus Turn';
                spectatorBar.classList.remove('hidden');
                spectatorText.textContent = 'Opponent is on Bonus Turn...';
                disableOptions();
            }
        });

        socket.on('roundFinished', (data) => {
            showRoundVictoryModal(data);
        });

        socket.on('rematchStarted', (data) => {
            document.getElementById('finalVictoryModal').classList.add('hidden');
            alert('Rematch started with fresh questions!');
        });

        socket.on('teamADisagreed', (data) => {
            alert(data.message || 'Team members disagree! Rethink and agree on one option!');
            enableOptionsForMain();
        });

        socket.on('gameFinished', (data) => {
            showFinalVictoryModal(data);
        });
    }

    // Render Waiting Lobby Screen
    function renderWaitingRoom(code, room) {
        document.getElementById('mainCombatContainer').innerHTML = document.getElementById('arenaLiveContainer').innerHTML;
        document.getElementById('lobbyScreen').classList.add('hidden');
        document.getElementById('waitingForOpponentScreen').classList.remove('hidden');

        document.getElementById('activeRoomCodeDisplay').textContent = code;

        const copyBtn = document.getElementById('copyCodeBtn');
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(code);
            alert('Code ' + code + ' copied to clipboard!');
        };

        const waBtn = document.getElementById('shareWhatsappBtn');
        waBtn.href = `https://api.whatsapp.com/send?text=${encodeURIComponent('Join my Study Combat duel on Premed Portal! Code: ' + code)}`;

        const list = document.getElementById('joinedPlayersList');
        list.innerHTML = room.players.map(p => `
            <div class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">${p.name[0]}</div>
                    <div>
                        <div class="text-xs font-bold">${p.name} ${p.isHost ? '<span class="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">HOST</span>' : ''}</div>
                        <div class="text-[10px] text-slate-400 font-mono">${p.matricNo}</div>
                    </div>
                </div>
                <span class="text-[10px] font-bold text-emerald-600">Joined</span>
            </div>
        `).join('');

        const startBtn = document.getElementById('startBattleBtn');
        if (room.createdBy === STUDENT_ID && room.players.length >= (room.mode === '2v1' ? 3 : 2)) {
            startBtn.classList.remove('hidden');
            startBtn.onclick = () => {
                socket.emit('startGame', { roomCode: code, userId: STUDENT_ID });
            };
        } else {
            startBtn.classList.add('hidden');
        }

        if (window.lucide) lucide.createIcons();
    }

    // Render Active Question
    function renderQuestion(data) {
        document.getElementById('arenaRoundIndicator').textContent = `Round ${data.roundNumber} / ${data.totalRounds}`;
        document.getElementById('arenaRoomCode').textContent = currentRoom ? currentRoom.roomCode : '';
        document.getElementById('questionNumberHeader').textContent = `Question ${data.questionNumber} of ${data.questionsPerRound}`;

        const isMyTurn = (data.turnUserId === STUDENT_ID);
        const turnBadge = document.getElementById('questionTurnBadge');
        const spectatorBar = document.getElementById('spectatorStatusBar');
        const spectatorText = document.getElementById('spectatorStatusText');

        if (isMyTurn) {
            turnBadge.textContent = 'YOUR TURN (+2 Pts)';
            turnBadge.className = 'text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400';
            spectatorBar.classList.add('hidden');
        } else {
            turnBadge.textContent = 'SPECTATING';
            turnBadge.className = 'text-xs font-black uppercase tracking-wider text-slate-400';
            spectatorBar.classList.remove('hidden');
            spectatorText.textContent = 'Opponent is thinking... You are spectating.';
        }

        // Render Options Grid
        const grid = document.getElementById('arenaOptionsGrid');
        const q = data.question;
        document.getElementById('arenaQuestionText').innerHTML = q.text;

        grid.innerHTML = q.options.map(o => `
            <button type="button" onclick="submitMainAnswer('${o.key}')" ${!isMyTurn ? 'disabled' : ''} class="opt-btn p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 hover:border-purple-600 disabled:opacity-60 disabled:cursor-not-allowed text-left font-semibold text-xs transition-all flex items-center gap-3">
                <span class="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-xs flex items-center justify-center shrink-0">${o.key}</span>
                <span class="flex-1">${o.text}</span>
            </button>
        `).join('');

        // Render Live Scores Header
        const scoresDiv = document.getElementById('arenaLiveScores');
        scoresDiv.innerHTML = Object.entries(data.scores).map(([uid, pts]) => {
            const p = currentRoom.players.find(x => x.userId === uid);
            return `<div>${p ? p.name : 'Player'}: <strong class="text-amber-400 font-mono">${pts} pts</strong></div>`;
        }).join('<span class="text-slate-600">vs</span>');

        if (window.renderMathInElement) {
            renderMathInElement(document.getElementById('arenaQuestionText'));
        }
    }

    function submitMainAnswer(opt) {
        socket.emit('mainAnswerSubmitted', {
            roomCode: currentRoom.roomCode,
            userId: STUDENT_ID,
            selectedOption: opt
        });
        disableOptions();
    }

    function enableOptionsForBonus() {
        const btns = document.querySelectorAll('.opt-btn');
        btns.forEach(b => {
            b.disabled = false;
            b.onclick = function() {
                const optKey = this.querySelector('span').textContent;
                socket.emit('bonusAnswerSubmitted', {
                    roomCode: currentRoom.roomCode,
                    userId: STUDENT_ID,
                    selectedOption: optKey
                });
                disableOptions();
            };
        });
    }

    function enableOptionsForMain() {
        const btns = document.querySelectorAll('.opt-btn');
        btns.forEach(b => {
            b.disabled = false;
        });
    }

    function disableOptions() {
        const btns = document.querySelectorAll('.opt-btn');
        btns.forEach(b => b.disabled = true);
    }

    function showRoundVictoryModal(data) {
        const modal = document.getElementById('roundVictoryModal');
        if (!modal) return;
        document.getElementById('roundVictoryTitle').textContent = `Round ${data.roundNumber} Finished!`;
        document.getElementById('roundWinnerBanner').textContent = `${data.winnerName} Won This Round!`;

        const container = document.getElementById('roundStatsTableContainer');
        container.innerHTML = `
            <table class="w-full text-left text-xs font-bold">
                <thead>
                    <tr class="border-b border-slate-200 dark:border-slate-700 text-slate-400">
                        <th class="py-2">Player</th>
                        <th class="py-2 text-center">Round Pts</th>
                        <th class="py-2 text-right">Total Pts</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                    ${data.statsTable.map(s => `
                        <tr>
                            <td class="py-2 text-slate-800 dark:text-slate-200">${s.name}</td>
                            <td class="py-2 text-center text-purple-600 font-mono">+${s.pointsThisRound}</td>
                            <td class="py-2 text-right text-amber-500 font-mono">${s.totalPoints} pts</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    function closeRoundVictoryModal() {
        const modal = document.getElementById('roundVictoryModal');
        if (modal) modal.classList.add('hidden');
    }

    function showAnswerResult(data) {
        const explBox = document.getElementById('explanationBox');
        const explText = document.getElementById('explanationText');

        if (data.isCorrect) {
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        }

        if (data.explanation) {
            explBox.classList.remove('hidden');
            explText.textContent = data.explanation;
        }
    }

    function showFinalVictoryModal(data) {
        const modal = document.getElementById('finalVictoryModal');
        modal.classList.remove('hidden');

        document.getElementById('victorySubtitle').textContent = `Winner: ${data.winnerName}`;

        const table = document.getElementById('finalScoresTable');
        table.innerHTML = Object.entries(data.finalScores).map(([uid, pts]) => {
            const p = currentRoom.players.find(x => x.userId === uid);
            const coins = data.coinsAwarded[uid] || 0;
            return `
                <div class="flex items-center justify-between text-xs font-bold py-2 border-b border-slate-200 dark:border-slate-700">
                    <span>${p ? p.name : 'Player'}</span>
                    <div class="flex items-center gap-3">
                        <span class="text-amber-500 font-mono">${pts} pts</span>
                        <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px]">+${coins} Coins</span>
                    </div>
                </div>
            `;
        }).join('');

        if (data.winnerUserId === STUDENT_ID) {
            confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
        }

        document.getElementById('rematchBtn').onclick = () => {
            socket.emit('rematchRequest', { roomCode: currentRoom.roomCode, userId: STUDENT_ID });
            alert('Rematch request sent! Waiting for opponent...');
        };

        if (window.lucide) lucide.createIcons();
    }
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
