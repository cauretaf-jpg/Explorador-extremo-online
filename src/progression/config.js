const levelProfiles = {
  1:  { title:'Primer contacto', objective:'Encuentra el portal y aprende a moverte entre los peligros.', enemyScale:1.00, reward:500 },
  2:  { title:'Sincronía', objective:'Activen las dos placas cooperativas antes de alcanzar el portal.', enemyScale:1.05, reward:650 },
  3:  { title:'El Guardián', objective:'Activen las placas y derroten al Guardián del Desierto.', enemyScale:1.10, reward:900 },
  4:  { title:'Cacería', objective:'Cruza el laberinto bajo mayor presión de enemigos veloces.', enemyScale:1.16, reward:800 },
  5:  { title:'Resistencia', objective:'Conserva salud y recursos: los enemigos golpean con mayor fuerza.', enemyScale:1.22, reward:900 },
  6:  { title:'Asedio', objective:'Supera la última expedición clásica con enemigos más resistentes.', enemyScale:1.30, reward:1100 },
  7:  { title:'Tumba del faraón', objective:'Sobrevive a estacas, momias y lanzas entre las pirámides egipcias.', enemyScale:1.36, reward:1200 },
  8:  { title:'Templo maya', objective:'Coordina el avance entre péndulos y guerreros jaguar.', enemyScale:1.42, reward:1300 },
  9:  { title:'Corazón de fuego', objective:'Atraviesa géiseres aztecas y ataques de guerreros águila.', enemyScale:1.50, reward:1450 },
  10: { title:'Sombras imperiales', objective:'Resiste shurikens, makibishi y ninjas de alta velocidad.', enemyScale:1.58, reward:1600 },
  11: { title:'Última expedición', objective:'Conquista Grecia y atraviesa el dominio del Minotauro.', enemyScale:1.68, reward:2000 }
};

const upgradeCatalog = [
  {
    id:'damage',
    name:'Munición reforzada',
    description:'+1 daño por disparo.',
    apply(state){ state.weapon.damage += 1; }
  },
  {
    id:'magazine',
    name:'Cargador ampliado',
    description:'+4 balas por cargador y recarga completa.',
    apply(state){
      state.weapon.magazineSize += 4;
      for (const role of ['solo','host','guest']) state.ammo[role] = state.weapon.magazineSize;
    }
  },
  {
    id:'rapid',
    name:'Mecanismo rápido',
    description:'15% menos tiempo entre disparos.',
    apply(state){ state.weapon.fireCooldown = Math.max(0.10, state.weapon.fireCooldown * 0.85); }
  },
  {
    id:'velocity',
    name:'Cañón de precisión',
    description:'+18% velocidad de proyectil.',
    apply(state){ state.weapon.projectileSpeed *= 1.18; }
  },
  {
    id:'vitality',
    name:'Equipo médico',
    description:'+20 HP máximos y cura inmediata.',
    apply(state, game){
      state.maxHealth += 20;
      if (game) {
        game.maxHealth = state.maxHealth;
        for (const role of ['solo','host','guest']) game.health[role] = game.maxHealth;
      }
    }
  },
  {
    id:'revive',
    name:'Kit de rescate',
    description:'Reanimar devuelve 20 HP adicionales.',
    apply(state){ state.reviveHealthBonus += 20; }
  }
];

function getLevelProfile(level) {
  return levelProfiles[level] || levelProfiles[11];
}

function getUpgradeChoices(level) {
  const start = Math.max(0, (level - 2) % upgradeCatalog.length);
  return [0,1,2].map(offset => upgradeCatalog[(start + offset * 2) % upgradeCatalog.length]);
}

function applyUpgrade(state, id, game = null) {
  const upgrade = upgradeCatalog.find(item => item.id === id);
  if (!upgrade) return null;
  upgrade.apply(state, game);
  state.upgrades.push(id);
  return upgrade;
}

function createProgressionState(maxHealth = 100) {
  return {
    upgrades: [],
    reviveHealthBonus: 0,
    weapon: {
      name:'Rifle de expedición',
      damage:1,
      magazineSize:8,
      fireCooldown:0.32,
      projectileSpeed:28,
      reloadTime:1.35
    },
    ammo: { solo:8, host:8, guest:8 },
    reloadUntil: { solo:0, host:0, guest:0 },
    lastShotAt: { solo:0, host:0, guest:0 },
    maxHealth
  };
}

window.ExploradorProgression = {
  levelProfiles,
  upgradeCatalog,
  getLevelProfile,
  getUpgradeChoices,
  applyUpgrade,
  createProgressionState
};
