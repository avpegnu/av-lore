/** Synthetic stream/cache fixtures and hypothetical cost inventory; no network calls. */
export type StreamFailure = 'none' | 'before-content' | 'slow-first' | 'mid-stream';
export type RestartPolicy = 'stop' | 'explicit-restart' | 'unsafe-splice';
export function productionStream(
  failure: StreamFailure,
  policy: RestartPolicy,
  fallbackQualified: boolean,
  disconnectMs: number,
) {
  const events: { at: number; code: string; generation: number; text: string }[] = [];
  let generation = 1,
    visible = '',
    cancelled = false;
  function emit(at: number, code: string, text = '') {
    if (disconnectMs > 0 && at >= disconnectMs) {
      events.push({ at: disconnectMs, code: 'CANCEL_UPSTREAM_REQUESTED', generation, text: '' });
      cancelled = true;
      return false;
    }
    events.push({ at, code, generation, text });
    return true;
  }
  emit(0, 'PRIMARY_ATTEMPT');
  if (failure === 'none' || failure === 'mid-stream') {
    if (!emit(1000, 'CONTENT_DELTA', 'Primary ')) return result('CANCEL_REQUESTED');
    visible += 'Primary ';
    if (!emit(1300, 'CONTENT_DELTA', 'answer')) return result('CANCEL_REQUESTED');
    visible += 'answer';
    if (failure === 'none') {
      if (!emit(1600, 'COMPLETE')) return result('CANCEL_REQUESTED');
      return result('COMPLETE');
    }
  } else if (failure === 'slow-first') {
    if (!emit(500, 'TRANSPORT_HEARTBEAT')) return result('CANCEL_REQUESTED');
  }
  const failAt = failure === 'mid-stream' ? 1600 : failure === 'slow-first' ? 3000 : 300;
  if (!emit(failAt, failure === 'slow-first' ? 'FIRST_CONTENT_TIMEOUT' : 'PRIMARY_ERROR'))
    return result('CANCEL_REQUESTED');
  if (visible && policy === 'stop') return result('PARTIAL_FAILURE');
  if (!fallbackQualified) return result('NO_QUALIFIED_FALLBACK');
  if (visible && policy === 'explicit-restart') {
    generation++;
    visible = '';
    if (!emit(failAt, 'VISIBLE_RESTART')) return result('CANCEL_REQUESTED');
  }
  if (!emit(failAt, 'FALLBACK_ATTEMPT')) return result('CANCEL_REQUESTED');
  if (!emit(failAt + 800, 'CONTENT_DELTA', 'Fallback answer')) return result('CANCEL_REQUESTED');
  visible += 'Fallback answer';
  if (!emit(failAt + 1200, 'COMPLETE')) return result('CANCEL_REQUESTED');
  return result(
    failure === 'mid-stream' && policy === 'unsafe-splice' ? 'SPLICED_ANSWER' : 'COMPLETE',
  );
  function result(state: string) {
    return {
      state,
      events,
      visible,
      generation,
      usage: cancelled ? 'UNCONFIRMED' : 'FIXTURE_COMPLETE',
    };
  }
}
export type CacheCase =
  'paraphrase' | 'different-intent' | 'other-tenant' | 'source-update' | 'permission-revoked';
export function responseCacheDecision(
  scenario: CacheCase,
  semantic: boolean,
  threshold: number,
  tenantBound: boolean,
  versionsBound: boolean,
  permissionGuard: boolean,
) {
  // Candidate contains alpha's 30-day refund policy at evidence v4.
  const similarity = scenario === 'different-intent' ? 0.96 : 0.94;
  const exactSameInput = scenario !== 'paraphrase' && scenario !== 'different-intent';
  const tenantMismatch = scenario === 'other-tenant',
    versionMismatch = scenario === 'source-update',
    permissionRevoked = scenario === 'permission-revoked';
  const identityBlocked = (tenantBound && tenantMismatch) || (versionsBound && versionMismatch);
  const accessBlocked = permissionGuard && (tenantMismatch || permissionRevoked);
  const matched = semantic ? similarity >= threshold : exactSameInput;
  const served = matched && !identityBlocked && !accessBlocked;
  const outcome = !served
    ? 'MISS_OR_BLOCKED'
    : tenantMismatch || permissionRevoked
      ? 'UNAUTHORIZED_DISCLOSURE'
      : versionMismatch
        ? 'STALE_ANSWER'
        : scenario === 'different-intent'
          ? 'WRONG_INTENT_ANSWER'
          : 'VALID_FIXTURE_HIT';
  return {
    similarity,
    matched,
    identityBlocked,
    accessBlocked,
    served,
    outcome,
    sourceVersion: versionMismatch ? 5 : 4,
    cachedVersion: 4,
  };
}
export function productionCacheCost(
  requests: number,
  exactHit: number,
  semanticHitOfMisses: number,
  semanticFalseHit: number,
  prefixFraction: number,
  prefixReadShare: number,
  semanticEnabled = true,
) {
  if (
    requests < 0 ||
    [exactHit, semanticHitOfMisses, semanticFalseHit, prefixFraction, prefixReadShare].some(
      (v) => v < 0 || v > 1,
    )
  )
    throw new Error('Invalid cache cost inputs');
  // Hypothetical dollars/1M tokens, not provider pricing. 2000 input / 400 output per model call.
  const exact = requests * exactHit,
    semantic = semanticEnabled ? (requests - exact) * semanticHitOfMisses : 0,
    calls = requests - exact - semantic;
  const inputPrice = 2,
    outputPrice = 8,
    cachedReadPrice = 0.5;
  const prefixReadTokens = calls * 2000 * prefixFraction * prefixReadShare,
    uncachedInput = calls * 2000 - prefixReadTokens,
    outputTokens = calls * 400,
    inputCost = (uncachedInput * inputPrice + prefixReadTokens * cachedReadPrice) / 1e6,
    outputCost = (outputTokens * outputPrice) / 1e6,
    // Every exact miss is embedded when semantic caching is enabled; query length is 80 tokens.
    lookupCost = semanticEnabled ? ((requests - exact) * 80 * 0.02) / 1e6 : 0;
  return {
    exact,
    semantic,
    calls,
    prefixReadTokens,
    outputTokens,
    inputCost,
    outputCost,
    lookupCost,
    total: inputCost + outputCost + lookupCost,
    baseline: (requests * (2000 * inputPrice + 400 * outputPrice)) / 1e6,
    wrongSemantic: semantic * semanticFalseHit,
  };
}
