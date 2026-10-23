/** Original bounded operation-flow model. Not a queueing, tail-latency or availability predictor. */
export const studioKinds = [
  'client',
  'gateway',
  'service',
  'cache',
  'sql',
  'kv',
  'blob',
  'queue',
  'worker',
  'search',
  'socket',
  'cdn',
] as const;
export type StudioKind = (typeof studioKinds)[number];
export type StudioNode = {
  id: string;
  kind: StudioKind;
  label: string;
  x: number;
  y: number;
  units: number;
  readCapacity: number;
  writeCapacity: number;
  hitRatio: number;
};
export type StudioEdge = { from: string; to: string; reads: number; writes: number };
export type StudioDesign = { version: 1; nodes: StudioNode[]; edges: StudioEdge[]; notes: string };
export const studioLimits = { nodes: 30, edges: 80, bytes: 100000 };
const finite = (v: unknown, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
export function parseStudioDesign(raw: unknown): StudioDesign {
  if (!raw || typeof raw !== 'object') throw new Error('INVALID_DESIGN');
  const d = raw as Record<string, unknown>;
  if (
    d.version !== 1 ||
    !Array.isArray(d.nodes) ||
    !Array.isArray(d.edges) ||
    d.nodes.length > studioLimits.nodes ||
    d.edges.length > studioLimits.edges
  )
    throw new Error('INVALID_SHAPE_OR_LIMIT');
  const ids = new Set<string>();
  const nodes = d.nodes.map((v: unknown) => {
    if (!v || typeof v !== 'object') throw new Error('INVALID_NODE');
    const n = v as StudioNode;
    if (
      typeof n.id !== 'string' ||
      !/^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/.test(n.id) ||
      ids.has(n.id) ||
      !studioKinds.includes(n.kind) ||
      typeof n.label !== 'string' ||
      n.label.length > 80 ||
      !finite(n.x, 0, 1100) ||
      !finite(n.y, 0, 700) ||
      !Number.isInteger(n.units) ||
      !finite(n.units, 1, 1000) ||
      !finite(n.readCapacity, 0, 1e9) ||
      !finite(n.writeCapacity, 0, 1e9) ||
      !finite(n.hitRatio, 0, 1)
    )
      throw new Error('INVALID_NODE_FIELDS');
    ids.add(n.id);
    return {
      id: n.id,
      kind: n.kind,
      label: n.label,
      x: n.x,
      y: n.y,
      units: n.units,
      readCapacity: n.readCapacity,
      writeCapacity: n.writeCapacity,
      hitRatio: n.hitRatio,
    };
  });
  const pairs = new Set<string>();
  const edges = d.edges.map((v: unknown) => {
    if (!v || typeof v !== 'object') throw new Error('INVALID_EDGE');
    const e = v as StudioEdge,
      key = e.from + '>' + e.to;
    if (
      !ids.has(e.from) ||
      !ids.has(e.to) ||
      e.from === e.to ||
      pairs.has(key) ||
      !finite(e.reads, 0, 1000) ||
      !finite(e.writes, 0, 1000) ||
      nodes.find((n) => n.id === e.to)?.kind === 'client'
    )
      throw new Error('INVALID_EDGE_FIELDS');
    pairs.add(key);
    return { from: e.from, to: e.to, reads: e.reads, writes: e.writes };
  });
  if (typeof d.notes !== 'string' || d.notes.length > 12000) throw new Error('INVALID_NOTES');
  return { version: 1, nodes, edges, notes: d.notes };
}
export function studioNode(kind: StudioKind, id: string, index: number): StudioNode {
  return {
    id,
    kind,
    label: kind,
    x: 60 + (index % 4) * 280,
    y: 55 + (Math.floor(index / 4) % 3) * 220,
    units: 1,
    readCapacity: kind === 'client' ? 0 : 1000,
    writeCapacity: kind === 'client' ? 0 : 500,
    hitRatio: kind === 'cache' || kind === 'cdn' ? 0.8 : 0,
  };
}
export function starterStudio(): StudioDesign {
  return { version: 1, nodes: [studioNode('client', 'client-1', 0)], edges: [], notes: '' };
}
export type StudioFlow = {
  id: string;
  reads: number;
  writes: number;
  readCapacity: number;
  writeCapacity: number;
  utilization: number | null;
  reachable: boolean;
};
export function reviewStudio(
  design: StudioDesign,
  readQps: number,
  writeQps: number,
  failedUnits: number = 0,
) {
  const d = parseStudioDesign(design);
  if (
    !finite(readQps, 0, 1e9) ||
    !finite(writeQps, 0, 1e9) ||
    !Number.isInteger(failedUnits) ||
    !finite(failedUnits, 0, 1000)
  )
    throw new Error('INVALID_WORKLOAD');
  const incoming = new Map(d.nodes.map((n) => [n.id, 0])),
    out = new Map(d.nodes.map((n) => [n.id, [] as StudioEdge[]]));
  for (const e of d.edges) {
    incoming.set(e.to, incoming.get(e.to)! + 1);
    out.get(e.from)!.push(e);
  }
  const queue = d.nodes.filter((n) => incoming.get(n.id) === 0).map((n) => n.id),
    order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const e of out.get(id)!) {
      incoming.set(e.to, incoming.get(e.to)! - 1);
      if (incoming.get(e.to) === 0) queue.push(e.to);
    }
  }
  const clients = d.nodes.filter((n) => n.kind === 'client'),
    reachable = new Set(clients.map((n) => n.id)),
    stack = [...reachable];
  while (stack.length) {
    for (const e of out.get(stack.pop()!)!) {
      if ((e.reads > 0 || e.writes > 0) && !reachable.has(e.to)) {
        reachable.add(e.to);
        stack.push(e.to);
      }
    }
  }
  const findings: { code: string; nodes: string[] }[] = [];
  if (!clients.length) findings.push({ code: 'NO_CLIENT', nodes: [] });
  if (!d.edges.some((e) => clients.some((c) => c.id === e.from) && (e.reads > 0 || e.writes > 0)))
    findings.push({ code: 'NO_ENTRY', nodes: clients.map((n) => n.id) });
  const cycle = order.length !== d.nodes.length;
  if (cycle) findings.push({ code: 'CYCLE_NOT_MODELED', nodes: [] });
  const loads = new Map(d.nodes.map((n) => [n.id, { reads: 0, writes: 0 }]));
  if (!cycle) {
    for (const c of clients)
      loads.set(c.id, { reads: readQps / clients.length, writes: writeQps / clients.length });
    for (const id of order) {
      const n = d.nodes.find((n) => n.id === id)!,
        v = loads.get(id)!,
        miss = n.kind === 'cache' || n.kind === 'cdn' ? 1 - n.hitRatio : 1;
      for (const e of out.get(id)!) {
        const dest = loads.get(e.to)!;
        dest.reads += v.reads * miss * e.reads;
        dest.writes += v.writes * e.writes;
      }
    }
  }
  const rows: StudioFlow[] = d.nodes.map((n) => {
    const f = loads.get(n.id)!,
      units = Math.max(0, n.units - failedUnits),
      readCapacity = n.readCapacity * units,
      writeCapacity =
        n.kind === 'sql' ? (units > 0 ? n.writeCapacity : 0) : n.writeCapacity * units;
    const ratio = (rate: number, cap: number) =>
      rate === 0 ? 0 : cap === 0 ? Infinity : rate / cap;
    const utilization =
      cycle || n.kind === 'client'
        ? null
        : Math.max(ratio(f.reads, readCapacity), ratio(f.writes, writeCapacity));
    if (!reachable.has(n.id)) findings.push({ code: 'UNREACHABLE_COMPONENT', nodes: [n.id] });
    if (utilization !== null && utilization > 1)
      findings.push({ code: 'CAPACITY_EXCEEDED', nodes: [n.id] });
    else if (utilization !== null && utilization >= 0.8)
      findings.push({ code: 'LOW_ASSUMED_HEADROOM', nodes: [n.id] });
    if (
      !cycle &&
      n.kind === 'queue' &&
      f.writes > 0 &&
      !out
        .get(n.id)!
        .some((e) => e.writes > 0 && d.nodes.find((n) => n.id === e.to)?.kind === 'worker')
    )
      findings.push({ code: 'QUEUE_WITHOUT_DIRECT_WORKER', nodes: [n.id] });
    return {
      id: n.id,
      ...f,
      readCapacity,
      writeCapacity,
      utilization,
      reachable: reachable.has(n.id),
    };
  });
  if (
    !cycle &&
    writeQps > 0 &&
    !rows.some(
      (r) =>
        r.writes > 0 && ['sql', 'kv', 'blob'].includes(d.nodes.find((n) => n.id === r.id)!.kind),
    )
  )
    findings.push({ code: 'NO_MODELED_DURABLE_WRITE_PATH', nodes: [] });
  return {
    state: cycle ? 'STRUCTURE_ONLY_CYCLE' : 'ACYCLIC_OPERATION_FIXTURE',
    rows,
    findings,
    latency: 'NOT_MODELED',
    availability: 'NOT_MODELED',
    correctness: 'NOT_PROVEN',
  };
}
export function connectStudio(d: StudioDesign, edge: StudioEdge): StudioDesign {
  return parseStudioDesign({
    ...d,
    edges: [...d.edges.filter((e) => e.from !== edge.from || e.to !== edge.to), edge],
  });
}
export function removeStudioNode(d: StudioDesign, id: string): StudioDesign {
  return {
    ...d,
    nodes: d.nodes.filter((n) => n.id !== id),
    edges: d.edges.filter((e) => e.from !== id && e.to !== id),
  };
}
export function studioMarkdown(
  design: StudioDesign,
  readQps: number,
  writeQps: number,
  failedUnits = 0,
) {
  const report = reviewStudio(design, readQps, writeQps, failedUnits),
    clean = (s: string) => s.replace(/[\r\n`|]/g, ' ');
  return [
    '# AV Lore — Design Studio',
    `Workload assumptions: reads/s=${readQps}; writes/s=${writeQps}; lost units per tier=${failedUnits}`,
    `Model: ${report.state}; latency/availability not modeled; correctness not proven.`,
    '',
    '## Components',
    ...design.nodes.map(
      (n) =>
        `- ${n.id}: ${clean(n.label)} (${n.kind}), units=${n.units}; assumed read/write capacities=${n.readCapacity}/${n.writeCapacity}; hit=${n.hitRatio}`,
    ),
    '',
    '## Operation edges',
    ...design.edges.map(
      (e) => `- ${e.from} → ${e.to}: read multiplier=${e.reads}; write multiplier=${e.writes}`,
    ),
    '',
    '## Findings',
    ...report.findings.map((f) => `- ${f.code}: ${f.nodes.join(', ')}`),
    '',
    '## Reasoning notes',
    design.notes,
  ].join('\n');
}
