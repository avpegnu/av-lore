import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  createReplicaState,
  homeReplicas,
  replicaAction,
  type ReplicaAction,
} from '../lib/kv-replicas';
import '../styles/kv-replicas.css';
export default function KvReplicaPlayground() {
  const ref = useIslandReady(),
    id = 'kv-replicas-' + useId().replace(/:/g, ''),
    [state, setState] = useState(createReplicaState),
    [w, setW] = useState(2),
    [r, setR] = useState(2),
    [sloppy, setSloppy] = useState(false),
    [repair, setRepair] = useState(false),
    [readHomes, setReadHomes] = useState(['B', 'C']);
  const act = (action: ReplicaAction) => setState((s) => replicaAction(s, action)),
    last = state.writes.at(-1),
    waiting = last?.outcome === 'waiting',
    pending = state.messages.filter((m) => !m.delivered),
    hints = state.nodes.reduce((sum, n) => sum + n.hints.length, 0);
  return (
    <section className="handbook-experiment kv-replica-lab" ref={ref} aria-labelledby={id}>
      <span className="eyebrow">KEY–VALUE / VALUES, ACKS AND REPAIR</span>
      <h3 id={id}>Tự giao từng write để nhìn thấy state sau timeout</h3>
      <p>
        Một key k, homes A/B/C và fallback D/E/F, tối đa 12 mutation trước Reset. Mỗi lần giao
        message gộp durable store và replica ACK; bạn quyết định khi nào client nhận response.
        Revision do bộ điều khiển fixture cấp theo thứ tự, không phải clock/consensus thật; chưa mô
        phỏng concurrent writers, siblings, fsync, gossip, topology change hoặc latency.
      </p>
      <div className="kv-quorum-settings">
        <fieldset>
          <legend>Write acknowledgements W</legend>
          {[1, 2, 3].map((n) => (
            <button
              type="button"
              className="secondary"
              key={n}
              aria-pressed={w === n}
              disabled={waiting}
              onClick={() => setW(n)}
            >
              W={n}
            </button>
          ))}
        </fieldset>
        <fieldset>
          <legend>Read responses R</legend>
          {[1, 2, 3].map((n) => (
            <button
              type="button"
              className="secondary"
              key={n}
              aria-pressed={r === n}
              onClick={() => {
                setR(n);
                setReadHomes(homeReplicas.slice(3 - n));
              }}
            >
              R={n}
            </button>
          ))}
        </fieldset>
      </div>
      <label className="worksheet-toggle">
        <input
          type="checkbox"
          checked={sloppy}
          disabled={waiting}
          onChange={(e) => setSloppy(e.target.checked)}
        />
        Cho phép fallback giữ hint khi home offline lúc bắt đầu write
      </label>
      <label className="worksheet-toggle">
        <input type="checkbox" checked={repair} onChange={(e) => setRepair(e.target.checked)} />
        Read repair chỉ trên những home trả lời GET
      </label>
      <div className="worksheet-choices kv-write-actions">
        <button
          type="button"
          disabled={waiting || state.writes.length >= 12}
          onClick={() => act({ type: 'write', w, sloppy })}
        >
          Bắt đầu PUT
        </button>
        <button
          type="button"
          className="secondary"
          disabled={waiting || state.writes.length >= 12}
          onClick={() => act({ type: 'write', w, sloppy, deleted: true })}
        >
          Bắt đầu DELETE
        </button>
        <button
          type="button"
          className="secondary"
          disabled={!waiting || last.acknowledgements.length < last.w}
          onClick={() => act({ type: 'finish', lost: false })}
        >
          Trả success cho client
        </button>
        <button
          type="button"
          className="secondary"
          disabled={!waiting}
          onClick={() => act({ type: 'finish', lost: true })}
        >
          Timeout hoặc mất response
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setState(createReplicaState());
            setW(2);
            setR(2);
            setSloppy(false);
            setRepair(false);
            setReadHomes(['B', 'C']);
          }}
        >
          Reset replica fixture
        </button>
      </div>
      <dl className="worksheet-results" aria-live="polite">
        <div>
          <dt>Last write / client outcome</dt>
          <dd data-kv-outcome>{last?.outcome || '—'}</dd>
        </div>
        <div>
          <dt>Last write / durable ACKs</dt>
          <dd data-kv-acks>{last ? last.acknowledgements.length + ' / ' + last.w : '—'}</dd>
        </div>
        <div>
          <dt>Pending delivery messages</dt>
          <dd data-kv-pending>{pending.length}</dd>
        </div>
        <div>
          <dt>Stored hints / all holders</dt>
          <dd data-kv-hints>{hints}</dd>
        </div>
      </dl>
      <h4>Replica inventory</h4>
      <p>
        Inventory cho thấy cả node offline để quan sát fixture; GET và repair chỉ đọc các nguồn
        online theo policy. Chọn GET target ở home; nếu có hơn R target online thì dùng R target đầu
        theo thứ tự A/B/C. Đủ R là điều kiện của tập đã chọn, không phải kết luận về mọi route trong
        cluster.
      </p>
      <div className="kv-replica-grid">
        {state.nodes.map((n) => (
          <section key={n.id} data-kv-node={n.id}>
            <h5>
              {n.id} / {homeReplicas.includes(n.id) ? 'Home' : 'Fallback'}
            </h5>
            <label>
              <input
                type="checkbox"
                checked={n.online}
                onChange={() => act({ type: 'online', id: n.id })}
              />
              Online
            </label>
            {homeReplicas.includes(n.id) && (
              <label>
                <input
                  type="checkbox"
                  checked={readHomes.includes(n.id)}
                  onChange={() =>
                    setReadHomes((old) =>
                      homeReplicas.filter((h) => (h === n.id ? !old.includes(h) : old.includes(h))),
                    )
                  }
                />
                GET target
              </label>
            )}
            <p>
              <code data-kv-value>
                {n.record
                  ? 'v' +
                    n.record.revision +
                    ' / ' +
                    (n.record.deleted ? 'TOMBSTONE' : n.record.value)
                  : 'ABSENT'}
              </code>
            </p>
            <ul className="kv-node-hints" translate="no">
              {n.hints.map((h) => (
                <li key={h.home + ':' + h.record.revision}>
                  hint v{h.record.revision} → {h.home}
                  {h.record.deleted ? ' / TOMBSTONE' : ''}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <h4>Pending deliveries</h4>
      <p>
        Chỉ bấm giao message khi target online. Message chưa giao vẫn còn sau timeout/success; ACK
        đến muộn không đổi outcome unknown đã quan sát. Fallback lưu hint riêng, không giả là home
        đã có value.
      </p>
      <div className="kv-message-grid">
        {pending.map((m) => (
          <button
            type="button"
            className="secondary"
            data-kv-message={m.id}
            key={m.id}
            disabled={!state.nodes.find((n) => n.id === m.target)!.online}
            onClick={() => act({ type: 'deliver', id: m.id })}
          >
            <span translate="no">
              {m.operation} → {m.target}
              {m.hintFor ? ' / hint → ' + m.hintFor : ''}
            </span>
          </button>
        ))}
      </div>
      <div className="worksheet-choices kv-read-actions">
        <button type="button" onClick={() => act({ type: 'read', r, homes: readHomes, repair })}>
          GET từ homes đã chọn
        </button>
        <button type="button" className="secondary" onClick={() => act({ type: 'handoff' })}>
          Replay hints online
        </button>
        <button type="button" className="secondary" onClick={() => act({ type: 'expire-hints' })}>
          Mô phỏng hết hạn hoặc mất hints
        </button>
        <button type="button" className="secondary" onClick={() => act({ type: 'repair' })}>
          Repair giữa các home online
        </button>
      </div>
      <div className="kv-last-read" aria-live="polite">
        <h4>Last GET / snapshot</h4>
        <p data-kv-read translate="no">
          {state.read
            ? state.read.status === 'unavailable'
              ? 'UNAVAILABLE'
              : state.read.record
                ? 'v' +
                  state.read.record.revision +
                  ' / ' +
                  (state.read.record.deleted ? 'TOMBSTONE / NOT_FOUND' : state.read.record.value)
                : 'ABSENT / NOT_FOUND'
            : '—'}
        </p>
        <p translate="no">
          responders: {state.read?.responders.join(', ') || '—'} / repaired:{' '}
          {state.read?.repaired.join(', ') || '—'}
        </p>
      </div>
      <p>
        Last GET giữ kết quả của lần bấm gần nhất, không tự chạy lại khi node thay đổi. Online chỉ
        khôi phục reachability. Handoff cần cả holder lẫn home online; repair không biết value đã
        mất hết nguồn. Tombstone được giữ trong fixture; không mô phỏng GC, backup restore hoặc bảo
        đảm của engine cụ thể.
      </p>
      <details>
        <summary>Xem write outcomes và protocol trace</summary>
        <div
          className="kv-write-table"
          role="region"
          tabIndex={0}
          aria-label="Write outcomes và acknowledgements"
        >
          <table>
            <thead>
              <tr>
                {['Operation', 'Revision', 'W', 'Durable ACKs', 'Client outcome'].map((t) => (
                  <th scope="col" key={t}>
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.writes.map((write) => (
                <tr key={write.id}>
                  <th scope="row">{write.id}</th>
                  <td>{write.record.revision}</td>
                  <td>{write.w}</td>
                  <td>{write.acknowledgements.join(', ') || '—'}</td>
                  <td>{write.outcome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ol className="kv-protocol-trace" translate="no">
          {state.trace.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
      </details>
    </section>
  );
}
