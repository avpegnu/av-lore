import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  pickupAssignment,
  tripClaims,
  locationProjection,
  type MatchPolicy,
} from '../lib/ride-platform-models';
export default function RidePlatformPlayground({
  kind,
}: {
  kind: 'ride-match' | 'ride-claims' | 'ride-location';
}) {
  const ref = useIslandReady(),
    id = 'ride-' + useId().replace(/:/g, '');
  const [scenario, setScenario] = useState(0),
    [policy, setPolicy] = useState<MatchPolicy>('greedy'),
    [batch, setBatch] = useState(0),
    [busy, setBusy] = useState(false),
    [reverse, setReverse] = useState(false);
  const [step, setStep] = useState(5),
    [driverGuard, setDriverGuard] = useState(true),
    [offerGuard, setOfferGuard] = useState(true);
  const [count, setCount] = useState(5),
    [now, setNow] = useState(20),
    [sequence, setSequence] = useState(true),
    [ttl, setTtl] = useState(true),
    [cleanup, setCleanup] = useState(true);
  const match = pickupAssignment(scenario, policy, batch, busy, reverse),
    claims = tripClaims(step, driverGuard, offerGuard),
    location = locationProjection(count, now, sequence, ttl, cleanup);
  return (
    <section ref={ref} className="handbook-experiment ride-playground" aria-labelledby={id}>
      <span className="eyebrow">RIDE MARKETPLACE / FRESHNESS, MATCHING AND OWNERSHIP</span>
      {kind === 'ride-match' && (
        <>
          <h3 id={id}>Tối ưu tổng ETA hay người chờ lâu nhất?</h3>
          <p>
            Hai riders và hai drivers dùng ETA matrix giả lập theo giây; sơ đồ là bipartite graph,
            không phải bản đồ. Solver duyệt đủ assignments của fixture nhỏ: tối đa số matched trước,
            rồi tối ưu total hoặc worst ETA. Không dùng thuật toán này làm production solver.
          </p>
          <div className="platform-options" role="group" aria-label="Pickup fixture">
            {[0, 1].map((n) => (
              <button
                key={n}
                type="button"
                data-scenario={n}
                aria-pressed={scenario === n}
                onClick={() => setScenario(n)}
              >
                {n === 0 ? 'Greedy regret' : 'Total / worst trade-off'}
              </button>
            ))}
          </div>
          <div className="platform-options" role="group" aria-label="Matching objective">
            {(['greedy', 'total', 'fair'] as const).map((p) => (
              <button
                key={p}
                type="button"
                data-policy={p}
                aria-pressed={policy === p}
                onClick={() => setPolicy(p)}
              >
                {p === 'greedy'
                  ? 'Greedy theo request order'
                  : p === 'total'
                    ? 'Min total ETA'
                    : 'Min worst ETA'}
              </button>
            ))}
          </div>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={reverse}
              onChange={(e) => setReverse(e.target.checked)}
            />
            R2 đến trước R1
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={busy} onChange={(e) => setBusy(e.target.checked)} />
            D2 đang busy, không eligible
          </label>
          <div className="worksheet-inputs">
            <label>
              Batch collection delay<output>{batch} s</output>
              <input
                type="range"
                min="0"
                max="30"
                value={batch}
                onChange={(e) => setBatch(+e.target.value)}
              />
            </label>
          </div>
          <figure className="ride-matching">
            <div role="region" tabIndex={0} aria-label="Rider-driver assignments">
              <svg viewBox="0 0 640 280" role="img" aria-labelledby={id + '-graph'}>
                <title id={id + '-graph'}>
                  {'Assignment edges và ETA; bảng matrix bên dưới chứa tất cả costs.'}
                </title>
                {match.pairs.map((p) => (
                  <g key={p.rider}>
                    <line
                      x1="170"
                      y1={65 + p.rider * 140}
                      x2="470"
                      y2={65 + p.driver * 140}
                      stroke="var(--accent)"
                      strokeWidth="3"
                    />
                    <text
                      x={p.rider === 0 ? 210 : 390}
                      y={65 + p.rider * 140 + (p.driver - p.rider) * 24 - 12}
                    >
                      {p.eta} s
                    </text>
                  </g>
                ))}
                {[0, 1].map((n) => (
                  <g key={n}>
                    <rect x="35" y={37 + n * 140} width="135" height="56" rx="10" />
                    <text x="102" y={72 + n * 140} textAnchor="middle">
                      R{n + 1}
                    </text>
                    <rect
                      x="470"
                      y={37 + n * 140}
                      width="135"
                      height="56"
                      rx="10"
                      opacity={n === 1 && busy ? 0.35 : 1}
                    />
                    <text x="538" y={72 + n * 140} textAnchor="middle">
                      D{n + 1}
                      {n === 1 && busy ? ' / BUSY' : ''}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
            <figcaption>
              Greedy xử lý từng rider; batch có thể chọn assignment khác nhưng tăng thời gian trước
              offer. Đường nối chỉ mô tả assignment đã chọn.
            </figcaption>
          </figure>
          <figure className="handbook-table">
            <div role="region" tabIndex={0} aria-label="Pickup ETA matrix">
              <table>
                <thead>
                  <tr>
                    <th scope="col">ETA / seconds</th>
                    <th scope="col">D1</th>
                    <th scope="col">D2</th>
                  </tr>
                </thead>
                <tbody>
                  {match.costs.map((row, i) => (
                    <tr key={i}>
                      <th scope="row">R{i + 1}</th>
                      {row.map((eta, j) => (
                        <td key={j}>
                          {eta}
                          {j === 1 && busy ? ' / INELIGIBLE' : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Matched / riders</dt>
              <dd>{match.matched} / 2</dd>
            </div>
            <div>
              <dt>Assignment total ETA</dt>
              <dd>{match.total} s</dd>
            </div>
            <div>
              <dt>Assignment worst ETA</dt>
              <dd>{match.worst} s</dd>
            </div>
            <div>
              <dt>Total wait gồm collection</dt>
              <dd>{match.totalWait} s</dd>
            </div>
            <div>
              <dt>Worst wait gồm collection</dt>
              <dd>{match.worstWait} s</dd>
            </div>
            <div>
              <dt>Unmatched riders</dt>
              <dd>{match.unmatched.map((r) => 'R' + (r + 1)).join(', ') || '—'}</dd>
            </div>
          </dl>
          <p className="muted">
            Fixture giả định cả hai riders ở đầu batch nên mỗi matched rider chờ trọn delay; greedy
            không đợi batch. Uniform arrivals thường có mean collection wait T/2, nhưng không dùng
            giả định đó trong kết quả này. Lower total không bảo đảm lower worst hoặc mọi người đều
            tốt hơn; unmatched được báo riêng.
          </p>
        </>
      )}
      {kind === 'ride-claims' && (
        <>
          <h3 id={id}>Một trip chỉ có một driver đã đủ chưa?</h3>
          <p>
            Fixture non-pooling: driver chỉ phục vụ một active trip. T1 và T2 cùng offer D1; T3 từng
            offer D3 nhưng offer đó đã hết hạn và được thay bằng D2. Mỗi trip có conditional state
            check, nhưng hai invariant còn lại cần được enforce cùng assignment.
          </p>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={driverGuard}
              onChange={(e) => setDriverGuard(e.target.checked)}
            />
            Reserve driver atomically cùng trip assignment
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={offerGuard}
              onChange={(e) => setOfferGuard(e.target.checked)}
            />
            Validate current offer ID, generation và expiry
          </label>
          <div className="worksheet-inputs">
            <label>
              Command step<output>{step} / 5</output>
              <input
                type="range"
                min="0"
                max="5"
                value={step}
                onChange={(e) => setStep(+e.target.value)}
              />
            </label>
          </div>
          <figure className="handbook-table">
            <div role="region" tabIndex={0} aria-label="Trip acceptance replay">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Command</th>
                    <th scope="col">Trip / driver</th>
                    <th scope="col">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.results.map((r, i) => (
                    <tr key={i}>
                      <th scope="row">{r.command}</th>
                      <td>
                        {r.trip} / {r.driver}
                      </td>
                      <td>{r.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
          <div className="ride-driver-loads">
            {claims.loads.map((l) => (
              <section key={l.driver}>
                <h4>{l.driver}</h4>
                <p>{l.trips.join(', ') || 'FREE'}</p>
              </section>
            ))}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Drivers có nhiều active trips</dt>
              <dd>{claims.doubleBooked}</dd>
            </div>
            <div>
              <dt>Driver nhận T3</dt>
              <dd>{claims.assignments.T3 || '—'}</dd>
            </div>
            <div>
              <dt>Offer cũ thắng sai?</dt>
              <dd>{claims.wrongOfferWon ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Committed assignments</dt>
              <dd>{Object.keys(claims.assignments).length}</dd>
            </div>
          </dl>
          <p className="muted">
            c1 được retry ở bước 5 và replay result cũ. Lab mô hình hóa atomic assignment bằng một
            authoritative transaction; hệ thống tách shards phải có equivalent reservation/ownership
            protocol. Push offer hoặc client Accept chưa là committed assignment.
          </p>
        </>
      )}
      {kind === 'ride-location' && (
        <>
          <h3 id={id}>Ping mới tới có chắc là vị trí mới?</h3>
          <p>
            Một driver có server-issued session epoch và sequence tăng trong session. Epoch 2 đã
            được xác thực/kích hoạt; packets epoch 1 có thể tới muộn. TTL fixture là 10 giây theo
            server receive time; duplicate không làm mới TTL khi sequence guard bật. A/B/C là cell
            giả lập, không phải H3.
          </p>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={sequence}
              onChange={(e) => setSequence(e.target.checked)}
            />
            Reject older epoch hoặc sequence không tăng
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={ttl} onChange={(e) => setTtl(e.target.checked)} />
            Loại candidates đã quá receipt TTL
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={cleanup}
              onChange={(e) => setCleanup(e.target.checked)}
            />
            Dọn membership cell cũ khi di chuyển
          </label>
          <div className="worksheet-inputs">
            <label>
              Location packets<output>{count} / 6</output>
              <input
                type="range"
                min="1"
                max="6"
                value={count}
                onChange={(e) => setCount(+e.target.value)}
              />
            </label>
            <label>
              Server now<output>{now} s</output>
              <input
                type="range"
                min="15"
                max="40"
                value={now}
                onChange={(e) => setNow(+e.target.value)}
              />
            </label>
          </div>
          <div className="ride-driver-loads">
            {['A', 'B', 'C'].map((cell) => (
              <section key={cell} data-current={location.latest?.cell === cell}>
                <h4>Cell {cell}</h4>
                <p>{location.rawEntries.some((f) => f.cell === cell) ? 'D1' : '—'}</p>
              </section>
            ))}
          </div>
          <figure className="handbook-table">
            <div role="region" tabIndex={0} aria-label="Location packet replay">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Epoch / seq</th>
                    <th scope="col">Cell</th>
                    <th scope="col">Received / s</th>
                    <th scope="col">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {location.rows.map((r, i) => (
                    <tr key={i}>
                      <th scope="row">
                        {r.epoch} / {r.seq}
                      </th>
                      <td>{r.cell}</td>
                      <td>{r.received}</td>
                      <td>{r.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Canonical latest cell</dt>
              <dd>{location.latest?.cell || '—'}</dd>
            </div>
            <div>
              <dt>Canonical epoch / seq</dt>
              <dd>{location.latest ? `${location.latest.epoch} / ${location.latest.seq}` : '—'}</dd>
            </div>
            <div>
              <dt>Expired theo receive TTL?</dt>
              <dd>{location.expired ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Raw candidate occurrences</dt>
              <dd>{location.rawCandidates}</dd>
            </div>
            <div>
              <dt>Verified unique candidates</dt>
              <dd>{location.verifiedCandidates}</dd>
            </div>
            <div>
              <dt>Stored cell memberships</dt>
              <dd>{location.rawEntries.length}</dd>
            </div>
          </dl>
          <p className="muted">
            Postfilter join canonical epoch/seq/cell loại ghost memberships, nhưng không sửa
            canonical position nếu đã accept stale packet. Receipt TTL chỉ giới hạn receive age,
            không chứng minh GPS fix vừa được chụp hoặc driver còn eligible; production cần
            capture-age/accuracy/session checks và authoritative reservation.
          </p>
        </>
      )}
    </section>
  );
}
