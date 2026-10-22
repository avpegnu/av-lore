import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { chatArrivals, replayChat, routeChat } from '../lib/chat-models';
export default function ChatPlayground({ kind }: { kind: 'chat-routing' | 'chat-sync' }) {
  const ref = useIslandReady(),
    id = 'chat-lab-' + useId().replace(/:/g, '');
  const [phase, setPhase] = useState(0),
    [stale, setStale] = useState(false),
    [steps, setSteps] = useState(3),
    [sync, setSync] = useState(false);
  const routing = routeChat(phase, stale),
    replay = replayChat(steps, sync);
  return (
    <section className="handbook-experiment" ref={ref} aria-labelledby={id}>
      <span className="eyebrow">CHAT / CONNECTIONS AND RECOVERY</span>
      {kind === 'chat-routing' && (
        <>
          <h3 id={id}>Message tìm tới đúng device bằng cách nào?</h3>
          <p>
            Bob có phone và desktop. Chuyển từ online sang phone reconnect ở gateway khác, rồi cả
            hai offline. Registry là routing hint có thể cũ; message history mới là authority để
            khôi phục.
          </p>
          <div className="worksheet-inputs">
            <label>
              Connection phase<output>{phase}</output>
              <input
                type="range"
                min={0}
                max={2}
                value={phase}
                onChange={(e) => setPhase(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={stale} onChange={(e) => setStale(e.target.checked)} />
            Registry chưa nhận thay đổi
          </label>
          <div className="chat-routing-grid">
            <section>
              <h4>Actual sessions</h4>
              <ul>
                {routing.actual.map((s) => (
                  <li key={s.device}>
                    <code>
                      {s.device} → {s.gateway} / gen {s.generation}
                    </code>
                  </li>
                ))}
              </ul>
              {!routing.actual.length && <p>Không có socket online</p>}
            </section>
            <section>
              <h4>Registry snapshot</h4>
              <ul>
                {routing.registry.map((s) => (
                  <li key={s.device}>
                    <code>
                      {s.device} → {s.gateway} / gen {s.generation}
                    </code>
                  </li>
                ))}
              </ul>
              {!routing.registry.length && <p>Không có session trong registry</p>}
            </section>
          </div>
          <ol className="chat-route-results">
            {routing.routes.map((r) => (
              <li key={r.device}>
                <code>
                  {r.device} → {r.gateway} / gen {r.generation}
                </code>
                <strong>
                  {r.delivered ? 'Frame tới đúng session' : 'Routing cũ: không có session phù hợp'}
                </strong>
              </li>
            ))}
          </ol>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Online devices</dt>
              <dd>{routing.actual.length}</dd>
            </div>
            <div>
              <dt>Live deliveries</dt>
              <dd>{routing.delivered}</dd>
            </div>
            <div>
              <dt>Online devices missed</dt>
              <dd>{routing.missed}</dd>
            </div>
            <div>
              <dt>Stale route attempts</dt>
              <dd>{routing.routes.filter((r) => !r.delivered).length}</dd>
            </div>
          </dl>
          <p>
            Generation phân biệt session cũ/mới, giúp tránh disconnect cũ xóa session mới bằng
            compare-and-delete. Mô hình chỉ có một route snapshot: refresh/retry hoặc history sync
            khôi phục delivery; push chỉ đánh thức app, không thay durable history.
          </p>
        </>
      )}
      {kind === 'chat-sync' && (
        <>
          <h3 id={id}>Nhận seq 3 trước seq 2: cursor có được nhảy lên 3?</h3>
          <p>
            Log mẫu có 8 committed message với seq liên tiếp. Các frame live có thể trễ, trùng hoặc
            thiếu; kéo số lượt delivery rồi bật sync để đọc history sau contiguous cursor. Mỗi ô là
            một lần frame tới, không phải một message mới.
          </p>
          <div className="worksheet-inputs">
            <label>
              Live frame deliveries<output>{steps}</output>
              <input
                type="range"
                min={0}
                max={chatArrivals.length}
                value={steps}
                onChange={(e) => setSteps(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={sync} onChange={(e) => setSync(e.target.checked)} />
            Sync từ authoritative history
          </label>
          <ol className="chat-arrivals">
            {chatArrivals.map((seq, i) => (
              <li key={i} data-received={i < steps}>
                <span>#{i + 1}</span>
                <strong>seq {seq}</strong>
              </li>
            ))}
          </ol>
          <div className="chat-sync-lanes">
            <section>
              <h4>Displayed / contiguous</h4>
              <p className="chat-message-chips">
                {replay.displayed.length
                  ? replay.displayed.map((seq) => <code key={seq}>seq {seq}</code>)
                  : '—'}
              </p>
            </section>
            <section>
              <h4>Buffered / waiting for gap</h4>
              <p className="chat-message-chips">
                {replay.buffer.length
                  ? replay.buffer.map((seq) => <code key={seq}>seq {seq}</code>)
                  : '—'}
              </p>
            </section>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Contiguous cursor</dt>
              <dd>{replay.cursor}</dd>
            </div>
            <div>
              <dt>Highest received seq</dt>
              <dd>{replay.maxSeen}</dd>
            </div>
            <div>
              <dt>Duplicate frames ignored</dt>
              <dd>{replay.duplicates}</dd>
            </div>
            <div>
              <dt>Missing seq</dt>
              <dd>{replay.missing.join(', ') || '—'}</dd>
            </div>
          </dl>
          <p>
            Không ghi cursor bằng max(seq) khi còn gap. Sync có thể gặp lại seq đã buffer: dedup
            trước khi apply giúp UI không hiện hai lần. Ví dụ cố ý dùng committed seq liên tiếp; nếu
            allocator thực tế để lại hole, server cần cursor/skip marker hoặc log offset có
            semantics phù hợp, không chờ một seq sẽ không bao giờ tồn tại.
          </p>
        </>
      )}
    </section>
  );
}
