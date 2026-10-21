import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';import assert from 'node:assert/strict';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4322/av-lore',errors=[],report=[];
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
fs.mkdirSync('artifacts',{recursive:true});
try{
 const context=await browser.newContext({viewport:{width:1500,height:1000},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
 for(const locale of ['vi','en']){
  await page.goto(base+(locale==='en'?'/en':'')+'/handbook/system-design/url-shortener/');if(locale==='en')await page.waitForFunction(()=>document.documentElement.dataset.languageReady==='true');
  const labs=page.locator('.handbook-experiment');
  for(const lab of await labs.all()){await lab.scrollIntoViewIfNeeded();await lab.locator('xpath=ancestor::astro-island[1]').evaluate(async el=>{if(el.dataset.uiReady==='true')return;await new Promise(r=>el.addEventListener('av-lore:island-ready',r,{once:true}));});}
  const space=labs.first(),ranges=space.locator('input[type=range]');assert.equal(await space.locator('dd').first().textContent(),'3,521,614,606,208');
  await space.locator('input[type=text]').fill('9007199254740993');assert.equal(await space.locator('.url-encoded code').textContent(),'FfGNdXsE9');await space.locator('details summary').click();assert.equal(await space.locator('details li').count(),9);
  await space.locator('input[type=text]').fill('abc');await space.locator('[role=alert]').waitFor();await space.locator('input[type=text]').fill('0');assert.equal(await space.locator('.url-encoded code').textContent(),'0');
  await ranges.first().focus();await page.keyboard.press('Home');await space.locator('[role=status]').waitFor();
  const cache=labs.last(),buttons=cache.locator('button');assert.equal(await cache.locator('dd').first().textContent(),'4');assert.equal(await cache.locator('dd').last().textContent(),'2');
  const old=await cache.locator('.redirect-replay').innerText();await buttons.nth(3).click();assert.equal(await cache.locator('.redirect-replay').innerText(),old,'Status alone changed explicit freshness');
  await cache.locator('input').first().focus();await page.keyboard.press('End');assert.equal(await cache.locator('dd').first().textContent(),'1');assert.equal(await cache.locator('dd').last().textContent(),'6');
  for(const i of [1,2]){await buttons.nth(i).click();assert.equal(await cache.locator('dd').first().textContent(),'10');assert.equal(await cache.locator('dd').last().textContent(),'0');}
  await buttons.first().click();await cache.locator('input').first().focus();await page.keyboard.press('Home');assert.equal(await cache.locator('dd').first().textContent(),'10');
  if(locale==='en')await page.waitForFunction(()=>![...document.querySelectorAll('.handbook-experiment')].some(el=>/[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(el.innerText)));
  for(const width of [1500,390]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await cache.scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/short-link-${locale}-${width}.png`});}
  report.push({locale,scenarios:'passed'});await page.setViewportSize({width:1500,height:1000});
 }
 for(const theme of JSON.parse(fs.readFileSync('src/lib/themes.json'))){await page.evaluate(id=>document.documentElement.dataset.theme=id,theme.id);const result=await new AxeBuilder({page}).include('.rich-handbook').withTags(['wcag2a','wcag2aa']).analyze();report.push({theme:theme.id,violations:result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))});}
}finally{await browser.close();fs.writeFileSync('artifacts/short-link-browser-report.json',JSON.stringify({errors,report},null,2));}
assert.deepEqual(errors,[]);assert.ok(report.every(r=>!r.violations?.length),JSON.stringify(report.filter(r=>r.violations?.length)));console.log('Short-link encoding, namespace capacity, cache semantics, both locales, mobile and 9 theme accessibility checks passed.');
