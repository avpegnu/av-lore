import {useId,useState} from 'react';
import {useIslandReady} from '../lib/use-island-ready';
import {batchOccupancy,servingPlacement,initialUsage,usageAction,servingJobs,type UsageAction} from '../lib/serving-models';
const usageActions:{action:UsageAction;label:string}[]=[
 {action:'reserve',label:'Reserve 100 input + 300 max output'},
 {action:'queue-reject',label:'Queue reject và refund'},
 {action:'start',label:'Worker bắt đầu'},
 {action:'produce',label:'Ghi nhận output counter =40'},
 {action:'disconnect',label:'Client disconnect / xin cancel'},
 {action:'cancel-confirm',label:'Worker xác nhận cancel + final usage'},
 {action:'finish',label:'Worker hoàn tất + final usage'},
 {action:'retry',label:'Thử automatic retry'},
 {action:'duplicate-final',label:'Nhận lại terminal event'},
];
const usageHelp:Record<string,string>={
 READY:'Fixed budget 1.000; chưa có reservation.',RESERVED:'Giữ 400 tokens trong escrow; chưa bắt đầu GPU work.',
 QUEUE_REJECT_REFUNDED:'Queue từ chối trước worker start; trả đủ 400 một lần.',WORKER_STARTED:'Worker đã nhận attempt; timeout bây giờ có thể là unknown outcome.',
 '40_TOKENS_PRODUCED':'Authoritative output counter là 40; lab giả định client đã thấy partial output.',
 CANCEL_REQUESTED_RESERVATION_HELD:'Mới xin cancel, chưa có stop acknowledgement; giữ nguyên reservation.',
 FINAL_USAGE_COMMITTED:'Final input 100 + output counter được charge; chỉ release phần chưa dùng.',
 DUPLICATE_FINAL_IGNORED:'Terminal event đã apply; không double charge hoặc double refund.',
 BLOCK_SILENT_STREAM_RESTART:'Đã có partial output: không nối một generation mới âm thầm vào stream cũ.',
 RECONCILE_EXISTING_ATTEMPT:'Chưa thấy output không chứng minh attempt chưa chạy; reconcile trước retry.',
 INVALID_STATE:'Thao tác chưa hợp lệ ở phase hiện tại; budget không thay đổi.',
};
export default function ServingPlayground({kind}:{kind:'serving-batch'|'serving-placement'|'serving-usage'}){
 const ref=useIslandReady(),id='serving-'+useId().replace(/:/g,'');
 const [slots,setSlots]=useState(2),[mode,setMode]=useState<'static'|'continuous'>('continuous'),[queue,setQueue]=useState(200),[free,setFree]=useState(20),[compatible,setCompatible]=useState(true),[policy,setPolicy]=useState<'affinity'|'work'>('work'),[usage,setUsage]=useState(initialUsage);
 const batch=batchOccupancy(slots,mode),fixed=batchOccupancy(slots,'static'),flow=batchOccupancy(slots,'continuous'),placement=servingPlacement(queue,free,compatible,policy);
 return <section className="handbook-experiment serving-playground" ref={ref} aria-labelledby={id}>
  <span className="eyebrow">LLM SERVING / OCCUPANCY, PLACEMENT AND ACCOUNTING</span>
  {kind==='serving-batch'&&<>
   <h3 id={id}>Giải phóng một slot ở iteration boundary</h3>
   <p>Workload A–E có arrival và output length cố định. Mỗi active sequence tạo đúng một output token/tick; tick là đơn vị trừu tượng, không phải millisecond hoặc measured TPOT. Lab chỉ mô phỏng slot occupancy: bỏ prefill, KV limits, changing batch cost và real hardware. Static batch vẫn trả response ngắn khi xong, chỉ chưa tái dùng slot tới khi group kết thúc.</p>
   <div className="worksheet-inputs"><label>Decode slots<output>{slots}</output><input type="range" min="1" max="4" value={slots} onChange={e=>setSlots(+e.target.value)}/></label></div>
   <div className="serving-actions">{(['static','continuous'] as const).map(m=><button type="button" key={m} data-policy={m} aria-pressed={mode===m} onClick={()=>setMode(m)}>{m==='static'?'Static groups':'Continuous admission'}</button>)}</div>
   <div className="serving-timeline" tabIndex={0} role="region" aria-label="Synthetic decode occupancy timeline">
    <svg viewBox={`0 0 ${Math.max(650,80+batch.makespan*40)} 235`} role="img" aria-labelledby={id+'-grid'}><title id={id+'-grid'}>{'Synthetic output-token ticks for requests A through E'}</title>
     {batch.timeline.map(t=><text key={t.tick} x={90+t.tick*40} y="20" textAnchor="middle">{t.tick+1}</text>)}
     {servingJobs.map((job,row)=><g key={job.id}><text x="20" y={55+row*36}>{job.id}</text>{batch.timeline.map(t=><g key={t.tick}><rect x={72+t.tick*40} y={33+row*36} width="34" height="28" rx="4" data-active={t.active.includes(job.id)}/>{t.active.includes(job.id)&&<text x={89+t.tick*40} y={52+row*36} textAnchor="middle">{job.id}</text>}</g>)}</g>)}
    </svg>
   </div>
   <dl className="worksheet-results" aria-live="polite"><div><dt>Static makespan / ticks</dt><dd>{fixed.makespan}</dd></div><div><dt>Continuous makespan / ticks</dt><dd>{flow.makespan}</dd></div><div><dt>Selected occupancy</dt><dd>{(batch.occupancy*100).toFixed(1)}%</dd></div><div><dt>Output tokens giữ nguyên</dt><dd>{batch.produced}</dd></div></dl>
   <figure className="handbook-table"><div tabIndex={0} role="region" aria-label="Batch request timing transcript"><table><thead><tr><th>Request</th><th>Arrival</th><th>Output tokens</th><th>First output tick</th><th>Finish tick</th></tr></thead><tbody>{batch.jobs.map(j=><tr key={j.id}><td>{j.id}</td><td>{j.arrival}</td><td>{j.tokens}</td><td>{j.first}</td><td>{j.done}</td></tr>)}</tbody></table></div><figcaption>Với 2 slots, static hoàn tất ở tick 10, continuous tick 7; cả hai tạo 14 tokens. Không suy speedup production từ fixed-tick assumption.</figcaption></figure>
  </>}
  {kind==='serving-placement'&&<>
   <h3 id={id}>Cache hit không luôn đáng chờ queue nóng</h3>
   <p>Request có 96 prompt + 96 max output tokens, page 8 tokens. Replica A giữ 64 prefix tokens tương thích; free pages đã trừ cached blocks. Full context cần 24 pages, A chỉ allocate thêm 16 khi reuse 8 cached pages. Toy shape: 2 K/V × 16 layers × 4 KV heads × 64 dimensions × 2 bytes = 16 KiB/token, 128 KiB/page. Đây là conservative maximum reservation, không mô phỏng allocator thực.</p>
   <div className="worksheet-inputs"><label>Queued work tại A<output>{queue}</output><input type="range" min="0" max="256" step="8" value={queue} onChange={e=>setQueue(+e.target.value)}/></label><label>Free pages tại A<output>{free}</output><input type="range" min="0" max="64" value={free} onChange={e=>setFree(+e.target.value)}/></label></div>
   <label className="worksheet-toggle"><input type="checkbox" checked={compatible} onChange={e=>setCompatible(e.target.checked)}/>Cache identity và tenant scope tương thích</label>
   <div className="serving-actions"><button type="button" data-policy="affinity" aria-pressed={policy==='affinity'} onClick={()=>setPolicy('affinity')}>Ưu tiên prefix affinity</button><button type="button" data-policy="work" aria-pressed={policy==='work'} onClick={()=>setPolicy('work')}>Min queued + uncached work</button></div>
   <div className="serving-replicas">{placement.rows.map(r=><section key={r.id} data-selected={placement.chosen.id===r.id}><h4>Replica {r.id}</h4><p>{r.eligible?'MEMORY ELIGIBLE':'INSUFFICIENT PAGES'}</p><dl><dt>Cached prefix tokens</dt><dd>{r.hit}</dd><dt>Uncached prefill work</dt><dd>{r.prefill}</dd><dt>Free / new pages</dt><dd>{r.free} / {r.newPages}</dd><dt>Queue + uncached work</dt><dd>{r.score}</dd></dl></section>)}</div>
   <dl className="worksheet-results" aria-live="polite"><div><dt>Selected replica</dt><dd>{placement.chosen.id}</dd></div><div><dt>New allocation / MiB</dt><dd>{(placement.chosen.newPages*placement.pageKiB/1024).toFixed(2)}</dd></div><div><dt>Estimated work units</dt><dd>{placement.chosen.score}</dd></div></dl>
   <p>Với queue A = 200, affinity chọn A ở 232 work units, còn load-aware chọn B ở 104 dù mất cache hit. Free pages A ít hơn 16 làm A ineligible kể cả cached prefix đúng. Tắt compatibility để mô phỏng model/adapter/KV config hoặc tenant namespace khác: không được reuse dù text prefix giống. Work units không là TTFT prediction; real engine admission cần atomic block allocation, không chỉ stale scheduler hints.</p>
  </>}
  {kind==='serving-usage'&&<>
   <h3 id={id}>Cancel requested chưa phải compute đã dừng</h3>
   <p>Lab dùng fixed budget 1.000 token units, không phải TPM token-bucket refill hay bảng giá thật. Request R1 reserve 100 input + 300 max output; một output counter cố định 40 minh họa partial response. Usage là authoritative worker count, không đếm SSE events. Final identity R1/final được giữ để duplicate delivery không double charge/refund.</p>
   <div className="serving-actions">{usageActions.map(a=><button key={a.action} data-action={a.action} type="button" onClick={()=>setUsage(s=>usageAction(s,a.action))}>{a.label}</button>)}<button type="button" data-action="reset" onClick={()=>setUsage(initialUsage())}>Reset budget</button></div>
   <dl className="worksheet-results" aria-live="polite"><div><dt>Attempt phase</dt><dd>{usage.phase}</dd></div><div><dt>Available budget</dt><dd>{usage.available}</dd></div><div><dt>Held reservation</dt><dd>{usage.held}</dd></div><div><dt>Settled actual usage</dt><dd>{usage.spent}</dd></div><div><dt>Terminal effects đã apply</dt><dd>{usage.terminalEvents}</dd></div><div><dt>Action result</dt><dd>{usage.result}</dd></div></dl>
   <p role="status">{usageHelp[usage.result]}</p>
   <p>Thử reserve→queue reject: trả đủ 400. Reset rồi reserve→start→counter40→disconnect: giữ 400 vì mới xin cancel. Cancel confirm mới settle 140 và release 260, available 860. Duplicate terminal event không đổi balance. Retry sau partial output bị chặn silent restart; trước first output vẫn cần reconcile attempt đang chạy.</p>
   <p>Invariant của escrow này: available + held + settled = 1.000. Worker crash có thể chưa có final counts; giữ unknown/reservation hoặc xử lý theo explicit bounded reconciliation policy. Client disconnect không bảo đảm nhận final usage event, nên server metering phải durable và recover riêng với stream.</p>
  </>}
 </section>;
}
