import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4322/av-lore',report=[],errors=[];
fs.mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const context=await browser.newContext({viewport:{width:1500,height:1100},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
 async function rangeTo(el,n){await el.focus();await page.keyboard.press('Home');for(let i=0;i<n;i++)await page.keyboard.press('ArrowRight');assert.equal(await el.inputValue(),String(n));}
 for(const locale of ['vi','en']){
  await page.goto(base+(locale==='en'?'/en':'')+'/handbook/system-design/collaborative-editor/');if(locale==='en')await page.waitForFunction(()=>document.documentElement.dataset.languageReady==='true');
  const labs=page.locator('.collab-playground');assert.equal(await labs.count(),4);
  for(const lab of await labs.all()){await lab.scrollIntoViewIfNeeded();await lab.locator('xpath=ancestor::astro-island[1]').evaluate(async el=>{if(el.dataset.uiReady==='true')return;await new Promise(r=>el.addEventListener('av-lore:island-ready',r,{once:true}));});}
  const pair=labs.nth(0),buffer=labs.nth(1),anchors=labs.nth(2),commit=labs.nth(3),pairToggles=pair.locator('input[type=checkbox]');
  await rangeTo(pair.locator('input[type=range]'),4);
  for(let i=0;i<4;i++){await pair.locator(`[data-case="${i}"]`).click();assert.deepEqual(await pair.locator('dd').allTextContents(),['CONVERGED','PRESERVED']);await pairToggles.nth(1).uncheck();assert.deepEqual(await pair.locator('dd').allTextContents(),['CONVERGED','PRESERVED']);await pairToggles.nth(1).check();}
  await pair.locator('[data-case="0"]').click();await pairToggles.first().uncheck();assert.deepEqual(await pair.locator('dd').allTextContents(),['DIVERGED','WRONG_TARGET']);
  await pair.locator('[data-case="2"]').click();assert.deepEqual(await pair.locator('dd').allTextContents(),['CONVERGED','WRONG_TARGET']);assert.deepEqual(await pair.locator('.collab-text').allTextContents(),['CE','CE','CE']);await pairToggles.first().check();assert.deepEqual(await pair.locator('.collab-text').allTextContents(),['CDE','CDE','CDE']);
  assert.deepEqual(await anchors.locator('dd').allTextContents(),['RETAINED','0','CXDE / CXDE']);await anchors.locator('input[type=checkbox]').uncheck();assert.deepEqual(await anchors.locator('dd').allTextContents(),['REMOVED','1','CDE / CXDE']);await anchors.locator('input[type=checkbox]').check();assert.equal(await anchors.locator('[data-deleted=true]').count(),2);
  const toggles=commit.locator('input[type=checkbox]');assert.deepEqual(await commit.locator('dd').allTextContents(),['CODE!','CODE! / 1','NO','5 / RESTORED_FROM_COMMITTED_LOG','NO']);
  await toggles.nth(0).uncheck();assert.deepEqual(await commit.locator('dd').allTextContents(),['CODE','CODE / 0','NO','5 / RESTORED_FROM_COMMITTED_LOG','YES']);await toggles.nth(1).check();assert.equal(await commit.locator('dd').nth(2).textContent(),'YES');assert.equal(await commit.locator('dd').last().textContent(),'NO');
  await toggles.nth(0).check();await rangeTo(commit.locator('input[type=range]'),4);assert.equal(await commit.locator('dd').nth(1).textContent(),'CODE! / 1');assert.equal(await commit.locator('dd').nth(3).textContent(),'5 / RETAINED_RESULT');await rangeTo(commit.locator('input[type=range]'),5);assert.equal(await commit.locator('dd').nth(3).textContent(),'5 / REJECT_OLD_EPOCH');await toggles.nth(2).uncheck();assert.equal(await commit.locator('dd').nth(1).textContent(),'CODE!? / 2');await toggles.nth(2).check();
  assert.deepEqual(await buffer.locator('.collab-text').allTextContents(),['ZCXYODE','ZCODE']);
  assert.deepEqual(await buffer.locator('dd').allTextContents(),['1 / 1','A/1','INSERT X @2','INSERT Y @3','0','2 / IN_FLIGHT']);
  await rangeTo(buffer.locator('input[type=range]'),4);assert.equal(await buffer.locator('dd').first().textContent(),'1 / 2');assert.equal(await buffer.locator('dd').last().textContent(),'2 / IN_FLIGHT');
  await rangeTo(buffer.locator('input[type=range]'),5);assert.deepEqual(await buffer.locator('dd').allTextContents(),['2 / 2','A/2','INSERT Y @3','—','2','1 / IN_FLIGHT']);
  await rangeTo(buffer.locator('input[type=range]'),6);assert.deepEqual(await buffer.locator('.collab-text').allTextContents(),['ZCXYODE','ZCXYODE']);assert.equal(await buffer.locator('dd').last().textContent(),'0 / MATCH');
  await buffer.locator('input[type=checkbox]').uncheck();assert.deepEqual(await buffer.locator('.collab-text').allTextContents(),['ZCXYODE','ZCYXODE']);assert.equal(await buffer.locator('dd').last().textContent(),'0 / DIVERGED');
  await buffer.locator('input[type=checkbox]').check();await rangeTo(buffer.locator('input[type=range]'),3);
  if(locale==='en'){
   await page.waitForFunction(()=>![...document.querySelectorAll('.collab-playground')].some(el=>/[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(el.innerText)));
   assert.equal(await pair.locator('th').nth(1).textContent(),'After the concurrent edit');assert.equal(await pair.locator('dt').first().textContent(),'State after catch-up');assert.ok((await commit.locator('.collab-timeline').textContent()).includes('The owner applies the edit in RAM'));
  }
  for(const width of [1500,390]){await page.setViewportSize({width,height:1100});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(await page.locator('.collab-replicas > section,.collab-atoms li,.collab-timeline li,.collab-playground .worksheet-results > div').evaluateAll(els=>els.filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>el.textContent.slice(0,90))),[]);for(let i=0;i<4;i++){await labs.nth(i).evaluate(el=>el.scrollIntoView({block:'start'}));await page.evaluate(()=>window.scrollBy(0,-100));await page.screenshot({path:`artifacts/collab-${locale}-${i}-${width}.png`});}await anchors.locator('.collab-replicas').scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/collab-${locale}-anchors-${width}.png`});}
  report.push({locale,scenarios:'passed'});await page.setViewportSize({width:1500,height:1100});
 for(const theme of JSON.parse(fs.readFileSync('src/lib/themes.json','utf8'))){await page.evaluate(id=>document.documentElement.dataset.theme=id,theme.id);const a=await new AxeBuilder({page}).include('.rich-handbook').withTags(['wcag2a','wcag2aa']).analyze();report.push({locale,theme:theme.id,violations:a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))});}
 }
}finally{await browser.close();fs.writeFileSync('artifacts/collaborative-browser-report.json',JSON.stringify({report,errors},null,2));}
assert.deepEqual(errors,[]);assert.ok(report.every(r=>!r.violations?.length),JSON.stringify(report.filter(r=>r.violations?.length)));console.log('Collaborative editor: compatible-context edits and wrong-target convergence, retained/offline anchors, outstanding/buffer rebasing with delayed ACKs, durable acknowledgements/retry/fencing; VI/EN, keyboard, mobile and 18 theme/locale checks passed.');
