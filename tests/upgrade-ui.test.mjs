import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class FakeNode {
  constructor(id = '') {
    this.id = id;
    this.style = {};
    this.children = [];
    this.dataset = {};
    this.disabled = false;
    this.textContent = '';
    this.attributes = {};
    this.listeners = {};
  }
  replaceChildren(...children) { this.children = [...children]; }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(type, fn) { this.listeners[type] = fn; }
  click() { this.listeners.click?.({ target: this }); }
  set innerHTML(value) { this._innerHTML = value; }
  get innerHTML() { return this._innerHTML || ''; }
}

function makeUi() {
  const ids = [
    'upgrade-screen','upgrade-subtitle','upgrade-options','upgrade-waiting',
    'local-health-name','local-health-value','local-health-fill','mate-health-row',
    'mate-health-name','mate-health-value','mate-health-fill','weapon-name',
    'weapon-ammo','weapon-status','level-objective-title','level-objective-text',
    'level-objective','weapon-hud','combat-hud'
  ];
  const nodes = new Map(ids.map(id => [id, new FakeNode(id)]));
  const context = {
    window: {},
    document: {
      getElementById(id) { return nodes.get(id) || null; },
      createElement() { return new FakeNode(); }
    },
    console
  };
  const source = fs.readFileSync(new URL('../src/ui/hud.js', import.meta.url), 'utf8');
  vm.runInNewContext(source, context);
  return { ui: context.window.ExploradorUI, nodes };
}

test('upgrade options survive repeated renders so click can complete', () => {
  const { ui, nodes } = makeUi();
  let chosen = null;
  const data = {
    visible: true,
    subtitle: 'Nivel 1 superado',
    canChoose: true,
    waiting: 'Elige una mejora',
    choices: [
      { id:'damage', name:'Munición reforzada', description:'+1 daño' },
      { id:'rapid', name:'Mecanismo rápido', description:'Más velocidad' }
    ],
    onChoose(id) { chosen = id; }
  };

  ui.renderUpgrade(data);
  const firstButtons = [...nodes.get('upgrade-options').children];
  assert.equal(firstButtons.length, 2);

  ui.renderUpgrade(data);
  const secondButtons = [...nodes.get('upgrade-options').children];

  assert.equal(secondButtons[0], firstButtons[0]);
  assert.equal(secondButtons[1], firstButtons[1]);
  secondButtons[0].click();
  assert.equal(chosen, 'damage');
});

test('upgrade options rebuild only when the choices actually change', () => {
  const { ui, nodes } = makeUi();
  const base = {
    visible: true,
    subtitle: 'Nivel 1 superado',
    canChoose: true,
    waiting: '',
    onChoose() {}
  };
  ui.renderUpgrade({ ...base, choices:[{id:'damage',name:'Daño',description:''}] });
  const original = nodes.get('upgrade-options').children[0];

  ui.renderUpgrade({
    ...base,
    subtitle:'Nivel 2 superado',
    choices:[{id:'vitality',name:'Vida',description:''}]
  });

  assert.notEqual(nodes.get('upgrade-options').children[0], original);
});
