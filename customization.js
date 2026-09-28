import { CATALOG } from './catalog.js';
export const BEHAVIORS = {
  generation:['生成 / 重抽回复','敲代码'], typing:['在输入框打字','敲代码'],
  atelier:['梨梨画室工作中','敲代码'], meow:['喵喵星绘工作中','敲代码'],
  reading:['打开工作台','互动_看书'], music:['音乐播放','听音乐'],
  finish:['回复生成结束','开心蹦蹦'], stop:['停止生成','待机'], chatChange:['切换聊天','打招呼'],
  feed:['喂食','吃饭'], pet:['摸摸','摸摸头'], wake:['叫醒','打招呼'],
  idle:['待机','待机'], sleep:['睡觉','睡觉'], walkLeft:['向左散步','向左走'], walkRight:['向右散步','向右走'],
  fall:['下落','掉落'], land:['落地','摔趴趴'],
};
export const actionsFor=name=>[...new Set([...(CATALOG.pets[name]||[]),'听音乐','摸摸头'])];
export const costumeActionsFor=name=>['通用皮肤',...actionsFor(name)];
export function skinSource(settings,name,action){const skins=settings.skins[name]||{};if(name==='组合')return skins[action];return skins[action]||skins['通用皮肤']||skins[settings.showcase[name]||'待机']||skins['待机'];}
export function validSource(value){
  if(typeof value!=='string'||value.length>4096)return '';
  if(/^local:[a-f0-9-]{36}$/i.test(value))return value;
  try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}
}
export function normalizeCustomization(v){
  const skins={},behaviorMap={},actionSizes={};
  for(const name of [...Object.keys(CATALOG.pets),'组合']){
    const actions=name==='组合'?CATALOG.combos:costumeActionsFor(name);const source=v.skins?.[name]|| (name==='千千哥哥'?v.skins?.['哥哥狗狗']:null);
    for(const action of actions){const size=v.actionSizes?.[name]?.[action];if(Number.isFinite(size))(actionSizes[name]??={})[action]=Math.max(48,Math.min(360,size));const url=validSource(source?.[action]);if(url)(skins[name]??={})[action]=url;}
    if(name==='组合')continue;
    for(const event of Object.keys(BEHAVIORS)){const a=v.behaviorMap?.[name]?.[event];if(a==='__none__'||actionsFor(name).includes(a))(behaviorMap[name]??={})[event]=a;}
  }
  return {skins,behaviorMap,actionSizes};
}
export function behaviorAction(settings,name,event){
  const saved=settings.behaviorMap?.[name]?.[event];
  if(saved==='__none__')return '';
  if(saved&&actionsFor(name).includes(saved))return saved;
  if(event==='reading'&&name!=='灰鸮g老师')return '';
  return BEHAVIORS[event]?.[1]||'待机';
}
// Files stay in this browser. Only opaque references live in the user's extension settings.
export function createCostumeStore(){
  let dbPromise,closed=false;const urls=new Map();
  const db=()=>dbPromise??=new Promise((resolve,reject)=>{const r=indexedDB.open('li-pet-costumes',1);r.onupgradeneeded=()=>r.result.createObjectStore('images');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  async function transaction(mode,fn){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('images',mode),request=fn(tx.objectStore('images'));let value;request.onsuccess=()=>value=request.result;tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('图片保存失败'));});}
  return {
    async put(file){if(!['image/png','image/jpeg','image/gif','image/webp','image/avif'].includes(file.type)||file.size>8*1024*1024)throw Error('请选择 8MB 以内的 PNG、JPG、GIF、WebP 或 AVIF 图片。');
      const probe=URL.createObjectURL(file);try{await new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=()=>reject(Error('这张图片无法读取。'));img.src=probe;});}finally{URL.revokeObjectURL(probe);}
      const key='local:'+crypto.randomUUID();await transaction('readwrite',s=>s.put(file,key));return key;},
    async load(source){if(!source?.startsWith('local:'))return source;if(urls.has(source))return urls.get(source);const blob=await transaction('readonly',s=>s.get(source));if(!blob||closed)return '';if(urls.has(source))return urls.get(source);const url=URL.createObjectURL(blob);urls.set(source,url);return url;},
    async remove(source){if(!source?.startsWith('local:'))return;await transaction('readwrite',s=>s.delete(source));if(urls.has(source))URL.revokeObjectURL(urls.get(source));urls.delete(source);},
    dispose(){closed=true;for(const url of urls.values())URL.revokeObjectURL(url);urls.clear();dbPromise?.then(d=>d.close()).catch(()=>{});},
  };
}
