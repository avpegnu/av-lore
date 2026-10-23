import {useId,useState} from 'react';
import {useIslandReady} from '../lib/use-island-ready';
import {assignPartitions,deliveryCrash,nextContiguousOffset,type DeliveryMode} from '../lib/messaging-models';
export default function MessagingPlayground({kind}:{kind:'consumer-groups'|'delivery-crash'|'offset-gaps'}){
 const ref=useIslandReady(),id='messaging-'+useId().replace(/:/g,'');
 const [partitions,setPartitions]=useState(4),[consumers,setConsumers]=useState(3),[mode,setMode]=useState<DeliveryMode>('effect-first'),[crash,setCrash]=useState(0),[completed,setCompleted]=useState<number[]>([1,2]);
 const group=assignPartitions(partitions,consumers),delivery=deliveryCrash(mode,crash===0?'before-effect':'after-effect'),next=nextContiguousOffset(completed);
 return <section className="handbook-experiment" ref={ref} aria-labelledby={id}><span className="eyebrow">MESSAGING / ORDER AND PROGRESS</span>
 {kind==='consumer-groups'&&<>
 <h3 id={id}>Thêm consumer có luôn tăng parallelism?</h3><p>Một consumer group phân chia partition của topic cho các member. Phép gán vòng tròn dưới đây chỉ minh họa partition ownership, không triển khai Classic/Consumer protocol hay Share group thật.</p>
 <div className="worksheet-inputs"><label>Số partition<output>{partitions}</output><input type="range" min={1} max={8} value={partitions} onChange={e=>setPartitions(+e.target.value)}/></label><label>Số consumer<output>{consumers}</output><input type="range" min={1} max={10} value={consumers} onChange={e=>setConsumers(+e.target.value)}/></label></div>
 <div className="consumer-lanes">{group.map(member=><div key={member.consumer}><strong>C{member.consumer+1}</strong><div>{member.partitions.length?member.partitions.map(p=><span className="partition-chip" key={p}>P{p}</span>):<span className="muted">Idle</span>}</div></div>)}</div>
 <dl className="worksheet-results" aria-live="polite"><div><dt>Active consumers</dt><dd>{Math.min(partitions,consumers)}</dd></div><div><dt>Idle consumers</dt><dd>{Math.max(0,consumers-partitions)}</dd></div></dl><p>Đây là giới hạn assignment phân partition, không phải mọi kiểu xử lý. Worker pool theo key cần giữ ordering và progress; Share groups chia record theo semantics khác.</p>
 </>}
 {kind==='delivery-crash'&&<>
 <h3 id={id}>Crash giữa side effect và ACK</h3><p>Một event tăng một số dư trong database. Lần delivery đầu crash tại điểm đã chọn; nếu chưa ACK, lần redelivery chạy đến hết. Dedup record chỉ bảo vệ khi commit cùng transaction với effect.</p>
 <div className="worksheet-choices">{(['ack-first','effect-first','transactional-dedup'] as const).map(m=><button type="button" className="secondary" key={m} aria-pressed={mode===m} onClick={()=>setMode(m)}>{m==='ack-first'?'ACK trước effect':m==='effect-first'?'Effect trước ACK':'Effect + receipt atomic'}</button>)}</div>
 <div className="worksheet-inputs"><label>Điểm crash<output>{crash===0?'Before effect':'After effect'}</output><input type="range" min={0} max={1} value={crash} onChange={e=>setCrash(+e.target.value)}/></label></div>
 <div className="delivery-path"><span>Deliver</span><span>{mode==='ack-first'?'ACK → effect':'Effect → ACK'}</span><span>Crash</span><span>{delivery.redelivered?'Redeliver':'No redelivery'}</span></div>
 <dl className="worksheet-results" aria-live="polite"><div><dt>Deliveries</dt><dd>{delivery.deliveries}</dd></div><div><dt>Committed effects</dt><dd>{delivery.effects}</dd></div></dl><p>{delivery.missing?'Event đã ACK nhưng effect bị mất.':delivery.duplicate?'Effect bị lặp sau redelivery.':'Logical event tạo đúng một effect trong scenario này.'}</p><p>Mô hình không gồm external payment API. Với side effect ngoài transaction, cần idempotency hoặc cơ chế hợp tác của đích và reconciliation cho unknown outcome.</p>
 </>}
 {kind==='offset-gaps'&&<>
 <h3 id={id}>Commit offset không được vượt khoảng trống</h3><p>Chọn những offset đã xử lý durable. Committed offset là vị trí tiếp theo cần đọc, nên chỉ được tiến qua prefix hoàn tất liên tục. Chọn offset 7 trước offset 0 để thấy vì sao dùng max(completed)+1 có thể làm mất việc.</p>
 <div className="worksheet-choices">{Array.from({length:8},(_,i)=><button type="button" className="secondary" key={i} aria-pressed={completed.includes(i)} onClick={()=>setCompleted(old=>old.includes(i)?old.filter(x=>x!==i):[...old,i])}>offset {i}{completed.includes(i)?' ✓':''}</button>)}</div>
 <dl className="worksheet-results" aria-live="polite"><div><dt>Safe next offset</dt><dd>{next}</dd></div><div><dt>Completed records</dt><dd>{completed.length}</dd></div></dl><p>Hoàn tất ở đây nghĩa là effect và tiến độ xử lý cần thiết đã durable theo contract. Rebalance còn cần ngừng/fence worker cũ; một số offset không thay thế ownership.</p>
 </>}
 </section>;
}
