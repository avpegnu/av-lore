import {useId,useMemo,useState} from 'react';
import {useIslandReady} from '../lib/use-island-ready';
import {balanceRequests,buildRing,ringOwner,stableHash,type BalancerAlgorithm} from '../lib/routing-models';
export default function RoutingPlayground({kind}:{kind:'balancer'|'hash-ring'}){
  const ref=useIslandReady(),uid='routing-'+useId().replace(/:/g,'');
  const [algorithm,setAlgorithm]=useState<BalancerAlgorithm>('round-robin'),[slow,setSlow]=useState(false);
  const [count,setCount]=useState(3),[virtual,setVirtual]=useState(32),[key,setKey]=useState('user:42');
  const schedule=useMemo(()=>balanceRequests(algorithm,slow),[algorithm,slow]);
  const owners=Array.from({length:count},(_,i)=>'node-'+String.fromCharCode(65+i));
  const ring=useMemo(()=>buildRing(owners,virtual),[count,virtual]);
  const baseline=useMemo(()=>buildRing(['node-A','node-B','node-C'],virtual),[virtual]);
  const selected=ringOwner(ring,key),keys=Array.from({length:400},(_,i)=>'user:'+i);
  const moved=keys.filter(k=>ringOwner(ring,k).owner!==ringOwner(baseline,k).owner).length;
  const angle=(hash:number)=>hash/2**32*2*Math.PI-Math.PI/2;
  const point=(hash:number,radius=120)=>({x:300+Math.cos(angle(hash))*radius,y:170+Math.sin(angle(hash))*radius});
  const k=point(stableHash(key)),destination=point(selected.hash);
  const arc=(selected.hash-stableHash(key)+2**32)%2**32;
  return <section className="handbook-experiment routing-playground" ref={ref} aria-labelledby={uid}>
    <span className="eyebrow">ROUTING / CONTROLLED EXPERIMENT</span>
    {kind==='balancer'?<>
      <h3 id={uid}>Phân phối request có chi phí khác nhau</h3>
      <p>30 request đến cách nhau 40 ms; mỗi node có một worker tuần tự, job dài xuất hiện theo lịch cố định. Least outstanding đếm cả job đang chạy và đang đợi. Mô hình không đo connection pooling hoặc latency mạng.</p>
      <div className="worksheet-choices">{([['round-robin','Round robin'],['least-outstanding','Least outstanding'],['two-choices','Power of two choices']] as const).map(([id,label])=><button type="button" className="secondary" aria-pressed={algorithm===id} key={id} onClick={()=>setAlgorithm(id)}>{label}</button>)}</div>
      <label className="routing-toggle"><input type="checkbox" checked={slow} onChange={e=>setSlow(e.target.checked)}/>Node B xử lý chậm gấp đôi</label>
      <div className="routing-chart" role="region" tabIndex={0} aria-label="Timeline xử lý request của ba node">
        <svg viewBox="0 0 800 240" role="img" aria-label="Các thanh biểu diễn thời gian bắt đầu và kết thúc từng job">
          {[0,1,2].map(i=><g key={i}><text x="10" y={52+i*55}>Node {String.fromCharCode(65+i)}</text><line x1="90" x2="770" y1={45+i*55} y2={45+i*55}/></g>)}
          {schedule.jobs.map(j=><rect key={j.id} x={90+j.start/schedule.makespan*680} y={30+j.server*55} width={Math.max(3,j.duration/schedule.makespan*680)} height="30" className={j.duration>200?'long-job':''}><title>{`#${j.id}: ${j.start}–${j.finish} ms`}</title></rect>)}
          <text x="90" y="215">0 ms</text><text x="770" y="215" textAnchor="end">{schedule.makespan} ms</text>
        </svg>
      </div>
      <dl className="worksheet-results" aria-live="polite"><div><dt>Mean response / ms</dt><dd>{schedule.mean.toFixed(0)}</dd></div><div><dt>p95 response / ms</dt><dd>{schedule.p95}</dd></div></dl>
      <p>Số request bằng nhau chưa chắc lượng công việc bằng nhau. Thuật toán dựa số outstanding cũng không biết trước duration của job mới; kết quả tốt hơn ở một lịch tải không chứng minh luôn tốt hơn mọi workload.</p>
    </>:<>
      <h3 id={uid}>Consistent hashing và key movement</h3>
      <p>400 key giả định được hash vào vòng 32-bit. Mỗi node có nhiều virtual token; key đi theo chiều kim đồng hồ tới token đầu tiên. So với baseline ba node có cùng số virtual token.</p>
      <div className="worksheet-choices"><button type="button" className="secondary" disabled={count>=8} onClick={()=>setCount(count+1)}>Thêm node</button><button type="button" className="secondary" disabled={count<=2} onClick={()=>setCount(count-1)}>Gỡ node</button><span>{count} nodes</span></div>
      <div className="worksheet-inputs"><label>Virtual tokens / node<output>{virtual}</output><input type="range" min="8" max="128" step="8" value={virtual} onChange={e=>setVirtual(+e.target.value)}/></label><label>Key<input type="text" value={key} onChange={e=>setKey(e.target.value)}/></label></div>
      <div className="routing-chart" role="region" tabIndex={0} aria-label="Vòng consistent hashing">
        <svg viewBox="0 0 600 350" role="img" aria-label="Token trên vòng hash và đường tới owner của key">
          <circle className="hash-circle" cx="300" cy="170" r="120"/>
          {ring.map(token=>{const p=point(token.hash);return <circle key={token.owner+token.slot} className={'hash-token owner-'+owners.indexOf(token.owner)} cx={p.x} cy={p.y} r="3"><title>{`${token.owner} / ${token.slot}`}</title></circle>;})}
          <path className="hash-route" d={`M ${k.x} ${k.y} A 120 120 0 ${arc>2**31?1:0} 1 ${destination.x} ${destination.y}`}/>
          <circle className="hash-key" cx={k.x} cy={k.y} r="7"/>
          <text x="300" y="160" textAnchor="middle">{selected.owner}</text><text x="300" y="185" textAnchor="middle">{Math.round(moved/keys.length*100)}% moved</text>
        </svg>
      </div>
      <dl className="worksheet-results" aria-live="polite"><div><dt>Moved keys / 400</dt><dd>{moved}</dd></div><div><dt>Total virtual tokens</dt><dd>{ring.length}</dd></div></dl>
      <ul>{owners.map(owner=><li key={owner}>{owner}: {keys.filter(k=>ringOwner(ring,k).owner===owner).length} keys</li>)}</ul>
      <p>Virtual tokens giúp phân phối nhiều key, không chia tải của một hot key. Thay routing không tự chuyển dữ liệu; storage cần replication, ownership version và migration/catch-up riêng. Hash này phục vụ minh họa, không dùng cho mật mã.</p>
    </>}
  </section>;
}
