<?php
/**
 * STUDY COMBAT - Real-time Player-vs-Player Academic Battle Arena
 * Premed Test Portal
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/config/db.php';

$pdo = DB::connect();

$student = $_SESSION['student'] ?? null;
$admin = $_SESSION['admin'] ?? null;

if (!$student && !$admin) {
    header('Location: login.php');
    exit;
}

$studentId = $_SESSION['student_id'] ?? ($student['id'] ?? ($admin['id'] ?? 'usr_' . bin2hex(random_bytes(4))));
$studentName = $_SESSION['student_name'] ?? ($student['name'] ?? ($admin['name'] ?? 'Warrior'));
$matricNo = $_SESSION['student_matric'] ?? ($student['matric_no'] ?? ($admin['matric_no'] ?? 'STU' . rand(1000, 9999)));

$pageTitle = "Study Combat Arena ⚔️";
require_once __DIR__ . '/includes/header.php';

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

<style>
    /* High-Contrast & Text Visibility Guarantee for Study Combat Arena */
    #combatArenaScreen {
        color: #0f172a;
    }
    .dark #combatArenaScreen {
        color: #f8fafc;
    }
    #arenaQuestionText {
        color: #0f172a !important;
    }
    .dark #arenaQuestionText {
        color: #f8fafc !important;
    }
    #arenaQuestionText *, #arenaQuestionText p, #arenaQuestionText span, #arenaQuestionText div, #arenaQuestionText strong, #arenaQuestionText em {
        color: inherit !important;
    }
    .opt-btn {
        color: #0f172a !important;
    }
    .dark .opt-btn {
        color: #f8fafc !important;
    }
    .opt-btn span:not(.opt-key-badge) {
        color: inherit !important;
    }
    .opt-btn.border-purple-600 {
        color: #581c87 !important;
    }
    .dark .opt-btn.border-purple-600 {
        color: #faf5ff !important;
    }
    .opt-btn.border-emerald-500 {
        color: #064e3b !important;
    }
    .dark .opt-btn.border-emerald-500 {
        color: #ecfdf5 !important;
    }
    .opt-btn.border-rose-500 {
        color: #881337 !important;
    }
    .dark .opt-btn.border-rose-500 {
        color: #fff1f2 !important;
    }
    .opt-key-badge {
        color: #1e293b !important;
    }
    .dark .opt-key-badge {
        color: #e2e8f0 !important;
    }
    .opt-btn.border-purple-600 .opt-key-badge,
    .opt-btn.border-emerald-500 .opt-key-badge,
    .opt-btn.border-rose-500 .opt-key-badge {
        color: #ffffff !important;
    }
    .katex, .katex * {
        color: inherit !important;
    }
    #questionNumberHeader {
        color: #0f172a !important;
    }
    .dark #questionNumberHeader {
        color: #ffffff !important;
    }
    #arenaLiveScores {
        color: #f8fafc !important;
    }
</style>

