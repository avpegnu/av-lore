import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { logSeek, logReplication, logVisibility, type TransactionState } from '../lib/log-models';
export default function LogPlayground({
  kind,
}: {
  kind: 'log-seek' | 'log-replicas' | 'log-visibility';
}) {
  const id = useId(),
    ref = useIslandReady(),
    [offset, setOffset] = useState(5),
    [compact, setCompact] = useState(false),
    [expire, setExpire] = useState(false),
    [stage, setStage] = useState(2),
    [min, setMin] = useState(2),
    [ack, setAck] = useState<'leader' | 'all'>('all'),
    [lost, setLost] = useState(false),
    [unclean, setUnclean] = useState(false),
    [hw, setHw] = useState(6),
    [tx, setTx] = useState<TransactionState>('open'),
    [committed, setCommitted] = useState(true);
  const seek = logSeek(offset, compact, expire),
    rep = logReplication(stage, min, ack, lost, unclean),
    vis = logVisibility(hw, tx, committed);
  return (
    <section className="handbook-experiment log-playground" ref={ref} aria-labelledby={id}>
      <span className="eyebrow">PARTITIONED LOG / BYTES, COMMIT AND VISIBILITY</span>
      {kind === 'log-seek' && (
        <>
          <h3 id={id}>Offset không phải vị trí byte hoặc số thứ tự liên tục</h3>
          <p>
            Fixture có ba segments, mỗi segment bốn records trước rewrite. Sparse index giữ entry
            cho mỗi hai records còn lại. Compaction bỏ các phiên bản key cũ và rewrite byte
            positions; offset của records còn giữ không đổi. Retention xóa cả segment đầu. Đây là
            file layout minh họa, không phải Kafka batch/index format thực.
          </p>
          <div className="worksheet-inputs">
            <label>
              Offset cần đọc<output>{offset}</output>
              <input
                type="range"
                min="0"
                max="12"
                value={offset}
                onChange={(e) => setOffset(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={compact}
              onChange={(e) => setCompact(e.target.checked)}
            />
            Compact các phiên bản key cũ
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={expire} onChange={(e) => setExpire(e.target.checked)} />
            Retention đã xóa segment base 0
          </label>
          <div className="log-segments">
            {seek.segments.map((s) => (
              <section key={s.base}>
                <h4>Segment base {s.base}</h4>
                <div className="log-records">
                  {s.rows.map((r) => (
                    <article key={r.offset} data-found={seek.found?.offset === r.offset}>
                      <strong>
                        #{r.offset} · {r.key}
                      </strong>
                      <span>
                        byte {r.position} · {r.bytes} B
                      </span>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Seek status</dt>
              <dd>{seek.status}</dd>
            </div>
            <div>
              <dt>Log start offset</dt>
              <dd>{seek.start}</dd>
            </div>
            <div>
              <dt>Selected segment base</dt>
              <dd>{seek.segment ?? '—'}</dd>
            </div>
            <div>
              <dt>Index anchor offset / byte</dt>
              <dd>{seek.anchor ? `${seek.anchor.offset} / ${seek.anchor.position}` : '—'}</dd>
            </div>
            <div>
              <dt>Scanned offsets</dt>
              <dd>{seek.scanned.map((r) => r.offset).join(' → ') || '—'}</dd>
            </div>
            <div>
              <dt>First retained record at or after request</dt>
              <dd>{seek.found?.offset ?? '—'}</dd>
            </div>
          </dl>
          <p>
            Chọn offset 5 rồi bật compaction: record đầu trả về là 6, byte 0 của segment base 4.
            Offset 5 bị compact không phải một missing delivery cần retry mãi. Chọn offset 2 sau
            retention: trả OFFSET_OUT_OF_RANGE; client cần reset policy hoặc snapshot, không được âm
            thầm tuyên bố đã replay đủ.
          </p>
        </>
      )}
      {kind === 'log-replicas' && (
        <>
          <h3 id={id}>ACK, committed prefix và khả năng phục hồi là ba câu hỏi</h3>
          <p>
            ISR-only fixture bắt đầu với offsets 0–3 đã commit trên A/B/C, HW boundary 4. C rời ISR
            trước append offset 4; A vẫn là leader, B là follower trong ISR. C không nhận record
            mới. Không mô phỏng ELR, fsync, timing hay mọi election rule của Kafka. Min ISR chặn admission ở all ACK; leader ACK vẫn có thể nhận write dưới threshold. Fixture chọn strict HW: chỉ tiến visibility khi đủ Min ISR và mọi current ISR đã copy, nên ACK leader không chứng minh readable commit.
          </p>
          <div className="worksheet-inputs">
            <label>
              Bước replication<output>{stage} / 5</output>
              <input
                type="range"
                min="0"
                max="5"
                value={stage}
                onChange={(e) => setStage(+e.target.value)}
              />
            </label>
            <label>
              Min ISR<output>{min}</output>
              <input
                type="range"
                min="1"
                max="3"
                value={min}
                onChange={(e) => setMin(+e.target.value)}
              />
            </label>
          </div>
          <div className="log-actions">
            {(['leader', 'all'] as const).map((a) => (
              <button
                type="button"
                key={a}
                data-ack={a}
                aria-pressed={ack === a}
                onClick={() => setAck(a)}
              >
                {a === 'leader' ? 'ACK ngay ở leader' : 'ACK sau mọi ISR replica'}
              </button>
            ))}
          </div>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={lost} onChange={(e) => setLost(e.target.checked)} />
            Producer không nhận được ACK đã gửi
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={unclean}
              onChange={(e) => setUnclean(e.target.checked)}
            />
            Cho C stale làm unclean leader khi A và B mất
          </label>
          <ol className="log-timeline">
            {[
              'Baseline: A/B/C có committed prefix 0–3',
              'C rời ISR; membership được ghi bền',
              'Append offset 4 trên A; all ACK kiểm Min ISR',
              'B copy record; HW chỉ tiến nếu đủ Min ISR',
              'A mất; promote B theo clean ISR election',
              'B cũng mất; chỉ còn stale C',
            ].map((s, i) => (
              <li key={s} aria-current={i === stage ? 'step' : undefined}>
                <strong>#{i}</strong> {s}
              </li>
            ))}
          </ol>
          <div className="log-replicas">
            {Object.entries(rep.ends).map(([name, end]) => (
              <section key={name}>
                <h4>Replica {name}</h4>
                <div className="log-records">
                  {Array.from({ length: end }, (_, n) => (
                    <span key={n}>#{n}</span>
                  ))}
                </div>
                <p>LEO boundary: {end}</p>
              </section>
            ))}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Producer knowledge</dt>
              <dd>{rep.sender}</dd>
            </div>
            <div>
              <dt>HW before unsafe election</dt>
              <dd>{rep.hw}</dd>
            </div>
            <div>
              <dt>ACK sent</dt>
              <dd>{rep.ackSent ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Election result</dt>
              <dd>{rep.election}</dd>
            </div>
            <div>
              <dt>Recovered leader / LEO</dt>
              <dd>{rep.newLeader ? `${rep.newLeader} / ${rep.recoveredEnd}` : '—'}</dd>
            </div>
            <div>
              <dt>Committed record lost by unclean election</dt>
              <dd>{rep.currentCommittedLoss ? 'YES' : 'NO'}</dd>
            </div>
          </dl>
          <p>
            Ở bước 2, leader ACK có thể báo thành công khi B chưa có record: nếu A crash ngay tại
            đó, record này có thể mất. Với all ACK, bước 3 mới đủ bằng chứng trong fixture. Lost
            reply vẫn khiến producer UNKNOWN dù record đã commit. Đến bước 5, giữ clean policy làm
            partition unavailable; chọn stale C đổi availability lấy mất committed record. HW hiển
            thị là boundary trước unsafe election, không hứa record đã mất còn readable.
          </p>
        </>
      )}
      {kind === 'log-visibility' && (
        <>
          <h3 id={id}>Replicated không đồng nghĩa transaction đã được phép đọc</h3>
          <p>
            Fixture chọn các histories thay thế: N0, TX-A tại offsets 1 và 3, N2 chen giữa, control
            record tại 4 và N5. Ở history open, offset 4 là unrelated control record; ở
            commit/abort, đó là TX-A end marker. Đây không phải sửa một existing log tại chỗ. HW/LSO
            là next-offset boundaries; selected decision chỉ resolve khi marker nằm dưới HW. Open TX
            giữ cả normal N2 sau LSO.
          </p>
          <div className="worksheet-inputs">
            <label>
              HW boundary<output>{hw}</output>
              <input
                type="range"
                min="0"
                max="6"
                value={hw}
                onChange={(e) => setHw(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={committed}
              onChange={(e) => setCommitted(e.target.checked)}
            />
            Đọc theo read_committed
          </label>
          <div className="log-actions">
            {(['open', 'committed', 'aborted'] as const).map((s) => (
              <button
                type="button"
                key={s}
                data-tx={s}
                aria-pressed={tx === s}
                onClick={() => setTx(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <figure className="handbook-table">
            <div tabIndex={0} role="region" aria-label="Transaction visibility fixture">
              <table>
                <thead>
                  <tr>
                    {['Offset', 'Record', 'Visibility reason', 'Returned'].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vis.rows.map((r) => (
                    <tr key={r.offset}>
                      <td>{r.offset}</td>
                      <td>{r.value}</td>
                      <td>{r.reason}</td>
                      <td>{r.visible ? 'YES' : 'NO'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>HW / LSO boundaries</dt>
              <dd>
                {hw} / {vis.lso}
              </dd>
            </div>
            <div>
              <dt>Transaction marker resolved</dt>
              <dd>{vis.resolved ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Returned values</dt>
              <dd>{vis.visible.join(', ') || '—'}</dd>
            </div>
          </dl>
          <p>
            HW 6 và open: read_committed chỉ trả N0. Commit trả N0/T1/N2/T3/N5; abort trả N0/N2/N5.
            Marker luôn là control record, không trả thành business payload. Read_uncommitted có thể
            thấy transactional data trước quyết định, nhưng vẫn không đọc vượt HW trong fixture.
            Transaction ở đây không bao gồm arbitrary HTTP calls hoặc database ngoài log.
          </p>
        </>
      )}
    </section>
  );
}
