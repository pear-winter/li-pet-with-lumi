import {createServer} from 'node:http';
import {readFile,mkdir,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const runtime=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium}=await import(runtime?`${runtime}/playwright/index.mjs`:'playwright');
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),rel=url.pathname==='/'?'tests/fixture.html':decodeURIComponent(url.pathname.replace('/renamed-extension/',''));const file=path.resolve(root,rel);if(!file.startsWith(root+path.sep))throw Error('path');const bytes=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.gif':'image/gif','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.LP_CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
const screenshots=process.env.LP_SCREENSHOTS||'/tmp/li-pet-test';await mkdir(screenshots,{recursive:true});
try {
 for (const viewport of [{width:1280,height:900},{width:390,height:844}]) {
  const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(url);await page.waitForSelector('.lp-pet');
  await page.evaluate(()=>{
   const container=document.createElement('div');container.id='chat';container.style.cssText='position:fixed;top:100px;left:0;width:100%;height:400px;overflow:auto;background:#242424';document.body.append(container);
   testContext.chatId='test';testContext.chat=Array.from({length:8},(_,id)=>({name:'角色',mes:`第${id}楼 苹果 苹果 <tag>`,swipe_id:0,swipes:[`第${id}楼 苹果 苹果 <tag>`,'不改的分支']}));
   window.renderFloor=id=>{if(container.querySelector(`[mesid="${id}"]`))return;const m=document.createElement('div');m.className='mes';m.setAttribute('mesid',id);m.style.height='250px';const t=document.createElement('div');t.className='mes_text';t.textContent=testContext.chat[id].mes;m.append(t);container.append(m);};
   window.renderAll=()=>{container.replaceChildren();for(let id=0;id<8;id++)renderFloor(id);};
   for(let id=5;id<8;id++)renderFloor(id);
   testContext.executeSlashCommandsWithOptions=async cmd=>{window.lastCommand=cmd;renderAll();};
   testContext.saveChat=async()=>{if(window.failSave)throw Error('模拟失败');window.saved=(window.saved||0)+1;};
   testContext.updateMessageBlock=(id,m)=>{const t=container.querySelector(`[mesid="${id}"] .mes_text`);if(t)t.textContent=m.mes;};
  });
  const open=async name=>{await page.locator('.lp-pet').first().click();await page.getByRole('button',{name,exact:true}).click();};
  const top=()=>page.evaluate(()=>document.getElementById('chat').scrollTop);
  await open('跳转顶楼');await page.waitForFunction(()=>window.lastCommand==='/chat-jump 0');assert.equal(await top(),0);
  await open('下一楼层');assert.equal(await top(),250);
  await open('上一楼层');assert.equal(await top(),0);
  // Latest starts at its own top when enough scroll space exists (oversized newest floor).
  await page.evaluate(()=>document.querySelector('[mesid="7"]').style.height='650px');
  await open('跳转最新');assert.equal(await top(),1750);
  await open('跳到最底');assert.equal(await top(),2000);
  await open('指定跳转');await page.locator('.lp-chat-dialog textarea').fill('2');await page.getByRole('button',{name:'跳转',exact:true}).click();assert.equal(await top(),500);
  await open('查找跳转');await page.getByLabel('查找文本',{exact:true}).fill('苹果');assert.equal(await page.locator('.lp-chat-results button').count(),16);
  await page.locator('.lp-chat-results button').nth(4).click();assert.equal(await top(),500);
  await open('查找替换');await page.getByLabel('查找文本',{exact:true}).fill('苹果');await page.getByLabel('替换为（留空删除）').fill('$&');
  await page.locator('.lp-chat-results button').nth(1).click();await page.getByRole('button',{name:'单独替换',exact:true}).click();
  await page.waitForFunction(()=>testContext.chat[0].mes==='第0楼 苹果 $& <tag>');
  assert.equal(await page.evaluate(()=>testContext.chat[0].swipes[0]),'第0楼 苹果 $& <tag>');assert.equal(await page.evaluate(()=>testContext.chat[0].swipes[1]),'不改的分支');
  await page.getByLabel('替换为（留空删除）').fill('');await page.getByRole('button',{name:'全部替换',exact:true}).click();await page.waitForFunction(()=>testContext.chat.every(m=>!m.mes.includes('苹果')));
  // Failed save restores both message and active swipe.
  await page.getByLabel('查找文本',{exact:true}).fill('$&');await page.evaluate(()=>window.failSave=true);await page.locator('.lp-chat-results button').first().click();await page.getByRole('button',{name:'单独替换',exact:true}).click();await page.waitForFunction(()=>document.getElementById('lp-toast').textContent.includes('保存失败'));assert.ok(await page.evaluate(()=>testContext.chat[0].mes.includes('$&')&&testContext.chat[0].swipes[0].includes('$&')));
  await page.evaluate(()=>window.failSave=false);
  await page.getByRole('button',{name:'点击聊天文本选取',exact:true}).click();await page.locator('[mesid="2"] .mes_text').click();await page.waitForSelector('.lp-chat-dialog[open]');assert.equal(await page.getByLabel('查找文本',{exact:true}).inputValue(),'第2楼   <tag>');
  assert.ok(await page.locator('.lp-chat-dialog').evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}));
  await page.screenshot({path:`${screenshots}/chat-tools-${viewport.width}.png`});
  await page.evaluate(()=>{testContext.chatId='other';events.emit('CHAT_CHANGED');});assert.equal(await page.locator('.lp-chat-dialog').count(),0);
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('Chat tools desktop/mobile integration passed');
} finally {await browser.close();await new Promise(r=>server.close(r));}
