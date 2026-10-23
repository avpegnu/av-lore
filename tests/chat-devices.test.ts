import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialChatDevices,
  chatDeviceReducer as reduce,
  chatMessageStatus,
  chatReadMarker,
} from '../src/lib/chat-devices';

test('a read-anywhere marker never substitutes for another device cursor; reconnect alone does not synchronize', () => {
  let s = initialChatDevices();
  s = reduce(s, { type: 'commit', count: 1 });
  assert.equal(chatMessageStatus(s, 3), 'accepted');
  s = reduce(s, { type: 'deliver', device: 'phone', seq: 3 });
  assert.equal(chatMessageStatus(s, 3), 'delivered');
  s = reduce(s, { type: 'read', device: 'phone' });
  assert.equal(chatMessageStatus(s, 3), 'read');
  assert.equal(chatReadMarker(s), 3);
  assert.equal(s.devices.desktop.cursor, 1);
  assert.equal(s.devices.desktop.read, 1);
  s = reduce(s, { type: 'toggle', device: 'desktop' });
  assert.equal(s.devices.desktop.cursor, 1);
  s = reduce(s, { type: 'sync', device: 'desktop' });
  assert.equal(s.devices.desktop.cursor, 3);
  assert.equal(s.devices.desktop.delivered, 3);
  assert.equal(s.devices.desktop.read, 1);
  assert.equal(chatReadMarker(s), 3);
});

test('out-of-order and duplicate device frames cannot skip a gap or advance read markers; offline actions cannot invent delivery', () => {
  let s = reduce(initialChatDevices(), { type: 'commit', count: 2 });
  s = reduce(s, { type: 'deliver', device: 'phone', seq: 4 });
  assert.equal(s.devices.phone.cursor, 2);
  assert.deepEqual(s.devices.phone.buffer, [4]);
  assert.equal(chatMessageStatus(s, 4), 'accepted');
  assert.strictEqual(reduce(s, { type: 'deliver', device: 'phone', seq: 4 }), s);
  s = reduce(s, { type: 'read', device: 'phone' });
  assert.equal(chatReadMarker(s), 2);
  s = reduce(s, { type: 'deliver', device: 'phone', seq: 3 });
  assert.equal(s.devices.phone.cursor, 4);
  assert.deepEqual(s.devices.phone.buffer, []);
  assert.equal(chatMessageStatus(s, 4), 'delivered');
  for (const action of [
    { type: 'deliver', device: 'desktop', seq: 4 },
    { type: 'sync', device: 'desktop' },
    { type: 'read', device: 'desktop' },
  ] as const)
    assert.strictEqual(reduce(s, action), s);
  for (const seq of [-1, 0, 1.5, 5, NaN])
    assert.throws(() => reduce(s, { type: 'deliver', device: 'phone', seq }), RangeError);
  for (let i = 0; i < 30; i++) s = reduce(s, { type: 'commit', count: 1 });
  assert.equal(s.committed, 20);
  assert.deepEqual(reduce(s, { type: 'reset' }), initialChatDevices());
});
