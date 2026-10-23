import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  GIB,
  kvRankBudget,
  kvPagePool,
  kvPrefixReuse,
  kvFork,
  kvTransfer,
} from '../lib/kv-cache-models';
export default function KvCachePlayground({
  kind,
}: {
  kind: 'kv-ranks' | 'kv-pages' | 'kv-prefix' | 'kv-transfer';
}) {
  const ref = useIslandReady(),
    id = 'kv-cache-' + useId().replace(/:/g, '');
  const [tpPower, setTpPower] = useState(1),
    [headIndex, setHeadIndex] = useState(1),
    [weightBits, setWeightBits] = useState(16),
    [lowKv, setLowKv] = useState(false),
    [contextKi, setContextKi] = useState(8),
    [sequences, setSequences] = useState(4),
    [reserve, setReserve] = useState(8);
  const [blockIndex, setBlockIndex] = useState(1),
    [growth, setGrowth] = useState(8),
    [growthReserved, setGrowthReserved] = useState(false),
    [share, setShare] = useState(true);
  const [changed, setChanged] = useState(0),
    [tenant, setTenant] = useState(false),
    [model, setModel] = useState(false),
    [resident, setResident] = useState(true),
    [bind, setBind] = useState(true),
    [copy, setCopy] = useState(true);
  const [transferKi, setTransferKi] = useState(32),
    [bandwidth, setBandwidth] = useState(16),
    [prefillK, setPrefillK] = useState(80),
    [queue, setQueue] = useState(0),
    [deadline, setDeadline] = useState(500),
    [loadOnly, setLoadOnly] = useState(false);
  const tp = 2 ** tpPower,
    heads = [1, 8, 64][headIndex],
    block = [4, 8, 16][blockIndex],
    memory = kvRankBudget(
      tp,
      heads,
      weightBits,
      lowKv ? 8 : 16,
      contextKi * 1024,
      sequences,
      reserve,
    ),
    pool = kvPagePool(block, growth, growthReserved, share),
    prefix = kvPrefixReuse(changed, tenant, model, resident, bind),
    fork = kvFork(copy),
    transfer = kvTransfer(transferKi * 1024, bandwidth, prefillK * 1000, queue, deadline, loadOnly);
  const gib = (n: number) => (n / GIB).toFixed(2),
    fmt = (n: number) => n.toLocaleString('en-US');
  const sliders: [number, (n: number) => void, string, number, number, number, string?][] =
    kind === 'kv-ranks'
      ? [
          [tpPower, setTpPower, 'Hệ số TP', 0, 4, 1, String(tp)],
          [headIndex, setHeadIndex, 'KV heads / model', 0, 2, 1, String(heads)],
          [contextKi, setContextKi, 'Tokens đang giữ / sequence (Ki)', 1, 64, 1],
          [sequences, setSequences, 'Sequences đồng thời', 1, 16, 1],
          [reserve, setReserve, 'Reserve ngoài KV / rank (GiB)', 4, 24, 1],
        ]
      : kind === 'kv-pages'
        ? [
            [blockIndex, setBlockIndex, 'Tokens / block', 0, 2, 1, String(block)],
            [growth, setGrowth, 'Future tokens / sequence', 0, 16, 1],
          ]
        : kind === 'kv-prefix'
          ? [[changed, setChanged, 'Token đổi (0 = giữ nguyên)', 0, 12, 1]]
          : [
              [transferKi, setTransferKi, 'Độ dài prefix (Ki tokens)', 1, 64, 1],
              [bandwidth, setBandwidth, 'Bandwidth hiệu dụng (GB/s)', 4, 64, 4],
              [prefillK, setPrefillK, 'Prefill rate giả định (K tokens/s)', 10, 100, 10],
              [queue, setQueue, 'Chờ queue recompute (ms)', 0, 500, 50],
              [deadline, setDeadline, 'Deadline khi resume (ms)', 100, 1000, 50],
            ];
  return (
    <section ref={ref} className="handbook-experiment kv-cache-playground" aria-labelledby={id}>
      <span className="eyebrow">KV CACHE / PHYSICAL MEMORY AND REUSE</span>
      <h3 id={id}>
        {kind === 'kv-ranks'
          ? 'Tổng HBM đủ chưa có nghĩa từng rank đủ'
          : kind === 'kv-pages'
            ? 'Pages hiện tại vừa, decode tiếp có thể hết chỗ'
            : kind === 'kv-prefix'
              ? 'Cùng token chưa đủ để dùng chung KV'
              : 'Offload cần tính cả đường đi lẫn đường về'}
      </h3>
      <p>
        {kind === 'kv-ranks'
          ? 'Fixture dense attention: 70 tỷ parameters, 80 layers, head dimension 128; mỗi rank có 80 GiB giả định. Weights chia đều lý tưởng. INT8/INT4 thêm một scale 2 bytes cho mỗi 128 weights; reserve là giả định riêng cho workspace/activations/runtime, không phải tỷ lệ chuẩn. Thay KV heads chỉ so kiến trúc giả định, không chuyển model đang chạy sang GQA.'
          : kind === 'kv-pages'
            ? 'Pool có 96 token slots, bốn sequences A/B/C/D dài 13/17/22/26 tokens. Cả bốn có prefix 8 tokens giống nhau; chỉ full blocks được share. FIFO dừng ở request đầu không vừa. So với fixed slab tối đa 32 + future tokens; cả hai mô hình bỏ qua external fragmentation và kernel costs.'
            : kind === 'kv-prefix'
              ? 'Cache giữ 12 tokens; request mới có cùng prefix và thêm 2 tokens. Block size là 4. Thay một token hoặc execution/security context để thấy phần nào còn tái dùng hợp lệ. Token IDs trong hình là fixture, không phải tokenizer thật.'
              : 'Fixture riêng: 32 layers, 8 KV heads, head dimension 128, BF16, không sharding. Payload là 128 KiB/token. Giả định effective bandwidth đã cho, cộng 2 ms overhead mỗi chiều; recompute dùng prefill rate cố định và queue delay đã chọn. Đây là arithmetic, không là GPU benchmark.'}
      </p>
      <div className="worksheet-inputs">
        {sliders.map(([v, set, label, min, max, step, display]) => (
          <label key={label}>
            {label}
            <output>{display ?? fmt(v)}</output>
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
      {kind === 'kv-ranks' && (
        <>
          <div className="kv-weight-options" role="group" aria-label="Precision của weights">
            {[16, 8, 4].map((bits) => (
              <button
                key={bits}
                type="button"
                aria-pressed={weightBits === bits}
                onClick={() => setWeightBits(bits)}
              >
                {bits === 16 ? 'BF16' : bits === 8 ? 'INT8' : 'INT4'}
              </button>
            ))}
          </div>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={lowKv} onChange={(e) => setLowKv(e.target.checked)} />
            Dùng KV 8-bit thay cho 16-bit
          </label>
          <div className="kv-memory-layers">
            {[
              ['WEIGHTS + SCALES', memory.weightPerRank],
              ['RESIDENT KV', memory.kvPerRank],
              ['RESERVE', reserve * GIB],
            ].map(([label, value]) => (
              <article key={label}>
                <strong>{label}</strong>
                <span>{gib(Number(value))} GiB / rank</span>
                <div aria-hidden="true">
                  <i
                    style={{
                      width: Math.min(100, (Number(value) / memory.deviceBytes) * 100) + '%',
                    }}
                  />
                </div>
              </article>
            ))}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>KV heads trên mỗi rank</dt>
              <dd>{memory.localKvHeads}</dd>
            </div>
            <div>
              <dt>Hệ số KV replication</dt>
              <dd>{memory.replicationFactor}×</dd>
            </div>
            <div>
              <dt>KV logical trên token</dt>
              <dd>{fmt(memory.kvBytesPerToken / 1024)} KiB</dd>
            </div>
            <div>
              <dt>Memory còn trống / rank</dt>
              <dd>{gib(memory.headroom)} GiB</dd>
            </div>
            <div>
              <dt>Sequences ở độ dài này</dt>
              <dd>{memory.maxSequences}</dd>
            </div>
            <div>
              <dt>Tất cả rank có vừa không?</dt>
              <dd>{memory.fits ? 'FITS' : 'OOM'}</dd>
            </div>
          </dl>
          <p className="muted">
            TP vượt số KV heads có thể replicate heads trong mapping này: 8 → 16 ranks không giảm
            local KV thêm. Chưa gồm uneven shards, replicated tensors, padding và KV scales; reserve
            phải đo theo engine/workload. FITS chỉ kiểm current resident tokens và giả định trên,
            không hứa latency, output-growth capacity hoặc model context support.
          </p>
        </>
      )}
      {kind === 'kv-pages' && (
        <>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />
            Share full blocks của prefix chung
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={growthReserved}
              onChange={(e) => setGrowthReserved(e.target.checked)}
            />
            Dành trước pages cho future tokens đã chọn
          </label>
          <div className="kv-page-pool">
            {Array.from({ length: pool.capacity / block }, (_, i) => {
              const p = pool.pages[i];
              return (
                <article key={i} data-shared={Boolean(p && p.refs.length > 1)}>
                  <strong>P{i}</strong>
                  <span>{p ? p.refs.join('/') : 'FREE'}</span>
                  <div aria-hidden="true">
                    <i style={{ width: (p ? (p.live / block) * 100 : 0) + '%' }} />
                    <b style={{ width: (p ? ((p.planned - p.live) / block) * 100 : 0) + '%' }} />
                  </div>
                  <small>
                    {p ? p.live : 0} / {block}
                  </small>
                </article>
              );
            })}
          </div>
          <figure className="handbook-table">
            <div role="region" tabIndex={0} aria-label="Sequence block tables">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Sequence</th>
                    <th scope="col">Resident / planned</th>
                    <th scope="col">Logical → physical pages</th>
                  </tr>
                </thead>
                <tbody>
                  {pool.admitted.map((r) => (
                    <tr key={r.id}>
                      <th scope="row">{r.id}</th>
                      <td>
                        {r.length} / {r.planned}
                      </td>
                      <td>{r.pageIds.map((p, j) => j + '→P' + p).join(' · ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Admitted: pages / slab</dt>
              <dd>
                {pool.admitted.length} / {pool.slabAdmitted}
              </dd>
            </div>
            <div>
              <dt>Slots vật lý đã cấp</dt>
              <dd>{pool.allocated} / 96</dd>
            </div>
            <div>
              <dt>Slots tiết kiệm nhờ share</dt>
              <dd>{pool.sharedTokensSaved}</dd>
            </div>
            <div>
              <dt>Slots dư do làm tròn</dt>
              <dd>{pool.roundingSlack}</dd>
            </div>
            <div>
              <dt>Slots dành cho future</dt>
              <dd>{pool.reservedGrowth}</dd>
            </div>
            <div>
              <dt>Slots cần sau growth</dt>
              <dd>{pool.futureRequired}</dd>
            </div>
            <div>
              <dt>Tất cả có thể tăng tiếp?</dt>
              <dd>{pool.growthFits ? 'YES' : 'NO'}</dd>
            </div>
          </dl>
          <p className="muted">
            Bar sáng là resident values; bar nhạt là reserved future values; phần còn lại trong
            allocated page là rounding slack. Full shared pages chỉ đếm một lần vật lý.
            Kernel/block-table/COW metadata chưa tính. Nếu future required vượt 96, scheduler cần
            preemption, admission hoặc reserve policy; paging không tự bảo đảm mọi sequence sẽ sinh
            tiếp được.
          </p>
        </>
      )}
      {kind === 'kv-prefix' && (
        <>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={tenant} onChange={(e) => setTenant(e.target.checked)} />
            Request thuộc tenant khác với cache
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={model} onChange={(e) => setModel(e.target.checked)} />
            Model/adapter/KV format context đã đổi
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={resident}
              onChange={(e) => setResident(e.target.checked)}
            />
            Replica hiện tại còn giữ cached blocks
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={bind} onChange={(e) => setBind(e.target.checked)} />
            Cache key bind đúng execution context và tenant
          </label>
          <div className="kv-prefix-blocks">
            {prefix.blocks.map((b) => (
              <article key={b.index} data-reused={b.reused}>
                <strong>BLOCK {b.index}</strong>
                <span>{b.tokens.join(' · ')}</span>
                <small>{b.reused ? 'REUSED' : 'COMPUTE'}</small>
              </article>
            ))}
            <article>
              <strong>NEW TAIL</strong>
              <span>501 · 502</span>
              <small>COMPUTE</small>
            </article>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Tokens tái dùng từ full blocks</dt>
              <dd>{prefix.reusedTokens}</dd>
            </div>
            <div>
              <dt>Tokens còn phải prefill</dt>
              <dd>{prefix.prefillTokens}</dd>
            </div>
            <div>
              <dt>Reuse sai context?</dt>
              <dd>{prefix.unsafeReuse ? 'YES' : 'NO'}</dd>
            </div>
          </dl>
          <h4>Fork một partial tail: cần copy-on-write</h4>
          <p>
            Fixture thứ hai là sampling fork, không phải APC lookup: hai branches share prefix 6
            tokens trong blocks 4 tokens. A append 91, B append 92. Nếu cùng ghi shared partial
            tail, branch A bị thay bằng dữ liệu của B.
          </p>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={copy} onChange={(e) => setCopy(e.target.checked)} />
            Copy shared partial tail trước khi append
          </label>
          <div className="kv-fork-branches">
            <article>
              <strong>SHARED P0</strong>
              <span>{fork.first.join(' · ')}</span>
            </article>
            <article>
              <strong>BRANCH A</strong>
              <span>{fork.a.join(' · ')}</span>
            </article>
            <article>
              <strong>BRANCH B</strong>
              <span>{fork.b.join(' · ')}</span>
            </article>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Số physical pages khi fork</dt>
              <dd>{fork.physicalPages}</dd>
            </div>
            <div>
              <dt>Branch A bị ghi đè?</dt>
              <dd>{fork.branchALost ? 'YES' : 'NO'}</dd>
            </div>
          </dl>
          <p className="muted">
            Prefix reuse giảm cached prefill work, không sinh sẵn output mới. Full-prefix matches
            còn cần engine-specific logits/tail handling. Routing tới replica khác có thể miss hợp
            lệ; không bỏ tenant/auth context để tăng hit rate. COW và refcounts phải đúng cả cancel,
            eviction, retry và asynchronous kernels.
          </p>
        </>
      )}
      {kind === 'kv-transfer' && (
        <>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={loadOnly}
              onChange={(e) => setLoadOnly(e.target.checked)}
            />
            CPU đã có bản copy hợp lệ: chỉ tính reload
          </label>
          <div className="kv-transfer-path">
            <article>
              <strong>GPU KV</strong>
              <span>{gib(transfer.bytes)} GiB</span>
            </article>
            <span aria-hidden="true">⇄</span>
            <article>
              <strong>CPU MEMORY</strong>
              <span>{loadOnly ? 'EXISTING COPY' : 'SWAP OUT + IN'}</span>
            </article>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Thời gian transfer ước tính</dt>
              <dd>{transfer.transferMs.toFixed(1)} ms</dd>
            </div>
            <div>
              <dt>Recompute và chờ queue</dt>
              <dd>{transfer.recomputeMs.toFixed(1)} ms</dd>
            </div>
            <div>
              <dt>Transfer kịp deadline?</dt>
              <dd>{transfer.transferWithin ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Recompute kịp deadline?</dt>
              <dd>{transfer.recomputeWithin ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Nhanh hơn trong fixture</dt>
              <dd className="kv-long-value">{transfer.quicker}</dd>
            </div>
          </dl>
          <p className="muted">
            GB/s là thập phân, GiB là nhị phân. Queue/bus contention, pinned memory, kernel
            scheduling, overlap và layer-wise streaming chưa mô phỏng; estimates không là guaranteed
            latency. Chỉ reload nếu cached payload còn đúng model/sequence/format và ownership; mất
            hoặc stale backing cần recompute/reject thay reuse sai.
          </p>
        </>
      )}
    </section>
  );
}
