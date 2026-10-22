import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { crawlSchedule, bloomSizing, crawlJobs } from '../lib/crawler-models';
export default function CrawlerPlayground({ kind }: { kind: 'crawl-frontier' | 'bloom-budget' }) {
  const ref = useIslandReady(),
    id = 'crawler-' + useId().replace(/:/g, '');
  const [concurrency, setConcurrency] = useState(3),
    [delay, setDelay] = useState(2),
    [polite, setPolite] = useState(true),
    [bits, setBits] = useState(10),
    [load, setLoad] = useState(100);
  const schedule = crawlSchedule(concurrency, delay, polite),
    bloom = bloomSizing(bits, load / 100);
  return (
    <section className="handbook-experiment" ref={ref} aria-labelledby={id}>
      <span className="eyebrow">CRAWLING / POLITENESS AND MEMBERSHIP BUDGETS</span>
      {kind === 'crawl-frontier' && (
        <>
          <h3 id={id}>Thêm worker có làm một host được crawl nhanh tùy ý?</h3>
          <p>
            Có 10 job trên ba host, duration cố định. Polite mode giữ tối đa một fetch đang chạy mỗi
            host và khoảng cách tối thiểu giữa hai lần bắt đầu. Đây là configured interval, không
            giả định Crawl-delay thuộc robots standard.
          </p>
          <div className="worksheet-inputs">
            <label>
              Minimum start interval / seconds<output>{delay}</output>
              <input
                type="range"
                min={0}
                max={5}
                value={delay}
                onChange={(e) => setDelay(+e.target.value)}
              />
            </label>
            <label>
              Global concurrent fetches<output>{concurrency}</output>
              <input
                type="range"
                min={1}
                max={4}
                value={concurrency}
                onChange={(e) => setConcurrency(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={polite} onChange={(e) => setPolite(e.target.checked)} />
            Enforce per-host politeness
          </label>
          <div
            className="routing-chart crawler-chart"
            role="region"
            tabIndex={0}
            aria-label="Timeline crawl theo host"
          >
            <svg viewBox="0 0 960 360" role="img" aria-label="Lịch bắt đầu và kết thúc các fetch">
              <title>Crawl schedule / seconds</title>
              {crawlJobs.map((job, i) => {
                const r = schedule.rows.find((row) => row.job.id === job.id)!;
                return (
                  <g key={job.id}>
                    <text x={10} y={29 + i * 29}>
                      {job.host} / {job.id}
                    </text>
                    <rect
                      x={170 + (r.start / schedule.makespan) * 760}
                      y={10 + i * 29}
                      width={(r.job.duration / schedule.makespan) * 760}
                      height={24}
                      rx={4}
                    />
                    <text x={174 + (r.start / schedule.makespan) * 760} y={27 + i * 29}>
                      {r.start}–{r.end}
                    </text>
                    <title>{`${r.job.id}: ${r.start} → ${r.end}s`}</title>
                  </g>
                );
              })}
              {Array.from({ length: Math.ceil(schedule.makespan) + 1 }, (_, t) => (
                <text key={t} x={170 + (t / schedule.makespan) * 760} y={342}>
                  {t}
                </text>
              ))}
            </svg>
          </div>
          <details>
            <summary>Đọc lịch fetch dạng văn bản</summary>
            <ol>
              {schedule.rows.map((r) => (
                <li key={r.job.id}>
                  <code>
                    {r.job.id} / {r.job.host}: {r.start} → {r.end}s
                  </code>
                </li>
              ))}
            </ol>
          </details>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Total jobs</dt>
              <dd>{schedule.rows.length}</dd>
            </div>
            <div>
              <dt>Completion time / seconds</dt>
              <dd>{schedule.makespan}</dd>
            </div>
            <div>
              <dt>Per-host policy violations</dt>
              <dd>{schedule.violations}</dd>
            </div>
            <div>
              <dt>Busy worker-seconds</dt>
              <dd>{schedule.work}</dd>
            </div>
          </dl>
          <p>
            Tắt policy để thấy FIFO/global concurrency có thể dồn request vào host A. Bật lại sẽ
            dùng host khác khi A chưa ready; capacity nhàn là hợp lệ nếu mọi host đều đang chờ
            interval. Mô hình không gồm robots fetch, DNS, retry hay owner failover.
          </p>
        </>
      )}
      {kind === 'bloom-budget' && (
        <>
          <h3 id={id}>Bloom filter tiết kiệm RAM đổi lấy điều gì?</h3>
          <p>
            Thiết kế cho 10 tỷ URL. Đổi bit mỗi URL thiết kế và actual insertion load. Công thức giả
            định Bloom filter chuẩn, hash uniform, bit được giữ đúng và không deletion; không phải
            đo false-positive rate của một implementation cụ thể.
          </p>
          <div className="worksheet-inputs">
            <label>
              Bits / designed URL<output>{bits}</output>
              <input
                type="range"
                min={4}
                max={20}
                value={bits}
                onChange={(e) => setBits(+e.target.value)}
              />
            </label>
            <label>
              Actual insertions / capacity %<output>{load}</output>
              <input
                type="range"
                min={0}
                max={200}
                step={10}
                value={load}
                onChange={(e) => setLoad(+e.target.value)}
              />
            </label>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Bit-array memory / decimal GB</dt>
              <dd>{bloom.memoryGB.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Hash count / rounded optimum at capacity</dt>
              <dd>{bloom.hashes}</dd>
            </div>
            <div>
              <dt>Estimated false positive / %</dt>
              <dd>{(bloom.falsePositive * 100).toFixed(4)}</dd>
            </div>
            <div>
              <dt>Novel URLs skipped / 1 million ≈</dt>
              <dd>{bloom.expectedSkippedNovel.toFixed(0)}</dd>
            </div>
          </dl>
          <div className="bloom-choices">
            <section>
              <h4>Bloom-only skip</h4>
              <p>
                Positive → bỏ URL. Nhanh nhưng có thể mất coverage do false positive; con số skipped
                phía trên chỉ áp dụng cho policy này.
              </p>
            </section>
            <section>
              <h4>Positive → exact check</h4>
              <p>
                Negative → chưa có; positive → kiểm store authoritative. Giữ coverage trước false
                positive nhưng thêm lookup; Bloom không thay atomic enqueue/seen state.
              </p>
            </section>
          </div>
          <p>
            No false negatives chỉ đúng với thành viên đã insert và state/hash đúng. Mất bit, reset
            hoặc deletion không phù hợp có thể phá giả định đó. Race với enqueue có thể làm mất job
            dù filter không sai; filter không tự bảo đảm crawler không loop hoặc không bỏ URL.
          </p>
        </>
      )}
    </section>
  );
}
