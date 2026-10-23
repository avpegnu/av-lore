import test from 'node:test';
import assert from 'node:assert/strict';
import { prefixTree } from '../src/lib/prefix-tree';
import { suggestionLookup } from '../src/lib/autocomplete-models';

test('visible trie branches use the serving normalization and eligibility without treating code units as characters', () => {
  for (const mode of ['cached', 'overfetch', 'build-filter'] as const)
    for (const fold of [false, true]) {
      const graph = prefixTree(fold, mode);
      for (const node of graph.nodes) {
        assert.equal(node.matches, suggestionLookup(node.prefix, 1, fold, mode).matched);
        if (node.parent !== null) {
          assert.ok(graph.nodes.some((p) => p.prefix === node.parent));
          assert.equal([...node.prefix].length, [...node.parent].length + 1);
        }
      }
      assert.equal(
        graph.nodes.some((n) => n.prefix === 'cà'),
        !fold,
      );
      assert.equal(
        graph.nodes.some((n) => n.prefix === 'cá'),
        !fold,
      );
    }
  const matches = (fold: boolean, mode: 'cached' | 'build-filter') =>
    prefixTree(fold, mode).nodes.find((n) => n.prefix === 'ca')!.matches;
  assert.equal(matches(false, 'cached'), 7);
  assert.equal(matches(false, 'build-filter'), 6);
  assert.equal(matches(true, 'cached'), 9);
});
