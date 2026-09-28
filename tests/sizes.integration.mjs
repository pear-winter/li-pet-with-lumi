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
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{if(!localStorage.getItem('test-settings'))localStorage.setItem('test-settings',JSON.stringify({li_pet_with_lumi:{wander:false,playful:false,positions:{'梨梨兔兔':{x:0,y:.3},'千千猫猫':{x:1,y:.6}}}}));});
  await page.goto(url);await page.waitForSelector('.lp-pet');await page.click('#lp-wand-entry');await page.getByRole('button',{name:'小设置',exact:true}).click();await page.getByText('分别调整每只伙伴大小',{exact:true}).click();
  await page.getByLabel('梨梨兔兔大小',{exact:true}).fill('160');await page.getByLabel('梨梨兔兔大小',{exact:true}).dispatchEvent('change');await page.getByLabel('千千猫猫大小',{exact:true}).fill('64');await page.getByLabel('千千猫猫大小',{exact:true}).dispatchEvent('change');
  assert.equal(await page.locator('.lp-pet').first().evaluate(n=>n.offsetWidth),160);assert.equal(await page.locator('.lp-pet').nth(1).evaluate(n=>n.offsetWidth),64);
  await page.getByRole('button',{name:'换装动作',exact:true}).click();await page.getByLabel('换装伙伴',{exact:true}).selectOption('千千猫猫');
  const actions=page.getByLabel('替换动作',{exact:true});assert.equal(await actions.locator('optgroup[label="下落、点击与自动小动作"] option[value="掉落"]').count(),1);
  await actions.selectOption('通用皮肤');const base=url+'/renamed-extension/assets/'+encodeURIComponent('梨梨兔兔')+'/'+encodeURIComponent('待机')+'.gif';await page.getByLabel('图片链接',{exact:true}).fill(base);await page.getByRole('button',{name:'保存图片链接',exact:true}).click();await page.waitForFunction(src=>document.querySelectorAll('.lp-pet img')[1].src===src,base);
  await actions.selectOption('掉落');const fall=url+'/renamed-extension/assets/'+encodeURIComponent('梨梨兔兔')+'/'+encodeURIComponent('跳舞')+'.gif';await page.getByLabel('图片链接',{exact:true}).fill(fall);await page.getByRole('button',{name:'保存图片链接',exact:true}).click();
  await page.reload();await page.waitForSelector('.lp-pet');assert.equal(await page.locator('.lp-pet').first().evaluate(n=>n.offsetWidth),160);assert.equal(await page.locator('.lp-pet').nth(1).evaluate(n=>n.offsetWidth),64);
  await page.locator('.lp-pet').nth(1).click();await page.waitForTimeout(100);assert.equal(await page.locator('.lp-pet img').nth(1).getAttribute('src'),base);await page.keyboard.press('Escape');
  await page.evaluate(async()=>{window.__liPetWithLumi.dispose();const s=testContext.extensionSettings.li_pet_with_lumi;s.gravity=true;s.playful=false;s.wander=false;s.positions={'梨梨兔兔':{x:0,y:0},'千千猫猫':{x:1,y:0}};const {boot}=await import('/renamed-extension/index.js');boot();});
  await page.waitForFunction(src=>document.querySelectorAll('.lp-pet img')[1].src===src,fall);
  await page.waitForFunction(()=>[...document.querySelectorAll('.lp-pet')].every(p=>Math.abs(p.getBoundingClientRect().bottom-(document.getElementById('send_textarea').getBoundingClientRect().top-8))<2));
  assert.equal(await page.locator('.lp-pet img').nth(1).getAttribute('src'),base);
  await page.evaluate(()=>window.__liPetWithLumi.hug(false));await page.waitForSelector('.lp-combo');await page.locator('.lp-combo').click();await page.waitForFunction(src=>document.querySelectorAll('.lp-pet img')[1].src===src,base);
  await page.click('#lp-wand-entry');await page.getByRole('button',{name:'小设置',exact:true}).click();await page.getByText('分别调整每只伙伴大小',{exact:true}).click();await page.screenshot({path:`${screenshots}/sizes-${viewport.width}.png`});
  await page.getByRole('button',{name:'全部恢复默认大小',exact:true}).click();assert.equal(await page.locator('.lp-pet').first().evaluate(n=>n.offsetWidth),100);assert.equal(await page.locator('.lp-pet').nth(1).evaluate(n=>n.offsetWidth),100);
  assert.deepEqual(errors,[]);console.log(`PASS ${viewport.width}px: per-pet sizes, persistence, fall costume, idle/click/landing/release fallback, gravity floor, combination sizing, reset`);await page.close();
 }
}finally{await browser.close();server.close();}
