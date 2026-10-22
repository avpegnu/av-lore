// Exact synthetic audience placement. Global rates extrapolate the same
// distribution to10M publishers; they are not production capacity benchmarks.
export function nearbyFanout(friends: number, devices: number, gateways: number, interval: number) {
  if (
    ![friends, devices, gateways, interval].every(Number.isInteger) ||
    friends < 1 ||
    friends > 100 ||
    devices < 1 ||
    devices > 3 ||
    gateways < 1 ||
    gateways > 40 ||
    interval < 10 ||
    interval > 120
  )
    throw new RangeError('Invalid bounded nearby fanout');
  const connections = friends * devices,
    placement = Array.from({ length: connections }, (_, i) => i % gateways),
    used = new Set(placement).size,
    updatesPerSecond = 1e7 / interval;
  return {
    connections,
    used,
    placement,
    updatesPerSecond,
    logicalPerSecond: updatesPerSecond * connections,
    brokerPerSecond: updatesPerSecond * used,
  };
}
export const nearbyPeople = [
  { id: 'A', x: 3, y: 5, friend: true, sharing: true },
  { id: 'B', x: 7, y: 5, friend: true, sharing: true },
  { id: 'C', x: 5, y: 6, friend: true, sharing: true },
  { id: 'D', x: 1, y: 8, friend: true, sharing: true },
  { id: 'E', x: 2, y: 4, friend: false, sharing: true },
  { id: 'F', x: 2, y: 6, friend: true, sharing: false },
  { id: 'G', x: 9, y: 9, friend: true, sharing: true },
];
// Synthetic planar km, viewer y=5. All eligible fixes are held constant and
// fresh during this experiment so movement-induced recomputation is isolated.
export function nearbyView(viewerX: number, radius: number, recompute: boolean) {
  if (
    !Number.isFinite(viewerX) ||
    viewerX < 1 ||
    viewerX > 9 ||
    !Number.isFinite(radius) ||
    radius < 1 ||
    radius > 4
  )
    throw new RangeError('Invalid bounded nearby viewer');
  const audience = nearbyPeople.filter((p) => p.friend && p.sharing),
    trueNear = audience.filter((p) => Math.hypot(p.x - viewerX, p.y - 5) <= radius),
    shown = audience.filter((p) => Math.hypot(p.x - (recompute ? viewerX : 2), p.y - 5) <= radius),
    expected = new Set(trueNear.map((p) => p.id)),
    displayed = new Set(shown.map((p) => p.id));
  return {
    audience,
    trueNear,
    shown,
    missed: trueNear.filter((p) => !displayed.has(p.id)),
    falseNear: shown.filter((p) => !expected.has(p.id)),
  };
}
export type NearbyFix = { epoch: number; seq: number; observedAt: number; expiresAt: number };
export function nearbyRecovery(clock: number, guard: boolean, expire: boolean) {
  if (!Number.isInteger(clock) || clock < 0 || clock > 80)
    throw new RangeError('Invalid bounded nearby clock');
  let enabled = true,
    epoch = 4,
    displayed: NearbyFix | undefined,
    blocked = 0,
    leaks = 0,
    regressions = 0;
  const rows: { time: number; event: string; outcome: string }[] = [];
  const events = [
    { time: 0, event: 'initial', fix: { epoch: 4, seq: 1, observedAt: 0, expiresAt: 30 } },
    { time: 10, event: 'revoke' },
    {
      time: 20,
      event: 'delayed-old-epoch',
      fix: { epoch: 4, seq: 9, observedAt: 5, expiresAt: 35 },
    },
    { time: 30, event: 'enable' },
    {
      time: 35,
      event: 'delayed-old-epoch',
      fix: { epoch: 4, seq: 10, observedAt: 8, expiresAt: 38 },
    },
    { time: 40, event: 'new-epoch', fix: { epoch: 6, seq: 1, observedAt: 40, expiresAt: 70 } },
    { time: 45, event: 'older-sequence', fix: { epoch: 6, seq: 0, observedAt: 39, expiresAt: 69 } },
  ];
  for (const e of events.filter((e) => e.time <= clock)) {
    if (e.event === 'revoke') {
      enabled = false;
      epoch = 5;
      rows.push({ time: e.time, event: e.event, outcome: 'notice-lost' });
      continue;
    }
    if (e.event === 'enable') {
      enabled = true;
      epoch = 6;
      rows.push({ time: e.time, event: e.event, outcome: 'no-new-fix' });
      continue;
    }
    const fix = e.fix!;
    const wrongPolicy = !enabled || fix.epoch !== epoch,
      oldSequence = !!displayed && displayed.epoch === fix.epoch && fix.seq <= displayed.seq;
    if (guard && (wrongPolicy || oldSequence || e.time >= fix.expiresAt)) {
      blocked++;
      rows.push({ time: e.time, event: e.event, outcome: 'blocked' });
      continue;
    }
    if (wrongPolicy) leaks++;
    if (oldSequence) regressions++;
    displayed = fix;
    rows.push({ time: e.time, event: e.event, outcome: 'forwarded' });
  }
  const visible = !!displayed && (!expire || clock < displayed.expiresAt);
  return { enabled, epoch, displayed, visible, blocked, leaks, regressions, rows };
}
