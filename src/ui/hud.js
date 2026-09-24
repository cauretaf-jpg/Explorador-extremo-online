function byId(id) {
  return document.getElementById(id);
}

function updateHealth(data) {
  byId('local-health-name').textContent = data.localName;
  byId('local-health-value').textContent = data.localHp + '/' + data.maxHealth;
  byId('local-health-fill').style.width = (data.localHp / data.maxHealth * 100) + '%';

  const mateRow = byId('mate-health-row');
  if (!data.showMate) {
    mateRow.style.display = 'none';
    return;
  }

  mateRow.style.display = 'block';
  byId('mate-health-name').textContent = data.mateName;
  byId('mate-health-value').textContent = data.mateHp + '/' + data.maxHealth;
  byId('mate-health-fill').style.width = (data.mateHp / data.maxHealth * 100) + '%';
}

function updateWeapon(data) {
  byId('weapon-name').textContent = data.name + ' · DMG ' + data.damage;
  byId('weapon-ammo').textContent = data.ammo + '/' + data.magazineSize;
  byId('weapon-status').textContent = data.status;
}

function updateLevelObjective(data) {
  byId('level-objective-title').textContent = 'Nivel ' + data.level + ' · ' + data.title;
  byId('level-objective-text').textContent = data.objective;
}

function renderUpgrade(data) {
  const screen = byId('upgrade-screen');
  if (!data.visible) {
    screen.style.display = 'none';
    return;
  }

  screen.style.display = 'flex';
  byId('upgrade-subtitle').textContent = data.subtitle;

  const options = byId('upgrade-options');
  options.innerHTML = '';

  for (const upgrade of data.choices || []) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'upgrade-card';
    button.disabled = !data.canChoose;
    button.innerHTML =
      '<strong>' + upgrade.name + '</strong>' +
      '<span>' + upgrade.description + '</span>';
    button.onclick = () => data.onChoose?.(upgrade.id);
    options.appendChild(button);
  }

  byId('upgrade-waiting').textContent = data.waiting || '';
}

function setGamePanelsVisible(visible) {
  const display = visible ? '' : 'none';
  for (const id of ['level-objective','weapon-hud','combat-hud']) {
    const node = byId(id);
    if (node) node.style.display = display;
  }
}

window.ExploradorUI = {
  updateHealth,
  updateWeapon,
  updateLevelObjective,
  renderUpgrade,
  setGamePanelsVisible
};
