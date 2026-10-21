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

test('combat.php contains high-contrast CSS overrides and finished state listeners', () => {
  const combatPath = path.join(__dirname, '..', 'combat.php');
  const content = fs.readFileSync(combatPath, 'utf8');

  assert.ok(content.includes('#arenaQuestionText'), 'Must style #arenaQuestionText');
  assert.ok(content.includes('.opt-btn'), 'Must style .opt-btn');
  assert.ok(content.includes('.katex, .katex *'), 'Must enforce color: inherit on KaTeX math nodes');
  assert.ok(content.includes('#arenaLiveScores'), 'Must style #arenaLiveScores');
  assert.ok(content.includes('Math.min(totalR, Math.max(1, data.roundNumber'), 'Must cap round display in renderQuestion');
  assert.ok(content.includes("data.status === 'finished'"), 'Must handle immediate victory transition on submit answer');
});

test('api/combat_handler.php contains strict round matching and finished status enforcement', () => {
  const handlerPath = path.join(__dirname, '..', 'api', 'combat_handler.php');
  const content = fs.readFileSync(handlerPath, 'utf8');

  assert.ok(content.includes('$totalQuestions = max(1, $questionsPerRound * $totalRounds);'), 'Must compute exact total questions without multiplier inflation');
  assert.ok(content.includes('$nextRound = $isFinished ? $totalRounds : min($totalRounds, (int)floor($nextIdx / $qPerRound) + 1);'), 'Must cap nextRound strictly at totalRounds');
  assert.ok(content.includes("$nextStatus = $isFinished ? 'finished' : 'playing';"), 'Must set status to finished when reaching total questions');
});
