import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { exchangeEvents, replayBook, exchangeRecovery, sharedRiskReplay } from '../lib/exchange-models';
const riskSteps = [
  'Account có credit budget 1.000', 'Shard A precheck 700 trên balance cũ',
  'Shard B precheck 600 trên cùng balance cũ', 'A reserve 700',
  'B thử reserve 600', 'A cancel và release 700', 'Duplicate release của A tới lần nữa',
];
export default function ExchangePlayground({kind}:{kind:'exchange-book'|'exchange-recovery'|'exchange-risk'}) {
  const ref = useIslandReady(), id = 'exchange-' + useId().replace(/:/g,'');
  const [cut,setCut]=useState(4), [applied,setApplied]=useState(10), [fenced,setFenced]=useState(false),
    [riskStep,setRiskStep]=useState(4), [guard,setGuard]=useState(true);
  const book=replayBook(cut), recovery=exchangeRecovery(applied,fenced), risk=sharedRiskReplay(riskStep,guard),
    event=exchangeEvents[cut-1], previous=replayBook(Math.max(0,cut-1)), newFills=book.fills.slice(previous.fills.length);
  return <section className="handbook-experiment exchange-playground" ref={ref} aria-labelledby={id}>
    <span className="eyebrow">EXCHANGE / ORDER, REPLAY AND AUTHORITY</span>
    {kind==='exchange-book' && <>
      <h3 id={id}>Một command có thể khớp nhiều resting orders</h3>
      <p>Book minh họa một symbol, integer price ticks và quantity lots. Limit orders là GTC; market orders là IOC. Matching chọn best price rồi FIFO, thực hiện tại giá maker. Reduce giữ priority; Replace luôn nhận priority mới trong policy này. Không có auctions, fees, hidden orders hoặc self-trade prevention. Arrays giúp đọc state, không mô phỏng latency của engine production.</p>
      <div className="worksheet-inputs"><label>Committed prefix<output>{cut} / 17</output><input type="range" min="0" max="17" value={cut} onChange={e=>setCut(+e.target.value)}/></label></div>
      <div className="exchange-actions">{[4,5,6,10,11,12,13,16,17].map(n=><button type="button" key={n} aria-pressed={cut===n} onClick={()=>setCut(n)}>#{n}</button>)}</div>
      <p role="status">{event ? '#'+cut+' '+event.owner+':'+event.id+' · '+event.kind.toUpperCase() : 'EMPTY BOOK'}</p>
      <div className="exchange-sides">{(['buy','sell'] as const).map(side=><section key={side}>
        <h4>{side==='buy'?'BIDS · giá cao trước':'ASKS · giá thấp trước'}</h4>
        <ol>{book.orders.filter(o=>o.side===side).sort((a,b)=>(side==='buy'?b.price-a.price:a.price-b.price)||a.priority-b.priority).map(o=><li key={o.id}><strong>{o.price}</strong><span>{o.id}</span><span>{o.qty} lots · priority #{o.priority}</span></li>)}</ol>
        {!book.orders.some(o=>o.side===side)&&<p>Không có resting order</p>}
      </section>)}</div>
      <dl className="worksheet-results" aria-live="polite">
        <div><dt>Trading mode</dt><dd>{book.mode}</dd></div><div><dt>Command result</dt><dd>{book.lastResult.status}</dd></div>
        <div><dt>Executions mới ở bước này</dt><dd>{newFills.length}</dd></div><div><dt>Tổng matched lots</dt><dd>{book.fills.reduce((n,f)=>n+f.qty,0)}</dd></div>
      </dl>
      <p>Ở #5, buy 7 tại limit 100 lấy MA:A 5 rồi MB:B 2. Ở #10, MC Replace cùng giá vẫn mất FIFO priority; #11 lấy ME:E trước. #12 gửi lại cùng business ID và payload: trả lại kết quả cũ, không sinh execution mới. #13 chỉ khớp được 3/10 lots và expire 7, không tự tạo liquidity.</p>
      <figure className="handbook-table"><div tabIndex={0} role="region" aria-label="Execution transcript"><table><thead><tr><th>Fill ID</th><th>Maker → taker</th><th>Ticks</th><th>Lots</th></tr></thead><tbody>{book.fills.map(f=><tr key={f.id}><td>{f.id}</td><td>{f.maker} → {f.taker}</td><td>{f.price}</td><td>{f.qty}</td></tr>)}</tbody></table></div><figcaption>Fill ID = committed log index / ordinal, ổn định khi replay qua leader epoch khác.</figcaption></figure>
      <p>HALT ở #15 và RESUME ở #17 là logged control events. Policy này cho cancel/reduce khi halt, nhưng reject lệnh mới; rejected business IDs vẫn được giữ. Không dùng local wall clock để tự ý đổi kết quả replay.</p>
    </>}
    {kind==='exchange-recovery' && <>
      <h3 id={id}>Caught up chưa đồng nghĩa có quyền phát kết quả</h3>
      <p>Authority đã xác định committed prefix là #13. Index #14 từng được assign nhưng chưa commit, nên không replay như một quyết định đã hứa với client. Snapshot/replay trong lab gồm orders, dedup results, control mode và rule version. Không mô phỏng quorum protocol hoặc real disks.</p>
      <div className="worksheet-inputs"><label>Standby applied index<output>{applied} / 13</output><input type="range" min="0" max="13" value={applied} onChange={e=>setApplied(+e.target.value)}/></label></div>
      <label className="worksheet-toggle"><input type="checkbox" checked={fenced} onChange={e=>setFenced(e.target.checked)}/>Authority bên ngoài đã fence old publisher</label>
      <div className="exchange-log" role="img" aria-label="Assigned, committed and replayed prefix">{Array.from({length:14},(_,i)=>i+1).map(n=><span key={n} data-state={n>13?'uncommitted':n<=applied?'applied':'pending'}>#{n}</span>)}</div>
      <p>Ô đã apply dùng màu nhấn; ô chờ replay có viền; #14 có gạch chéo vì chưa commit.</p>
      <dl className="worksheet-results" aria-live="polite">
        <div><dt>Committed index</dt><dd>13</dd></div><div><dt>Replay lag</dt><dd>{recovery.lag}</dd></div>
        <div><dt>Full model state bằng committed state</dt><dd>{recovery.identical?'MATCH':'DIFFERENT'}</dd></div><div><dt>Publication gate</dt><dd>{recovery.status}</dd></div>
      </dl>
      <p role="status">{recovery.canPublish?'Đã đủ prefix và authority: có thể publish dưới epoch mới.':'Giữ publication đóng: cần cả committed prefix và fencing authority.'}</p>
      <p>Checkbox biểu diễn evidence từ authority và output sinks, không phải cho phép standby tự cấp quyền. Full-state equality ở đây là so sánh trực tiếp, không phải cryptographic checksum hay bằng chứng mọi replica production đều đúng. Republish fill IDs cũ yêu cầu downstream dedup; epoch dùng để fence writer, không đổi business identity của cùng fill.</p>
    </>}
    {kind==='exchange-risk' && <>
      <h3 id={id}>Hai symbol không được tiêu cùng một account budget</h3>
      <p>Hai shards A/B cùng nhìn thấy budget 1.000, muốn reserve 700 và 600 credit units. Không có fills, fees hoặc market-price changes trong lab; đây là budget reservation model, không tính margin thực tế. Chế độ guard dùng atomic reserve và idempotent release theo reservation ID.</p>
      <div className="worksheet-inputs"><label>Risk timeline<output>{riskStep} / 6</output><input type="range" min="0" max="6" value={riskStep} onChange={e=>setRiskStep(+e.target.value)}/></label></div>
      <label className="worksheet-toggle"><input type="checkbox" checked={guard} onChange={e=>setGuard(e.target.checked)}/>Atomic reserve và deduplicate release</label>
      <ol className="exchange-risk-steps">{riskSteps.map((title,i)=><li key={title} data-past={i<=riskStep} aria-current={i===riskStep?'step':undefined}><strong>#{i}</strong> {title}</li>)}</ol>
      <dl className="worksheet-results" aria-live="polite">
        <div><dt>Available credit</dt><dd>{risk.available}</dd></div><div><dt>Reserved A / B</dt><dd>{risk.reservedA} / {risk.reservedB}</dd></div>
        <div><dt>Reservations được chấp nhận</dt><dd>{risk.accepted}</dd></div><div><dt>Budget invariant error</dt><dd>{risk.invariantError}</dd></div>
      </dl>
      <p>Invariant: available + reserved A + reserved B = 1.000, và available phải không âm. Tắt guard: bước 4 over-reserve 300; bước 6 duplicate release tạo thêm 700 credit không tồn tại. Guard giữ invariant và chỉ nhận reservation A. Hai lỗi khác nhau: stale prechecks gây over-reserve; thiếu release identity gây credit inflation.</p>
      <p>Trong production có thể dùng account authority, conservative escrow quotas hoặc phối hợp khác có bằng chứng; mỗi cách có latency và utilization cost. Reconcile unknown outcomes trước khi cấp/release lại. Kill switch sau giao dịch không thể biến một stale precheck thành hard pre-trade limit.</p>
    </>}
  </section>;
}
