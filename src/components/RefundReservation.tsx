import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { refundReservations, type RefundEvidence } from '../lib/refund-reservations';
import '../styles/payment-recovery.css';
export default function RefundReservation() {
  const ref = useIslandReady(),
    id = 'refund-reserve-' + useId().replace(/:/g, ''),
    [a, setA] = useState(7000),
    [b, setB] = useState(7000),
    [phase, setPhase] = useState(2),
    [atomic, setAtomic] = useState(true),
    [evidence, setEvidence] = useState<RefundEvidence>('unknown'),
    run = refundReservations(a, b, phase, atomic, evidence),
    maximum = Math.max(run.captured, run.confirmed + run.reservedA + run.reservedB);
  return (
    <section className="handbook-experiment refund-reservation" ref={ref} aria-labelledby={id}>
      <span className="eyebrow">PAYMENTS / CONCURRENT REFUND BUDGET</span>
      <h3 id={id}>Hai refund cùng đọc captured=10000 có được reserve cả hai?</h3>
      <p>
        Fixture độc lập với ledger: một capture USD 10000 minor units. A và B đều đọc
        available=10000 trước khi A reserve; controls replay từ đầu. Atomic mode kiểm live budget
        tại commit của từng reservation, còn unsafe mode dùng snapshot cũ. B dừng ở
        admission/pending, không mô phỏng PSP chấp nhận over-refund, payouts, fees hoặc gọi dịch vụ
        thật.
      </p>
      <div className="worksheet-inputs">
        {[
          {
            label: 'Refund A / minor units',
            value: a,
            min: 1000,
            max: 10000,
            step: 1000,
            set: setA,
          },
          {
            label: 'Refund B / minor units',
            value: b,
            min: 1000,
            max: 10000,
            step: 1000,
            set: setB,
          },
          { label: 'Replay phase', value: phase, min: 0, max: 3, step: 1, set: setPhase },
        ].map((c) => (
          <label key={c.label}>
            {c.label}
            <output>{c.value}</output>
            <input
              type="range"
              min={c.min}
              max={c.max}
              step={c.step}
              value={c.value}
              onChange={(e) => c.set(+e.target.value)}
            />
          </label>
        ))}
      </div>
      <label className="worksheet-toggle">
        <input type="checkbox" checked={atomic} onChange={(e) => setAtomic(e.target.checked)} />
        Reserve atomically với confirmed và active reservations
      </label>
      <ol className="sync-stage-list">
        {['Both observe 10000', 'A reserves', 'B attempts reservation', 'Apply evidence for A'].map(
          (label, i) => (
            <li key={label} aria-current={phase === i ? 'step' : undefined}>
              {i} / {label}
            </li>
          ),
        )}
      </ol>
      <div className="worksheet-choices refund-evidence">
        {(['unknown', 'confirmed', 'failed'] as const).map((e) => (
          <button
            type="button"
            className="secondary"
            key={e}
            aria-pressed={evidence === e}
            onClick={() => setEvidence(e)}
          >
            A evidence: {e}
          </button>
        ))}
      </div>
      <div
        className="refund-allocation"
        role="img"
        aria-label="Phân bổ captured amount và refund reservations"
      >
        {[
          ['Captured limit', run.captured],
          ['Confirmed A', run.confirmed],
          ['Reserved A', run.reservedA],
          ['Reserved B', run.reservedB],
          ['Confirmed + reserved', run.confirmed + run.reservedA + run.reservedB],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <div className="refund-allocation-track">
              <i
                style={{
                  width: (Number(value) / maximum) * 100 + '%',
                  visibility: Number(value) === 0 ? 'hidden' : 'visible',
                }}
              />
            </div>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <dl className="worksheet-results" aria-live="polite">
        <div>
          <dt>Confirmed refunds</dt>
          <dd data-refund-confirmed>{run.confirmed}</dd>
        </div>
        <div>
          <dt>Active reserved refunds</dt>
          <dd data-refund-reserved>{run.reservedA + run.reservedB}</dd>
        </div>
        <div>
          <dt>Available / minor units</dt>
          <dd data-refund-available>{run.available}</dd>
        </div>
        <div>
          <dt>Overbooked / minor units</dt>
          <dd data-refund-overbooked>{run.overbooked}</dd>
        </div>
      </dl>
      <p className="refund-status" translate="no">
        A: {run.statusA} / B: {run.statusB}
      </p>
      <p>
        UNKNOWN của A giữ reservation; confirmed chuyển reserved sang confirmed, còn definite
        failure mới release. B đã bị reject không tự được nhận lại khi A fail; cần admission/retry
        decision theo operation identity. Số available âm trong unsafe mode là lỗi local budget,
        không phải bằng chứng ngân hàng đã hoàn vượt capture. Model không thay provider rules hoặc
        protocol retry/dedup thật.
      </p>
    </section>
  );
}
