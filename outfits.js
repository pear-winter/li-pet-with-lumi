import { normalizeCustomization, actionsFor } from './customization.js';
import { CATALOG } from './catalog.js';
const LIMIT=128*1024*1024;
const MIME=new Set(['image/png','image/jpeg','image/gif','image/webp','image/avif']);
function base64(bytes){let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(text);}
export async function packOutfit(settings,costumes,name){
  const images={},cache=new Map();let size=0;
  for(const[pet,actions]of Object.entries(settings.skins))for(const[action,source]of Object.entries(actions)){
    if(!cache.has(source)){
      const url=await costumes.load(source);if(!url)throw Error('有本地图片已经丢失，请重新上传后保存整套。');
      let response;try{response=await fetch(url,{signal:AbortSignal.timeout(15000)});}catch{throw Error('有图片链接不允许下载。请把该图片本地上传后，再保存整套。');}
      if(!response.ok)throw Error('有图片链接无法下载，请检查后重试。');
      const blob=await response.blob();if(!MIME.has(blob.type)||blob.size>8*1024*1024)throw Error('请使用 8MB 以内的 PNG/JPG/GIF/WebP/AVIF 图片。');
      size+=blob.size;if(size>LIMIT*.7)throw Error('整套图片过大，请缩小图片后重试。');
      cache.set(source,{type:blob.type,data:base64(new Uint8Array(await blob.arrayBuffer()))});
    }
    (images[pet]??={})[action]=cache.get(source);
  }
  const bundle={format:'li-pet-outfit',version:1,name:String(name||'我的皮肤').slice(0,60),images,showcase:{...settings.showcase}};
  const blob=new Blob([JSON.stringify(bundle)],{type:'application/json'});if(blob.size>LIMIT)throw Error('整套文件超过 128MB，请缩小图片后重试。');return blob;
}
export async function applyOutfit(blob,{settings,costumes,save,refresh}){
  if(blob.size>LIMIT)throw Error('整套文件不能超过 128MB。');
  let bundle;try{bundle=JSON.parse(await blob.text());}catch{throw Error('无法读取皮肤文件。');}
  if(bundle?.format!=='li-pet-outfit'||bundle.version!==1||!bundle.images||typeof bundle.images!=='object'||Array.isArray(bundle.images))throw Error('请选择梨间雪导出的整套皮肤文件。');
  const skins={},created=[];let total=0;
  try{
    for(const[pet,actions]of Object.entries(bundle.images)){
      const allowed=pet==='组合'?CATALOG.combos:Object.hasOwn(CATALOG.pets,pet)?actionsFor(pet):null;
      if(!allowed||!actions||typeof actions!=='object'||Array.isArray(actions))throw Error('皮肤文件包含未知伙伴。');
      for(const[action,image]of Object.entries(actions)){
        if(!allowed.includes(action)||!image||!MIME.has(image.type)||typeof image.data!=='string'||image.data.length>12*1024*1024)throw Error('皮肤文件包含无效动作或图片。');
        const text=atob(image.data),bytes=Uint8Array.from(text,c=>c.charCodeAt(0));total+=bytes.length;if(total>LIMIT)throw Error('图片总大小超出限制。');
        const source=await costumes.put(new File([bytes],'costume',{type:image.type}));created.push(source);(skins[pet]??={})[action]=source;
      }
    }
  }catch(error){await Promise.allSettled(created.map(source=>costumes.remove(source)));throw error;}
  const showcase={};for(const name of Object.keys(CATALOG.pets))if(actionsFor(name).includes(bundle.showcase?.[name]))showcase[name]=bundle.showcase[name];
  const oldSources=[...new Set(Object.values(settings.skins).flatMap(actions=>Object.values(actions)))];
  settings.skins=normalizeCustomization({skins}).skins;settings.showcase=showcase;save();await refresh();await Promise.allSettled(oldSources.map(source=>costumes.remove(source)));return bundle.name||'我的皮肤';
}
async function localOutfits(mode,operation){
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('li-pet-outfits',1);request.onupgradeneeded=()=>request.result.createObjectStore('sets',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  try{return await new Promise((resolve,reject)=>{const tx=db.transaction('sets',mode),request=operation(tx.objectStore('sets'));let result;request.onsuccess=()=>result=request.result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}
}
export function renderOutfits({page,settings,costumes,save,refresh,tell}){
  const panel=document.createElement('details');panel.className='lp-outfits';panel.innerHTML='<summary>整套皮肤 · 保存 / 导入 / 导出</summary><label class="lp-field">皮肤套装名称<input aria-label="皮肤套装名称" maxlength="60" placeholder="我的新衣服"></label><div class="lp-row"></div><label class="lp-field">本地已存皮肤<select aria-label="本地已存皮肤"></select></label><div class="lp-row"></div><label class="lp-field">导入整套皮肤<input aria-label="导入整套皮肤" type="file" accept=".json,application/json"></label><p class="lp-hint">保存已替换的单宠、互动图片和主页展示动作。应用或导入会替换当前整套换装；未替换的动作使用内置素材。套装保存在当前浏览器，导出文件可带到其他设备。</p>';
  page.append(panel);const name=panel.querySelector('input'),select=panel.querySelector('select'),upload=panel.querySelector('input[type=file]'),rows=panel.querySelectorAll('.lp-row');
  const list=async()=>{const previous=select.value,sets=await localOutfits('readonly',s=>s.getAll());select.replaceChildren();for(const set of sets){const option=document.createElement('option');option.value=set.id;option.textContent=set.name;select.append(option);}if(sets.some(s=>s.id===previous))select.value=previous;};
  let busy=false;
  async function run(fn){if(busy)return;busy=true;for(const n of panel.querySelectorAll('button,input,select'))n.disabled=true;try{await fn();}catch(e){tell(e.message||'皮肤操作失败，请重试。');}finally{busy=false;for(const n of panel.querySelectorAll('button,input,select'))n.disabled=false;upload.value='';}}
  const button=(row,text,fn)=>{const b=document.createElement('button');b.type='button';b.className='lp-button';b.textContent=text;b.onclick=()=>run(fn);row.append(b);};
  button(rows[0],'保存整套到本地',async()=>{const title=name.value.trim()||'我的皮肤',blob=await packOutfit(settings,costumes,title);await localOutfits('readwrite',s=>s.put({id:crypto.randomUUID(),name:title,blob}));await list();tell('整套皮肤已保存到本地。');});
  button(rows[0],'导出当前整套',async()=>{const blob=await packOutfit(settings,costumes,name.value),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='li-pet-outfit.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);tell('整套皮肤已导出，图片已包含在文件中。');});
  button(rows[1],'应用所选套装',async()=>{if(!select.value){tell('请先保存一套皮肤。');return;}const set=await localOutfits('readonly',s=>s.get(select.value));await applyOutfit(set.blob,{settings,costumes,save,refresh});tell('已应用 '+set.name);});
  button(rows[1],'删除所选套装',async()=>{if(!select.value)return;await localOutfits('readwrite',s=>s.delete(select.value));await list();tell('已删除本地套装，当前换装保留。');});
  upload.onchange=()=>{const file=upload.files[0];if(file)run(async()=>{const title=await applyOutfit(file,{settings,costumes,save,refresh});name.value=title;tell('已导入 '+title+'，可继续保存整套到本地。');});};
  list().catch(()=>tell('本地套装暂时无法读取。'));
}
