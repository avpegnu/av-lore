import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4322/av-lore';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const errors=[],report=[];
fs.mkdirSync('artifacts',{recursive:true});
try {
 const context=await browser.newContext({viewport:{width:1600,height:1150},reducedMotion:'reduce'});
 for(const locale of ['vi','en']){
  const page=await context.newPage();page.on('pageerror',e=>errors.push({locale,message:String(e)}));
  await page.goto(base+(locale==='en'?'/en':'')+'/system-design/framework/');
  if(locale==='en')await page.waitForFunction(()=>document.documentElement.dataset.languageReady==='true');
  assert.equal(await page.locator('.lesson-overview li').count(),4);
  assert.ok(await page.locator('.learning-cards').count()>=5);
  await page.screenshot({path:`artifacts/framework-${locale}-overview-desktop.png`});
  const planner=page.locator('.interview-planner');await planner.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('.interview-planner')?.closest('astro-island')?.dataset.uiReady==='true');
  const tabs=planner.getByRole('tab'),checklist=planner.getByRole('tabpanel'),boxes=checklist.getByRole('checkbox');
  await boxes.first().check();await tabs.nth(1).click();assert.equal(await boxes.first().isChecked(),false);
  await boxes.last().check();await tabs.first().click();assert.equal(await boxes.first().isChecked(),true);
  await tabs.first().focus();await page.keyboard.press('End');assert.equal(await tabs.last().getAttribute('aria-selected'),'true');
  await page.keyboard.press('Home');assert.equal(await tabs.first().getAttribute('aria-selected'),'true');
  const sliders=planner.locator('input[type=range]');await sliders.first().focus();await page.keyboard.press('End');
  const start=planner.locator('.planner-clock-row button');assert.equal(await start.isDisabled(),true);
  assert.equal(await planner.locator('.planner-budget').getAttribute('data-over'),'true');
  await planner.locator('.planner-reset').click();assert.equal(await start.isEnabled(),true);
  assert.equal(await sliders.first().inputValue(),'7');assert.equal(await boxes.first().isChecked(),false);
  await sliders.first().focus();await page.keyboard.press('Home');await planner.locator('select').selectOption('60');
  await page.clock.install();await page.clock.pauseAt(new Date());
  await start.click();assert.equal(await sliders.first().isDisabled(),true);
  await page.clock.runFor(1000);
  await page.waitForFunction(()=>document.querySelector('.planner-clock')?.textContent?.startsWith('01:00'));
  assert.equal(await tabs.nth(1).getAttribute('aria-selected'),'true');
  await start.click();const paused=await planner.locator('.planner-clock').textContent();await page.clock.runFor(2000);
  assert.equal(await planner.locator('.planner-clock').textContent(),paused);
  await planner.locator('.planner-reset').click();assert.ok((await planner.locator('.planner-clock').textContent()).startsWith('00:00'));assert.equal(await planner.locator('select').inputValue(),'30');
  await planner.screenshot({path:`artifacts/framework-${locale}-planner-desktop.png`});
  if(locale==='en'){
   await page.waitForFunction(()=>!/[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(document.querySelector('.interview-planner').innerText));
   for(let i=0;i<4;i++){await tabs.nth(i).click();await page.waitForFunction(()=>!/[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(document.querySelector('.planner-checklist').innerText));}
  }
  await page.setViewportSize({width:390,height:850});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await planner.screenshot({path:`artifacts/framework-${locale}-planner-mobile.png`});
  await page.locator('#requirements').scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/framework-${locale}-requirements-mobile.png`});
  report.push({locale,planner:'passed',overview:'passed',mobile:'passed'});await page.close();
 }
 // Keep accessibility scanning outside the context with a paused mock clock.
 await context.close();
 const auditContext=await browser.newContext({viewport:{width:1600,height:1150},reducedMotion:'reduce'});
 const page=await auditContext.newPage();await page.goto(base+'/en/system-design/framework/');await page.waitForFunction(()=>document.documentElement.dataset.languageReady==='true');
 await page.locator('.interview-planner').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.interview-planner')?.closest('astro-island')?.dataset.uiReady==='true');
 for(const theme of JSON.parse(fs.readFileSync('src/lib/themes.json','utf8'))){
  await page.evaluate(id=>document.documentElement.dataset.theme=id,theme.id);
  const axe=await new AxeBuilder({page}).include('.rich-handbook').withTags(['wcag2a','wcag2aa']).analyze();
  report.push({theme:theme.id,violations:axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))});
 }
}finally{await browser.close();fs.writeFileSync('artifacts/framework-browser-report.json',JSON.stringify({report,errors},null,2));}
assert.deepEqual(errors,[]);assert.ok(report.every(r=>!r.violations?.length),JSON.stringify(report.filter(r=>r.violations?.length)));
console.log('Framework: both locales, phase checklists, keyboard, budget guard, clock/pause/reset, mobile and 9 theme accessibility passed.');
