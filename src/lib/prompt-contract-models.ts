/** Fixed-language and ticket fixtures. Not a tokenizer, schema library or security service. */
export const tinyLanguage = ['ok', 'error'].flatMap((status) =>
  [0, 1, 2].map((count) => JSON.stringify({ status, count })),
);
export const tinyVocab = [
  ...new Set([
    'Sure!',
    '{"status":"',
    'ok',
    'error',
    '","count":',
    'ok","count":',
    '0',
    '1',
    '2',
    '}',
    ...tinyLanguage.join(''),
    '<eos>',
  ]),
];
export function tinyCandidates(prefix: string) {
  const complete = tinyLanguage.includes(prefix);
  return tinyVocab
    .map((token) => {
      const allowed =
        token === '<eos>' ? complete : tinyLanguage.some((text) => text.startsWith(prefix + token));
      const logit =
        token === 'Sure!'
          ? 10
          : token === '<eos>'
            ? prefix.startsWith('Sure!')
              ? 11
              : 9.5
            : token.length > 1
              ? 8 + Math.min(token.length, 15) / 100
              : token === '0'
                ? 4
                : 1;
      return { token, allowed, logit };
    })
    .sort((a, b) => b.logit - a.logit || tinyVocab.indexOf(a.token) - tinyVocab.indexOf(b.token));
}
export function tinyDecode(constrained: boolean, budget: number) {
  if (!Number.isInteger(budget) || budget < 1 || budget > 64) throw new Error('Invalid budget');
  let prefix = '',
    finished = false;
  const history: { prefix: string; token: string; allowed: number; masked: number }[] = [];
  for (let i = 0; i < budget; i++) {
    const candidates = tinyCandidates(prefix),
      chosen = constrained ? candidates.find((c) => c.allowed) : candidates[0];
    if (!chosen) break;
    history.push({
      prefix,
      token: chosen.token,
      allowed: candidates.filter((c) => c.allowed).length,
      masked: candidates.filter((c) => !c.allowed).length,
    });
    if (chosen.token === '<eos>') {
      finished = true;
      break;
    }
    prefix += chosen.token;
  }
  return {
    prefix,
    finished,
    complete: tinyLanguage.includes(prefix),
    reason: finished ? 'EOS' : history.length === budget ? 'LIMIT' : 'NO_CANDIDATE',
    history,
  };
}
export const extractionPresets = {
  correct: '{"ticket_id":"T42","status":"open","priority":2}',
  syntax: 'Sure! {"ticket_id":"T42","status":"open","priority":2}',
  extra: '{"ticket_id":"T42","status":"open","priority":2,"admin":true}',
  type: '{"ticket_id":"T42","status":"open","priority":"2"}',
  missing: '{"ticket_id":"T42","priority":2}',
  semantic: '{"ticket_id":"T42","status":"closed","priority":2}',
  truncated: '{"ticket_id":"T42","status":"open",',
  refused: 'I cannot process this input.',
} as const;
export type ExtractionPreset = keyof typeof extractionPresets;
export function extractionCheck(preset: ExtractionPreset, complete: boolean) {
  if (!complete)
    return { envelope: false, parse: false, schema: false, truth: false, result: 'INCOMPLETE' };
  if (preset === 'refused')
    return { envelope: false, parse: false, schema: false, truth: false, result: 'REFUSAL' };
  let o: unknown;
  try {
    o = JSON.parse(extractionPresets[preset]);
  } catch {
    return { envelope: true, parse: false, schema: false, truth: false, result: 'PARSE_ERROR' };
  }
  const schema =
    typeof o === 'object' &&
    o !== null &&
    !Array.isArray(o) &&
    Object.keys(o).length === 3 &&
    Object.keys(o).every((k) => ['ticket_id', 'status', 'priority'].includes(k)) &&
    typeof (o as Record<string, unknown>).ticket_id === 'string' &&
    ['open', 'closed'].includes((o as Record<string, unknown>).status as string) &&
    Number.isInteger((o as Record<string, unknown>).priority) &&
    +((o as Record<string, unknown>).priority as number) >= 1 &&
    +((o as Record<string, unknown>).priority as number) <= 3;
  if (!schema)
    return { envelope: true, parse: true, schema: false, truth: false, result: 'SCHEMA_ERROR' };
  const data = o as { ticket_id: string; status: string; priority: number };
  const truth = data.ticket_id === 'T42' && data.status === 'open' && data.priority === 2;
  return {
    envelope: true,
    parse: true,
    schema: true,
    truth,
    result: truth ? 'MATCHES_FIXTURE' : 'SEMANTIC_MISMATCH',
  };
}
export type TicketFixture = {
  closed: boolean;
  version: number;
  effects: number;
  receipts: Record<string, { fingerprint: string; version: number }>;
};
export const newTicketFixture = (): TicketFixture => ({
  closed: false,
  version: 7,
  effects: 0,
  receipts: {},
});
export function closeTicketFixture(
  state: TicketFixture,
  caller: 'alpha' | 'beta',
  blockers: number,
  expectedVersion: number,
  key: string,
) {
  const stop = (result: string) => ({ state, result, replayed: false });
  if (caller !== 'alpha') return stop('DENIED');
  const scopedKey = 'alpha:close:T42:' + key,
    fingerprint = 'T42:close:' + expectedVersion;
  const existing = Object.hasOwn(state.receipts, scopedKey) ? state.receipts[scopedKey] : undefined;
  if (existing)
    return existing.fingerprint === fingerprint
      ? { state, result: 'REPLAYED', replayed: true }
      : stop('KEY_MISMATCH');
  if (expectedVersion !== state.version) return stop('VERSION_CONFLICT');
  if (blockers > 0) return stop('BLOCKED');
  if (state.closed) return stop('ALREADY_CLOSED');
  // One atomic fixture transition models effect + durable receipt together.
  const version = state.version + 1;
  return {
    state: {
      closed: true,
      version,
      effects: state.effects + 1,
      receipts: { ...state.receipts, [scopedKey]: { fingerprint, version } },
    },
    result: 'COMMITTED',
    replayed: false,
  };
}
