import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  scheduledLease,
  schedulerCatchup,
  schedulerDst,
  type ScheduleSinkMode,
  type MissedPolicy,
  type DstGap,
  type DstFold,
} from '../lib/scheduler-models';
export default function SchedulerPlayground({
  kind,
}: {
  kind: 'sched-fencing' | 'sched-catchup' | 'sched-dst';
}) {
  const id = 'sched-' + useId().replace(/:/g, ''),
    ref = useIslandReady(),
    [stage, setStage] = useState(4),
    [mode, setMode] = useState<ScheduleSinkMode>('fence-only'),
    [newFirst, setNewFirst] = useState(false),
    [now, setNow] = useState(45),
    [deadline, setDeadline] = useState(20),
    [policy, setPolicy] = useState<MissedPolicy>('all'),
    [cap, setCap] = useState(1),
    [gap, setGap] = useState<DstGap>('skip'),
    [fold, setFold] = useState<DstFold>('first');
  const lease = scheduledLease(stage, mode, newFirst),
    catchup = schedulerCatchup(now, deadline, policy, cap),
    dst = schedulerDst(gap, fold);
  return (
    <section className="handbook-experiment scheduler-playground" ref={ref} aria-labelledby={id}>
      <span className="eyebrow">SCHEDULER / OCCURRENCES, OWNERSHIP AND EFFECTS</span>
      {kind === 'sched-fencing' && (
        <>
          <h3 id={id}>Sink chưa thấy token mới thì highest-seen chưa đủ</h3>
          <p>
            A giữ attempt token 7 rồi pause; lease hết, B claim token 8. Cả hai gọi cùng business
            effect run-9:charge-40. Highest-seen sink chỉ từ chối token thấp hơn token nó đã thấy;
            chưa thấy 8 thì có thể nhận 7. Idempotent mode dùng cùng run/step identity, không dùng
            attempt token làm key. Authority mode giả định sink atomically kiểm current token cùng
            mutation; không phải precheck rồi HTTP call.
          </p>
          <div className="worksheet-inputs">
            <label>
              Bước lease timeline<output>{stage} / 5</output>
              <input
                type="range"
                min="0"
                max="5"
                value={stage}
                onChange={(e) => setStage(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={newFirst}
              onChange={(e) => setNewFirst(e.target.checked)}
            />
            B tới sink trước A
          </label>
          <div className="scheduler-actions">
            {(['none', 'fence-only', 'idempotent', 'authority-and-idempotent'] as const).map(
              (m, i) => (
                <button
                  type="button"
                  key={m}
                  data-sink={m}
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                >
                  {
                    [
                      'No sink guard',
                      'Highest-seen token',
                      'Run/step idempotency',
                      'Current authority + idempotency',
                    ][i]
                  }
                </button>
              ),
            )}
          </div>
          <ol className="scheduler-timeline">
            {[
              'A claim token 7',
              'A pause trước effect',
              'Lease hết; B claim token 8',
              'First sink request',
              'Second sink request',
              'A báo complete bằng stale attempt',
            ].map((s, i) => (
              <li key={s} aria-current={stage === i ? 'step' : undefined}>
                <strong>#{i}</strong> {s}
              </li>
            ))}
          </ol>
          <div className="scheduler-attempts">
            {lease.attempts.map((a, i) => (
              <section key={i}>
                <h4>
                  {a.worker} · token {a.token}
                </h4>
                <strong>{a.result}</strong>
              </section>
            ))}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Scheduler owner / token</dt>
              <dd>
                {lease.schedulerOwner} / {lease.activeToken}
              </dd>
            </div>
            <div>
              <dt>Sink highest observed token</dt>
              <dd>{lease.highest}</dd>
            </div>
            <div>
              <dt>Applied effects / charged units</dt>
              <dd>
                {lease.effects.length} / {lease.charged}
              </dd>
            </div>
            <div>
              <dt>Old completion result</dt>
              <dd>{lease.oldCompletion}</dd>
            </div>
          </dl>
          <p>
            Default A-first và highest-seen tạo hai effects dù A complete sau đó bị scheduler
            reject. Chọn B-first thì fence-only chặn A, nhưng đó là timing assumption. Run/step
            idempotency giữ một supported effect bất kể arrival order; nó không ngăn worker thực thi
            code. Current authority cần sink cooperation thực và result/fingerprint retention. Không
            có calls hoặc charges thật trong lab.
          </p>
        </>
      )}
      {kind === 'sched-catchup' && (
        <>
          <h3 id={id}>Đừng chỉ đọc bucket hiện tại sau outage</h3>
          <p>
            Fixture có occurrence mỗi 10 phút, durable cursor sau phút 0. Recovery xem mọi
            occurrence tới now, kiểm start deadline rồi áp policy. All chọn eligible occurrences;
            latest coalesce thành một occurrence; skip ghi nhận bỏ qua. Dispatch cap giới hạn một
            page, phần deferred phải được giữ để xử lý sau. Đây là policy worksheet, không phải cron
            engine hoặc durable cursor implementation.
          </p>
          <div className="worksheet-inputs">
            <label>
              Recovery minute<output>{now}</output>
              <input
                type="range"
                min="30"
                max="90"
                value={now}
                onChange={(e) => setNow(+e.target.value)}
              />
            </label>
            <label>
              Starting deadline, minutes<output>{deadline}</output>
              <input
                type="range"
                min="0"
                max="90"
                value={deadline}
                onChange={(e) => setDeadline(+e.target.value)}
              />
            </label>
            <label>
              Dispatch page cap<output>{cap}</output>
              <input
                type="range"
                min="1"
                max="10"
                value={cap}
                onChange={(e) => setCap(+e.target.value)}
              />
            </label>
          </div>
          <div className="scheduler-actions">
            {(['all', 'latest', 'skip'] as const).map((p) => (
              <button
                type="button"
                key={p}
                data-policy={p}
                aria-pressed={policy === p}
                onClick={() => setPolicy(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <figure className="handbook-table">
            <div tabIndex={0} role="region" aria-label="Missed occurrence recovery">
              <table>
                <thead>
                  <tr>
                    {['Due minute', 'Age', 'Occurrence ID', 'Decision'].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catchup.rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.minute}</td>
                      <td>{r.age}</td>
                      <td>{r.id}</td>
                      <td>{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Admitted due minutes</dt>
              <dd>{catchup.admitted.map((r) => r.minute).join(', ') || '—'}</dd>
            </div>
            <div>
              <dt>Deferred due minutes</dt>
              <dd>{catchup.deferred.map((r) => r.minute).join(', ') || '—'}</dd>
            </div>
            <div>
              <dt>Safe accounted-through minute</dt>
              <dd>{catchup.safeCursor}</dd>
            </div>
          </dl>
          <p>
            Now45/deadline20/cap1: phút10/20 expired, phút30 admitted, phút40 deferred; cursor an
            toàn dừng30. Không advance tới40 rồi quên deferred. Re-reading page cần stable
            occurrence ID và unique materialization; worksheet không tự persist những lần bạn bấm.
            Deadline equality được cho phép trong fixture.
          </p>
        </>
      )}
      {kind === 'sched-dst' && (
        <>
          <h3 id={id}>Một local time có thể không tồn tại hoặc có hai UTC instants</h3>
          <p>
            Fixture cố định America/New_York năm 2026: ngày 08/03 nhảy từ 01:59 sang 03:00 nên 02:30
            không tồn tại; ngày 01/11 có hai lần 01:30 với offsets khác nhau. Gap policy next-valid
            chọn 03:00, không phải shift-duration thành 03:30. Đây là các policies của worksheet,
            không khẳng định mọi cron library dùng cùng semantics.
          </p>
          <div className="scheduler-actions" role="group" aria-label="DST gap policy">
            {(['skip', 'next-valid'] as const).map((g) => (
              <button
                type="button"
                key={g}
                data-gap={g}
                aria-pressed={gap === g}
                onClick={() => setGap(g)}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="scheduler-actions" role="group" aria-label="DST fold policy">
            {(['first', 'both'] as const).map((f) => (
              <button
                type="button"
                key={f}
                data-fold={f}
                aria-pressed={fold === f}
                onClick={() => setFold(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="scheduler-dst">
            {[
              ['Spring gap', dst.spring],
              ['Fall fold', dst.fall],
            ].map(([name, items]) => (
              <section key={name as string}>
                <h4>{name as string}</h4>
                {(items as typeof dst.spring).length ? (
                  (items as typeof dst.spring).map((item) => (
                    <article key={item.id}>
                      <strong>{item.local}</strong>
                      <code>{item.utc}</code>
                      <small>{item.id}</small>
                    </article>
                  ))
                ) : (
                  <p>SKIPPED_BY_POLICY</p>
                )}
              </section>
            ))}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Spring occurrences</dt>
              <dd>{dst.spring.length}</dd>
            </div>
            <div>
              <dt>Fall occurrences</dt>
              <dd>{dst.fall.length}</dd>
            </div>
            <div>
              <dt>Total occurrences</dt>
              <dd>{dst.total}</dd>
            </div>
          </dl>
          <p>
            Lưu intended local schedule, IANA zone, policy và planner generation; materialize
            resolved UTC instant với stable identity. Trong fold-both, hai instants phải có IDs khác
            nhau. Replan sau tzdata update cần policy cho pending occurrences, không silently tạo
            lại cùng lần chạy với identity khác.
          </p>
        </>
      )}
    </section>
  );
}
