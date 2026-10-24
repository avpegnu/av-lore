export type InternalCapture = {
  account: string;
  reference: string;
  currency: string;
  gross: number;
  dueDay: number;
};
export type ReportCapture = {
  account: string;
  reference: string;
  currency: string;
  gross: number;
  fee: number;
  net: number;
};
export type ReconCase =
  | 'clean'
  | 'amount'
  | 'net'
  | 'currency'
  | 'duplicate'
  | 'missing-external'
  | 'missing-internal'
  | 'account';
export function reconciliationFixture(kind: ReconCase) {
  const internal: InternalCapture[] = [
      { account: 'acct-A', reference: 'capture-1', currency: 'USD', gross: 10000, dueDay: 2 },
      { account: 'acct-A', reference: 'capture-2', currency: 'USD', gross: 4000, dueDay: 3 },
    ],
    report: ReportCapture[] = [
      {
        account: 'acct-A',
        reference: 'capture-1',
        currency: 'USD',
        gross: 10000,
        fee: 300,
        net: 9700,
      },
      {
        account: 'acct-A',
        reference: 'capture-2',
        currency: 'USD',
        gross: 4000,
        fee: 120,
        net: 3880,
      },
    ];
  if (kind === 'amount') {
    report[0].gross = 9900;
    report[0].net = 9600;
  }
  if (kind === 'net') report[0].net = 9600;
  if (kind === 'currency') report[0].currency = 'EUR';
  if (kind === 'duplicate') report.push({ ...report[0] });
  if (kind === 'missing-external') report.shift();
  if (kind === 'missing-internal')
    report.push({
      account: 'acct-A',
      reference: 'capture-3',
      currency: 'USD',
      gross: 2500,
      fee: 75,
      net: 2425,
    });
  if (kind === 'account') report[0].account = 'acct-B';
  return { internal, report };
}
export type ReconStatus =
  | 'matched'
  | 'ambiguous-duplicate'
  | 'missing-internal'
  | 'timing-open'
  | 'missing-external'
  | 'currency-mismatch'
  | 'amount-mismatch'
  | 'net-mismatch';
/** One aggregated capture row per account/reference/report scope; no bank/FX/fee-policy proof. */
export function reconcileCaptures(
  internal: InternalCapture[],
  report: ReportCapture[],
  day: number,
) {
  const money = (v: number) => Number.isSafeInteger(v) && v >= 0;
  if (
    !Number.isInteger(day) ||
    day < 0 ||
    day > 5 ||
    internal.some(
      (r) => !money(r.gross) || !Number.isInteger(r.dueDay) || r.dueDay < 0 || r.dueDay > 5,
    ) ||
    report.some((r) => ![r.gross, r.fee, r.net].every(money))
  )
    throw new RangeError('Invalid integer report fixture');
  const groups = new Map<
    string,
    { account: string; reference: string; internal: InternalCapture[]; report: ReportCapture[] }
  >();
  for (const [side, rows] of [
    ['internal', internal],
    ['report', report],
  ] as const)
    for (const row of rows) {
      const key = JSON.stringify([row.account, row.reference]);
      if (!groups.has(key))
        groups.set(key, {
          account: row.account,
          reference: row.reference,
          internal: [],
          report: [],
        });
      if (side === 'internal') groups.get(key)!.internal.push(row as InternalCapture);
      else groups.get(key)!.report.push(row as ReportCapture);
    }
  return [...groups.values()].map((group) => {
    const i = group.internal[0],
      e = group.report[0];
    let status: ReconStatus = 'matched';
    if (group.internal.length > 1 || group.report.length > 1) status = 'ambiguous-duplicate';
    else if (!i) status = 'missing-internal';
    else if (!e) status = i.dueDay > day ? 'timing-open' : 'missing-external';
    else if (i.currency !== e.currency) status = 'currency-mismatch';
    else if (i.gross !== e.gross) status = 'amount-mismatch';
    else if (e.gross - e.fee !== e.net) status = 'net-mismatch';
    return { ...group, status, owner: status === 'matched' ? '—' : 'Payments Ops' };
  });
}
