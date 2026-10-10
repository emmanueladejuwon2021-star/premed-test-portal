<?php
/**
 * Med Combat - CBT Battle Duel
 * Premed Test Portal (PHP Edition)
 */

$pageTitle = 'Med Combat Arena';
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/header.php';

$db = DB::connect();

// Fetch random questions for the duel
$stmt = $db->query("SELECT * FROM questions ORDER BY RANDOM() LIMIT 10");
$battleQuestions = $stmt->fetchAll();
?>

<div class="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6" id="combatArena">
    <div class="text-center">
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-black border border-rose-200 mb-2">
            <i data-lucide="swords" class="w-3.5 h-3.5"></i>
            <span>Team CBT Arena</span>
        </div>
        <h1 class="text-3xl font-black text-slate-900 tracking-tight">Med Combat: Battle Duel</h1>
        <p class="text-xs text-slate-500 mt-1">Answer high-yield clinical questions to deploy strikes against the opposing squad!</p>
    </div>

    <!-- Battle Header: Teams & Health Bars -->
    <div class="grid grid-cols-2 gap-4">
        <!-- Team Blue -->
        <div class="bg-blue-50/80 rounded-3xl p-5 border border-blue-200 text-left space-y-2">
            <div class="flex justify-between items-center text-xs font-black text-blue-900 uppercase">
                <span class="flex items-center gap-1.5"><i data-lucide="shield" class="w-4 h-4 text-blue-600"></i> Squad Blue</span>
                <span id="blueHpText">100 / 100 HP</span>
            </div>
            <div class="w-full bg-blue-200/80 rounded-full h-3 overflow-hidden">
                <div id="blueHpBar" class="bg-blue-600 h-full rounded-full transition-all duration-300" style="width: 100%"></div>
            </div>
            <span class="text-[11px] font-bold text-blue-700" id="blueScoreText">Score: 0 pts</span>
        </div>

        <!-- Team Red -->
        <div class="bg-rose-50/80 rounded-3xl p-5 border border-rose-200 text-right space-y-2">
            <div class="flex justify-between items-center text-xs font-black text-rose-900 uppercase">
                <span id="redHpText">100 / 100 HP</span>
                <span class="flex items-center gap-1.5">Squad Red <i data-lucide="flame" class="w-4 h-4 text-rose-600"></i></span>
            </div>
            <div class="w-full bg-rose-200/80 rounded-full h-3 overflow-hidden">
                <div id="redHpBar" class="bg-rose-600 h-full rounded-full transition-all duration-300 ml-auto" style="width: 100%"></div>
            </div>
            <span class="text-[11px] font-bold text-rose-700" id="redScoreText">Score: 0 pts</span>
        </div>
    </div>

    <!-- Active Question Card -->
    <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6" id="combatCard">
        <div class="flex justify-between items-center pb-3 border-b border-slate-100">
            <span class="text-xs font-black uppercase text-indigo-600" id="combatTurnIndicator">Active Strike: Squad Blue's Turn</span>
            <span class="text-xs font-bold text-slate-400" id="combatRoundIndicator">Round 1</span>
        </div>

        <div id="combatQuestionStem" class="text-base font-semibold text-slate-900 leading-relaxed">
            <!-- Stem -->
        </div>

        <div id="combatOptions" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- Options -->
        </div>
    </div>

    <!-- Battle Feed Log -->
    <div class="bg-slate-900 text-slate-300 rounded-3xl p-6 shadow-sm space-y-2 text-xs font-mono">
        <h3 class="text-slate-400 font-bold uppercase tracking-wider mb-2">Combat Feed</h3>
        <div id="combatLogs" class="space-y-1.5 max-h-36 overflow-y-auto">
            <p class="text-emerald-400">&gt; Combat initiated. Squad Blue attacks first.</p>
        </div>
    </div>
</div>

<script>
const QUESTIONS = <?= json_encode($battleQuestions) ?>;
let currentIndex = 0;
let health = { A: 100, B: 100 };
let scores = { A: 0, B: 0 };
let turn = 'A'; // A = Blue, B = Red

