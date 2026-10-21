import {chromium} from '@playwright/test';import AxeBuilder from '@axe-core/playwright';import assert from 'node:assert/strict';import fs from 'node:fs';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4322/av-lore';const report=[],errors=[];fs.mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const context=await browser.newContext({viewport:{width:1600,height:1100},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push({page:page.url(),message:String(e)}));
 const themes=JSON.parse(fs.readFileSync('src/lib/themes.json','utf8'));
 async function ready(lab){await lab.scrollIntoViewIfNeeded();await lab.locator('xpath=ancestor::astro-island[1]').evaluate(async el=>{if(el.dataset.uiReady==='true')return;await new Promise(r=>el.addEventListener('av-lore:island-ready',r,{once:true}));});}
 async function boundary(range,key){await range.focus();await page.keyboard.press(key);}
 async function visit(id,locale){await page.goto(base+(locale==='en'?'/en':'')+'/system-design/'+id+'/');if(locale==='en')await page.waitForFunction(()=>document.documentElement.dataset.languageReady==='true');for(const lab of await page.locator('.handbook-experiment').all())await ready(lab);return page.locator('.handbook-experiment');}
 for(const locale of ['vi','en'])for(const id of ['messaging','rate-limiting','unique-ids','reliability']){
  const labs=await visit(id,locale);
  if(id==='messaging'){
   const groups=labs.nth(0);await boundary(groups.locator('input').first(),'Home');await boundary(groups.locator('input').nth(1),'End');assert.equal(await groups.locator('dd').nth(1).textContent(),'9');assert.equal(await groups.locator('.partition-chip').count(),1);
   const gaps=labs.nth(1),offsets=gaps.locator('button');await offsets.last().click();assert.equal(await gaps.locator('dd').first().textContent(),'0');await offsets.first().click();assert.equal(await gaps.locator('dd').first().textContent(),'3');for(const i of [3,4,5,6])await offsets.nth(i).click();assert.equal(await gaps.locator('dd').first().textContent(),'8');
   const delivery=labs.nth(2),modes=delivery.locator('button'),crash=delivery.locator('input');await modes.first().click();await boundary(crash,'Home');assert.equal(await delivery.locator('dd').nth(1).textContent(),'0');await boundary(crash,'End');await modes.nth(1).click();assert.equal(await delivery.locator('dd').nth(1).textContent(),'2');await modes.nth(2).click();assert.equal(await delivery.locator('dd').nth(1).textContent(),'1');
  }else if(id==='rate-limiting'){
   const algorithms=labs.nth(0).locator('.rate-algorithm');assert.equal(await algorithms.count(),5);assert.equal(await algorithms.nth(2).locator('header > span').textContent(),'12 / 12');assert.equal(await algorithms.nth(3).locator('header > span').textContent(),'6 / 12');
   const race=labs.nth(1);await race.locator('button').last().click();await boundary(race.locator('input'),'End');assert.equal(await race.locator('dd').first().textContent(),'1');await race.locator('button').first().click();assert.equal(await race.locator('dd').first().textContent(),'8');assert.equal(await race.locator('dd').last().textContent(),'5');
  }else if(id==='unique-ids'){
   const bits=labs.nth(0),ranges=bits.locator('input');for(const range of await ranges.all())await boundary(range,'End');assert.ok(BigInt(await bits.locator(':scope > code').textContent())>BigInt(Number.MAX_SAFE_INTEGER));for(const range of await ranges.all())await boundary(range,'Home');
   const locality=labs.nth(1);await boundary(locality.locator('input'),'End');const before=await locality.locator('.leaf-pages').textContent();await locality.locator('button').last().click();assert.notEqual(await locality.locator('.leaf-pages').textContent(),before);
  }else{
   const availability=labs.nth(1);await availability.locator('input[type=checkbox]').check();assert.ok(Number(await availability.locator('dd').last().textContent())<=99);
   const retry=labs.nth(2);await retry.locator('input[type=checkbox]').check();assert.equal(await retry.locator('dd').last().textContent(),'48');await retry.locator('.worksheet-choices button').first().click();assert.equal(await retry.locator('dd').last().textContent(),'0');for(const range of await retry.locator('input[type=range]').all())await boundary(range,'End');assert.equal(await retry.locator('dd').first().textContent(),'1024');
   const breaker=labs.nth(3),buttons=breaker.locator('button');assert.equal(await breaker.locator('.breaker-state strong').textContent(),'open');await buttons.nth(0).click();assert.equal(await breaker.locator('dd').last().textContent(),'1');await buttons.nth(2).click();await buttons.nth(3).click();assert.equal(await breaker.locator('.breaker-state strong').textContent(),'half-open');await buttons.nth(1).click();assert.equal(await breaker.locator('.breaker-state strong').textContent(),'open');await buttons.nth(2).click();await buttons.nth(3).click();await buttons.nth(0).click();assert.equal(await breaker.locator('.breaker-state strong').textContent(),'closed');await buttons.last().click();assert.equal(await breaker.locator('dd').first().textContent(),'0');
  }
  if(locale==='en')await page.waitForFunction(()=>![...document.querySelectorAll('.handbook-experiment')].some(el=>/[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(el.innerText)));
  await labs.first().screenshot({path:`artifacts/blocks-${locale}-${id}-desktop.png`});
  await page.setViewportSize({width:390,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,locale+'/'+id);await labs.first().screenshot({path:`artifacts/blocks-${locale}-${id}-mobile.png`});await page.setViewportSize({width:1600,height:1100});report.push({locale,id,scenario:'passed'});
 }
 for(const id of ['messaging','rate-limiting','unique-ids','reliability']){
  await visit(id,'en');
  for(const theme of themes){await page.evaluate(id=>document.documentElement.dataset.theme=id,theme.id);const result=await new AxeBuilder({page}).include('.rich-handbook').withTags(['wcag2a','wcag2aa']).analyze();report.push({id,theme:theme.id,violations:result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))});}
 }
}finally{await browser.close();fs.writeFileSync('artifacts/building-blocks-browser-report.json',JSON.stringify({report,errors},null,2));}
assert.deepEqual(errors,[]);assert.ok(report.every(r=>!r.violations?.length),JSON.stringify(report.filter(r=>r.violations?.length)));console.log('Four Building Blocks: semantic scenarios, extreme controls, both locales, mobile and 36 theme accessibility scans passed.');
