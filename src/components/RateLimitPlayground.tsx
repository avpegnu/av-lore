import {useId,useState} from 'react';import {useIslandReady} from '../lib/use-island-ready';
import {rateReplay,rateStreams,counterRace,type LimitAlgorithm} from '../lib/rate-limit-models';
export default function RateLimitPlayground({kind}:{kind:'rate-race'|'counter-race'}){
 const ref=useIslandReady(),id='limiter-'+useId().replace(/:/g,'');const [limit,setLimit]=useState(6),[capacity,setCapacity]=useState(6),[stream,setStream]=useState<keyof typeof rateStreams>('boundary'),[contenders,setContenders]=useState(2),[atomic,setAtomic]=useState(false);
 const algorithms:[LimitAlgorithm,string][]=[['token','Token bucket'],['leaky','Leaky bucket queue'],['fixed','Fixed window'],['log','Sliding log'],['counter','Sliding counter']];const race=counterRace(contenders,atomic);
 return <section className="handbook-experiment" ref={ref} aria-labelledby={id}><span className="eyebrow">RATE LIMITS / SAME TRAFFIC, DIFFERENT CONTRACTS</span>
 {kind==='rate-race'&&<>
 <h3 id={id}>Năm thuật toán, cùng một traffic</h3><p>Window là 1.000 ms; mỗi request tốn một unit. Token bucket refill theo limit/giây; leaky queue có cùng tốc độ phục vụ và dung lượng buffer riêng. Các giới hạn rolling dùng khoảng (t−1.000, t].</p>
 <div className="worksheet-inputs"><label>Limit / second<output>{limit}</output><input type="range" min={2} max={12} value={limit} onChange={e=>setLimit(+e.target.value)}/></label><label>Bucket / buffer capacity<output>{capacity}</output><input type="range" min={2} max={16} value={capacity} onChange={e=>setCapacity(+e.target.value)}/></label></div>
 <div className="worksheet-choices">{Object.keys(rateStreams).map(s=><button type="button" key={s} className="secondary" aria-pressed={stream===s} onClick={()=>setStream(s as keyof typeof rateStreams)}>{s==='boundary'?'Sát ranh giới window':s==='steady'?'Traffic đều':'Các đợt burst'}</button>)}</div>
 <div className="rate-comparison">{algorithms.map(([algorithm,name])=>{const result=rateReplay(algorithm,rateStreams[stream],limit,capacity);return <div className="rate-algorithm" key={algorithm}><header><strong>{name}</strong><span>{result.allowed} / {result.events.length}</span></header><ol aria-label={name}>{result.events.map((e,i)=><li key={i} data-allowed={e.accepted} title={`t=${e.at} ms; ${e.accepted?'accepted':'rejected'}; release=${e.releaseAt.toFixed(1)} ms`}>{e.accepted?'✓':'×'}</li>)}</ol><dl><div><dt>Max admitted / rolling second</dt><dd>{result.peakWindow}</dd></div><div><dt>Max queue delay / ms</dt><dd>{result.maxDelay.toFixed(1)}</dd></div></dl></div>;})}</div>
 <p>✓ là nhận vào, × là từ chối; leaky queue nhận vào không có nghĩa chạy ngay. Sliding counter là xấp xỉ theo phân bố request; chart không biến nó thành strict rolling limit. Đây là replay deterministic, không đo performance của server.</p>
 </>}
 {kind==='counter-race'&&<>
 <h3 id={id}>Counter báo 5 nhưng có thể đã cho qua hơn 5</h3><p>Counter hiện là 4, limit là 5. Các contender cùng đọc state trước khi ghi trong mode không atomic. So số request được nhận với giá trị counter cuối.</p>
 <div className="worksheet-inputs"><label>Concurrent contenders<output>{contenders}</output><input type="range" min={2} max={8} value={contenders} onChange={e=>setContenders(+e.target.value)}/></label></div>
 <div className="worksheet-choices"><button type="button" className="secondary" aria-pressed={!atomic} onClick={()=>setAtomic(false)}>Read → compare → write</button><button type="button" className="secondary" aria-pressed={atomic} onClick={()=>setAtomic(true)}>Atomic check + spend</button></div>
 <dl className="worksheet-results" aria-live="polite"><div><dt>Requests admitted</dt><dd>{race.allowed}</dd></div><div><dt>Final stored counter</dt><dd>{race.storedCount}</dd></div></dl><p>Atomic ở đây là một decision không interleave trên cùng key/state. Replication/failover, nhiều key ở nhiều shard và quota billing durable là các vấn đề riêng.</p>
 </>}
 </section>;
}
