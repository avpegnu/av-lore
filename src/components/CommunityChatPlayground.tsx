import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { hotChannelReads, communityFanout, chatResume } from '../lib/community-chat-models';
export default function CommunityChatPlayground({
  kind,
}: {
  kind: 'community-reads' | 'community-fanout' | 'community-resume';
}) {
  const ref = useIslandReady(),
    id = 'community-' + useId().replace(/:/g, '');
  const [instances, setInstances] = useState(4),
    [latency, setLatency] = useState(40),
    [affinity, setAffinity] = useState(true),
    [coalesce, setCoalesce] = useState(true),
    [safe, setSafe] = useState(true);
  const [members, setMembers] = useState(100000),
    [online, setOnline] = useState(50),
    [active, setActive] = useState(10),
    [rate, setRate] = useState(5),
    [relays, setRelays] = useState(4),
    [bounded, setBounded] = useState(true);
  const [cursor, setCursor] = useState(2),
    [retained, setRetained] = useState(4),
    [stage, setStage] = useState(4),
    [allowed, setAllowed] = useState(true),
    [bridge, setBridge] = useState(true),
    [versions, setVersions] = useState(true);
  const reads = hotChannelReads(instances, affinity, coalesce, safe, latency),
    fan = communityFanout(members, online, active, rate, relays, bounded),
    resume = chatResume(cursor, retained, stage, allowed, bridge, versions);
  const maxTime = Math.max(...reads.queries.map((q) => q.end)),
    fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return (
    <section ref={ref} className="handbook-experiment community-playground" aria-labelledby={id}>
      <span className="eyebrow">COMMUNITY CHAT / AUDIENCE, READS AND REPLAY</span>
      {kind === 'community-reads' && (
        <>
          <h3 id={id}>Query ít hơn có trả đúng data không?</h3>
          <p>
            Mười hai requests của cùng channel có scope, cursor và minimum version khác nhau. Scope
            mods/members là hai authorization-equivalent classes trong fixture; đây không phải
            permission model đầy đủ. DB snapshot chuyển từ version 1 sang 2 tại t=20 ms. Query
            latency là hằng số giả định, không benchmark.
          </p>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={affinity}
              onChange={(e) => setAffinity(e.target.checked)}
            />
            Route cùng channel về một instance
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={coalesce}
              onChange={(e) => setCoalesce(e.target.checked)}
            />
            Merge compatible in-flight reads
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={safe} onChange={(e) => setSafe(e.target.checked)} />
            Key theo scope/cursor/permission epoch và kiểm min version
          </label>
          <div className="worksheet-inputs">
            <label>
              Service instances<output>{instances}</output>
              <input
                type="range"
                min="1"
                max="4"
                value={instances}
                onChange={(e) => setInstances(+e.target.value)}
              />
            </label>
            <label>
              DB query latency<output>{latency} ms</output>
              <input
                type="range"
                min="5"
                max="80"
                step="5"
                value={latency}
                onChange={(e) => setLatency(+e.target.value)}
              />
            </label>
          </div>
          <figure className="community-query-chart">
            <div role="region" tabIndex={0} aria-label="In-flight database queries">
              <svg viewBox="0 0 640 190" role="img" aria-labelledby={id + '-queries'}>
                <title id={id + '-queries'}>
                  {'Mỗi thanh là một DB query trên instance; bảng replay mô tả request được join.'}
                </title>
                {Array.from({ length: instances }, (_, i) => (
                  <g key={i}>
                    <text x="5" y={35 + i * 35}>
                      I{i}
                    </text>
                    <line x1="50" x2="625" y1={30 + i * 35} y2={30 + i * 35} />
                  </g>
                ))}
                {reads.queries.map((q) => (
                  <rect
                    key={q.id}
                    x={50 + (q.start / maxTime) * 570}
                    y={18 + q.instance * 35}
                    width={(latency / maxTime) * 570}
                    height="22"
                    rx="3"
                  />
                ))}
                <text x="50" y="180">
                  0 ms
                </text>
                <text x="555" y="180">
                  {maxTime} ms
                </text>
              </svg>
            </div>
            <figcaption>
              Khi tắt affinity, fixture dùng round-robin thay vì random. Coalescing chỉ join trong
              cửa sổ query đang chạy; không có result cache sau query.
            </figcaption>
          </figure>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>DB queries / 12 requests</dt>
              <dd>{reads.queries.length}</dd>
            </div>
            <div>
              <dt>Peak DB in flight</dt>
              <dd>{reads.peak}</dd>
            </div>
            <div>
              <dt>Mean fixture wait</dt>
              <dd>{fmt(reads.meanWait)} ms</dd>
            </div>
            <div>
              <dt>Incompatible responses</dt>
              <dd>{reads.incompatible}</dd>
            </div>
            <div>
              <dt>Member reads served mod scope</dt>
              <dd>{reads.scopeLeaks}</dd>
            </div>
          </dl>
          <figure className="handbook-table">
            <div role="region" tabIndex={0} aria-label="Coalesced request replay">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Request / at</th>
                    <th scope="col">Scope / cursor / min</th>
                    <th scope="col">Query / instance</th>
                    <th scope="col">Served version / issues</th>
                  </tr>
                </thead>
                <tbody>
                  {reads.rows.map((r) => (
                    <tr key={r.id}>
                      <th scope="row">
                        {r.id} / {r.at} ms
                      </th>
                      <td>
                        {r.scope} / {r.cursor} / {r.minVersion}
                      </td>
                      <td>
                        q{r.query} / I{r.instance}
                        {r.joined ? ' / JOIN' : ''}
                      </td>
                      <td>
                        v{r.servedVersion} / {r.issues.join(', ') || 'OK'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
          <p className="muted">
            Không merge writes. Production key còn tenant/channel, query shape, limits,
            locale/personal filters và auth-equivalence; minimum consistency/version là admission
            condition. Affinity giúp local merge, nhưng không là lựa chọn duy nhất nếu có shared
            coordination. Query count thấp không biện minh leak data hoặc stale read vượt contract.
          </p>
        </>
      )}
      {kind === 'community-fanout' && (
        <>
          <h3 id={id}>Relays giảm việc của owner, không làm egress biến mất</h3>
          <p>
            Lab đếm full message-content deliveries tới online active viewers đã đủ quyền. Passive
            sessions vẫn có thể nhận unread/mention/invalidation theo contract khác. Mỗi payload giả
            định 1 KB decimal, relay capacity 5000 deliveries/s và đều tải; không đo CPU,
            compression hoặc network thực.
          </p>
          <div className="worksheet-inputs">
            <label>
              Guild members<output>{fmt(members)}</output>
              <input
                type="range"
                min="10000"
                max="100000"
                step="10000"
                value={members}
                onChange={(e) => setMembers(+e.target.value)}
              />
            </label>
            <label>
              Online members<output>{online}%</output>
              <input
                type="range"
                min="10"
                max="100"
                step="10"
                value={online}
                onChange={(e) => setOnline(+e.target.value)}
              />
            </label>
            <label>
              Active viewers / online<output>{active}%</output>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={active}
                onChange={(e) => setActive(+e.target.value)}
              />
            </label>
            <label>
              Content messages<output>{rate} / s</output>
              <input
                type="range"
                min="1"
                max="10"
                value={rate}
                onChange={(e) => setRate(+e.target.value)}
              />
            </label>
            <label>
              Relay workers<output>{relays}</output>
              <input
                type="range"
                min="1"
                max="8"
                value={relays}
                onChange={(e) => setRelays(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={bounded}
              onChange={(e) => setBounded(e.target.checked)}
            />
            Bound queue; đánh dấu gap để catch up từ durable history
          </label>
          <div className="community-relays">
            {Array.from({ length: relays }, (_, i) => (
              <section key={i}>
                <strong>Relay {i + 1}</strong>
                <p>{fmt(fan.recipientCopies / relays)} / s</p>
                <div>
                  <span
                    style={{
                      width: Math.min(100, (fan.recipientCopies / relays / 5000) * 100) + '%',
                    }}
                  />
                </div>
              </section>
            ))}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Active eligible viewers</dt>
              <dd>{fmt(fan.watchers)}</dd>
            </div>
            <div>
              <dt>Owner copies / s</dt>
              <dd>{fmt(fan.ownerCopies)}</dd>
            </div>
            <div>
              <dt>Recipient copies / s</dt>
              <dd>{fmt(fan.recipientCopies)}</dd>
            </div>
            <div>
              <dt>Viewer payload / MB per s</dt>
              <dd>{fmt(fan.egressMB)}</dd>
            </div>
            <div>
              <dt>All-online naive copies / s</dt>
              <dd>{fmt(fan.allOnlineCopies)}</dd>
            </div>
            <div>
              <dt>Queued deliveries after 5 s</dt>
              <dd>{fmt(fan.queuedAfter5s)}</dd>
            </div>
            <div>
              <dt>Gap-marked deliveries / s</dt>
              <dd>{fmt(fan.gapDeliveriesPerSecond)}</dd>
            </div>
            <div>
              <dt>Delivery mode</dt>
              <dd>{fan.status}</dd>
            </div>
          </dl>
          <p className="muted">
            Gap không xóa durable messages: client phải reconcile cursor/history khi còn quyền.
            Model không giả định deferred delivery tự hoàn tất; catch-up requests cũng cần capacity
            và backoff. Presence có thể gần O(N²) nếu O(N) users đều phát events tới O(N) audience;
            một message riêng chỉ có O(recipients) copies.
          </p>
        </>
      )}
      {kind === 'community-resume' && (
        <>
          <h3 id={id}>Nối snapshot, live events và deletion versions</h3>
          <p>
            Fixture có events 1–8 trước reconnect: tạo m1/m2/m3/m4, sửa và xóa; seq8 xóa m1. Live
            seq9 tạo m5 trong lúc catch-up. Một old history page chứa m1 ở version1 tới muộn. Không
            dùng message ID làm session cursor; các seq ở đây là một ordered event stream minh họa.
          </p>
          <div className="worksheet-inputs">
            <label>
              Client last applied cursor<output>{cursor}</output>
              <input
                type="range"
                min="0"
                max="8"
                value={cursor}
                onChange={(e) => setCursor(+e.target.value)}
              />
            </label>
            <label>
              Retained replay events<output>{retained}</output>
              <input
                type="range"
                min="2"
                max="8"
                value={retained}
                onChange={(e) => setRetained(+e.target.value)}
              />
            </label>
            <label>
              Reconnect step<output>{stage} / 4</output>
              <input
                type="range"
                min="0"
                max="4"
                value={stage}
                onChange={(e) => setStage(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={allowed}
              onChange={(e) => setAllowed(e.target.checked)}
            />
            Current channel permission còn hợp lệ
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={bridge} onChange={(e) => setBridge(e.target.checked)} />
            Bridge live events sau snapshot watermark
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={versions}
              onChange={(e) => setVersions(e.target.checked)}
            />
            Apply monotonic versions và retain deletion tombstones
          </label>
          <ol className="platform-history">
            {[
              '0 / Client disconnected',
              '1 / Replay hoặc authoritative snapshot tới watermark 8',
              '2 / Live event 9 xuất hiện trong lúc sync',
              '3 / Apply bridge hoặc còn gap chưa bắt kịp',
              '4 / Old page m1 version1 tới muộn',
            ].map((s, i) => (
              <li key={i} data-active={i === stage} data-past={i < stage}>
                {s}
              </li>
            ))}
          </ol>
          <div className="community-messages">
            {resume.messages.map((m) => (
              <article key={m.id}>
                <strong>
                  {m.id} / v{m.version}
                </strong>
                <p>{m.text}</p>
              </article>
            ))}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Resume source</dt>
              <dd>{resume.source}</dd>
            </div>
            <div>
              <dt>Applied watermark</dt>
              <dd>{resume.watermark}</dd>
            </div>
            <div>
              <dt>Live events chưa apply</dt>
              <dd>{resume.liveMissing}</dd>
            </div>
            <div>
              <dt>Deleted m1 bị resurrect?</dt>
              <dd>{resume.resurrected ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Visible message IDs</dt>
              <dd>{resume.messages.map((m) => m.id).join(', ') || '—'}</dd>
            </div>
            <div>
              <dt>Retained tombstones</dt>
              <dd>{resume.tombstones}</dd>
            </div>
          </dl>
          <p className="muted">
            Revoked permission từ chối server catch-up dù token/cursor cũ còn đúng format. Model
            clear local projection khi deny, không thể thu hồi screenshots/data đã được người dùng
            lưu trước đó. Gap có thể sửa bằng lần sync kế tiếp, nhưng không được ACK watermark9 nếu
            chưa apply event9. Tombstone retention phải bao phủ stale-page/replay horizon hoặc cần
            resync barrier tương đương.
          </p>
        </>
      )}
    </section>
  );
}
