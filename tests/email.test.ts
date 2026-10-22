import test from 'node:test';import assert from 'node:assert/strict';
import {smtpReceiptScenario,emailAuth,spamThreshold,initialMailClient,mailClientAction,mailMatchesServer} from '../src/lib/email-models';
test('final SMTP acceptance survives the stated crash only with durable content/envelope; lost replies leave sender uncertainty',()=>{
 assert.equal(smtpReceiptScenario(0,false,false,'receipt').finalSent,false);
 assert.equal(smtpReceiptScenario(4,true,false,'receipt').acceptedLost,false);
 assert.equal(smtpReceiptScenario(4,false,false,'receipt').acceptedLost,true);
 const unknown=smtpReceiptScenario(5,true,true,'receipt');assert.equal(unknown.senderKnowledge,'UNKNOWN');assert.equal(unknown.durableReceipts,1);assert.equal(unknown.rows.length,1);
});
test('internal receipt retry dedup differs from unsafe Message-ID suppression of independently accepted messages',()=>{
 const receipt=smtpReceiptScenario(6,true,true,'receipt'),header=smtpReceiptScenario(6,true,true,'header'),none=smtpReceiptScenario(6,true,true,'none');
 assert.equal(receipt.rows.length,2);assert.equal(receipt.duplicateRows,0);assert.equal(receipt.missingDistinct,0);
 assert.equal(header.rows.length,1);assert.equal(header.missingDistinct,1);assert.equal(none.rows.length,3);assert.equal(none.duplicateRows,1);
 assert.equal(receipt.rows[0].header,receipt.rows[1].header);assert.notEqual(receipt.rows[0].body,receipt.rows[1].body);
});
test('DMARC requires any passing aligned mechanism; policy is separate from authentication and receiver disposition',()=>{
 for(const spf of [false,true])for(const dkim of [false,true])for(const strict of [false,true])for(const a of ['same','subdomain','other'] as const)for(const b of ['same','subdomain','other'] as const){
  const r=emailAuth(spf,a,dkim,b,strict,'reject'),expected=spf&&(a==='same'||a==='subdomain'&&!strict)||dkim&&(b==='same'||b==='subdomain'&&!strict);assert.equal(r.pass,expected);
 }
 assert.equal(emailAuth(false,'same',true,'subdomain',false,'reject').pass,true);
 assert.equal(emailAuth(false,'same',true,'subdomain',true,'reject').pass,false);
 assert.equal(emailAuth(true,'other',false,'same',false,'reject').requestedDisposition,'REJECT_REQUESTED');
 assert.equal(emailAuth(false,'same',false,'same',false,'none').requestedDisposition,'NO_DMARC_ACTION');
});
test('push hints never establish applied cursors; retained deltas or replacement snapshots restore mailbox state including deletions',()=>{
 let safe=mailClientAction(initialMailClient(),'push',0,false),bad=mailClientAction(initialMailClient(),'push',0,true);
 for(let i=0;i<3;i++){safe=mailClientAction(safe,'sync',0,false);bad=mailClientAction(bad,'sync',0,true);}
 assert.equal(safe.cursor,6);assert.equal(mailMatchesServer(safe),true);assert.equal(bad.cursor,6);assert.equal(mailMatchesServer(bad),false);assert.equal(bad.messages.length,0);
 const expired=mailClientAction(initialMailClient(),'sync',2,false);assert.equal(expired.status,'RESYNC_REQUIRED');assert.equal(expired.cursor,1);assert.equal(expired.messages[0].id,'m1');
 const loaded=mailClientAction(expired,'snapshot',2,false);assert.equal(mailMatchesServer(loaded),true);assert.equal(loaded.messages.length,1);assert.equal(loaded.messages[0].id,'m2');assert.deepEqual(loaded.messages[0].labels,['archive']);
});
test('synthetic spam thresholds expose false positives and missed spam, while postaccept filtering never sends retroactive SMTP rejection',()=>{
 const aggressive=spamThreshold(60,true),conservative=spamThreshold(90,true),after=spamThreshold(60,false);
 assert.ok(aggressive.falsePositives>conservative.falsePositives);
 assert.ok(aggressive.falseNegatives<conservative.falseNegatives);
 assert.ok(aggressive.rejected>0);assert.equal(after.rejected,0);
 assert.equal(after.falsePositives,aggressive.falsePositives);
 assert.ok(after.rows.every(m=>m.action==='INBOX'||m.action==='SPAM_FOLDER'));
});
