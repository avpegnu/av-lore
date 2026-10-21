import {useId,useState} from 'react';import {useIslandReady} from '../lib/use-island-ready';
import {snowflakeLayout,packId,leafReplay} from '../lib/identifier-models';
export default function IdentifierPlayground({kind}:{kind:'id-bits'|'id-locality'}){
 const ref=useIslandReady(),id='identifier-'+useId().replace(/:/g,'');const [worker,setWorker]=useState(10),[sequence,setSequence]=useState(12),[steps,setSteps]=useState(15),[mode,setMode]=useState<'random'|'time'>('random');
 const layout=snowflakeLayout(worker,sequence),value=packId(100000000n,7n,3n,worker,sequence),tree=leafReplay(mode,steps);
 return <section className="handbook-experiment" ref={ref} aria-labelledby={id}><span className="eyebrow">IDENTIFIERS / BITS, ORDER AND STORAGE</span>
 {kind==='id-bits'&&<>
 <h3 id={id}>Chia 63 bit: không có lựa chọn miễn phí</h3><p>Giữ sign bit bằng 0. Thay worker bits và sequence bits; timestamp nhận phần còn lại. ID ví dụ dùng timestamp tương đối 100.000.000 ms, worker 7, sequence 3, không phải ID production.</p>
 <div className="worksheet-inputs"><label>Worker bits<output>{worker}</output><input type="range" min={4} max={14} value={worker} onChange={e=>setWorker(+e.target.value)}/></label><label>Sequence bits<output>{sequence}</output><input type="range" min={4} max={18} value={sequence} onChange={e=>setSequence(+e.target.value)}/></label></div>
 <div className="id-bit-layout"><span style={{flexGrow:layout.timeBits}}>Time · {layout.timeBits}</span><span style={{flexGrow:worker}}>Worker · {worker}</span><span style={{flexGrow:sequence}}>Sequence · {sequence}</span></div>
 <dl className="worksheet-results" aria-live="polite"><div><dt>Epoch horizon / years</dt><dd>{layout.years.toFixed(2)}</dd></div><div><dt>Worker slots</dt><dd>{layout.workers}</dd></div><div><dt>IDs / ms / worker</dt><dd>{layout.perMillisecond}</dd></div><div><dt>Payload bits</dt><dd>63</dd></div></dl><code>{value.toString()}</code><p>Các trần này chỉ đến từ bit layout. Clock rollback, restart state, worker reuse, thread safety và throughput thật cần thiết kế riêng; không tự đạt tốc độ lý thuyết bằng cách chia bit.</p>
 </>}
 {kind==='id-locality'&&<>
 <h3 id={id}>Time prefix thay đổi vùng leaf được chạm</h3><p>B-tree leaf model có tối đa bốn key, split ở giữa khi overflow. Random mode dùng một hoán vị cố định; time mode tăng theo nhóm timestamp nhưng đảo thứ tự trong nhóm. Không mô phỏng buffer pool, internal pages, fill factor hay engine thật.</p>
 <div className="worksheet-inputs"><label>Inserted keys<output>{steps}</output><input type="range" min={1} max={31} value={steps} onChange={e=>setSteps(+e.target.value)}/></label></div>
 <div className="worksheet-choices"><button type="button" className="secondary" aria-pressed={mode==='random'} onClick={()=>setMode('random')}>Random order</button><button type="button" className="secondary" aria-pressed={mode==='time'} onClick={()=>setMode('time')}>Time-prefix order</button></div>
 <div className="leaf-pages">{tree.pages.map(p=><div key={p.id}><strong>Leaf {p.id}</strong><span>{p.keys.join(' · ')}</span></div>)}</div>
 <dl className="worksheet-results" aria-live="polite"><div><dt>Leaf splits</dt><dd>{tree.splits}</dd></div><div><dt>Leaves touched / last 8 inserts</dt><dd>{tree.recentLeaves}</dd></div></dl><p>Split count đơn lẻ không chứng minh hiệu năng: insert có thứ tự cũng split. Quan sát locality và đo engine thực tế; UUIDv7 cùng millisecond không tự có global creation order.</p>
 </>}
 </section>;
}
