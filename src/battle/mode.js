import {
  BATTLE_PROTOCOL_VERSION,
  HOST_CONTROL_TYPES,
  cleanBattleName,
  createEnvelope,
  createSigningIdentity,
  isBattleRoomCode,
  identityIdFromPublicJwk,
  isCompatiblePresence,
  verifyEnvelope
} from './protocol.mjs';
import { disposeObject3D } from '../game/dispose.js';

const BattleMode = (() => {
  const MAX_PLAYERS = 8;
  const MIN_PLAYERS = 2;
  const KILL_LIMIT = 10;
  const MATCH_SECONDS = 300;
  const MAX_HEALTH = 100;
  const SHOT_DAMAGE = 25;
  const SHOT_COOLDOWN_MS = 260;
  const MOVE_SPEED = 8;
  const POSE_INTERVAL = 0.125;
  const STATE_INTERVAL = 0.25;
  const HOST_GRACE_MS = 15000;
  const STORAGE_KEY = 'explorador-battle-name';
  const SESSION_KEY = 'explorador-battle-session-v1321';
  const palette = [0x00ffcc,0xff4d6d,0xffd166,0x5aa9ff,0xb388ff,0x7ee081,0xff8c42,0xf15bb5];
  const spawnPoints = [
    [-19,-19],[19,19],[-19,19],[19,-19],[0,-19],[0,19],[-19,0],[19,0]
  ];
  const obstacles = [
    {x:0,z:0,w:7,d:7,h:4},
    {x:-12,z:-7,w:8,d:3,h:3},
    {x:12,z:7,w:8,d:3,h:3},
    {x:-12,z:10,w:3,d:8,h:3},
    {x:12,z:-10,w:3,d:8,h:3},
    {x:0,z:13,w:9,d:2.5,h:2.5},
    {x:0,z:-13,w:9,d:2.5,h:2.5}
  ];

  let root, lobbyEl, gameEl, resultEl, playersEl, statusEl, codeEl, readyBtn, startBtn;
  let client = null, channel = null, role = null, roomCode = null, clientId = null;
  let name = '', ready = false, subscribed = false, active = false, isHost = false;
  let presence = [], participants = new Map(), state = new Map(), meshes = new Map();
  let scene, camera, renderer, arenaGroup, localMesh = null;
  let projectiles = [], projectileMeshes = new Map(), stateTimer = 0, poseTimer = 0;
  let clock = null, keys = {}, localFacing = {x:0,z:-1}, localVelocity = {x:0,z:0};
  let startedAt = 0, timeLeft = MATCH_SECONDS, winner = null, frameId = null;
  let shootHeld = false, lastLocalShot = 0, touchMove = {x:0,z:0};
  let gameStatusEl, hpEl, killsEl, timerEl, scoreboardEl, localNameEl;
  let touchJoystickPointer = null, touchFireTimer = null;
  let presenceProbe = null, roomActive = false;
  let signingIdentity = null, lockedHostId = null, reconnectingActive = false;
  let guestUplink = null, hostUplinks = new Map(), hostGraceTimer = null;
  const seenNonces = new Set();

  function cfg() {
    return window.EXPLORADOR_CONFIG;
  }

  function makeId() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2,'0')).join('');
  }

  function makeRoomCode() {
    return String(crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000);
  }

  function cleanName(value) {
    return cleanBattleName(value);
  }

  function loadBattleSession(code = null) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
      if (!saved || Date.now() - Number(saved.savedAt || 0) > 2 * 60 * 60 * 1000) return null;
      if (code && saved.roomCode !== code) return null;
      return saved;
    } catch {
      return null;
    }
  }

  function saveBattleSession(extra = {}) {
    if (!roomCode || !clientId || !signingIdentity) return;
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        roomCode, clientId, name, role, active, ready, lockedHostId,
        privateJwk: signingIdentity.privateJwk,
        publicJwk: signingIdentity.publicJwk,
        savedAt: Date.now(),
        ...extra
      }));
    } catch {}
  }

  function clearBattleSession() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  }

  async function prepareSigningIdentity(saved = null) {
    signingIdentity = await createSigningIdentity(saved);
  }

  function rememberNonce(nonce) {
    if (!nonce || seenNonces.has(nonce)) return false;
    seenNonces.add(nonce);
    if (seenNonces.size > 512) seenNonces.delete(seenNonces.values().next().value);
    return true;
  }

  async function decodeEnvelope(envelope, expectedSenderId = null) {
    if (!envelope?.senderId || !envelope?.type) return null;
    const participant = participants.get(envelope.senderId) || presence.find(p => p.id === envelope.senderId);
    if (!isCompatiblePresence(participant)) return null;
    if (HOST_CONTROL_TYPES.has(envelope.type) && envelope.senderId !== lockedHostId) return null;
    const valid = await verifyEnvelope(envelope, participant.publicKey, { expectedSenderId });
    if (!valid || !rememberNonce(envelope.nonce)) return null;
    return { type: envelope.type, senderId: envelope.senderId, ...(envelope.payload || {}) };
  }

  function setStatus(message, error = false) {
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.classList.toggle('error', !!error);
  }

  function ensureClient() {
    const config = cfg();
    if (!config?.url || !config?.publishableKey || !window.createSupabaseClient) {
      throw new Error('Supabase no está configurado.');
    }
    client ||= window.createSupabaseClient(config.url, config.publishableKey);
    return client;
  }

  function participantsFromPresence() {
    if (!channel) return [];
    const flat = Object.values(channel.presenceState()).flat();
    const unique = new Map();
    for (const p of flat) {
      if (!p?.id) continue;
      unique.set(p.id, p);
    }
    return [...unique.values()].sort((a,b) => (a.joinedAt || 0) - (b.joinedAt || 0));
  }

  function selfPresence() {
    return {
      id: clientId,
      name,
      ready,
      host: isHost,
      active,
      protocol: BATTLE_PROTOCOL_VERSION,
      publicKey: signingIdentity?.publicJwk || null,
      joinedAt: participants.find(p => p.id === clientId)?.joinedAt || Date.now()
    };
  }

  async function trackSelf() {
    if (!channel || !subscribed) return;
    await channel.track(selfPresence());
  }

  async function send(type, payload = {}) {
    if (!channel || !subscribed || !signingIdentity) return false;
    try {
      const envelope = await createEnvelope(signingIdentity, clientId, type, payload);
      const result = await channel.send({ type: 'broadcast', event: 'battle', payload: envelope });
      return result === 'ok';
    } catch (error) {
      console.warn('Battle broadcast rechazado:', error);
      return false;
    }
  }

  function uplinkTopic(id) {
    return 'battle:' + roomCode + ':uplink:' + id;
  }

  async function closeUplinks() {
    const channels = [];
    if (guestUplink) channels.push(guestUplink);
    for (const value of hostUplinks.values()) channels.push(value);
    guestUplink = null;
    hostUplinks.clear();
    await Promise.all(channels.map(async value => {
      try { if (client) await client.removeChannel(value); } catch {}
    }));
  }

  async function ensureGuestUplink() {
    if (isHost || !client || !clientId || guestUplink) return;
    const uplink = client.channel(uplinkTopic(clientId), { config: { broadcast: { self: false } } });
    guestUplink = uplink;
    uplink.subscribe(status => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.warn('Canal uplink no disponible:', status);
    });
  }

  async function ensureHostUplinks() {
    if (!isHost || !client) return;
    const wanted = new Set(presence.filter(p => p.id !== clientId && isCompatiblePresence(p)).map(p => p.id));
    for (const [id, uplink] of hostUplinks) {
      if (wanted.has(id)) continue;
      hostUplinks.delete(id);
      try { await client.removeChannel(uplink); } catch {}
    }
    for (const id of wanted) {
      if (hostUplinks.has(id)) continue;
      const uplink = client.channel(uplinkTopic(id), { config: { broadcast: { self: false } } });
      hostUplinks.set(id, uplink);
      uplink
        .on('broadcast', { event: 'battle-uplink' }, ({ payload }) => handleUplink(payload, id).catch(console.warn))
        .subscribe();
    }
  }

  async function sendUplink(type, payload = {}) {
    if (!guestUplink || !signingIdentity) return false;
    try {
      const envelope = await createEnvelope(signingIdentity, clientId, type, payload);
      const result = await guestUplink.send({ type: 'broadcast', event: 'battle-uplink', payload: envelope });
      return result === 'ok';
    } catch (error) {
      console.warn('Battle uplink rechazado:', error);
      return false;
    }
  }

  async function handleUplink(envelope, expectedSenderId) {
    if (!isHost || !active) return;
    const msg = await decodeEnvelope(envelope, expectedSenderId);
    if (!msg) return;
    if (msg.type === 'pose') applyGuestPose({ ...msg, id: msg.senderId });
    else if (msg.type === 'shoot') authoritativeShoot(msg.senderId, msg.dir);
  }

  function clearHostGrace() {
    clearTimeout(hostGraceTimer);
    hostGraceTimer = null;
    if (gameStatusEl?.textContent?.startsWith('ANFITRIÓN DESCONECTADO')) gameStatusEl.textContent = '';
  }

  function updateHostGrace() {
    if (!active || isHost || !lockedHostId) return;
    const hostPresent = presence.some(p => p.id === lockedHostId && p.host);
    if (hostPresent) return clearHostGrace();
    if (hostGraceTimer) return;
    if (gameStatusEl) gameStatusEl.textContent = 'ANFITRIÓN DESCONECTADO · esperando 15s para reconectar';
    hostGraceTimer = setTimeout(() => {
      hostGraceTimer = null;
      if (!active || isHost) return;
      if (presence.some(p => p.id === lockedHostId && p.host)) return;
      const ranking = [...state.values()].sort((a,b) => b.kills-a.kills || a.deaths-b.deaths);
      endBattle(null, ranking);
      resultEl.querySelector('.battle-result-title').textContent = 'Batalla interrumpida · el anfitrión no regresó';
    }, HOST_GRACE_MS);
  }

  function updateLobby() {
    presence = participantsFromPresence();
    participants = new Map(presence.map(p => [p.id,p]));
    const compatibleHost = presence.find(p => p.host && isCompatiblePresence(p));
    if (!lockedHostId && compatibleHost) lockedHostId = compatibleHost.id;
    roomActive = !!presence.find(p => p.id === lockedHostId)?.active;

    if (!playersEl) return;
    playersEl.replaceChildren();

    presence.forEach((p,index) => {
      const row = document.createElement('div');
      row.className = 'battle-player-row';
      if (p.id === clientId) row.classList.add('self');

      const dot = document.createElement('span');
      dot.className = 'battle-player-dot';
      dot.style.background = '#' + palette[index % palette.length].toString(16).padStart(6,'0');

      const label = document.createElement('span');
      label.className = 'battle-player-name';
      label.textContent = p.name + (p.host ? ' · HOST' : '');

      const compatible = isCompatiblePresence(p);
      const rs = document.createElement('span');
      rs.className = 'battle-ready-state ' + (p.ready && compatible ? 'ready' : '');
      rs.textContent = compatible ? (p.ready ? 'LISTO' : 'ESPERANDO') : 'ACTUALIZA';

      row.append(dot,label,rs);
      playersEl.appendChild(row);
    });

    codeEl.textContent = roomCode || '------';
    readyBtn.textContent = ready ? '✓ Listo' : 'Estoy listo';
    readyBtn.classList.toggle('active', ready);
    readyBtn.disabled = !participants.has(clientId) || active;

    const compatiblePlayers = presence.filter(isCompatiblePresence);
    const allReady = compatiblePlayers.length >= MIN_PLAYERS &&
      compatiblePlayers.length <= MAX_PLAYERS &&
      compatiblePlayers.length === presence.length &&
      compatiblePlayers.every(p => p.ready);
    startBtn.disabled = !isHost || !allReady || active;
    startBtn.style.display = isHost ? 'inline-flex' : 'none';

    if (active) setStatus('La batalla está en curso.');
    else if (presence.length < MIN_PLAYERS) setStatus('Esperando jugadores · ' + presence.length + '/' + MAX_PLAYERS);
    else if (!allReady) setStatus('Sala ' + roomCode + ' · ' + presence.length + '/' + MAX_PLAYERS + ' · todos deben marcar LISTO.');
    else if (isHost) setStatus('Todos listos · puedes iniciar la batalla.');
    else setStatus('Todos listos · esperando al anfitrión.');
  }

  async function syncPresence() {
    updateLobby();
    if (isHost) await ensureHostUplinks();

    if (isHost && presence.length > MAX_PLAYERS) {
      const overflow = presence.slice(MAX_PLAYERS).map(p => p.id);
      if (overflow.length) send('battle_reject',{ids:overflow,reason:'La sala alcanzó el máximo de '+MAX_PLAYERS+' jugadores.'});
    }

    if (!isHost && role === 'guest' && !active) {
      const host = presence.find(p => p.host);
      if (!host) return;
      if (host.active) {
        setStatus('La batalla ya comenzó. Crea otra sala o espera a la siguiente.', true);
        return;
      }
    }
    if (active && isHost) {
      const presentIds = new Set(presence.map(p => p.id));
      for (const [id,p] of state) p.connected = presentIds.has(id);
    }
    updateHostGrace();
  }

  async function disconnect({ closeUi = false } = {}) {
    clearTimeout(presenceProbe);
    clearHostGrace();
    await closeUplinks();
    subscribed = false;
    active = false;
    roomActive = false;
    ready = false;
    const old = channel;
    channel = null;
    try { if (old && client) await client.removeChannel(old); } catch {}
    stopGame();
    participants.clear();
    presence = [];
    lockedHostId = null;
    reconnectingActive = false;
    clearBattleSession();
    if (closeUi) hideRoot();
  }

  async function createRoom() {
    await disconnect();
    isHost = true;
    role = 'host';
    roomCode = makeRoomCode();
    ready = false;
    active = false;
    reconnectingActive = false;
    await prepareSigningIdentity();
    clientId = identityIdFromPublicJwk(signingIdentity.publicJwk);
    lockedHostId = clientId;
    saveBattleSession();
    await connect();
  }

  async function joinRoom(code) {
    const normalized = String(code || '').trim();
    if (!isBattleRoomCode(normalized)) throw new Error('Ingresa un código de 6 dígitos.');
    const saved = loadBattleSession(normalized);
    await disconnect();
    isHost = false;
    role = 'guest';
    roomCode = normalized;
    lockedHostId = saved?.lockedHostId || null;
    ready = saved?.role === 'guest' ? !!saved.ready : false;
    active = false;
    reconnectingActive = !!(saved?.role === 'guest' && saved.active);
    if (saved?.name && reconnectingActive) name = cleanName(saved.name);
    await prepareSigningIdentity(saved?.role === 'guest' ? saved : null);
    clientId = identityIdFromPublicJwk(signingIdentity.publicJwk);
    saveBattleSession({ active: reconnectingActive });
    await connect();
  }

  async function connect() {
    ensureClient();
    const room = 'battle:' + roomCode;
    channel = client.channel(room, {
      config: {
        broadcast: { self: false },
        presence: { key: clientId }
      }
    });
    const current = channel;

    current
      .on('broadcast',{event:'battle'},({payload}) => {
        if (current !== channel) return;
        handleMessage(payload).catch(console.warn);
      })
      .on('presence',{event:'sync'},() => {
        if (current !== channel) return;
        syncPresence().catch(console.error);
      })
      .subscribe(async status => {
        if (current !== channel) return;
        if (status === 'SUBSCRIBED') {
          subscribed = true;
          if (isHost) {
            await trackSelf();
            lockedHostId = clientId;
            saveBattleSession();
            openLobby();
            setStatus('Sala ' + roomCode + ' creada · comparte el código.');
            updateLobby();
          } else {
            openLobby();
            setStatus('Buscando sala ' + roomCode + '…');
            let tries = 0;
            const probe = async () => {
              if (current !== channel || subscribed === false) return;
              tries++;
              const ps = participantsFromPresence();
              const host = ps.find(p => p.host);
              if (host) {
                if (!isCompatiblePresence(host)) {
                  setStatus('La sala usa una versión incompatible. Actualiza el juego en ambos dispositivos.', true);
                  return;
                }
                lockedHostId = host.id;
                if (host.active && !reconnectingActive) {
                  setStatus('Esa batalla ya está en curso.', true);
                  return;
                }
                if (ps.length >= MAX_PLAYERS && !reconnectingActive) {
                  setStatus('La sala está llena (' + MAX_PLAYERS + '/' + MAX_PLAYERS + ').', true);
                  return;
                }
                await trackSelf();
                await ensureGuestUplink();
                saveBattleSession({ active: reconnectingActive });
                openLobby();
                setStatus(reconnectingActive ? 'Reconectando a la batalla ' + roomCode + '…' : 'Entraste a la sala ' + roomCode + '.');
                updateLobby();
                return;
              }
              if (tries >= 7) {
                setStatus('No se encontró un anfitrión activo para esa sala.', true);
                return;
              }
              presenceProbe = setTimeout(probe, 500);
            };
            presenceProbe = setTimeout(probe, 350);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setStatus('Problema de conexión con la sala.', true);
        } else if (status === 'CLOSED' && root?.classList.contains('open')) {
          setStatus('La conexión con la sala se cerró.', true);
        }
      });
  }

  async function handleMessage(envelope) {
    const msg = await decodeEnvelope(envelope);
    if (!msg) return;

    if (msg.type === 'battle_start' && !isHost) {
      active = true;
      reconnectingActive = false;
      startedAt = msg.startedAt || Date.now();
      timeLeft = MATCH_SECONDS;
      initializeBattle(msg.players || []);
      saveBattleSession({ active: true });
      trackSelf().catch(console.error);
    } else if (msg.type === 'battle_state' && !isHost) {
      if (!active && reconnectingActive && (msg.players || []).some(p => p.id === clientId)) {
        active = true;
        reconnectingActive = false;
        startedAt = msg.startedAt || Date.now();
        initializeBattle(msg.players || []);
        saveBattleSession({ active: true });
        trackSelf().catch(console.error);
      }
      if (active) applySnapshot(msg);
    } else if (msg.type === 'battle_end' && !isHost && active) {
      endBattle(msg.winner, msg.players || []);
    } else if (msg.type === 'battle_reject' && Array.isArray(msg.ids) && msg.ids.includes(clientId)) {
      setStatus(msg.reason || 'No fue posible entrar a la sala.', true);
      ready = false;
      disconnect({closeUi:false}).catch(console.error);
    }
  }

  function startBattleAsHost() {
    const raw = participantsFromPresence();
    const ps = raw.filter(isCompatiblePresence);
    if (!isHost || active || raw.length !== ps.length || ps.length < MIN_PLAYERS || ps.length > MAX_PLAYERS || !ps.every(p => p.ready)) return;

    active = true;
    startedAt = Date.now();
    state.clear();

    ps.forEach((p,index) => {
      const spawn = spawnPoints[index % spawnPoints.length];
      state.set(p.id, {
        id:p.id, name:p.name, slot:index,
        x:spawn[0], z:spawn[1], angle:0,
        health:MAX_HEALTH, kills:0, deaths:0,
        alive:true, connected:true, respawnAt:0,
        lastPoseAt:Date.now(), lastShotAt:0
      });
    });

    trackSelf().catch(console.error);
    saveBattleSession({ active:true });
    const players = [...state.values()].map(p => ({...p}));
    send('battle_start',{startedAt,players});
    initializeBattle(players);
  }

  function openLobby() {
    root.querySelector('.battle-menu').style.display = 'flex';
    root.querySelector('.battle-entry-card').style.display = 'none';
    lobbyEl.style.display = 'block';
    gameEl.style.display = 'none';
    resultEl.style.display = 'none';
  }

  function buildArena() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07110d);
    scene.fog = new THREE.Fog(0x07110d, 45, 90);

    camera = new THREE.PerspectiveCamera(58, innerWidth/innerHeight, 0.1, 150);
    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(innerWidth,innerHeight);
    renderer.shadowMap.enabled = true;
    gameEl.querySelector('.battle-canvas').replaceChildren(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xb9fff0,0x183025,1.1));
    const sun = new THREE.DirectionalLight(0xffffff,0.9);
    sun.position.set(15,25,12);
    sun.castShadow = true;
    scene.add(sun);

    arenaGroup = new THREE.Group();
    scene.add(arenaGroup);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(48,48),
      new THREE.MeshStandardMaterial({color:0x17352b,roughness:0.88,metalness:0.04})
    );
    floor.rotation.x = -Math.PI/2;
    floor.receiveShadow = true;
    arenaGroup.add(floor);

    const grid = new THREE.GridHelper(48,24,0x247b64,0x194f42);
    grid.position.y = 0.02;
    arenaGroup.add(grid);

    const wallMat = new THREE.MeshStandardMaterial({color:0x33483e,roughness:0.72});
    [
      {x:0,z:-24,w:50,d:1,h:4},{x:0,z:24,w:50,d:1,h:4},
      {x:-24,z:0,w:1,d:50,h:4},{x:24,z:0,w:1,d:50,h:4}
    ].forEach(o => arenaGroup.add(makeBox(o,wallMat)));

    const obstacleMat = new THREE.MeshStandardMaterial({color:0x43594f,roughness:0.62});
    obstacles.forEach(o => arenaGroup.add(makeBox(o,obstacleMat)));

    const centerRing = new THREE.Mesh(
      new THREE.TorusGeometry(5.5,0.18,8,48),
      new THREE.MeshBasicMaterial({color:0xffd166})
    );
    centerRing.rotation.x = Math.PI/2;
    centerRing.position.y = 0.08;
    arenaGroup.add(centerRing);
  }

  function makeBox(o,mat) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(o.w,o.h,o.d),mat);
    mesh.position.set(o.x,o.h/2,o.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function makeNameSprite(text,color) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(20,15,472,66);
    ctx.fillStyle = '#'+color.toString(16).padStart(6,'0');
    ctx.fillText(text,256,58);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false});
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(5.8,1.1,1);
    sprite.position.y = 2.8;
    return sprite;
  }

  function createPlayerMesh(p) {
    const color = palette[p.slot % palette.length];
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(.48,.56,1.35,12),
      new THREE.MeshStandardMaterial({color,roughness:.5,metalness:.1})
    );
    body.position.y = .85;
    body.castShadow = true;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(.42,14,10),
      new THREE.MeshStandardMaterial({color:0xf1c7a5,roughness:.7})
    );
    head.position.y = 1.72;
    head.castShadow = true;
    const gun = new THREE.Mesh(
      new THREE.BoxGeometry(.18,.18,1.05),
      new THREE.MeshStandardMaterial({color:0x20272a,metalness:.65,roughness:.35})
    );
    gun.position.set(.38,1.05,-.42);
    group.add(body,head,gun,makeNameSprite(p.name,color));
    group.position.set(p.x,0,p.z);
    group.rotation.y = p.angle || 0;
    scene.add(group);
    meshes.set(p.id,group);
    return group;
  }

  function initializeBattle(initialPlayers) {
    stopGame(false);
    openGame();
    saveBattleSession({ active:true });
    state = new Map(initialPlayers.map(p => [p.id,{...p}]));
    buildArena();
    meshes.clear();
    for (const p of state.values()) createPlayerMesh(p);
    localMesh = meshes.get(clientId) || null;
    startedAt ||= Date.now();
    timeLeft = MATCH_SECONDS;
    winner = null;
    clock = new THREE.Clock();
    stateTimer = 0; poseTimer = 0;
    keys = {};
    localVelocity = {x:0,z:0};
    localFacing = {x:0,z:-1};
    setupTouchControls();
    updateBattleHud();
    frameId = requestAnimationFrame(loop);
  }

  function openGame() {
    root.querySelector('.battle-menu').style.display = 'none';
    lobbyEl.style.display = 'none';
    resultEl.style.display = 'none';
    gameEl.style.display = 'block';
    document.body.classList.add('battle-active');
  }

  function stopGame(cancelFrame = true) {
    if (cancelFrame && frameId) cancelAnimationFrame(frameId);
    frameId = null;
    if (scene) disposeObject3D(scene);
    if (renderer) {
      renderer.renderLists?.dispose?.();
      renderer.dispose();
      renderer.domElement?.remove();
    }
    scene = camera = renderer = arenaGroup = localMesh = null;
    meshes.clear();
    projectileMeshes.clear();
    projectiles = [];
    removeTouchControls();
    document.body.classList.remove('battle-active');
  }

  function collides(x,z,r=.52) {
    if (x-r < -23.2 || x+r > 23.2 || z-r < -23.2 || z+r > 23.2) return true;
    return obstacles.some(o =>
      x+r > o.x-o.w/2 && x-r < o.x+o.w/2 &&
      z+r > o.z-o.d/2 && z-r < o.z+o.d/2
    );
  }

  function applyMovement(dt) {
    const me = state.get(clientId);
    if (!me || !me.alive || !localMesh) return;

    let x = 0, z = 0;
    if (keys.KeyW || keys.ArrowUp) z -= 1;
    if (keys.KeyS || keys.ArrowDown) z += 1;
    if (keys.KeyA || keys.ArrowLeft) x -= 1;
    if (keys.KeyD || keys.ArrowRight) x += 1;
    x += touchMove.x;
    z += touchMove.z;

    const len = Math.hypot(x,z);
    if (len > .05) {
      x /= Math.max(1,len);
      z /= Math.max(1,len);
      localFacing = {x,z};
      const nx = localMesh.position.x + x * MOVE_SPEED * dt;
      const nz = localMesh.position.z + z * MOVE_SPEED * dt;
      if (!collides(nx,localMesh.position.z)) localMesh.position.x = nx;
      if (!collides(localMesh.position.x,nz)) localMesh.position.z = nz;
      localMesh.rotation.y = Math.atan2(-x,-z);
      me.x = localMesh.position.x; me.z = localMesh.position.z; me.angle = localMesh.rotation.y;
    }
  }

  function applyGuestPose(msg) {
    const p = state.get(msg.id);
    if (!p || p.id === clientId || !p.alive) return;
    const now = Date.now();
    const elapsed = Math.max(.03,Math.min(.5,(now-(p.lastPoseAt||now))/1000));
    const maxDist = MOVE_SPEED * elapsed * 1.8 + .7;
    const dx = Number(msg.x)-p.x, dz = Number(msg.z)-p.z;
    const dist = Math.hypot(dx,dz);
    if (!Number.isFinite(dist) || dist > maxDist || collides(Number(msg.x),Number(msg.z))) return;
    p.x = Number(msg.x); p.z = Number(msg.z); p.angle = Number(msg.angle)||0;
    p.lastPoseAt = now; p.connected = true;
  }

  function updateRespawns() {
    if (!isHost) return;
    const now = Date.now();
    for (const p of state.values()) {
      if (!p.alive && p.respawnAt && now >= p.respawnAt) {
        const spawn = spawnPoints[p.slot % spawnPoints.length];
        p.x=spawn[0]; p.z=spawn[1]; p.angle=0;
        p.health=MAX_HEALTH; p.alive=true; p.respawnAt=0;
      }
    }
  }

  function authoritativeShoot(id,dir) {
    const p = state.get(id);
    if (!p || !p.alive) return;
    const now = Date.now();
    if (now-(p.lastShotAt||0) < SHOT_COOLDOWN_MS) return;
    p.lastShotAt = now;
    let dx = Number(dir?.x), dz = Number(dir?.z);
    const len = Math.hypot(dx,dz);
    if (!Number.isFinite(len) || len < .5) return;
    dx/=len; dz/=len;
    const shot = {
      id: makeId(), owner:id,
      x:p.x+dx*.8,z:p.z+dz*.8,
      dx,dz,speed:24,createdAt:now
    };
    projectiles.push(shot);
  }

  function localShoot() {
    if (!active) return;
    const me = state.get(clientId);
    if (!me?.alive) return;
    const now = Date.now();
    if (now-lastLocalShot < SHOT_COOLDOWN_MS) return;
    lastLocalShot = now;
    const dir = {...localFacing};
    if (isHost) authoritativeShoot(clientId,dir);
    else sendUplink('shoot',{dir});
  }

  function updateProjectiles(dt) {
    if (!isHost) return;
    for (let i=projectiles.length-1;i>=0;i--) {
      const shot = projectiles[i];
      shot.x += shot.dx*shot.speed*dt;
      shot.z += shot.dz*shot.speed*dt;

      if (Date.now()-shot.createdAt > 2200 || collides(shot.x,shot.z,.12)) {
        projectiles.splice(i,1);
        continue;
      }

      let victim = null;
      for (const p of state.values()) {
        if (p.id===shot.owner || !p.alive || p.connected === false) continue;
        if (Math.hypot(p.x-shot.x,p.z-shot.z) < .75) { victim=p; break; }
      }
      if (!victim) continue;

      victim.health = Math.max(0,victim.health-SHOT_DAMAGE);
      if (victim.health<=0) {
        victim.alive=false;
        victim.deaths++;
        victim.respawnAt=Date.now()+2500;
        const killer=state.get(shot.owner);
        if (killer) {
          killer.kills++;
          if (killer.kills>=KILL_LIMIT) {
            finishHostBattle(killer);
          }
        }
      }
      projectiles.splice(i,1);
    }
  }

  function updateProjectileMeshes(list) {
    const ids = new Set(list.map(s=>s.id));
    for (const [id,mesh] of projectileMeshes) {
      if (!ids.has(id)) { scene.remove(mesh); projectileMeshes.delete(id); }
    }
    for (const shot of list) {
      let mesh = projectileMeshes.get(shot.id);
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.SphereGeometry(.13,8,6),
          new THREE.MeshBasicMaterial({color:0xffe066})
        );
        mesh.position.y=1.05;
        scene.add(mesh);
        projectileMeshes.set(shot.id,mesh);
      }
      mesh.position.x=shot.x; mesh.position.z=shot.z;
    }
  }

  function sendSnapshot() {
    const players = [...state.values()].map(p => ({
      id:p.id,name:p.name,slot:p.slot,x:p.x,z:p.z,angle:p.angle,
      health:p.health,kills:p.kills,deaths:p.deaths,alive:p.alive,
      respawnAt:p.respawnAt,connected:p.connected
    }));
    send('battle_state',{
      players,
      projectiles:projectiles.map(s=>({...s})),
      timeLeft,
      startedAt
    });
  }

  function applySnapshot(msg) {
    timeLeft = Number(msg.timeLeft) || 0;
    startedAt = msg.startedAt || startedAt;
    const incoming = msg.players || [];
    for (const raw of incoming) {
      let p = state.get(raw.id);
      if (!p) {
        p={...raw}; state.set(raw.id,p); createPlayerMesh(p);
      } else Object.assign(p,raw);

      const mesh=meshes.get(raw.id);
      if (!mesh) continue;
      if (raw.id===clientId) {
        if (!raw.alive || Math.hypot(mesh.position.x-raw.x,mesh.position.z-raw.z)>2.2) {
          mesh.position.set(raw.x,0,raw.z);
        }
      } else {
        mesh.position.x += (raw.x-mesh.position.x)*.32;
        mesh.position.z += (raw.z-mesh.position.z)*.32;
        mesh.rotation.y = raw.angle || 0;
      }
      mesh.visible = !!raw.alive && raw.connected !== false;
    }
    updateProjectileMeshes(msg.projectiles || []);
    updateBattleHud();
  }

  function finishHostBattle(forcedWinner = null) {
    if (!isHost || !active) return;
    const ranking=[...state.values()].sort((a,b)=>b.kills-a.kills || a.deaths-b.deaths || a.name.localeCompare(b.name));
    const win=forcedWinner || ranking[0] || null;
    active=false;
    saveBattleSession({ active:false });
    send('battle_end',{winner:win,players:ranking});
    endBattle(win,ranking);
  }

  function endBattle(win,ranking) {
    active=false;
    reconnectingActive=false;
    clearHostGrace();
    saveBattleSession({ active:false });
    winner=win;
    if (frameId) cancelAnimationFrame(frameId);
    frameId=null;
    document.body.classList.remove('battle-active');
    root.querySelector('.battle-menu').style.display='none';
    gameEl.style.display='none';
    resultEl.style.display='flex';

    resultEl.querySelector('.battle-result-title').textContent =
      win ? '🏆 ' + win.name + ' gana la batalla' : 'Batalla finalizada';
    const list=resultEl.querySelector('.battle-result-ranking');
    list.replaceChildren();
    (ranking||[]).forEach((p,index)=>{
      const row=document.createElement('div');
      row.className='battle-result-row';
      row.innerHTML='<span>#'+(index+1)+'</span><strong></strong><span>'+p.kills+' bajas</span><span>'+p.deaths+' muertes</span>';
      row.querySelector('strong').textContent=p.name;
      list.appendChild(row);
    });
  }

  function updateHostAuthority(dt) {
    updateRespawns();
    updateProjectiles(dt);
    timeLeft=Math.max(0,MATCH_SECONDS-Math.floor((Date.now()-startedAt)/1000));
    if (timeLeft<=0) {
      finishHostBattle();
      return;
    }
    stateTimer+=dt;
    if (stateTimer>=STATE_INTERVAL) {
      stateTimer=0;
      sendSnapshot();
    }
  }

  function updateMeshes() {
    if (isHost) {
      for (const p of state.values()) {
        const mesh=meshes.get(p.id);
        if (!mesh) continue;
        if (p.id!==clientId) {
          mesh.position.x += (p.x-mesh.position.x)*.36;
          mesh.position.z += (p.z-mesh.position.z)*.36;
          mesh.rotation.y=p.angle||0;
        }
        mesh.visible=!!p.alive && p.connected !== false;
      }
      updateProjectileMeshes(projectiles);
    }

    const me=state.get(clientId);
    if (me && localMesh) {
      localMesh.visible=!!me.alive;
      if (!me.alive && me.respawnAt) {
        const seconds=Math.max(0,Math.ceil((me.respawnAt-Date.now())/1000));
        gameStatusEl.textContent='ELIMINADO · reapareces en '+seconds+'s';
      } else gameStatusEl.textContent='';
    }
  }

  function updateBattleHud() {
    const me=state.get(clientId);
    if (!me) return;
    localNameEl.textContent=me.name;
    hpEl.textContent=Math.max(0,Math.round(me.health))+'/'+MAX_HEALTH;
    killsEl.textContent=me.kills+'/'+KILL_LIMIT;
    timerEl.textContent=String(Math.floor(timeLeft/60)).padStart(2,'0')+':'+String(timeLeft%60).padStart(2,'0');

    const ranking=[...state.values()].sort((a,b)=>b.kills-a.kills || a.deaths-b.deaths);
    scoreboardEl.replaceChildren();
    ranking.forEach((p,index)=>{
      const row=document.createElement('div');
      row.className='battle-score-row'+(p.id===clientId?' self':'');
      const color='#'+palette[p.slot%palette.length].toString(16).padStart(6,'0');
      row.innerHTML='<span>'+(index+1)+'</span><span class="dot"></span><strong></strong><span>'+p.kills+'💥</span><span>'+p.deaths+'☠</span>';
      row.querySelector('.dot').style.background=color;
      row.querySelector('strong').textContent=p.name;
      scoreboardEl.appendChild(row);
    });
  }

  function sendPose(dt) {
    if (isHost || !active || !localMesh) return;
    poseTimer+=dt;
    if (poseTimer<POSE_INTERVAL) return;
    poseTimer=0;
    sendUplink('pose',{x:localMesh.position.x,z:localMesh.position.z,angle:localMesh.rotation.y});
  }

  function updateCamera() {
    if (!localMesh || !camera) return;
    const x=localMesh.position.x, z=localMesh.position.z;
    camera.position.lerp(new THREE.Vector3(x+11,13,z+15),.1);
    camera.lookAt(x,0.8,z);
  }

  function loop() {
    if (!scene || !renderer || !camera) return;
    frameId=requestAnimationFrame(loop);
    const dt=Math.min(.05,clock?.getDelta?.()||.016);
    if (!active) return;

    applyMovement(dt);
    if (shootHeld) localShoot();
    sendPose(dt);
    if (isHost) {
      const me=state.get(clientId);
      if (me && localMesh) {
        me.x=localMesh.position.x;me.z=localMesh.position.z;me.angle=localMesh.rotation.y;
      }
      updateHostAuthority(dt);
    }
    updateMeshes();
    updateBattleHud();
    updateCamera();
    renderer.render(scene,camera);
  }

  function setupTouchControls() {
    if (!(matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints>0)) return;
    const controls=document.createElement('div');
    controls.className='battle-touch-controls';
    controls.innerHTML='<div class="battle-stick"><div class="battle-stick-knob"></div></div><button class="battle-touch-fire">●</button>';
    gameEl.appendChild(controls);
    const stick=controls.querySelector('.battle-stick');
    const knob=controls.querySelector('.battle-stick-knob');
    const fire=controls.querySelector('.battle-touch-fire');

    const move=e=>{
      const r=stick.getBoundingClientRect();
      let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);
      const max=r.width*.32,dist=Math.hypot(dx,dy);
      if(dist>max){dx=dx/dist*max;dy=dy/dist*max;}
      knob.style.transform='translate('+dx+'px,'+dy+'px)';
      touchMove={x:dx/max,z:dy/max};
    };
    stick.onpointerdown=e=>{touchJoystickPointer=e.pointerId;stick.setPointerCapture?.(e.pointerId);move(e);e.preventDefault();};
    stick.onpointermove=e=>{if(e.pointerId===touchJoystickPointer){move(e);e.preventDefault();}};
    const end=e=>{if(e.pointerId!==touchJoystickPointer)return;touchJoystickPointer=null;touchMove={x:0,z:0};knob.style.transform='translate(0,0)';};
    stick.onpointerup=end;stick.onpointercancel=end;

    fire.onpointerdown=e=>{shootHeld=true;localShoot();clearInterval(touchFireTimer);touchFireTimer=setInterval(localShoot,120);e.preventDefault();};
    const stop=()=>{shootHeld=false;clearInterval(touchFireTimer);touchFireTimer=null;};
    fire.onpointerup=stop;fire.onpointercancel=stop;fire.onpointerleave=stop;
  }

  function removeTouchControls() {
    clearInterval(touchFireTimer);
    touchFireTimer=null;
    touchMove={x:0,z:0};
    gameEl?.querySelector('.battle-touch-controls')?.remove();
  }

  function buildUi() {
    root=document.createElement('div');
    root.id='battle-root';
    root.innerHTML=`
      <section class="battle-menu">
        <div class="battle-card battle-entry-card">
          <button class="battle-close" type="button" aria-label="Cerrar">×</button>
          <div class="battle-eyebrow">NUEVO MODO</div>
          <h2>⚔️ Modo Batalla</h2>
          <p>Combate todos contra todos para 2 a 8 exploradores.</p>
          <input id="battle-name" maxlength="18" autocomplete="nickname" placeholder="Tu nombre">
          <div class="battle-entry-actions">
            <button id="battle-create" class="battle-primary">Crear sala</button>
            <input id="battle-code-input" inputmode="numeric" maxlength="6" placeholder="Código">
            <button id="battle-join" class="battle-secondary">Unirse</button>
          </div>
          <div class="battle-rules">5 minutos · 100 HP · respawn · gana quien llegue a 10 bajas o lidere al terminar el tiempo.</div>
        </div>

        <div class="battle-card battle-lobby" style="display:none">
          <button class="battle-close battle-lobby-close" type="button" aria-label="Salir">×</button>
          <div class="battle-eyebrow">SALA DE BATALLA</div>
          <h2>Código <span id="battle-room-code">------</span></h2>
          <div id="battle-player-list" class="battle-player-list"></div>
          <div id="battle-status" class="battle-status"></div>
          <div class="battle-lobby-actions">
            <button id="battle-ready" class="battle-secondary">Estoy listo</button>
            <button id="battle-copy" class="battle-secondary">Copiar invitación</button>
            <button id="battle-start" class="battle-primary" disabled>Iniciar batalla</button>
          </div>
        </div>
      </section>

      <section class="battle-game" style="display:none">
        <div class="battle-canvas"></div>
        <div class="battle-hud">
          <div><span id="battle-local-name">Explorador</span> · HP <strong id="battle-hp">100/100</strong></div>
          <div>Bajas <strong id="battle-kills">0/10</strong></div>
          <div>Tiempo <strong id="battle-timer">05:00</strong></div>
        </div>
        <div id="battle-game-status" class="battle-game-status"></div>
        <div class="battle-scoreboard-wrap">
          <div class="battle-score-title">CLASIFICACIÓN</div>
          <div id="battle-scoreboard"></div>
        </div>
        <div class="battle-help">WASD/Flechas · Espacio para disparar</div>
        <button id="battle-exit-game" class="battle-exit-game">Salir</button>
      </section>

      <section class="battle-result" style="display:none">
        <div class="battle-result-card">
          <div class="battle-eyebrow">RESULTADO</div>
          <h2 class="battle-result-title">Batalla finalizada</h2>
          <div class="battle-result-ranking"></div>
          <button class="battle-primary battle-result-close">Volver al menú</button>
        </div>
      </section>`;
    document.body.appendChild(root);

    lobbyEl=root.querySelector('.battle-lobby');
    gameEl=root.querySelector('.battle-game');
    resultEl=root.querySelector('.battle-result');
    playersEl=root.querySelector('#battle-player-list');
    statusEl=root.querySelector('#battle-status');
    codeEl=root.querySelector('#battle-room-code');
    readyBtn=root.querySelector('#battle-ready');
    startBtn=root.querySelector('#battle-start');
    gameStatusEl=root.querySelector('#battle-game-status');
    hpEl=root.querySelector('#battle-hp');
    killsEl=root.querySelector('#battle-kills');
    timerEl=root.querySelector('#battle-timer');
    scoreboardEl=root.querySelector('#battle-scoreboard');
    localNameEl=root.querySelector('#battle-local-name');

    const nameInput=root.querySelector('#battle-name');
    const mainName=document.getElementById('player-name')?.value || localStorage.getItem('explorador-player-name') || localStorage.getItem(STORAGE_KEY) || '';
    nameInput.value=cleanName(mainName);

    root.querySelector('#battle-create').onclick=async()=>{
      try{
        name=cleanName(nameInput.value);
        if(name.length<2) throw new Error('Escribe un nombre de al menos 2 caracteres.');
        localStorage.setItem(STORAGE_KEY,name);
        await createRoom();
      }catch(e){setStatus(e.message,true);}
    };
    root.querySelector('#battle-join').onclick=async()=>{
      try{
        name=cleanName(nameInput.value);
        if(name.length<2) throw new Error('Escribe un nombre de al menos 2 caracteres.');
        localStorage.setItem(STORAGE_KEY,name);
        await joinRoom(root.querySelector('#battle-code-input').value);
      }catch(e){setStatus(e.message,true);}
    };
    readyBtn.onclick=async()=>{ready=!ready;await trackSelf();saveBattleSession();updateLobby();};
    startBtn.onclick=startBattleAsHost;
    root.querySelector('#battle-copy').onclick=async()=>{
      const url=new URL(location.href);
      url.searchParams.set('batalla',roomCode);
      try{await navigator.clipboard.writeText(url.toString());setStatus('Invitación copiada.');}
      catch{setStatus('Código de sala: '+roomCode);}
    };

    root.querySelector('.battle-close').onclick=()=>disconnect({closeUi:true});
    root.querySelector('.battle-lobby-close').onclick=()=>disconnect({closeUi:true});
    root.querySelector('#battle-exit-game').onclick=()=>disconnect({closeUi:true});
    root.querySelector('.battle-result-close').onclick=()=>disconnect({closeUi:true});

    window.addEventListener('keydown',e=>{
      if(!root.classList.contains('open')||!active)return;
      keys[e.code]=true;
      if(e.code==='Space'){localShoot();e.preventDefault();}
    });
    window.addEventListener('keyup',e=>{
      if(!root.classList.contains('open'))return;
      keys[e.code]=false;
    });
    window.addEventListener('blur',()=>{keys={};shootHeld=false;});
    window.addEventListener('resize',()=>{
      if(!renderer||!camera)return;
      camera.aspect=innerWidth/innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth,innerHeight);
    });
  }

  function showRoot() {
    if (!root) buildUi();
    root.classList.add('open');
    root.querySelector('.battle-menu').style.display='flex';
    root.querySelector('.battle-entry-card').style.display='block';
    lobbyEl.style.display='none';
    lobbyEl.style.display='none';
    gameEl.style.display='none';
    resultEl.style.display='none';
    setStatus('');
    const input=root.querySelector('#battle-name');
    const mainName=document.getElementById('player-name')?.value || localStorage.getItem('explorador-player-name') || localStorage.getItem(STORAGE_KEY) || '';
    input.value=cleanName(mainName);
  }

  function hideRoot() {
    root?.classList.remove('open');
    document.body.classList.remove('battle-active');
  }

  function init() {
    buildUi();
    const btn=document.createElement('button');
    btn.type='button';
    btn.id='btn-battle-mode';
    btn.className='btn battle-menu-button';
    btn.textContent='⚔️ Modo Batalla';
    const anchor=document.getElementById('btn-start');
    anchor?.insertAdjacentElement('afterend',btn);
    btn.onclick=showRoot;

    const invite=new URLSearchParams(location.search).get('batalla');
    if(isBattleRoomCode(invite||'')){
      const saved=loadBattleSession(invite);
      showRoot();
      root.querySelector('#battle-code-input').value=invite;
      if(saved?.role==='guest' && saved.active){
        root.querySelector('#battle-name').value=cleanName(saved.name || root.querySelector('#battle-name').value);
        setStatus('Sesión de batalla detectada · presiona Unirse para reconectar.');
      }else{
        setStatus('Invitación de batalla detectada · escribe tu nombre y presiona Unirse.');
      }
    }
  }

  return { init, open:showRoot };
})();

window.ExploradorBattleMode=BattleMode;
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>BattleMode.init());
else BattleMode.init();
