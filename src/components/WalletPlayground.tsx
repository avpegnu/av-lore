import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  walletSnapshotScenario,
  initialWalletTransfer,
  walletTransferAction,
  walletHolds,
  type TransferAction,
} from '../lib/wallet-models';
export default function WalletPlayground({
  kind,
}: {
  kind: 'wallet-recovery' | 'wallet-transfer' | 'wallet-holds';
}) {
  const ref = useIslandReady(),
    id = 'wallet-' + useId().replace(/:/g, ''),
    [cut, setCut] = useState(2),
    [drop, setDrop] = useState(false),
    [changed, setChanged] = useState(false),
    [transfer, setTransfer] = useState(initialWalletTransfer),
    [available, setAvailable] = useState(true),
    [old, setOld] = useState(false),
    [stale, setStale] = useState(false),
    [resolution, setResolution] = useState<'pending' | 'post40' | 'void'>('pending');
  const recovery = walletSnapshotScenario(cut, drop, changed),
    holds = walletHolds(stale, resolution);
  return (
    <section className="handbook-experiment wallet-playground" ref={ref} aria-labelledby={id}>
      <span className="eyebrow">WALLET / MONEY, IDENTITY AND RECOVERY</span>
      {kind === 'wallet-recovery' && (
        <>
          <h3 id={id}>Snapshot đúng balances vẫn có thể sai retry history</h3>
          <p>
            Fixture có 100 minor units ở A, B/C bắt đầu 0. c1 chuyển 30 tới B; c2 chuyển 20 tới C;
            c3 chuyển 80 tới B bị từ chối. Mỗi accepted result có event sequence, kể cả business
            rejection. Snapshot giữ state tại cut rồi replay tail; bảng event ở đây phục vụ quan
            sát, production snapshot không cần copy toàn bộ event log. Lab không thực hiện thanh
            toán thật.
          </p>
          <div className="worksheet-inputs">
            <label>
              Snapshot cut sequence<output>{cut}</output>
              <input
                type="range"
                min="0"
                max="3"
                value={cut}
                onChange={(e) => setCut(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={drop} onChange={(e) => setDrop(e.target.checked)} />
            Thử bug: bỏ receipts/results khỏi snapshot
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={changed}
              onChange={(e) => setChanged(e.target.checked)}
            />
            Retry c1 với amount đổi từ 30 thành 35
          </label>
          <div className="wallet-states">
            {[
              ['Committed', recovery.original],
              ['Recovered', recovery.before],
              ['After retry', recovery.after],
            ].map(([name, state]) => {
              const s = state as typeof recovery.original;
              return (
                <section key={name as string}>
                  <h4>{name as string}</h4>
                  <dl>
                    {Object.entries(s.balances).map(([a, n]) => (
                      <div key={a}>
                        <dt>{a}</dt>
                        <dd>{n}</dd>
                      </div>
                    ))}
                  </dl>
                  <p>Sequence: {s.seq}</p>
                </section>
              );
            })}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Retry result</dt>
              <dd>{recovery.result}</dd>
            </div>
            <div>
              <dt>Additional payment effects</dt>
              <dd>{recovery.additionalEffects}</dd>
            </div>
            <div>
              <dt>Total remains 100</dt>
              <dd>{recovery.conserved ? 'YES' : 'NO'}</dd>
            </div>
          </dl>
          <figure className="handbook-table">
            <div tabIndex={0} role="region" aria-label="Wallet accepted event history">
              <table>
                <thead>
                  <tr>
                    {['Seq', 'Command', 'Destination', 'Amount', 'Result'].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recovery.after.events.map((e) => (
                    <tr key={e.seq}>
                      <td>{e.seq}</td>
                      <td>{e.command.id}</td>
                      <td>{e.command.to}</td>
                      <td>{e.command.amount}</td>
                      <td>{e.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
          <p>
            Với cut 2 và bug bật, recovered balances ban đầu vẫn đúng nhưng receipt c1 đã mất; retry
            chuyển thêm tiền mà total vẫn 100. Cut 0 replay toàn bộ history nên tái tạo receipts,
            tránh bug này. Khi giữ receipts, amount khác cùng key bị IDEMPOTENCY_CONFLICT; business
            rejection c3 cũng giữ result ổn định. Tổng tiền đúng chưa chứng minh đúng người, đúng số
            lần hoặc không overspend.
          </p>
        </>
      )}
      {kind === 'wallet-transfer' && (
        <>
          <h3 id={id}>Timeout không phải quyết định hoàn tiền</h3>
          <p>
            T1 chuyển 60 minor units từ A tới B. Reserve chỉ giảm available; depart chuyển posted
            value từ A sang transit account. Durable decision COMMIT hoặc CANCEL được giả định
            mutually exclusive. Credit/refund có stable step identities; epoch hiện hành là 5. Đây
            là state-machine fixture tại một điểm quan sát, không phải implementation distributed
            consensus/TCC đầy đủ.
          </p>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
            />
            Recipient hiện có thể xử lý credit
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={old} onChange={(e) => setOld(e.target.checked)} />
            Gửi action từ old coordinator epoch 4
          </label>
          <p>
            Recipient simulation: {available ? 'AVAILABLE' : 'UNAVAILABLE'} · Coordinator epoch:{' '}
            {old ? 4 : 5}
          </p>
          <div className="wallet-actions">
            {(
              [
                'reserve',
                'depart',
                'commit',
                'cancel',
                'credit',
                'refund',
                'timeout',
              ] as TransferAction[]
            ).map((a, i) => (
              <button
                type="button"
                key={a}
                data-action={a}
                onClick={() =>
                  setTransfer((s) => walletTransferAction(s, a, available, old ? 4 : 5))
                }
              >
                {
                  [
                    'Reserve 60',
                    'Depart → transit',
                    'Decide COMMIT',
                    'Decide CANCEL',
                    'Deliver credit',
                    'Deliver refund',
                    'Observe timeout',
                  ][i]
                }
              </button>
            ))}
            <button
              type="button"
              data-action="reset"
              onClick={() => setTransfer(initialWalletTransfer())}
            >
              Reset transfer
            </button>
          </div>
          <div className="wallet-funds">
            {[
              ['A posted', transfer.a],
              ['A held', transfer.held],
              ['A available', transfer.a - transfer.held],
              ['Transit', transfer.transit],
              ['B posted', transfer.b],
            ].map(([name, n]) => (
              <section key={name}>
                <h4>{name}</h4>
                <strong>{n}</strong>
              </section>
            ))}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Transfer phase</dt>
              <dd>{transfer.phase}</dd>
            </div>
            <div>
              <dt>Durable decision</dt>
              <dd>{transfer.decision || '—'}</dd>
            </div>
            <div>
              <dt>Last action result</dt>
              <dd>{transfer.status}</dd>
            </div>
            <div>
              <dt>Posted A + B + transit</dt>
              <dd>{transfer.a + transfer.b + transfer.transit}</dd>
            </div>
          </dl>
          <p>Applied step IDs: {transfer.effects.join(' → ') || '—'}</p>
          <p>
            Thử reserve → depart → timeout: 60 vẫn ở transit. Decide COMMIT rồi tắt recipient:
            credit chờ, không được refund bằng CANCEL đối nghịch. Khi recipient hoạt động lại,
            credit một lần; retry không thêm effect. Reset rồi chọn CANCEL và refund cho nhánh còn
            lại. Old epoch bị fence trước mutation. Trong production mỗi participant phải
            persist/check step identity và recovery authority thực.
          </p>
        </>
      )}
      {kind === 'wallet-holds' && (
        <>
          <h3 id={id}>Không âm posted balance vẫn chưa đủ</h3>
          <p>
            Hai requests đồng thời mỗi request muốn hold 60 từ posted 100. Safe admission serialize
            check-and-reserve: request thứ hai thấy available 40 và bị từ chối. Bug dùng cùng stale
            read 100 cho cả hai; held thành 120 dù posted vẫn 100. Các lựa chọn resolution là
            histories thay thế cho đúng một hold H1, không phải nút repeatedly charge.
          </p>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={stale} onChange={(e) => setStale(e.target.checked)} />
            Thử bug: cả hai requests dùng stale balance 100
          </label>
          <div className="wallet-actions" role="group" aria-label="Reservation resolution">
            {(['pending', 'post40', 'void'] as const).map((s, i) => (
              <button
                type="button"
                key={s}
                data-resolution={s}
                aria-pressed={resolution === s}
                onClick={() => setResolution(s)}
              >
                {['Keep pending', 'Post 40 of reserved 60', 'Void H1'][i]}
              </button>
            ))}
          </div>
          <div className="wallet-requests">
            {holds.accepted.map((a, i) => (
              <section key={i}>
                <h4>Hold H{i + 1} · 60</h4>
                <strong>{a ? 'ACCEPTED' : 'REJECTED'}</strong>
              </section>
            ))}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>A posted</dt>
              <dd>{holds.posted}</dd>
            </div>
            <div>
              <dt>A held</dt>
              <dd>{holds.held}</dd>
            </div>
            <div>
              <dt>A available</dt>
              <dd>{holds.available}</dd>
            </div>
            <div>
              <dt>B posted</dt>
              <dd>{holds.recipient}</dd>
            </div>
            <div>
              <dt>Released from H1</dt>
              <dd>{holds.released}</dd>
            </div>
            <div>
              <dt>Posted total</dt>
              <dd>{holds.total}</dd>
            </div>
          </dl>
          <p>
            Safe partial post 40 giảm A posted còn 60, B posted tăng 40, release cả hold 60: 40 được
            chi và 20 reservation thừa được trả; A available là 60. Pending hold không cộng thêm vào
            posted total vì sẽ double count. Resolver thật phải bảo đảm post/void/expiry chỉ một
            winner bằng atomic state transition; fixture arithmetic không tự chứng minh concurrency
            protocol đó.
          </p>
        </>
      )}
    </section>
  );
}
