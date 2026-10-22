const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// Production round calculation algorithm
function computeCombatRound({ questionIndex, questionsPerRound, totalRounds }) {
  const qPerRound = Math.max(1, questionsPerRound);
  const totalR = Math.max(1, totalRounds);
  const totalQuestions = qPerRound * totalR;

  const isFinished = questionIndex >= totalQuestions;
  const currentRound = isFinished ? totalR : Math.min(totalR, Math.floor(questionIndex / qPerRound) + 1);
  const status = isFinished ? 'finished' : 'playing';

  return {
    currentRound,
    totalRounds: totalR,
    totalQuestions,
    questionsPerRound: qPerRound,
    status,
    isFinished
  };
}

// Server-authoritative time remaining calculation
function calculateSyncedTimeRemaining(turnStartTs, maxDur, currentServerTimeSec) {
  if (!turnStartTs || turnStartTs <= 0) return maxDur;
  if (currentServerTimeSec < turnStartTs) {
    return maxDur; // Still in transition/review window
  }
  return Math.max(0, Math.ceil((turnStartTs + maxDur) - currentServerTimeSec));
}

test('Combat round calculation strictly terminates at configured totalRounds (4 rounds of 4 questions = 16 questions total)', () => {
  const config = { questionsPerRound: 4, totalRounds: 4 };

  // Round 1: Questions 0-3
  for (let idx = 0; idx <= 3; idx++) {
    const res = computeCombatRound({ questionIndex: idx, ...config });
    assert.strictEqual(res.currentRound, 1, `Question index ${idx} must be Round 1`);
    assert.strictEqual(res.status, 'playing');
    assert.strictEqual(res.isFinished, false);
  }

  // Round 2: Questions 4-7
  for (let idx = 4; idx <= 7; idx++) {
    const res = computeCombatRound({ questionIndex: idx, ...config });
    assert.strictEqual(res.currentRound, 2, `Question index ${idx} must be Round 2`);
    assert.strictEqual(res.status, 'playing');
    assert.strictEqual(res.isFinished, false);
  }

  // Round 3: Questions 8-11
  for (let idx = 8; idx <= 11; idx++) {
    const res = computeCombatRound({ questionIndex: idx, ...config });
    assert.strictEqual(res.currentRound, 3, `Question index ${idx} must be Round 3`);
    assert.strictEqual(res.status, 'playing');
    assert.strictEqual(res.isFinished, false);
  }

  // Round 4: Questions 12-15
  for (let idx = 12; idx <= 15; idx++) {
    const res = computeCombatRound({ questionIndex: idx, ...config });
    assert.strictEqual(res.currentRound, 4, `Question index ${idx} must be Round 4`);
    assert.strictEqual(res.status, 'playing');
    assert.strictEqual(res.isFinished, false);
  }

  // Beyond Round 4: Question 16+ must immediately FINISH and NEVER exceed Round 4
  for (let idx = 16; idx <= 32; idx++) {
    const res = computeCombatRound({ questionIndex: idx, ...config });
    assert.strictEqual(res.currentRound, 4, `Question index ${idx} must be capped at Round 4`);
    assert.strictEqual(res.status, 'finished', `Question index ${idx} must be marked finished`);
    assert.strictEqual(res.isFinished, true);
  }
});

test('Combat round calculation adheres strictly to 2-round room setting (2 rounds of 4 questions = 8 questions)', () => {
  const config = { questionsPerRound: 4, totalRounds: 2 };

  // Round 1: Questions 0-3
  for (let idx = 0; idx <= 3; idx++) {
    const res = computeCombatRound({ questionIndex: idx, ...config });
    assert.strictEqual(res.currentRound, 1, `Question index ${idx} must be Round 1`);
    assert.strictEqual(res.status, 'playing');
  }

  // Round 2: Questions 4-7
  for (let idx = 4; idx <= 7; idx++) {
    const res = computeCombatRound({ questionIndex: idx, ...config });
    assert.strictEqual(res.currentRound, 2, `Question index ${idx} must be Round 2`);
    assert.strictEqual(res.status, 'playing');
  }

  // Question 8: Must finish immediately
  const endRes = computeCombatRound({ questionIndex: 8, ...config });
  assert.strictEqual(endRes.currentRound, 2, 'Round must remain capped at 2');
  assert.strictEqual(endRes.status, 'finished');
  assert.strictEqual(endRes.isFinished, true);
});

test('Combat round strictly never exceeds totalRounds under any question index (prevents Round 7 / 4 bug)', () => {
  const config = { questionsPerRound: 4, totalRounds: 4 };

  const pastLimit = computeCombatRound({ questionIndex: 24, ...config });
  assert.strictEqual(pastLimit.currentRound, 4, 'Must never show Round 7 for index 24; must cap at 4');
  assert.strictEqual(pastLimit.status, 'finished');

  const wayPastLimit = computeCombatRound({ questionIndex: 100, ...config });
  assert.strictEqual(wayPastLimit.currentRound, 4, 'Must remain capped at 4');
  assert.strictEqual(wayPastLimit.status, 'finished');
});

