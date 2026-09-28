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
  const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto(url);await page.waitForSelector('.lp-pet');
  await page.addStyleTag({content:'#extensions_settings2{display:block;width:300px}.inline-drawer-header{display:flex;align-items:center;justify-content:space-between;padding:12px;border:1px solid #777;border-left:4px solid #222;margin:8px 0}.inline-drawer-content{padding:10px}'});
  assert.equal(await page.locator('#lp-settings-header').getAttribute('aria-expanded'),'false');assert.equal(await page.locator('#lp-settings-entry').isVisible(),false);
  await page.locator('#lp-settings-header').click();assert.equal(await page.locator('#lp-settings-entry').isVisible(),true);await page.locator('#lp-settings-entry').click();assert.equal(await page.locator('#lp-dialog').evaluate(n=>n.open),true);await page.getByRole('button',{name:'关闭桌宠面板'}).click();
  await page.locator('#lp-settings-header').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#lp-settings-entry').isVisible(),false);await page.keyboard.press('Space');assert.equal(await page.locator('#lp-settings-entry').isVisible(),true);
  assert.deepEqual(errors,[]);console.log(`PASS ${viewport.width}px: native drawer, toggle, keyboard, open settings`);await page.close();
 }
}finally{await browser.close();server.close();}
