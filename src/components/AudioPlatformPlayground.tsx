import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { audioStartup, audioAccounting, audioPlaylist } from '../lib/audio-platform-models';
export default function AudioPlatformPlayground({
  kind,
}: {
  kind: 'audio-start' | 'audio-events' | 'audio-playlist';
}) {
  const ref = useIslandReady(),
    id = 'audio-' + useId().replace(/:/g, '');
  const [rtt, setRtt] = useState(100),
    [bandwidth, setBandwidth] = useState(5),
    [warm, setWarm] = useState(false),
    [metadata, setMetadata] = useState(false),
    [key, setKey] = useState(false),
    [prefetch, setPrefetch] = useState(false),
    [predicted, setPredicted] = useState(true),
    [parallel, setParallel] = useState(true),
    [low, setLow] = useState(false),
    [entitled, setEntitled] = useState(true);
  const [count, setCount] = useState(8),
    [threshold, setThreshold] = useState(30),
    [eventDedup, setEventDedup] = useState(true),
    [playDedup, setPlayDedup] = useState(true),
    [verify, setVerify] = useState(true),
    [correction, setCorrection] = useState(true);
  const [prepends, setPrepends] = useState(1),
    [stable, setStable] = useState(true),
    [deleted, setDeleted] = useState(false),
    [retained, setRetained] = useState(true);
  const start = audioStartup(
      rtt,
      bandwidth,
      warm,
      metadata,
      key,
      prefetch,
      predicted,
      parallel,
      low,
      entitled,
    ),
    events = audioAccounting(count, threshold, eventDedup, playDedup, verify, correction),
    list = audioPlaylist(prepends, stable, deleted, retained);
  const toggles: [boolean, (v: boolean) => void, string][] = [
    [warm, setWarm, 'Warm connection'],
    [metadata, setMetadata, 'Valid metadata cache'],
    [key, setKey, 'Valid scoped license cache'],
    [prefetch, setPrefetch, 'Prefetch encrypted prefix'],
    [predicted, setPredicted, 'User chọn đúng predicted next track'],
    [parallel, setParallel, 'Overlap license fetch và encrypted bytes sau metadata'],
    [low, setLow, '24 kbps startup prefix thay 160 kbps'],
    [entitled, setEntitled, 'Current authorization verdict cho phép Play'],
  ];
  return (
    <section ref={ref} className="handbook-experiment audio-playground" aria-labelledby={id}>
      <span className="eyebrow">AUDIO / STARTUP, EVENTS AND PLAYLIST INTENT</span>
      {kind === 'audio-start' && (
        <>
          <h3 id={id}>Critical path tới first sound, không chỉ cộng mọi request</h3>
          <p>
            Fixture cần 2 giây audio trước decode 20 ms. Cold connection giả định 2 RTT; metadata và
            license misses mỗi cái 1 RTT; bytes gồm 1 RTT và payload transfer. Khi parallel, license
            và encrypted bytes overlap sau metadata. Không tính radio wake, DNS, jitter, congestion,
            device CPU hay benchmark Spotify.
          </p>
          <div className="worksheet-inputs">
            <label>
              Network RTT<output>{rtt} ms</output>
              <input
                type="range"
                min="20"
                max="300"
                step="10"
                value={rtt}
                onChange={(e) => setRtt(+e.target.value)}
              />
            </label>
            <label>
              Payload bandwidth<output>{bandwidth} Mbps</output>
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={bandwidth}
                onChange={(e) => setBandwidth(+e.target.value)}
              />
            </label>
          </div>
          {toggles.map(([checked, set, label]) => (
            <label key={label} className="worksheet-toggle">
              <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} />
              {label}
            </label>
          ))}
          {entitled && (
            <figure className="audio-critical-path">
              <div role="region" tabIndex={0} aria-label="Startup dependency timeline">
                <svg viewBox="0 0 660 260" role="img" aria-labelledby={id + '-timeline'}>
                  <title id={id + '-timeline'}>
                    {'Các phases có thể overlap; playback chờ bytes và license đều ready.'}
                  </title>
                  {start.phases.map((p, i) => (
                    <g key={p.id}>
                      <text x="5" y={30 + i * 43}>
                        {p.id}
                      </text>
                      <line x1="95" x2="640" y1={25 + i * 43} y2={25 + i * 43} />
                      <rect
                        x={95 + (p.start / (start.total || 1)) * 530}
                        y={12 + i * 43}
                        width={(p.ms / (start.total || 1)) * 530}
                        height="24"
                        rx="4"
                      />
                      <text x="95" y={46 + i * 43}>
                        {p.ms.toFixed(0)} ms
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
              <figcaption>
                Timeline là planned fixture; DENIED không phát audio. Prefetched bytes không thay
                license validation.
              </figcaption>
            </figure>
          )}
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Playback verdict</dt>
              <dd>{start.status}</dd>
            </div>
            <div>
              <dt>Time to first sound</dt>
              <dd>{start.total === null ? '—' : start.total.toFixed(0) + ' ms'}</dd>
            </div>
            <div>
              <dt>Startup prefix</dt>
              <dd>{start.kb} KB</dd>
            </div>
            <div>
              <dt>Wasted prediction bytes</dt>
              <dd>{start.wastedKB} KB</dd>
            </div>
          </dl>
          <p className="muted">
            License cache phải còn scope/expiry phù hợp; cached ciphertext không grant rights.
            Verdict là input đã xác minh của fixture, không code DRM. Offline revocation chỉ được
            biết theo bounded license/check-in contract. Low-bitrate prefix giả định
            decoder/segments tương thích để switch; không phải mọi codec tự switch liền mạch.
          </p>
        </>
      )}
      {kind === 'audio-events' && (
        <>
          <h3 id={id}>Event ID khác play identity, closed report khác live counter</h3>
          <p>
            Replay gồm duplicate e1, progress e2 của cùng p1, short p2, late p3, untrusted p4,
            future-time p5 và valid p6. Report đóng ở arrival day 3. Rule 30/45 giây là hai
            synthetic versions, không quy tắc royalty Spotify. Quarantine dùng trusted flag giả định
            và future-time check, không signature implementation.
          </p>
          <div className="worksheet-inputs">
            <label>
              Replay records<output>{count} / 8</output>
              <input
                type="range"
                min="1"
                max="8"
                value={count}
                onChange={(e) => setCount(+e.target.value)}
              />
            </label>
            <label>
              Rule threshold<output>{threshold} s</output>
              <input
                type="range"
                min="30"
                max="45"
                step="15"
                value={threshold}
                onChange={(e) => setThreshold(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={eventDedup}
              onChange={(e) => setEventDedup(e.target.checked)}
            />
            Dedup transport event ID
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={playDedup}
              onChange={(e) => setPlayDedup(e.target.checked)}
            />
            Một qualified count cho mỗi play identity
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={verify} onChange={(e) => setVerify(e.target.checked)} />
            Validate trusted evidence và future event time
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={correction}
              onChange={(e) => setCorrection(e.target.checked)}
            />
            Late event thành explicit closed-period adjustment
          </label>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Closed base count</dt>
              <dd>{events.base}</dd>
            </div>
            <div>
              <dt>Explicit adjustments</dt>
              <dd>{events.adjustment}</dd>
            </div>
            <div>
              <dt>Pending late review</dt>
              <dd>{events.pending}</dd>
            </div>
            <div>
              <dt>Quarantined records</dt>
              <dd>{events.quarantined}</dd>
            </div>
            <div>
              <dt>Transport duplicates</dt>
              <dd>{events.transportDuplicates}</dd>
            </div>
            <div>
              <dt>Semantic duplicates</dt>
              <dd>{events.semanticDuplicates}</dd>
            </div>
            <div>
              <dt>Reported count</dt>
              <dd>{events.total}</dd>
            </div>
          </dl>
          <figure className="handbook-table">
            <div role="region" tabIndex={0} aria-label="Play event accounting replay">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Event / play</th>
                    <th scope="col">Seconds</th>
                    <th scope="col">Event / arrival day</th>
                    <th scope="col">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {events.rows.map((e, i) => (
                    <tr key={i}>
                      <th scope="row">
                        {e.id} / {e.play}
                      </th>
                      <td>{e.seconds}</td>
                      <td>
                        {e.eventDay} / {e.arrivalDay}
                      </td>
                      <td>{e.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
          <p className="muted">
            Đây là replay fixture, không global event order hay payout engine. Event IDs không chứng
            minh genuine listening; fraud, qualification và money contracts riêng. Correction ledger
            cần unique report/rule/play identity và atomic sink/result; rerun rule version là
            replacement report, không tự cộng thêm payout. Raw evidence retention có
            privacy/deletion limits.
          </p>
        </>
      )}
      {kind === 'audio-playlist' && (
        <>
          <h3 id={id}>Offline insert phải giữ entry anchor, không chỉ array index</h3>
          <p>
            Device B thấy A(ea), B(eb), C(ec), muốn insert Y sau eb ở base index 2. Trong lúc
            offline, device A prepend X và có thể remove eb. Service replay cùng insert operation
            hai lần để mô phỏng lost reply. Entry IDs khác track IDs; cùng track có thể xuất hiện
            nhiều lần.
          </p>
          <label>
            Concurrent prepends<output>{prepends}</output>
            <input
              type="range"
              min="0"
              max="2"
              value={prepends}
              onChange={(e) => setPrepends(+e.target.value)}
            />
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={stable} onChange={(e) => setStable(e.target.checked)} />
            Rebase bằng stable entry anchor eb
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={deleted}
              onChange={(e) => setDeleted(e.target.checked)}
            />
            Remote device remove anchor eb
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={retained}
              onChange={(e) => setRetained(e.target.checked)}
            />
            Retain anchor tombstone/context tới offline horizon
          </label>
          <ol className="audio-playlist-entries">
            {list.entries.map((e) => (
              <li key={e.id} data-deleted={e.deleted}>
                <strong>{e.track}</strong>
                <span>{e.id}</span>
                <small>{e.deleted ? 'REMOVED' : 'VISIBLE'}</small>
              </li>
            ))}
          </ol>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Operation result</dt>
              <dd>{list.status}</dd>
            </div>
            <div>
              <dt>Y anchored incorrectly?</dt>
              <dd>{list.wrongAnchor ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Duplicate operation ignored</dt>
              <dd>{list.duplicateOperationIgnored}</dd>
            </div>
            <div>
              <dt>Visible order</dt>
              <dd>{list.visible.map((e) => e.track).join(' · ')}</dd>
            </div>
          </dl>
          <p className="muted">
            Một log không tự merge intent: server phải validate/rebase operations và assign ordered
            versions, hoặc dùng CRDT/OT protocol đầy đủ. Lab chỉ một insertion dưới deterministic
            authority, không giải mọi concurrent move/cycle. Missing anchor cần resync/conflict
            policy, không đoán vị trí; compaction cần snapshot version và retained tombstone/causal
            horizon.
          </p>
        </>
      )}
    </section>
  );
}
