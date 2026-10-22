import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSuggestion,
  suggestionLookup,
  suggestionRace,
} from '../src/lib/autocomplete-models';
test('prefix lookup shares normalization, keeps display text and exposes underfilling after filtering', () => {
  assert.equal(normalizeSuggestion('  CÀ  ', false), 'cà');
  assert.equal(normalizeSuggestion('ca\u0300', false), 'cà');
  assert.equal(normalizeSuggestion('ĐẶC', true), 'dac');
  assert.equal(suggestionLookup('ca', 3, false, 'cached').results.length, 2);
  assert.equal(suggestionLookup('ca', 3, false, 'overfetch').results.length, 3);
  assert.equal(suggestionLookup('ca', 3, false, 'build-filter').results.length, 3);
  assert.ok(
    suggestionLookup('ca', 3, true, 'overfetch').matched >
      suggestionLookup('ca', 3, false, 'overfetch').matched,
  );
  assert.equal(suggestionLookup('ca\u0300', 3, false, 'cached').results[0].text, 'cà phê');
  assert.equal(suggestionLookup('xyz', 3, false, 'cached').results.length, 0);
  for (const mode of ['cached', 'overfetch', 'build-filter'] as const)
    for (const k of [1, 2, 3, 4, 5]) {
      const r = suggestionLookup('c', k, true, mode);
      assert.ok(r.results.length <= k);
      assert.ok(r.results.every((s) => !s.blocked));
      assert.ok(r.results.every((s, i) => !i || r.results[i - 1].score >= s.score));
    }
  assert.throws(() => suggestionLookup('ca', 0, false, 'cached'));
});
test('a delayed old response overwrites unguarded results while generation guards preserve current input identity', () => {
  assert.equal(suggestionRace(190, false).displayed, 'cat');
  assert.equal(suggestionRace(300, false).displayed, 'c');
  assert.equal(suggestionRace(300, false).stale, true);
  assert.equal(suggestionRace(300, true).displayed, 'cat');
  assert.equal(suggestionRace(130, true).displayed, '—');
  for (let time = 0; time <= 350; time++) assert.equal(suggestionRace(time, true).stale, false);
  assert.throws(() => suggestionRace(NaN, true));
});
