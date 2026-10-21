import {useId,useState} from 'react';
import {useIslandReady} from '../lib/use-island-ready';
import {sessionRead,quorumBounds,raftFrame,type ReadPolicy} from '../lib/consistency-models';
export default function ConsistencyPlayground({kind}:{kind:'replication-lag'|'quorum'|'raft'}){
 const ref=useIslandReady(),uid='consistency-'+useId().replace(/:/g,'');
 const [version,setVersion]=useState(1),[policy,setPolicy]=useState<ReadPolicy>('replica');
 const [n,setN]=useState(5),[r,setR]=useState(3),[w,setW]=useState(3),[failures,setFailures]=useState(0),[frame,setFrame]=useState(0);
 const read=sessionRead(version,policy),quorum=quorumBounds(n,Math.min(r,n),Math.min(w,n),Math.min(failures,n)),nodes=raftFrame(frame);
 const frames=['Cụm ổn định','Partition và write chưa commit','Bầu leader term mới','Majority commit','Kết nối lại và sửa log'];
 const descriptions=[
 'A là leader term 1. Entry tại index 1 đã commit trên cả năm node.',
 'Mạng chia A,B khỏi C,D,E. A append x tại index 2 lên A,B, nhưng hai phiếu chưa đủ majority ba nên x chưa commit.',
 'C được C,D,E bỏ phiếu trong term 2. A vẫn có thể tin mình là leader term 1 khi chưa nhận thông tin mới; A không đủ quorum để commit.',
 'C replicate y tại index 2, term 2 lên C,D,E và commit. Entry x của A,B vẫn chưa commit; không có hai giá trị cùng commit tại index 2.',
 'A,B nhận term 2, A step down. Log x chưa commit bị thay bằng y; các node cùng áp dụng entry đã commit. Entry đã commit từ index 1 được giữ nguyên.'
 ];
 return <section ref={ref} className="handbook-experiment" aria-labelledby={uid}>
 <span className="eyebrow">CONSISTENCY / OBSERVE THE GUARANTEE</span>
 {kind==='replication-lag'&&<>
  <h3 id={uid}>Đọc sau khi ghi: trả dữ liệu cũ hay chờ?</h3>
  <p>Session từng đọc version 2, rồi ghi thành công version 3 trên primary. Replica đang ở version bạn chọn. Watermark yêu cầu ít nhất version 3; mô hình đứng yên để bạn tự cho replica bắt kịp.</p>
  <div className="worksheet-inputs"><label>Replica version<output>{version}</output><input type="range" min="0" max="3" value={version} onChange={e=>setVersion(+e.target.value)}/></label></div>
  <div className="worksheet-choices">{(['replica','primary','watermark'] as const).map(p=><button type="button" className="secondary" key={p} aria-pressed={policy===p} onClick={()=>setPolicy(p)}>{p==='replica'?'Read replica':p==='primary'?'Read primary':'Wait for watermark'}</button>)}</div>
  <dl className="worksheet-results" aria-live="polite"><div><dt>Returned version</dt><dd>{read.waiting?'Waiting':read.observed}</dd></div><div><dt>Read-your-writes</dt><dd>{read.waiting?'Waiting':read.readYourWrites?'Preserved':'Violated'}</dd></div><div><dt>Monotonic reads</dt><dd>{read.waiting?'Waiting':read.monotonic?'Preserved':'Violated'}</dd></div></dl>
  <p>Chờ watermark giữ lời hứa bằng cách chưa trả dữ liệu; nó không làm replica bắt kịp nhanh hơn. Production cần deadline và chính sách fallback rõ ràng.</p>
 </>}
 {kind==='quorum'&&<>
  <h3 id={uid}>Quorum: giao nhau và khả năng tiếp tục</h3>
  <p>Cùng một tập N home replica cố định. Tập ghi chọn từ đầu, tập đọc từ cuối để tạo giao nhau nhỏ nhất. Node lỗi chỉ dùng tính khả năng thu đủ ACK; hình tập hợp không phải một request đang chạy.</p>
  <div className="worksheet-inputs">
   <label>Replica count N<output>{n}</output><input type="range" min="3" max="7" value={n} onChange={e=>setN(+e.target.value)}/></label>
   <label>Read acknowledgements R<output>{Math.min(r,n)}</output><input type="range" min="1" max={n} value={Math.min(r,n)} onChange={e=>setR(+e.target.value)}/></label>
   <label>Write acknowledgements W<output>{Math.min(w,n)}</output><input type="range" min="1" max={n} value={Math.min(w,n)} onChange={e=>setW(+e.target.value)}/></label>
   <label>Failed replicas<output>{Math.min(failures,n)}</output><input type="range" min="0" max={n} value={Math.min(failures,n)} onChange={e=>setFailures(+e.target.value)}/></label>
  </div>
  <div className="quorum-nodes">{Array.from({length:n},(_,i)=><div key={i} className={quorum.intersection.includes(i)?'quorum-overlap':''}><strong>R{i+1}</strong><span>{quorum.read.includes(i)?'Read set':'—'}</span><span>{quorum.write.includes(i)?'Write set':'—'}</span></div>)}</div>
  <dl className="worksheet-results" aria-live="polite"><div><dt>Minimum overlap</dt><dd>{quorum.minimumOverlap}</dd></div><div><dt>Read possible</dt><dd>{quorum.readAvailable?'Yes':'No'}</dd></div><div><dt>Write possible</dt><dd>{quorum.writeAvailable?'Yes':'No'}</dd></div></dl>
  <p>Giao nhau không tự giải quyết concurrent writes, partial writes, version ordering hoặc sloppy quorum. Kết quả này không phải chứng nhận linearizability.</p>
 </>}
 {kind==='raft'&&<>
  <h3 id={uid}>Raft: leader cũ còn sống, quorum quyết định commit</h3>
  <div className="worksheet-choices">{frames.map((label,i)=><button type="button" className="secondary" key={label} aria-pressed={frame===i} onClick={()=>setFrame(i)}>{i+1}. {label}</button>)}</div>
  <div className="raft-nodes">{nodes.map(node=><div key={node.id} className={node.role==='leader'?'raft-leader':''} data-partition={node.partition}><strong>{node.id} · {node.role}</strong><span>term {node.term}</span><code>{node.lastEntry}</code><span>commitIndex {node.commitIndex}</span><span>{frame===0||frame===4?'Connected cluster':node.partition===0?'Group A/B':'Group C/D/E'}</span></div>)}</div>
  <p aria-live="polite">{descriptions[frame]}</p>
  <p>Đây là năm frame chọn trước, không phải simulator Raft đầy đủ. Giả định log ban đầu giống nhau, membership cố định, crash faults; không mô phỏng timer, disk flush, snapshot hay mọi interleaving. Nhóm chỉ biểu diễn partition trong frame 2–4.</p>
 </>}
 </section>;
}
