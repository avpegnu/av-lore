import test from 'node:test';
import assert from 'node:assert/strict';
import { selectRecallMaps, type RecallMap } from '../src/lib/recall-map-models';
const maps: RecallMap[] = [
  {
    id: 'a',
    group: 'foundation',
    title: 'Độ trễ và queue',
    caption: 'Trace a request',
    steps: [
      { title: 'Client', detail: 'network wait', icon: 'route' },
      { title: 'Server', detail: 'service time', icon: 'gauge' },
    ],
    takeaways: ['Use matching boundaries'],
    href: '/a/',
  },
  {
    id: 'b',
    group: 'notes',
    title: 'Caching',
    caption: 'Trace a request',
    steps: [
      { title: 'Read', detail: 'cache hit', icon: 'route' },
      { title: 'Fill', detail: 'network wait', icon: 'inspect' },
    ],
    takeaways: ['Bound staleness'],
    href: '/b/',
  },
];
test('visual recall filtering searches complete map text with accent-insensitive AND words and independent category counts', () => {
  assert.equal(selectRecallMaps(maps, 'DO TRE').maps[0].id, 'a');
  assert.equal(selectRecallMaps(maps, 'network wait', 'notes').maps[0].id, 'b');
  assert.deepEqual(selectRecallMaps(maps, 'network wait', 'notes').counts, {
    foundation: 1,
    notes: 1,
  });
  assert.equal(selectRecallMaps(maps, 'staleness queue').maps.length, 0);
  assert.equal(selectRecallMaps(maps, '[.*').maps.length, 0);
  assert.equal(selectRecallMaps(maps, '', 'missing').maps.length, 0);
  assert.equal(selectRecallMaps(maps, '').maps.length, 2);
});
