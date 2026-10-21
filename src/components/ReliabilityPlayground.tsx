import {useId,useState} from 'react';import {useIslandReady} from '../lib/use-island-ready';
import {dependencyAvailability,retryAmplification,retrySchedule,breakerReplay,type BreakerEvent} from '../lib/reliability-models';
export default function ReliabilityPlayground({kind}:{kind:'dependency-availability'|'retry-storm'|'circuit-breaker'}){
 const ref=useIslandReady(),id='reliability-'+useId().replace(/:/g,'');const [count,setCount]=useState(3),[replicas,setReplicas]=useState(2),[shared,setShared]=useState(false),[layers,setLayers]=useState(3),[attempts,setAttempts]=useState(3),[jitter,setJitter]=useState(false),[budget,setBudget]=useState(2),[threshold,setThreshold]=useState(3),[events,setEvents]=useState<BreakerEvent[]>(['failure','failure','failure']);
 const availability=dependencyAvailability(.999,count,replicas,shared?.01:0),retry=retrySchedule(jitter,budget),breaker=breakerReplay(events,threshold);
 return <section className="handbook-experiment" ref={ref} aria-labelledby={id}><span className="eyebrow">RELIABILITY / ASSUMPTIONS AND FAILURE BOUNDARIES</span>
 {kind==='dependency-availability'&&<>
 <h3 id={id}>Dependency chain và lỗi chung</h3><p>Mỗi component có xác suất khả dụng 99,9% trong mô hình. Chain cần tất cả component; nhóm redundant chỉ cần một replica. Hai kết quả là hai cấu trúc riêng, không phải cùng một architecture.</p>
 <div className="worksheet-inputs"><label>Serial dependencies<output>{count}</output><input type="range" min={1} max={8} value={count} onChange={e=>setCount(+e.target.value)}/></label><label>Parallel replicas<output>{replicas}</output><input type="range" min={1} max={4} value={replicas} onChange={e=>setReplicas(+e.target.value)}/></label></div>
 <label className="routing-toggle"><input type="checkbox" checked={shared} onChange={e=>setShared(e.target.checked)}/>Lỗi chung có xác suất 1% làm mất cả nhóm redundant</label>
 <div className="dependency-chain">{Array.from({length:count},(_,i)=><span key={i}>D{i+1} · 99.9%</span>)}</div>
 <dl className="worksheet-results" aria-live="polite"><div><dt>Serial chain / %</dt><dd>{(availability.series*100).toFixed(5)}</dd></div><div><dt>Redundant group / %</dt><dd>{(availability.redundant*100).toFixed(5)}</dd></div></dl><p>Phép nhân chain giả định độc lập. Nhóm redundant giả định replica độc lập khi không có lỗi chung; thêm replica không vượt được trần availability của common cause. Đây là xác suất minh họa, không phải SLO dự báo từ marketing.</p>
 </>}
 {kind==='retry-storm'&&<>
 <h3 id={id}>Retry nhân tải; jitter chỉ trải thời điểm</h3><p>Worst case: mỗi layer gọi layer dưới tối đa số attempts đã chọn, tính cả lần đầu. Biểu đồ riêng mô phỏng 24 request cùng thất bại, tối đa ba attempts ở một retry layer, backoff 100/200 ms; mỗi cột gom retry trong 50 ms.</p>
 <div className="worksheet-inputs"><label>Retrying layers<output>{layers}</output><input type="range" min={1} max={5} value={layers} onChange={e=>setLayers(+e.target.value)}/></label><label>Total attempts / layer<output>{attempts}</output><input type="range" min={1} max={4} value={attempts} onChange={e=>setAttempts(+e.target.value)}/></label></div>
 <label className="routing-toggle"><input type="checkbox" checked={jitter} onChange={e=>setJitter(e.target.checked)}/>Full jitter cho lịch retry minh họa</label>
 <div className="worksheet-choices">{[0,.5,2].map(r=><button type="button" className="secondary" key={r} aria-pressed={budget===r} onClick={()=>setBudget(r)}>Retry budget {r*100}%</button>)}</div>
 <div className="retry-bars">{retry.buckets.map(b=><div key={b.at}><span>{b.at} ms</span><div><span style={{width:b.retries/24*100+'%'}}/></div><strong>{b.retries}</strong></div>)}</div>
 <dl className="worksheet-results" aria-live="polite"><div><dt>Worst-case leaf attempts</dt><dd>{retryAmplification(layers,attempts)}</dd></div><div><dt>Admitted retry attempts</dt><dd>{retry.retries}</dd></div></dl><p>Đổi layers/attempts tác động phép nhân worst case; jitter/budget tác động chart một layer. Jitter không tự giảm tổng attempts; retry budget giới hạn số lần thử. Chưa mô phỏng deadline, network latency hoặc phục hồi của dependency.</p>
 </>}
 {kind==='circuit-breaker'&&<>
 <h3 id={id}>Circuit breaker: đóng, mở và probe</h3><p>Failure liên tiếp đạt threshold thì open trong năm đơn vị thời gian mô hình. Đợi cooldown rồi cấp đúng một probe; success đóng lại, failure mở lại. Đây là state machine tuần tự, chưa mô phỏng request đồng thời hoặc response đến muộn.</p>
 <div className="worksheet-inputs"><label>Consecutive failure threshold<output>{threshold}</output><input type="range" min={2} max={5} value={threshold} onChange={e=>setThreshold(+e.target.value)}/></label></div>
 <div className="breaker-state" data-state={breaker.state}><strong>{breaker.state}</strong><span>t = {breaker.now}</span></div>
 <div className="worksheet-choices"><button type="button" className="secondary" onClick={()=>setEvents(old=>[...old,'success'])}>Request success</button><button type="button" className="secondary" onClick={()=>setEvents(old=>[...old,'failure'])}>Request failure</button><button type="button" className="secondary" onClick={()=>setEvents(old=>[...old,'wait'])}>Wait 5 units</button><button type="button" className="secondary" disabled={!breaker.canProbe} onClick={()=>setEvents(old=>[...old,'probe'])}>Admit one probe</button><button type="button" className="secondary" onClick={()=>setEvents([])}>Reset breaker</button></div>
 <dl className="worksheet-results" aria-live="polite"><div><dt>Dependency calls completed</dt><dd>{breaker.calls}</dd></div><div><dt>Blocked attempts</dt><dd>{breaker.blocked}</dd></div></dl><p>Trong half-open, hai nút request biểu diễn kết quả của probe đang giữ quyền, không tạo probe thứ hai. Production phải chặn concurrency và response cũ theo generation, đồng thời chọn metric/window phù hợp thay vì chỉ lấy ba lỗi liên tiếp.</p>
 </>}
 </section>;
}
