import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { checkoutInventory, cartMerge, checkoutIsolation } from '../lib/checkout-models';
export default function CheckoutPlayground({
  kind,
}: {
  kind: 'checkout-stock' | 'checkout-cart' | 'checkout-cells';
}) {
  const ref = useIslandReady(),
    id = 'checkout-' + useId().replace(/:/g, '');
  const [strategy, setStrategy] = useState<'naive' | 'decrement' | 'hold'>('hold'),
    [stage, setStage] = useState(6),
    [ttl, setTtl] = useState(5),
    [terminal, setTerminal] = useState(true),
    [late, setLate] = useState(true);
  const [policy, setPolicy] = useState<'union' | 'lww' | 'observed'>('observed'),
    [add, setAdd] = useState(false),
    [pruned, setPruned] = useState(false),
    [skew, setSkew] = useState(false);
  const [size, setSize] = useState(2),
    [poison, setPoison] = useState(2),
    [attempts, setAttempts] = useState(2),
    [shared, setShared] = useState(false);
  const inv = checkoutInventory(stage, strategy, ttl, terminal, late),
    cart = cartMerge(policy, add, pruned, skew),
    cells = checkoutIsolation(size, poison, attempts, shared);
  return (
    <section ref={ref} className="handbook-experiment checkout-playground" aria-labelledby={id}>
      <span className="eyebrow">CHECKOUT / HOLDS, MERGES AND ISOLATION</span>
      {kind === 'checkout-stock' && (
        <>
          <h3 id={id}>Ba units, hai lần expiry và một payment đến muộn</h3>
          <p>
            Fixture có 3 units và 6 buyers cùng đọc lúc t=0. h0 commit ở t=2; các hold còn lại hết
            hạn tại TTL; hai orders mới mua stock được release ở TTL+1. Authorization của h1 tới ở
            t=8; t=9 replay expiry. Đây là authorization hold giả lập, chưa capture money.
          </p>
          <div
            className="experiment-choices"
            role="group"
            aria-label="Inventory admission strategy"
          >
            {(['naive', 'decrement', 'hold'] as const).map((s) => (
              <button
                key={s}
                data-stock={s}
                aria-pressed={s === strategy}
                onClick={() => setStrategy(s)}
              >
                {s === 'naive'
                  ? 'Read then write'
                  : s === 'decrement'
                    ? 'Atomic decrement'
                    : 'Atomic hold + expiry'}
              </button>
            ))}
          </div>
          <div className="worksheet-inputs">
            <label>
              History step<output>{stage} / 6</output>
              <input
                type="range"
                min="0"
                max="6"
                value={stage}
                onChange={(e) => setStage(+e.target.value)}
              />
            </label>
            <label>
              Hold TTL<output>{ttl} ticks</output>
              <input
                type="range"
                min="3"
                max="6"
                value={ttl}
                onChange={(e) => setTtl(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={terminal}
              onChange={(e) => setTerminal(e.target.checked)}
            />
            Release chỉ khi hold còn ACTIVE, cùng transaction với stock
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={late} onChange={(e) => setLate(e.target.checked)} />
            Late auth phải kiểm current hold/generation trước commit
          </label>
          <ol className="platform-history">
            {[
              '0 / Initial',
              '1 / Concurrent reserve',
              '2 / h0 commits',
              '3 / Expire unpaid holds',
              '4 / New orders buy released units',
              '5 / Late authorization h1',
              '6 / Replayed expiry',
            ].map((s, i) => (
              <li key={s} data-active={i === stage} data-past={i < stage}>
                {s}
              </li>
            ))}
          </ol>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Authoritative available</dt>
              <dd>{inv.available}</dd>
            </div>
            <div>
              <dt>Committed units</dt>
              <dd>{inv.sold}</dd>
            </div>
            <div>
              <dt>Active held units</dt>
              <dd>{inv.held}</dd>
            </div>
            <div>
              <dt>Oversold units</dt>
              <dd>{inv.oversold}</dd>
            </div>
            <div>
              <dt>Conservation delta</dt>
              <dd>{inv.conservationDelta}</dd>
            </div>
            <div>
              <dt>Late auth void pending</dt>
              <dd>{inv.voids}</dd>
            </div>
          </dl>
          <div className="checkout-claims">
            {inv.claims.map((c) => (
              <article key={c.id}>
                <strong>{c.id}</strong>
                <p>{c.state}</p>
              </article>
            ))}
          </div>
          <p>
            <code>{inv.history.join(' → ') || '—'}</code>
          </p>
          <p className="muted">
            Conservation: available + active held + committed = 3. Giữ delta 0 chưa đủ chứng minh
            đúng order ownership. Late external success không tự biến thành decline: không cấp stock
            đã release, giữ void/reconciliation intent; nếu đã capture thì cần refund policy riêng.
            Expiry là conditional transition, không phải xóa row rồi tăng stock vô điều kiện.
          </p>
        </>
      )}
      {kind === 'checkout-cart' && (
        <>
          <h3 id={id}>Một item quay lại là bug hay concurrent add hợp lệ?</h3>
          <p>
            Ban đầu book có tag b1, pen có p1. Device A remove b1 và add mug mA. Device B offline
            còn b1/p1; có thể add book bằng tag mới b2. Lab chỉ mô phỏng membership, không gán
            semantics quantity/price.
          </p>
          <div className="experiment-choices" role="group" aria-label="Cart merge policy">
            {(['union', 'lww', 'observed'] as const).map((s) => (
              <button
                key={s}
                data-cart={s}
                aria-pressed={s === policy}
                onClick={() => setPolicy(s)}
              >
                {s === 'union'
                  ? 'Naive union'
                  : s === 'lww'
                    ? 'Whole-cart LWW'
                    : 'Observed-remove tags'}
              </button>
            ))}
          </div>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={add} onChange={(e) => setAdd(e.target.checked)} />
            Device B add book bằng fresh tag b2
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={pruned} onChange={(e) => setPruned(e.target.checked)} />
            Prune remove tombstone trước khi offline replica sync
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={skew} onChange={(e) => setSkew(e.target.checked)} />
            Clock B thắng LWW dù snapshot cũ hơn thao tác A
          </label>
          <div className="checkout-cart-branches">
            <article>
              <strong>Device A</strong>
              <p>{cart.a.join(', ')}</p>
              <p>REMOVE b1</p>
            </article>
            <article>
              <strong>Device B</strong>
              <p>{cart.b.join(', ')}</p>
              <p>Offline snapshot</p>
            </article>
            <article>
              <strong>Merged</strong>
              <p>{cart.tags.join(', ')}</p>
              <p>{cart.items.join(', ')}</p>
            </article>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Old removed book resurrected?</dt>
              <dd>{cart.resurrected ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Concurrent new book retained?</dt>
              <dd>{add && cart.book ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Mug add lost?</dt>
              <dd>{cart.mugLost ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Retained removed tags</dt>
              <dd>{cart.removed.join(', ') || '—'}</dd>
            </div>
          </dl>
          <p className="muted">
            Observed-remove xóa tags đã thấy; concurrent fresh add có thể sống theo add-wins
            contract. Remove-all semantics cần thiết kế khác. Tombstone GC cần causal
            stability/offline horizon hoặc epoch resync; max wall-clock không thay causality.
            Checkout phải revalidate price, quantity, eligibility và stock từ authorities, không
            charge trực tiếp merged cart.
          </p>
        </>
      )}
      {kind === 'checkout-cells' && (
        <>
          <h3 id={id}>Shuffle sharding cần retry và dependency boundary rõ</h3>
          <p>
            Tám workers; tenant được gán k workers khác nhau. Một fault làm p workers đầu
            unavailable. Fixture duyệt mọi subset đồng xác suất và tính failure của request khi thử
            distinct workers theo random order, tối đa a attempts. Không tính latency, correlated
            failures hoặc traffic weights.
          </p>
          <div className="worksheet-inputs">
            <label>
              Workers / tenant<output>{size}</output>
              <input
                type="range"
                min="1"
                max="4"
                value={size}
                onChange={(e) => setSize(+e.target.value)}
              />
            </label>
            <label>
              Unavailable workers<output>{poison}</output>
              <input
                type="range"
                min="1"
                max="4"
                value={poison}
                onChange={(e) => setPoison(+e.target.value)}
              />
            </label>
            <label>
              Max distinct attempts<output>{attempts}</output>
              <input
                type="range"
                min="1"
                max="4"
                value={attempts}
                onChange={(e) => setAttempts(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
            Shared required dependency bị lỗi cho mọi workers
          </label>
          <div className="checkout-worker-map">
            {Array.from({ length: 8 }, (_, i) => (
              <article key={i} data-failed={i < poison || shared}>
                <strong>W{i}</strong>
                <p>{i < poison || shared ? 'DOWN' : 'UP'}</p>
              </article>
            ))}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Possible tenant subsets</dt>
              <dd>{cells.subsets}</dd>
            </div>
            <div>
              <dt>Fully unavailable subsets</dt>
              <dd>{cells.fullyUnavailable}</dd>
            </div>
            <div>
              <dt>Partially overlapping subsets</dt>
              <dd>{cells.partialOverlap}</dd>
            </div>
            <div>
              <dt>Expected failed requests</dt>
              <dd>{cells.expectedFailedPercent.toFixed(2)}%</dd>
            </div>
            <div>
              <dt>Effective max attempts</dt>
              <dd>{cells.effective}</dd>
            </div>
          </dl>
          <p className="muted">
            Default k=2, p=2: 1/28 subsets mất cả hai workers, nhưng một attempt random vẫn có 25%
            failure. Thử cả hai distinct workers giảm expected failure xuống 1/28 dưới giả định
            fixture, đổi lại retry cost. Cell architecture còn cần independent data/dependencies và
            simple stable router; nhiều boxes dùng chung một failing authority chưa có isolation.
          </p>
        </>
      )}
    </section>
  );
}
