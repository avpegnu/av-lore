import {useId,useState} from 'react';
import {useIslandReady} from '../lib/use-island-ready';
import {onCallSchedule,lsmOperations,lsmReplay,lsmLookup,shardDistribution} from '../lib/database-models';
export default function DatabasePlayground({kind}:{kind:'db-isolation'|'lsm'|'sharding'}){
  const ref=useIslandReady(),uid='database-model-'+useId().replace(/:/g,'');
  const [serial,setSerial]=useState(false),[steps,setSteps]=useState(7),[compact,setCompact]=useState(false),[key,setKey]=useState('C');
  const [strategy,setStrategy]=useState<'hash'|'range'>('range'),[pattern,setPattern]=useState<'uniform'|'latest'|'hot-key'>('latest'),[shards,setShards]=useState(4);
  const eventLabels:Record<string,string>={readA2:'A đọc thấy 2 bác sĩ',readB2:'B đọc thấy 2 bác sĩ',commitA:'A commit cho Alice nghỉ',abortB:'B abort và retry toàn transaction',retryB1:'B đọc lại thấy 1 bác sĩ; Bob tiếp tục trực',commitB:'B commit cho Bob nghỉ',violated:'Vi phạm invariant: không còn bác sĩ trực'};
  const schedule=onCallSchedule(serial),lsm=lsmReplay(steps,compact),lookup=lsmLookup(lsm,key),distribution=shardDistribution(strategy,pattern,shards);
  return <section className="handbook-experiment" ref={ref} aria-labelledby={uid}>
    <span className="eyebrow">DATABASE / INVARIANTS AND ACCESS PATTERNS</span>
    {kind==='db-isolation'&&<>
      <h3 id={uid}>Write skew: hai transaction, hai row</h3>
      <p>Alice và Bob cùng trực. Mỗi transaction đọc tổng số bác sĩ rồi cho một người nghỉ nếu tổng lớn hơn một. Hai transaction update hai row khác nhau, nên chỉ chống lost update trên một row chưa đủ giữ invariant.</p>
      <div className="worksheet-choices"><button type="button" className="secondary" aria-pressed={!serial} onClick={()=>setSerial(false)}>Snapshot interleaving</button><button type="button" className="secondary" aria-pressed={serial} onClick={()=>setSerial(true)}>Serializable + retry</button></div>
      <ol>{schedule.events.map((event,i)=><li key={i}>{eventLabels[event]}</li>)}</ol>
      <dl className="worksheet-results" aria-live="polite"><div><dt>On-call doctors</dt><dd>{Number(schedule.alice)+Number(schedule.bob)}</dd></div><div><dt>Aborted attempts</dt><dd>{schedule.aborts}</dd></div></dl>
      <p>Mô hình serializable chọn một transaction abort rồi retry từ đầu để quan sát state mới. Đây là interleaving minh họa, không triển khai MVCC/SSI hay lock manager thật; engine có thể chọn transaction khác để abort.</p>
    </>}
    {kind==='lsm'&&<>
      <h3 id={uid}>Memtable, SST và tombstone</h3>
      <p>Memtable flush khi có ba key distinct. SST immutable được đọc từ mới tới cũ; tombstone chặn value cũ xuất hiện lại. Compaction trong mô hình merge mọi SST và giữ tombstone, chưa mô phỏng WAL, Bloom filter, levels hoặc snapshot GC.</p>
      <div className="worksheet-inputs"><label>Processed writes<output>{steps}</output><input type="range" min="0" max={lsmOperations.length} value={steps} onChange={e=>setSteps(+e.target.value)}/></label></div>
      <div className="worksheet-choices"><label className="routing-toggle"><input type="checkbox" checked={compact} onChange={e=>setCompact(e.target.checked)}/>Compact SST files</label>{['A','B','C','D','E','F'].map(value=><button type="button" key={value} className="secondary" aria-pressed={key===value} onClick={()=>setKey(value)}>{value}</button>)}</div>
      <p className="database-operation-list">{lsmOperations.map(([k,v],i)=><span key={i} className={i<steps?'applied':''}>{k}={v??'†'}</span>)}</p>
      <div className="database-stores">{[lsm.memory,...lsm.files].map((rows,i)=><div key={i}><strong>{i===0?'Memtable':'SST-'+i}</strong><p>{rows.length?rows.map(r=>r.key+'='+(r.value??'†')).join(' · '):'∅'}</p></div>)}</div>
      <p>{lookup.visited.join(' → ')}</p>
      <dl className="worksheet-results" aria-live="polite"><div><dt>Lookup result</dt><dd>{lookup.value??(lookup.deleted?'†':'∅')}</dd></div><div><dt>Stores visited</dt><dd>{lookup.visited.length}</dd></div></dl>
      <p>† là tombstone; ∅ là không có value trong mô hình. Đổi step để thấy C=c1 trước delete rồi C=† sau delete; compact không được làm c1 sống lại.</p>
    </>}
    {kind==='sharding'&&<>
      <h3 id={uid}>Key-count đều chưa chắc traffic đều</h3>
      <p>1.000 key có ID tăng dần. Chọn 90% traffic vào 100 key mới nhất hoặc một hot key; so range và hash partition. Mô hình chỉ đo placement, không di chuyển dữ liệu hay mô phỏng transaction.</p>
      <div className="worksheet-inputs"><label>Shards<output>{shards}</output><input type="range" min="2" max="8" value={shards} onChange={e=>setShards(+e.target.value)}/></label></div>
      <div className="worksheet-choices">{(['range','hash'] as const).map(value=><button type="button" key={value} className="secondary" aria-pressed={strategy===value} onClick={()=>setStrategy(value)}>{value}</button>)}</div>
      <div className="worksheet-choices">{(['uniform','latest','hot-key'] as const).map(value=><button type="button" key={value} className="secondary" aria-pressed={pattern===value} onClick={()=>setPattern(value)}>{value}</button>)}</div>
      <div className="shard-bars">{distribution.map(shard=><div key={shard.id}><span>Shard {shard.id+1} · {shard.keys} keys</span><div><span style={{width:shard.traffic*100+'%'}}/></div><strong>{(shard.traffic*100).toFixed(1)}%</strong></div>)}</div>
      <dl className="worksheet-results" aria-live="polite"><div><dt>Max shard traffic</dt><dd>{(Math.max(...distribution.map(s=>s.traffic))*100).toFixed(1)}%</dd></div><div><dt>Max / ideal load</dt><dd>{(Math.max(...distribution.map(s=>s.traffic))*shards).toFixed(2)}×</dd></div></dl>
      <p>Hash giúp trải nhiều key mới, nhưng một hot key vẫn có một owner. Thêm shard có thể làm data-count đẹp hơn mà không chữa bottleneck của key đó.</p>
    </>}
  </section>;
}
