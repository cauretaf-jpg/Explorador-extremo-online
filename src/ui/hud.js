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

let upgradeRenderKey = null;

function renderUpgrade(data) {
  const screen = byId('upgrade-screen');
  if (!data.visible) {
    screen.style.display = 'none';
    screen.style.pointerEvents = 'none';
    upgradeRenderKey = null;
    return;
  }

  screen.style.display = 'flex';
  screen.style.pointerEvents = 'auto';
  byId('upgrade-subtitle').textContent = data.subtitle || '';
  byId('upgrade-waiting').textContent = data.waiting || '';

  const choices = data.choices || [];
  const renderKey = JSON.stringify({
    subtitle: data.subtitle || '',
    canChoose: !!data.canChoose,
    choices: choices.map(choice => choice.id)
  });

  // El loop del juego puede pedir este render muchas veces mientras está pausado.
  // Conservar los botones evita destruir el target entre pointerdown y click.
  if (renderKey === upgradeRenderKey) return;
  upgradeRenderKey = renderKey;

  const options = byId('upgrade-options');
  options.replaceChildren();

  for (const upgrade of choices) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'upgrade-card';
    button.disabled = !data.canChoose;
    button.dataset.upgradeId = upgrade.id;
    button.setAttribute('aria-label', 'Elegir ' + upgrade.name);
    button.innerHTML =
      '<strong>' + upgrade.name + '</strong>' +
      '<span>' + upgrade.description + '</span>';
    button.addEventListener('click', () => {
      if (!button.disabled) data.onChoose?.(upgrade.id);
    });
    options.appendChild(button);
  }
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
