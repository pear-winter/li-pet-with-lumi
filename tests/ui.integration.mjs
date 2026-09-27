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
  const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(url);await page.waitForSelector('.lp-pet');assert.equal(await page.locator('.lp-pet').count(),2);
  assert.equal(await page.locator('#lp-wand-entry').count(),1);
  await page.keyboard.press('Escape');await page.click('#lp-wand-entry');await page.waitForSelector('#lp-dialog[open]');
  assert.equal(await page.locator('.lp-card').count(),6);
  await page.screenshot({path:`${screenshots}/home-${viewport.width}.png`});
  assert.ok(await page.evaluate(()=>{const r=document.getElementById('lp-dialog').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.height<=innerHeight}));
  assert.equal(await page.getByRole('button',{name:'一起做事',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'陪伴日记',exact:true}).count(),0);
  const selectedCard=page.locator('.lp-card[aria-pressed=true]').first(),unselectedCard=page.locator('.lp-card[aria-pressed=false]').first();
  assert.notEqual(await selectedCard.evaluate(n=>getComputedStyle(n).backgroundColor),await unselectedCard.evaluate(n=>getComputedStyle(n).backgroundColor));assert.ok((await selectedCard.textContent()).includes('✓ 已选中'));
  await page.getByRole('button',{name:'小设置',exact:true}).click();await page.locator('.lp-names summary').click();await page.getByLabel('梨梨兔兔的名字',{exact:true}).fill('小梨');await page.getByLabel('梨梨兔兔的名字',{exact:true}).press('Tab');
  await page.getByRole('button',{name:'小小伙伴',exact:true}).click();assert.ok(await page.locator('.lp-card').getByText('小梨',{exact:true}).count());assert.equal(await page.getByLabel('选择互动伙伴').locator('option[value="梨梨兔兔"]').textContent(),'小梨');
  await page.getByRole('button',{name:'换装动作',exact:true}).click();assert.equal(await page.getByLabel('换装伙伴',{exact:true}).locator('option[value="梨梨兔兔"]').textContent(),'小梨');
  await page.getByRole('button',{name:'关闭桌宠面板'}).click();
  await page.evaluate(()=>mountTools());
  for(const [name,check] of [['管理预设','preset'],['梨梨画室','atelier'],['喵喵星绘','meow']]){
    if(check==='preset')await page.evaluate(()=>window.__cyll_pear_hub_v1__={open:async t=>{window.openedTab=t}});
    await page.locator('.lp-pet').first().click();await page.getByRole('button',{name:'魔法门',exact:true}).click();await page.getByRole('button',{name,exact:true}).click();
    if(check==='preset')await page.waitForFunction(()=>window.openedTab==='preset');
    if(check==='atelier')assert.ok(await page.evaluate(()=>window.atelierOpened));
    if(check==='meow'){assert.ok(await page.locator('#meow-dialog').evaluate(n=>n.open));await page.evaluate(()=>document.getElementById('meow-dialog').close());}
  }
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
  await page.reload();await page.waitForSelector('.lp-pet');assert.equal(await page.evaluate(()=>testContext.extensionSettings.li_pet_with_lumi.petNames['梨梨兔兔']),'小梨');const persisted=await page.locator('.lp-pet').first().boundingBox();assert.ok(Math.abs(persisted.y-after.y)<3);
  await page.keyboard.press('Escape');await page.click('#lp-wand-entry');await page.getByRole('button',{name:'喂食',exact:true}).click();await page.waitForSelector('.lp-pet[data-state="吃饭"]');assert.equal(await page.locator('#lp-dialog').evaluate(n=>n.open),false);assert.ok(await page.locator('.lp-pet[data-state="吃饭"]').count());
  assert.equal(await page.evaluate(()=>'diary' in testContext.extensionSettings.li_pet_with_lumi),false);
  await page.keyboard.press('Escape');await page.click('#lp-wand-entry');await page.getByRole('button',{name:'♡ 一起贴贴',exact:true}).click();await page.waitForSelector('.lp-combo');assert.equal(await page.locator('.lp-combo').count(),1);await page.screenshot({path:`${screenshots}/hug-${viewport.width}.png`});await page.locator('.lp-combo').click();assert.equal(await page.locator('.lp-combo').count(),0);
  await page.keyboard.press('Escape');await page.click('#lp-wand-entry');await page.getByRole('button',{name:'暂时藏起来'}).click();await page.getByRole('button',{name:'关闭桌宠面板'}).click();assert.equal(await page.locator('#lp-pets').isVisible(),false);
  await page.keyboard.press('Escape');await page.click('#lp-wand-entry');await page.getByRole('button',{name:'让伙伴出来'}).click();await page.getByRole('button',{name:'小设置',exact:true}).click();await page.getByRole('button',{name:'把伙伴叫回屏幕边上'}).click();await page.getByRole('button',{name:'关闭桌宠面板'}).click();
  await page.setViewportSize({width:320,height:400});await page.waitForTimeout(100);assert.ok(await page.locator('.lp-pet').evaluateAll(ns=>ns.every(n=>{const r=n.getBoundingClientRect();return r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight})));
  await page.evaluate(async()=>{const {boot}=await import('/renamed-extension/index.js');boot();boot();events.emit('APP_READY')});assert.equal(await page.locator('#lp-wand-entry').count(),1);assert.equal(await page.locator('#lp-dialog').count(),1);assert.equal(await page.locator('.lp-pet').count(),2);
  await page.evaluate(async()=>{window.__liPetWithLumi.dispose();testContext.extensionSettings.li_pet_with_lumi.positions={'梨梨兔兔':{x:0,y:.65},'千千猫猫':{x:1,y:.65}};testContext.extensionSettings.li_pet_with_lumi.playful=false;const {boot}=await import('/renamed-extension/index.js');boot();});
  // Compact interaction menu and the real workbench tab API.
  await page.locator('.lp-pet').first().click();await page.getByRole('button',{name:'魔法门',exact:true}).click();
  await page.evaluate(()=>window.__cyll_pear_hub_v1__={open:async tab=>{window.openedTab=tab}});
  await page.getByRole('button',{name:'管理预设',exact:true}).click();await page.waitForFunction(()=>window.openedTab==='preset');assert.equal(await page.locator('#lp-quick').isVisible(),false);
  // Playback nested in chat iframes, two sources, pause/removal, and legacy player.
  await page.evaluate(()=>{for(let i=0;i<2;i++){const f=document.createElement('iframe');f.className='test-music';f.srcdoc='<script type="text/plain" id="song-sheet">notes<\/script><div id="pl"><div class="ct"><button class="mn" title="暂停">pause</button></div></div>';document.body.append(f);}});
  await page.waitForFunction(()=>[...document.querySelectorAll('.lp-pet')].every(n=>n.dataset.state==='听音乐'));
  await page.evaluate(()=>document.querySelector('.test-music').remove());await page.waitForTimeout(400);assert.equal(await page.locator('.lp-pet').first().getAttribute('data-state'),'听音乐');
  await page.evaluate(()=>document.querySelector('.test-music').contentDocument.querySelector('button').title='播放');
  await page.waitForFunction(()=>document.querySelector('.lp-pet').dataset.state!=='听音乐');
  await page.evaluate(()=>{document.querySelector('.test-music').remove();const p=document.createElement('div');p.className='ll-player is-playing';document.body.append(p)});
  await page.waitForFunction(()=>document.querySelector('.lp-pet').dataset.state==='听音乐');await page.evaluate(()=>document.querySelector('.ll-player').remove());await page.waitForFunction(()=>document.querySelector('.lp-pet').dataset.state!=='听音乐');
  if(process.env.LP_MUSIC_ATTACHMENTS && viewport.width===1280){
    for(const file of await readdir(process.env.LP_MUSIC_ATTACHMENTS)){
      if(!file.endsWith('.json'))continue;
      const data=JSON.parse(await readFile(path.join(process.env.LP_MUSIC_ATTACHMENTS,file),'utf8'));if(!data.replaceString)continue;
      const score='<Lyric>test</Lyric><Score>'+Array(16).fill('C4*8').join(' ')+'</Score>';
      const html=data.replaceString.replace(/^```html\s*/,'').replace(/```\s*$/,'').replace(/\$[1-6]/g,k=>k==='$1'?'test':k==='$3'?'84':k==='$2'?'84':score);
      await page.evaluate(html=>{const f=document.createElement('iframe');f.id='actual-music';f.srcdoc=html;document.body.append(f);},html);
      const f=page.frameLocator('#actual-music');await f.locator('#pl .ct .mn').click();
      await page.waitForFunction(()=>document.querySelector('.lp-pet').dataset.state==='听音乐');
      await f.locator('#pl .ct .mn').click();await page.waitForFunction(()=>document.querySelector('.lp-pet').dataset.state!=='听音乐');
      await page.evaluate(()=>document.getElementById('actual-music').remove());console.log('PASS supplied player:',file);
    }
  }
  // Themes, custom CSS persistence, gravity, and the formerly vertical settings entry.
  await page.keyboard.press('Escape');await page.click('#lp-wand-entry');await page.getByRole('button',{name:'小设置',exact:true}).click();
  await page.getByLabel('面板美化',{exact:true}).selectOption('pink');await page.locator('#lp-dialog textarea').fill('#lp-dialog { --test-css: saved; }');await page.getByRole('button',{name:'保存 CSS',exact:true}).click();
  await page.screenshot({path:`${screenshots}/settings-pink-${viewport.width}.png`});
  await page.getByLabel('开启重力，落在输入框上方').check();await page.getByRole('button',{name:'关闭桌宠面板'}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('.lp-pet')].every(n=>Math.abs(n.getBoundingClientRect().bottom-(document.getElementById('send_textarea').getBoundingClientRect().top-8))<2));
  await page.reload();await page.waitForSelector('.lp-pet');assert.equal(await page.locator('#lp-dialog').getAttribute('data-theme'),'pink');assert.ok((await page.locator('#lp-custom-style').textContent()).includes('--test-css: saved'));
  await page.evaluate(()=>{document.getElementById('extensions_settings2').style.cssText='display:flex;flex-direction:column;width:220px';});
  const r=await page.locator('#lp-settings-entry').boundingBox();assert.ok(r.width>=200&&r.height<90);
  assert.equal(await page.getByText('开始 25 分钟',{exact:true}).count(),0);
  // Walk after more than a minute idle, and both default companions leave a hug to type.
  await page.evaluate(async()=>{window.__liPetWithLumi.dispose();Object.assign(testContext.extensionSettings.li_pet_with_lumi,{gravity:false,wander:true,speed:30,playful:false,pets:['梨梨兔兔','千千猫猫'],positions:{'梨梨兔兔':{x:.1,y:.6},'千千猫猫':{x:.9,y:.6}}});const {boot}=await import('/renamed-extension/index.js');boot();const original=Date.now;window.restoreClock=()=>Date.now=original;Date.now=()=>original()+65000;});
  const walkBefore=await page.locator('.lp-pet').first().boundingBox();
  await page.waitForFunction(()=>document.querySelector('.lp-pet').dataset.state.includes('走'));
  await page.waitForTimeout(450);assert.ok(Math.abs((await page.locator('.lp-pet').first().boundingBox()).x-walkBefore.x)>2);
  await page.evaluate(()=>{restoreClock();testContext.extensionSettings.li_pet_with_lumi.wander=false});
  await page.keyboard.press('Escape');await page.click('#lp-wand-entry');await page.getByRole('button',{name:'♡ 一起贴贴',exact:true}).click();await page.waitForSelector('.lp-combo');assert.equal(await page.locator('.lp-combo').count(),1);
  await page.evaluate(()=>events.emit('GENERATION_STARTED','swipe',{},false));
  assert.equal(await page.locator('.lp-combo').count(),1);await page.locator('.lp-combo').click();await page.evaluate(()=>events.emit('GENERATION_STARTED','swipe',{},false));await page.waitForFunction(()=>document.querySelectorAll('.lp-pet[data-state="敲代码"]').length===2);await page.evaluate(()=>events.emit('GENERATION_STOPPED'));
  // Individual costume upload, per-event mapping, and IndexedDB reload persistence.
  await page.keyboard.press('Escape');await page.click('#lp-wand-entry');await page.getByRole('button',{name:'换装动作',exact:true}).click();
  await page.getByLabel('换装伙伴',{exact:true}).selectOption('梨梨兔兔');await page.getByLabel('替换动作',{exact:true}).selectOption('敲代码');
  await page.getByLabel('本地上传图片',{exact:true}).setInputFiles(path.join(root,'assets/梨梨兔兔/敲代码.gif'));
  await page.waitForFunction(()=>testContext.extensionSettings.li_pet_with_lumi.skins['梨梨兔兔']?.['敲代码']?.startsWith('local:'));
  await page.getByLabel('行为设置伙伴',{exact:true}).selectOption('梨梨兔兔');await page.getByLabel('生成 / 重抽回复动作',{exact:true}).selectOption('跳舞');
  await page.getByRole('button',{name:'关闭桌宠面板'}).click();await page.evaluate(()=>events.emit('GENERATION_STARTED','regenerate',{},false));
  await page.waitForFunction(()=>document.querySelector('.lp-pet').dataset.state==='跳舞');assert.equal(await page.locator('.lp-pet').nth(1).getAttribute('data-state'),'敲代码');
  await page.evaluate(()=>events.emit('GENERATION_STOPPED'));await page.keyboard.press('Escape');await page.click('#lp-wand-entry');await page.getByRole('button',{name:'换装动作',exact:true}).click();
  await page.getByLabel('行为设置伙伴',{exact:true}).selectOption('梨梨兔兔');await page.getByLabel('生成 / 重抽回复动作',{exact:true}).selectOption('');
  await page.getByRole('button',{name:'关闭桌宠面板'}).click();await page.reload();await page.waitForSelector('.lp-pet');
  await page.evaluate(()=>events.emit('GENERATION_STARTED','swipe',{},false));await page.waitForFunction(()=>document.querySelector('.lp-pet img').src.startsWith('blob:'));assert.ok(await page.locator('.lp-pet img').first().evaluate(img=>img.naturalWidth>0));
  await page.evaluate(()=>events.emit('GENERATION_STOPPED'));await page.keyboard.press('Escape');await page.click('#lp-wand-entry');await page.getByRole('button',{name:'换装动作',exact:true}).click();
  await page.getByLabel('换装伙伴',{exact:true}).selectOption('梨梨兔兔');await page.getByLabel('替换动作',{exact:true}).selectOption('敲代码');
  await page.getByLabel('图片链接',{exact:true}).fill(url+'/renamed-extension/assets/'+encodeURIComponent('梨梨兔兔')+'/'+encodeURIComponent('待机')+'.gif');await page.getByRole('button',{name:'保存图片链接',exact:true}).click();
  await page.waitForFunction(()=>testContext.extensionSettings.li_pet_with_lumi.skins['梨梨兔兔']['敲代码'].startsWith('http'));
  await page.getByRole('button',{name:'恢复此动作',exact:true}).click();await page.waitForFunction(()=>!testContext.extensionSettings.li_pet_with_lumi.skins['梨梨兔兔']['敲代码']);
  await page.screenshot({path:`${screenshots}/wardrobe-${viewport.width}.png`});
  // Explicit actions survive automatic events for two minutes; interaction partners must be on stage.
  await page.getByRole('button',{name:'关闭桌宠面板'}).click();
  await page.evaluate(async()=>{window.__liPetWithLumi.dispose();Object.assign(testContext.extensionSettings.li_pet_with_lumi,{gravity:false,wander:false,playful:false,pets:['梨梨兔兔','千千猫猫','千千哥哥'],positions:{'梨梨兔兔':{x:0,y:.8},'千千猫猫':{x:.9,y:.8},'千千哥哥':{x:.5,y:.1}}});const {boot}=await import('/renamed-extension/index.js');boot();});
  const quick=page.locator('#lp-quick');
  const openActions=async()=>{await page.keyboard.press('Escape');await page.locator('.lp-pet').first().click();await quick.getByRole('button',{name:'动作',exact:true}).click();};
  await page.locator('.lp-pet').first().click();
  assert.ok(await page.evaluate(()=>{const m=document.getElementById('lp-quick').getBoundingClientRect(),p=document.querySelector('.lp-pet').getBoundingClientRect();return m.bottom>p.top&&m.left>=0&&m.right<=innerWidth;}));
  await quick.getByRole('button',{name:'动作',exact:true}).click();
  assert.equal(await quick.locator('button').first().textContent(),'互动');
  await quick.getByRole('button',{name:'跳舞',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.lp-pet').dataset.state==='跳舞'&&document.querySelector('.lp-pet img').complete);await page.waitForTimeout(100);assert.ok(await quick.isVisible());
  await page.evaluate(()=>{const original=Date.now;window.advance=0;window.restoreActionClock=()=>Date.now=original;Date.now=()=>original()+window.advance;events.emit('GENERATION_STARTED','swipe',{},false);events.emit('GENERATION_ENDED');events.emit('CHAT_CHANGED');const music=document.createElement('div');music.className='ll-player is-playing';document.body.append(music);window.advance=119000;});
  await page.waitForTimeout(400);assert.equal(await page.locator('.lp-pet').first().getAttribute('data-state'),'跳舞');
  await page.evaluate(()=>window.advance=121000);await page.waitForFunction(()=>document.querySelector('.lp-pet').dataset.state==='听音乐');
  await page.evaluate(()=>{restoreActionClock();document.querySelector('.ll-player').remove();});
  await openActions();await quick.getByRole('button',{name:'互动',exact:true}).click();
  assert.deepEqual(await quick.locator('button').allTextContents(),['千千猫猫','返回','关闭动作面板']);
  await quick.getByRole('button',{name:'千千猫猫',exact:true}).click();await quick.getByRole('button',{name:'贴贴',exact:true}).click();await page.waitForSelector('.lp-combo');await page.waitForTimeout(100);assert.ok(await quick.isVisible());assert.equal(await page.locator('.lp-combo').count(),1);
  await page.evaluate(()=>{const original=Date.now;window.advance=0;window.restoreActionClock=()=>Date.now=original;Date.now=()=>original()+window.advance;events.emit('GENERATION_STARTED','normal',{},false);events.emit('GENERATION_STOPPED');events.emit('CHAT_CHANGED');const music=document.createElement('div');music.className='ll-player is-playing';document.body.append(music);window.advance=119000;});
  await page.waitForTimeout(400);assert.equal(await page.locator('.lp-combo').count(),1);
  await page.screenshot({path:`${screenshots}/chosen-interaction-${viewport.width}.png`});
  await page.evaluate(()=>window.advance=121000);await page.waitForFunction(()=>!document.querySelector('.lp-combo'));
  await page.evaluate(()=>{restoreActionClock();document.querySelector('.ll-player').remove();});
  await page.keyboard.press('Escape');await page.click('#lp-wand-entry');await page.locator('.lp-card').filter({hasText:'千千猫猫'}).click();await page.getByRole('button',{name:'关闭桌宠面板'}).click();
  await openActions();await quick.getByRole('button',{name:'互动',exact:true}).click();assert.deepEqual(await quick.locator('button').allTextContents(),['返回','关闭动作面板']);
  // Independent entries: Actions is to the left of Magic Door, absent inside it.
  await page.keyboard.press('Escape');await page.locator('.lp-pet').first().click();
  const ar=await quick.getByRole('button',{name:'动作',exact:true}).boundingBox(),mr=await quick.getByRole('button',{name:'魔法门',exact:true}).boundingBox();assert.ok(ar.x<mr.x&&Math.abs(ar.y-mr.y)<2);
  await quick.getByRole('button',{name:'魔法门',exact:true}).click();assert.equal(await quick.getByRole('button',{name:'动作',exact:true}).count(),0);
  await page.keyboard.press('Escape');await page.keyboard.press('Escape');await page.click('#lp-wand-entry');await page.getByRole('button',{name:'小设置',exact:true}).click();
  assert.equal(await page.getByLabel('主动动作持续时间',{exact:true}).inputValue(),'timed');assert.equal(await page.getByLabel('主动动作持续秒数',{exact:true}).inputValue(),'120');
  await page.getByLabel('主动动作持续时间',{exact:true}).selectOption('once');await page.getByRole('button',{name:'关闭桌宠面板'}).click();
  await openActions();await quick.getByRole('button',{name:'跳舞',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.lp-pet').dataset.state==='跳舞');assert.ok(await quick.isVisible());
  await page.waitForFunction(()=>document.querySelector('.lp-pet').dataset.state!=='跳舞',null,{timeout:10000});assert.ok(await quick.isVisible());
  await page.keyboard.press('Escape');await page.keyboard.press('Escape');await page.click('#lp-wand-entry');await page.getByRole('button',{name:'小设置',exact:true}).click();await page.getByLabel('主动动作持续时间',{exact:true}).selectOption('until-cancel');await page.getByRole('button',{name:'关闭桌宠面板'}).click();
  await openActions();await quick.getByRole('button',{name:'跳舞',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.lp-pet').dataset.state==='跳舞');
  await page.evaluate(()=>{const original=Date.now;window.restoreLongClock=()=>Date.now=original;Date.now=()=>original()+86400000;events.emit('GENERATION_STARTED','normal',{},false);events.emit('GENERATION_ENDED');});await page.waitForTimeout(150);assert.equal(await page.locator('.lp-pet').first().getAttribute('data-state'),'跳舞');
  await quick.getByRole('button',{name:'恢复自动动作',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.lp-pet').dataset.state!=='跳舞');assert.ok(await quick.isVisible());await page.evaluate(()=>restoreLongClock());
  // Gravity respects a growing composer, including explicitly held animations.
  await page.keyboard.press('Escape');await page.keyboard.press('Escape');await page.click('#lp-wand-entry');await page.getByRole('button',{name:'小设置',exact:true}).click();await page.getByLabel('开启重力，落在输入框上方').check();await page.getByRole('button',{name:'关闭桌宠面板'}).click();
  await openActions();await quick.getByRole('button',{name:'跳舞',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.lp-pet').dataset.state==='跳舞');
  await page.evaluate(()=>document.getElementById('send_textarea').style.height='180px');await page.waitForFunction(()=>[...document.querySelectorAll('.lp-pet')].every(p=>p.getBoundingClientRect().bottom<=document.getElementById('send_textarea').getBoundingClientRect().top-7));
  await page.keyboard.press('Escape');await page.reload();await page.waitForSelector('.lp-pet');assert.equal(await page.evaluate(()=>testContext.extensionSettings.li_pet_with_lumi.actionMode),'until-cancel');
  // Themed oversized menu still leaves a gap and fits within its row.
  await page.locator('#extensionsMenu').evaluate(n=>n.style.cssText='position:fixed;top:50px;left:4px;width:280px;font-size:30px;box-sizing:border-box');
  assert.ok(await page.locator('#lp-wand-entry').evaluate(n=>{const r=n.getBoundingClientRect(),i=n.firstElementChild.getBoundingClientRect(),t=n.lastElementChild.getBoundingClientRect();return t.left-i.right>=10&&t.right<=r.right+1&&i.left>r.left}));
  await page.screenshot({path:`${screenshots}/wand-spacing-${viewport.width}.png`});
  await page.evaluate(()=>window.__liPetWithLumi.dispose());assert.equal(await page.locator('#lp-pets, #lp-dialog, #lp-wand-entry').count(),0);
  assert.deepEqual(errors,[]);console.log(`PASS ${viewport.width}px: menu, layout, tools, status, drag, reload, names, selection, hugs, hide, resize, reload lifecycle, music, magic door, themes, gravity, entry layout, cleanup`);await page.close();
 }
}finally{await browser.close();server.close();}
