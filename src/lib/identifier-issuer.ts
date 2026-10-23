import { packId } from './identifier-models';
export type IssuedSample = { value: bigint; time: bigint; sequence: bigint };
export interface IdentifierFixture {
  clock: bigint;
  lastTime: bigint | null;
  lastSequence: bigint;
  issued: bigint;
  samples: IssuedSample[];
  accepted: bigint;
  rejected: bigint;
  error: 'none' | 'clock-rollback' | 'sequence-exhausted';
}
/** A single-worker, in-memory teaching fixture, not a production allocation protocol. */
export function newIdentifierFixture(): IdentifierFixture {
  return {
    clock: 100000000n,
    lastTime: null,
    lastSequence: -1n,
    issued: 0n,
    samples: [],
    accepted: 0n,
    rejected: 0n,
    error: 'none',
  };
}
export function moveIdentifierClock(
  state: IdentifierFixture,
  action: 'back' | 'tick' | 'recover',
): IdentifierFixture {
  const clock =
    action === 'back'
      ? state.clock >= 50n
        ? state.clock - 50n
        : 0n
      : action === 'tick'
        ? state.clock + 1n
        : (state.lastTime !== null && state.lastTime > state.clock ? state.lastTime : state.clock) +
          1n;
  return { ...state, clock, accepted: 0n, rejected: 0n, error: 'none' };
}
export function issueIdentifierBatch(
  state: IdentifierFixture,
  workerBits: number,
  sequenceBits: number,
  count: bigint,
): IdentifierFixture {
  if (count < 1n) throw new RangeError('A batch must request at least one identifier');
  // Validate time/layout/worker before constructing any result. Worker 7 is fixed in this fixture.
  packId(state.clock, 7n, 0n, workerBits, sequenceBits);
  if (state.lastTime !== null)
    packId(state.lastTime, 7n, state.lastSequence, workerBits, sequenceBits);
  if (state.lastTime !== null && state.clock < state.lastTime)
    return { ...state, accepted: 0n, rejected: count, error: 'clock-rollback' };
  const capacity = 1n << BigInt(sequenceBits),
    first = state.clock === state.lastTime ? state.lastSequence + 1n : 0n;
  const available = capacity - first,
    accepted = count < available ? count : available,
    rejected = count - accepted;
  if (accepted === 0n) return { ...state, accepted, rejected, error: 'sequence-exhausted' };
  const last = first + accepted - 1n,
    samples: IssuedSample[] = [];
  // Summarize a potentially large batch without allocating one item for every representable sequence.
  for (let sequence = last - (accepted > 3n ? 3n : accepted) + 1n; sequence <= last; sequence++)
    samples.push({
      value: packId(state.clock, 7n, sequence, workerBits, sequenceBits),
      time: state.clock,
      sequence,
    });
  return {
    ...state,
    lastTime: state.clock,
    lastSequence: last,
    issued: state.issued + accepted,
    samples: [...state.samples, ...samples].slice(-6),
    accepted,
    rejected,
    error: rejected > 0n ? 'sequence-exhausted' : 'none',
  };
}
