// Analytical teaching fixtures; no GPU allocation, quantization or inference is performed.
export const GIB = 2 ** 30;
export function kvRankBudget(
  tp: number,
  kvHeads: number,
  weightBits: number,
  kvBits: number,
  tokens: number,
  sequences: number,
  reserveGiB: number,
) {
  if (
    ![1, 2, 4, 8, 16].includes(tp) ||
    ![1, 8, 64].includes(kvHeads) ||
    ![4, 8, 16].includes(weightBits) ||
    ![8, 16].includes(kvBits) ||
    ![tokens, sequences].every((n) => Number.isSafeInteger(n) && n > 0) ||
    !Number.isFinite(reserveGiB) ||
    reserveGiB < 0
  )
    throw new RangeError('Invalid dense-attention fixture');
  const params = 70e9,
    layers = 80,
    headDim = 128,
    deviceBytes = 80 * GIB;
  // Ideal even weight sharding. Low-bit formats have one hypothetical 2-byte scale / 128 values.
  const weightPayload = (params * weightBits) / 8,
    weightMetadata = weightBits < 16 ? Math.ceil(params / 128) * 2 : 0,
    weightPerRank = (weightPayload + weightMetadata) / tp,
    localKvHeads = kvHeads >= tp ? kvHeads / tp : 1,
    kvBytesPerToken = 2 * layers * kvHeads * headDim * (kvBits / 8),
    kvBytesPerTokenRank = 2 * layers * localKvHeads * headDim * (kvBits / 8),
    kvPerSequenceRank = kvBytesPerTokenRank * tokens,
    kvPerRank = kvPerSequenceRank * sequences,
    needPerRank = weightPerRank + kvPerRank + reserveGiB * GIB,
    availableForKv = deviceBytes - weightPerRank - reserveGiB * GIB;
  return {
    deviceBytes,
    weightPayload,
    weightMetadata,
    weightPerRank,
    localKvHeads,
    kvBytesPerToken,
    kvBytesPerTokenRank,
    kvPerSequenceRank,
    kvPerRank,
    needPerRank,
    headroom: deviceBytes - needPerRank,
    replicationFactor: (tp * localKvHeads) / kvHeads,
    physicalKvTotal: kvPerRank * tp,
    logicalKvTotal: kvBytesPerToken * tokens * sequences,
    fits: needPerRank <= deviceBytes,
    maxSequences: Math.max(0, Math.floor(availableForKv / kvPerSequenceRank)),
  };
}
const requestLengths = [13, 17, 22, 26];
type KvPage = { id: number; refs: string[]; live: number; planned: number };
export function kvPagePool(block: number, growth: number, reserveGrowth: boolean, share: boolean) {
  if (![4, 8, 16].includes(block) || !Number.isInteger(growth) || growth < 0 || growth > 16)
    throw new RangeError('Invalid page fixture');
  const capacity = 96,
    maxPages = Math.floor(capacity / block),
    sharedPages = share ? Math.floor(8 / block) : 0;
  const pages: KvPage[] = [],
    admitted: { id: string; length: number; planned: number; pageIds: number[] }[] = [];
  for (let i = 0; i < requestLengths.length; i++) {
    const length = requestLengths[i],
      planned = length + (reserveGrowth ? growth : 0),
      id = String.fromCharCode(65 + i),
      privatePages = Math.ceil(planned / block) - sharedPages,
      need = privatePages + (i === 0 ? sharedPages : 0);
    if (pages.length + need > maxPages) break; // FIFO fixture: do not skip an earlier request.
    if (i === 0)
      for (let j = 0; j < sharedPages; j++)
        pages.push({ id: pages.length, refs: [], live: block, planned: block });
    const pageIds: number[] = [];
    for (let j = 0; j < sharedPages; j++) {
      pages[j].refs.push(id);
      pageIds.push(j);
    }
    for (let j = sharedPages; j < Math.ceil(planned / block); j++) {
      const page = {
        id: pages.length,
        refs: [id],
        live: Math.min(block, Math.max(0, length - j * block)),
        planned: Math.min(block, Math.max(0, planned - j * block)),
      };
      pages.push(page);
      pageIds.push(page.id);
    }
    admitted.push({ id, length, planned, pageIds });
  }
  const allocated = pages.length * block,
    physicalLive = pages.reduce((s, p) => s + p.live, 0),
    physicalPlanned = pages.reduce((s, p) => s + p.planned, 0),
    logicalLive = admitted.reduce((s, r) => s + r.length, 0),
    futureRequired =
      admitted.reduce((s, r) => s + Math.ceil((r.length + growth) / block) * block, 0) -
      Math.max(0, admitted.length - 1) * sharedPages * block,
    slabSize = 32 + growth,
    slabAdmitted = Math.min(requestLengths.length, Math.floor(capacity / slabSize)),
    slabLive = requestLengths.slice(0, slabAdmitted).reduce((s, l) => s + l, 0);
  return {
    capacity,
    block,
    pages,
    admitted,
    allocated,
    physicalLive,
    logicalLive,
    sharedTokensSaved: logicalLive - physicalLive,
    roundingSlack: allocated - physicalPlanned,
    reservedGrowth: physicalPlanned - physicalLive,
    freeTokens: capacity - allocated,
    futureRequired,
    growthFits: futureRequired <= capacity,
    slabSize,
    slabAdmitted,
    slabIdle: slabSize * slabAdmitted - slabLive,
  };
}
export function kvPrefixReuse(
  changedToken: number,
  tenantChanged: boolean,
  modelChanged: boolean,
  resident: boolean,
  bindContext: boolean,
) {
  if (!Number.isInteger(changedToken) || changedToken < 0 || changedToken > 12)
    throw new RangeError('Invalid prefix edit');
  const cached = Array.from({ length: 12 }, (_, i) => i + 101),
    request = [...cached, 501, 502];
  if (changedToken) request[changedToken - 1] = 900 + changedToken;
  const contextMismatch = tenantChanged || modelChanged;
  let matched = 0;
  if (resident && (!bindContext || !contextMismatch))
    while (matched < cached.length && cached[matched] === request[matched]) matched++;
  const reusedTokens = Math.floor(matched / 4) * 4;
  return {
    cached,
    request,
    matched,
    reusedTokens,
    prefillTokens: request.length - reusedTokens,
    unsafeReuse: reusedTokens > 0 && contextMismatch,
    blocks: Array.from({ length: 3 }, (_, i) => ({
      index: i,
      tokens: request.slice(i * 4, i * 4 + 4),
      reused: (i + 1) * 4 <= reusedTokens,
    })),
  };
}
export function kvFork(copyOnWrite: boolean) {
  // A sampling fork shares a PARTIAL tail. This differs from full-block automatic prefix caching.
  const first = [1, 2, 3, 4],
    tail = [5, 6],
    a = copyOnWrite ? [...tail] : tail,
    b = tail;
  a.push(91);
  b[2] = 92;
  return {
    first,
    a,
    b,
    physicalPages: copyOnWrite ? 3 : 2,
    branchALost: a[2] !== 91,
    branchBValid: b[2] === 92,
  };
}
export function kvTransfer(
  tokens: number,
  linkGBps: number,
  prefillTokensPerSecond: number,
  queueMs: number,
  deadlineMs: number,
  loadOnly: boolean,
) {
  if (
    !Number.isSafeInteger(tokens) ||
    tokens <= 0 ||
    ![linkGBps, prefillTokensPerSecond, deadlineMs].every((n) => Number.isFinite(n) && n > 0) ||
    !Number.isFinite(queueMs) ||
    queueMs < 0
  )
    throw new RangeError('Invalid transfer assumptions');
  // A separate 32-layer/8-KV-head/128-dimension BF16 shape: 128 KiB/token, unsharded.
  const bytesPerToken = 2 * 32 * 8 * 128 * 2,
    bytes = tokens * bytesPerToken,
    directions = loadOnly ? 1 : 2,
    transferMs = (bytes / (linkGBps * 1e9)) * 1000 * directions + directions * 2,
    recomputeMs = queueMs + (tokens / prefillTokensPerSecond) * 1000;
  return {
    bytes,
    bytesPerToken,
    directions,
    transferMs,
    recomputeMs,
    transferWithin: transferMs <= deadlineMs,
    recomputeWithin: recomputeMs <= deadlineMs,
    quicker: transferMs <= recomputeMs ? 'TRANSFER' : 'RECOMPUTE',
  };
}
