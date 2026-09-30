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
try {
 for (const viewport of [{width:1280,height:900},{width:390,height:844}]) {
  const page=await browser.newPage({viewport});page.setDefaultTimeout(10000);
  const errors=[],missing=[];page.on('pageerror',e=>errors.push(String(e)));page.on('response',res=>{if(res.status()>=400)missing.push(res.url());});
  await page.goto(url);await page.waitForSelector('.lp-pet');
  await page.evaluate(async()=>{
   window.__liPetWithLumi.dispose();
   testContext.extensionSettings.li_pet_with_lumi={pets:['陈野','梨梨兔兔','梨梨哥哥','酒酒狐狸'],wander:false,playful:false,music:false,size:76,actionMode:'until-cancel',petNames:{'梨梨兔兔':'梨梨','梨梨哥哥':'白川'},positions:{'陈野':{x:.08,y:.25},'梨梨兔兔':{x:.4,y:.5},'梨梨哥哥':{x:.73,y:.7},'酒酒狐狸':{x:.8,y:.1}}};
   (await import('/renamed-extension/index.js')).boot();
  });
  const chen=page.locator('.lp-pet').filter({has:page.locator('img[alt="陈野"]')});
  await page.waitForFunction(()=>[...document.querySelectorAll('.lp-pet img')].every(n=>n.complete&&n.naturalWidth>0));
  assert.equal(await chen.getAttribute('data-state'),'发呆');
  const api=fn=>page.evaluate(fn);
  await api(()=>events.emit('GENERATION_STARTED','normal',{},false));await page.waitForSelector('.lp-pet[data-state="打工中"]');
  await api(()=>events.emit('GENERATION_ENDED'));
  await api(()=>window.__liPetWithLumi.act('陈野','cancel'));
  // All 22 original actions can display; none substitute another pet's animation.
  const actions=await api(()=>window.__liPetWithLumi.getState().pets.find(p=>p.id==='陈野').actions);
  assert.equal(actions.length,22);
  for(const action of actions){await page.evaluate(a=>window.__liPetWithLumi.act('陈野',a),action);await page.waitForFunction(a=>{const img=document.querySelector('.lp-pet img[alt="陈野"]');return img.parentElement.dataset.state===a&&img.complete&&img.naturalWidth>0},action);}
  await api(()=>window.__liPetWithLumi.act('陈野','cancel'));
  const openInteractions=async()=>{await chen.click();await page.getByRole('button',{name:'动作',exact:true}).click();await page.getByRole('button',{name:'互动',exact:true}).click();};
  const end=async()=>{await page.getByRole('button',{name:'关闭动作面板',exact:true}).click();await page.locator('.lp-combo').click();await api(()=>window.__liPetWithLumi.cancelAll());};
  for(const [partner,kind,key] of [['白川','打架','梨梨哥哥-陈野_打架'],['梨梨','贴贴','梨梨兔兔-陈野']]){
   await openInteractions();assert.equal(await page.getByRole('button',{name:'酒酒',exact:true}).count(),0);
   await page.getByRole('button',{name:partner,exact:true}).click();assert.equal(await page.getByRole('button',{name:'叠叠乐',exact:true}).count(),0);
   await page.getByRole('button',{name:kind,exact:true}).click();await page.waitForSelector(`.lp-combo[data-combo="${key}"]`);
   await api(()=>events.emit('GENERATION_STARTED','normal',{},false));assert.equal(await page.locator('.lp-combo').count(),1);await api(()=>events.emit('GENERATION_ENDED'));
   await end();
  }
  for(const kind of ['举高高','牵手手']){
   await openInteractions();await page.getByRole('button',{name:'与 梨梨、白川 · '+kind,exact:true}).click();
   await page.waitForFunction(k=>document.querySelector('.lp-combo')?.dataset.combo===`梨梨兔兔-梨梨哥哥-陈野_${k}`,kind);
   assert.equal(await page.locator('.lp-pet[hidden]').count(),3);
   await page.waitForFunction(()=>{const n=document.querySelector('.lp-combo img');return n.complete&&n.naturalWidth>0});
   await page.getByRole('button',{name:'关闭动作面板',exact:true}).click();await page.screenshot({path:`${screenshots}/chenye-${kind}-${viewport.width}.png`});
   await page.locator('.lp-combo').click();await api(()=>window.__liPetWithLumi.cancelAll());
  }
  await api(()=>window.__liPetWithLumi.setPetOn('梨梨哥哥',false));await openInteractions();
  assert.equal(await page.getByRole('button',{name:/举高高|牵手手|白川/}).count(),0);
  await page.getByRole('button',{name:'关闭动作面板',exact:true}).click();
  await api(()=>window.__liPetWithLumi.openWardrobe('陈野'));
  assert.equal(await page.getByLabel('替换动作',{exact:true}).inputValue(),'发呆');
  const interactions=page.getByLabel('替换动作',{exact:true}).locator('optgroup[label="与其他伙伴互动"] option');
  assert.equal(await interactions.count(),4);
  assert.deepEqual(await interactions.allTextContents(),['与 白川 · 打架','与 梨梨 · 贴贴','与 梨梨、白川 · 举高高','与 梨梨、白川 · 牵手手']);
  const key='梨梨兔兔-梨梨哥哥-陈野_举高高';await page.getByLabel('替换动作',{exact:true}).selectOption(key);
  await page.waitForFunction(()=>document.querySelector('.lp-costume-preview')?.src.includes(encodeURIComponent('互动_03')));
  await page.getByLabel('当前动作大小',{exact:true}).fill('230');
  await page.getByLabel('当前动作大小',{exact:true}).dispatchEvent('input');
  await page.getByRole('button',{name:'关闭桌宠面板'}).click();
  await page.reload();await page.waitForSelector('.lp-pet');
  assert.equal(await api(()=>window.__liPetWithLumi.wardrobe.get('组合').actions.find(a=>a.action==='梨梨兔兔-梨梨哥哥-陈野_举高高').size),230);
  await page.click('#lp-wand-entry');assert.equal(await page.locator('.lp-card').count(),9);
  await page.screenshot({path:`${screenshots}/new-pets-home-${viewport.width}.png`});
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  await page.close();console.log('PASS new pets, exact interactions, three-member availability, wardrobe, persistence:',viewport.width);
 }
}finally{await browser.close();server.close();}
