import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  reconcileCaptures,
  reconciliationFixture,
  type ReconCase,
} from '../lib/payment-reconciliation';
import '../styles/payment-recovery.css';
const cases: ReconCase[] = [
  'clean',
  'amount',
  'net',
  'currency',
  'duplicate',
  'missing-external',
  'missing-internal',
  'account',
];
export default function PaymentReconciliation() {
  const ref = useIslandReady(),
    id = 'payment-reconcile-' + useId().replace(/:/g, '');
  const [kind, setKind] = useState<ReconCase>('clean'),
    [day, setDay] = useState(3),
    fixture = reconciliationFixture(kind),
    rows = reconcileCaptures(fixture.internal, fixture.report, day);
  return (
    <section className="handbook-experiment payment-reconciliation" ref={ref} aria-labelledby={id}>
      <span className="eyebrow">PAYMENTS / RECONCILIATION EVIDENCE</span>
      <h3 id={id}>Đối soát gross, fee, net và identity trước khi kết luận mismatch</h3>
      <p>
        Fixture độc lập với ledger có một aggregated capture row cho mỗi provider-account/reference
        trong report scope đã chọn; không là mọi format settlement. Internal rows là capture facts
        cùng expected settlement day, không phải bank statement. Fee của PSP tách khỏi platform fee
        5% ở ledger phía trên. Day là clock giả, không quy định settlement SLA thật.
      </p>
      <div className="worksheet-choices recon-cases">
        {cases.map((c) => (
          <button
            type="button"
            className="secondary"
            key={c}
            aria-pressed={kind === c}
            onClick={() => setKind(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <label className="recon-day">
        As-of day<output>{day}</output>
        <input type="range" min={0} max={5} value={day} onChange={(e) => setDay(+e.target.value)} />
      </label>
      <div className="recon-metrics" aria-live="polite">
        <p>
          Matched rows:{' '}
          <strong data-recon-matched>{rows.filter((r) => r.status === 'matched').length}</strong>
        </p>
        <p>
          Review / timing rows:{' '}
          <strong data-recon-review>{rows.filter((r) => r.status !== 'matched').length}</strong>
        </p>
      </div>
      <div
        className="recon-table"
        role="region"
        tabIndex={0}
        aria-label="Kết quả reconciliation theo provider account và reference"
      >
        <table>
          <thead>
            <tr>
              {[
                'Account / reference',
                'Expected gross',
                'Report gross',
                'Report fee',
                'Report net',
                'Classification',
                'Owner',
              ].map((t) => (
                <th scope="col" key={t}>
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.account + ':' + row.reference} data-recon-status={row.status}>
                <th scope="row">
                  <span translate="no">
                    {row.account} / {row.reference}
                  </span>
                </th>
                <td>
                  {row.internal.length === 1
                    ? row.internal[0].gross + ' ' + row.internal[0].currency
                    : '—'}
                </td>
                <td>
                  {row.report.length === 1
                    ? row.report[0].gross + ' ' + row.report[0].currency
                    : '—'}
                </td>
                <td>{row.report.length === 1 ? row.report[0].fee : '—'}</td>
                <td>{row.report.length === 1 ? row.report[0].net : '—'}</td>
                <td>
                  <strong>{row.status}</strong>
                </td>
                <td>{row.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Gross 10000, fee 300 và net 9700 có thể cùng khớp arithmetic; không so gross trực tiếp với
        net rồi gọi thiếu 300. Matched chỉ nói identity/currency/gross và net arithmetic trong
        fixture, chưa chứng minh fee đúng contract hoặc bank đã settle. Missing report trước due day
        là timing-open cần theo dõi; qua due day thì mở missing-external để review, không tự tuyên
        bố tiền đã mất.
      </p>
      <p>
        Duplicate rows được giữ để review, không dùng Map overwrite rồi giả chỉ có một record. Trong
        report thực, nhiều lines có thể hợp lệ cho một capture; phải định nghĩa aggregation/report
        version và dedup source-row trước bước này. Currency mismatch không được tự FX convert; cùng
        reference ở account khác vẫn là identity khác. Các break có owner, evidence và audit; công
        cụ không sửa ledger hoặc gửi tiền.
      </p>
      <details>
        <summary>Xem evidence rows của fixture</summary>
        <div
          className="recon-table"
          role="region"
          tabIndex={0}
          aria-label="Internal và report evidence gốc"
        >
          <table>
            <thead>
              <tr>
                {['Side', 'Account', 'Reference', 'Currency', 'Gross', 'Fee', 'Net / due day'].map(
                  (t) => (
                    <th scope="col" key={t}>
                      {t}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {fixture.internal.map((x, i) => (
                <tr key={'i' + i}>
                  <th scope="row">internal</th>
                  <td>{x.account}</td>
                  <td>{x.reference}</td>
                  <td>{x.currency}</td>
                  <td>{x.gross}</td>
                  <td>—</td>
                  <td>day {x.dueDay}</td>
                </tr>
              ))}
              {fixture.report.map((x, i) => (
                <tr key={'e' + i}>
                  <th scope="row">report</th>
                  <td>{x.account}</td>
                  <td>{x.reference}</td>
                  <td>{x.currency}</td>
                  <td>{x.gross}</td>
                  <td>{x.fee}</td>
                  <td>{x.net}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
