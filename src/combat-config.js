import { getEnemyBaseSpeed, getEnemyMovementTuning, getEffectiveEnemySpeed } from './game/enemy-balance.mjs';

const enemyProfiles = {
  León:             { role: 'sprinter', hp: 3, damage: 24, speed: 1.22, attackCooldown: 1.0 },
  Fantasma:         { role: 'skirmisher', hp: 3, damage: 20, speed: 1.12, attackCooldown: 1.15 },
  Robot:            { role: 'tank', hp: 6, damage: 34, speed: 0.78, attackCooldown: 1.35 },
  Perro:            { role: 'sprinter', hp: 3, damage: 22, speed: 1.38, attackCooldown: 0.9 },
  Culebra:          { role: 'ambusher', hp: 4, damage: 25, speed: 1.24, attackCooldown: 1.0 },
  Oso:              { role: 'tank', hp: 7, damage: 38, speed: 0.72, attackCooldown: 1.45 },
  Momia:            { role: 'ranged', hp: 5, damage: 24, speed: 0.98, attackCooldown: 1.2 },
  GuerreroJaguar:   { role: 'ranged', hp: 5, damage: 22, speed: 1.18, attackCooldown: 1.0 },
  GuerreroAguila:   { role: 'ranged', hp: 6, damage: 27, speed: 1.12, attackCooldown: 1.05 },
  NinjaSombra:      { role: 'ranged', hp: 5, damage: 24, speed: 1.36, attackCooldown: 0.9 },
  Minotauro:        { role: 'tank-ranged', hp: 10, damage: 42, speed: 0.9, attackCooldown: 1.2 }
};

export function getEnemyProfile(type, level = 1) {
  const base = enemyProfiles[type] || { role: 'hunter', hp: 3, damage: 24, speed: 1, attackCooldown: 1.1 };
  const levelHpBonus = Math.max(0, Math.floor((level - 1) / 3));
  const damageBonus = Math.max(0, level - 1);
  return {
    ...base,
    hp: base.hp + levelHpBonus,
    damage: base.damage + damageBonus
  };
}

export const combatRules = {
  maxHealth: 100,
  reviveHealth: 50,
  medkitHeal: 35,
  medkitsPerLevel: 2,
  bulletDamage: 1,
  boss: {
    level: 3,
    name: 'Guardián del Desierto',
    hp: 28,
    damage: 44,
    attackCooldown: 1.15,
    speedMultiplier: 0.68,
    score: 3500
  }
};

window.ExploradorCombatConfig = {
  getEnemyProfile,
  getEnemyBaseSpeed,
  getEnemyMovementTuning,
  getEffectiveEnemySpeed,
  combatRules
};
