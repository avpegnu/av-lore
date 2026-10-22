import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { nightReservation, holdExpiry } from '../lib/reservation-models';
const nightEventLabels: Record<string, string> = {
  'A and B both observe one available room on each night':
    'A và B cùng thấy một phòng còn trống trên mỗi đêm.',
  'A commits both nights': 'A commit cả hai đêm.',
  'B commits both nights': 'B commit cả hai đêm.',
  'B rechecks under the atomic boundary and is sold out':
    'B kiểm lại trong atomic boundary và nhận sold out.',
  'Night 1 is available; night 2 is full': 'Đêm 1 còn chỗ; đêm 2 đã full.',
  'Whole transaction rolls back; night 1 remains available':
    'Rollback toàn transaction; đêm 1 vẫn còn chỗ.',
  'Night 1 decremented; night 2 fails without rollback':
    'Đêm 1 bị trừ; đêm 2 fail nhưng không rollback.',
};
export default function ReservationPlayground({
  kind,
}: {
  kind: 'booking-nights' | 'booking-expiry';
}) {
  const ref = useIslandReady(),
    id = 'booking-' + useId().replace(/:/g, ''),
    [scenario, setScenario] = useState<'race' | 'partial'>('race'),
    [atomic, setAtomic] = useState(true),
    [clock, setClock] = useState(16),
    [onTime, setOnTime] = useState(false),
    [guarded, setGuarded] = useState(true);
  const nights = nightReservation(scenario, atomic),
    expiry = holdExpiry(clock, onTime, guarded);
  const timeline = [
    { at: 0, label: 'Hold A / hết hạn t10' },
    { at: 5, label: 'Bắt đầu gọi payment' },
    { at: 7, label: 'Local timeout / chưa rõ outcome' },
    { at: onTime ? 8 : 12, label: 'PSP capture A' },
    { at: onTime ? 9 : 15, label: 'Callback đã xác minh cho A' },
    { at: 10, label: 'Deadline của hold' },
    { at: 11, label: 'Sweep expiry có guard' },
    { at: 13, label: 'B thử booking trong atomic boundary' },
  ].sort((a, b) => a.at - b.at);
  const active = timeline.findLastIndex((e) => e.at <= clock);
  return (
    <section className="handbook-experiment" ref={ref} aria-labelledby={id}>
      <span className="eyebrow">RESERVATIONS / CAPACITY AND ENTITLEMENTS</span>
      {kind === 'booking-nights' ? (
        <>
          <h3 id={id}>Đặt hai đêm phải thành công cả hai hoặc không đêm nào</h3>
          <p>
            Fixture cố định mô phỏng hai race patterns: A/B cùng đọc last room trên hai đêm, hoặc
            đêm đầu còn chỗ nhưng đêm sau full. Atomic mode check+reserve cả stay trong một
            boundary; naive mode dùng stale check hoặc không rollback partial writes. Đây không chạy
            SQL transaction thật.
          </p>
          <div className="worksheet-choices">
            <button
              type="button"
              className="secondary"
              aria-pressed={scenario === 'race'}
              onClick={() => setScenario('race')}
            >
              Two guests / last room
            </button>
            <button
              type="button"
              className="secondary"
              aria-pressed={scenario === 'partial'}
              onClick={() => setScenario('partial')}
            >
              Second night full
            </button>
          </div>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={atomic} onChange={(e) => setAtomic(e.target.checked)} />
            Atomic whole-stay check, update và rollback
          </label>
          <div className="booking-nights">
            {nights.available.map((n, i) => (
              <section key={i}>
                <h4>Night {i + 1}</h4>
                <p>Initial availability {nights.initial[i]}</p>
                <strong>{n}</strong>
                <p>remaining after schedule</p>
              </section>
            ))}
          </div>
          <ol>
            {nights.events.map((e, i) => (
              <li key={i}>{nightEventLabels[e] || e}</li>
            ))}
          </ol>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Whole stays committed</dt>
              <dd>{nights.booked}</dd>
            </div>
            <div>
              <dt>Rejected requests</dt>
              <dd>{nights.rejected}</dd>
            </div>
            <div>
              <dt>Oversold night / scenario</dt>
              <dd>{nights.oversold ? 1 : 0}</dd>
            </div>
            <div>
              <dt>Leaked partial room-nights</dt>
              <dd>{nights.partialLeak}</dd>
            </div>
          </dl>
          <p>
            Atomic mode biểu diễn guarantee cần đạt, không chứng minh mọi SQL statement hoặc
            isolation level đều đúng. Production cần đủ calendar rows, deterministic lock order khi
            dùng nhiều locks và bounded idempotent retries cho abort/deadlock/unknown commit.
          </p>
        </>
      ) : (
        <>
          <h3 id={id}>Payment tới muộn có được hồi sinh hold đã hết hạn?</h3>
          <p>
            Capacity một chỗ. A giữ từ t0 tới deadline t10; payment bắt đầu t5, local timeout t7.
            Sweep t11, B thử book t13. A capture t12 và callback t15 trong late scenario; on-time
            scenario capture t8/callback t9. B có verified payment riêng. Controls replay từ đầu,
            không rewind provider thật.
          </p>
          <div className="worksheet-inputs">
            <label>
              Scenario clock / seconds<output>{clock}</output>
              <input
                type="range"
                min="0"
                max="20"
                value={clock}
                onChange={(e) => setClock(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={onTime} onChange={(e) => setOnTime(e.target.checked)} />
            A được confirm trước hold deadline
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={guarded}
              onChange={(e) => setGuarded(e.target.checked)}
            />
            Confirm kiểm active hold, version và expiry
          </label>
          <ol className="sync-stage-list booking-timeline">
            {timeline.map((e, i) => (
              <li
                key={e.label}
                data-passed={e.at <= clock}
                aria-current={i === active ? 'step' : undefined}
              >
                t{e.at}: {e.label}
              </li>
            ))}
          </ol>
          <div className="payment-facts">
            <section>
              <h4>A reservation / payment knowledge</h4>
              <strong>{expiry.a}</strong>
              <p>{expiry.localPayment}</p>
              <p>Provider captured: {expiry.captured ? 'yes' : 'no'}</p>
            </section>
            <section>
              <h4>B reservation</h4>
              <strong>{expiry.b}</strong>
              <p>A hold eligible now: {expiry.eligibleHold ? 'yes' : 'no'}</p>
            </section>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Inventory counter remaining</dt>
              <dd>{expiry.available}</dd>
            </div>
            <div>
              <dt>Confirmed entitlements</dt>
              <dd>{expiry.confirmed}</dd>
            </div>
            <div>
              <dt>Capacity violation</dt>
              <dd>{expiry.overbooked ? 1 : 0}</dd>
            </div>
            <div>
              <dt>A needs payment recovery</dt>
              <dd>{expiry.recovery ? 1 : 0}</dd>
            </div>
            <div>
              <dt>Capacity minus held/confirmed</dt>
              <dd>{expiry.derivedAvailable}</dd>
            </div>
          </dl>
          <p>
            Guard giữ inventory invariant nhưng không hoàn tiền tự động. Late paid A cần rehold sau
            availability check hoặc refund/compensation workflow có ID và recovery riêng. Deadline
            policy là business choice; UNKNOWN không tự là failed, expiry không hủy in-flight PSP
            call.
          </p>
        </>
      )}
    </section>
  );
}
