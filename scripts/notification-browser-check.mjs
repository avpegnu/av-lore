import {chromium} from '@playwright/test';import AxeBuilder from '@axe-core/playwright';import fs from 'node:fs';import assert from 'node:assert/strict';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4322/av-lore',report=[],errors=[];fs.mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const context=await browser.newContext({viewport:{width:1500,height:1000},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
 for(const locale of ['vi','en']){
  await page.goto(base+(locale==='en'?'/en':'')+'/handbook/system-design/notifications/');if(locale==='en')await page.waitForFunction(()=>document.documentElement.dataset.languageReady==='true');
  const labs=page.locator('.handbook-experiment');assert.equal(await labs.count(),2);for(const lab of await labs.all()){await lab.scrollIntoViewIfNeeded();await lab.locator('xpath=ancestor::astro-island[1]').evaluate(async el=>{if(el.dataset.uiReady==='true')return;await new Promise(r=>el.addEventListener('av-lore:island-ready',r,{once:true}));});}
  const crash=labs.first(),modes=crash.locator('button'),boundary=crash.locator('input[type=range]');
  assert.equal(await crash.locator('dd').nth(1).textContent(),'2');assert.equal(await crash.locator('dd').nth(2).textContent(),'1');await modes.last().click();assert.equal(await crash.locator('dd').nth(1).textContent(),'1');assert.equal(await crash.locator('dd').first().textContent(),'2');
  await modes.nth(1).click();await boundary.focus();await page.keyboard.press('Home');assert.equal(await crash.locator('dd').last().textContent(),'1');await modes.first().click();assert.equal(await crash.locator('dd').last().textContent(),'0');await boundary.focus();await page.keyboard.press('End');assert.equal(await crash.locator('dd').first().textContent(),'1');
  const pipeline=labs.last(),metric=pipeline.locator('dd'),ranges=pipeline.locator('input[type=range]');assert.deepEqual(await metric.allTextContents(),['2','6','8','8','4','0']);
  await ranges.nth(1).focus();await page.keyboard.press('End');assert.equal(await metric.nth(4).textContent(),'0');assert.equal(await metric.last().textContent(),'4');await ranges.last().focus();await page.keyboard.press('End');assert.equal(await metric.nth(4).textContent(),'4');assert.equal(await metric.nth(3).textContent(),'16');
  await pipeline.locator('input[type=checkbox]').uncheck();assert.equal(await metric.nth(2).textContent(),'0');assert.equal(await metric.nth(4).textContent(),'12');await pipeline.locator('button').nth(1).click();assert.equal(await metric.nth(1).textContent(),'0');assert.equal(await metric.nth(4).textContent(),'18');
  if(locale==='en')await page.waitForFunction(()=>![...document.querySelectorAll('.handbook-experiment')].some(el=>/[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(el.innerText)));
  for(const width of [1500,390]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);for(let i=0;i<2;i++){await labs.nth(i).scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/notifications-${locale}-${i}-${width}.png`});}}
  report.push({locale,scenarios:'passed'});await page.setViewportSize({width:1500,height:1000});
 }
 for(const theme of JSON.parse(fs.readFileSync('src/lib/themes.json'))){await page.evaluate(id=>document.documentElement.dataset.theme=id,theme.id);const result=await new AxeBuilder({page}).include('.rich-handbook').withTags(['wcag2a','wcag2aa']).analyze();report.push({theme:theme.id,violations:result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))});}
}finally{await browser.close();fs.writeFileSync('artifacts/notification-browser-report.json',JSON.stringify({report,errors},null,2));}
assert.deepEqual(errors,[]);assert.ok(report.every(r=>!r.violations?.length),JSON.stringify(report.filter(r=>r.violations?.length)));console.log('Notifications: crash ambiguity, conditional provider dedup, admission caps, retries, DLQ, both locales, mobile and nine theme accessibility passed.');
