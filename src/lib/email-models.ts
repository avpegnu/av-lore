// Offline educational models. No SMTP/DNS/cryptographic requests are performed.
export type ReceiptDedup='receipt'|'header'|'none';
export function smtpReceiptScenario(stage:number,durable:boolean,lostReply:boolean,dedup:ReceiptDedup){
 if(!Number.isInteger(stage)||stage<0||stage>6)throw new RangeError('Invalid SMTP timeline');
 const rows:{receipt:string;header:string;body:string}[]=[],seen=new Set<string>();
 const deliver=(receipt:string,body:string)=>{
  const header='<shared@example.test>',key=dedup==='receipt'?receipt:dedup==='header'?header:null;
  if(key&&seen.has(key))return;if(key)seen.add(key);rows.push({receipt,header,body});
 };
 if(stage>=5&&durable){deliver('R1','BODY-A');deliver('R1','BODY-A');}
 // A second independently accepted message deliberately has a reused header ID.
 if(stage>=6)deliver('R2','BODY-B');
 const distinct=new Set(rows.map(r=>r.receipt)).size;
 return {rows,finalSent:stage>=3,senderKnowledge:stage<3?'NOT_ACCEPTED':lostReply?'UNKNOWN':'ACCEPTED',
  durableReceipts:(stage>=2&&durable?1:0)+(stage>=6?1:0),
  acceptedLost:stage>=4&&!durable,
  duplicateRows:rows.length-distinct,
  missingDistinct:stage>=5?(stage>=6?2:1)-distinct:0,
  response:stage===0?'250 RCPT':stage<3?'DATA IN PROGRESS':lostReply?'FINAL 250 LOST':'FINAL 250 RECEIVED'};
}
export type DomainChoice='same'|'subdomain'|'other';
const domains={same:'example.com',subdomain:'mail.example.com',other:'example.net'};
export function emailAuth(spfPass:boolean,spfDomain:DomainChoice,dkimPass:boolean,dkimDomain:DomainChoice,strict:boolean,policy:'none'|'quarantine'|'reject'){
 const aligned=(choice:DomainChoice)=>choice==='same'||!strict&&choice==='subdomain';
 const spfAligned=aligned(spfDomain),dkimAligned=aligned(dkimDomain),pass=spfPass&&spfAligned||dkimPass&&dkimAligned;
 return {from:'example.com',spfIdentity:domains[spfDomain],dkimIdentity:domains[dkimDomain],spfAligned,dkimAligned,pass,
  requestedDisposition:pass||policy==='none'?'NO_DMARC_ACTION':policy==='quarantine'?'QUARANTINE_REQUESTED':'REJECT_REQUESTED'};
}
const spamFixture=[
 {id:'L1',spam:false,score:5},{id:'L2',spam:false,score:15},{id:'L3',spam:false,score:30},{id:'L4',spam:false,score:62},{id:'L5',spam:false,score:94},
 {id:'S1',spam:true,score:20},{id:'S2',spam:true,score:52},{id:'S3',spam:true,score:68},{id:'S4',spam:true,score:82},{id:'S5',spam:true,score:96}];
export function spamThreshold(threshold:number,beforeAcceptance:boolean){
 if(!Number.isInteger(threshold)||threshold<0||threshold>100)throw new RangeError('Invalid synthetic threshold');
 const rejectAt=Math.min(100,threshold+20);
 const rows=spamFixture.map(m=>({...m,action:m.score>=rejectAt&&beforeAcceptance?'SMTP_REJECT':m.score>=threshold?'SPAM_FOLDER':'INBOX'}));
 return {rows,rejectAt,falsePositives:rows.filter(m=>!m.spam&&m.action!=='INBOX').length,
  falseNegatives:rows.filter(m=>m.spam&&m.action==='INBOX').length,
  rejected:rows.filter(m=>m.action==='SMTP_REJECT').length};
}
export type MailMessage={id:string;read:boolean;labels:string[]};
export type MailChange={rev:number;id:string;kind:'deliver'|'read'|'label'|'delete'|'archive'};
export const mailboxChanges:MailChange[]=[
 {rev:1,id:'m1',kind:'deliver'},{rev:2,id:'m1',kind:'read'},{rev:3,id:'m1',kind:'label'},
 {rev:4,id:'m2',kind:'deliver'},{rev:5,id:'m1',kind:'delete'},{rev:6,id:'m2',kind:'archive'}];
function applyMail(input:MailMessage[],change:MailChange){
 const messages=structuredClone(input),m=messages.find(m=>m.id===change.id);
 if(change.kind==='deliver'&&!m)messages.push({id:change.id,read:false,labels:['inbox']});
 if(change.kind==='read'&&m)m.read=true;
 if(change.kind==='label'&&m&&!m.labels.includes('receipts'))m.labels.push('receipts');
 if(change.kind==='archive'&&m)m.labels=['archive'];
 return change.kind==='delete'?messages.filter(m=>m.id!==change.id):messages;
}
export const mailboxServer=mailboxChanges.reduce(applyMail,[]);
export type MailClient={cursor:number;messages:MailMessage[];status:string;lastPage:number[]};
export function initialMailClient():MailClient{return {cursor:1,messages:applyMail([],mailboxChanges[0]),status:'SNAPSHOT_AT_1',lastPage:[]};}
export function mailClientAction(input:MailClient,action:'push'|'sync'|'snapshot',floor:number,trustPush:boolean):MailClient{
 if(!Number.isInteger(floor)||floor<0||floor>5)throw new RangeError('Invalid retained base floor');
 const s=structuredClone(input);
 if(action==='push'){
  if(trustPush)s.cursor=Math.max(s.cursor,4);
  s.status=trustPush?'CURSOR_ADVANCED_WITHOUT_DATA':'HINT_ONLY';s.lastPage=[];return s;
 }
 if(action==='snapshot')return {cursor:6,messages:structuredClone(mailboxServer),status:'SNAPSHOT_AT_6',lastPage:[]};
 if(s.cursor<floor){s.status='RESYNC_REQUIRED';s.lastPage=[];return s;}
 const page=mailboxChanges.filter(c=>c.rev>s.cursor).slice(0,2);
 for(const change of page)s.messages=applyMail(s.messages,change);
 s.lastPage=page.map(c=>c.rev);if(page.length)s.cursor=page[page.length-1].rev;
 s.status=page.length?'DELTA_APPLIED':'CURRENT_CURSOR';return s;
}
export function mailMatchesServer(client:MailClient){return JSON.stringify(client.messages)===JSON.stringify(mailboxServer);}
