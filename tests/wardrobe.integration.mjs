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
try{
 for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
  const page=await browser.newPage({viewport,acceptDownloads:true}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(url);await page.waitForSelector('.lp-pet');await page.click('#lp-wand-entry');
  assert.equal(await page.locator('.lp-card').first().getAttribute('data-pet'),'梨梨兔兔');
  await page.getByRole('button',{name:'梨梨兔兔后移',exact:true}).click();assert.equal(await page.locator('.lp-card').nth(1).getAttribute('data-pet'),'梨梨兔兔');assert.equal(await page.locator('.lp-pet').count(),2);
  await page.evaluate(()=>window.__liPetWithLumi.setName('梨梨兔兔','小梨'));
  await page.getByRole('button',{name:'换装动作',exact:true}).click();
  await page.getByLabel('换装伙伴',{exact:true}).selectOption('梨梨兔兔');
  // Per-pet interaction costumes share the existing combination storage and survive reload.
  const pair='千千猫猫-梨梨兔兔',interactionSelect=page.getByLabel('替换动作',{exact:true});
  await interactionSelect.selectOption(pair);
  assert.ok((await interactionSelect.locator('option:checked').textContent()).includes('千千猫猫'));
  assert.equal(await interactionSelect.locator('option[value="千千哥哥-煤球猫猫"]').count(),0);
  assert.equal(await interactionSelect.locator('option[value="梨梨兔兔-灰鸮g老师"]').count(),1);
  await page.getByLabel('图片链接',{exact:true}).fill(url+'/renamed-extension/assets/'+encodeURIComponent('梨梨兔兔')+'/'+encodeURIComponent('待机')+'.gif');await page.getByRole('button',{name:'保存图片链接',exact:true}).click();
  await page.waitForFunction(key=>testContext.extensionSettings.li_pet_with_lumi.skins['组合']?.[key]?.startsWith('http'),pair);
  await page.getByLabel('换装伙伴',{exact:true}).selectOption('千千猫猫');await interactionSelect.selectOption(pair);assert.ok((await interactionSelect.locator('option:checked').textContent()).includes('小梨'));assert.ok((await page.getByLabel('图片链接',{exact:true}).inputValue()).startsWith('http'));
  await page.getByLabel('本地上传图片',{exact:true}).setInputFiles(path.join(root,'assets/梨梨兔兔/跳舞.gif'));await page.waitForFunction(key=>testContext.extensionSettings.li_pet_with_lumi.skins['组合']?.[key]?.startsWith('local:'),pair);
  await page.reload();await page.waitForSelector('.lp-pet');await page.evaluate(()=>window.__liPetWithLumi.openWardrobe('千千猫猫'));assert.equal(await page.getByLabel('换装伙伴',{exact:true}).inputValue(),'千千猫猫');await interactionSelect.selectOption(pair);
  await page.waitForFunction(()=>document.querySelector('.lp-costume-preview').src.startsWith('blob:')&&document.querySelector('.lp-costume-preview').naturalWidth>0);
  await page.evaluate(()=>window.__liPetWithLumi.hug(false));await page.waitForFunction(()=>document.querySelector('.lp-combo img')?.src.startsWith('blob:'));await page.locator('.lp-combo').click();
  await page.evaluate(()=>window.__liPetWithLumi.openWardrobe('千千猫猫'));await page.getByLabel('换装伙伴',{exact:true}).selectOption('组合');await interactionSelect.selectOption(pair);await page.getByRole('button',{name:'恢复此动作',exact:true}).click();await page.waitForFunction(key=>!testContext.extensionSettings.li_pet_with_lumi.skins['组合']?.[key],pair);
  await page.getByLabel('换装伙伴',{exact:true}).selectOption('梨梨兔兔');await interactionSelect.selectOption(pair);await page.waitForFunction(()=>!document.querySelector('.lp-costume-preview').src.startsWith('blob:'));

  // A custom solo animation appears on the home card and survives reload with order.
  await interactionSelect.selectOption('跳舞');await page.getByLabel('本地上传图片',{exact:true}).setInputFiles(path.join(root,'assets/梨梨兔兔/敲代码.gif'));
  await page.waitForFunction(()=>testContext.extensionSettings.li_pet_with_lumi.skins['梨梨兔兔']?.['跳舞']?.startsWith('local:'));
  await page.getByLabel('主页展示动作',{exact:true}).selectOption('跳舞');await page.getByRole('button',{name:'小小伙伴',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.lp-card[data-pet="梨梨兔兔"] img').src.startsWith('blob:'));
  await page.reload();await page.waitForSelector('.lp-pet');await page.click('#lp-wand-entry');assert.equal(await page.locator('.lp-card').nth(1).getAttribute('data-pet'),'梨梨兔兔');
  await page.waitForFunction(()=>document.querySelector('.lp-card[data-pet="梨梨兔兔"] img').src.startsWith('blob:'));
  await page.getByRole('button',{name:'换装动作',exact:true}).click();await page.getByLabel('换装伙伴',{exact:true}).selectOption('梨梨兔兔');assert.equal(await page.getByLabel('主页展示动作',{exact:true}).inputValue(),'跳舞');
  await interactionSelect.selectOption(pair);await page.getByLabel('本地上传图片',{exact:true}).setInputFiles(path.join(root,'assets/梨梨兔兔/跳舞.gif'));await page.waitForFunction(key=>testContext.extensionSettings.li_pet_with_lumi.skins['组合']?.[key]?.startsWith('local:'),pair);
  await page.locator('.lp-outfits summary').click();await page.getByLabel('皮肤套装名称',{exact:true}).fill('小梨全套');await page.getByRole('button',{name:'保存整套到本地',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[aria-label="本地已存皮肤"]').options.length===1);
  const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'导出当前整套',exact:true}).click();const download=await downloadEvent,file=await download.path();const exported=JSON.parse(await readFile(file,'utf8'));assert.equal(exported.showcase['梨梨兔兔'],'跳舞');assert.ok(exported.images['组合'][pair].data);assert.ok(exported.images['梨梨兔兔']['跳舞'].data);
  await page.getByRole('button',{name:'恢复此动作',exact:true}).click();await page.waitForFunction(key=>!testContext.extensionSettings.li_pet_with_lumi.skins['组合']?.[key],pair);
  await page.getByLabel('主页展示动作',{exact:true}).selectOption('待机');await page.getByRole('button',{name:'应用所选套装',exact:true}).click();await page.waitForFunction(key=>testContext.extensionSettings.li_pet_with_lumi.skins['组合']?.[key]?.startsWith('local:')&&testContext.extensionSettings.li_pet_with_lumi.showcase['梨梨兔兔']==='跳舞',pair);
  await page.getByLabel('导入整套皮肤',{exact:true}).setInputFiles({name:'outfit.json',mimeType:'application/json',buffer:await readFile(file)});await page.waitForFunction(()=>!document.querySelector('[aria-label="导入整套皮肤"]').disabled);
  assert.equal(await page.getByLabel('主页展示动作',{exact:true}).inputValue(),'跳舞');
  await page.screenshot({path:`${screenshots}/outfits-${viewport.width}.png`});
  // Invalid imports do not replace the current outfit.
  const before=await page.evaluate(()=>JSON.stringify(testContext.extensionSettings.li_pet_with_lumi.skins));
  await page.getByLabel('导入整套皮肤',{exact:true}).setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"format":"wrong"}')});await page.waitForFunction(()=>!document.querySelector('[aria-label="导入整套皮肤"]').disabled);assert.equal(await page.evaluate(()=>JSON.stringify(testContext.extensionSettings.li_pet_with_lumi.skins)),before);
  await page.reload();await page.waitForSelector('.lp-pet');await page.evaluate(()=>window.__liPetWithLumi.openWardrobe('梨梨兔兔'));await page.locator('.lp-outfits summary').click();await page.waitForFunction(()=>document.querySelector('[aria-label="本地已存皮肤"]').options.length===1);
  await page.getByRole('button',{name:'删除所选套装',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[aria-label="本地已存皮肤"]').options.length===0);assert.ok(await page.evaluate(()=>testContext.extensionSettings.li_pet_with_lumi.skins['梨梨兔兔']['跳舞']));
  assert.deepEqual(errors,[]);console.log(`PASS ${viewport.width}px: interaction costumes, shared storage, preview, live combo, reload, restore, home showcase, ordering, local outfits, portable export/import, invalid import, delete`);await page.close();
 }
}finally{await browser.close();server.close();}
