import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const {
  BATTLE_PROTOCOL_VERSION,
  cleanBattleName,
  createEnvelope,
  createSigningIdentity,
  isBattleRoomCode,
  verifyEnvelope
} = await import('../src/battle/protocol.mjs');

test('battle protocol signs and verifies a valid message', async () => {
  const identity = await createSigningIdentity();
  const envelope = await createEnvelope(identity, 'player-a', 'shoot', { dir: { x: 1, z: 0 } });
  assert.equal(envelope.v, BATTLE_PROTOCOL_VERSION);
  assert.equal(await verifyEnvelope(envelope, identity.publicJwk, { expectedSenderId: 'player-a' }), true);
});

test('battle protocol rejects tampering and sender spoofing', async () => {
  const identity = await createSigningIdentity();
  const envelope = await createEnvelope(identity, 'player-a', 'pose', { x: 2, z: 3, angle: 0 });
  assert.equal(await verifyEnvelope({ ...envelope, payload: { ...envelope.payload, x: 200 } }, identity.publicJwk), false);
  assert.equal(await verifyEnvelope(envelope, identity.publicJwk, { expectedSenderId: 'player-b' }), false);
});

test('battle protocol rejects incompatible versions', async () => {
  const identity = await createSigningIdentity();
  const envelope = await createEnvelope(identity, 'host', 'battle_start', { players: [] });
  assert.equal(await verifyEnvelope({ ...envelope, v: 999 }, identity.publicJwk), false);
});

test('battle room and name validation', () => {
  assert.equal(isBattleRoomCode('123456'), true);
  assert.equal(isBattleRoomCode('12345'), false);
  assert.equal(cleanBattleName('  Ana   María  '), 'Ana María');
  assert.equal(cleanBattleName('x'.repeat(30)).length, 18);
});
