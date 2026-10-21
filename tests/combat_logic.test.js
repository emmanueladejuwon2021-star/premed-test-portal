const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// Helper implementing the production round calculation algorithm
function computeCombatRound({ questionIndex, questionsPerRound, numPlayers, totalRounds }) {
  const pCount = Math.max(1, numPlayers);
  const qPerRound = Math.max(1, questionsPerRound);
  const questionsPerRoundTotal = qPerRound * pCount;
  const totalQuestions = questionsPerRoundTotal * totalRounds;

  const currentRound = Math.min(totalRounds, Math.floor(questionIndex / questionsPerRoundTotal) + 1);
  const isFinished = questionIndex >= totalQuestions;
  const status = isFinished ? 'finished' : 'playing';

  return {
    currentRound,
    totalRounds,
    totalQuestions,
    questionsPerRoundTotal,
    status,
    isFinished
  };
}

test('Combat round calculation correctly identifies Round 1 to 4 in a 2-player 4-round match', () => {
  const config = { questionsPerRound: 4, numPlayers: 2, totalRounds: 4 };

  // Round 1: Questions 0-7
  for (let idx = 0; idx <= 7; idx++) {
    const res = computeCombatRound({ questionIndex: idx, ...config });
    assert.strictEqual(res.currentRound, 1, `Question index ${idx} must be Round 1`);
    assert.strictEqual(res.status, 'playing');
  }

  // Round 2: Questions 8-15
  for (let idx = 8; idx <= 15; idx++) {
    const res = computeCombatRound({ questionIndex: idx, ...config });
    assert.strictEqual(res.currentRound, 2, `Question index ${idx} must be Round 2`);
    assert.strictEqual(res.status, 'playing');
  }

  // Round 3: Questions 16-23
  for (let idx = 16; idx <= 23; idx++) {
    const res = computeCombatRound({ questionIndex: idx, ...config });
    assert.strictEqual(res.currentRound, 3, `Question index ${idx} must be Round 3`);
    assert.strictEqual(res.status, 'playing');
  }

  // Round 4: Questions 24-31 (previously buggy index 24 that generated Round 7)
  for (let idx = 24; idx <= 31; idx++) {
    const res = computeCombatRound({ questionIndex: idx, ...config });
    assert.strictEqual(res.currentRound, 4, `Question index ${idx} must be Round 4`);
    assert.strictEqual(res.status, 'playing');
  }
});

test('Combat round strictly never exceeds totalRounds (no Round 7 / 4 bug)', () => {
  const config = { questionsPerRound: 4, numPlayers: 2, totalRounds: 4 };

  // Beyond total questions (e.g. index 32, 40, 100)
  const atEnd = computeCombatRound({ questionIndex: 32, ...config });
  assert.strictEqual(atEnd.currentRound, 4, 'Round must never exceed max total rounds (4)');
  assert.strictEqual(atEnd.status, 'finished');
  assert.strictEqual(atEnd.isFinished, true);

  const wayPastEnd = computeCombatRound({ questionIndex: 56, ...config });
  assert.strictEqual(wayPastEnd.currentRound, 4, 'Round must remain capped at 4');
  assert.strictEqual(wayPastEnd.isFinished, true);
});

test('Combat 2v1 (3 players) round calculation functions with equal fairness', () => {
  const config = { questionsPerRound: 3, numPlayers: 3, totalRounds: 3 };
  // 1 round = 9 questions total (3 questions * 3 players)
  assert.strictEqual(computeCombatRound({ questionIndex: 0, ...config }).currentRound, 1);
  assert.strictEqual(computeCombatRound({ questionIndex: 8, ...config }).currentRound, 1);
  assert.strictEqual(computeCombatRound({ questionIndex: 9, ...config }).currentRound, 2);
  assert.strictEqual(computeCombatRound({ questionIndex: 17, ...config }).currentRound, 2);
  assert.strictEqual(computeCombatRound({ questionIndex: 18, ...config }).currentRound, 3);
  assert.strictEqual(computeCombatRound({ questionIndex: 26, ...config }).currentRound, 3);
  assert.strictEqual(computeCombatRound({ questionIndex: 27, ...config }).currentRound, 3);
  assert.strictEqual(computeCombatRound({ questionIndex: 27, ...config }).isFinished, true);
});

test('combat.php contains high-contrast CSS overrides for question text, options, and KaTeX', () => {
  const combatPath = path.join(__dirname, '..', 'combat.php');
  const content = fs.readFileSync(combatPath, 'utf8');

  assert.ok(content.includes('#arenaQuestionText'), 'Must style #arenaQuestionText');
  assert.ok(content.includes('.opt-btn'), 'Must style .opt-btn');
  assert.ok(content.includes('.katex, .katex *'), 'Must enforce color: inherit on KaTeX math nodes');
  assert.ok(content.includes('#arenaLiveScores'), 'Must style #arenaLiveScores');
  assert.ok(content.includes('Math.min(totalR, Math.max(1, data.roundNumber || 1))'), 'Must cap round display in renderQuestion');
});

test('api/combat_handler.php contains capped nextRound and multi-player question accounting', () => {
  const handlerPath = path.join(__dirname, '..', 'api', 'combat_handler.php');
  const content = fs.readFileSync(handlerPath, 'utf8');

  assert.ok(content.includes('$questionsPerRoundTotal = max(1, $qPerRound * $pCount);'), 'Must compute total questions per round across all players');
  assert.ok(content.includes('$nextRound = min($totalRounds, (int)floor($nextIdx / $questionsPerRoundTotal) + 1);'), 'Must cap nextRound at totalRounds');
});
