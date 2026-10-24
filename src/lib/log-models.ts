// Small deterministic teaching fixtures, not a Kafka storage/replication implementation.
export type LogRow = { offset: number; position: number; bytes: number; key: string };
export const logSegments = [
  {
    base: 0,
    rows: [0, 1, 2, 3].map((offset, i) => ({
      offset,
      position: [0, 50, 140, 200][i],
      bytes: [50, 90, 60, 80][i],
      key: ['A', 'B', 'A', 'C'][i],
    })),
  },
  {
    base: 4,
    rows: [4, 5, 6, 7].map((offset, i) => ({
      offset,
      position: [0, 70, 170, 210][i],
      bytes: [70, 100, 40, 90][i],
      key: ['B', 'D', 'A', 'E'][i],
    })),
  },
  {
    base: 8,
    rows: [8, 9, 10, 11].map((offset, i) => ({
      offset,
      position: [0, 60, 150, 230][i],
      bytes: [60, 90, 80, 50][i],
      key: ['D', 'F', 'B', 'G'][i],
    })),
  },
];
export function logSeek(requested: number, compacted: boolean, expireFirst: boolean) {
  if (!Number.isInteger(requested) || requested < 0 || requested > 12)
    throw new RangeError('Invalid seek');
  const retained = logSegments
    .filter((s) => !expireFirst || s.base !== 0)
    .map((s) => ({
      ...s,
      rows: s.rows.filter((r) => !compacted || ![0, 1, 2, 4, 5].includes(r.offset)),
    }));
  // Compacted segment byte positions are recomputed after rewrite; logical offsets stay stable.
  const segments = retained.map((s) => {
    let next = 0;
    return {
      ...s,
      rows: s.rows.map((r) => {
        const row = { ...r, position: next };
        next += r.bytes;
        return row;
      }),
    };
  });
  const start = expireFirst ? 4 : 0;
  if (requested < start)
    return {
      status: 'OFFSET_OUT_OF_RANGE',
      segments,
      start,
      segment: null,
      index: [],
      anchor: null,
      scanned: [],
      found: null,
    };
  const segment = segments.findLast((s) => s.base <= requested)!;
  const index = segment.rows
    .filter((_, i) => i % 2 === 0)
    .map((r) => ({ offset: r.offset, position: r.position }));
  const anchor = index.findLast((r) => r.offset <= requested) || {
    offset: segment.base,
    position: 0,
  };
  const scanned: LogRow[] = [];
  let found: LogRow | null = null;
  for (const s of segments.filter((s) => s.base >= segment.base)) {
    for (const row of s.rows) {
      if (s.base === segment.base && row.position < anchor.position) continue;
      scanned.push(row);
      if (row.offset >= requested) {
        found = row;
        break;
      }
    }
    if (found) break;
  }
  return {
    status: found ? 'FOUND' : 'END_OF_LOG',
    segments,
    start,
    segment: segment.base,
    index,
    anchor,
    scanned,
    found,
  };
}
export function logReplication(
  stage: number,
  minIsr: number,
  ack: 'leader' | 'all',
  loseReply: boolean,
  unclean: boolean,
) {
  if (
    !Number.isInteger(stage) ||
    stage < 0 ||
    stage > 5 ||
    !Number.isInteger(minIsr) ||
    minIsr < 1 ||
    minIsr > 3
  )
    throw new RangeError('Invalid replica scenario');
  // Initial committed prefix is offsets 0..3 (HW boundary 4), all replicas eligible in ISR.
  // C is removed before the new append; membership is durable in this fixture.
  const isr = stage >= 1 ? ['A', 'B'] : ['A', 'B', 'C'],
    admitted = stage >= 2 && (ack === 'leader' || isr.length >= minIsr);
  const ends = { A: admitted ? 5 : 4, B: admitted && stage >= 3 ? 5 : 4, C: 4 };
  // Strict HW rule in this fixture: low-ISR leader ACKs do not advance visibility.
  const committed = admitted && stage >= 3 && isr.length >= minIsr,
    hw = committed ? 5 : 4;
  const ackSent = admitted && (ack === 'leader' || committed);
  const newLeader = stage < 4 ? null : stage === 4 ? 'B' : unclean ? 'C' : null;
  const recoveredEnd = newLeader ? ends[newLeader] : null;
  return {
    isr,
    ends,
    admitted,
    hw,
    ackSent,
    sender:
      stage < 2
        ? 'NOT_SENT'
        : !admitted
          ? 'REJECTED'
          : ackSent && !loseReply
            ? 'ACKNOWLEDGED'
            : 'UNKNOWN',
    newLeader,
    election:
      stage < 4
        ? 'NO_FAILURE'
        : newLeader === null
          ? 'UNAVAILABLE'
          : stage === 5
            ? 'UNCLEAN_WITH_DATA_LOSS'
            : 'CLEAN_ISR',
    recoveredEnd,
    lostAcknowledged: stage === 5 && !!newLeader && ackSent && ends[newLeader] < ends.A,
    currentCommittedLoss: stage === 5 && !!newLeader && committed,
    leaderOnlyCrashLoss: admitted && stage === 2 && ack === 'leader',
  };
}
export type TransactionState = 'open' | 'committed' | 'aborted';
const transactionRows = [
  { offset: 0, kind: 'normal', value: 'N0' },
  { offset: 1, kind: 'transaction', value: 'T1' },
  { offset: 2, kind: 'normal', value: 'N2' },
  { offset: 3, kind: 'transaction', value: 'T3' },
  { offset: 4, kind: 'marker', value: 'TX_END' },
  { offset: 5, kind: 'normal', value: 'N5' },
];
export function logVisibility(hw: number, state: TransactionState, readCommitted: boolean) {
  if (!Number.isInteger(hw) || hw < 0 || hw > 6) throw new RangeError('Invalid HW');
  // Alternative histories: open uses an unrelated control record at 4; resolved variants use the TX end marker there.
  // A selected decision is visible only when its marker is replicated (HW > 4).
  const resolved = state !== 'open' && hw > 4,
    lso = resolved ? hw : Math.min(hw, 1),
    boundary = readCommitted ? lso : hw;
  const rows = transactionRows.map((r) => ({
    ...r,
    value: r.kind === 'marker' && state === 'open' ? 'OTHER_CONTROL' : r.value,
    visible:
      r.offset < boundary &&
      r.kind !== 'marker' &&
      !(readCommitted && resolved && state === 'aborted' && r.kind === 'transaction'),
    reason:
      r.kind === 'marker'
        ? 'CONTROL'
        : r.offset >= hw
          ? 'NOT_REPLICATED'
          : readCommitted && r.offset >= lso
            ? 'UNSTABLE_SUFFIX'
            : readCommitted && resolved && state === 'aborted' && r.kind === 'transaction'
              ? 'ABORTED'
              : 'VISIBLE',
  }));
  return {
    rows,
    lso,
    boundary,
    resolved,
    visible: rows.filter((r) => r.visible).map((r) => r.value),
  };
}
