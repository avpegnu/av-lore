import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { fillAssets, netflixFill, netflixLive, netflixQuality } from '../lib/netflix-models';
export default function NetflixPlayground({
  kind,
}: {
  kind: 'netflix-quality' | 'netflix-fill' | 'netflix-live';
}) {
  const ref = useIslandReady(),
    id = 'netflix-' + useId().replace(/:/g, '');
  const [complex, setComplex] = useState(false),
    [cap, setCap] = useState(1080),
    [floor, setFloor] = useState(90),
    [budget, setBudget] = useState(6);
  const [storage, setStorage] = useState(10),
    [speed, setSpeed] = useState(50),
    [window, setWindow] = useState(60);
  const [millions, setMillions] = useState(3),
    [join, setJoin] = useState(30),
    [variants, setVariants] = useState(4),
    [buffer, setBuffer] = useState(1);
  const [policy, setPolicy] = useState<'none' | 'edge' | 'shield'>('none');
  const q = netflixQuality(complex, cap, floor, budget),
    f = netflixFill(storage, speed, window),
    l = netflixLive(millions, join, variants, policy, buffer);
  const fmt = (n: number, digits = 2) =>
    n.toLocaleString('en-US', { maximumFractionDigits: digits });
  return (
    <section ref={ref} className="handbook-experiment netflix-playground" aria-labelledby={id}>
      <span className="eyebrow">STREAMING / EVOLUTION AND DELIVERY</span>
      {kind === 'netflix-quality' && (
        <>
          <h3 id={id}>Chọn điểm trên đường bitrate–quality</h3>
          <p>
            Đây là bảy điểm chất lượng giả lập cho mỗi loại nội dung, không phải VMAF hoặc kết quả
            đo Netflix. So sánh cùng codec giả định; điểm quality chỉ có ý nghĩa trong fixture. Chọn
            bitrate thấp nhất đạt quality floor, device cap và bandwidth budget.
          </p>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={complex}
              onChange={(e) => setComplex(e.target.checked)}
            />
            Nội dung nhiều chuyển động và hạt nhiễu
          </label>
          <div className="netflix-options" role="group" aria-label="Device resolution cap">
            {[480, 720, 1080].map((n) => (
              <button
                type="button"
                key={n}
                aria-pressed={cap === n}
                data-cap={n}
                onClick={() => setCap(n)}
              >
                {n}p
              </button>
            ))}
          </div>
          <div className="worksheet-inputs">
            <label>
              Quality floor<output>{floor}</output>
              <input
                type="range"
                min="60"
                max="95"
                step="1"
                value={floor}
                onChange={(e) => setFloor(+e.target.value)}
              />
            </label>
            <label>
              Bandwidth budget<output>{budget} Mbps</output>
              <input
                type="range"
                min="1"
                max="8"
                step="0.5"
                value={budget}
                onChange={(e) => setBudget(+e.target.value)}
              />
            </label>
          </div>
          <figure className="netflix-chart">
            <svg viewBox="0 0 640 300" role="img" aria-labelledby={id + '-curve'}>
              <title id={id + '-curve'}>
                {'Các ứng viên và frontier theo device cap; bảng bên dưới chứa toàn bộ điểm.'}
              </title>
              <path d="M55 20V255H620" fill="none" stroke="currentColor" />
              {[60, 80, 100].map((n) => (
                <g key={n}>
                  <line
                    x1="55"
                    x2="620"
                    y1={255 - (n - 40) * 3.7}
                    y2={255 - (n - 40) * 3.7}
                    stroke="currentColor"
                    opacity="0.15"
                  />
                  <text x="10" y={260 - (n - 40) * 3.7}>
                    {n}
                  </text>
                </g>
              ))}
              {[0, 2, 4, 6, 8].map((n) => (
                <text key={n} x={55 + n * 69} y="280">
                  {n}
                </text>
              ))}
              <text x="545" y="298">
                Mbps
              </text>
              <text x="65" y="18">
                Quality
              </text>
              <polyline
                points={q.frontier
                  .map((p) => `${55 + p.mbps * 69},${255 - (p.quality - 40) * 3.7}`)
                  .join(' ')}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
              />
              {q.all.map((p) => (
                <g key={p.id} opacity={p.resolution <= cap ? 1 : 0.2}>
                  <circle
                    cx={55 + p.mbps * 69}
                    cy={255 - (p.quality - 40) * 3.7}
                    r={q.selected?.id === p.id ? 9 : 5}
                    fill={q.selected?.id === p.id ? 'var(--accent)' : 'var(--surface)'}
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </g>
              ))}
            </svg>
            <figcaption>
              Đường nối các điểm không bị trội về bitrate và quality trong tập tương thích; không
              nội suy thành chất lượng đã đo. Vòng lớn là điểm được chọn; điểm mờ vượt device cap.
            </figcaption>
          </figure>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Trạng thái lựa chọn</dt>
              <dd>{q.status}</dd>
            </div>
            <div>
              <dt>Điểm được chọn</dt>
              <dd>
                {q.selected
                  ? `${q.selected.resolution}p / ${q.selected.mbps} Mbps / Q ${q.selected.quality}`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>Hai giờ ở điểm đã chọn</dt>
              <dd>{q.selectedGB === null ? '—' : fmt(q.selectedGB) + ' GB'}</dd>
            </div>
            <div>
              <dt>Fixed reference tại device cap</dt>
              <dd>
                {q.fixed
                  ? `${q.fixed.resolution}p / ${q.fixed.mbps} Mbps / Q ${q.fixed.quality}`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>Fixed reference đạt ràng buộc?</dt>
              <dd>{q.fixedMeets ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Hai giờ ở fixed reference</dt>
              <dd>{q.fixedGB === null ? '—' : fmt(q.fixedGB) + ' GB'}</dd>
            </div>
          </dl>
          <figure className="handbook-table">
            <div role="region" tabIndex={0} aria-label="Rate-quality candidate table">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Candidate</th>
                    <th scope="col">Mbps</th>
                    <th scope="col">Quality</th>
                    <th scope="col">Compatible</th>
                    <th scope="col">Frontier</th>
                  </tr>
                </thead>
                <tbody>
                  {q.all.map((p) => (
                    <tr key={p.id} data-selected={q.selected?.id === p.id}>
                      <th scope="row">
                        {p.resolution}p / {p.id}
                      </th>
                      <td>{p.mbps}</td>
                      <td>{p.quality}</td>
                      <td>{p.resolution <= cap ? 'YES' : 'NO'}</td>
                      <td>{q.frontier.some((x) => x.id === p.id) ? 'YES' : 'NO'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
          <p className="muted">
            Hai điểm cùng vượt floor không có nghĩa chất lượng bằng nhau. GB là payload decimal của
            một rendition cố định trong hai giờ; không gồm audio, overhead, retries hoặc ABR
            switching. Không suy từ đây ra BD-rate hay mức tiết kiệm production.
          </p>
        </>
      )}
      {kind === 'netflix-fill' && (
        <>
          <h3 id={id}>Prefill: nhiều lượt xem hay nhiều bytes tránh truyền?</h3>
          <p>
            Năm file là fixture hoàn chỉnh: chỉ publish file đã tải xong trước deadline. Mỗi lượt
            xem đọc hết file, forecast là chính xác trong mô hình; không có eviction hoặc request
            trong lúc fill. Bài toán nhỏ được duyệt đủ 32 subsets, không đề xuất exhaustive search
            cho kho thực tế.
          </p>
          <div className="worksheet-inputs">
            <label>
              Cache storage<output>{storage} GB</output>
              <input
                type="range"
                min="1"
                max="20"
                value={storage}
                onChange={(e) => setStorage(+e.target.value)}
              />
            </label>
            <label>
              Off-peak fill bandwidth<output>{speed} Mbps</output>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={speed}
                onChange={(e) => setSpeed(+e.target.value)}
              />
            </label>
            <label>
              Fill window<output>{window} min</output>
              <input
                type="range"
                min="10"
                max="120"
                step="10"
                value={window}
                onChange={(e) => setWindow(+e.target.value)}
              />
            </label>
          </div>
          <div className="netflix-fill-bars">
            {fillAssets.map((a) => (
              <div key={a.id}>
                <strong>{a.id}</strong>
                <span>
                  {a.gb} GB · {a.plays} plays · {a.gb * a.plays} GB
                </span>
                <span className="netflix-pick" data-picked={f.greedy.ids.includes(a.id)}>
                  P {f.greedy.ids.includes(a.id) ? '✓' : '—'}
                </span>
                <span className="netflix-pick" data-picked={f.optimal.ids.includes(a.id)}>
                  B {f.optimal.ids.includes(a.id) ? '✓' : '—'}
                </span>
              </div>
            ))}
          </div>
          <p>
            P = chọn file có nhiều predicted plays trước; B = tối đa predicted bytes được phục vụ từ
            cache. Dung lượng và fill window đều ràng buộc cả hai phương án.
          </p>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Fill-window ceiling</dt>
              <dd>{fmt(f.fillGB)} GB</dd>
            </div>
            <div>
              <dt>Effective whole-file budget</dt>
              <dd>{fmt(f.budget)} GB</dd>
            </div>
            <div>
              <dt>Popularity-first selection</dt>
              <dd>{f.greedy.ids.join(', ') || '—'}</dd>
            </div>
            <div>
              <dt>Popularity-first avoided bytes</dt>
              <dd>{fmt(f.greedy.savedGB)} GB</dd>
            </div>
            <div>
              <dt>Byte-optimal selection</dt>
              <dd>{f.optimal.ids.join(', ') || '—'}</dd>
            </div>
            <div>
              <dt>Byte-optimal avoided bytes</dt>
              <dd>{fmt(f.optimal.savedGB)} GB</dd>
            </div>
            <div>
              <dt>Byte hit ratio / byte-optimal</dt>
              <dd>{fmt(f.optimal.byteHit * 100)}%</dd>
            </div>
            <div>
              <dt>Request hit ratio / byte-optimal</dt>
              <dd>{fmt(f.optimal.requestHit * 100)}%</dd>
            </div>
          </dl>
          <p className="muted">
            fillGB = Mbps × minutes × 60 / 8 / 1000; budget = min(storage, fillGB). Đây là ceiling
            lý tưởng. Forecast sai, partial viewing, nhiều renditions, disk/network contention và
            fill traffic làm hiệu quả thực tế khác; bytes tránh truyền không đồng nghĩa lợi nhuận.
          </p>
        </>
      )}
      {kind === 'netflix-live' && (
        <>
          <h3 id={id}>Live: ba loại áp lực cần tính riêng</h3>
          <p>
            Fixture có 20 POPs và một shared media segment 2 MB, dài 4 giây. Mỗi POP nhận đủ
            variants đang chọn; các requests đồng thời cùng cache key/generation. Origin fetch
            counts là giới hạn lý tưởng, không phải tải đo được. Auth, license và personalized
            manifests không được coalesce như shared media.
          </p>
          <div className="worksheet-inputs">
            <label>
              Concurrent joining viewers<output>{millions} M</output>
              <input
                type="range"
                min="1"
                max="10"
                value={millions}
                onChange={(e) => setMillions(+e.target.value)}
              />
            </label>
            <label>
              Join window<output>{join} s</output>
              <input
                type="range"
                min="1"
                max="120"
                value={join}
                onChange={(e) => setJoin(+e.target.value)}
              />
            </label>
            <label>
              Shared renditions<output>{variants}</output>
              <input
                type="range"
                min="1"
                max="4"
                value={variants}
                onChange={(e) => setVariants(+e.target.value)}
              />
            </label>
            <label>
              Playback buffer<output>{buffer} segments</output>
              <input
                type="range"
                min="1"
                max="3"
                value={buffer}
                onChange={(e) => setBuffer(+e.target.value)}
              />
            </label>
          </div>
          <div className="netflix-options" role="group" aria-label="Request coalescing policy">
            {(['none', 'edge', 'shield'] as const).map((p) => (
              <button
                type="button"
                key={p}
                data-policy={p}
                aria-pressed={policy === p}
                onClick={() => setPolicy(p)}
              >
                {p === 'none'
                  ? 'Không coalesce'
                  : p === 'edge'
                    ? 'Tại mỗi POP'
                    : 'POP và shared shield'}
              </button>
            ))}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Control requests / second</dt>
              <dd>{fmt(l.controlRps)}</dd>
            </div>
            <div>
              <dt>Over 100K/s control capacity</dt>
              <dd>{fmt(l.controlOverload)}</dd>
            </div>
            <div>
              <dt>Origin fetches / one segment generation</dt>
              <dd>{fmt(l.originFetches)}</dd>
            </div>
            <div>
              <dt>Origin payload</dt>
              <dd>{fmt(l.originGB, 3)} GB</dd>
            </div>
            <div>
              <dt>Viewer-facing payload</dt>
              <dd>{fmt(l.edgeEgressGB)} GB</dd>
            </div>
            <div>
              <dt>Illustrated glass-to-glass latency</dt>
              <dd>{l.latencySeconds} s</dd>
            </div>
            <div>
              <dt>Buffer coverage</dt>
              <dd>{l.bufferSeconds} s</dd>
            </div>
            <div>
              <dt>Stall lower bound / 6 s failover</dt>
              <dd>{l.stallSeconds} s</dd>
            </div>
          </dl>
          <div className="netflix-buffer" aria-label="Playback buffer coverage">
            {[1, 2, 3].map((n) => (
              <span key={n} data-buffered={n <= buffer}>
                {n * 4} s
              </span>
            ))}
          </div>
          <p className="muted">
            Hai control calls mỗi viewer; controlRps = viewers × 2 / join window. Media payload vẫn
            tới mọi viewer dù origin fetches giảm. Latency = 3 s encode/package + 1 s network +
            buffer × 4 s; stall = max(0, 6 − buffer × 4). Không mô phỏng CDN topology, throughput,
            encoder timing hoặc adaptive latency thực.
          </p>
        </>
      )}
    </section>
  );
}
