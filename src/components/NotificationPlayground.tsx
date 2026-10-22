import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  notificationCrash,
  notificationPipeline,
  notificationChannels,
  notificationInputs,
  type SendPolicy,
} from '../lib/notification-models';
export default function NotificationPlayground({
  kind,
}: {
  kind: 'notification-crash' | 'notification-pipeline';
}) {
  const ref = useIslandReady(),
    id = 'notification-' + useId().replace(/:/g, '');
  const [cut, setCut] = useState(1),
    [policy, setPolicy] = useState<SendPolicy>('retry');
  const [enabled, setEnabled] = useState({ push: true, sms: false, email: true }),
    [marketing, setMarketing] = useState(true),
    [cap, setCap] = useState(2),
    [failures, setFailures] = useState(1),
    [retries, setRetries] = useState(2);
  const crash = notificationCrash(cut, policy),
    pipeline = notificationPipeline({ enabled, marketing, cap, maxRetries: retries, failures });
  return (
    <section className="handbook-experiment" ref={ref} aria-labelledby={id}>
      <span className="eyebrow">NOTIFICATIONS / INTENT, PROVIDER AND EVIDENCE</span>
      {kind === 'notification-crash' && (
        <>
          <h3 id={id}>Provider đã nhận, worker chết trước khi ghi status</h3>
          <p>
            Durable intent đã tồn tại. Chọn crash boundary rồi retry cùng delivery intent. Mô hình
            provider-key giả định provider thật sự giữ idempotency key đủ lâu, cùng payload và cùng
            provider; đây không phải collapse key của push.
          </p>
          <div className="worksheet-inputs">
            <label>
              Crash boundary<output>{cut}</output>
              <input
                type="range"
                min={0}
                max={2}
                value={cut}
                onChange={(e) => setCut(+e.target.value)}
              />
            </label>
          </div>
          <ol className="notification-boundaries">
            {[
              'Before provider call',
              'Provider accepted / local status missing',
              'Local acceptance recorded',
            ].map((text, i) => (
              <li key={text} aria-current={cut === i ? 'step' : undefined}>
                <span>{i}</span>
                <strong>{text}</strong>
              </li>
            ))}
          </ol>
          <div className="worksheet-choices">
            {(['retry', 'pre-mark', 'provider-key'] as const).map((p) => (
              <button
                type="button"
                className="secondary"
                key={p}
                aria-pressed={policy === p}
                onClick={() => setPolicy(p)}
              >
                {p === 'retry'
                  ? 'Retry unresolved intent'
                  : p === 'pre-mark'
                    ? 'Mark complete before call'
                    : 'Provider idempotency key'}
              </button>
            ))}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Total provider calls</dt>
              <dd>{crash.providerCalls}</dd>
            </div>
            <div>
              <dt>Distinct provider acceptances</dt>
              <dd>{crash.acceptances}</dd>
            </div>
            <div>
              <dt>Duplicate acceptances</dt>
              <dd>{crash.duplicateAcceptances}</dd>
            </div>
            <div>
              <dt>Missing provider acceptance</dt>
              <dd>{crash.lost ? 1 : 0}</dd>
            </div>
          </dl>
          <p>
            Check local status trước khi send không giải quyết crash window giữa provider và
            database. Pre-mark có thể bỏ mất send ở boundary 0; retry không có provider dedup có thể
            tạo hai acceptance ở boundary 1. Provider acceptance chưa chứng minh device nhận hay
            người dùng đọc.
          </p>
        </>
      )}
      {kind === 'notification-pipeline' && (
        <>
          <h3 id={id}>Replay pipeline: dedup, preferences, cap và retry</h3>
          <p>
            Toàn bộ stream mẫu được replay từ đầu mỗi khi đổi cấu hình, không phải traffic
            production. Có 8 input và 6 event ID khác nhau cho cùng recipient. Mỗi delivery gặp đúng
            N lỗi transient trước khi provider có thể accept; retry không tiêu thêm marketing
            admission slot.
          </p>
          <p>
            <code>{notificationInputs.join(' → ')}</code>
          </p>
          <div className="worksheet-inputs">
            <label>
              Marketing admission cap / channel<output>{cap}</output>
              <input
                type="range"
                min={1}
                max={6}
                value={cap}
                onChange={(e) => setCap(+e.target.value)}
              />
            </label>
            <label>
              Transient failures before acceptance<output>{failures}</output>
              <input
                type="range"
                min={0}
                max={3}
                value={failures}
                onChange={(e) => setFailures(+e.target.value)}
              />
            </label>
            <label>
              Max retries after first attempt<output>{retries}</output>
              <input
                type="range"
                min={0}
                max={3}
                value={retries}
                onChange={(e) => setRetries(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
            />
            Marketing: áp dụng admission cap
          </label>
          <div className="worksheet-choices">
            {notificationChannels.map((channel) => (
              <button
                type="button"
                key={channel}
                className="secondary"
                aria-pressed={enabled[channel]}
                onClick={() => setEnabled((c) => ({ ...c, [channel]: !c[channel] }))}
              >
                {channel}
              </button>
            ))}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Duplicate inputs removed</dt>
              <dd>{pipeline.duplicates}</dd>
            </div>
            <div>
              <dt>Preference suppressed / deliveries</dt>
              <dd>{pipeline.suppressed}</dd>
            </div>
            <div>
              <dt>Cap blocked / deliveries</dt>
              <dd>{pipeline.capped}</dd>
            </div>
            <div>
              <dt>Provider calls incl. retries</dt>
              <dd>{pipeline.providerCalls}</dd>
            </div>
            <div>
              <dt>Provider accepted / deliveries</dt>
              <dd>{pipeline.accepted}</dd>
            </div>
            <div>
              <dt>Retry exhausted / DLQ</dt>
              <dd>{pipeline.dlq}</dd>
            </div>
          </dl>
          <ul className="notification-deliveries">
            {pipeline.rows.map((r) => (
              <li key={r.event + r.channel}>
                <code>
                  {r.event} / {r.channel}
                </code>
                <strong>{r.outcome}</strong>
                <span>calls: {r.calls}</span>
              </li>
            ))}
          </ul>
          <p>
            Cap ở đây đếm intent được admit theo channel, kể cả intent cuối cùng vào DLQ; nó không
            phải số người đã đọc. Transactional bỏ qua cap mẫu nhưng vẫn tuân preferences trong mô
            hình. Production cần policy riêng theo category/consent, expiry và re-check trước send.
          </p>
        </>
      )}
    </section>
  );
}
