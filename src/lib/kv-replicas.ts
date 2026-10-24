export const homeReplicas = ['A', 'B', 'C'];
export const replicaIds = ['A', 'B', 'C', 'D', 'E', 'F'];
export type ReplicaRecord = { revision: number; value: string; deleted: boolean };
type Hint = { home: string; record: ReplicaRecord };
type Replica = { id: string; online: boolean; record: ReplicaRecord | null; hints: Hint[] };
type Write = {
  id: string;
  record: ReplicaRecord;
  w: number;
  acknowledgements: string[];
  outcome: 'waiting' | 'success' | 'unknown';
};
type Message = {
  id: string;
  operation: string;
  target: string;
  hintFor?: string;
  delivered: boolean;
  record: ReplicaRecord;
};
export type ReplicaState = {
  nodes: Replica[];
  writes: Write[];
  messages: Message[];
  trace: string[];
  read: {
    status: 'ok' | 'unavailable';
    responders: string[];
    record: ReplicaRecord | null;
    repaired: string[];
  } | null;
};
export type ReplicaAction =
  | { type: 'write'; w: number; sloppy: boolean; deleted?: boolean }
  | { type: 'deliver'; id: string }
  | { type: 'finish'; lost: boolean }
  | { type: 'online'; id: string }
  | { type: 'read'; r: number; homes: string[]; repair: boolean }
  | { type: 'handoff' | 'expire-hints' | 'repair' };
export function createReplicaState(): ReplicaState {
  return {
    nodes: replicaIds.map((id) => ({ id, online: true, record: null, hints: [] })),
    writes: [],
    messages: [],
    trace: [],
    read: null,
  };
}
function newer(node: Replica, record: ReplicaRecord) {
  if (!node.record || node.record.revision < record.revision) node.record = { ...record };
}
function quorum(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 3)
    throw new RangeError('N=3 fixture requires 1..3 responses');
}
/** A manually stepped, serialized single-key fixture, not a production version/consensus protocol. */
export function replicaAction(previous: ReplicaState, action: ReplicaAction): ReplicaState {
  const state = structuredClone(previous),
    last = state.writes.at(-1),
    node = (id: string) => {
      const n = state.nodes.find((n) => n.id === id);
      if (!n) throw new RangeError('Unknown replica');
      return n;
    };
  const log = (line: string) => {
    state.trace = [line, ...state.trace].slice(0, 16);
  };
  if (action.type === 'write') {
    quorum(action.w);
    if (last?.outcome === 'waiting') throw new Error('Finish the active request first');
    if (state.writes.length >= 12) throw new RangeError('Reset after twelve mutations');
    const revision = state.writes.length + 1,
      id = 'op-' + revision,
      record = {
        revision,
        value: action.deleted ? 'tombstone' : 'value-' + revision,
        deleted: !!action.deleted,
      },
      fallback = state.nodes.filter((n) => !homeReplicas.includes(n.id) && n.online);
    state.writes.push({ id, record, w: action.w, acknowledgements: [], outcome: 'waiting' });
    for (const home of homeReplicas) {
      const target = !node(home).online && action.sloppy ? fallback.shift() : undefined;
      state.messages.push({
        id: id + ':' + home,
        operation: id,
        target: target?.id || home,
        hintFor: target ? home : undefined,
        delivered: false,
        record,
      });
    }
    log(`${id}: BEGIN v${revision} W=${action.w} ${action.sloppy ? 'sloppy' : 'home-only'}`);
  } else if (action.type === 'deliver') {
    const message = state.messages.find((m) => m.id === action.id);
    if (!message) throw new RangeError('Unknown message');
    const target = node(message.target);
    if (message.delivered || !target.online) return state;
    if (message.hintFor)
      target.hints.push({ home: message.hintFor, record: { ...message.record } });
    else newer(target, message.record);
    message.delivered = true;
    const write = state.writes.find((w) => w.id === message.operation)!;
    if (!write.acknowledgements.includes(target.id)) write.acknowledgements.push(target.id);
    log(
      `${message.operation}: DURABLE ${target.id}${message.hintFor ? ' hint->' + message.hintFor : ''}; ACK ${write.acknowledgements.length}/${write.w}`,
    );
  } else if (action.type === 'finish') {
    if (!last || last.outcome !== 'waiting') throw new Error('No active request');
    if (!action.lost && last.acknowledgements.length < last.w)
      throw new Error('Required acknowledgements not reached');
    last.outcome = action.lost ? 'unknown' : 'success';
    log(`${last.id}: CLIENT ${last.outcome}; stored state retained`);
  } else if (action.type === 'online') {
    const n = node(action.id);
    n.online = !n.online;
    log(`${n.id}: ${n.online ? 'ONLINE (no automatic synchronization)' : 'OFFLINE'}`);
  } else if (action.type === 'read') {
    quorum(action.r);
    if (
      new Set(action.homes).size !== action.homes.length ||
      action.homes.some((id) => !homeReplicas.includes(id))
    )
      throw new RangeError('Select distinct home responders');
    const responders = action.homes.filter((id) => node(id).online).slice(0, action.r);
    if (responders.length < action.r) {
      state.read = { status: 'unavailable', responders, record: null, repaired: [] };
      log(`GET: UNAVAILABLE ${responders.length}/${action.r}`);
      return state;
    }
    const record =
        responders
          .map((id) => node(id).record)
          .filter((r): r is ReplicaRecord => !!r)
          .sort((a, b) => b.revision - a.revision)[0] || null,
      repaired: string[] = [];
    if (action.repair && record)
      for (const id of responders) {
        const n = node(id);
        if (!n.record || n.record.revision < record.revision) {
          newer(n, record);
          repaired.push(id);
        }
      }
    state.read = { status: 'ok', responders, record: record ? { ...record } : null, repaired };
    log(
      `GET [${responders.join(',')}]: ${record ? 'v' + record.revision + (record.deleted ? ' TOMBSTONE' : '') : 'ABSENT'}${repaired.length ? '; repair ' + repaired.join(',') : ''}`,
    );
  } else if (action.type === 'handoff') {
    let delivered = 0;
    for (const holder of state.nodes) {
      if (!holder.online) continue;
      holder.hints = holder.hints.filter((h) => {
        const destination = node(h.home);
        if (!destination.online) return true;
        newer(destination, h.record);
        delivered++;
        return false;
      });
    }
    log(`HANDOFF: ${delivered} hints applied or superseded; offline endpoints skipped`);
  } else if (action.type === 'expire-hints') {
    const count = state.nodes.reduce((n, r) => n + r.hints.length, 0);
    state.nodes.forEach((n) => (n.hints = []));
    log(`SIMULATED EXPIRY/LOSS: ${count} hints removed; home data retained`);
  } else {
    const homes = state.nodes.filter((n) => homeReplicas.includes(n.id) && n.online),
      record = homes
        .map((n) => n.record)
        .filter((r): r is ReplicaRecord => !!r)
        .sort((a, b) => b.revision - a.revision)[0];
    if (record) homes.forEach((n) => newer(n, record));
    log(
      `HOME REPAIR: ${record ? 'v' + record.revision : 'no surviving home record'}; offline nodes excluded`,
    );
  }
  return state;
}
