import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const runtime=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium}=await import(runtime?`${runtime}/playwright/index.mjs`:'playwright');
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),rel=url.pathname==='/'?'tests/fixture.html':decodeURIComponent(url.pathname.replace('/renamed-extension/',''));const file=path.resolve(root,rel);if(!file.startsWith(root+path.sep))throw Error('path');const bytes=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.gif':'image/gif'})[path.extname(file)]||'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.LP_CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
const screenshots=process.env.LP_SCREENSHOTS||'/tmp/li-pet-test';await mkdir(screenshots,{recursive:true});
try{
 for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
  const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(url);await page.waitForSelector('.lp-pet');assert.equal(await page.locator('.lp-pet').count(),2);
  assert.equal(await page.locator('#lp-wand-entry').count(),1);
  await page.click('#lp-wand-entry');await page.waitForSelector('#lp-dialog[open]');
  assert.equal(await page.locator('.lp-card').count(),6);
  await page.screenshot({path:`${screenshots}/home-${viewport.width}.png`});
  assert.ok(await page.evaluate(()=>{const r=document.getElementById('lp-dialog').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.height<=innerHeight}));
  await page.getByRole('button',{name:'一起做事',exact:true}).click();
  assert.equal(await page.getByText('未检测到',{exact:true}).count(),3);
  await page.getByRole('button',{name:'打开',exact:true}).first().click();assert.ok(await page.locator('#lp-toast').isVisible());
  // The original extensions can initialize later.
  await page.evaluate(()=>mountTools());await page.getByRole('button',{name:'重新检测工具'}).click();assert.equal(await page.getByText('已加载 · 可以打开',{exact:true}).count(),3);
  await page.getByRole('button',{name:'打开',exact:true}).first().click();assert.equal(await page.locator('#lp-dialog').evaluate(n=>n.open),false);assert.equal(await page.locator('#cw-hub').evaluate(n=>n.hidden),false);
  await page.evaluate(()=>document.getElementById('cw-hub').hidden=true);
  await page.click('#lp-wand-entry');await page.getByRole('button',{name:'一起做事',exact:true}).click();await page.getByRole('button',{name:'打开',exact:true}).nth(1).click();assert.ok(await page.evaluate(()=>window.atelierOpened));
  await page.click('#lp-wand-entry');await page.getByRole('button',{name:'一起做事',exact:true}).click();await page.getByRole('button',{name:'打开',exact:true}).nth(2).click();assert.ok(await page.locator('#meow-dialog').evaluate(n=>n.open));await page.evaluate(()=>document.getElementById('meow-dialog').close());
  await page.evaluate(()=>{document.getElementById('pear-nai-host').shadowRoot.querySelector('.header-wait').hidden=false});
  await page.waitForFunction(()=>[...document.querySelectorAll('.lp-pet')].every(p=>p.dataset.state==='敲代码'));
  await page.evaluate(()=>{document.getElementById('pear-nai-host').shadowRoot.querySelector('.header-wait').hidden=true;document.getElementById('meow-panel').setAttribute('aria-busy','true')});
  await page.waitForTimeout(1700);assert.equal(await page.locator('.lp-pet').first().getAttribute('data-state'),'敲代码');
  await page.evaluate(()=>document.getElementById('meow-panel').setAttribute('aria-busy','false'));await page.waitForTimeout(1700);
  await page.evaluate(()=>events.emit('GENERATION_STARTED','normal',{},true));await page.waitForTimeout(100);assert.notEqual(await page.locator('.lp-pet').first().getAttribute('data-state'),'敲代码');
  await page.evaluate(()=>events.emit('GENERATION_STARTED','normal',{},false));await page.waitForFunction(()=>document.querySelector('.lp-pet').dataset.state==='敲代码');
  await page.evaluate(()=>events.emit('GENERATION_STOPPED'));await page.waitForFunction(()=>document.querySelector('.lp-pet').dataset.state!=='敲代码');
  const before=await page.locator('.lp-pet').first().boundingBox();await page.mouse.move(before.x+50,before.y+50);await page.mouse.down();await page.mouse.move(40,170,{steps:8});await page.mouse.up();
  const after=await page.locator('.lp-pet').first().boundingBox();assert.ok(Math.abs(before.y-after.y)>20);
  // Reload persists drag positions, and dry-run generation does not animate.
  await page.reload();await page.waitForSelector('.lp-pet');const persisted=await page.locator('.lp-pet').first().boundingBox();assert.ok(Math.abs(persisted.y-after.y)<3);
  await page.click('#lp-wand-entry');await page.getByRole('button',{name:'喂食',exact:true}).click();assert.equal(await page.locator('#lp-dialog').evaluate(n=>n.open),false);assert.ok(await page.locator('.lp-pet[data-state="吃饭"]').count());
  await page.click('#lp-wand-entry');await page.getByRole('button',{name:'陪伴日记',exact:true}).click();assert.ok((await page.locator('.lp-diary').textContent()).includes('1 份小零食'));await page.evaluate(()=>mountTools());await page.getByRole('button',{name:'放进工作台书摘'}).click();assert.ok((await page.evaluate(()=>window.excerptText)).includes('1 份小零食'));
  await page.click('#lp-wand-entry');await page.getByRole('button',{name:'♡ 一起贴贴',exact:true}).click();assert.equal(await page.locator('.lp-combo').count(),1);await page.screenshot({path:`${screenshots}/hug-${viewport.width}.png`});await page.locator('.lp-combo').click();assert.equal(await page.locator('.lp-combo').count(),0);
  await page.click('#lp-wand-entry');await page.getByRole('button',{name:'暂时藏起来'}).click();await page.getByRole('button',{name:'关闭桌宠面板'}).click();assert.equal(await page.locator('#lp-pets').isVisible(),false);
  await page.click('#lp-wand-entry');await page.getByRole('button',{name:'让伙伴出来'}).click();await page.getByRole('button',{name:'小设置',exact:true}).click();await page.getByRole('button',{name:'把伙伴叫回屏幕边上'}).click();await page.getByRole('button',{name:'关闭桌宠面板'}).click();
  await page.setViewportSize({width:320,height:400});await page.waitForTimeout(100);assert.ok(await page.locator('.lp-pet').evaluateAll(ns=>ns.every(n=>{const r=n.getBoundingClientRect();return r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight})));
  await page.evaluate(async()=>{const {boot}=await import('/renamed-extension/index.js');boot();boot();events.emit('APP_READY')});assert.equal(await page.locator('#lp-wand-entry').count(),1);assert.equal(await page.locator('#lp-dialog').count(),1);assert.equal(await page.locator('.lp-pet').count(),2);
  await page.click('#lp-wand-entry');await page.getByRole('button',{name:'一起做事',exact:true}).click();await page.getByRole('button',{name:'开始 25 分钟'}).click();
  await page.evaluate(()=>{testContext.extensionSettings.li_pet_with_lumi.focusEnd=Date.now()-10});await page.waitForFunction(()=>testContext.extensionSettings.li_pet_with_lumi.diary.at(-1).focus===1);
  await page.evaluate(()=>window.__liPetWithLumi.dispose());assert.equal(await page.locator('#lp-pets, #lp-dialog, #lp-wand-entry').count(),0);
  assert.deepEqual(errors,[]);console.log(`PASS ${viewport.width}px: menu, layout, tools, status, drag, reload, diary, hugs, hide, resize, reload lifecycle, focus, cleanup`);await page.close();
 }
}finally{await browser.close();server.close();}