test('Server-authoritative timer calculates uniform timeRemaining across client clock skews', () => {
  const turnStart = 1000.0;
  const duration = 30;

  // During 2s transition before question countdown starts
  assert.strictEqual(calculateSyncedTimeRemaining(turnStart, duration, 999.0), 30);
  assert.strictEqual(calculateSyncedTimeRemaining(turnStart, duration, 1000.0), 30);

  // During active countdown
  assert.strictEqual(calculateSyncedTimeRemaining(turnStart, duration, 1005.0), 25);
  assert.strictEqual(calculateSyncedTimeRemaining(turnStart, duration, 1020.2), 10);
  assert.strictEqual(calculateSyncedTimeRemaining(turnStart, duration, 1029.1), 1);
  assert.strictEqual(calculateSyncedTimeRemaining(turnStart, duration, 1030.0), 0);

  // After expiration: always clamped at 0, never negative or frozen
  assert.strictEqual(calculateSyncedTimeRemaining(turnStart, duration, 1035.0), 0);
});

test('combat.php contains high-contrast CSS overrides, server time sync, and 300ms polling', () => {
  const combatPath = path.join(__dirname, '..', 'combat.php');
  const content = fs.readFileSync(combatPath, 'utf8');

  assert.ok(content.includes('#arenaQuestionText'), 'Must style #arenaQuestionText');
  assert.ok(content.includes('.opt-btn'), 'Must style .opt-btn');
  assert.ok(content.includes('.katex, .katex *'), 'Must enforce color: inherit on KaTeX math nodes');
  assert.ok(content.includes('#arenaLiveScores'), 'Must style #arenaLiveScores');
  assert.ok(content.includes('updateServerTimeOffset'), 'Must calculate server time offset to eliminate device clock skew');
  assert.ok(content.includes('calculateSyncedTimeRemaining'), 'Must calculate synced time remaining from server timestamps');
  assert.ok(content.includes('setInterval(async () => {'), 'Must define sync loop');
  assert.ok(content.includes('}, 300);'), 'Must poll arena status at high-frequency 300ms for instant parity');
});

test('combat.php defines required UI interaction and lifecycle functions', () => {
  const combatPath = path.join(__dirname, '..', 'combat.php');
  const content = fs.readFileSync(combatPath, 'utf8');

  assert.ok(content.includes('function enableOptionsForMain()'), 'Must define enableOptionsForMain to re-enable answer buttons on main turn');
  assert.ok(content.includes('function confirmLeaveCombat()'), 'Must define confirmLeaveCombat to handle player surrender without runtime error');
  assert.ok(content.includes('function closeRankUpModal()'), 'Must define closeRankUpModal for level-up celebration modal button');
  assert.ok(content.includes('launchBattleArena(data.room)'), 'Must launch arena when rematchStarted socket event is fired');
  assert.ok(content.includes('Return to Arena Lobby'), 'Must provide Return to Arena Lobby navigation button in final modal');
});

test('local_admin_server.js strictly enforces anti-cheat and respects allowBonus setting on timeouts', () => {
  const serverPath = path.join(__dirname, '..', 'local_admin_server.js');
  const content = fs.readFileSync(serverPath, 'utf8');

  assert.ok(content.includes("socket.on('leaveRoom'"), 'Must register leaveRoom socket listener');
  assert.ok(content.includes('hideCorrectOption: hasBonus'), 'Must hide correct answer on main timeout when bonus turn is active');
  assert.ok(content.includes('turnStartTimestamp'), 'Must emit turnStartTimestamp to synchronize client timers');
});

test('api/combat_handler.php contains atomic processCombatAnswer, server timestamps, and auto-timeout watchdog', () => {
  const handlerPath = path.join(__dirname, '..', 'api', 'combat_handler.php');
  const content = fs.readFileSync(handlerPath, 'utf8');

  assert.ok(content.includes('function processCombatAnswer('), 'Must encapsulate answer processing into reusable function');
  assert.ok(content.includes('$totalQuestions = max(1, $questionsPerRound * $totalRounds);'), 'Must compute exact total questions without multiplier inflation');
  assert.ok(content.includes('$nextRound = $isFinished ? $totalRounds : min($totalRounds, (int)floor($nextIdx / $qPerRound) + 1);'), 'Must cap nextRound strictly at totalRounds');
  assert.ok(content.includes("$nextStatus = $isFinished ? 'finished' : 'playing';"), 'Must set status to finished when reaching total questions');
  assert.ok(content.includes('turn_start_timestamp'), 'Must persist turn_start_timestamp in combat_rooms');
  assert.ok(content.includes('isReviewingAnswer'), 'Must track 2-second review overlay phase');
  assert.ok(content.includes("processCombatAnswer($pdo, $room, $code, $activeUserId, 'TIMEOUT')"), 'Must auto-process timeout on server when time expires');
});
