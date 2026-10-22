import test from 'node:test';
import assert from 'node:assert/strict';
import { abrReplay, transcodeState, videoBandwidth, videoProfiles } from '../src/lib/video-models';
test('ABR replay separates startup from rebuffering and conserves buffered media across network scenarios', () => {
  for (const profile of Object.keys(videoProfiles) as (keyof typeof videoProfiles)[])
    for (const rule of ['greedy', 'buffer'] as const)
      for (const b of [2, 6, 12])
        for (const d of [2, 4, 6]) {
          const run = abrReplay(b, d, profile, rule);
          assert.equal(run.rows.length, 12);
          assert.ok(run.startup > 0);
          assert.equal(run.rows[0].stall, 0);
          assert.ok(run.rows.every((r) => r.buffer >= 0 && r.stall >= 0 && r.download > 0));
          assert.ok(
            Math.abs(
              run.mediaSeconds - (run.totalDownload - run.startup - run.stalls) - run.buffer,
            ) < 1e-8,
          );
        }
  const greedy = abrReplay(6, 4, 'drop', 'greedy'),
    buffer = abrReplay(6, 4, 'drop', 'buffer');
  assert.ok(greedy.stalls > 0);
  assert.ok(buffer.stalls < greedy.stalls);
  assert.throws(() => abrReplay(0, 4, 'steady', 'buffer'));
});
test('publication gates and minimum ladders never expose unfinished renditions, and byte hits do not erase viewer traffic', () => {
  for (let time = 0; time <= 20; time++)
    for (const failure of [false, true])
      for (const progressive of [false, true]) {
        const blocked = transcodeState(time, failure, progressive, false);
        assert.equal(blocked.published.length, 0);
        assert.notEqual(blocked.state, 'READY');
        const allowed = transcodeState(time, failure, progressive, true);
        assert.ok(allowed.published.every((r) => allowed.renditions.includes(r)));
        if (allowed.state === 'READY')
          assert.ok(allowed.published.includes('low') && allowed.published.includes('mid'));
      }
  assert.equal(transcodeState(8, true, false, true).state, 'PROCESSING');
  assert.deepEqual(transcodeState(8, true, true, true).published, ['low', 'mid']);
  assert.equal(transcodeState(20, true, true, true).manifestVersion, 2);
  const delivery = videoBandwidth(1e6, 3, 0.95);
  assert.equal(delivery.viewerGbps, 3000);
  assert.ok(Math.abs(delivery.originGbps - 150) < 1e-8);
  assert.equal(delivery.hourlyTB, 1350);
  assert.equal(videoBandwidth(1e6, 3, 1).viewerGbps, 3000);
  assert.equal(videoBandwidth(1e6, 3, 1).originGbps, 0);
  assert.throws(() => videoBandwidth(1, 3, 2));
});
