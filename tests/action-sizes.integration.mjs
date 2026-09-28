import {createServer} from 'node:http';
import {readFile,mkdir,readdir} from 'node:fs/promises';
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
  const page=await browser.newPage({viewport,acceptDownloads:true}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(url);await page.waitForSelector('.lp-pet');await page.evaluate(()=>{window.__liPetWithLumi.setSetting('actionMode','until-cancel');window.__liPetWithLumi.openWardrobe('梨梨兔兔');});
  const action=page.getByLabel('替换动作',{exact:true}),size=page.getByLabel('当前动作大小',{exact:true});
  await action.selectOption('跳舞');await size.fill('180');await page.evaluate(()=>window.__liPetWithLumi.act('梨梨兔兔','跳舞'));await page.waitForFunction(()=>document.querySelector('.lp-pet').offsetWidth===180);
  assert.equal(await page.locator('.lp-pet').nth(1).evaluate(n=>n.offsetWidth),100);
  await action.selectOption('敲代码');await size.fill('72');await page.evaluate(()=>window.__liPetWithLumi.act('梨梨兔兔','敲代码'));await page.waitForFunction(()=>document.querySelector('.lp-pet').offsetWidth===72);
  await page.getByRole('button',{name:'此动作恢复跟随大小',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.lp-pet').offsetWidth===100);
  const pair='千千猫猫-梨梨兔兔';await action.selectOption(pair);await size.fill('120');await page.evaluate(()=>window.__liPetWithLumi.hug(false));await page.waitForSelector('.lp-combo');assert.ok(Math.abs((await page.locator('.lp-combo').boundingBox()).width-228)<1);
  await page.evaluate(()=>window.__liPetWithLumi.openWardrobe('梨梨兔兔'));await action.selectOption(pair);await size.fill('150');assert.ok(Math.abs((await page.locator('.lp-combo').boundingBox()).height-225)<1);
  await page.locator('.lp-outfits summary').click();const event=page.waitForEvent('download');await page.getByRole('button',{name:'导出当前整套',exact:true}).click();const file=await(await event).path(),bundle=JSON.parse(await readFile(file,'utf8'));assert.equal(bundle.actionSizes['梨梨兔兔']['跳舞'],180);assert.equal(bundle.actionSizes['组合'][pair],150);
  await size.fill('100');await page.getByLabel('导入整套皮肤',{exact:true}).setInputFiles({name:'outfit.json',mimeType:'application/json',buffer:await readFile(file)});await page.waitForFunction(()=>!document.querySelector('[aria-label="导入整套皮肤"]').disabled);await action.selectOption(pair);assert.equal(await size.inputValue(),'150');
  await page.reload();await page.waitForSelector('.lp-pet');await page.evaluate(()=>{window.__liPetWithLumi.act('梨梨兔兔','跳舞');window.__liPetWithLumi.setSetting('gravity',true);});await page.waitForFunction(()=>document.querySelector('.lp-pet').offsetWidth===180);await page.waitForFunction(()=>Math.abs(document.querySelector('.lp-pet').getBoundingClientRect().bottom-(document.getElementById('send_textarea').getBoundingClientRect().top-8))<2);
  await page.evaluate(()=>window.__liPetWithLumi.act('梨梨兔兔','敲代码'));await page.waitForFunction(()=>document.querySelector('.lp-pet').offsetWidth===100);assert.ok(await page.locator('.lp-pet').first().evaluate(n=>n.getBoundingClientRect().bottom<=document.getElementById('send_textarea').getBoundingClientRect().top-7));
  assert.deepEqual(errors,[]);console.log(`PASS ${viewport.width}px: action sizes, switching, reset, combo live resize, export/import, persistence, gravity`);await page.close();
 }
}finally{await browser.close();server.close();}
