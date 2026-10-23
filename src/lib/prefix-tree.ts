import { suggestionLookup } from './autocomplete-models';

export function prefixTree(fold: boolean, mode: 'cached' | 'overfetch' | 'build-filter') {
  const nodes: { prefix: string; parent: string | null; matches: number; x: number; y: number }[] =
    [];
  let leaf = 0;
  function visit(prefix: string, parent: string | null, depth: number) {
    const lookup = suggestionLookup(prefix, 1, fold, mode);
    const node = { prefix, parent, matches: lookup.matched, x: 95 + depth * 285, y: 0 };
    nodes.push(node);
    const children = depth < 2 ? [...lookup.path.at(-1)!.next].sort() : [];
    if (!children.length) node.y = 48 + leaf++ * 76;
    else {
      const descendants = children.map((ch) => visit(prefix + ch, prefix, depth + 1));
      node.y = (descendants[0].y + descendants.at(-1)!.y) / 2;
    }
    return node;
  }
  visit('', null, 0);
  return { nodes, width: 760, height: Math.max(160, leaf * 76 + 20), leafCount: leaf };
}
