export type MerklePair = {
  start: number;
  end: number;
  left: string;
  right: string;
  equal: boolean;
  depth: number;
};
export function merkleComparison(changed: number[]) {
  if (changed.some((n) => !Number.isInteger(n) || n < 0 || n > 7))
    throw new RangeError('Eight bounded leaves only');
  const selected = new Set(changed),
    identities = new Map<string, string>();
  const label = (s: string) => {
    if (!identities.has(s)) identities.set(s, 'H' + (identities.size + 1));
    return identities.get(s)!;
  };
  const levels: MerklePair[][] = [[], [], [], []];
  function build(
    start: number,
    end: number,
    depth: number,
  ): { a: string; b: string; pair: MerklePair; children: ReturnType<typeof build>[] } {
    const children =
      end - start === 1
        ? []
        : [build(start, (start + end) / 2, depth + 1), build((start + end) / 2, end, depth + 1)];
    // Canonical structural identity, deliberately not a cryptographic implementation.
    const a = children.length
      ? JSON.stringify(children.map((c) => c.a))
      : JSON.stringify(['K' + start, 'value-' + start]);
    const b = children.length
      ? JSON.stringify(children.map((c) => c.b))
      : JSON.stringify(['K' + start, selected.has(start) ? 'changed-' + start : 'value-' + start]);
    const pair = { start, end, left: label(a), right: label(b), equal: a === b, depth };
    levels[depth].push(pair);
    return { a, b, pair, children };
  }
  const root = build(0, 8, 0),
    comparisons: MerklePair[] = [],
    different: number[] = [];
  function compare(n: ReturnType<typeof build>) {
    comparisons.push(n.pair);
    if (n.pair.equal) return;
    if (n.children.length) n.children.forEach(compare);
    else different.push(n.pair.start);
  }
  compare(root);
  return { levels, comparisons, different, equal: root.pair.equal };
}
