import test from 'node:test';
import assert from 'node:assert/strict';
import {
  studioNode,
  starterStudio,
  parseStudioDesign,
  reviewStudio,
  connectStudio,
  removeStudioNode,
  studioMarkdown,
  type StudioDesign,
} from '../src/lib/design-studio-models';
function fixture(): StudioDesign {
  return {
    version: 1,
    nodes: [
      studioNode('client', 'client', 0),
      studioNode('cache', 'cache', 1),
      studioNode('sql', 'sql', 2),
    ],
    edges: [
      { from: 'client', to: 'cache', reads: 1, writes: 0 },
      { from: 'cache', to: 'sql', reads: 1, writes: 0 },
      { from: 'client', to: 'sql', reads: 0, writes: 1 },
    ],
    notes: '',
  };
}
test('explicit operation multipliers conserve declared cache misses and independent write paths', () => {
  const r = reviewStudio(fixture(), 1000, 200);
  assert.equal(r.rows[1].reads, 1000);
  assert.ok(Math.abs(r.rows[2].reads - 200) < 1e-8);
  assert.equal(r.rows[2].writes, 200);
  assert.deepEqual(
    r.findings.map((f) => f.code),
    ['LOW_ASSUMED_HEADROOM'],
  );
  assert.equal(r.latency, 'NOT_MODELED');
  const d = fixture();
  d.edges[1].reads = 2;
  assert.ok(Math.abs(reviewStudio(d, 1000, 200).rows[2].reads - 400) < 1e-8);
});
test('cycles stop numerical inference, orphan stores do not establish durable writes, and zero capacity is explicit', () => {
  const d = fixture();
  d.edges.push({ from: 'sql', to: 'cache', reads: 1, writes: 0 });
  assert.equal(reviewStudio(d, 1000, 200).state, 'STRUCTURE_ONLY_CYCLE');
  assert.ok(reviewStudio(d, 1000, 200).rows.every((r) => r.utilization === null));
  const x = starterStudio();
  x.nodes.push(studioNode('sql', 'orphan', 1));
  assert.ok(
    reviewStudio(x, 100, 100).findings.some((f) => f.code === 'NO_MODELED_DURABLE_WRITE_PATH'),
  );
  const z = fixture();
  z.nodes[2].writeCapacity = 0;
  assert.equal(reviewStudio(z, 100, 100).rows[2].utilization, Infinity);
});
test('SQL read replicas do not multiply modeled write-primary capacity; unit loss is a scenario, not HA proof', () => {
  const d = fixture();
  d.nodes[2].units = 3;
  const r = reviewStudio(d, 1000, 600);
  assert.equal(r.rows[2].readCapacity, 3000);
  assert.equal(r.rows[2].writeCapacity, 500);
  assert.equal(r.rows[2].utilization, 1.2);
  assert.equal(reviewStudio(d, 1000, 200, 1).rows[2].writeCapacity, 500);
  assert.equal(reviewStudio(d, 1000, 200, 3).rows[2].writeCapacity, 0);
});
test('bounded import rejects malformed or ambiguous identities and graph edits remove dangling edges', () => {
  assert.throws(() =>
    parseStudioDesign({
      version: 1,
      nodes: [],
      edges: [{ from: 'x', to: 'y', reads: 1, writes: 1 }],
      notes: '',
    }),
  );
  const d = fixture();
  assert.throws(() => parseStudioDesign({ ...d, nodes: [...d.nodes, d.nodes[0]] }));
  assert.throws(() => connectStudio(d, { from: 'sql', to: 'client', reads: 1, writes: 1 }));
  assert.equal(removeStudioNode(d, 'cache').edges.length, 1);
  assert.match(studioMarkdown(d, 100, 100), /correctness not proven/);
  assert.deepEqual(parseStudioDesign(JSON.parse(JSON.stringify(d))), d);
});

test('all example graphs stay inside parser/operation bounds, including 25-way feed fan-out', async () => {
  const { studioPrompts, studioExample } = await import('../src/lib/design-studio-prompts');
  for (const p of studioPrompts) {
    const d = studioExample(p.id);
    assert.doesNotThrow(() => parseStudioDesign(d));
    assert.equal(reviewStudio(d, p.reads, p.writes).state, 'ACYCLIC_OPERATION_FIXTURE');
  }
  const d = studioExample('feed'),
    r = reviewStudio(d, 8000, 400);
  assert.equal(r.rows.find((n) => n.id.startsWith('worker'))?.writes, 10000);
  assert.match(studioMarkdown(d, 8000, 400, 1), /lost units per tier=1/);
});
