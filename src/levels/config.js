const BiomeConfigs = {
  Selva: { fogColor: 0x081c15 },
  'Montaña': { fogColor: 0x1e293b },
  Desierto: { fogColor: 0x6f4e37 },
  Bosque: { fogColor: 0x0a2f1d },
  Egipto: { fogColor: 0x8a7a4a },
  Maya: { fogColor: 0x0a3d2a },
  Azteca: { fogColor: 0x1a0f0a },
  ChinaFeudal: { fogColor: 0x3a1414 },
  Grecia: { fogColor: 0x9a9488 }
};

const NewLevelConfig = {
  7:  { biome: 'Egipto',      label: 'Pirámides Egipcias',    portalColor: 0xd4af37, portalMat: 'gold',    trapType: 'estaca',    enemyType: 'Momia',          weapon: 'lanza' },
  8:  { biome: 'Maya',        label: 'Pirámides Mayas',       portalColor: 0x00c896, portalMat: 'jade',    trapType: 'pendulo',   enemyType: 'GuerreroJaguar', weapon: 'dardo' },
  9:  { biome: 'Azteca',      label: 'Pirámides Aztecas',     portalColor: 0xff4500, portalMat: 'basalto', trapType: 'geiser',    enemyType: 'GuerreroAguila', weapon: 'cuchillo' },
  10: { biome: 'ChinaFeudal', label: 'Ciudad China Feudal',   portalColor: 0x8a2be2, portalMat: 'madera',  trapType: 'makibishi', enemyType: 'NinjaSombra',    weapon: 'shuriken' },
  11: { biome: 'Grecia',      label: 'Ciudad Griega Antigua', portalColor: 0x66ccff, portalMat: 'marmol',  trapType: 'columna',   enemyType: 'Minotauro',      weapon: 'jabalina' }
};

const ClassicPortalColors = {
  Selva: 0x2ecc71,
  'Montaña': 0xaeefff,
  Desierto: 0xffb347,
  Bosque: 0xd2691e
};

function getBiomeForLevel(level, classicBiomes = ['Selva', 'Montaña', 'Desierto', 'Bosque']) {
  if (level <= 6) return classicBiomes[(level - 1) % classicBiomes.length];
  return NewLevelConfig[level]?.biome || classicBiomes[(level - 1) % classicBiomes.length];
}

window.ExploradorLevels = {
  BiomeConfigs,
  NewLevelConfig,
  ClassicPortalColors,
  getBiomeForLevel
};
