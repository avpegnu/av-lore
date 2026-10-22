import {useId,useState} from 'react';
import {useIslandReady} from '../lib/use-island-ready';
import {pairScenario,describeEdit,tombstoneScenario,durableEditScenario,renderTree} from '../lib/collaborative-models';
const pairLabels=['Insert cạnh concurrent delete','Hai inserts cùng vị trí','Hai deletes cùng ký tự','Hai deletes khác ký tự'];
const pairSteps=['Cùng base revision: CODE','Mỗi client apply một local edit','Server nhận edit đầu tiên','Server nhận edit còn lại','Clients nhận remote edit và catch up'];
const anchorSteps=['Hai replicas cùng giữ CODE','A xóa O; B offline chèn X sau O','A chạy compaction thử nghiệm','Trao đổi delete và incremental insert'];
const commitSteps=['Client sửa local: CODE!','Owner apply trong RAM','Gửi ACK theo chế độ đã chọn','Owner crash, phục hồi durable state','Retry/duplicate cùng stable update ID','Old owner thử ghi dưới epoch cũ'];
export default function CollaborativePlayground({kind}:{kind:'collab-pair'|'collab-anchors'|'collab-durable'}){
 const ref=useIslandReady(),id='collab-'+useId().replace(/:/g,'');
 const [scenario,setScenario]=useState(0),[stage,setStage]=useState(1),[transform,setTransform]=useState(true),[aFirst,setAFirst]=useState(true),
 [anchorStage,setAnchorStage]=useState(3),[keep,setKeep]=useState(true),
 [commitStage,setCommitStage]=useState(3),[durable,setDurable]=useState(true),[fence,setFence]=useState(true),[lost,setLost]=useState(false);
 const pair=pairScenario(scenario,transform,stage,aFirst),anchor=tombstoneScenario(anchorStage,keep),commit=durableEditScenario(commitStage,durable,fence,lost);
 return <section className="handbook-experiment collab-playground" ref={ref} aria-labelledby={id}>
  <span className="eyebrow">COLLABORATION / CONTEXT, IDENTITY AND RECOVERY</span>
  {kind==='collab-pair'&&<>
   <h3 id={id}>Cùng vị trí số học không chắc cùng ký tự</h3>
   <p>Hai edits độc lập cùng base CODE; vị trí đánh số từ 0. Mỗi client chỉ tạo một edit nên lab tập trung pairwise transform và remote rebase, không mô phỏng toàn bộ OT session/buffer protocol. Tie-break inserts cùng chỗ chọn actor A trước B. Nội dung ASCII giữ rõ đơn vị vị trí; editor thật còn cần Unicode, grapheme và IME semantics.</p>
   <div className="collab-actions">{pairLabels.map((label,i)=><button key={label} type="button" aria-pressed={scenario===i} data-case={i} onClick={()=>setScenario(i)}>{label}</button>)}</div>
   <label className="worksheet-toggle"><input type="checkbox" checked={transform} onChange={e=>setTransform(e.target.checked)}/>Transform theo context đã thay đổi</label>
   <label className="worksheet-toggle"><input type="checkbox" checked={aFirst} onChange={e=>setAFirst(e.target.checked)}/>Server nhận A trước B</label>
   <div className="worksheet-inputs"><label>Bước trao đổi<output>{stage} / 4</output><input type="range" min="0" max="4" value={stage} onChange={e=>setStage(+e.target.value)}/></label></div>
   <p role="status">{pairSteps[stage]}</p>
   <div className="collab-replicas">{[['Client A',pair.clientA,describeEdit(pair.a)],['Server',pair.server,'COMMITTED ORDER'],['Client B',pair.clientB,describeEdit(pair.b)]].map(([name,text,operation])=><section key={name}><h4>{name}</h4><div className="collab-text" aria-label={name+' document'}>{Array.from(text).map((char,i)=><span key={i}>{char}</span>)}</div><p>{operation}</p></section>)}</div>
   <figure className="handbook-table"><div tabIndex={0} role="region" aria-label="Operation contexts"><table><thead><tr><th>Local edit</th><th>Sau concurrent edit</th><th>Replay path</th></tr></thead><tbody><tr><td>{describeEdit(pair.a)}</td><td>{describeEdit(pair.afterB)}</td><td>B → A</td></tr><tr><td>{describeEdit(pair.b)}</td><td>{describeEdit(pair.afterA)}</td><td>A → B</td></tr></tbody></table></div><figcaption>Hai transform nhận cùng base context; không dùng công thức này cho arbitrary unrelated revisions.</figcaption></figure>
   <dl className="worksheet-results" aria-live="polite"><div><dt>State sau catch-up</dt><dd>{stage<4?'IN_FLIGHT':pair.converged?'CONVERGED':'DIVERGED'}</dd></div><div><dt>Đúng target theo scenario</dt><dd>{stage<4?'PENDING':pair.correct?'PRESERVED':'WRONG_TARGET'}</dd></div></dl>
   <p>Thử hai deletes cùng ký tự rồi tắt transform: cả hai clients cùng ra CE, nhưng đã xóa cả O lẫn D dù mỗi người chỉ muốn xóa O. Transform biến delete trùng target thành NOOP để giữ CDE. Vì vậy convergence là một yêu cầu; intention và rule correctness vẫn cần kiểm tra riêng.</p>
  </>}
  {kind==='collab-anchors'&&<>
   <h3 id={id}>Nội dung đã xóa vẫn có thể là một điểm neo</h3>
   <p>Lab dùng insertion tree tự định nghĩa: mỗi ký tự có immutable ID, left-origin và delete marker; siblings sort theo counter giảm dần rồi ID. Đây không phải format hoặc GC implementation của Yjs. Khi B offline chèn X sau S:2, A đã xóa nội dung O nhưng cần structural anchor để đặt update đó đúng context.</p>
   <div className="worksheet-inputs"><label>Bước offline và compaction<output>{anchorStage} / 3</output><input type="range" min="0" max="3" value={anchorStage} onChange={e=>setAnchorStage(+e.target.value)}/></label></div>
   <label className="worksheet-toggle"><input type="checkbox" checked={keep} onChange={e=>setKeep(e.target.checked)}/>Giữ structural anchor của ký tự đã xóa</label>
   <p role="status">{anchorSteps[anchorStage]}</p>
   <div className="collab-replicas collab-two">{[['A',anchor.a],['B',anchor.b]].map(([name,state])=>{
    const view=renderTree(state as typeof anchor.a);return <section key={String(name)}><h4>Replica {String(name)}</h4><div className="collab-text">{view.text||'∅'}</div><ol className="collab-atoms">{view.rows.map(n=><li key={n.id} data-deleted={n.deleted}><strong>{n.value}</strong><span>{n.id}</span><small>← {n.origin??'ROOT'}</small><span>{n.deleted?'DELETED':'VISIBLE'}</span></li>)}</ol>{view.pending>0&&<p className="collab-pending">Pending origins: {view.pending} · B:5 → S:2</p>}</section>;
   })}</div>
   <dl className="worksheet-results" aria-live="polite"><div><dt>Anchor S:2 ở A</dt><dd>{anchor.anchorRetained?'RETAINED':'REMOVED'}</dd></div><div><dt>Updates chưa gắn vào tree A</dt><dd>{anchor.viewA.pending}</dd></div><div><dt>Text A / B</dt><dd>{anchor.viewA.text} / {anchor.viewB.text}</dd></div></dl>
   <p>Tắt giữ anchor: compactor thử nghiệm bỏ node S:2 và reparent các node đã biết để A vẫn hiện CDE. Khi incremental insert B:5 tới, origin S:2 không còn nên update bị pending; B ra CXDE còn A vẫn CDE. Không được sửa bằng cách chèn X tại một offset đoán mò. Đây là destructive compaction ngoài merge rules, không phải CRDT tự nhiên mất convergence.</p>
   <p>Safe GC cần library/protocol giữ cấu trúc hoặc redirects đủ dùng, chứng minh causal stability, hoặc đóng history epoch cũ và buộc resync có bảo toàn local work. Không phải mọi CRDT đều giữ nguyên mọi tombstone mãi mãi; xóa payload, xóa structural identity và xóa audit history là các quyết định khác nhau.</p>
  </>}
  {kind==='collab-durable'&&<>
   <h3 id={id}>Local text, durable text và ACK là ba trạng thái</h3>
   <p>Stable update ID là deviceA/7, payload chèn ! vào CODE. Timeline có một owner crash và một duplicate/retry sau phục hồi; log và dedup được restore cùng nhau. Epoch đổi từ 4 sang 5 khi authority chuyển owner. Mô hình không chạy real storage hoặc distributed lease protocol.</p>
   <div className="worksheet-inputs"><label>Bước commit và recovery<output>{commitStage} / 5</output><input type="range" min="0" max="5" value={commitStage} onChange={e=>setCommitStage(+e.target.value)}/></label></div>
   <label className="worksheet-toggle"><input type="checkbox" checked={durable} onChange={e=>setDurable(e.target.checked)}/>Persist update và dedup result trước ACK</label>
   <label className="worksheet-toggle"><input type="checkbox" checked={lost} onChange={e=>setLost(e.target.checked)}/>Response không tới được client</label>
   <label className="worksheet-toggle"><input type="checkbox" checked={fence} onChange={e=>setFence(e.target.checked)}/>Storage reject old owner epoch</label>
   <ol className="collab-timeline">{commitSteps.map((text,i)=><li key={text} aria-current={i===commitStage?'step':undefined}><strong>#{i}</strong> {text}</li>)}</ol>
   <dl className="worksheet-results" aria-live="polite"><div><dt>Owner applied text</dt><dd>{commit.applied}</dd></div><div><dt>Durable text / revision</dt><dd>{commit.committed} / {commit.revision}</dd></div><div><dt>Client pending</dt><dd>{commit.pending?'YES':'NO'}</dd></div><div><dt>Owner epoch / result</dt><dd>{commit.ownerEpoch} / {commit.result}</dd></div><div><dt>Đã mất update từng ACK tại crash</dt><dd>{commit.acknowledgedLoss?'YES':'NO'}</dd></div></dl>
   <p>Tắt persist-before-ACK và giữ response tới client: ở crash bước 3, client đã bỏ pending nhưng durable text quay lại CODE. Bật persist rồi làm mất response: client vẫn pending, retry bước 4 trả retained result ở revision 1, không chèn ! hai lần. Bước 5 tắt fencing sẽ cho old owner ghi thêm ? trái authority; lease name hoặc local boolean không tự chặn write đó.</p>
   <p>Owner fencing và per-op authorization bảo vệ các lỗi khác nhau. Revocation phải được enforce ở commit path theo policy; retry hợp lệ về identity vẫn có thể không còn được phép. Không thể thu hồi những bytes client đã đọc trước đó chỉ bằng cách đóng socket.</p>
  </>}
 </section>;
}
