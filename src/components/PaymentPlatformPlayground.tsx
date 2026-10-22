import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  merchantInbox,
  migrationCutover,
  processorEvidence,
  type ProcessorOutcome,
} from '../lib/payment-platform-models';
export default function PaymentPlatformPlayground({
  kind,
}: {
  kind: 'platform-processor' | 'platform-inbox' | 'platform-migrate';
}) {
  const ref = useIslandReady(),
    id = 'platform-' + useId().replace(/:/g, '');
  const [stage, setStage] = useState(3),
    [outcome, setOutcome] = useState<ProcessorOutcome>('accepted'),
    [blind, setBlind] = useState(false);
  const [deliveries, setDeliveries] = useState(4),
    [verify, setVerify] = useState(true),
    [dedup, setDedup] = useState(true),
    [business, setBusiness] = useState(true);
  const [migration, setMigration] = useState(4),
    [version, setVersion] = useState(true),
    [readiness, setReadiness] = useState(true),
    [fence, setFence] = useState(true);
  const p = processorEvidence(stage, outcome, blind),
    inbox = merchantInbox(deliveries, verify, dedup, business),
    m = migrationCutover(migration, version, readiness, fence);
  const processorSteps = [
    'Operation + attempt được lưu bền',
    'Gửi attempt A; response chưa có',
    'Mất response: outcome chưa rõ',
    'Status replica trả NOT_FOUND cũ',
    'Nhận evidence có authority hoặc vẫn chờ',
    'Kết quả đến muộn và đối chiếu',
  ];
  const migrationSteps = [
    'Old store v1 / 1000 minor',
    'Backfill đọc snapshot v1',
    'Live write v2 / 2500 + CDC',
    'CDC apply v2 vào new store',
    'Backfill cũ tới muộn; thử cutover',
    'Final verification / repair; thử lại',
    'Old worker gửi write bằng epoch 1',
  ];
  return (
    <section ref={ref} className="handbook-experiment platform-playground" aria-labelledby={id}>
      <span className="eyebrow">PAYMENT PLATFORM / EVIDENCE AND OWNERSHIP</span>
      {kind === 'platform-processor' && (
        <>
          <h3 id={id}>NOT_FOUND có đủ để chuyển sang processor B?</h3>
          <p>
            Đây là một attempt authorize 5000 minor units trong fixture. Ba histories có cùng
            timeout và stale status ở bước 3; chỉ authoritative evidence mới phân biệt được.
            Counters là authorization holds, không phải captured/settled money. Không gọi processor
            thật.
          </p>
          <div className="platform-options" role="group" aria-label="Processor history">
            {(['accepted', 'absent', 'delayed'] as const).map((o) => (
              <button
                key={o}
                type="button"
                aria-pressed={outcome === o}
                data-outcome={o}
                onClick={() => setOutcome(o)}
              >
                {o === 'accepted'
                  ? 'A đã nhận và authorize'
                  : o === 'absent'
                    ? 'A sẽ xác nhận absent + fenced'
                    : 'A xử lý muộn'}
              </button>
            ))}
          </div>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={blind} onChange={(e) => setBlind(e.target.checked)} />
            Chuyển B ngay khi thấy stale NOT_FOUND
          </label>
          <div className="worksheet-inputs">
            <label>
              Evidence step<output>{stage} / 5</output>
              <input
                type="range"
                min="0"
                max="5"
                value={stage}
                onChange={(e) => setStage(+e.target.value)}
              />
            </label>
          </div>
          <ol className="platform-history">
            {processorSteps.map((s, i) => (
              <li key={s} data-active={i === stage} data-past={i < stage}>
                <span>{i}</span>
                {s}
              </li>
            ))}
          </ol>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Evidence hiện có</dt>
              <dd>{p.observed}</dd>
            </div>
            <div>
              <dt>Platform state</dt>
              <dd>{p.state}</dd>
            </div>
            <div>
              <dt>External holds A / B</dt>
              <dd>
                {p.a} / {p.b}
              </dd>
            </div>
            <div>
              <dt>Attempts đã gửi</dt>
              <dd>{p.attempts}</dd>
            </div>
            <div>
              <dt>Total held minor units</dt>
              <dd>{p.heldMinor}</dd>
            </div>
            <div>
              <dt>Duplicate holds</dt>
              <dd>{p.duplicateHolds}</dd>
            </div>
          </dl>
          <p className="muted">
            Ground truth trong lab được hiển thị để học, nhưng platform chỉ được hành động theo
            evidence đã nhận. Absent ở bước 4 là terminal no-execution cùng fencing của attempt cũ;
            không phải một GET tạm thời chưa tìm thấy. Giữ nguyên payment ID ở B không tạo dedup
            chung với A.
          </p>
        </>
      )}
      {kind === 'platform-inbox' && (
        <>
          <h3 id={id}>Ba lớp bảo vệ webhook có thay thế nhau?</h3>
          <p>
            Delivery fixture mô tả kết quả verification đã được dựng sẵn, không chạy HMAC. Trong hệ
            thống thật, xác minh chữ ký trên raw bytes, thời gian, secret và account context trước
            durable inbox. Lab chỉ có processing/succeeded cho một payment; refund/dispute là
            workflow khác.
          </p>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={verify} onChange={(e) => setVerify(e.target.checked)} />
            Kiểm signature, delivery age và account context
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={dedup} onChange={(e) => setDedup(e.target.checked)} />
            Dedup inbox bằng account + event ID
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={business}
              onChange={(e) => setBusiness(e.target.checked)}
            />
            Giữ terminal state và fulfillment idempotent theo payment
          </label>
          <div className="worksheet-inputs">
            <label>
              Deliveries đã replay<output>{deliveries} / 7</output>
              <input
                type="range"
                min="1"
                max="7"
                value={deliveries}
                onChange={(e) => setDeliveries(+e.target.value)}
              />
            </label>
          </div>
          <figure className="handbook-table">
            <div role="region" tabIndex={0} aria-label="Webhook delivery replay">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Event / account</th>
                    <th scope="col">Payload state</th>
                    <th scope="col">Signature / age</th>
                    <th scope="col">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {inbox.rows.map((r, i) => (
                    <tr key={i}>
                      <th scope="row">
                        {r.id} / {r.tenant}
                      </th>
                      <td>{r.state}</td>
                      <td>
                        {r.signature ? 'VALID' : 'INVALID'} / {r.age}s
                      </td>
                      <td>{r.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Merchant projection</dt>
              <dd>{inbox.state}</dd>
            </div>
            <div>
              <dt>Fulfillment effects</dt>
              <dd>{inbox.fulfillments}</dd>
            </div>
            <div>
              <dt>Untrusted deliveries admitted</dt>
              <dd>{inbox.unsafeAccepted}</dd>
            </div>
            <div>
              <dt>Unique inbox records</dt>
              <dd>{inbox.inboxRecords}</dd>
            </div>
          </dl>
          <p className="muted">
            e1 lặp lại cùng ID; e2 là processing tới muộn; e3 là ID khác nhưng cùng business
            payment. e4 signature sai; e5 age 600 s vượt fixture tolerance 300 s; e6 thuộc account
            khác. Signature hợp lệ không chứng minh event mới hoặc payload state là current
            authority.
          </p>
        </>
      )}
      {kind === 'platform-migrate' && (
        <>
          <h3 id={id}>Backfill cũ có ghi đè live write mới?</h3>
          <p>
            Fixture dùng hai stores và một CDC stream, không kết nối database. Old v1 có amount
            1000; live v2 đổi thành 2500 và được CDC sang new store trước khi snapshot v1 tới muộn.
            Ba controls bảo vệ ba thời điểm khác nhau: apply, cutover và write authority.
          </p>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={version}
              onChange={(e) => setVersion(e.target.checked)}
            />
            Apply backfill chỉ khi version không cũ hơn
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={readiness}
              onChange={(e) => setReadiness(e.target.checked)}
            />
            Chặn cutover nếu chưa verify version, values và barrier
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={fence} onChange={(e) => setFence(e.target.checked)} />
            Store reject writer epoch cũ sau cutover
          </label>
          <div className="worksheet-inputs">
            <label>
              Migration step<output>{migration} / 6</output>
              <input
                type="range"
                min="0"
                max="6"
                value={migration}
                onChange={(e) => setMigration(+e.target.value)}
              />
            </label>
          </div>
          <ol className="platform-history">
            {migrationSteps.map((s, i) => (
              <li key={s} data-active={i === migration} data-past={i < migration}>
                <span>{i}</span>
                {s}
              </li>
            ))}
          </ol>
          <div className="platform-stores">
            <section>
              <h4>OLD</h4>
              <code>
                v{m.old.version} / {m.old.minor} minor
              </code>
            </section>
            <section>
              <h4>NEW</h4>
              <code>{m.next ? `v${m.next.version} / ${m.next.minor} minor` : 'NOT_COPIED'}</code>
            </section>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Read authority</dt>
              <dd>{m.cutover ? 'NEW' : 'OLD'}</dd>
            </div>
            <div>
              <dt>Amount đọc được / minor</dt>
              <dd>{m.readMinor ?? '—'}</dd>
            </div>
            <div>
              <dt>Authority epoch</dt>
              <dd>{m.epoch}</dd>
            </div>
            <div>
              <dt>Stale writer result</dt>
              <dd>{m.staleWrite}</dd>
            </div>
            <div>
              <dt>Unsafe cutover đã xảy ra?</dt>
              <dd>{m.premature ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Stores hiện khác nhau?</dt>
              <dd>{m.diverged ? 'YES' : 'NO'}</dd>
            </div>
          </dl>
          <p className="muted">
            Bước 5 cố ý chạy verification/repair trước khi thử cutover lần hai; sửa về sau không làm
            unsafe reads ở bước 4 biến mất. Production còn cần CDC ordering/dedup, deletion
            tombstones, schema compatibility, backfill completion, fencing tại mọi write sink và
            rollback contract.
          </p>
        </>
      )}
    </section>
  );
}
