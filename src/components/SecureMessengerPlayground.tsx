import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { messengerFanout, deviceDelivery, groupKeyBoundary } from '../lib/secure-messenger-models';
export default function SecureMessengerPlayground({
  kind,
}: {
  kind: 'secure-fanout' | 'secure-delivery' | 'secure-membership';
}) {
  const ref = useIslandReady(),
    id = 'secure-' + useId().replace(/:/g, '');
  const [members, setMembers] = useState(100),
    [devices, setDevices] = useState(2),
    [active, setActive] = useState(5),
    [messages, setMessages] = useState(20),
    [leaves, setLeaves] = useState(0);
  const [deliveryStep, setDeliveryStep] = useState(5),
    [persist, setPersist] = useState(true),
    [perDevice, setPerDevice] = useState(true),
    [dedup, setDedup] = useState(true);
  const [groupStep, setGroupStep] = useState(4),
    [rotate, setRotate] = useState(true),
    [deliveredKey, setDeliveredKey] = useState(true),
    [epochGuard, setEpochGuard] = useState(true);
  const cost = messengerFanout(members, devices, active, messages, leaves),
    delivery = deviceDelivery(deliveryStep, persist, perDevice, dedup),
    group = groupKeyBoundary(groupStep, rotate, deliveredKey, epochGuard),
    fmt = (n: number) => n.toLocaleString('en-US');
  const sliders: [number, (v: number) => void, string, number, number, number][] = [
    [members, setMembers, 'Group members', 10, 500, 10],
    [devices, setDevices, 'Devices / member', 1, 5, 1],
    [active, setActive, 'Surviving active senders', 1, 8, 1],
    [messages, setMessages, 'Messages / active sender / epoch', 1, 40, 1],
    [leaves, setLeaves, 'Non-sender leaves', 0, 5, 1],
  ];
  return (
    <section ref={ref} className="handbook-experiment secure-playground" aria-labelledby={id}>
      <span className="eyebrow">PRIVATE MESSENGER / RECEIPTS AND KEY BOUNDARIES</span>
      {kind === 'secure-fanout' && (
        <>
          <h3 id={id}>Một ciphertext vẫn cần nhiều deliveries</h3>
          <p>
            Mỗi membership epoch có cùng nhóm active senders còn ở lại; mỗi người gửi M messages từ
            một device. Pairwise sessions đã thiết lập ở cả hai phương án. Sender Keys phân phối lại
            sender key của active sender ở lần gửi đầu mỗi epoch; inactive senders chưa phân phối
            trong fixture. Leaves bị cap để không loại active senders.
          </p>
          <div className="worksheet-inputs">
            {sliders.map(([v, set, label, min, max, step]) => (
              <label key={label}>
                {label}
                <output>{v}</output>
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
          <div className="secure-upload-bars">
            {[
              ['PAIRWISE DATA', cost.pairwiseDataEnvelopes],
              ['SENDER KEY + DATA', cost.senderKeyUploads],
            ].map(([label, value]) => (
              <section key={label}>
                <strong>{label}</strong>
                <span>{fmt(Number(value))}</span>
                <div>
                  <i
                    style={{
                      width:
                        (Number(value) /
                          Math.max(cost.pairwiseDataEnvelopes, cost.senderKeyUploads)) *
                          100 +
                        '%',
                    }}
                  />
                </div>
              </section>
            ))}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Effective membership changes</dt>
              <dd>{cost.leaves}</dd>
            </div>
            <div>
              <dt>Active senders counted</dt>
              <dd>{cost.active}</dd>
            </div>
            <div>
              <dt>Pairwise key envelopes</dt>
              <dd>{fmt(cost.keyEnvelopes)}</dd>
            </div>
            <div>
              <dt>Shared payload encryptions</dt>
              <dd>{fmt(cost.payloadEncryptions)}</dd>
            </div>
            <div>
              <dt>Data deliveries, either scheme</dt>
              <dd>{fmt(cost.dataDeliveries)}</dd>
            </div>
            <div>
              <dt>Sender-key total deliveries</dt>
              <dd>{fmt(cost.senderKeyDeliveries)}</dd>
            </div>
          </dl>
          <figure className="handbook-table">
            <div role="region" tabIndex={0} aria-label="Group epoch fan-out arithmetic">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Epoch / members</th>
                    <th scope="col">Devices / sender</th>
                    <th scope="col">Key envelopes</th>
                    <th scope="col">Data deliveries</th>
                  </tr>
                </thead>
                <tbody>
                  {cost.epochs.map((e) => (
                    <tr key={e.epoch}>
                      <th scope="row">
                        {e.epoch} / {e.members}
                      </th>
                      <td>{e.recipientDevices}</td>
                      <td>{fmt(e.keyEnvelopes)}</td>
                      <td>{fmt(e.dataDeliveries)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
          <p className="muted">
            Đếm logical envelopes, không physical packets, bytes, CPU benchmark hay mọi crypto
            operation. Payload encryption và pairwise key distribution không có cùng cost. Recipient
            fan-out/egress vẫn tồn tại. Sender giữ private signing key; recipients nhận chain state
            và public verification key qua approved pairwise sessions, không private signing key.
          </p>
        </>
      )}
      {kind === 'secure-delivery' && (
        <>
          <h3 id={id}>ACK một device không hoàn tất device còn offline</h3>
          <p>
            Server đã nhận một message m1 cho devices D1/D2. D1 nhận rồi ACK; sau đó crash. D2 nhận
            sau, persist nhưng ACK bị mất; server gửi lại cùng identity. Lab kiểm durable local
            persistence trước ACK, per-device queue obligations và recipient dedup. Không mô phỏng
            encryption hay disk durability thật.
          </p>
          <div className="worksheet-inputs">
            <label>
              Receipt history step<output>{deliveryStep} / 5</output>
              <input
                type="range"
                min="0"
                max="5"
                value={deliveryStep}
                onChange={(e) => setDeliveryStep(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={persist}
              onChange={(e) => setPersist(e.target.checked)}
            />
            D1 persist local message trước khi ACK server
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={perDevice}
              onChange={(e) => setPerDevice(e.target.checked)}
            />
            ACK chỉ hoàn tất obligation của đúng device
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={dedup} onChange={(e) => setDedup(e.target.checked)} />
            D2 dedup cùng message identity khi redelivery
          </label>
          <ol className="platform-history">
            {[
              '0 / Server accepted D1 + D2',
              '1 / D1 receives',
              '2 / D1 ACK and server GC',
              '3 / D1 crashes',
              '4 / D2 persists; ACK lost',
              '5 / D2 replay and confirmed ACK',
            ].map((s, i) => (
              <li key={s} data-active={i === deliveryStep} data-past={i < deliveryStep}>
                {s}
              </li>
            ))}
          </ol>
          <div className="secure-device-cards">
            <article>
              <strong>D1</strong>
              <p>{delivery.d1} DURABLE</p>
              <span>{delivery.volatileD1} VOLATILE</span>
            </article>
            <article>
              <strong>D2</strong>
              <p>{delivery.d2} DURABLE</p>
              <span>{delivery.duplicates} DUPLICATES</span>
            </article>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Pending device queues</dt>
              <dd>{delivery.queued.join(', ') || '—'}</dd>
            </div>
            <div>
              <dt>D1 lost without queue recovery?</dt>
              <dd>{delivery.d1Lost ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>D2 obligation lost?</dt>
              <dd>{delivery.d2Lost ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Duplicate local messages</dt>
              <dd>{delivery.duplicates}</dd>
            </div>
          </dl>
          <p className="muted">
            Server accepted, device persisted và user read là receipts khác nhau. ACK phải
            authenticated/bound device+message; local dedup/state/receipt cần coherent recovery.
            Retention expiry, lost storage và missing keys cần explicit failure UX. Queue GC không
            chứng minh secure erasure backups, local history hoặc screenshot của recipient.
          </p>
        </>
      )}
      {kind === 'secure-membership' && (
        <>
          <h3 id={id}>Rekey bảo vệ future, không thu hồi history đã đọc</h3>
          <p>
            Ban đầu A/B/C đã đọc và lưu m0. Sau đó B rời group, D vào; membership epoch thành 2.
            Sender A cần fresh sender key và phân phối cho A/C/D trước khi họ giải được new message.
            Lab chỉ giữ tập key holders, không có keys/ciphertext thật, không triển khai Signal hay
            chứng minh cryptographic security.
          </p>
          <div className="worksheet-inputs">
            <label>
              Membership step<output>{groupStep} / 4</output>
              <input
                type="range"
                min="0"
                max="4"
                value={groupStep}
                onChange={(e) => setGroupStep(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={rotate} onChange={(e) => setRotate(e.target.checked)} />
            Clear old sender state và tạo fresh sender key
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={deliveredKey}
              onChange={(e) => setDeliveredKey(e.target.checked)}
            />
            New device D nhận được key distribution
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={epochGuard}
              onChange={(e) => setEpochGuard(e.target.checked)}
            />
            Reject honest stale-epoch send trước relay
          </label>
          <ol className="platform-history">
            {[
              '0 / A B C have observed m0',
              '1 / Remove B, add D; epoch 2',
              '2 / Fresh key distribution',
              '3 / Attempt new message',
              '4 / Old m0 copy still exists at B',
            ].map((s, i) => (
              <li key={s} data-active={i === groupStep} data-past={i < groupStep}>
                {s}
              </li>
            ))}
          </ol>
          <figure className="handbook-table">
            <div role="region" tabIndex={0} aria-label="Membership versus key possession">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Device</th>
                    <th scope="col">Current member</th>
                    <th scope="col">Selected sender key</th>
                    <th scope="col">Observed m0 history</th>
                  </tr>
                </thead>
                <tbody>
                  {['A', 'B', 'C', 'D'].map((d) => (
                    <tr key={d}>
                      <th scope="row">{d}</th>
                      <td>{group.membership.includes(d) ? 'YES' : 'NO'}</td>
                      <td>{group.holders.includes(d) ? 'YES' : 'NO'}</td>
                      <td>{d === 'D' ? 'NO' : 'YES'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Membership / key epoch</dt>
              <dd>
                {group.membershipEpoch} / {group.keyEpoch}
              </dd>
            </div>
            <div>
              <dt>Send decision</dt>
              <dd>
                {group.status === 'WAIT_FOR_SEND'
                  ? 'WAIT'
                  : group.status === 'SENT'
                    ? 'SENT'
                    : 'STALE EPOCH'}
              </dd>
            </div>
            <div>
              <dt>B has key for new ciphertext?</dt>
              <dd>{group.accepted ? (group.formerMemberHasFutureKey ? 'YES' : 'NO') : '—'}</dd>
            </div>
            <div>
              <dt>D has key for new ciphertext?</dt>
              <dd>{group.accepted ? (group.newMemberHasFutureKey ? 'YES' : 'NO') : '—'}</dd>
            </div>
            <div>
              <dt>B retains observed m0?</dt>
              <dd>{group.formerMemberRetainsPastHistory ? 'YES' : 'NO'}</dd>
            </div>
          </dl>
          <p className="muted">
            Fixture giả định authenticated membership, honest epoch binding và uncompromised current
            endpoints; metadata epoch tự nó không chứng minh cipher dùng đúng key. Rotation không
            chữa compromised member vẫn đang được cấp key. D chưa được share history trong policy
            này; history sync có thể là authorized operation riêng. Forward secrecy bảo vệ old
            ciphertext khi keys đã erase, không ép recipient quên plaintext đã lưu.
          </p>
        </>
      )}
    </section>
  );
}
