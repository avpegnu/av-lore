import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { nearbyFanout, nearbyView, nearbyPeople, nearbyRecovery } from '../lib/nearby-models';
const eventNames: Record<string, string> = {
  initial: 'Nhận fix đầu của epoch 4',
  revoke: 'Tắt chia sẻ; removal notice bị mất',
  'delayed-old-epoch': 'Delayed fix từ consent epoch cũ',
  enable: 'Bật lại với epoch 6; chưa có fix mới',
  'new-epoch': 'Nhận fix mới của epoch 6',
  'older-sequence': 'Nhận sequence cũ trong epoch 6',
};
const outcomeNames: Record<string, string> = {
  'notice-lost': 'Notice bị mất',
  'no-new-fix': 'Chưa gửi vị trí mới',
  blocked: 'Bị chặn',
  forwarded: 'Đã forward tới viewer',
};
export default function NearbyPlayground({
  kind,
}: {
  kind: 'nearby-fanout' | 'nearby-viewer' | 'nearby-recovery';
}) {
  const ref = useIslandReady(),
    id = 'nearby-' + useId().replace(/:/g, '');
  const [friends, setFriends] = useState(40),
    [devices, setDevices] = useState(1),
    [gateways, setGateways] = useState(8),
    [interval, setIntervalSeconds] = useState(30),
    [viewerX, setViewerX] = useState(2),
    [radius, setRadius] = useState(2),
    [recompute, setRecompute] = useState(true),
    [clock, setClock] = useState(20),
    [guard, setGuard] = useState(true),
    [expire, setExpire] = useState(true);
  const f = nearbyFanout(friends, devices, gateways, interval),
    v = nearbyView(viewerX, radius, recompute),
    r = nearbyRecovery(clock, guard, expire),
    fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 }),
    coord = (n: number) => 50 + n * 50;
  return (
    <section className="handbook-experiment nearby-playground" ref={ref} aria-labelledby={id}>
      <span className="eyebrow">NEARBY / AUDIENCE, MOVEMENT AND REVOCATION</span>
      {kind === 'nearby-fanout' && (
        <>
          <h3 id={id}>Một publisher update tạo bao nhiêu bản sao?</h3>
          <p>
            Mô hình đặt các online friend devices lần lượt lên gateways bằng round-robin. Direct
            subscription gửi một bản tới mỗi connection; gateway multiplexing gửi một bản tới mỗi
            gateway có viewers rồi fan-out local. Rates bên dưới giả định 10 triệu active publishers
            cùng phân bố này; không phải benchmark capacity.
          </p>
          <div className="worksheet-inputs">
            <label>
              Friends online được phép xem<output>{friends}</output>
              <input
                type="range"
                min="1"
                max="100"
                value={friends}
                onChange={(e) => setFriends(+e.target.value)}
              />
            </label>
            <label>
              Devices mỗi friend<output>{devices}</output>
              <input
                type="range"
                min="1"
                max="3"
                value={devices}
                onChange={(e) => setDevices(+e.target.value)}
              />
            </label>
            <label>
              Số gateway nhận viewers<output>{gateways}</output>
              <input
                type="range"
                min="1"
                max="40"
                value={gateways}
                onChange={(e) => setGateways(+e.target.value)}
              />
            </label>
            <label>
              Chu kỳ publish / giây<output>{interval}</output>
              <input
                type="range"
                min="10"
                max="120"
                step="10"
                value={interval}
                onChange={(e) => setIntervalSeconds(+e.target.value)}
              />
            </label>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Updates vào / giây</dt>
              <dd>{fmt(f.updatesPerSecond)}</dd>
            </div>
            <div>
              <dt>Broker copies khi direct / update</dt>
              <dd>{f.connections}</dd>
            </div>
            <div>
              <dt>Broker copies khi multiplex / update</dt>
              <dd>{f.used}</dd>
            </div>
            <div>
              <dt>Audience checks local / update</dt>
              <dd>{f.connections}</dd>
            </div>
            <div>
              <dt>Logical checks / giây</dt>
              <dd>{fmt(f.logicalPerSecond)}</dd>
            </div>
            <div>
              <dt>Broker copies khi multiplex / giây</dt>
              <dd>{fmt(f.brokerPerSecond)}</dd>
            </div>
          </dl>
          <div className="nearby-gateways">
            {Array.from({ length: f.used }, (_, g) => {
              const count = f.placement.filter((x) => x === g).length;
              return (
                <section key={g}>
                  <h4>Gateway {g}</h4>
                  <strong>{count}</strong>
                  <p>kết nối viewer</p>
                  <div style={{ width: `${(count / f.connections) * 100}%` }} />
                </section>
              );
            })}
          </div>
          <p>
            Giảm network copies không xóa local distance/permission checks, socket sends hoặc TLS
            cost. Cần ref-count subscriptions theo gateway/publisher, policy isolation và bounded
            send queues. Real placement có skew; round-robin trong lab không dự đoán hot-user
            distribution hoặc server sizing.
          </p>
        </>
      )}
      {kind === 'nearby-viewer' && (
        <>
          <h3 id={id}>Viewer di chuyển dù friends không gửi update mới</h3>
          <p>
            Positions là km trên mặt phẳng 10 ×10, tất cả eligible fixes được giữ fresh để tách
            riêng lỗi recompute. Audience chỉ gồm friends đang cho phép chia sẻ. Viewer bắt đầu ở
            (2,5); tắt recompute giữ bộ lọc tại vị trí cũ để lộ missed entry và stale dot.
          </p>
          <div className="worksheet-inputs">
            <label>
              Viewer X / km<output>{viewerX}</output>
              <input
                type="range"
                min="1"
                max="9"
                value={viewerX}
                onChange={(e) => setViewerX(+e.target.value)}
              />
            </label>
            <label>
              Bán kính / km<output>{radius}</output>
              <input
                type="range"
                min="1"
                max="4"
                value={radius}
                onChange={(e) => setRadius(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={recompute}
              onChange={(e) => setRecompute(e.target.checked)}
            />
            Recompute khi viewer di chuyển
          </label>
          <div
            className="nearby-map"
            tabIndex={0}
            role="region"
            aria-label="Synthetic authorized friend positions"
          >
            <svg
              viewBox="0 0 620 625"
              role="img"
              aria-label="Viewer radius and eligible friend positions"
            >
              <title>Recompute distances when either side moves</title>
              <defs>
                <clipPath id={id + '-bounds'}>
                  <rect x="50" y="50" width="500" height="500" />
                </clipPath>
              </defs>
              <rect x="50" y="50" width="500" height="500" className="nearby-world" />
              {[0, 2, 4, 6, 8, 10].map((n) => (
                <g key={n}>
                  <line x1={coord(n)} x2={coord(n)} y1="50" y2="550" className="metrics-grid" />
                  <line
                    x1="50"
                    x2="550"
                    y1={550 - n * 50}
                    y2={550 - n * 50}
                    className="metrics-grid"
                  />
                  <text x={coord(n)} y="578" textAnchor="middle">
                    {n}
                  </text>
                  <text x="35" y={555 - n * 50} textAnchor="end">
                    {n}
                  </text>
                </g>
              ))}
              <circle
                cx={coord(viewerX)}
                cy="300"
                r={radius * 50}
                className="nearby-radius"
                clipPath={`url(#${id}-bounds)`}
              />
              {nearbyPeople.map((p) => (
                <g
                  key={p.id}
                  className="nearby-person"
                  data-allowed={p.friend && p.sharing}
                  data-shown={v.shown.some((x) => x.id === p.id)}
                >
                  <circle cx={coord(p.x)} cy={550 - p.y * 50} r="16" />
                  <text x={coord(p.x)} y={525 - p.y * 50} textAnchor="middle">
                    {p.id}
                  </text>
                  {(!p.friend || !p.sharing) && (
                    <line
                      x1={coord(p.x) - 13}
                      x2={coord(p.x) + 13}
                      y1={537 - p.y * 50}
                      y2={563 - p.y * 50}
                      className="nearby-excluded"
                    />
                  )}
                </g>
              ))}
              <path d={`M${coord(viewerX)} 280 l20 20 l-20 20 l-20 -20 Z`} className="nearby-me" />
              <text x={coord(viewerX)} y="305" textAnchor="middle">
                ME
              </text>
              <text x="50" y="612">
                Synthetic km / eligible friends A, B, C, D, G
              </text>
            </svg>
          </div>
          <p className="maps-pan-hint">
            ↔ Trên màn hình nhỏ, có thể cuộn ngang sơ đồ; vùng sơ đồ nhận focus để cuộn bằng bàn
            phím. Các kết quả và transcript bên dưới vẫn đọc được theo chiều dọc.
          </p>
          <p>
            Circle có nét đứt là radius hiện tại; marker gạch chéo không thuộc authorized audience.
            Friends có viền đậm đang hiển thị theo policy đã chọn. Không có strangers trong kết quả,
            dù E nằm rất gần viewer.
          </p>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Candidates được phép xem</dt>
              <dd>{v.audience.length}</dd>
            </div>
            <div>
              <dt>Friends thực sự trong radius</dt>
              <dd>{v.trueNear.length}</dd>
            </div>
            <div>
              <dt>Friends đang hiển thị</dt>
              <dd>{v.shown.length}</dd>
            </div>
            <div>
              <dt>Entries bị bỏ sót</dt>
              <dd>{v.missed.length}</dd>
            </div>
            <div>
              <dt>Dots đã ở ngoài radius</dt>
              <dd>{v.falseNear.length}</dd>
            </div>
          </dl>
          <details>
            <summary>Candidate distance và membership</summary>
            <ul>
              {v.audience.map((p) => (
                <li key={p.id}>
                  {p.id}: {Math.hypot(p.x - viewerX, p.y - 5).toFixed(2)} km / shown{' '}
                  {v.shown.some((x) => x.id === p.id) ? 'YES' : 'NO'} / expected{' '}
                  {v.trueNear.some((x) => x.id === p.id) ? 'YES' : 'NO'}
                </li>
              ))}
            </ul>
          </details>
          <p>
            Trong hệ thống thật, cần giữ đủ authorized candidate positions hoặc có discovery/recheck
            nếu prune far-away subscriptions. Chỉ subscribe các friends gần vị trí cũ mà không có cơ
            chế bổ sung có thể bỏ lỡ friend vừa tới gần. Accuracy và near-boundary hysteresis là
            policy thêm, chưa mô phỏng ở đây.
          </p>
        </>
      )}
      {kind === 'nearby-recovery' && (
        <>
          <h3 id={id}>Lost removal không được biến thành quyền gửi tiếp</h3>
          <p>
            Timeline có authority policy trong một process: epoch 4 chia sẻ, t10 tắt sang epoch 5,
            t30 bật lại với epoch 6. Removal notice tại t10 bị mất. Guard kiểm current policy/epoch
            và sequence trước forward; expiry là timer riêng cho bản sao đã nhận. Distributed
            deployment cần thêm contract về revocation barriers hoặc lease bounds.
          </p>
          <div className="worksheet-inputs">
            <label>
              Thời điểm replay / giây<output>{clock}</output>
              <input
                type="range"
                min="0"
                max="80"
                value={clock}
                onChange={(e) => setClock(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={guard} onChange={(e) => setGuard(e.target.checked)} />
            Guard policy epoch và monotonic sequence
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={expire} onChange={(e) => setExpire(e.target.checked)} />
            Client kiểm explicit expiresAt
          </label>
          <div className="nearby-state">
            <section>
              <h4>Quyền tại authority</h4>
              <strong>{r.enabled ? 'ENABLED' : 'DISABLED'}</strong>
              <p>Epoch {r.epoch}</p>
            </section>
            <section>
              <h4>Bản sao client đã nhận</h4>
              <strong>{r.visible ? 'VISIBLE' : 'HIDDEN'}</strong>
              <p>
                Epoch {r.displayed?.epoch ?? '—'} / seq {r.displayed?.seq ?? '—'}
              </p>
              <p>
                Observed {r.displayed?.observedAt ?? '—'} / expiresAt{' '}
                {r.displayed?.expiresAt ?? '—'}
              </p>
            </section>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Frames bị chặn</dt>
              <dd>{r.blocked}</dd>
            </div>
            <div>
              <dt>Forwards không có quyền</dt>
              <dd>{r.leaks}</dd>
            </div>
            <div>
              <dt>Lần sequence đi lùi</dt>
              <dd>{r.regressions}</dd>
            </div>
          </dl>
          <ol className="nearby-events">
            {r.rows.map((e, i) => (
              <li key={i}>
                <strong>t{e.time}</strong>
                <span>{eventNames[e.event]}</span>
                <span>{outcomeNames[e.outcome]}</span>
              </li>
            ))}
          </ol>
          <p>
            Ở t20, guard có thể chặn delayed frame mới nhưng bản sao t0 đã nhận vẫn hiển thị tới
            expiresAt =30 khi removal notice mất. Revocation không thể thu hồi screenshots hoặc xóa
            trí nhớ của recipient. Timer chỉ giới hạn stale UI; quyền truy cập mới phải được chặn ở
            server. Tắt expiry để thấy key TTL ở backend không tự xóa dot trên client.
          </p>
        </>
      )}
    </section>
  );
}
