import { normalizeCustomization, actionsFor, costumeActionsFor, touchSkin, skinSource } from './customization.js';
import { CATALOG } from './catalog.js';
import { petAsset, comboAsset } from './core.js';
const LIMIT=128*1024*1024;
const MIME=new Set(['image/png','image/jpeg','image/gif','image/webp','image/avif']);
function base64(bytes){let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(text);}
export async function packOutfit(settings,costumes,name,character=null){
  const images={},cache=new Map();let size=0;
  const sources=character?{[character]:Object.fromEntries(actionsFor(character).map(action=>[action,skinSource(settings,character,action)||petAsset(character,action,settings.builtinSkins?.[character]==='classic')])),
    '组合':Object.fromEntries(CATALOG.combos.filter(key=>key.split('_')[0].split('-').includes(character)).map(key=>[key,skinSource(settings,'组合',key)||comboAsset(key)]))}:settings.skins;
  for(const[pet,actions]of Object.entries(sources))for(const[action,source]of Object.entries(actions)){
    if(!cache.has(source)){
      const url=await costumes.load(source);if(!url)throw Error('有本地图片已经丢失，请重新上传后保存整套。');
      let response;try{response=await fetch(url,{signal:AbortSignal.timeout(15000)});}catch{throw Error('有图片链接不允许下载。请把该图片本地上传后，再保存整套。');}
      if(!response.ok)throw Error('有图片链接无法下载，请检查后重试。');
      let blob=await response.blob();
      if(blob.type==='image/svg+xml'||url.endsWith('.svg')){
        const text=await blob.text(),matches=[...text.matchAll(/data:image\/gif;base64,([A-Za-z0-9+/=]+)/g)];
        if(matches.length===1)blob=new Blob([Uint8Array.from(atob(matches[0][1]),c=>c.charCodeAt(0))],{type:'image/gif'});
        else { if(pet==='组合')continue;throw Error('此组合请单独上传 GIF 后再导出。'); }
      }
      if(!MIME.has(blob.type)||blob.size>8*1024*1024)throw Error('请使用 8MB 以内的 PNG/JPG/GIF/WebP/AVIF 图片。');
      size+=blob.size;if(size>LIMIT*.7)throw Error('整套图片过大，请缩小图片后重试。');
      cache.set(source,{type:blob.type,data:base64(new Uint8Array(await blob.arrayBuffer()))});
    }
    (images[pet]??={})[action]=cache.get(source);
  }
  const bundle={format:'li-pet-outfit',version:1,character,name:String(name||'我的皮肤').slice(0,60),images,showcase:{...settings.showcase},actionSizes:settings.actionSizes};
  const blob=new Blob([JSON.stringify(bundle)],{type:'application/json'});if(blob.size>LIMIT)throw Error('整套文件超过 128MB，请缩小图片后重试。');return blob;
}
export async function applyOutfit(blob,{settings,costumes,save,refresh}){
  if(blob.size>LIMIT)throw Error('整套文件不能超过 128MB。');
  let bundle;try{bundle=JSON.parse(await blob.text());}catch{throw Error('无法读取皮肤文件。');}
  if(bundle?.format!=='li-pet-outfit'||bundle.version!==1||!bundle.images||typeof bundle.images!=='object'||Array.isArray(bundle.images))throw Error('请选择梨间雪导出的整套皮肤文件。');
  const character=bundle.character||null;if(character&&!Object.hasOwn(CATALOG.pets,character))throw Error('没有这只伙伴。');
  const skins={},created=[];let total=0;
  try{
    for(const[pet,actions]of Object.entries(bundle.images)){
      if(character&&pet!==character&&pet!=='组合')throw Error('这套皮肤包含其他伙伴。');
      const allowed=pet==='组合'?CATALOG.combos:Object.hasOwn(CATALOG.pets,pet)?costumeActionsFor(pet):null;
      if(!allowed||!actions||typeof actions!=='object'||Array.isArray(actions))throw Error('皮肤文件包含未知伙伴。');
      for(const[action,image]of Object.entries(actions)){
        if((character&&pet==='组合'&&!action.split('_')[0].split('-').includes(character))||!allowed.includes(action)||!image||!MIME.has(image.type)||typeof image.data!=='string'||image.data.length>12*1024*1024)throw Error('皮肤文件包含无效动作或图片。');
        const text=atob(image.data),bytes=Uint8Array.from(text,c=>c.charCodeAt(0));total+=bytes.length;if(total>LIMIT)throw Error('图片总大小超出限制。');
        const source=await costumes.put(new File([bytes],'costume',{type:image.type}));created.push(source);(skins[pet]??={})[action]=source;
      }
    }
  }catch(error){await Promise.allSettled(created.map(source=>costumes.remove(source)));throw error;}
  const showcase={};for(const name of Object.keys(CATALOG.pets))if(actionsFor(name).includes(bundle.showcase?.[name]))showcase[name]=bundle.showcase[name];
  if(character){
    settings.skins[character]=normalizeCustomization({skins}).skins[character]||{};
    settings.skinCombos??={};settings.skinCombos[character]=skins['组合']||{};
    settings.actionSizes[character]=normalizeCustomization({actionSizes:bundle.actionSizes}).actionSizes[character]||{};
    if(showcase[character])settings.showcase[character]=showcase[character];
    touchSkin(settings,character);save();await refresh();return bundle.name||'我的皮肤';
  }
  const oldSources=[...new Set(Object.values(settings.skins).flatMap(actions=>Object.values(actions)))];
  settings.actionSizes=normalizeCustomization({actionSizes:bundle.actionSizes}).actionSizes;settings.skins=normalizeCustomization({skins}).skins;settings.showcase=showcase;settings.skinCombos={};for(const name of Object.keys(settings.skins))touchSkin(settings,name);save();await refresh();await Promise.allSettled(oldSources.map(source=>costumes.remove(source)));return bundle.name||'我的皮肤';
}
async function localOutfits(mode,operation){
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('li-pet-outfits',1);request.onupgradeneeded=()=>request.result.createObjectStore('sets',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  try{return await new Promise((resolve,reject)=>{const tx=db.transaction('sets',mode),request=operation(tx.objectStore('sets'));let result;request.onsuccess=()=>result=request.result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}
}
// 0.3.10：本地套装的增删查，面板和梨梨工作台共用
export async function listOutfits(){return ((await localOutfits('readonly',s=>s.getAll()))||[]).map(set=>({id:set.id,name:set.name}));}
export async function saveOutfit(settings,costumes,name,character=null){const title=String(name||'').trim()||'我的皮肤',blob=await packOutfit(settings,costumes,title,character),id=crypto.randomUUID();await localOutfits('readwrite',s=>s.put({id,name:title,blob}));return {id,name:title};}
export async function applySavedOutfit(id,ctx){const set=await localOutfits('readonly',s=>s.get(id));if(!set)throw Error('这套皮肤已经不在了。');await applyOutfit(set.blob,ctx);return set.name;}
export async function deleteOutfit(id){await localOutfits('readwrite',s=>s.delete(id));}
export async function exportOutfit(settings,costumes,name,character=null){const blob=await packOutfit(settings,costumes,name,character);return new File([blob],'li-pet-outfit.json',{type:'application/json'});}

export function renderOutfits({page,settings,costumes,save,refresh,tell,getCharacter=()=>null}){
  const panel=document.createElement('details');panel.className='lp-outfits';
  panel.innerHTML='<summary>当前伙伴整套皮肤 · 保存 / 导入 / 导出</summary><label class="lp-field">皮肤套装名称<input aria-label="皮肤套装名称" maxlength="60" placeholder="我的新衣服"></label><div class="lp-row"></div><label class="lp-field">本地已存皮肤<select aria-label="本地已存皮肤"></select></label><div class="lp-row"></div><div class="lp-row"></div><input aria-label="导入整套皮肤" type="file" accept=".json,application/json" hidden>';
  page.append(panel);const name=panel.querySelector('input'),select=panel.querySelector('select'),upload=panel.querySelector('input[type=file]'),rows=panel.querySelectorAll('.lp-row');
  const list=async()=>{const previous=select.value,sets=await listOutfits();select.replaceChildren();for(const set of sets){const option=document.createElement('option');option.value=set.id;option.textContent=set.name;select.append(option);}if(sets.some(s=>s.id===previous))select.value=previous;};
  let busy=false;
  async function run(fn){if(busy)return;busy=true;for(const n of panel.querySelectorAll('button,input,select'))n.disabled=true;try{await fn();}catch(e){tell(e.message||'皮肤操作失败，请重试。');}finally{busy=false;for(const n of panel.querySelectorAll('button,input,select'))n.disabled=false;upload.value='';}}
  const button=(row,text,fn,raw=false)=>{const b=document.createElement('button');b.type='button';b.className='lp-button';b.textContent=text;b.onclick=raw?fn:()=>run(fn);row.append(b);};
  const ctx={settings,costumes,save,refresh};
  button(rows[0],'保存整套到本地',async()=>{await saveOutfit(settings,costumes,name.value,getCharacter());await list();tell('整套皮肤已保存到本地。');});
  button(rows[0],'导出当前整套',async()=>{const file=await exportOutfit(settings,costumes,name.value,getCharacter()),url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);tell('整套皮肤已导出。');});
  button(rows[1],'应用所选套装',async()=>{if(!select.value){tell('请先保存一套皮肤。');return;}const title=await applySavedOutfit(select.value,ctx);tell('已应用 '+title);});
  button(rows[1],'删除所选套装',async()=>{if(!select.value)return;await deleteOutfit(select.value);await list();tell('已删除本地套装，当前换装保留。');});
  // 0.3.10：导入改成和其他按钮一样的按钮
  button(rows[2],'导入整套皮肤',()=>upload.click(),true);
  upload.onchange=()=>{const file=upload.files[0];if(file)run(async()=>{const title=await applyOutfit(file,ctx);name.value=title;tell('已导入 '+title);});};
  list().catch(()=>tell('本地套装暂时无法读取。'));
}