<div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">

    <!-- TOP ARENA HEADER / NAVIGATION TABS -->
    <div id="topCombatHeader" class="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden border border-purple-800/40">
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
        <div id="createRoomCard" class="max-w-3xl mx-auto space-y-6">
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
                            <span>How many questions per round?</span>
                        </label>
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2" id="qPerRoundPills">
                            <button type="button" data-val="3" class="q-pill py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-purple-500">3 Questions</button>
                            <button type="button" data-val="4" class="q-pill py-2.5 px-3 rounded-xl border-2 border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-xs font-bold text-purple-700 dark:text-purple-300">4 Questions</button>
                            <button type="button" data-val="5" class="q-pill py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-purple-500">5 Questions</button>
                            <button type="button" data-val="custom" class="q-pill py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-purple-500">Custom</button>
                        </div>
                        <input type="number" id="formCustomQs" min="1" max="10" placeholder="Type custom number (1-10)" class="hidden w-full mt-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                        <p class="text-[11px] text-slate-400 mt-1">If you choose 4 questions per round and 4 rounds, total duel equals 16 questions (4 questions in each round).</p>
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

                    <!-- Field 7: Bonus Opportunities / Steal Window Toggle -->
                    <div>
                        <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:border-purple-300 dark:hover:border-purple-800 transition-all">
                            <div class="flex items-center justify-between gap-4">
                                <div class="space-y-1">
                                    <label for="formAllowBonus" class="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer">
                                        <i data-lucide="zap" class="w-4 h-4 text-amber-500"></i>
                                        <span>Bonus Attempt / Steal Window</span>
                                    </label>
                                    <p class="text-[11px] text-slate-500 dark:text-slate-400">
                                        When <strong class="text-purple-600 dark:text-purple-400">ON</strong>: If a player fails their turn, opponent gets a 15s bonus chance (+1 or -1 pt). Answer remains strictly hidden until both miss or someone scores.<br>
                                        When <strong class="text-slate-600 dark:text-slate-400">OFF</strong>: Turn advances immediately without bonus attempts.
                                    </p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer shrink-0">
                                    <input type="checkbox" id="formAllowBonus" name="allow_bonus" value="1" checked class="sr-only peer">
                                    <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-purple-600"></div>
                                </label>
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
        <div id="joinRoomCard" class="max-w-xl mx-auto space-y-6">
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
                            <div class="flex items-center gap-1.5">
                                <span id="prevModeBadge" class="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[10px] font-black">1v1</span>
                                <span id="prevBonusBadge" class="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-[10px] font-black">Bonus: ON</span>
                            </div>
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
                            <div>• 30s per main turn | +2 pts correct answer (fair turn alternation)</div>
                            <div id="prevBonusRuleText">• 15s bonus turn on opponent fail | +1 pt correct | -1 pt fail</div>
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
        <div id="profileCard" class="space-y-6">
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
                <div id="matchHistoryContainer" class="space-y-3">
                    <?php $count = 0; foreach ($matchHistory as $mh): $count++; ?>
                    <?php
                        $topicSnap = !empty($mh['topic_name_snapshot']) ? $mh['topic_name_snapshot'] : 'Topic Duel';
                        $isWin = ($mh['winner_user_id'] === $studentId);
                        $isDraw = !empty($mh['is_draw']);
                    ?>
                    <div class="history-item <?= $count > 5 ? 'hidden' : '' ?> p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div>
                            <div class="text-xs font-mono font-bold text-purple-600"><?= htmlspecialchars($mh['room_code']) ?> <span class="text-slate-400 font-sans font-normal ml-2">(<?= htmlspecialchars($topicSnap) ?>)</span></div>
                            <div class="text-[11px] text-slate-400 mt-0.5"><?= htmlspecialchars($mh['created_at']) ?></div>
                        </div>
                        <div class="text-right">
                            <span class="text-xs font-bold px-2.5 py-1 rounded-lg <?= $isWin ? 'bg-emerald-100 text-emerald-700' : ($isDraw ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700') ?>">
                                <?= $isWin ? 'WIN (+50 Coins)' : ($isDraw ? 'DRAW (+25 Coins)' : 'LOSS (0 Coins)') ?>
                            </span>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>

                <?php if (count($matchHistory) > 5): ?>
                <button type="button" onclick="loadMoreHistory()" id="loadMoreHistoryBtn" class="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors">
                    Load More Matches ▾
                </button>
                <?php endif; ?>
                <?php endif; ?>
            </div>
        </div>

        <?php elseif ($tab === 'leaderboard'): ?>
        <!-- ================= PART 8 & 10: LEADERBOARD PAGE ================= -->
        <div id="leaderboardCard" class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 dark:border-slate-800 space-y-6">
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
                <div class="max-w-xl mx-auto space-y-4">
                    <div class="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 flex items-center justify-center mx-auto shadow-inner">
                        <i data-lucide="swords" class="w-8 h-8 text-purple-600"></i>
                    </div>
                    <h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">STUDY COMBAT DUEL LOBBY</h2>
                    <p class="text-xs text-slate-500 dark:text-slate-400">Challenge classmates in real-time academic duels. 30 seconds per turn, with bonus opportunities on wrong answers.</p>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                        <a href="combat.php?action=create" class="p-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2">
                            <i data-lucide="plus-circle" class="w-4 h-4"></i>
                            <span>Create Battle Room</span>
                        </a>

                        <a href="combat.php?action=join" class="p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs uppercase tracking-wider border border-slate-700 transition-all flex items-center justify-center gap-2">
                            <i data-lucide="key-round" class="w-4 h-4 text-amber-400"></i>
                            <span>Enter Room Code</span>
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

                <div class="flex items-center justify-center flex-wrap gap-3">
                    <button type="button" id="copyCodeBtn" class="px-4 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-black hover:bg-purple-100 flex items-center gap-1.5">
                        <i data-lucide="copy" class="w-4 h-4"></i> Copy Code
                    </button>
                    <a id="shareWhatsappBtn" target="_blank" href="#" class="px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-black hover:bg-emerald-600 flex items-center gap-1.5 shadow-md">
                        <i data-lucide="share-2" class="w-4 h-4"></i> Share on WhatsApp
                    </a>
                    <button type="button" onclick="leaveActiveRoom()" class="px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 text-xs font-black hover:bg-rose-100 flex items-center gap-1.5">
                        <i data-lucide="log-out" class="w-4 h-4"></i> Leave Room
                    </button>
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
            <!-- FOCUSED ARENA WINDOW (TEST INTERFACE STYLE) -->
            <div id="combatArenaScreen" class="hidden max-w-4xl mx-auto w-full space-y-4 py-2 sm:py-4">

                <!-- TOP FOCUSED COMMAND BAR (EXACT PROMETRIC TEST INTERFACE STYLE) -->
                <div class="bg-slate-900/98 backdrop-blur-md rounded-2xl p-3 sm:p-4 shadow-xl border border-purple-800/60 flex items-center justify-between gap-3 text-white">
                    <!-- Left: Duel Info -->
                    <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-600 text-white text-xs font-black uppercase tracking-wider shadow-sm">
                            <i data-lucide="swords" class="w-3.5 h-3.5"></i>
                            <span id="arenaRoundIndicator">Round 1 / 4</span>
                        </span>
                        <span id="arenaRoomCode" class="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-purple-950/70 border border-purple-800/80 text-purple-300">PREMED-XXXXX</span>
                    </div>

                    <!-- Center: Large Unmistakable Turn Status & Countdown Timer -->
                    <div class="flex items-center gap-2.5">
                        <div class="relative w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center shrink-0">
                            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <path class="text-slate-800" stroke-width="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path id="timerCircleProgress" class="text-emerald-400 transition-all duration-1000" stroke-dasharray="100, 100" stroke-width="3" stroke-linecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            </svg>
                            <span id="arenaTimerText" class="absolute font-black font-mono text-sm sm:text-base text-white">30</span>
                        </div>
                    </div>

                    <!-- Right: Live Scoreboard HUD & Surrender Button -->
                    <div class="flex items-center gap-3">
                        <div id="arenaLiveScores" class="flex items-center gap-2 text-xs font-black"></div>
                        <button type="button" onclick="confirmLeaveCombat()" class="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition-all flex items-center gap-1" title="Surrender / Leave Duel">
                            <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
                            <span class="hidden sm:inline">Leave</span>
                        </button>
                    </div>
                </div>

                <!-- QUESTION CARD (CLEAN, FOCUSED, KA-TEX EQUIPPED) -->
                <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-200 dark:border-slate-800 space-y-5">

                    <!-- Header with Turn Badge -->
                    <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div>
                            <span id="questionTurnBadge" class="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">Your Turn (+2 Pts)</span>
                            <div id="questionNumberHeader" class="text-xs sm:text-sm font-black text-slate-900 dark:text-white">Question 1 of 4</div>
                        </div>

                        <div class="text-[11px] font-bold text-slate-400 font-mono">
                            ⚡ PreMed Match Engine
                        </div>
                    </div>

                    <!-- Spectator Status Bar -->
                    <div id="spectatorStatusBar" class="hidden p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
                        <i data-lucide="eye" class="w-4 h-4 text-amber-500 animate-pulse"></i>
                        <span id="spectatorStatusText">Opponent is thinking... You are spectating.</span>
                    </div>

                    <!-- Question Text -->
                    <div id="arenaQuestionText" class="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed min-h-[50px]">
                        Loading question...
                    </div>

                    <!-- Options 2x2 Grid -->
                    <div id="arenaOptionsGrid" class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1"></div>

                    <!-- Checking Answer Loading Banner -->
                    <div id="checkingAnswerBanner" class="hidden my-2 p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200 text-xs font-black flex items-center justify-center gap-2 animate-pulse">
                        <i data-lucide="loader-2" class="w-4 h-4 animate-spin text-purple-600"></i>
                        <span>Evaluating submission... ⏳</span>
                    </div>

                    <!-- High-Impact Game Result Feedback Overlay (Centered) -->
                    <div id="battleResultOverlay" class="hidden my-3 p-5 rounded-3xl text-center space-y-2 transition-all animate-in zoom-in-90 pointer-events-none mx-auto max-w-sm">
                        <div id="resultOverlayIcon" class="text-5xl sm:text-6xl font-black animate-bounce"></div>
                        <div id="resultOverlayText" class="text-lg sm:text-xl font-black uppercase tracking-wider"></div>
                        <div id="resultOverlayPoints" class="inline-block px-4 py-1 rounded-full text-xs font-black shadow-lg"></div>
                    </div>
                </div>
            </div>

            <!-- ROUND VICTORY MODAL SCREEN -->
            <div id="roundVictoryModal" class="hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                <div class="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-purple-500/30 text-center space-y-6 animate-in zoom-in-95">
                    <div class="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 flex items-center justify-center mx-auto shadow-inner ring-4 ring-amber-400/30">
                        <i data-lucide="crown" class="w-10 h-10 text-amber-500 animate-bounce"></i>
                    </div>

                    <div class="space-y-1">
                        <h3 id="roundVictoryTitle" class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Round 1 Finished!</h3>
                        <p id="roundWinnerBanner" class="text-sm font-black text-amber-500 uppercase tracking-wider">John Won This Round! 👑</p>
                    </div>

                    <div id="roundStatsTableContainer" class="overflow-x-auto bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700"></div>

                    <div id="roundBreakActionBar" class="space-y-2">
                        <button type="button" id="hostNextRoundBtn" onclick="requestNextRound()" class="hidden w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2">
                            <span>START NEXT ROUND NOW ➔</span>
                            <span id="nextRoundCountdownBadge" class="px-2 py-0.5 rounded bg-white/20 text-white text-[10px]">(10s)</span>
                        </button>
                        <p id="spectatorNextRoundText" class="text-xs text-slate-400 font-bold">Waiting for host / Auto starting next round in <span id="spectatorRoundCountdownText" class="text-amber-500 font-mono font-black">10</span>s...</p>
                    </div>
                </div>
            </div>

            <!-- LEVEL UP / RANK UP CELEBRATION MODAL -->
            <div id="rankUpModal" class="hidden fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
                <div class="bg-gradient-to-b from-slate-900 via-purple-950 to-slate-900 rounded-3xl max-w-md w-full p-8 shadow-2xl border-2 border-amber-400/60 text-center space-y-6 animate-in zoom-in-95 text-white">
                    <div class="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 to-yellow-600 text-white flex items-center justify-center mx-auto shadow-2xl ring-8 ring-amber-400/30 animate-bounce">
                        <i data-lucide="shield-alert" class="w-14 h-14"></i>
                    </div>

                    <div class="space-y-2">
                        <span class="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-extrabold uppercase tracking-widest">LEVEL UP!</span>
                        <h2 class="text-3xl font-black text-white tracking-tight">NEW RANK ACHIEVED!</h2>
                        <div id="newRankBadgeTitle" class="text-2xl font-black text-amber-400">STRIKER ⚡</div>
                    </div>

                    <p class="text-xs text-slate-300">Congratulations Warrior! Your victories have earned you global prestige on the Study Combat Leaderboard.</p>

                    <button type="button" onclick="closeRankUpModal()" class="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/30">
                        CLAIM RANK & CONTINUE
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
                        <a href="combat.php?action=lobby" class="block w-full py-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-black uppercase transition-all">
                            Return to Arena Lobby
                        </a>
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

    // Active Question & Selection State
    let currentSelectedOptionKey = null;
    let currentTurnIsBonus = false;
    let activeTimerMaxDuration = 30;
    let isSubmittingAnswer = false;

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
                checkAndRestoreActiveRoom();
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

    async function checkAndRestoreActiveRoom() {
        const savedCode = localStorage.getItem('activeCombatRoomCode');
        if (!savedCode) return;

        try {
            const res = await fetch('api/combat_handler.php?action=get_room_status&roomCode=' + encodeURIComponent(savedCode));
            const data = await res.json();

            if (data.success && data.room) {
                currentRoom = data.room;
                if (data.room.status === 'waiting') {
                    renderWaitingRoom(savedCode, data.room);
                    if (socket) {
                        socket.emit('joinRoom', {
                            roomCode: savedCode,
                            userId: STUDENT_ID,
                            studentName: STUDENT_NAME,
                            matricNo: MATRIC_NO
                        });
                    }
                } else if (data.room.status === 'playing') {
                    renderWaitingRoom(savedCode, data.room);
                    if (socket) {
                        socket.emit('joinRoom', {
                            roomCode: savedCode,
                            userId: STUDENT_ID,
                            studentName: STUDENT_NAME,
                            matricNo: MATRIC_NO
                        });
                    }
                    launchBattleArena(data.room);
                } else {
                    localStorage.removeItem('activeCombatRoomCode');
                }
            } else {
                localStorage.removeItem('activeCombatRoomCode');
            }
        } catch (e) {
            console.warn('Error restoring room on refresh:', e);
        }
    }

    function leaveActiveRoom() {
        if (confirm('Are you sure you want to leave this battle room?')) {
            localStorage.removeItem('activeCombatRoomCode');
            window.location.href = 'combat.php?action=lobby';
        }
    }

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
            createForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                const submitBtn = createForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Generating PREMED- code...';
                }

                const roomName = document.getElementById('formRoomName').value;
                const courseId = document.getElementById('formCourseId').value;
                const topicId = document.getElementById('formTopicId').value;

                const cOpt = courseSelect ? courseSelect.options[courseSelect.selectedIndex] : null;
                const tOpt = topicSelect ? topicSelect.options[topicSelect.selectedIndex] : null;

                const payload = {
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
                    totalRounds: selectedRounds,
                    allowBonus: document.getElementById('formAllowBonus') ? document.getElementById('formAllowBonus').checked : true
                };

                async function handleRoomCreatedData(data) {
                    if (data.success) {
                        currentRoom = data.room;
                        localStorage.setItem('activeCombatRoomCode', data.roomCode);
                        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
                        renderWaitingRoom(data.roomCode, data.room);
                        if (socket) {
                            socket.emit('joinRoom', {
                                roomCode: data.roomCode,
                                userId: STUDENT_ID,
                                studentName: STUDENT_NAME,
                                matricNo: MATRIC_NO
                            });
                        }
                    } else {
                        alert('Error creating room: ' + (data.message || 'Unknown error'));
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.innerHTML = '<i data-lucide="sparkles" class="w-5 h-5"></i><span>GENERATE PREMED- CODE & CREATE ROOM</span>';
                            if (window.lucide) lucide.createIcons();
                        }
                    }
                }

                try {
                    // Fast direct call to native handler
                    const resPhp = await fetch('api/combat_handler.php?action=create_room', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const rawText = await resPhp.text();
                    let dataPhp;
                    try {
                        dataPhp = JSON.parse(rawText);
                    } catch (parseErr) {
                        console.error('Non-JSON server response:', rawText);
                        alert('Server error creating room: ' + (rawText.replace(/<[^>]+>/g, ' ').substring(0, 160) || 'Invalid server response.'));
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.innerHTML = '<i data-lucide="sparkles" class="w-5 h-5"></i><span>GENERATE PREMED- CODE & CREATE ROOM</span>';
                            if (window.lucide) lucide.createIcons();
                        }
                        return;
                    }
                    handleRoomCreatedData(dataPhp);
                } catch (err) {
                    console.error('Create room error:', err);
                    alert('Network error connecting to room server. Please check network connection.');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i data-lucide="sparkles" class="w-5 h-5"></i><span>GENERATE PREMED- CODE & CREATE ROOM</span>';
                        if (window.lucide) lucide.createIcons();
                    }
                }
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

                function applyValidationResult(data) {
                    if (data.valid) {
                        box.className = 'p-4 rounded-2xl text-xs font-bold transition-all bg-emerald-50 text-emerald-800 border border-emerald-200';
                        box.innerHTML = `✅ Valid Room Found! Room: <strong>${data.roomName}</strong> - Mode: ${data.mode}`;

                        preview.classList.remove('hidden');
                        document.getElementById('prevRoomName').textContent = data.roomName;
                        document.getElementById('prevHostName').textContent = data.hostName || 'Host';
                        document.getElementById('prevCourseCode').textContent = data.courseCode || 'Course';
                        document.getElementById('prevTopicName').textContent = data.topicName || 'Topic';
                        document.getElementById('prevModeBadge').textContent = data.mode;

                        const bonusBadge = document.getElementById('prevBonusBadge');
                        const bonusRuleText = document.getElementById('prevBonusRuleText');
                        const isBonusOn = (data.allowBonus !== false);
                        if (bonusBadge) {
                            bonusBadge.textContent = isBonusOn ? 'Bonus: ON' : 'Bonus: OFF';
                            bonusBadge.className = isBonusOn 
                                ? 'px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-[10px] font-black'
                                : 'px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black';
                        }
                        if (bonusRuleText) {
                            bonusRuleText.textContent = isBonusOn 
                                ? '• 15s bonus turn on opponent fail | +1 pt correct | -1 pt fail'
                                : '• Bonus turn disabled: immediate advance on miss';
                        }

                        updateJoinBtnState();
                    } else {
                        box.className = 'p-4 rounded-2xl text-xs font-bold transition-all bg-rose-50 text-rose-800 border border-rose-200';
                        box.innerHTML = `❌ ${data.message}`;
                        preview.classList.add('hidden');
                        joinBtn.disabled = true;
                    }
                }

                try {
                    const resPhp = await fetch('api/combat_handler.php?action=validate_code', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code: val })
                    });
                    const dataPhp = await resPhp.json();
                    applyValidationResult(dataPhp);
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

        joinBtn.addEventListener('click', async function () {
            const code = input.value.trim().toUpperCase();
            joinBtn.disabled = true;
            joinBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Agreeing & Joining Battle...';

            const payload = {
                roomCode: code,
                userId: STUDENT_ID,
                studentName: STUDENT_NAME,
                matricNo: MATRIC_NO
            };

            async function handleJoinedRoomData(data) {
                if (data.success) {
                    currentRoom = data.room;
                    localStorage.setItem('activeCombatRoomCode', code);
                    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                    renderWaitingRoom(code, data.room);
                    if (socket) {
                        socket.emit('joinRoom', payload);
                    }
                } else {
                    alert('Error joining room: ' + (data.message || 'Unknown error'));
                    joinBtn.disabled = false;
                    joinBtn.textContent = 'Agree to Topic & Join Battle';
                }
            }

            try {
                const resPhp = await fetch('api/combat_handler.php?action=join_room', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const rawText = await resPhp.text();
                let dataPhp;
                try {
                    dataPhp = JSON.parse(rawText);
                } catch (parseErr) {
                    console.error('Non-JSON server response:', rawText);
                    alert('Server error joining room: ' + (rawText.replace(/<[^>]+>/g, ' ').substring(0, 160) || 'Invalid server response.'));
                    joinBtn.disabled = false;
                    joinBtn.textContent = 'Agree to Topic & Join Battle';
                    return;
                }
                handleJoinedRoomData(dataPhp);
            } catch (err) {
                console.error('Join room error:', err);
                alert('Could not join room. Please check your network connection.');
                joinBtn.disabled = false;
                joinBtn.textContent = 'Agree to Topic & Join Battle';
            }
        });
    }

    let lobbyPollingInterval = null;

    function launchBattleArena(room) {
        if (lobbyPollingInterval) {
            clearInterval(lobbyPollingInterval);
            lobbyPollingInterval = null;
        }

        currentRoom = room;

        // Activate distraction-free focused arena window (Test Interface style)
        document.body.classList.add('combat-active-focus');

        const topHeader = document.getElementById('topCombatHeader');
        if (topHeader) topHeader.classList.add('hidden');

        const lobby = document.getElementById('lobbyScreen');
        if (lobby) lobby.classList.add('hidden');

        const waitingScreen = document.getElementById('waitingForOpponentScreen');
        if (waitingScreen) waitingScreen.classList.add('hidden');

        const createCard = document.getElementById('createRoomCard');
        if (createCard) createCard.classList.add('hidden');

        const joinCard = document.getElementById('joinRoomCard');
        if (joinCard) joinCard.classList.add('hidden');

        const profileCard = document.getElementById('profileCard');
        if (profileCard) profileCard.classList.add('hidden');

        const leaderboardCard = document.getElementById('leaderboardCard');
        if (leaderboardCard) leaderboardCard.classList.add('hidden');

        const arenaScreen = document.getElementById('combatArenaScreen');
        if (arenaScreen) arenaScreen.classList.remove('hidden');

        if (room.serverTime) {
            updateServerTimeOffset(room.serverTime);
        }

        const qPerRound = room.questionsPerRound || 4;
        const totalR = room.totalRounds || 4;
        const totalQ = qPerRound * totalR;
        const qIndex = room.currentQuestionIndex || 0;

        if (qIndex >= totalQ || room.status === 'finished') {
            showFinalVictoryModal({ isDraw: false, winnerName: 'Battle Completed', finalScores: room.scores });
            return;
        }

        if (room.questionsPool && room.questionsPool.length > 0) {
            const currentQ = room.questionsPool[qIndex];
            if (currentQ) {
                const currentRoundNum = Math.min(totalR, Math.max(1, Math.floor(qIndex / qPerRound) + 1));
                renderQuestion({
                    question: prepareQuestionForClient(currentQ),
                    questionNumber: (qIndex % qPerRound) + 1,
                    roundNumber: currentRoundNum,
                    totalRounds: totalR,
                    questionsPerRound: qPerRound,
                    turnUserId: room.currentTurnUserId || (room.players[0] ? room.players[0].userId : STUDENT_ID),
                    scores: room.scores || {},
                    turnStartTimestamp: room.turnStartTimestamp,
                    timerDuration: room.turnDuration || 30
                });
            }
        }
        if (window.lucide) lucide.createIcons();

        // Start heartbeat in-game synchronization loop (runs on all clients)
        startArenaSyncLoop();
    }

    function prepareQuestionForClient(q) {
        if (!q) return { id: '', text: '', options: [] };
        if (Array.isArray(q.options) && q.options.length > 0) {
            return q;
        }
        const options = [
            { key: 'A', text: q.a || q.option_a || '' },
            { key: 'B', text: q.b || q.option_b || '' },
            { key: 'C', text: q.c || q.option_c || '' },
            { key: 'D', text: q.d || q.option_d || '' }
        ].filter(o => o.text && String(o.text).trim() !== '');

        return {
            id: q.id || '',
            text: q.text || q.question_text || '',
            options: options
        };
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
            launchBattleArena(data.room);
        });

        socket.on('nextQuestion', (data) => {
            renderQuestion(data);
        });

        socket.on('timerUpdate', (data) => {
            if (typeof data.timeRemaining === 'number') {
                const rem = Math.max(0, data.timeRemaining);
                if (Math.abs(rem - localTimeRemaining) > 1.5) {
                    activeTurnStartTs = getSyncedServerTimeSec() - (activeTimerMaxDuration - rem);
                }
                localTimeRemaining = rem;
                syncTimerDisplay(rem, activeTimerMaxDuration);
                if (rem <= 0) {
                    stopResilientCountdown();
                    handleLocalTimeout();
                }
            }
        });

        socket.on('mainAnswerResult', (data) => {
            showAnswerResult(data);
        });

        socket.on('bonusAnswerResult', (data) => {
            showAnswerResult(data);
        });

        socket.on('lastAnswerResult', (data) => {
            showAnswerResult(data);
        });

        socket.on('triggerBonusTurn', (data) => {
            const turnsBadge = document.getElementById('questionTurnBadge');
            const spectatorBar = document.getElementById('spectatorStatusBar');
            const spectatorText = document.getElementById('spectatorStatusText');

            currentTurnIsBonus = true;
            currentSelectedOptionKey = null;
            isSubmittingAnswer = false;
            activeTimerMaxDuration = data.timerDuration || 15;
            if (typeof data.turnStartTimestamp === 'number' && data.turnStartTimestamp > 0) {
            startResilientCountdown(data.turnStartTimestamp, activeTimerMaxDuration);
        } else {
            startResilientCountdown(getSyncedServerTimeSec(), activeTimerMaxDuration);
        }

            const checkingBanner = document.getElementById('checkingAnswerBanner');
            if (checkingBanner) checkingBanner.classList.add('hidden');
            const confirmBar = document.getElementById('confirmActionBar');
            if (confirmBar) confirmBar.classList.add('hidden');
            const overlay = document.getElementById('battleResultOverlay');
            if (overlay) overlay.classList.add('hidden');

            if (data.bonusUserId === STUDENT_ID) {
                turnsBadge.textContent = '⚡ BONUS CHANCE! +1 Point or -1 Point! ⚡';
                turnsBadge.className = 'text-xs sm:text-sm font-black uppercase tracking-wider text-amber-500 animate-pulse bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30';
                spectatorBar.classList.add('hidden');
                enableOptionsForBonus();
            } else {
                turnsBadge.textContent = 'SPECTATING BONUS TURN';
                turnsBadge.className = 'text-xs font-black uppercase tracking-wider text-slate-400';
                spectatorBar.classList.remove('hidden');
                spectatorText.textContent = 'Opponent is on Bonus Turn (+1 or -1)... You are spectating.';
                disableOptions();
            }
        });

        socket.on('roundFinished', (data) => {
            showRoundVictoryModal(data);
        });

        socket.on('nextRoundStarting', (data) => {
            const hostBtn = document.getElementById('hostNextRoundBtn');
            if (hostBtn) hostBtn.disabled = true;

            let c = data.countdownSec || 3;
            const specText = document.getElementById('spectatorNextRoundText');
            if (specText) {
                specText.innerHTML = `<span class="text-amber-400 font-black text-sm animate-pulse">⚡ Next round starting in ${c}... ⚡</span>`;
            }

            const cTimer = setInterval(() => {
                c--;
                if (c > 0 && specText) {
                    specText.innerHTML = `<span class="text-amber-400 font-black text-sm animate-pulse">⚡ Next round starting in ${c}... ⚡</span>`;
                } else {
                    clearInterval(cTimer);
                }
            }, 1000);
        });

        socket.on('nextRoundStarted', (data) => {
            closeRoundVictoryModal();
        });

        socket.on('rematchStarted', (data) => {
            const finalModal = document.getElementById('finalVictoryModal');
            if (finalModal) finalModal.classList.add('hidden');
            if (data && data.room) {
                currentRoom = data.room;
                launchBattleArena(data.room);
            }
        });

        socket.on('teamADisagreed', (data) => {
            alert(data.message || 'Team members disagree! Rethink and agree on one option!');
            enableOptionsForMain();
        });

        socket.on('gameFinished', (data) => {
            showFinalVictoryModal(data);
        });
    }

    // Render Waiting Lobby Screen & Poll Status
    function renderWaitingRoom(code, room) {
        if (lobbyPollingInterval) {
            clearInterval(lobbyPollingInterval);
            lobbyPollingInterval = null;
        }

        const createCard = document.getElementById('createRoomCard');
        if (createCard) createCard.classList.add('hidden');
        const joinCard = document.getElementById('joinRoomCard');
        if (joinCard) joinCard.classList.add('hidden');
        const profileCard = document.getElementById('profileCard');
        if (profileCard) profileCard.classList.add('hidden');
        const leaderboardCard = document.getElementById('leaderboardCard');
        if (leaderboardCard) leaderboardCard.classList.add('hidden');

        const liveContainer = document.getElementById('arenaLiveContainer');
        if (liveContainer) liveContainer.classList.remove('hidden');

        const lobby = document.getElementById('lobbyScreen');
        if (lobby) lobby.classList.add('hidden');

        const waiting = document.getElementById('waitingForOpponentScreen');
        if (waiting) waiting.classList.remove('hidden');

        document.getElementById('activeRoomCodeDisplay').textContent = code;

        const copyBtn = document.getElementById('copyCodeBtn');
        if (copyBtn) {
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(code);
                alert('Code ' + code + ' copied to clipboard!');
            };
        }

        const waBtn = document.getElementById('shareWhatsappBtn');
        if (waBtn) {
            waBtn.href = `https://api.whatsapp.com/send?text=${encodeURIComponent('Join my Study Combat duel on Premed Portal! Code: ' + code)}`;
        }

        function updatePlayersView(playersArr) {
            const list = document.getElementById('joinedPlayersList');
            if (list && playersArr) {
                list.innerHTML = playersArr.map(p => `
                    <div class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <div class="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">${(p.name || 'S')[0]}</div>
                            <div>
                                <div class="text-xs font-black text-slate-900 dark:text-white">${p.name} ${p.isHost ? '<span class="text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-black">HOST</span>' : ''}</div>
                                <div class="text-[10px] text-slate-500 dark:text-slate-400 font-mono">${p.matricNo}</div>
                            </div>
                        </div>
                        <span class="text-[10px] font-black text-emerald-600 dark:text-emerald-400">Joined</span>
                    </div>
                `).join('');
            }
        }

        updatePlayersView(room.players);

        const startBtn = document.getElementById('startBattleBtn');

        function checkStartBtnState(r) {
            if (r.createdBy === STUDENT_ID && r.players.length >= (r.mode === '2v1' ? 3 : 2)) {
                startBtn.classList.remove('hidden');
                startBtn.onclick = async () => {
                    startBtn.disabled = true;
                    startBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Launching Battle Arena...';

                    const payload = { roomCode: code, userId: STUDENT_ID };
                    if (socket) {
                        socket.emit('startGame', payload);
                    }

                    try {
                        const res = await fetch('api/combat_handler.php?action=start_game', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                        const data = await res.json();
                        if (data.success) {
                            launchBattleArena(data.room);
                        }
                    } catch (e) {
                        console.error('Start game error:', e);
                    }
                };
            } else {
                startBtn.classList.add('hidden');
            }
        }

        checkStartBtnState(room);

        // Ultra-fast 500ms polling timer for instant launch across both devices
        lobbyPollingInterval = setInterval(async () => {
            try {
                const res = await fetch('api/combat_handler.php?action=get_room_status&roomCode=' + encodeURIComponent(code));
                const data = await res.json();
                if (data.success && data.room) {
                    currentRoom = data.room;
                    updatePlayersView(data.room.players);
                    checkStartBtnState(data.room);

                    if (data.room.status === 'playing') {
                        launchBattleArena(data.room);
                    }
                }
            } catch (e) {
                console.warn('Lobby polling check error:', e);
            }
        }, 500);

        if (window.lucide) lucide.createIcons();
    }

    // Production-Grade Real-Time Arena Synchronizer & Dual-Sync Engine
    let serverTimeOffsetMs = 0;

    function updateServerTimeOffset(serverTimeSec) {
        if (typeof serverTimeSec === 'number' && serverTimeSec > 0) {
            serverTimeOffsetMs = (serverTimeSec * 1000) - Date.now();
        }
    }

    function getSyncedServerTimeSec() {
        return (Date.now() + serverTimeOffsetMs) / 1000;
    }

    let localCountdownInterval = null;
    let localTimeRemaining = 30;
    let activeTurnStartTs = 0;
    let activeTimerMaxDuration = 30;
    let arenaSyncInterval = null;
    let lastRenderedTurnKey = null;
    let lastDisplayedResultTs = null;
    let isSubmittingAnswer = false;

    function isMyTurn(userId) {
        return String(userId) === String(STUDENT_ID);
    }

    function calculateSyncedTimeRemaining(turnStartTs, maxDur) {
        if (!turnStartTs || turnStartTs <= 0) return maxDur;
        const nowSec = getSyncedServerTimeSec();
        if (nowSec < turnStartTs) {
            return maxDur; // Still in transition/review window
        }
        return Math.max(0, Math.ceil((turnStartTs + maxDur) - nowSec));
    }

    // Production In-Game Synchronization Heartbeat with 300ms high-frequency polling
    function startArenaSyncLoop() {
        if (arenaSyncInterval) clearInterval(arenaSyncInterval);

        arenaSyncInterval = setInterval(async () => {
            if (!currentRoom || !currentRoom.roomCode) return;

            try {
                const res = await fetch('api/combat_handler.php?action=get_room_status&roomCode=' + encodeURIComponent(currentRoom.roomCode));
                const data = await res.json();
                if (!data.success || !data.room) return;

                const r = data.room;
                currentRoom = r;

                if (r.serverTime) {
                    updateServerTimeOffset(r.serverTime);
                }

                const totalR = Math.max(1, r.totalRounds || 4);
                const qPerRound = Math.max(1, r.questionsPerRound || 4);
                const totalQ = Math.max(1, totalR * qPerRound);
                const isOver = (r.status === 'finished' || (r.currentQuestionIndex >= totalQ));

                // 1. If game ended
                if (isOver) {
                    stopResilientCountdown();
                    if (arenaSyncInterval) {
                        clearInterval(arenaSyncInterval);
                        arenaSyncInterval = null;
                    }
                    showFinalVictoryModal({
                        isDraw: false,
                        winnerName: 'Battle Completed',
                        finalScores: r.scores
                    });
                    return;
                }

                // 2. Sync scores across screens in real-time
                if (r.scores) {
                    updateLiveScoreboard(r.scores);
                }

                // 3. Handle 2-second Answer Review Overlay
                if (r.isReviewingAnswer && r.lastAnswerResult) {
                    showAnswerResult(r.lastAnswerResult);
                    stopResilientCountdown();
                    return; // Remain in review window until server transition time
                }

                // 4. Review is over: hide overlay
                const overlay = document.getElementById('battleResultOverlay');
                if (overlay && !overlay.classList.contains('hidden')) {
                    overlay.classList.add('hidden');
                }

                // 5. Sync question/turn progression across both players
                const turnKey = `${r.currentQuestionIndex}_${r.turnType || 'main'}_${r.currentTurnUserId}`;
                if (turnKey !== lastRenderedTurnKey) {
                    lastRenderedTurnKey = turnKey;
                    isSubmittingAnswer = false;

                    if (r.turnType === 'bonus') {
                        // Bonus Turn Setup
                        currentTurnIsBonus = true;
                        currentSelectedOptionKey = null;
                        activeTimerMaxDuration = 15;

                        const turnsBadge = document.getElementById('questionTurnBadge');
                        const spectatorBar = document.getElementById('spectatorStatusBar');
                        const spectatorText = document.getElementById('spectatorStatusText');

                        if (isMyTurn(r.currentTurnUserId)) {
                            turnsBadge.textContent = '⚡ BONUS CHANCE! +1 Point or -1 Point! ⚡';
                            turnsBadge.className = 'text-xs sm:text-sm font-black uppercase tracking-wider text-amber-500 animate-pulse bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30';
                            if (spectatorBar) spectatorBar.classList.add('hidden');
                            enableOptionsForBonus();
                        } else {
                            turnsBadge.textContent = 'SPECTATING BONUS TURN';
                            turnsBadge.className = 'text-xs font-black uppercase tracking-wider text-slate-400';
                            if (spectatorBar) spectatorBar.classList.remove('hidden');
                            if (spectatorText) spectatorText.textContent = 'Opponent is on Bonus Turn (+1 or -1)... You are spectating.';
                            disableOptions();
                        }
                        startResilientCountdown(r.turnStartTimestamp, 15);
                    } else {
                        // Main Turn Question Setup
                        currentTurnIsBonus = false;
                        if (r.questionsPool && r.questionsPool[r.currentQuestionIndex]) {
                            const q = r.questionsPool[r.currentQuestionIndex];
                            const curRound = Math.min(totalR, Math.max(1, Math.floor(r.currentQuestionIndex / qPerRound) + 1));
                            renderQuestion({
                                question: prepareQuestionForClient(q),
                                questionNumber: (r.currentQuestionIndex % qPerRound) + 1,
                                roundNumber: curRound,
                                totalRounds: totalR,
                                questionsPerRound: qPerRound,
                                turnUserId: r.currentTurnUserId,
                                scores: r.scores || {},
                                turnStartTimestamp: r.turnStartTimestamp,
                                timerDuration: 30
                            });
                        }
                    }
                }
            } catch (err) {
                console.warn('Sync loop heartbeat error:', err);
            }
        }, 300);
    }

    function startResilientCountdown(turnStartTs, durationSec) {
        stopResilientCountdown();
        activeTimerMaxDuration = durationSec || 30;
        activeTurnStartTs = (typeof turnStartTs === 'number' && turnStartTs > 0) ? turnStartTs : getSyncedServerTimeSec();

        function tick() {
            const rem = calculateSyncedTimeRemaining(activeTurnStartTs, activeTimerMaxDuration);
            localTimeRemaining = rem;
            syncTimerDisplay(rem, activeTimerMaxDuration);

            if (rem <= 0) {
                stopResilientCountdown();
                handleLocalTimeout();
            }
        }

        tick();
        localCountdownInterval = setInterval(tick, 150);
    }

    function stopResilientCountdown() {
        if (localCountdownInterval) {
            clearInterval(localCountdownInterval);
            localCountdownInterval = null;
        }
    }

    function handleLocalTimeout() {
        if (isSubmittingAnswer) return;
        stopResilientCountdown();

        const activeTurnUser = currentTurnIsBonus
            ? (currentRoom && (currentRoom.bonusUserId || currentRoom.currentTurnUserId))
            : (currentRoom && currentRoom.currentTurnUserId);

        const shouldSubmit = isMyTurn(activeTurnUser);

        if (shouldSubmit) {
            isSubmittingAnswer = true;
            disableOptions();

            const checkingBanner = document.getElementById('checkingAnswerBanner');
            if (checkingBanner) {
                checkingBanner.classList.remove('hidden');
                const txt = checkingBanner.querySelector('span');
                if (txt) txt.textContent = 'Time Expired! Evaluating... ⏳';
            }

            const payload = {
                roomCode: currentRoom ? currentRoom.roomCode : '',
                userId: STUDENT_ID,
                selectedOption: 'TIMEOUT',
                clientSubmitTimestamp: Date.now()
            };

            if (socket && socket.connected) {
                socket.emit(currentTurnIsBonus ? 'bonusAnswerSubmitted' : 'mainAnswerSubmitted', payload);
            } else {
                fetch('api/combat_handler.php?action=submit_answer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).then(r => r.json()).then(data => {
                    if (data.serverTime) {
                        updateServerTimeOffset(data.serverTime);
                    }
                    data.message = 'Time Expired!';
                    showAnswerResult(data);
                    stopResilientCountdown();
                    if (data.status === 'finished') {
                        setTimeout(() => {
                            stopResilientCountdown();
                            if (arenaSyncInterval) {
                                clearInterval(arenaSyncInterval);
                                arenaSyncInterval = null;
                            }
                            showFinalVictoryModal({
                                isDraw: false,
                                winnerName: 'Battle Completed',
                                finalScores: data.scores
                            });
                        }, 1800);
                    }
                }).catch(err => console.error('Timeout submit error:', err));
            }
        } else {
            const spectatorText = document.getElementById('spectatorStatusText');
            if (spectatorText) {
                spectatorText.innerHTML = '<span class="text-rose-400 font-bold animate-pulse">⏰ Time Expired! Evaluating...</span>';
            }
        }
    }

    // Server-Authoritative Timer Display Helper
    function syncTimerDisplay(remTime, maxDuration = 30) {
        const text = document.getElementById('arenaTimerText');
        const progress = document.getElementById('timerCircleProgress');
        const val = Math.max(0, remTime);
        if (text) text.textContent = val;

        if (progress) {
            const pct = Math.max(0, (val / maxDuration) * 100);
            progress.setAttribute('stroke-dasharray', `${pct}, 100`);
            if (val <= 5) {
                progress.setAttribute('class', 'text-rose-500 transition-all duration-300');
            } else if (val <= 12) {
                progress.setAttribute('class', 'text-amber-500 transition-all duration-300');
            } else {
                progress.setAttribute('class', 'text-emerald-500 transition-all duration-300');
            }
        }
    }

    // Render Active Question
    function renderQuestion(data) {
        lastRenderedTurnKey = `${(data.questionNumber - 1)}_${currentTurnIsBonus ? 'bonus' : 'main'}_${data.turnUserId}`;
        currentTurnIsBonus = false;
        currentSelectedOptionKey = null;
        isSubmittingAnswer = false;
        activeTimerMaxDuration = data.timerDuration || 30;

        const totalR = Math.max(1, data.totalRounds || (currentRoom && currentRoom.totalRounds) || 4);
        const roundNum = Math.min(totalR, Math.max(1, data.roundNumber || (currentRoom && currentRoom.currentRound) || 1));
        document.getElementById('arenaRoundIndicator').textContent = `Round ${roundNum} / ${totalR}`;
        document.getElementById('arenaRoomCode').textContent = currentRoom ? currentRoom.roomCode : '';
        const qNum = data.questionNumber || 1;
        const qPerRound = data.questionsPerRound || (currentRoom && currentRoom.questionsPerRound) || 4;
        document.getElementById('questionNumberHeader').textContent = `Question ${qNum} of ${qPerRound}`;

        const checkingBanner = document.getElementById('checkingAnswerBanner');
        if (checkingBanner) checkingBanner.classList.add('hidden');

        const resultOverlay = document.getElementById('battleResultOverlay');
        if (resultOverlay) resultOverlay.classList.add('hidden');

        const isMyTurn = (String(data.turnUserId) === String(STUDENT_ID));
        const turnBadge = document.getElementById('questionTurnBadge');
        const spectatorBar = document.getElementById('spectatorStatusBar');
        const spectatorText = document.getElementById('spectatorStatusText');

        if (isMyTurn) {
            turnBadge.textContent = 'YOUR TURN (+2 Pts)';
            turnBadge.className = 'text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400';
            spectatorBar.classList.add('hidden');
        } else {
            turnBadge.textContent = 'SPECTATING';
            turnBadge.className = 'text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400';
            spectatorBar.classList.remove('hidden');
            spectatorText.textContent = 'Opponent is thinking... You are spectating.';
        }

        // Render Options Grid
        const grid = document.getElementById('arenaOptionsGrid');
        const q = data.question;
        document.getElementById('arenaQuestionText').innerHTML = q.text;

        grid.innerHTML = q.options.map(o => `
            <button type="button" data-key="${o.key}" onclick="selectOption('${o.key}')" ${!isMyTurn ? 'disabled' : ''} class="opt-btn w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 hover:border-purple-600 disabled:opacity-60 disabled:cursor-not-allowed text-left font-bold text-xs transition-all flex items-center gap-3 text-slate-900 dark:text-slate-100">
                <span class="opt-key-badge w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-xs flex items-center justify-center shrink-0">${o.key}</span>
                <span class="flex-1 break-words text-slate-900 dark:text-slate-100 font-bold">${o.text}</span>
                ${!isMyTurn ? '<i data-lucide="lock" class="w-4 h-4 text-slate-400 shrink-0"></i>' : ''}
            </button>
        `).join('');

        // Render Live Scores Header
        const scoresDiv = document.getElementById('arenaLiveScores');
        if (data.scores && currentRoom && currentRoom.players) {
            scoresDiv.innerHTML = Object.entries(data.scores).map(([uid, pts]) => {
                const p = currentRoom.players.find(x => x.userId === uid);
                const isNeg = (pts < 0);
                const ptsClass = isNeg ? 'text-rose-400 font-mono font-black' : 'text-amber-400 font-mono font-black';
                return `<div class="flex items-center gap-1"><span class="text-slate-200 font-bold">${p ? p.name : 'Player'}:</span> <strong class="${ptsClass}">${pts} pts</strong></div>`;
            }).join('<span class="text-purple-300 font-extrabold px-1.5">vs</span>');
        }

        if (typeof data.turnStartTimestamp === 'number' && data.turnStartTimestamp > 0) {
            startResilientCountdown(data.turnStartTimestamp, activeTimerMaxDuration);
        } else {
            startResilientCountdown(getSyncedServerTimeSec(), activeTimerMaxDuration);
        }

        if (window.lucide) lucide.createIcons();
        if (window.renderMathInElement) {
            try {
                renderMathInElement(document.getElementById('arenaQuestionText'), {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '$', right: '$', display: false},
                        {left: '\\(', right: '\\)', display: false},
                        {left: '\\[', right: '\\]', display: true}
                    ],
                    throwOnError: false
                });
                renderMathInElement(grid, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '$', right: '$', display: false},
                        {left: '\\(', right: '\\)', display: false},
                        {left: '\\[', right: '\\]', display: true}
                    ],
                    throwOnError: false
                });
            } catch (kErr) {
                console.warn('KaTeX render error:', kErr);
            }
        }
    }

    function selectOption(optKey) {
        if (isSubmittingAnswer) return;
        isSubmittingAnswer = true;
        currentSelectedOptionKey = optKey;

        // Stop timer immediately on choice selection
        stopResilientCountdown();

        // Disable options immediately on first click to prevent double clicks or changing answer
        disableOptions();

        // Highlight selected option button
        const btns = document.querySelectorAll('.opt-btn');
        btns.forEach(b => {
            if (b.dataset.key === optKey) {
                b.className = 'opt-btn w-full p-4 rounded-2xl border-2 border-purple-600 bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-white font-black text-xs transition-all flex items-center gap-3 shadow-md ring-2 ring-purple-500/50';
                const keyBadge = b.querySelector('.opt-key-badge');
                if (keyBadge) keyBadge.className = 'opt-key-badge w-7 h-7 rounded-lg bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0';
            } else {
                b.className = 'opt-btn w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-left font-semibold text-xs transition-all flex items-center gap-3 opacity-50 cursor-not-allowed';
                const keyBadge = b.querySelector('.opt-key-badge');
                if (keyBadge) keyBadge.className = 'opt-key-badge w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-xs flex items-center justify-center shrink-0';
            }
        });

        // Show "Checking answer..." loading indicator
        const checkingBanner = document.getElementById('checkingAnswerBanner');
        if (checkingBanner) checkingBanner.classList.remove('hidden');

        // Submit answer to server after brief 300ms visual confirmation delay
        setTimeout(() => {
            confirmSelectedAnswer();
        }, 300);
    }

    function confirmSelectedAnswer() {
        if (!currentSelectedOptionKey) return;

        const payload = {
            roomCode: currentRoom ? currentRoom.roomCode : '',
            userId: STUDENT_ID,
            selectedOption: currentSelectedOptionKey,
            clientSubmitTimestamp: Date.now()
        };

        if (socket && socket.connected) {
            socket.emit(currentTurnIsBonus ? 'bonusAnswerSubmitted' : 'mainAnswerSubmitted', payload);
        } else {
            // PHP Native Fallback call
            fetch('api/combat_handler.php?action=submit_answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(r => r.json()).then(data => {
                if (data.serverTime) {
                    updateServerTimeOffset(data.serverTime);
                }
                showAnswerResult(data);
                stopResilientCountdown();
                if (data.status === 'finished') {
                    setTimeout(() => {
                        stopResilientCountdown();
                        if (arenaSyncInterval) {
                            clearInterval(arenaSyncInterval);
                            arenaSyncInterval = null;
                        }
                        showFinalVictoryModal({
                            isDraw: false,
                            winnerName: 'Battle Completed',
                            finalScores: data.scores
                        });
                    }, 1800);
                }
            }).catch(err => console.error('REST submit error:', err));
        }
    }

    function enableOptionsForMain() {
        const btns = document.querySelectorAll('.opt-btn');
        btns.forEach(b => {
            b.disabled = false;
            b.className = 'opt-btn w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 hover:border-purple-600 text-slate-900 dark:text-slate-100 text-left font-bold text-xs transition-all flex items-center gap-3 cursor-pointer';
            const keyBadge = b.querySelector('.opt-key-badge');
            if (keyBadge) keyBadge.className = 'opt-key-badge w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-xs flex items-center justify-center shrink-0';
            const lockIcon = b.querySelector('i');
            if (lockIcon) lockIcon.remove();
            b.onclick = function() {
                selectOption(b.dataset.key);
            };
        });
    }

    function confirmLeaveCombat() {
        if (confirm('Are you sure you want to surrender and leave the duel? You will forfeit the match.')) {
            stopResilientCountdown();
            if (arenaSyncInterval) {
                clearInterval(arenaSyncInterval);
                arenaSyncInterval = null;
            }
            document.body.classList.remove('combat-active-focus');
            localStorage.removeItem('activeCombatRoomCode');
            if (socket && currentRoom) {
                socket.emit('leaveRoom', { roomCode: currentRoom.roomCode, userId: STUDENT_ID });
            }
            window.location.href = 'combat.php?action=lobby';
        }
    }

    function closeRankUpModal() {
        const modal = document.getElementById('rankUpModal');
        if (modal) modal.classList.add('hidden');
    }

    function enableOptionsForBonus() {
        const btns = document.querySelectorAll('.opt-btn');
        btns.forEach(b => {
            b.disabled = false;
            b.className = 'opt-btn w-full p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 hover:border-amber-500 text-slate-900 dark:text-slate-100 text-left font-bold text-xs transition-all flex items-center gap-3 cursor-pointer';
            const keyBadge = b.querySelector('.opt-key-badge');
            if (keyBadge) keyBadge.className = 'opt-key-badge w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-xs flex items-center justify-center shrink-0';
            const lockIcon = b.querySelector('i');
            if (lockIcon) lockIcon.remove();
            b.onclick = function() {
                selectOption(b.dataset.key);
            };
        });
    }

    function disableOptions() {
        const btns = document.querySelectorAll('.opt-btn');
        btns.forEach(b => b.disabled = true);
    }

    let roundBreakCountdownInterval = null;

    function showRoundVictoryModal(data) {
        stopResilientCountdown();
        const modal = document.getElementById('roundVictoryModal');
        if (!modal) return;
        document.getElementById('roundVictoryTitle').textContent = `Round ${data.roundNumber} Finished!`;
        document.getElementById('roundWinnerBanner').textContent = `${data.winnerName} Won This Round! 👑`;

        const container = document.getElementById('roundStatsTableContainer');
        container.innerHTML = `
            <table class="w-full text-left text-xs font-bold">
                <thead>
                    <tr class="border-b border-slate-200 dark:border-slate-700 text-slate-400 text-[10px] uppercase">
                        <th class="py-2">Player</th>
                        <th class="py-2 text-center">Pts</th>
                        <th class="py-2 text-center">Wins</th>
                        <th class="py-2 text-center">Fails</th>
                        <th class="py-2 text-center">Avg Time</th>
                        <th class="py-2 text-center">Bonus Wins</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    ${data.statsTable.map(s => `
                        <tr>
                            <td class="py-2.5 text-slate-800 dark:text-slate-100 flex items-center gap-1.5 font-black">
                                ${s.name === data.winnerName ? '👑' : ''} ${s.name}
                            </td>
                            <td class="py-2.5 text-center text-purple-600 font-mono font-black">+${s.pointsThisRound}</td>
                            <td class="py-2.5 text-center text-emerald-600 font-mono">${s.wins || 0}</td>
                            <td class="py-2.5 text-center text-rose-500 font-mono">${s.fails || 0}</td>
                            <td class="py-2.5 text-center text-slate-500 font-mono">${s.avgTime || '0.0'}s</td>
                            <td class="py-2.5 text-center text-amber-500 font-mono">${s.bonusWins || 0}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        const isHost = currentRoom && (currentRoom.createdBy === STUDENT_ID);
        const hostBtn = document.getElementById('hostNextRoundBtn');
        const specText = document.getElementById('spectatorNextRoundText');

        if (isHost) {
            hostBtn.classList.remove('hidden');
        } else {
            hostBtn.classList.add('hidden');
        }

        let rem = data.autoStartSec || 10;
        const countBadge = document.getElementById('nextRoundCountdownBadge');
        const countText = document.getElementById('spectatorRoundCountdownText');

        if (roundBreakCountdownInterval) clearInterval(roundBreakCountdownInterval);

        roundBreakCountdownInterval = setInterval(() => {
            rem--;
            if (countBadge) countBadge.textContent = `(${rem}s)`;
            if (countText) countText.textContent = rem;

            if (rem <= 0) {
                clearInterval(roundBreakCountdownInterval);
                roundBreakCountdownInterval = null;
            }
        }, 1000);

        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    function requestNextRound() {
        if (socket && currentRoom) {
            socket.emit('nextRoundRequest', { roomCode: currentRoom.roomCode, userId: STUDENT_ID });
        }
        closeRoundVictoryModal();
    }

    function closeRoundVictoryModal() {
        if (roundBreakCountdownInterval) {
            clearInterval(roundBreakCountdownInterval);
            roundBreakCountdownInterval = null;
        }
        const modal = document.getElementById('roundVictoryModal');
        if (modal) modal.classList.add('hidden');
    }

    function loadMoreHistory() {
        const hiddenItems = document.querySelectorAll('.history-item.hidden');
        hiddenItems.forEach((item, index) => {
            if (index < 5) {
                item.classList.remove('hidden');
            }
        });
        const remaining = document.querySelectorAll('.history-item.hidden').length;
        if (remaining === 0) {
            const btn = document.getElementById('loadMoreHistoryBtn');
            if (btn) btn.classList.add('hidden');
        }
    }

    function updateLiveScoreboard(scores) {
        const scoresDiv = document.getElementById('arenaLiveScores');
        if (scoresDiv && scores && currentRoom && currentRoom.players) {
            scoresDiv.innerHTML = Object.entries(scores).map(([uid, pts]) => {
                const p = currentRoom.players.find(x => x.userId === uid);
                const isNeg = (pts < 0);
                const ptsClass = isNeg ? 'text-rose-400 font-mono font-black' : 'text-amber-400 font-mono font-black';
                return `<div class="flex items-center gap-1"><span class="text-slate-200 font-bold">${p ? p.name : 'Player'}:</span> <strong class="${ptsClass}">${pts} pts</strong></div>`;
            }).join('<span class="text-purple-300 font-extrabold px-1.5">vs</span>');
        }
    }

    function showAnswerResult(data) {
        stopResilientCountdown();
        const checkingBanner = document.getElementById('checkingAnswerBanner');
        if (checkingBanner) checkingBanner.classList.add('hidden');

        if (data.scores) {
            updateLiveScoreboard(data.scores);
        }

        const overlay = document.getElementById('battleResultOverlay');
        const iconDiv = document.getElementById('resultOverlayIcon');
        const textDiv = document.getElementById('resultOverlayText');
        const ptsDiv = document.getElementById('resultOverlayPoints');
        const cardContainer = document.getElementById('combatArenaScreen');

        if (!overlay) return;

        overlay.classList.remove('hidden');

        // CRITICAL ANTI-CHEAT: Highlight correct option ONLY if answer is NOT hidden
        if (data.correctOption && !data.hideCorrectOption) {
            const btns = document.querySelectorAll('.opt-btn');
            btns.forEach(b => {
                if (b.dataset.key === data.correctOption) {
                    b.className = 'opt-btn w-full p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-100 font-black text-xs transition-all flex items-center gap-3 shadow-lg ring-4 ring-emerald-500/30';
                    const keyBadge = b.querySelector('.opt-key-badge');
                    if (keyBadge) keyBadge.className = 'opt-key-badge w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0';
                }
            });
        }

        // Highlight selected wrong option in red for active player so they know they made a wrong choice
        if (data.selectedOption && !data.isCorrect) {
            const btns = document.querySelectorAll('.opt-btn');
            btns.forEach(b => {
                if (b.dataset.key === data.selectedOption) {
                    b.className = 'opt-btn w-full p-4 rounded-2xl border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/80 text-rose-900 dark:text-rose-100 font-black text-xs transition-all flex items-center gap-3 shadow-md ring-2 ring-rose-500/30';
                    const keyBadge = b.querySelector('.opt-key-badge');
                    if (keyBadge) keyBadge.className = 'opt-key-badge w-7 h-7 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center shrink-0';
                }
            });
        }

        // Special case: Both players missed this question
        if (data.bothMissed) {
            overlay.className = 'my-4 p-6 rounded-3xl text-center space-y-2 bg-slate-100 dark:bg-slate-800/90 border-2 border-slate-300 dark:border-slate-700 shadow-2xl animate-in zoom-in-95 pointer-events-none mx-auto max-w-sm';
            iconDiv.textContent = '❌';
            textDiv.textContent = 'BOTH PLAYERS MISSED!';
            textDiv.className = 'text-2xl font-black text-slate-800 dark:text-white uppercase tracking-wider';
            ptsDiv.textContent = data.correctOption ? `Correct Answer was: (${data.correctOption})` : '0 Points Awarded';
            ptsDiv.className = 'inline-block px-4 py-1.5 rounded-full text-xs font-black bg-slate-800 text-white shadow-md';
            return;
        }

        const isMainTurnAnswer = (String(data.userId) === String(STUDENT_ID));

        if (isMainTurnAnswer) {
            // Active Player Answering
            if (data.isCorrect) {
                confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 }, disableForReducedMotion: true });
                overlay.className = 'my-4 p-6 rounded-3xl text-center space-y-2 bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500/50 shadow-2xl animate-in zoom-in-95 pointer-events-none mx-auto max-w-sm';
                iconDiv.textContent = '✅';
                textDiv.textContent = 'CORRECT!';
                textDiv.className = 'text-2xl font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider';
                ptsDiv.textContent = `+${data.pointsAwarded || 2} Points!`;
                ptsDiv.className = 'inline-block px-4 py-1.5 rounded-full text-xs font-black bg-emerald-500 text-white shadow-md';
            } else {
                if (cardContainer) {
                    cardContainer.classList.add('animate-shake');
                    setTimeout(() => cardContainer.classList.remove('animate-shake'), 600);
                }
                overlay.className = 'my-4 p-6 rounded-3xl text-center space-y-2 bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-500/50 shadow-2xl animate-in zoom-in-95 pointer-events-none mx-auto max-w-sm';
                iconDiv.textContent = '❌';
                textDiv.textContent = 'WRONG!';
                textDiv.className = 'text-2xl font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider';
                ptsDiv.textContent = data.hideCorrectOption ? 'Bonus chance passed to opponent!' : `${data.pointsAwarded < 0 ? data.pointsAwarded + ' Points' : '0 Points'}`;
                ptsDiv.className = 'inline-block px-4 py-1.5 rounded-full text-xs font-black bg-rose-500 text-white shadow-md';
            }
        } else {
            // Spectator Watching Opponent
            if (data.isCorrect) {
                confetti({ particleCount: 25, spread: 40, origin: { y: 0.6 }, disableForReducedMotion: true });
                overlay.className = 'my-4 p-6 rounded-3xl text-center space-y-2 bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500/50 shadow-2xl animate-in zoom-in-95 pointer-events-none mx-auto max-w-sm';
                iconDiv.textContent = '👀';
                textDiv.textContent = 'OPPONENT CORRECT! ✅';
                textDiv.className = 'text-2xl font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider';
                ptsDiv.textContent = `Opponent got +${data.pointsAwarded || 2} pts`;
                ptsDiv.className = 'inline-block px-4 py-1.5 rounded-full text-xs font-black bg-emerald-500 text-white shadow-md';
            } else {
                if (cardContainer) {
                    cardContainer.classList.add('animate-shake');
                    setTimeout(() => cardContainer.classList.remove('animate-shake'), 600);
                }
                overlay.className = 'my-4 p-6 rounded-3xl text-center space-y-2 bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-500/50 shadow-2xl animate-in zoom-in-95 pointer-events-none mx-auto max-w-sm';
                iconDiv.textContent = '⚡';
                textDiv.textContent = 'OPPONENT MISSED!';
                textDiv.className = 'text-2xl font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider';
                ptsDiv.textContent = data.hideCorrectOption ? 'Prepare for your Bonus Chance!' : 'Opponent failed!';
                ptsDiv.className = 'inline-block px-4 py-1.5 rounded-full text-xs font-black bg-amber-400 text-slate-950 shadow-md';
            }
        }
    }

    function showFinalVictoryModal(data) {
        stopResilientCountdown();
        const modal = document.getElementById('finalVictoryModal');
        if (!modal) return;
        modal.classList.remove('hidden');

        if (data.isDraw) {
            document.getElementById('victorySubtitle').textContent = 'Result: Draw! 🤝 (Both won 25 Coins!)';
        } else {
            document.getElementById('victorySubtitle').textContent = `Winner: ${data.winnerName}`;
        }

        const table = document.getElementById('finalScoresTable');
        if (table && data.finalScores) {
            table.innerHTML = Object.entries(data.finalScores).map(([uid, pts]) => {
                const p = currentRoom && currentRoom.players ? currentRoom.players.find(x => x.userId === uid) : null;
                const coins = (data.coinsAwarded && data.coinsAwarded[uid]) || 0;
                return `
                    <div class="flex items-center justify-between text-xs font-bold py-2.5 border-b border-slate-200 dark:border-slate-700">
                        <span class="text-slate-900 dark:text-white font-black">${p ? p.name : 'Player'} ${uid === data.winnerUserId ? '🏆' : ''}</span>
                        <div class="flex items-center gap-3">
                            <span class="text-amber-500 font-mono font-black text-sm">${pts} pts</span>
                            <span class="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black text-[11px]">+${coins} Coins</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Edge Case 5: Light confetti that auto-stops to avoid lag
        if (data.winnerUserId === STUDENT_ID || data.isDraw) {
            confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 }, disableForReducedMotion: true });
        }

        if (data.isRankUp && data.newRank) {
            document.getElementById('newRankBadgeTitle').textContent = data.newRank.toUpperCase() + ' ⚡';
            document.getElementById('rankUpModal').classList.remove('hidden');
            confetti({ particleCount: 150, spread: 90, origin: { y: 0.4 }, disableForReducedMotion: true });
        }

        // Edge Case 8: Disable rematch button for 2 seconds after final screen appears
        const rematchBtn = document.getElementById('rematchBtn');
        if (rematchBtn) {
            rematchBtn.disabled = true;
            rematchBtn.className = 'w-full py-3.5 rounded-xl bg-purple-600/50 cursor-not-allowed text-white text-xs font-black uppercase tracking-wider shadow-lg opacity-60';
            setTimeout(() => {
                rematchBtn.disabled = false;
                rematchBtn.className = 'w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider shadow-lg';
            }, 2000);

            rematchBtn.onclick = () => {
                if (socket && currentRoom) {
                    socket.emit('rematchRequest', { roomCode: currentRoom.roomCode, userId: STUDENT_ID });
                    alert('Rematch request sent! Waiting for opponent...');
                }
            };
        }

        if (window.lucide) lucide.createIcons();
    }
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
