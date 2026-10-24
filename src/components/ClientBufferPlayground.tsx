import {useId,useState} from 'react';
import {useIslandReady} from '../lib/use-island-ready';
import {bufferedEditScenario,describeEdit} from '../lib/collaborative-models';
const steps=[
 'Cùng confirmed base: CODE',
 'A chèn X; gửi A/1 theo base revision 0',
 'A chèn Y; giữ trong buffer sau edit X',
 'Server nhận B trước; A nhận remote insert Z',
 'Server commit X; ACK của A/1 chưa đến',
 'A nhận ACK A/1; promote và gửi buffer A/2',
 'Server commit A/2 và ACK; không còn pending',
];
export default function ClientBufferPlayground(){
 const ref=useIslandReady(),id='client-buffer-'+useId().replace(/:/g,'');
 const [stage,setStage]=useState(3),[rebase,setRebase]=useState(true),s=bufferedEditScenario(stage,rebase);
 return <section className="handbook-experiment collab-playground client-buffer-playground" ref={ref} aria-labelledby={id}>
  <span className="eyebrow">COLLABORATION / OUTSTANDING AND BUFFER</span>
  <h3 id={id}>Remote edit phải đi qua cả outstanding lẫn buffer</h3>
  <p>A gửi insert X @1 từ CODE rồi gõ Y @2 khi X còn chờ ACK. B chèn Z @0 và tới server trước. Timeline giữ FIFO và một outstanding operation; đây là một lịch ASCII xác định, không phải OT library hoàn chỉnh. Tắt rebase buffer để thấy server vẫn nhận valid positions nhưng text có thể sai.</p>
  <div className="worksheet-inputs"><label>Bước context và ACK<output>{stage} / 6</output><input type="range" min="0" max="6" value={stage} onChange={e=>setStage(+e.target.value)}/></label></div>
  <label className="worksheet-toggle"><input type="checkbox" checked={rebase} onChange={e=>setRebase(e.target.checked)}/>Rebase buffered edit qua remote change</label>
  <ol className="collab-timeline">{steps.map((text,i)=><li key={text} aria-current={i===stage?'step':undefined}><strong>#{i}</strong> {text}</li>)}</ol>
  <div className="collab-replicas collab-two">{[['Client A',s.local],['Server',s.server]].map(([name,text])=><section key={name}><h4>{name}</h4><div className="collab-text">{Array.from(text).map((char,i)=><span key={i}>{char}</span>)}</div></section>)}</div>
  <dl className="worksheet-results" aria-live="polite">
   <div><dt>Confirmed revision A / server</dt><dd>{s.confirmedRevision} / {s.serverRevision}</dd></div>
   <div><dt>Outstanding identity</dt><dd>{s.identity}</dd></div>
   <div><dt>Outstanding hiện tại</dt><dd>{s.outstanding?describeEdit(s.outstanding):'—'}</dd></div>
   <div><dt>Buffered edit</dt><dd>{s.buffer?describeEdit(s.buffer):'—'}</dd></div>
   <div><dt>Base đã gửi trên wire</dt><dd>{s.sentBase??'—'}</dd></div>
   <div><dt>Pending / final agreement</dt><dd>{s.pending} / {stage<6?'IN_FLIGHT':s.agree?'MATCH':'DIVERGED'}</dd></div>
  </dl>
  <p>Ở bước 3, pending X đổi thành @2 và buffered Y đổi thành @3. Wire request A/1 đã gửi trước đó vẫn mang base 0 và @1; server rebase nó đúng một lần. ACK X tới ở bước 5 mới cho phép gửi A/2 từ confirmed base 2. Không gửi lại X @2 nhưng vẫn ghi base 0.</p>
  <p>Tắt rebase buffer: Y giữ @2 và được gửi trên base 2 có text ZCXODE. Server nhận ZCYXODE, còn A đang hiện ZCXYODE. Cả hai ACK đã đến và pending bằng 0 vẫn không sửa được protocol sai context. Bật guard rồi replay để thấy cả hai kết thúc ZCXYODE.</p>
 </section>;
}
