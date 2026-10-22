import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { abrReplay, videoProfiles, videoBandwidth, transcodeState } from '../lib/video-models';
export default function VideoPlayground({
  kind,
}: {
  kind: 'video-dag' | 'video-abr' | 'video-bandwidth';
}) {
  const ref = useIslandReady(),
    id = 'video-' + useId().replace(/:/g, '');
  const [clock, setClock] = useState(8),
    [failHigh, setFailHigh] = useState(true),
    [progressive, setProgressive] = useState(false),
    [gate, setGate] = useState(true);
  const [bandwidth, setBandwidth] = useState(6),
    [duration, setDuration] = useState(4),
    [profile, setProfile] = useState<keyof typeof videoProfiles>('drop'),
    [viewers, setViewers] = useState(10),
    [average, setAverage] = useState(3),
    [hit, setHit] = useState(95);
  const dag = transcodeState(clock, failHigh, progressive, gate),
    runs = [
      abrReplay(bandwidth, duration, profile, 'greedy'),
      abrReplay(bandwidth, duration, profile, 'buffer'),
    ],
    delivery = videoBandwidth(viewers * 100000, average, hit / 100),
    maxBuffer = Math.max(...runs.flatMap((r) => r.rows.map((s) => s.buffer)), 1);
  return (
    <section className="handbook-experiment" ref={ref} aria-labelledby={id}>
      <span className="eyebrow">VIDEO / ARTIFACTS, BUFFER AND BYTES</span>
      {kind === 'video-dag' && (
        <>
          <h3 id={id}>High rendition lỗi có cần chặn toàn bộ playback?</h3>
          <p>
            Clock là thời gian mô phỏng: probe xong ở 1, low ở 5, mid ở 8, high ở 12; high retry
            xong ở 20 nếu attempt đầu lỗi. Các controls đổi cả scenario từ đầu. Publish gate phải
            pass dù chọn minimal ladder; không mô phỏng codec hay moderation thật.
          </p>
          <div className="worksheet-inputs">
            <label>
              DAG clock / seconds<output>{clock}</output>
              <input
                type="range"
                min={0}
                max={20}
                value={clock}
                onChange={(e) => setClock(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={failHigh}
              onChange={(e) => setFailHigh(e.target.checked)}
            />
            High rendition lỗi lần đầu
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={progressive}
              onChange={(e) => setProgressive(e.target.checked)}
            />
            Publish khi low + mid đã đủ
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={gate} onChange={(e) => setGate(e.target.checked)} />
            Publish gate đã được duyệt trong scenario
          </label>
          <div className="video-dag">
            <section>
              <h4>Probe / validate source</h4>
              <strong>{dag.tasks[0].state}</strong>
            </section>
            <div>
              {dag.tasks.slice(1).map((task) => (
                <section key={task.id}>
                  <h4>{task.id}</h4>
                  <strong>{task.state}</strong>
                  <span>ready at {task.readyAt}s</span>
                </section>
              ))}
            </div>
            <section>
              <h4>Publish manifest</h4>
              <strong>{dag.state}</strong>
              <p>{dag.published.join(' + ') || '—'}</p>
            </section>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Encoded renditions ready</dt>
              <dd>{dag.renditions.length}</dd>
            </div>
            <div>
              <dt>Published renditions</dt>
              <dd>{dag.published.length}</dd>
            </div>
            <div>
              <dt>First playable / seconds</dt>
              <dd>{dag.firstPlayable ?? '—'}</dd>
            </div>
            <div>
              <dt>Manifest version</dt>
              <dd>{dag.manifestVersion || '—'}</dd>
            </div>
          </dl>
          <p>
            Chỉ manifest trỏ tới artifact đã validate mới được publish. Progressive publish đổi
            time-to-playable, không tự giảm total encode work; khi high xong, xuất manifest version
            mới. Gate chưa duyệt thì artifact có thể đã encode nhưng chưa được phục vụ công khai.
          </p>
        </>
      )}
      {kind === 'video-abr' && (
        <>
          <h3 id={id}>Bitrate cao hơn có luôn cho trải nghiệm tốt hơn?</h3>
          <p>
            Replay 12 segment với ladder 0,4 / 0,8 / 1,5 / 3 / 6 Mbps. Mỗi rule chọn bitrate từ
            estimate trước download; throughput estimate dùng EWMA sau download. Rule buffer dùng
            safety factor và giảm budget khi buffer dưới 8 giây. Không mô phỏng RTT, max-buffer
            pacing hay codec quality.
          </p>
          <div className="worksheet-inputs">
            <label>
              Baseline bandwidth / Mbps<output>{bandwidth}</output>
              <input
                type="range"
                min={2}
                max={12}
                value={bandwidth}
                onChange={(e) => setBandwidth(+e.target.value)}
              />
            </label>
            <label>
              Segment duration / seconds<output>{duration}</output>
              <input
                type="range"
                min={2}
                max={6}
                value={duration}
                onChange={(e) => setDuration(+e.target.value)}
              />
            </label>
          </div>
          <div className="worksheet-choices">
            {Object.keys(videoProfiles).map((p) => (
              <button
                type="button"
                key={p}
                className="secondary"
                aria-pressed={profile === p}
                onClick={() => setProfile(p as keyof typeof videoProfiles)}
              >
                {p === 'steady'
                  ? 'Mạng đều'
                  : p === 'drop'
                    ? 'Bandwidth giảm đột ngột'
                    : 'Mạng hồi phục'}
              </button>
            ))}
          </div>
          <div className="video-abr-results">
            {runs.map((run, i) => (
              <section key={i}>
                <h4>{i ? 'Throughput + buffer rule' : 'Greedy throughput rule'}</h4>
                <dl>
                  <div>
                    <dt>Startup / s</dt>
                    <dd>{run.startup.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>Rebuffer / s</dt>
                    <dd>{run.stalls.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>Average selected / Mbps</dt>
                    <dd>{run.averageMbps.toFixed(2)}</dd>
                  </div>
                </dl>
              </section>
            ))}
          </div>
          <div
            className="routing-chart video-buffer-chart"
            role="region"
            tabIndex={0}
            aria-label="Buffer sau mỗi segment"
          >
            <svg viewBox="0 0 900 280" role="img" aria-label="So sánh buffer của hai rule">
              <title>Buffer seconds after each download</title>
              <text x={15} y={24}>
                {maxBuffer.toFixed(1)} s
              </text>
              <text x={30} y={238}>
                0
              </text>
              {runs.map((run, i) => (
                <polyline
                  key={i}
                  data-rule={i}
                  fill="none"
                  points={run.rows
                    .map((r, j) => `${75 + j * 70},${235 - (r.buffer / maxBuffer) * 200}`)
                    .join(' ')}
                />
              ))}
              {Array.from({ length: 12 }, (_, i) => (
                <text key={i} x={75 + i * 70} y={268}>
                  {i + 1}
                </text>
              ))}
            </svg>
          </div>
          <p className="video-chart-legend">
            <span>Solid: greedy throughput</span>
            <span>Dashed: throughput + buffer</span>
          </p>
          <details>
            <summary>Xem từng segment và buffer</summary>
            {runs.map((run, i) => (
              <section key={i}>
                <h4>{i ? 'Throughput + buffer rule' : 'Greedy throughput rule'}</h4>
                <div
                  className="video-segment-table"
                  role="region"
                  tabIndex={0}
                  aria-label={i ? 'Buffer rule segment data' : 'Greedy rule segment data'}
                >
                  <table>
                    <thead>
                      <tr>
                        {[
                          'Segment',
                          'Network Mbps',
                          'Chosen Mbps',
                          'Download s',
                          'Buffer s',
                          'Rebuffer s',
                        ].map((t) => (
                          <th scope="col" key={t}>
                            {t}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {run.rows.map((r) => (
                        <tr key={r.index}>
                          <th scope="row">{r.index}</th>
                          <td>{r.available.toFixed(2)}</td>
                          <td>{r.selected}</td>
                          <td>{r.download.toFixed(2)}</td>
                          <td>{r.buffer.toFixed(2)}</td>
                          <td>{r.stall.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </details>
          <p>
            Download time = segment seconds × chosen Mbps / available Mbps. Startup tách khỏi
            rebuffer. Chart dừng khi download đủ 12 segment, không phải lúc xem hết video; buffer
            còn lại sẽ tiếp tục phát. Safety rule không bảo đảm hết stall nếu mạng thấp hơn ladder
            hoặc estimate phản ứng chậm.
          </p>
        </>
      )}
      {kind === 'video-bandwidth' && (
        <>
          <h3 id={id}>CDN hit cao có làm viewer egress biến mất?</h3>
          <p>
            Concurrent viewers được giữ liên tục trong một giờ của ví dụ. Hit là byte hit ratio tại
            CDN; coi các byte còn miss đi tới origin, chưa tính shield/coalescing và overhead. Đây
            là capacity arithmetic, không phải giá dịch vụ.
          </p>
          <div className="worksheet-inputs">
            <label>
              Concurrent viewers / 100,000<output>{viewers}</output>
              <input
                type="range"
                min={1}
                max={20}
                value={viewers}
                onChange={(e) => setViewers(+e.target.value)}
              />
            </label>
            <label>
              Average delivered / Mbps<output>{average}</output>
              <input
                type="range"
                min={1}
                max={8}
                value={average}
                onChange={(e) => setAverage(+e.target.value)}
              />
            </label>
            <label>
              CDN byte hit / %<output>{hit}</output>
              <input
                type="range"
                min={0}
                max={100}
                value={hit}
                onChange={(e) => setHit(+e.target.value)}
              />
            </label>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Viewer delivery / Gbit per second</dt>
              <dd>{delivery.viewerGbps.toFixed(0)}</dd>
            </div>
            <div>
              <dt>Origin miss traffic / Gbit per second</dt>
              <dd>{delivery.originGbps.toFixed(1)}</dd>
            </div>
            <div>
              <dt>Viewer bytes / hour / decimal TB</dt>
              <dd>{delivery.hourlyTB.toFixed(1)}</dd>
            </div>
            <div>
              <dt>Concurrent viewers</dt>
              <dd>{(viewers * 100000).toLocaleString('en-US')}</dd>
            </div>
          </dl>
          <p>
            Cache giảm origin fill, không xóa byte CDN gửi tới viewer. Request hit ratio không thay
            được byte hit ratio nếu kích thước segment khác nhau. Warm-cache scenario không chứng
            minh origin chịu được cold start hay cache outage.
          </p>
        </>
      )}
    </section>
  );
}
