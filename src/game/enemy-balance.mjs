export const PLAYER_REFERENCE_SPEED = 7;

export function getEnemyBaseSpeed(level, profileSpeed = 1) {
  const safeLevel = Math.max(1, Math.min(11, Number(level) || 1));
  const safeProfileSpeed = Math.max(0.4, Math.min(1.8, Number(profileSpeed) || 1));

  // Curva desacoplada de HP/daño: 2.15 u/s en nivel 1 -> 3.65 u/s en nivel 11.
  // Antes la base crecía +0.35 por nivel y volvía a multiplicarse por enemyScale.
  return (2 + safeLevel * 0.15) * safeProfileSpeed;
}

export function getEnemyMovementTuning(role, distance, {
  isBoss = false,
  enraged = false
} = {}) {
  let multiplier = 1;
  let reverse = false;

  if (role === 'sprinter' && distance < 7) multiplier = 1.25;
  else if (role === 'ambusher' && distance < 9) multiplier = 1.14;
  else if (role === 'tank') multiplier = 0.9;
  else if (String(role || '').includes('ranged')) {
    if (distance < 5) {
      reverse = true;
      multiplier = 0.65;
    } else if (distance < 9) {
      multiplier = 0.22;
    }
  }

  if (isBoss && enraged) multiplier *= 1.18;

  return {
    multiplier,
    reverse,
    maxSpeed: isBoss ? 5.2 : (role === 'sprinter' ? 5.2 : 4.9)
  };
}

export function getEffectiveEnemySpeed(baseSpeed, role, distance, options = {}) {
  const tuning = getEnemyMovementTuning(role, distance, options);
  return {
    ...tuning,
    speed: Math.min(tuning.maxSpeed, Math.max(0, Number(baseSpeed) || 0) * tuning.multiplier)
  };
}
