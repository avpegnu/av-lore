import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { creatorRetrieval, codecPayback, shortPrefetch } from '../lib/creator-video-models';
export default function CreatorVideoPlayground({
  kind,
}: {
  kind: 'creator-retrieval' | 'creator-codec' | 'creator-prefetch';
}) {
  const ref = useIslandReady(),
    id = 'creator-' + useId().replace(/:/g, '');
  const [count, setCount] = useState(6),
    [slots, setSlots] = useState(2),
    [budget, setBudget] = useState(30),
    [mixed, setMixed] = useState(true);
  const [views, setViews] = useState(20000),
    [eligible, setEligible] = useState(100),
    [minutes, setMinutes] = useState(3),
    [saving, setSaving] = useState(1),
    [encode, setEncode] = useState(12),
    [months, setMonths] = useState(1);
  const [depth, setDepth] = useState(3),
    [next, setNext] = useState(1),
    [network, setNetwork] = useState(3.2),
    [windowMs, setWindow] = useState(2000),
    [watched, setWatched] = useState(2);
  const retrieval = creatorRetrieval(count, slots, budget, mixed),
    codec = codecPayback(views, eligible, minutes, saving, encode, months),
    prefetch = shortPrefetch(depth, next, network, windowMs, watched);
  const fmt = (n: number) => n.toLocaleString('en-US'),
    money = (n: number) => '$' + n.toFixed(2);
  const inputs: [number, (n: number) => void, string, number, number, number][] =
    kind === 'creator-retrieval'
      ? [
          [count, setCount, 'Candidate limit', 2, 16, 2],
          [slots, setSlots, 'Parallel ranking slots', 1, 8, 1],
          [budget, setBudget, 'Latency budget (ms)', 10, 100, 5],
        ]
      : kind === 'creator-codec'
        ? [
            [views, setViews, 'Expected views', 0, 200000, 5000],
            [eligible, setEligible, 'Compatible views (%)', 0, 100, 10],
            [minutes, setMinutes, 'Watched minutes / compatible view', 1, 30, 1],
            [saving, setSaving, 'Bitrate saved (Mbps)', 0.5, 3, 0.5],
            [encode, setEncode, 'Extra encode cost ($)', 0, 50, 1],
            [months, setMonths, 'Storage horizon (months)', 1, 12, 1],
          ]
        : [
            [depth, setDepth, 'Prefetch depth', 0, 5, 1],
            [next, setNext, 'Chosen next clip', 1, 5, 1],
            [network, setNetwork, 'Link capacity (Mbps)', 1, 10, 0.2],
            [windowMs, setWindow, 'Prefetch window (ms)', 0, 5000, 500],
            [watched, setWatched, 'Next clip watched (s)', 0.5, 5, 0.5],
          ];
  return (
    <section ref={ref} className="handbook-experiment creator-playground" aria-labelledby={id}>
      <span className="eyebrow">CREATOR VIDEO / RECALL, COST AND BYTES</span>
      <h3 id={id}>
        {kind === 'creator-retrieval'
          ? 'Ranker không thể chọn video chưa được retrieve'
          : kind === 'creator-codec'
            ? 'Codec tốt hơn phải trả được chi phí thêm'
            : 'Prefetch nhiều chưa chắc mở clip nhanh hơn'}
      </h3>
      <p>
        {kind === 'creator-retrieval'
          ? 'Catalog gồm 16 video giả lập. Oracle là top 4 utility trong các video eligible, chỉ dùng để chấm recall của fixture; production không có oracle toàn tri. Thêm discovery source, đổi candidate limit và ranking slots rồi xem candidate nào thực sự đi tới top 3.'
          : kind === 'creator-codec'
            ? 'Giả định hai codec đạt quality target tương đương, mỗi compatible view xem đủ số phút đã chọn. Egress là $0.04/GB thập phân; additional storage là $3/tháng/video. Encode và storage tính toàn bộ, savings chỉ tính compatible views. Đây là worksheet giả định, không là báo giá hoặc benchmark.'
            : 'Mỗi clip 1.2 Mbps, prefix 2 giây = 0.3 MB. Link ưu tiên giữ 1.2 Mbps cho clip đang xem; spare capacity tải prefix tuần tự từ clip 1 đến depth. Sau một lần chọn clip, fixture bỏ các prefix khác để tính waste; feed thật có thể tái sử dụng chúng ở lần swipe sau.'}
      </p>
      <div className="worksheet-inputs">
        {inputs.map(([v, set, label, min, max, step]) => (
          <label key={label}>
            {label}
            <output>{fmt(v)}</output>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={v}
              onChange={(e) => set(+e.target.value)}
            />
          </label>
        ))}
      </div>
      {kind === 'creator-retrieval' && (
        <>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={mixed} onChange={(e) => setMixed(e.target.checked)} />
            Hợp nhất thêm discovery source và dedup candidates
          </label>
          <div className="creator-funnel">
            {[
              ['CORPUS', 16],
              ['RETRIEVED', retrieval.candidates.length],
              ['ELIGIBLE', retrieval.eligible.length],
              ['SHOWN', retrieval.shown.length],
            ].map(([label, n]) => (
              <article key={label}>
                <strong>{n}</strong>
                <span>{label}</span>
              </article>
            ))}
          </div>
          <div className="creator-recommendations">
            {retrieval.shown.map((v, i) => (
              <article key={v.id}>
                <span>#{i + 1}</span>
                <strong>{v.id}</strong>
                <small>UTILITY {v.utility}</small>
              </article>
            ))}
          </div>
          <figure className="handbook-table">
            <div role="region" tabIndex={0} aria-label="Retrieved candidate evidence">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Video</th>
                    <th scope="col">Affinity</th>
                    <th scope="col">Utility</th>
                    <th scope="col">Eligible</th>
                    <th scope="col">Oracle top 4</th>
                  </tr>
                </thead>
                <tbody>
                  {retrieval.candidates.map((v) => (
                    <tr key={v.id}>
                      <th scope="row">{v.id}</th>
                      <td>{v.affinity}</td>
                      <td>{v.utility}</td>
                      <td>{v.eligible ? 'YES' : 'NO'}</td>
                      <td>{retrieval.oracle.includes(v.id) ? 'YES' : 'NO'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Eligible oracle recall</dt>
              <dd>{(retrieval.recall * 100).toFixed(0)}%</dd>
            </div>
            <div>
              <dt>Ranking batches</dt>
              <dd>{retrieval.batches}</dd>
            </div>
            <div>
              <dt>Illustrative total latency</dt>
              <dd>{retrieval.totalMs.toFixed(1)} ms</dd>
            </div>
            <div>
              <dt>Within selected budget</dt>
              <dd>{retrieval.withinBudget ? 'YES' : 'NO'}</dd>
            </div>
          </dl>
          <p className="muted">
            Latency = 5 + 0.25×candidates + 4×ceil(eligible/slots) + 3 ms. Mỗi batch giả định cost
            cố định; chưa tính network, queues, accelerator utilization hay slow feature reads.
            Utility không phải trained prediction. Source recall, policy correctness và online
            satisfaction phải đo riêng.
          </p>
        </>
      )}
      {kind === 'creator-codec' && (
        <>
          <div className="creator-costs">
            {[
              ['EXTRA COST', codec.fixedCost],
              ['EGRESS SAVED', codec.savings],
            ].map(([label, value]) => (
              <article key={label}>
                <strong>{label}</strong>
                <span>{money(Number(value))}</span>
                <div>
                  <i
                    style={{
                      width:
                        (Number(value) / Math.max(codec.fixedCost, codec.savings, 1)) * 100 + '%',
                    }}
                  />
                </div>
              </article>
            ))}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Compatible views</dt>
              <dd>{fmt(codec.compatibleViews)}</dd>
            </div>
            <div>
              <dt>Saved decimal GB</dt>
              <dd>{codec.savedGb.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Extra cost</dt>
              <dd>{money(codec.fixedCost)}</dd>
            </div>
            <div>
              <dt>Net savings</dt>
              <dd>{money(codec.net)}</dd>
            </div>
            <div>
              <dt>Break-even total views</dt>
              <dd>{codec.breakEvenViews === null ? 'NONE' : fmt(codec.breakEvenViews)}</dd>
            </div>
          </dl>
          <p className="muted">
            GB saved/view = seconds×Mbps saved/8000. Break-even dùng compatible share, encode cost
            và storage horizon; không dùng clicks thay watch duration. Chưa gồm origin/cache
            transfer, decode energy, licenses, failed encodes, forecast uncertainty hoặc marginal
            cache economics. Khi compatible share bằng 0, không có finite break-even trong mô hình.
          </p>
        </>
      )}
      {kind === 'creator-prefetch' && (
        <>
          <div className="creator-prefixes">
            {prefetch.clips.map((c) => (
              <article key={c.index} data-selected={c.index === next}>
                <strong>CLIP {c.index}</strong>
                <div>
                  <i style={{ height: (c.mb / prefetch.prefixMb) * 100 + '%' }} />
                </div>
                <span>{c.mb.toFixed(3)} MB</span>
              </article>
            ))}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Spare prefetch capacity</dt>
              <dd>{prefetch.spareMbps.toFixed(1)} Mbps</dd>
            </div>
            <div>
              <dt>Fully warmed prefixes</dt>
              <dd>{prefetch.fullyWarmed}</dd>
            </div>
            <div>
              <dt>Startup estimate after swipe</dt>
              <dd>{prefetch.startupMs.toFixed(0)} ms</dd>
            </div>
            <div>
              <dt>Prefetched / useful MB</dt>
              <dd>
                {prefetch.prefetchedMb.toFixed(3)} / {prefetch.usefulMb.toFixed(3)}
              </dd>
            </div>
            <div>
              <dt>Wasted prefetch MB</dt>
              <dd>{prefetch.wastedMb.toFixed(3)}</dd>
            </div>
          </dl>
          <p className="muted">
            Sau swipe, clip mới dùng toàn link để bù prefix thiếu, cộng 80 ms control setup;
            reusable partial bytes được giả định hợp lệ. Không mô phỏng ABR, TCP, jitter hoặc
            decode. Nếu link dưới 1.2 Mbps, clip hiện tại cũng không sustain được bitrate giả định;
            spare bằng 0 không có nghĩa playback an toàn.
          </p>
        </>
      )}
    </section>
  );
}