function initCombat() {
    renderCombatQuestion();
}

function renderCombatQuestion() {
    if (currentIndex >= QUESTIONS.length || health.A <= 0 || health.B <= 0) {
        finishCombat();
        return;
    }

    const q = QUESTIONS[currentIndex];
    document.getElementById('combatQuestionStem').innerHTML = q.text;
    document.getElementById('combatRoundIndicator').innerText = `Round ${currentIndex + 1} of ${QUESTIONS.length}`;
    document.getElementById('combatTurnIndicator').innerText = `Active Strike: Squad ${turn === 'A' ? 'Blue' : 'Red'}'s Turn`;

    const optContainer = document.getElementById('combatOptions');
    optContainer.innerHTML = '';

    ['a', 'b', 'c', 'd'].forEach(opt => {
        if (!q[opt]) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.onclick = () => submitCombatAnswer(opt);
        btn.className = "p-3.5 rounded-2xl border border-slate-200 text-left text-xs font-semibold hover:border-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center gap-2.5";
        btn.innerHTML = `<span class="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center font-bold uppercase text-[11px]">${opt}</span> <span>${q[opt]}</span>`;
        optContainer.appendChild(btn);
    });

    if (typeof renderMathInElement === 'function') {
        renderMathInElement(document.getElementById('combatQuestionStem'), {
            delimiters: [{left: '$', right: '$', display: false}]
        });
    }
}

function submitCombatAnswer(pick) {
    const q = QUESTIONS[currentIndex];
    const isCorrect = (pick.toLowerCase() === q.correct_option.toLowerCase());
    const logContainer = document.getElementById('combatLogs');

    if (isCorrect) {
        scores[turn] += 10;
        const opponent = turn === 'A' ? 'B' : 'A';
        health[opponent] = Math.max(0, health[opponent] - 25);
        logContainer.innerHTML = `<p class="text-emerald-400">&gt; Direct hit! Squad ${turn === 'A' ? 'Blue' : 'Red'} correctly deployed Option ${pick.toUpperCase()}! Deals 25 damage.</p>` + logContainer.innerHTML;
    } else {
        health[turn] = Math.max(0, health[turn] - 15);
        logContainer.innerHTML = `<p class="text-rose-400">&gt; Misfire! Squad ${turn === 'A' ? 'Blue' : 'Red'} picked Option ${pick.toUpperCase()} (Correct was ${q.correct_option.toUpperCase()}). Lost 15 HP.</p>` + logContainer.innerHTML;
    }

    // Update HP UI
    document.getElementById('blueHpBar').style.width = health.A + '%';
    document.getElementById('blueHpText').innerText = health.A + ' / 100 HP';
    document.getElementById('blueScoreText').innerText = 'Score: ' + scores.A + ' pts';

    document.getElementById('redHpBar').style.width = health.B + '%';
    document.getElementById('redHpText').innerText = health.B + ' / 100 HP';
    document.getElementById('redScoreText').innerText = 'Score: ' + scores.B + ' pts';

    turn = turn === 'A' ? 'B' : 'A';
    currentIndex++;
    setTimeout(renderCombatQuestion, 1000);
}

function finishCombat() {
    const winner = health.A > health.B ? 'Squad Blue' : (health.B > health.A ? 'Squad Red' : 'Tie');
    document.getElementById('combatCard').innerHTML = `
        <div class="text-center py-8 space-y-4">
            <div class="w-16 h-16 mx-auto rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <i data-lucide="trophy" class="w-8 h-8"></i>
            </div>
            <h2 class="text-2xl font-black text-slate-900">Battle Duel Completed!</h2>
            <p class="text-sm font-bold text-indigo-600">Victory Claimed by: ${winner}!</p>
            <div class="flex justify-center gap-3 pt-4">
                <a href="combat.php" class="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md">New Battle</a>
                <a href="index.php" class="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs">Home Hub</a>
            </div>
        </div>
    `;
    lucide.createIcons();
}

window.addEventListener('DOMContentLoaded', initCombat);
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
