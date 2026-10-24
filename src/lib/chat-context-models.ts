/** Illustrative atomic turn groups, not a tokenizer, retriever or summarizer. */
export type ContextStrategy = 'recent' | 'summary' | 'retrieve';
export type TurnFate = 'kept' | 'summarized' | 'retrieved' | 'dropped';
export function planChatContext(input: {
  window: number;
  turns: number;
  tokensPerGroup: number;
  chunks: number;
  output: number;
  strategy: ContextStrategy;
}) {
  const { window, turns, tokensPerGroup, chunks, output, strategy } = input;
  if (
    ![window, turns, tokensPerGroup, chunks, output].every(Number.isSafeInteger) ||
    window <= 0 ||
    turns < 0 ||
    tokensPerGroup <= 0 ||
    chunks < 0 ||
    output < 0
  )
    throw new Error('Invalid context fixture inputs');
  const system = 2048,
    tools = 1024,
    margin = 512,
    evidence = chunks * 512;
  const fixed = system + tools + margin + evidence + output;
  const available = Math.max(0, window - fixed);
  const fates: TurnFate[] = Array.from({ length: turns }, () => 'dropped');
  const fit = Math.min(turns, Math.floor(available / tokensPerGroup));
  let summary = 0;
  const keep = (n: number) => {
    for (let i = turns - n; i < turns; i++) fates[i] = 'kept';
  };
  if (fixed <= window) {
    if (strategy === 'recent') keep(fit);
    else if (strategy === 'summary') {
      // Find the longest recent suffix that also leaves room for the summary.
      // A 10% size capped at 1500 is an assumed serialized size, never a quality guarantee.
      for (let n = fit; n >= 0; n--) {
        const size = Math.min(1500, Math.ceil((turns - n) * tokensPerGroup * 0.1));
        if (n * tokensPerGroup + size > available) continue;
        keep(n);
        summary = size;
        if (size) for (let i = 0; i < turns - n; i++) fates[i] = 'summarized';
        break;
      }
    } else {
      const recent = Math.min(4, fit);
      keep(recent);
      const older = turns - recent,
        count = Math.min(3, older, fit - recent);
      // Evenly spaced deterministic picks stand in for retrieval; no relevance scores.
      for (let k = 0; k < count; k++) fates[Math.floor(((k + 0.5) * older) / count)] = 'retrieved';
    }
  }
  const history = fates.filter((f) => f === 'kept' || f === 'retrieved').length * tokensPerGroup;
  const required = fixed + summary + history;
  return {
    fates,
    system,
    tools,
    margin,
    evidence,
    summary,
    history,
    output,
    required,
    prompt: system + tools + evidence + summary + history,
    free: Math.max(0, window - required),
    overflow: Math.max(0, required - window),
    fits: fixed <= window,
  };
}
