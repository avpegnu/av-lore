import {useId,useState} from 'react';
import {useIslandReady} from '../lib/use-island-ready';
import {cacheTrace,evictionReplay,cacheBurst,type EvictionPolicy} from '../lib/cache-models';
export default function CachePlayground({kind}:{kind:'cache-eviction'|'cache-burst'}){
  const ref=useIslandReady(),uid='cache-model-'+useId().replace(/:/g,'');
  const [policy,setPolicy]=useState<EvictionPolicy>('lru'),[steps,setSteps]=useState(7);
  const [coalesce,setCoalesce]=useState(false),[jitter,setJitter]=useState(false),[now,setNow]=useState(60);
  const replay=evictionReplay(policy,steps),burst=cacheBurst(100,10,coalesce,jitter,now);
  return <section className="handbook-experiment" ref={ref} aria-labelledby={uid}>
    <span className="eyebrow">CACHE / REPLAY THE WORKLOAD</span>
    {kind==='cache-eviction'?<>
      <h3 id={uid}>LRU, LFU và FIFO trên cùng một request trace</h3>
      <p>Cache giữ tối đa ba key, mọi object có cùng size. LFU đếm từ khi key vào cache và dùng LRU để phá hòa; chưa có aging. Kết quả phụ thuộc trace, không phải benchmark chung cho mọi policy.</p>
      <div className="worksheet-choices">{(['lru','lfu','fifo'] as const).map(p=><button type="button" key={p} className="secondary" aria-pressed={policy===p} onClick={()=>setPolicy(p)}>{p.toUpperCase()}</button>)}</div>
      <div className="worksheet-inputs"><label>Processed requests<output>{steps}</output><input type="range" min="0" max={cacheTrace.length} value={steps} onChange={e=>setSteps(+e.target.value)}/></label></div>
      <ol className="cache-request-trace" aria-label="Request trace">{cacheTrace.map((key,i)=><li key={i} className={i<steps?'processed':''} aria-current={i===steps-1?'step':undefined}>{key}{i<steps&&<small>{replay.events[i].hit?'hit':'miss'}</small>}</li>)}</ol>
      <div className="cache-slots">{replay.entries.map(entry=><div key={entry.key}><strong>{entry.key}</strong><span>freq {entry.frequency} · last {entry.last+1}</span></div>)}</div>
      <dl className="worksheet-results" aria-live="polite"><div><dt>Hits</dt><dd>{replay.hits}</dd></div><div><dt>Misses</dt><dd>{replay.misses}</dd></div></dl>
      <p>Đổi policy sẽ replay từ đầu cùng trace. FIFO không đổi thứ tự khi hit; LRU cập nhật recency; LFU giữ key được dùng nhiều nhưng có thể giữ popularity cũ nếu không decay.</p>
    </>:<>
      <h3 id={uid}>Stampede, đồng bộ TTL và single-flight</h3>
      <p>100 key đã có trong cache; tại thời điểm chọn, 10 request đồng thời đọc mỗi key. TTL mặc định 60 s; jitter phân bố expiration từ 45 tới 75 s. Snapshot chỉ tính miss ở thời điểm đó, không tính tổng tải suốt vòng đời cache.</p>
      <div className="worksheet-inputs"><label>Time / s<output>{now}</output><input type="range" min="40" max="80" value={now} onChange={e=>setNow(+e.target.value)}/></label></div>
      <div className="worksheet-choices"><label className="routing-toggle"><input type="checkbox" checked={coalesce} onChange={e=>setCoalesce(e.target.checked)}/>Single-flight theo key</label><label className="routing-toggle"><input type="checkbox" checked={jitter} onChange={e=>setJitter(e.target.checked)}/>Jitter TTL giữa các key</label></div>
      <div className="cache-key-grid" aria-hidden="true">{burst.expiration.map((time,i)=><span key={i} className={time<=now?'expired':''} title={`${i}: ${time}s`}/>)}</div>
      <dl className="worksheet-results" aria-live="polite"><div><dt>Expired keys / 100</dt><dd>{burst.expired}</dd></div><div><dt>Origin loads / 1000 reads</dt><dd>{burst.originLoads}</dd></div></dl>
      <p>Single-flight trong mô hình hợp nhất miss của cùng key thành một origin load; các request khác chờ kết quả. Jitter chỉ giãn expiration giữa nhiều key, không tự hợp nhất miss của một hot key. Coordination giữa nhiều process cần thiết kế riêng.</p>
    </>}
  </section>;
}
