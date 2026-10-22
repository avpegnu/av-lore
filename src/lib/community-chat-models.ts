/** Deterministic histories and arithmetic; no Discord clients, storage engines or media calls. */
export function hotChannelReads(
  instances: number,
  affinity: boolean,
  coalesce: boolean,
  safeKey: boolean,
  latency: number,
) {
  const times = [0, 5, 10, 15, 20, 25, 30, 35, 80, 85, 90, 95];
  const requests = times.map((at, i) => ({
    id: 'r' + i,
    at,
    scope: i === 0 || i === 1 || i === 7 || i === 10 ? 'mods' : 'members',
    cursor: i === 3 || i === 11 ? 'before-100' : 'head',
    minVersion: i === 4 || i === 6 ? 2 : 1,
  }));
  type Query = {
    id: number;
    instance: number;
    start: number;
    end: number;
    scope: string;
    cursor: string;
    version: number;
    key: string;
  };
  const queries: Query[] = [],
    rows = requests.map((req, i) => {
      const instance = affinity ? 0 : i % instances,
        key = safeKey ? req.scope + ':' + req.cursor + ':perm-v1' : 'channel-only';
      let query = coalesce
        ? queries.find(
            (q) =>
              q.instance === instance &&
              q.end > req.at &&
              q.key === key &&
              (!safeKey || q.version >= req.minVersion),
          )
        : undefined;
      const joined = !!query;
      if (!query) {
        query = {
          id: queries.length,
          instance,
          start: req.at,
          end: req.at + latency,
          scope: req.scope,
          cursor: req.cursor,
          version: req.at >= 20 ? 2 : 1,
          key,
        };
        queries.push(query);
      }
      const issues = [
        ...(query.scope !== req.scope ? ['SCOPE'] : []),
        ...(query.cursor !== req.cursor ? ['CURSOR'] : []),
        ...(query.version < req.minVersion ? ['MIN_VERSION'] : []),
      ];
      return {
        ...req,
        instance,
        query: query.id,
        joined,
        wait: query.end - req.at,
        servedScope: query.scope,
        servedVersion: query.version,
        issues,
      };
    });
  const events = queries
    .flatMap((q) => [
      { at: q.start, delta: 1 },
      { at: q.end, delta: -1 },
    ])
    .sort((a, b) => a.at - b.at || a.delta - b.delta);
  let peak = 0,
    active = 0;
  for (const e of events) {
    active += e.delta;
    peak = Math.max(peak, active);
  }
  return {
    rows,
    queries,
    peak,
    meanWait: rows.reduce((s, r) => s + r.wait, 0) / rows.length,
    incompatible: rows.filter((r) => r.issues.length).length,
    scopeLeaks: rows.filter((r) => r.scope === 'members' && r.servedScope === 'mods').length,
  };
}
export function communityFanout(
  members: number,
  onlinePercent: number,
  activePercent: number,
  messagesPerSecond: number,
  relays: number,
  bounded: boolean,
) {
  const online = Math.floor((members * onlinePercent) / 100),
    watchers = Math.floor((online * activePercent) / 100),
    ownerCopies = messagesPerSecond * Math.min(watchers, relays);
  const recipientCopies = watchers * messagesPerSecond,
    capacity = relays * 5000,
    excess = Math.max(0, recipientCopies - capacity);
  return {
    online,
    watchers,
    ownerCopies,
    recipientCopies,
    allOnlineCopies: online * messagesPerSecond,
    capacity,
    egressMB: recipientCopies / 1000,
    ownerMB: ownerCopies / 1000,
    queuedAfter5s: bounded ? 0 : excess * 5,
    gapDeliveriesPerSecond: bounded ? excess : 0,
    status: excess ? (bounded ? 'LIVE_WITH_GAPS' : 'GROWING_QUEUE') : 'LIVE',
  };
}
export const chatEvents = [
  { seq: 1, id: 'm1', type: 'create', text: 'one' },
  { seq: 2, id: 'm2', type: 'create', text: 'two' },
  { seq: 3, id: 'm1', type: 'edit', text: 'one v2' },
  { seq: 4, id: 'm3', type: 'create', text: 'three' },
  { seq: 5, id: 'm2', type: 'delete', text: '' },
  { seq: 6, id: 'm4', type: 'create', text: 'four' },
  { seq: 7, id: 'm3', type: 'edit', text: 'three v2' },
  { seq: 8, id: 'm1', type: 'delete', text: '' },
  { seq: 9, id: 'm5', type: 'create', text: 'live nine' },
] as const;
export function chatResume(
  cursor: number,
  retained: number,
  stage: number,
  allowed: boolean,
  bridge: boolean,
  versionGuard: boolean,
) {
  const source = allowed ? (cursor >= 8 - retained ? 'BUFFER' : 'SNAPSHOT_REQUIRED') : 'DENIED';
  type Message = { id: string; version: number; deleted: boolean; text: string };
  const state = new Map<string, Message>();
  const apply = (event: (typeof chatEvents)[number]) => {
    const current = state.get(event.id);
    if (versionGuard && current && current.version >= event.seq) return;
    if (event.type === 'delete' && !versionGuard) state.delete(event.id);
    else
      state.set(event.id, {
        id: event.id,
        version: event.seq,
        deleted: event.type === 'delete',
        text: event.text,
      });
  };
  if (!allowed)
    return {
      source,
      messages: [] as Message[],
      watermark: 0,
      liveMissing: 0,
      resurrected: false,
      tombstones: 0,
    };
  for (const event of chatEvents.filter((e) => e.seq <= cursor)) apply(event);
  if (stage >= 1) {
    if (source === 'SNAPSHOT_REQUIRED') state.clear();
    for (const event of chatEvents.filter(
      (e) => e.seq <= 8 && (source === 'SNAPSHOT_REQUIRED' || e.seq > cursor),
    ))
      apply(event);
  }
  if (stage >= 3 && bridge) apply(chatEvents[8]);
  if (stage >= 4) apply(chatEvents[0]); // late history page containing old m1 creation
  const messages = [...state.values()]
    .filter((m) => !m.deleted)
    .sort((a, b) => a.id.localeCompare(b.id));
  return {
    source,
    messages,
    watermark: stage >= 3 && bridge ? 9 : stage >= 1 ? 8 : cursor,
    liveMissing: stage >= 3 && !bridge ? 1 : 0,
    resurrected: stage >= 4 && messages.some((m) => m.id === 'm1'),
    tombstones: [...state.values()].filter((m) => m.deleted).length,
  };
}
