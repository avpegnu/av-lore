import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { propertyHistory, canvasRecovery, metadataRefill } from '../lib/design-canvas-models';
export default function DesignCanvasPlayground({
  kind,
}: {
  kind: 'design-properties' | 'design-recovery' | 'design-refill';
}) {
  const ref = useIslandReady(),
    id = 'design-' + useId().replace(/:/g, '');
  const [step, setStep] = useState(4),
    [whole, setWhole] = useState(false),
    [guard, setGuard] = useState(true);
  const [through, setThrough] = useState(5),
    [gap, setGap] = useState(false),
    [contiguous, setContiguous] = useState(true),
    [durable, setDurable] = useState(true);
  const [refillStep, setRefillStep] = useState(3),
    [generation, setGeneration] = useState(true),
    [miss, setMiss] = useState(false),
    [barrier, setBarrier] = useState(false);
  const props = propertyHistory(step, whole, guard),
    recovery = canvasRecovery(through, gap, contiguous, durable),
    cache = metadataRefill(refillStep, generation, miss, barrier);
  return (
    <section ref={ref} className="handbook-experiment design-playground" aria-labelledby={id}>
      <span className="eyebrow">DESIGN CANVAS / STATE AND RECOVERY</span>
      {kind === 'design-properties' && (
        <>
          <h3 id={id}>Cùng hội tụ vẫn có thể mất thay đổi</h3>
          <p>
            A đổi x hai lần: A1=80 rồi A2=160. B đổi fill thành blue. Server nhận B1, A1, A2 theo
            thứ tự đó. Kéo từng bước để thấy ACK cũ không được xóa pending A2; so sánh property
            patches với việc gửi toàn bộ object cũ.
          </p>
          <div className="worksheet-inputs">
            <label>
              History step<output>{step} / 6</output>
              <input
                type="range"
                min="0"
                max="6"
                value={step}
                onChange={(e) => setStep(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={whole} onChange={(e) => setWhole(e.target.checked)} />
            Gửi toàn bộ object thay cho property patch
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={guard} onChange={(e) => setGuard(e.target.checked)} />
            Giữ pending mới hơn khi nhận echo cũ
          </label>
          <ol className="platform-history">
            {[
              '0 / Local A1, A2, B1',
              '1 / Server B1',
              '2 / Broadcast B1',
              '3 / Server A1',
              '4 / Echo A1 ≠ ACK A2',
              '5 / Server A2',
              '6 / Broadcast A2',
            ].map((label, i) => (
              <li key={label} data-active={step === i} data-past={step > i}>
                {label}
              </li>
            ))}
          </ol>
          <div className="design-replicas">
            {[
              ['A', props.clients.A],
              ['SERVER', props.server],
              ['B', props.clients.B],
            ].map(([label, s]) => {
              const shape = s as typeof props.server;
              return (
                <article key={String(label)}>
                  <strong>{String(label)}</strong>
                  <div
                    className="design-mini-canvas"
                    role="img"
                    aria-label={String(label) + ' x=' + shape.x + ' fill=' + shape.fill}
                  >
                    <i data-fill={shape.fill} style={{ left: (shape.x / 200) * 70 + '%' }} />
                  </div>
                  <p>
                    x={shape.x} · fill={shape.fill}
                  </p>
                </article>
              );
            })}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>A pending x</dt>
              <dd>{props.pending.A.x || '—'}</dd>
            </div>
            <div>
              <dt>Pending view overwritten</dt>
              <dd>{props.rollbacks}</dd>
            </div>
            <div>
              <dt>Independent fill lost</dt>
              <dd>{props.lostIndependentFill ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Converged after all echoes</dt>
              <dd>{props.converged ? 'YES' : 'NO'}</dd>
            </div>
          </dl>
          <p className="muted">
            Thứ tự ở server là authority của fixture, không phải wall clock. Guard chỉ bảo vệ hiển
            thị trong khi chờ ACK đúng identity; không biến local edit thành durable commit. Lab
            không xử lý text sequences, delete, undo, reconnect hay split-brain.
          </p>
        </>
      )}
      {kind === 'design-recovery' && (
        <>
          <h3 id={id}>Accepted, durable và recovered là ba mốc khác nhau</h3>
          <p>
            Checkpoint có seq=3, x=30, fill=gray. Edit 4 đổi fill=blue; edit 5 đổi x=50; edit 6 đổi
            x=60. Server đã nhận đến 6 rồi crash. Chọn journal đã durable tới đâu; có thể giả lập
            mất entry 4 sau đó để kiểm tra recovery khi journal bị hở.
          </p>
          <div className="worksheet-inputs">
            <label>
              Durable journal prefix<output>{through}</output>
              <input
                type="range"
                min="3"
                max="6"
                value={through}
                onChange={(e) => setThrough(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={gap} onChange={(e) => setGap(e.target.checked)} />
            Entry 4 bị mất sau khi đã ghi journal
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={contiguous}
              onChange={(e) => setContiguous(e.target.checked)}
            />
            Dừng replay nếu sequence không liên tục
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={durable}
              onChange={(e) => setDurable(e.target.checked)}
            />
            Chỉ durable ACK tới journal prefix
          </label>
          <div className="design-journal">
            {[3, 4, 5, 6].map((n) => (
              <article
                key={n}
                data-present={n === 3 || recovery.entries.some((e) => e.sequence === n)}
              >
                <strong>
                  {n === 3 ? 'SNAPSHOT' : 'EDIT'} {n}
                </strong>
                <span>
                  {n === 3 ? 'x30 / gray' : n === 4 ? 'fill blue' : n === 5 ? 'x50' : 'x60'}
                </span>
                <small>
                  {n === 3
                    ? 'CHECKPOINT'
                    : recovery.applied.includes(n)
                      ? 'REPLAYED'
                      : recovery.entries.some((e) => e.sequence === n)
                        ? 'BLOCKED'
                        : 'MISSING'}
                </small>
              </article>
            ))}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Accepted / ACK prefix</dt>
              <dd>6 / {recovery.ackThrough}</dd>
            </div>
            <div>
              <dt>Recovered cursor</dt>
              <dd>{recovery.recoveredThrough}</dd>
            </div>
            <div>
              <dt>Recovered shape</dt>
              <dd>
                {recovery.state.x} / {recovery.state.fill}
              </dd>
            </div>
            <div>
              <dt>ACKed edits not recovered</dt>
              <dd>{recovery.unrecoveredAcked.join(', ') || '—'}</dd>
            </div>
            <div>
              <dt>Safe recovery evidence</dt>
              <dd>{recovery.safeToServe ? 'YES' : 'REPAIR'}</dd>
            </div>
          </dl>
          <p className="muted">
            Mất entry đã durable là giả định lỗi storage/retention, không phải crash RAM bình
            thường. Cursor lớn nhất không chứng minh mọi edit trước đó đã replay. REPAIR yêu cầu tìm
            nguồn bù đáng tin hoặc báo recovery failure; không tự tạo entry còn thiếu. Với async
            journal, accepted edit chưa durable có thể mất dù UI từng nhìn thấy.
          </p>
        </>
      )}
      {kind === 'design-refill' && (
        <>
          <h3 id={id}>Invalidation không tự chặn một refill cũ</h3>
          <p>
            Fetch metadata bắt đầu ở version 10. Mutation commit version 11; invalidation tới trong
            lúc fetch cũ còn chạy. Nếu response cũ được cài lại sau invalidation, cache lại stale.
            Generation token có thể chặn race đó; một verified barrier riêng giúp phát hiện
            notification bị mất.
          </p>
          <div className="worksheet-inputs">
            <label>
              Refill history step<output>{refillStep} / 4</output>
              <input
                type="range"
                min="0"
                max="4"
                value={refillStep}
                onChange={(e) => setRefillStep(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={generation}
              onChange={(e) => setGeneration(e.target.checked)}
            />
            Kiểm tra generation trước khi install response
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={miss} onChange={(e) => setMiss(e.target.checked)} />
            Làm mất invalidation version 11
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={barrier}
              onChange={(e) => setBarrier(e.target.checked)}
            />
            Có verified read barrier version 11
          </label>
          <ol className="platform-history">
            {[
              '0 / Fetch begins at v10',
              '1 / Mutation commits v11',
              '2 / Invalidation arrives or is lost',
              '3 / Old fetch completes',
              '4 / Retry if rejected',
            ].map((label, i) => (
              <li key={label} data-active={refillStep === i} data-past={refillStep > i}>
                {label}
              </li>
            ))}
          </ol>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Cache generation</dt>
              <dd>{cache.generation}</dd>
            </div>
            <div>
              <dt>Visible metadata</dt>
              <dd>{cache.visible}</dd>
            </div>
            <div>
              <dt>Installed version</dt>
              <dd>{cache.cachedVersion ?? '—'}</dd>
            </div>
            <div>
              <dt>Repair reads</dt>
              <dd>{cache.repairRequests}</dd>
            </div>
          </dl>
          <p className="muted">
            Barrier là bằng chứng version đã xác minh được cung cấp riêng trong fixture, không phải
            hệ thống tự biết mọi update bị mất. Production cần snapshot/CDC handoff, replay hoặc
            resubscribe khi cursor hết hạn, authorization tại read/push và cache key theo
            tenant/principal/query. Một sequence không tạo global order giữa nhiều database shards.
          </p>
        </>
      )}
    </section>
  );
}
