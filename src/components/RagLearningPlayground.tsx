import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  ragCandidates,
  ragIvf,
  ragIvfPoints,
  ragMemory,
  ragPublish,
  ragFixtureDocs,
} from '../lib/rag-learning-models';
export default function RagLearningPlayground({
  kind,
}: {
  kind: 'rag-ranks' | 'rag-ivf' | 'rag-publication';
}) {
  const ref = useIslandReady(),
    id = 'rag-learn-' + useId().replace(/:/g, '');
  const [depth, setDepth] = useState(3),
    [constant, setConstant] = useState(60),
    [mode, setMode] = useState<'lexical' | 'semantic' | 'hybrid'>('hybrid'),
    [rerank, setRerank] = useState(true),
    [early, setEarly] = useState(true);
  const [probe, setProbe] = useState(1),
    [qx, setQx] = useState(30),
    [qy, setQy] = useState(22),
    [millions, setMillions] = useState(1),
    [dims, setDims] = useState(768),
    [sub, setSub] = useState(96),
    [originals, setOriginals] = useState(false);
  const [deleted, setDeleted] = useState(true),
    [guard, setGuard] = useState(true),
    [queryGuard, setQueryGuard] = useState(true),
    [revoked, setRevoked] = useState(false);
  const ranked = ragCandidates(depth, constant, mode, rerank, early),
    ivf = ragIvf(probe, qx, qy),
    memory = ragMemory(millions * 1e6, dims, sub, 8),
    publication = ragPublish(deleted, guard, queryGuard, revoked);
  const title: Record<string, string> = {
    PRIVATE: 'Tài liệu riêng của nhóm khác',
    CACHE: 'Ghi chú cache không giải incident',
    OPS: 'Runbook xử lý lỗi ZK-204',
    RECOVERY: 'Khôi phục sau deploy lỗi',
    RESTORE: 'Restore của workflow khác',
    OLD: 'Runbook cũ đã rút',
    UPLOAD: 'Hướng dẫn upload',
    QUOTA: 'API quota',
  };
  const controls: [number, (n: number) => void, string, number, number, number][] =
    kind === 'rag-ranks'
      ? [
          [depth, setDepth, 'Depth mỗi retriever', 1, 7, 1],
          [constant, setConstant, 'RRF constant k', 0, 100, 10],
        ]
      : kind === 'rag-ivf'
        ? [
            [probe, setProbe, 'Số cells được probe', 1, 6, 1],
            [qx, setQx, 'Query coordinate x', 0, 80, 1],
            [qy, setQy, 'Query coordinate y', 0, 80, 1],
            [millions, setMillions, 'Số vectors cho memory budget (triệu)', 1, 20, 1],
          ]
        : [];
  const toggle = (label: string, v: boolean, set: (b: boolean) => void) => (
    <label className="worksheet-toggle">
      <input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  );
  const px = (x: number) => 50 + x * 7.5,
    py = (y: number) => 500 - y * 5.5;
  return (
    <section ref={ref} className="handbook-experiment rag-learning-playground" aria-labelledby={id}>
      <span className="eyebrow">RAG / CANDIDATES, INDEXES AND VISIBILITY</span>
      <h3 id={id}>
        {kind === 'rag-ranks'
          ? 'Rerank chỉ sắp xếp candidates đã tìm được'
          : kind === 'rag-ivf'
            ? 'Probe thêm cells để tìm lại neighbors bị bỏ sót'
            : 'Late build không được hồi sinh dữ liệu đã xóa'}
      </h3>
      <p>
        {kind === 'rag-ranks'
          ? 'Câu hỏi giả lập cần cả runbook ZK-204 và quy trình khôi phục. Hai ranked lists và rerank scores được khai báo trước, không chạy BM25, embedding hay cross-encoder. OPS và RECOVERY là hai labeled relevant chunks; PRIVATE không được phép, OLD đã rút. Lab chỉ tính rank fusion, candidate ceilings và filter ordering.'
          : kind === 'rag-ivf'
            ? 'Fixture có 48 points 2D, chia 6 nearest-centroid cells đã cố định. IVF-Flat probe cells gần query nhất rồi exact-score các points trong cells đó; ground truth là exact top-4 trên cả 48 points. Memory worksheet bên dưới là budget riêng cho N vectors d chiều, không thay dataset 2D và không suy ra latency/quality của index production.'
            : 'Job generation 4 bắt đầu build, sau đó source generation 5 update hoặc delete trước khi job cũ hoàn tất. Index ban đầu đã có generation 5, hoặc tombstone nếu delete. ACL trong index vẫn có thể stale độc lập content generation. Query của tenant alpha có thể dùng authoritative delete/ACL check trước khi expose chunk.'}
      </p>
      {kind === 'rag-ranks' && (
        <div className="rag-actions" role="group" aria-label="Retriever mode">
          {(['lexical', 'semantic', 'hybrid'] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
              {m}
            </button>
          ))}
        </div>
      )}
      <div className="worksheet-inputs">
        {controls.map(([v, set, label, min, max, step]) => (
          <label key={label}>
            {label}
            <output>{v}</output>
            <input
              type="range"
              value={v}
              min={min}
              max={max}
              step={step}
              onChange={(e) => set(+e.target.value)}
            />
          </label>
        ))}
      </div>
      {kind === 'rag-ranks' && (
        <>
          {toggle('Filter eligibility trước top-depth', early, setEarly)}
          {toggle('Dùng precomputed rerank scores', rerank, setRerank)}
          <div className="rag-ranked-lists">
            {ranked.lists.map((list, i) => (
              <article key={i}>
                <h4>Retriever {i + 1}</h4>
                <ol>
                  {list.map((d) => (
                    <li key={d}>
                      <strong>{d}</strong> · {title[d]}
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
          <figure className="handbook-table">
            <div
              className="rag-scroll-table"
              role="region"
              aria-label="Fused candidate scores and final prompt selection"
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    <th>Chunk</th>
                    <th>RRF score</th>
                    <th>Rerank score giả lập</th>
                    <th>Trong prompt top-2?</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.fused.map((d) => (
                    <tr key={d.id} data-chosen={ranked.top.some((t) => t.id === d.id)}>
                      <th scope="row">
                        {d.id} · {title[d.id]}
                      </th>
                      <td>{d.score.toFixed(6)}</td>
                      <td>{ragFixtureDocs.find((x) => x.id === d.id)!.rerank.toFixed(2)}</td>
                      <td>{ranked.top.some((t) => t.id === d.id) ? 'YES' : 'NO'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Relevant recall của candidates</dt>
              <dd>{(ranked.candidateRecall * 100).toFixed(0)}%</dd>
            </div>
            <div>
              <dt>Relevant recall@2 của prompt</dt>
              <dd>{(ranked.recall * 100).toFixed(0)}%</dd>
            </div>
            <div>
              <dt>Prompt precision</dt>
              <dd>{(ranked.precision * 100).toFixed(0)}%</dd>
            </div>
            <div>
              <dt>Số prompt chunks</dt>
              <dd>{ranked.top.length}</dd>
            </div>
          </dl>
          <p className="worksheet-footnote">
            RRF = sum 1/(k+rank), one-based ranks; missing items đóng góp 0 và repeated IDs trong
            cùng list chỉ đếm một lần. Early filtering trong toy loại PRIVATE/OLD trước depth; late
            filtering loại chúng ngay sau fusion, trước mọi simulated consumer. Production còn cần
            fresh authorization và không đưa unauthorized text tới logs/reranker/provider. Fixed
            rerank scores chỉ là scenario, không quality guarantee.
          </p>
        </>
      )}
      {kind === 'rag-ivf' && (
        <>
          <div
            className="rag-ivf-scroll"
            role="region"
            tabIndex={0}
            aria-label="Scrollable IVF diagram"
          >
            <svg
              className="rag-ivf-map"
              viewBox="0 0 700 550"
              role="img"
              aria-label="Two-dimensional IVF cells, visited points, exact and approximate neighbors"
            >
              <title>IVF toy: cells, query and top-4 points</title>
              <text x={50} y={530}>
                0
              </text>
              <text x={630} y={530}>
                80
              </text>
              <text x={675} y={530}>
                x
              </text>
              <text x={12} y={505}>
                0
              </text>
              <text x={8} y={68}>
                80
              </text>
              <text x={14} y={32}>
                y
              </text>
              {ivf.centers.map(([cx, cy], i) => {
                const col = i % 3,
                  row = Math.floor(i / 3),
                  xs = [0, 30, 50, 80],
                  ys = [0, 40, 80];
                return (
                  <g key={i}>
                    <rect
                      x={px(xs[col])}
                      y={py(ys[row + 1])}
                      width={(xs[col + 1] - xs[col]) * 7.5}
                      height={(ys[row + 1] - ys[row]) * 5.5}
                      className={ivf.visitedCells.includes(i) ? 'rag-cell is-visited' : 'rag-cell'}
                    />
                    <text x={px(xs[col]) + 12} y={py(ys[row + 1]) + 28} textAnchor="start">
                      C{i}
                    </text>
                    <path
                      d={`M${px(cx) - 5},${py(cy)}h10M${px(cx)},${py(cy) - 5}v10`}
                      className="rag-center"
                    />
                  </g>
                );
              })}
              {ragIvfPoints.map((p) => (
                <g key={p.id}>
                  <circle cx={px(p.x)} cy={py(p.y)} r={4} className="rag-point">
                    <title>{`${p.id}: (${p.x},${p.y}) · C${p.cell}`}</title>
                  </circle>
                  {ivf.exact.some((e) => e.id === p.id) && (
                    <circle cx={px(p.x)} cy={py(p.y)} r={10} className="rag-exact" />
                  )}
                  {ivf.approx.some((e) => e.id === p.id) && (
                    <rect
                      x={px(p.x) - 7}
                      y={py(p.y) - 7}
                      width={14}
                      height={14}
                      className="rag-approx"
                    />
                  )}
                </g>
              ))}
              <path
                d={`M${px(qx) - 9},${py(qy) - 9}l18,18M${px(qx) - 9},${py(qy) + 9}l18,-18`}
                className="rag-query"
              />
              <text x={px(qx) + 12} y={py(qy) - 10}>
                Q
              </text>
            </svg>
          </div>
          <p className="worksheet-footnote">
            Viền tròn = exact top-4; viền vuông = IVF top-4; X = query; ô tô nền = cells đã probe.
            Cuộn ngang trên màn hình nhỏ để xem toàn bộ sơ đồ. Axes là tọa độ giả lập, không phải
            dimensions của embedding text thật.
          </p>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Exact-neighbor recall@4</dt>
              <dd>{(ivf.recall * 100).toFixed(0)}%</dd>
            </div>
            <div>
              <dt>Points được score / tổng</dt>
              <dd>{ivf.scanned} / 48</dd>
            </div>
            <div>
              <dt>Distance evaluations gồm centroids</dt>
              <dd>{ivf.distanceEvaluations}</dd>
            </div>
            <div>
              <dt>Số point evaluations của Flat exact</dt>
              <dd>48</dd>
            </div>
          </dl>
          <div className="rag-actions" role="group" aria-label="Memory vector dimensions">
            {[384, 768, 1536].map((d) => (
              <button key={d} type="button" aria-pressed={dims === d} onClick={() => setDims(d)}>
                d={d}
              </button>
            ))}
          </div>
          <div className="rag-actions" role="group" aria-label="PQ subquantizers">
            {[48, 96].map((m) => (
              <button key={m} type="button" aria-pressed={sub === m} onClick={() => setSub(m)}>
                m={m}
              </button>
            ))}
          </div>
          {toggle('Giữ FP32 originals bên cạnh PQ codes', originals, setOriginals)}
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Flat FP32 + 64-bit IDs</dt>
              <dd>{(memory.flatBytes / 2 ** 30).toFixed(3)} GiB</dd>
            </div>
            <div>
              <dt>PQ codes + IDs + codebooks</dt>
              <dd>
                {(
                  (memory.pqPayloadBytes +
                    memory.pqCodebookBytes +
                    (originals ? millions * 1e6 * dims * 4 : 0)) /
                  2 ** 30
                ).toFixed(3)}{' '}
                GiB
              </dd>
            </div>
            <div>
              <dt>PQ codebooks riêng</dt>
              <dd>{(memory.pqCodebookBytes / 2 ** 20).toFixed(3)} MiB</dd>
            </div>
          </dl>
          <p className="worksheet-footnote">
            Flat = N(4d+8) bytes. PQ payload = N(m×8/8+8) bytes, codebooks = 2^8×d×4 bytes; d chia
            hết m, 8-bit subquantizers. Optional originals thêm N×d×4. Chưa gồm IVF centroids/list
            overhead, graph links, metadata/ACL, replicas hoặc allocator slack. Không simulate PQ
            distance distortion; exact-neighbor recall phía trên chỉ của 2D IVF-Flat.
          </p>
        </>
      )}
      {kind === 'rag-publication' && (
        <>
          {toggle('Source delete trước khi old build xong', deleted, setDeleted)}
          {toggle('Guard generation trước publish', guard, setGuard)}
          {toggle('Recheck source delete/ACL tại query boundary', queryGuard, setQueryGuard)}
          {toggle('Source revoke quyền của tenant alpha', revoked, setRevoked)}
          <ol className="rag-publish-events">
            <li>
              <strong>1 · Bắt đầu build</strong>
              <span>job v4 · cached ACL alpha</span>
            </li>
            <li>
              <strong>2 · Source đổi</strong>
              <span>
                v5 · {deleted ? 'DELETED' : 'LIVE'} · ACL {publication.source.acl}
              </span>
            </li>
            <li>
              <strong>3 · Old build hoàn tất</strong>
              <span>{publication.rejected ? 'REJECTED' : 'PUBLISHED'} · old job v4</span>
            </li>
            <li>
              <strong>4 · Query của alpha</strong>
              <span>{publication.visible ? 'VISIBLE' : 'BLOCKED'}</span>
            </li>
          </ol>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Content generation đã publish</dt>
              <dd>{publication.index?.generation ?? 'NONE'}</dd>
            </div>
            <div>
              <dt>Chunk hiển thị cho alpha?</dt>
              <dd>{publication.visible ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Đang hiển thị stale content?</dt>
              <dd>{publication.stale ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Lộ nội dung unauthorized/deleted?</dt>
              <dd>{publication.leak ? 'YES' : 'NO'}</dd>
            </div>
          </dl>
          <p className="worksheet-footnote">
            Generation guard chặn old builder ghi đè v5 hoặc resurrect tombstone. Query guard trong
            fixture chỉ kiểm authoritative liveness/ACL, không sửa stale content version. ACL
            freshness là chiều riêng với content generation. Đây là sequential snapshot giả lập;
            production cần atomic conditional publication, permission policy và bounded
            propagation/cache invalidation đúng threat model.
          </p>
        </>
      )}
    </section>
  );
}
