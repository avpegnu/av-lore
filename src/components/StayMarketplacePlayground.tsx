import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { stayAvailability, stayQuote, stayProjection } from '../lib/stay-marketplace-models';
export default function StayMarketplacePlayground({
  kind,
}: {
  kind: 'stay-calendar' | 'stay-quote' | 'stay-cdc';
}) {
  const ref = useIslandReady(),
    id = 'stay-' + useId().replace(/:/g, '');
  const [start, setStart] = useState(4),
    [nights, setNights] = useState(3),
    [policy, setPolicy] = useState(true),
    [clamp, setClamp] = useState(false);
  const [now, setNow] = useState(9),
    [honor, setHonor] = useState(true),
    [consent, setConsent] = useState(false);
  const [count, setCount] = useState(6),
    [versions, setVersions] = useState(true),
    [drop, setDrop] = useState(false),
    [floor, setFloor] = useState(true);
  const calendar = stayAvailability(start, nights, policy, clamp),
    quote = stayQuote(now, honor, consent),
    projection = stayProjection(count, versions, drop, floor);
  const dollars = (minor: number) => '$' + (minor / 100).toFixed(2);
  return (
    <section ref={ref} className="handbook-experiment stay-playground" aria-labelledby={id}>
      <span className="eyebrow">BOOKING / NIGHTS, QUOTES AND PROJECTIONS</span>
      {kind === 'stay-calendar' && (
        <>
          <h3 id={id}>Không có đêm bận chưa đủ để đặt phòng</h3>
          <p>
            Lịch chỉ bao phủ 14 đêm theo ngày địa phương của listing. Start là chỉ số từ 0; khoảng ở
            là [start, start+nights), không gồm ngày checkout. A yêu cầu ít nhất 4 đêm, C ít nhất 2;
            D chỉ cho check-in ở indices chia hết cho 7. Candidates đã qua geo filter giả định.
          </p>
          <div className="worksheet-inputs">
            <label>
              Check-in index<output>{start}</output>
              <input
                type="range"
                min="0"
                max="16"
                value={start}
                onChange={(e) => setStart(+e.target.value)}
              />
            </label>
            <label>
              Requested nights<output>{nights}</output>
              <input
                type="range"
                min="1"
                max="8"
                value={nights}
                onChange={(e) => setNights(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={policy} onChange={(e) => setPolicy(e.target.checked)} />
            Kiểm tra minimum stay và allowed check-in
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={clamp} onChange={(e) => setClamp(e.target.checked)} />
            Unsafe: cắt bỏ đêm ngoài horizon rồi coi như đã kiểm đủ
          </label>
          <figure className="handbook-table stay-calendar">
            <div
              role="region"
              tabIndex={0}
              aria-label="Local-night availability and policy decisions"
            >
              <table>
                <thead>
                  <tr>
                    <th scope="col">Listing / result</th>
                    {Array.from({ length: 14 }, (_, d) => (
                      <th key={d} scope="col">
                        N{d + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {calendar.rows.map((l) => (
                    <tr key={l.id}>
                      <th scope="row">
                        {l.id} / {l.status}
                      </th>
                      {Array.from({ length: 14 }, (_, d) => (
                        <td
                          key={d}
                          data-query={d >= start && d < start + nights}
                          data-blocked={l.blocked.includes(d)}
                          aria-label={
                            l.id +
                            ' / night ' +
                            (d + 1) +
                            ' / ' +
                            (l.blocked.includes(d) ? 'BLOCKED' : 'FREE')
                          }
                        >
                          {l.blocked.includes(d) ? '×' : '·'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <figcaption>
              × = blocked; · = free trong bản index. Border đánh dấu requested nights; phần ngoài
              horizon không có evidence. Một bitmap cho đêm bận không encode mọi eligibility rule.
            </figcaption>
          </figure>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Requested interval</dt>
              <dd>
                [{start}, {calendar.end})
              </dd>
            </div>
            <div>
              <dt>Outside known horizon?</dt>
              <dd>{calendar.outside ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>No bitmap conflict</dt>
              <dd>{calendar.bitmapCandidates}</dd>
            </div>
            <div>
              <dt>Eligible index candidates</dt>
              <dd>{calendar.candidates}</dd>
            </div>
            <div>
              <dt>False candidates beyond horizon</dt>
              <dd>{calendar.falseBeyondHorizon}</dd>
            </div>
          </dl>
          <p className="muted">
            Index candidate chưa phải reservation. Booking phải recheck calendar, rules, quote và
            current ownership tại authority. Với nhiều words, bit operations tăng theo số words được
            kiểm; raw bitmap bytes chưa gồm replicas/index/object overhead. Đêm là local calendar
            date, không mặc định đúng 24 giờ qua DST.
          </p>
        </>
      )}
      {kind === 'stay-quote' && (
        <>
          <h3 id={id}>Giá trên search, quote được giữ và tổng mới khác nhau</h3>
          <p>
            Quote v1 cho 3 đêm, $100/đêm + $20 fees + 10% tax = $352, hết hạn tại t=10. Host cập
            nhật v2 tại t=0 thành $120/đêm: tổng mới $418. Chính sách price lock chỉ giữ v1 khi
            quote còn hạn; tắt lock nghĩa estimate phải revalidate. Tiền USD minor units; tax là giả
            định cố định của lab.
          </p>
          <div className="worksheet-inputs">
            <label>
              Server time<output>{now}</output>
              <input
                type="range"
                min="0"
                max="15"
                value={now}
                onChange={(e) => setNow(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={honor} onChange={(e) => setHonor(e.target.checked)} />
            Quote v1 có price-lock contract khi còn hạn
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            Guest xác nhận lại tổng mới khi phải requote
          </label>
          <div className="stay-quote-cards">
            <article>
              <strong>Cached / v1</strong>
              <p>{dollars(quote.oldTotal)}</p>
              <span>EXPIRES AT 10</span>
            </article>
            <article>
              <strong>Current / v2</strong>
              <p>{dollars(quote.newTotal)}</p>
              <span>3 × $120 + $20 + $38</span>
            </article>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Old quote still valid?</dt>
              <dd>{quote.valid ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Required current total</dt>
              <dd>{dollars(quote.amount)}</dd>
            </div>
            <div>
              <dt>Quote decision</dt>
              <dd>{quote.status === 'PRICE_ACCEPTED' ? 'ACCEPTED' : 'REQUOTE'}</dd>
            </div>
            <div>
              <dt>Approved quote amount</dt>
              <dd>{dollars(quote.chargeable)}</dd>
            </div>
          </dl>
          <p className="muted">
            Approved quote amount không charge tiền, không giữ phòng và không chứng minh risk/stock
            eligibility. Thực tế cần signed/verified quote identity,
            dates/guests/currency/fees/tax-policy versions, expiry và consent. Giá gợi ý của model
            không tự thay host-approved price; đổi ngày hoặc guest count cần quote scope mới.
          </p>
        </>
      )}
      {kind === 'stay-cdc' && (
        <>
          <h3 id={id}>Version guard ngăn regression, không tự sửa event bị mất</h3>
          <p>
            Authority ở version 4 đã book nights [5,8). Replay gồm backfill v1 free, live v4,
            duplicate v4, old hold v2, old cancel v3 và late backfill v1. Query night index 6.
            Fixture có known minimum floor 4 từ một verified barrier; production không được giả định
            biết latest version miễn phí.
          </p>
          <div className="worksheet-inputs">
            <label>
              Delivered mutations<output>{count} / 6</output>
              <input
                type="range"
                min="1"
                max="6"
                value={count}
                onChange={(e) => setCount(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={versions}
              onChange={(e) => setVersions(e.target.checked)}
            />
            Apply chỉ mutation version mới hơn cho listing
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={drop} onChange={(e) => setDrop(e.target.checked)} />
            Mất cả live v4 và bản redelivery của nó
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={floor} onChange={(e) => setFloor(e.target.checked)} />
            Không kết luận available khi chưa đạt known version floor
          </label>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Projected version</dt>
              <dd>{projection.version}</dd>
            </div>
            <div>
              <dt>Known required floor</dt>
              <dd>{projection.knownFloor}</dd>
            </div>
            <div>
              <dt>Query decision</dt>
              <dd>{projection.status}</dd>
            </div>
            <div>
              <dt>False availability candidate?</dt>
              <dd>{projection.falsePositive ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Version gap to floor</dt>
              <dd>{projection.lagVersions}</dd>
            </div>
          </dl>
          <figure className="handbook-table">
            <div role="region" tabIndex={0} aria-label="Calendar mutation replay">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Source</th>
                    <th scope="col">Version</th>
                    <th scope="col">Apply result</th>
                    <th scope="col">Projected version</th>
                  </tr>
                </thead>
                <tbody>
                  {projection.rows.map((r, i) => (
                    <tr key={i}>
                      <th scope="row">{r.source}</th>
                      <td>{r.version}</td>
                      <td>{r.result}</td>
                      <td>{r.projectedVersion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
          <p className="muted">
            Known floor chưa đạt thì route authoritative check, wait có deadline hoặc trả coverage
            unknown; đây không phải chứng minh no-lag tới tương lai. CDC cần capture completeness,
            retention/checkpoints, versioned snapshots/tombstones và cutover barrier. Booking
            constraint mới quyết winners; index version guard không thay reservation transaction.
          </p>
        </>
      )}
    </section>
  );
}
