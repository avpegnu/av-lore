export type RetryPolicy = 'query-reference' | 'same-key' | 'new-provider';
export function paymentRetry(
  stage: number,
  policy: RetryPolicy,
  referenceKnown: boolean,
  keyRetained: boolean,
) {
  if (!Number.isInteger(stage) || stage < 0 || stage > 4)
    throw new RangeError('Invalid bounded payment stage');
  const accepted = stage >= 2,
    acted = stage >= 4,
    duplicate = acted && (policy === 'new-provider' || (policy === 'same-key' && !keyRetained));
  const resolved =
    acted &&
    ((policy === 'query-reference' && referenceKnown) || (policy === 'same-key' && keyRetained));
  return {
    providerCaptures: accepted ? (duplicate ? 2 : 1) : 0,
    clientState:
      stage < 1 ? 'CREATED' : stage < 3 ? 'PROCESSING' : resolved ? 'CONFIRMED' : 'UNKNOWN',
    resolved,
    secondAttempt: acted && policy !== 'query-reference',
    duplicate,
    providerQueries: acted && policy === 'query-reference' && referenceKnown ? 1 : 0,
  };
}
const deliveries = [
  { id: 'event-1', op: 'capture-1', kind: 'capture' },
  { id: 'event-1', op: 'capture-1', kind: 'capture' },
  { id: 'event-2', op: 'capture-1', kind: 'capture' },
  { id: 'event-3', op: 'refund-1', kind: 'refund' },
  { id: 'event-3', op: 'refund-1', kind: 'refund' },
  { id: 'event-4', op: 'refund-2', kind: 'refund' },
] as const;
export function paymentLedger(steps: number, guarded: boolean, refund: number) {
  if (
    !Number.isInteger(steps) ||
    steps < 0 ||
    steps > 6 ||
    !Number.isInteger(refund) ||
    refund < 0 ||
    refund > 5000 ||
    refund % 1000 !== 0
  )
    throw new RangeError('Invalid bounded ledger scenario');
  const seen = new Set<string>(),
    actual = new Set<string>();
  let debits = 0,
    credits = 0,
    receivable = 0,
    seller = 0,
    revenue = 0,
    actualReceivable = 0,
    duplicates = 0;
  const rows = deliveries.slice(0, steps).map((e) => {
    const amount = e.kind === 'capture' ? 10000 : refund,
      fee = amount / 20,
      net = amount - fee,
      direction = e.kind === 'capture' ? 1 : -1;
    if (!actual.has(e.op)) {
      actualReceivable += direction * amount;
      actual.add(e.op);
    }
    const skipped = guarded && seen.has(e.op);
    seen.add(e.op);
    if (skipped) duplicates++;
    else {
      debits += amount;
      credits += amount;
      receivable += direction * amount;
      seller += direction * net;
      revenue += direction * fee;
    }
    return {
      ...e,
      amount,
      skipped,
      postings:
        e.kind === 'capture'
          ? [
              { account: 'PSP receivable', debit: amount, credit: 0 },
              { account: 'Seller payable', debit: 0, credit: net },
              { account: 'Platform fee revenue', debit: 0, credit: fee },
            ]
          : [
              { account: 'Seller payable', debit: net, credit: 0 },
              { account: 'Platform fee revenue', debit: fee, credit: 0 },
              { account: 'PSP receivable', debit: 0, credit: amount },
            ],
    };
  });
  return {
    rows,
    debits,
    credits,
    receivable,
    seller,
    revenue,
    actualReceivable,
    duplicates,
    mismatch: receivable - actualReceivable,
  };
}
