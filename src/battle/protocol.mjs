export const BATTLE_PROTOCOL_VERSION = 2;
export const HOST_CONTROL_TYPES = new Set([
  'battle_start',
  'battle_state',
  'battle_end',
  'battle_reject',
  'battle_abort'
]);

const encoder = new TextEncoder();

function cryptoApi() {
  const api = globalThis.crypto;
  if (!api?.subtle) throw new Error('Web Crypto no está disponible.');
  return api;
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys
    .filter(key => value[key] !== undefined)
    .map(key => JSON.stringify(key) + ':' + stableStringify(value[key]))
    .join(',') + '}';
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
  const raw = String(value || '');
  const padded = raw.replace(/-/g, '+').replace(/_/g, '/')
    .padEnd(Math.ceil(raw.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, ch => ch.charCodeAt(0));
}

function randomHex(length = 12) {
  const bytes = new Uint8Array(length);
  cryptoApi().getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function signable(envelope) {
  return stableStringify({
    v: envelope.v,
    type: envelope.type,
    senderId: envelope.senderId,
    nonce: envelope.nonce,
    ts: envelope.ts,
    payload: envelope.payload ?? {}
  });
}

export function cleanBattleName(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 18);
}

export function isBattleRoomCode(value) {
  return /^\d{6}$/.test(String(value || ''));
}

export function identityIdFromPublicJwk(publicJwk) {
  if (!publicJwk?.x || !publicJwk?.y) return '';
  return String(publicJwk.x).slice(0, 16) + String(publicJwk.y).slice(0, 16);
}

export function isCompatiblePresence(value) {
  return !!value &&
    value.protocol === BATTLE_PROTOCOL_VERSION &&
    typeof value.id === 'string' &&
    !!value.publicKey &&
    value.id === identityIdFromPublicJwk(value.publicKey);
}

export async function createSigningIdentity(saved = null) {
  const api = cryptoApi();
  if (saved?.privateJwk && saved?.publicJwk) {
    const [privateKey, publicKey] = await Promise.all([
      api.subtle.importKey('jwk', saved.privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']),
      api.subtle.importKey('jwk', saved.publicJwk, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify'])
    ]);
    return { privateKey, publicKey, privateJwk: saved.privateJwk, publicJwk: saved.publicJwk };
  }
  const pair = await api.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const [privateJwk, publicJwk] = await Promise.all([
    api.subtle.exportKey('jwk', pair.privateKey),
    api.subtle.exportKey('jwk', pair.publicKey)
  ]);
  return { ...pair, privateJwk, publicJwk };
}

export async function createEnvelope(identity, senderId, type, payload = {}) {
  if (!identity?.privateKey) throw new Error('Identidad de firma no inicializada.');
  const envelope = {
    v: BATTLE_PROTOCOL_VERSION,
    type: String(type || ''),
    senderId: String(senderId || ''),
    nonce: randomHex(),
    ts: Date.now(),
    payload
  };
  const signature = await cryptoApi().subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    identity.privateKey,
    encoder.encode(signable(envelope))
  );
  return { ...envelope, signature: bytesToBase64Url(new Uint8Array(signature)) };
}

export async function verifyEnvelope(envelope, publicJwk, {
  expectedSenderId = null,
  maxAgeMs = 45000
} = {}) {
  if (!envelope || envelope.v !== BATTLE_PROTOCOL_VERSION) return false;
  if (!envelope.type || !envelope.senderId || !envelope.nonce || !envelope.signature) return false;
  if (expectedSenderId && envelope.senderId !== expectedSenderId) return false;
  const age = Math.abs(Date.now() - Number(envelope.ts || 0));
  if (!Number.isFinite(age) || age > maxAgeMs) return false;
  try {
    const key = await cryptoApi().subtle.importKey(
      'jwk', publicJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false, ['verify']
    );
    return await cryptoApi().subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      base64UrlToBytes(envelope.signature),
      encoder.encode(signable(envelope))
    );
  } catch {
    return false;
  }
}
