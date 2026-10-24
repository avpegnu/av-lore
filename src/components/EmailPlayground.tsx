import {useId,useState} from 'react';
import {useIslandReady} from '../lib/use-island-ready';
import {smtpReceiptScenario,emailAuth,spamThreshold,initialMailClient,mailClientAction,mailMatchesServer,mailboxChanges,mailboxServer,type DomainChoice,type ReceiptDedup} from '../lib/email-models';
const receiptSteps=['RCPT được chấp nhận; chưa nhận trách nhiệm toàn thư','Đã đọc xong DATA vào RAM','Chuẩn bị durable queue, body và envelope','Gửi final 250 sau DATA','SMTP edge crash; volatile state mất','Mailbox worker retry cùng receipt R1 hai lần','Thư độc lập R2 có cùng header Message-ID'];
export default function EmailPlayground({kind}:{kind:'email-receipt'|'email-auth'|'email-spam'|'email-sync'}){
 const ref=useIslandReady(),id='email-'+useId().replace(/:/g,'');
 const [stage,setStage]=useState(5),[durable,setDurable]=useState(true),[lost,setLost]=useState(false),[dedup,setDedup]=useState<ReceiptDedup>('receipt'),
 [spf,setSpf]=useState(true),[dkim,setDkim]=useState(true),[spfDomain,setSpfDomain]=useState<DomainChoice>('other'),[dkimDomain,setDkimDomain]=useState<DomainChoice>('subdomain'),[strict,setStrict]=useState(false),[policy,setPolicy]=useState<'none'|'quarantine'|'reject'>('quarantine'),
 [threshold,setThreshold]=useState(70),[preaccept,setPreaccept]=useState(true),[client,setClient]=useState(initialMailClient),[floor,setFloor]=useState(0),[trustPush,setTrustPush]=useState(false);
 const receipt=smtpReceiptScenario(stage,durable,lost,dedup),auth=emailAuth(spf,spfDomain,dkim,dkimDomain,strict,policy),spam=spamThreshold(threshold,preaccept);
 const domainChoices=(prefix:string,value:DomainChoice,change:(v:DomainChoice)=>void)=><div className="email-actions" role="group" aria-label={prefix}>{(['same','subdomain','other'] as const).map((v,i)=><button type="button" key={v} data-domain={prefix+'-'+v} aria-pressed={value===v} onClick={()=>change(v)}>{['example.com','mail.example.com','example.net'][i]}</button>)}</div>;
 return <section className="handbook-experiment email-playground" ref={ref} aria-labelledby={id}>
  <span className="eyebrow">EMAIL / ACCEPTANCE, TRUST AND MAILBOX STATE</span>
  {kind==='email-receipt'&&<>
   <h3 id={id}>Final 250 chuyển trách nhiệm, không phải mọi 250</h3>
   <p>Timeline dùng một recipient và hai thư kiểm soát được. R1 có BODY-A; R2 là thư độc lập BODY-B nhưng cố ý reuse header Message-ID. R1 worker retry cùng internal receipt hai lần. Lab không gửi SMTP thật và không chứng minh exactly-once qua Internet; lost final reply vẫn có thể khiến sender retransmit.</p>
   <div className="worksheet-inputs"><label>Bước nhận thư<output>{stage} / 6</output><input type="range" min="0" max="6" value={stage} onChange={e=>setStage(+e.target.value)}/></label></div>
   <label className="worksheet-toggle"><input type="checkbox" checked={durable} onChange={e=>setDurable(e.target.checked)}/>Giữ body và envelope đủ bền trước final ACK</label>
   <label className="worksheet-toggle"><input type="checkbox" checked={lost} onChange={e=>setLost(e.target.checked)}/>Final reply không tới sender</label>
   <div className="email-actions">{(['receipt','header','none'] as const).map((mode,i)=><button type="button" key={mode} data-dedup={mode} aria-pressed={dedup===mode} onClick={()=>setDedup(mode)}>{['Dedup bằng internal receipt','Dedup bằng header Message-ID','Không dedup'][i]}</button>)}</div>
   <ol className="email-timeline">{receiptSteps.map((s,i)=><li key={s} aria-current={stage===i?'step':undefined}><strong>#{i}</strong> {s}</li>)}</ol>
   <dl className="worksheet-results" aria-live="polite"><div><dt>Sender knowledge</dt><dd>{receipt.senderKnowledge}</dd></div><div><dt>SMTP reply boundary</dt><dd>{receipt.response}</dd></div><div><dt>Accepted content mất ở crash</dt><dd>{receipt.acceptedLost?'YES':'NO'}</dd></div><div><dt>Mailbox rows / internal duplicates</dt><dd>{receipt.rows.length} / {receipt.duplicateRows}</dd></div><div><dt>Accepted instances bị thiếu sau delivery</dt><dd>{receipt.missingDistinct}</dd></div></dl>
   <div className="email-rows">{receipt.rows.map((r,i)=><section key={i}><h4>{r.receipt} · {r.body}</h4><code>{r.header}</code></section>)}</div>
   <p>Ở bước 6, receipt dedup giữ đúng hai thư; header dedup làm mất R2; không dedup tạo hai bản R1. Tắt durability rồi crash cho thấy ACK sớm làm mất accepted content. R2 ở bước 6 được giả định đã hoàn tất một transaction bền riêng; không dùng nó để “sửa” việc R1 đã mất.</p>
   <p>Body/blob và recipient envelope đều phải recover được theo failure contract. Một URL tạm hết hạn hoặc queue row chỉ giữ metadata chưa đủ. Internal receipt bảo vệ downstream retry; không biến untrusted Message-ID thành global business identity.</p>
  </>}
  {kind==='email-auth'&&<>
   <h3 id={id}>PASS chưa đủ nếu domain không align</h3>
   <p>Visible From là example.com. SPF identity đại diện MAIL FROM domain đã xác định; DKIM identity là một signing domain. Các checkbox chỉ cung cấp kết quả giả định, không chạy DNS hoặc kiểm signature. Fixture coi example.com và mail.example.com cùng organizational domain; lab không triển khai DNS/policy discovery cho Organizational Domain. Off trong lab là definitive non-pass; DNS temporary errors và nhiều DKIM signatures không được mô phỏng.</p>
   <label className="worksheet-toggle"><input type="checkbox" checked={spf} onChange={e=>setSpf(e.target.checked)}/>SPF result là PASS</label>
   {domainChoices('SPF',spfDomain,setSpfDomain)}
   <label className="worksheet-toggle"><input type="checkbox" checked={dkim} onChange={e=>setDkim(e.target.checked)}/>DKIM result là PASS</label>
   {domainChoices('DKIM',dkimDomain,setDkimDomain)}
   <label className="worksheet-toggle"><input type="checkbox" checked={strict} onChange={e=>setStrict(e.target.checked)}/>Strict alignment cho cả hai mechanisms</label>
   <div className="email-actions" role="group" aria-label="Published DMARC policy">{(['none','quarantine','reject'] as const).map(p=><button type="button" key={p} data-policy={p} aria-pressed={policy===p} onClick={()=>setPolicy(p)}>p={p}</button>)}</div>
   <p>SPF result: {spf?'PASS':'NOT_PASS'} · DKIM result: {dkim?'PASS':'NOT_PASS'}</p>
   <div className="email-auth-identities">{[['From',auth.from],['SPF',auth.spfIdentity],['DKIM',auth.dkimIdentity]].map(([label,value])=><section key={label}><h4>{label}</h4><code>{value}</code></section>)}</div>
   <dl className="worksheet-results" aria-live="polite"><div><dt>SPF domain aligned</dt><dd>{auth.spfAligned?'YES':'NO'}</dd></div><div><dt>DKIM domain aligned</dt><dd>{auth.dkimAligned?'YES':'NO'}</dd></div><div><dt>DMARC authentication</dt><dd>{auth.pass?'PASS':'FAIL'}</dd></div><div><dt>Requested policy action</dt><dd>{auth.requestedDisposition}</dd></div></dl>
   <p>DMARC pass = (SPF pass và align) hoặc (DKIM pass và align). Không cần cả hai cùng pass; hai raw PASS nhưng đều domain khác vẫn không đủ. Strict mode không coi subdomain là exact match. Policy action là yêu cầu của domain owner; receiver disposition còn local policy. DMARC pass không bảo đảm inbox, không chứng minh người gửi là ai và không bảo đảm thư không chứa spam.</p>
  </>}
  {kind==='email-spam'&&<>
   <h3 id={id}>Giảm spam lọt inbox có thể làm mất thư tốt</h3>
   <p>Mười thư giả lập có ground truth đã biết: L1–L5 là legitimate, S1–S5 là spam. Score chỉ là điểm thứ tự minh họa 0–100, không phải xác suất calibrated hoặc evaluation dataset thật. Spam threshold đưa thư vào Spam; reject threshold cao hơn 20 điểm, tối đa 100. SMTP reject chỉ được dùng trong mô hình trước final acceptance.</p>
   <div className="worksheet-inputs"><label>Spam threshold<output>{threshold}</output><input type="range" min="0" max="100" value={threshold} onChange={e=>setThreshold(+e.target.value)}/></label></div>
   <label className="worksheet-toggle"><input type="checkbox" checked={preaccept} onChange={e=>setPreaccept(e.target.checked)}/>Đang quyết định trước final SMTP acceptance</label>
   <dl className="worksheet-results" aria-live="polite"><div><dt>Legitimate bị chặn / 5</dt><dd>{spam.falsePositives}</dd></div><div><dt>Spam lọt inbox / 5</dt><dd>{spam.falseNegatives}</dd></div><div><dt>SMTP rejects</dt><dd>{spam.rejected}</dd></div><div><dt>Reject threshold</dt><dd>{spam.rejectAt}</dd></div></dl>
   <figure className="handbook-table"><div tabIndex={0} role="region" aria-label="Synthetic spam decisions"><table><thead><tr><th>Message</th><th>Ground truth giả định</th><th>Score</th><th>Action</th></tr></thead><tbody>{spam.rows.map(m=><tr key={m.id}><td>{m.id}</td><td>{m.spam?'SPAM':'LEGITIMATE'}</td><td>{m.score}</td><td>{m.action}</td></tr>)}</tbody></table></div><figcaption>Tắt preaccept: high-score thư đã nhận chỉ vào Spam theo policy này; không gửi một SMTP reject ngược thời gian.</figcaption></figure>
   <p>Đừng suy production accuracy từ mười samples. Thực tế cần labeled evaluation, appeals/review, đo false positives theo loại thư và theo sender/domain, cùng spam misses và quarantine recovery. Authenticated spam vẫn cần lọc; classifier failure/timeout cũng cần rõ accept/quarantine/defer policy.</p>
  </>}
  {kind==='email-sync'&&<>
   <h3 id={id}>Push chỉ báo có thay đổi, không phải đã apply thay đổi</h3>
   <p>Client bắt đầu từ snapshot revision 1. Server đã có revisions 1–6, mỗi delta page tối đa hai changes; đây là custom history protocol, không phải IMAP UIDs. Push chỉ báo một thay đổi tới revision 4. Chỉ sau khi apply delta hoặc load coherent replacement snapshot mới được cập nhật applied cursor.</p>
   <div className="worksheet-inputs"><label>Retained base cursor floor<output>{floor}</output><input type="range" min="0" max="5" value={floor} onChange={e=>setFloor(+e.target.value)}/></label></div>
   <label className="worksheet-toggle"><input type="checkbox" checked={trustPush} onChange={e=>setTrustPush(e.target.checked)}/>Lỗi thử nghiệm: advance cursor ngay khi nhận push</label>
   <div className="email-actions">{(['push','sync','snapshot'] as const).map((a,i)=><button type="button" data-action={a} key={a} onClick={()=>setClient(s=>mailClientAction(s,a,floor,trustPush))}>{['Nhận push hint revision 4','Fetch/apply một delta page','Load snapshot thay thế tại revision 6'][i]}</button>)}<button type="button" data-action="reset" onClick={()=>setClient(initialMailClient())}>Reset client</button></div>
   <div className="email-mailboxes">{[['Client',client.messages],['Server',mailboxServer]].map(([name,messages])=><section key={String(name)}><h4>{String(name)}</h4>{(messages as typeof client.messages).map(m=><article key={m.id}><strong>{m.id}</strong><p>{m.read?'READ':'UNREAD'} · {m.labels.join(', ')}</p></article>)}{!(messages as typeof client.messages).length&&<p>EMPTY MAILBOX VIEW</p>}</section>)}</div>
   <dl className="worksheet-results" aria-live="polite"><div><dt>Applied cursor</dt><dd>{client.cursor}</dd></div><div><dt>Last page revisions</dt><dd>{client.lastPage.join(', ')||'—'}</dd></div><div><dt>Recovery state</dt><dd>{client.status}</dd></div><div><dt>Client state bằng server</dt><dd>{mailMatchesServer(client)?'MATCH':'DIFFERENT'}</dd></div></dl>
   <details><summary>Xem history trong fixture</summary><ol>{mailboxChanges.map(c=><li key={c.rev}>#{c.rev} · {c.id} · {c.kind.toUpperCase()}</li>)}</ol></details>
   <p>Ở floor 0: push rồi fetch ba pages sẽ ra m2 archived và xóa m1. Bật lỗi advance-on-push: revisions 2–4 bị bỏ qua; cursor có thể lên 6 mà client vẫn sai vì chưa từng nhận m2. Ở floor 2, client revision 1 cần RESYNC_REQUIRED; load snapshot phải replace state, không union để giữ lại m1 đã xóa.</p>
  </>}
 </section>;
}
