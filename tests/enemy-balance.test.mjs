import test from 'node:test';
import assert from 'node:assert/strict';

const {
  PLAYER_REFERENCE_SPEED,
  getEnemyBaseSpeed,
  getEffectiveEnemySpeed
} = await import('../src/game/enemy-balance.mjs');

test('enemy base speed increases gradually instead of exploding by level', () => {
  const levels = Array.from({ length: 11 }, (_, i) => getEnemyBaseSpeed(i + 1, 1));
  for (let i = 1; i < levels.length; i++) {
    assert.ok(levels[i] > levels[i - 1]);
    assert.ok(levels[i] - levels[i - 1] <= 0.151);
  }
  assert.ok(levels[10] < 4);
});

test('level 4 sprinter remains clearly slower than the player', () => {
  const base = getEnemyBaseSpeed(4, 1.38);
  const movement = getEffectiveEnemySpeed(base, 'sprinter', 5);
  assert.ok(movement.speed < PLAYER_REFERENCE_SPEED);
  assert.ok(movement.speed <= 4.6);
});

test('late ranged enemies stay challenging but do not outrun the player', () => {
  const base = getEnemyBaseSpeed(10, 1.36);
  const chase = getEffectiveEnemySpeed(base, 'ranged', 12);
  const retreat = getEffectiveEnemySpeed(base, 'ranged', 3);

  assert.ok(chase.speed <= 4.9);
  assert.ok(chase.speed < PLAYER_REFERENCE_SPEED);
  assert.equal(retreat.reverse, true);
  assert.ok(retreat.speed < chase.speed);
});

test('boss rage is moderated', () => {
  const base = getEnemyBaseSpeed(3, 1) * 0.68;
  const calm = getEffectiveEnemySpeed(base, 'boss', 5, { isBoss:true, enraged:false });
  const rage = getEffectiveEnemySpeed(base, 'boss', 5, { isBoss:true, enraged:true });

  assert.ok(rage.speed > calm.speed);
  assert.ok(rage.speed / calm.speed <= 1.181);
});
