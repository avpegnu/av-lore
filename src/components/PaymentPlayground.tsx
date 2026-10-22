import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { paymentRetry, paymentLedger, type RetryPolicy } from '../lib/payment-models';
export default function PaymentPlayground({ kind }: { kind: 'payment-retry' | 'payment-ledger' }) {
  const ref = useIslandReady(),
    id = 'payment-' + useId().replace(/:/g, '');
  const [stage, setStage] = useState(3),
    [policy, setPolicy] = useState<RetryPolicy>('query-reference'),
    [reference, setReference] = useState(true),
    [retained, setRetained] = useState(true),
    [steps, setSteps] = useState(6),
    [guarded, setGuarded] = useState(true),
    [refund, setRefund] = useState(3000);
  const retry = paymentRetry(stage, policy, reference, retained),
    ledger = paymentLedger(steps, guarded, refund);
  return (
    <section className="handbook-experiment" ref={ref} aria-labelledby={id}>
      <span className="eyebrow">PAYMENTS / UNKNOWN OUTCOMES AND POSTINGS</span>
      {kind === 'payment-retry' ? (
        <>
          <h3 id={id}>Timeout không nói rằng capture chưa xảy ra</h3>
          <p>
            Scenario giả định PSP đã capture ở stage 2 nhưng response bị mất. Stage 4 chọn cách
            resolve hoặc retry. Controls replay từ đầu; đây không gọi PSP thật. Khi thiếu dedup
            scope, model giả định PSP có thể chấp nhận thêm một charge; API cụ thể còn có
            resource/amount guards riêng.
          </p>
          <div className="worksheet-inputs">
            <label>
              Replay stage<output>{stage}</output>
              <input
                type="range"
                min="0"
                max="4"
                value={stage}
                onChange={(e) => setStage(+e.target.value)}
              />
            </label>
          </div>
          <ol className="sync-stage-list">
            {[
              'Intent recorded',
              'Provider call in flight',
              'Provider captured / response lost',
              'Local timeout / UNKNOWN',
              'Resolve or retry',
            ].map((label, i) => (
              <li key={i} aria-current={stage === i ? 'step' : undefined}>
                {i} / {label}
              </li>
            ))}
          </ol>
          <div className="worksheet-choices">
            {(['query-reference', 'same-key', 'new-provider'] as const).map((p) => (
              <button
                type="button"
                key={p}
                className="secondary"
                aria-pressed={policy === p}
                onClick={() => setPolicy(p)}
              >
                {p === 'query-reference'
                  ? 'Query provider reference'
                  : p === 'same-key'
                    ? 'Retry same provider/key'
                    : 'Route to another PSP'}
              </button>
            ))}
          </div>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={reference}
              onChange={(e) => setReference(e.target.checked)}
            />
            Có provider reference đã lưu bền và API lookup phù hợp
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={retained}
              onChange={(e) => setRetained(e.target.checked)}
            />
            Same payload/key còn trong dedup retention của PSP cũ
          </label>
          <div className="payment-facts">
            <section>
              <h4>Provider truth / scenario</h4>
              <strong>{retry.providerCaptures} capture(s)</strong>
              <p>Actual effects differ from local knowledge.</p>
            </section>
            <section>
              <h4>Local knowledge</h4>
              <strong>{retry.clientState}</strong>
              <p>
                {retry.resolved
                  ? 'An answer was obtained; inspect total effects.'
                  : 'No final provider result established locally.'}
              </p>
            </section>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Provider captures / scenario</dt>
              <dd>{retry.providerCaptures}</dd>
            </div>
            <div>
              <dt>Additional money-moving attempt</dt>
              <dd>{retry.secondAttempt ? 1 : 0}</dd>
            </div>
            <div>
              <dt>Provider status lookups</dt>
              <dd>{retry.providerQueries}</dd>
            </div>
            <div>
              <dt>Duplicate capture / scenario</dt>
              <dd>{retry.duplicate ? 1 : 0}</dd>
            </div>
          </dl>
          <p>
            Key không tự là searchable provider ID. Query chỉ resolve trong model khi có reference
            và lookup contract phù hợp; thiếu reference thì vẫn UNKNOWN, không invent kết quả. Same
            key không dedup xuyên PSP; hết retention hoặc đổi logical attempt cần
            policy/reconciliation, không blind retry.
          </p>
        </>
      ) : (
        <>
          <h3 id={id}>Ledger cân bằng vẫn có thể ghi trùng tiền</h3>
          <p>
            Ví dụ một currency với integer minor units: capture 10000, platform fee 5%, seller
            payable 95%. Hai partial refunds có ID riêng, mỗi refund theo slider và hoàn fee tỷ lệ
            trước settlement/payout. Đây là policy minh họa; chưa tính PSP fee, tax hoặc FX.
          </p>
          <div className="worksheet-inputs">
            <label>
              Deliveries replayed<output>{steps}</output>
              <input
                type="range"
                min="0"
                max="6"
                value={steps}
                onChange={(e) => setSteps(+e.target.value)}
              />
            </label>
            <label>
              Each distinct refund / minor units<output>{refund}</output>
              <input
                type="range"
                min="0"
                max="5000"
                step="1000"
                value={refund}
                onChange={(e) => setRefund(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={guarded}
              onChange={(e) => setGuarded(e.target.checked)}
            />
            Unique posting theo financial operation, không chỉ event ID
          </label>
          <p>
            Delivery gồm capture event lặp, event ID khác cho cùng capture, refund-1 lặp và refund-2
            riêng. Tắt guard để thấy mọi journal vẫn balance nhưng assets bị ghi quá số provider
            thực có.
          </p>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Sum debits / minor units</dt>
              <dd>{ledger.debits}</dd>
            </div>
            <div>
              <dt>Sum credits / minor units</dt>
              <dd>{ledger.credits}</dd>
            </div>
            <div>
              <dt>Ledger PSP receivable</dt>
              <dd>{ledger.receivable}</dd>
            </div>
            <div>
              <dt>Source PSP receivable / scenario</dt>
              <dd>{ledger.actualReceivable}</dd>
            </div>
            <div>
              <dt>Duplicate postings suppressed</dt>
              <dd>{ledger.duplicates}</dd>
            </div>
            <div>
              <dt>Ledger minus source</dt>
              <dd>{ledger.mismatch}</dd>
            </div>
          </dl>
          <div className="payment-facts">
            <section>
              <h4>Seller payable / credit balance</h4>
              <strong>{ledger.seller}</strong>
            </section>
            <section>
              <h4>Platform fee revenue / credit balance</h4>
              <strong>{ledger.revenue}</strong>
            </section>
          </div>
          <figure className="handbook-table">
            <div tabIndex={0} role="region" aria-label="Payment delivery and ledger posting replay">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Delivery</th>
                    <th scope="col">Financial operation</th>
                    <th scope="col">Amount / minor</th>
                    <th scope="col">Posting decision</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.rows.map((e, i) => (
                    <tr key={i}>
                      <td>{e.id}</td>
                      <td>{e.op}</td>
                      <td>{e.amount}</td>
                      <td>{e.skipped ? 'Duplicate / no posting' : 'Post balanced transaction'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
          <details>
            <summary>Debit / credit entries for posted transactions</summary>
            {ledger.rows
              .filter((e) => !e.skipped)
              .map((e, i) => (
                <section key={i}>
                  <h4>
                    {e.op} / delivery {e.id}
                  </h4>
                  <ul>
                    {e.postings.map((p) => (
                      <li key={p.account}>
                        {p.account}: Dr {p.debit} / Cr {p.credit}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
          </details>
          <p>
            Balance equality chỉ kiểm bookkeeping, không chứng minh amount, account mapping hoặc
            dedup đúng. Production cần atomic posting transaction, scoped operation uniqueness,
            currency checks và available/refundable-funds constraints. Guard minh họa duplicate
            persistence; không là accounting engine hoặc reconciliation đầy đủ.
          </p>
        </>
      )}
    </section>
  );
}
