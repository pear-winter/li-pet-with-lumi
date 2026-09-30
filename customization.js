import { BUILTIN_SKINS, QILI_SCHOOL_SKIN, builtinURL } from './builtins.js';
import { CATALOG, COMBO_FILES } from './catalog.js';
export const BEHAVIORS = {
  generation:['生成 / 重抽回复','敲代码'], typing:['在输入框打字','敲代码'],
  atelier:['梨梨画室工作中','敲代码'], meow:['喵喵星绘工作中','敲代码'],
  reading:['打开工作台','互动_看书'], music:['音乐播放','听音乐'],
  finish:['回复生成结束','开心蹦蹦'], stop:['停止生成','待机'], chatChange:['切换聊天','打招呼'],
  feed:['喂食','吃饭'], pet:['摸摸','摸摸头'], wake:['叫醒','打招呼'],
  idle:['待机','待机'], sleep:['睡觉','睡觉'], walkLeft:['向左散步','向左走'], walkRight:['向右散步','向右走'],
  fall:['下落','掉落'], land:['落地','摔趴趴'],
};
// 陈野只列出素材中真实存在的动作；运行时的通用状态映射到这些原动作。
const CHENYE_ALIASES = {'待机':'发呆','向左走':'爬爬_向左','向右走':'爬爬_向右','睡觉':'趴着睡','敲代码':'打工中','吃饭':'吃饭团','开心蹦蹦':'开心','害羞':'害羞捂脸','打招呼':'嗨','听音乐':'听歌'};
export const idleAction=name=>name==='陈野'?'发呆':'待机';
export const resolvePetAction=(name,action)=>name==='陈野'?(CATALOG.pets[name].includes(action)?action:CHENYE_ALIASES[action]||'发呆'):action;
export const actionsFor=name=>name==='陈野'?[...CATALOG.pets[name]]:[...new Set([...(CATALOG.pets[name]||[]),'听音乐','摸摸头'])];
export const costumeActionsFor=name=>['通用皮肤',...actionsFor(name)];
export function touchSkin(settings,name){
 settings.skinChangedAt??={};settings.skinChangedAt[name]=Math.max(Date.now(),...Object.values(settings.skinChangedAt).map(Number).filter(Number.isFinite))+1;
}
export function builtinOptions(name){return BUILTIN_SKINS[name]?[{id:'human',name:name==='梨梨兔兔'?'骇客梨梨':'默认人形皮肤'},...(name==='梨梨兔兔'?[{id:'school',name:'校服梨梨'}]:[]),...(name==='砂金'?[]:[{id:'classic',name:'原版皮肤'}])]:[];}
export function selectBuiltin(settings,name,id){
 if(!builtinOptions(name).some(o=>o.id===id))throw Error('没有这套内置皮肤。');
 settings.builtinSkins??={};settings.builtinSkins[name]=id;delete settings.skins[name];
 if(settings.skinCombos)delete settings.skinCombos[name];touchSkin(settings,name);
}
export function skinSource(settings,name,action){
 const skins=settings.skins[name]||{};
 if(name==='组合'){
   const members=action.split('_')[0].split('-');
   const candidates=members.map(p=>({source:settings.skinCombos?.[p]?.[action]||
     (p==='梨梨兔兔'&&settings.builtinSkins?.[p]==='school'&&QILI_SCHOOL_SKIN.combos[action]?builtinURL(QILI_SCHOOL_SKIN.combos[action]):BUILTIN_SKINS[p]?defaultComboSource(action,settings.builtinSkins?.[p]==='classic'):null),time:settings.skinChangedAt?.[p]||0,custom:!!settings.skinCombos?.[p]?.[action]}));
   if(skins[action])candidates.push({source:skins[action],time:settings.skinChangedAt?.['组合']||0,custom:true});
   return candidates.filter(c=>c.source).sort((a,b)=>b.time-a.time||Number(b.custom)-Number(a.custom))[0]?.source;
 }
 return skins[resolvePetAction(name,action)]||skins['通用皮肤']||skins[settings.showcase[name]||idleAction(name)]||skins[idleAction(name)]||(name==='梨梨兔兔'&&settings.builtinSkins?.[name]==='school'?builtinURL(QILI_SCHOOL_SKIN.actions[action]||QILI_SCHOOL_SKIN.actions['待机']):undefined);
}
export function defaultComboSource(key,classic=false){
 const supplied=!classic&&Object.values(BUILTIN_SKINS).map(s=>s.combos[key]).find(Boolean);
 if(supplied)return builtinURL(supplied);
 if(key==='酒酒狐狸-砂金')return builtinURL('assets/skins/aventurine/with-jiujiu.svg');
 const path=COMBO_FILES[key]||'贴贴/'+key.replaceAll('千千哥哥','哥哥狗狗').replaceAll('酒酒狐狸','99狐狐')+'.gif';
 return builtinURL('assets/'+path.split('/').map(encodeURIComponent).join('/'));
}

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
  const builtinSkins={},skinChangedAt={},skinCombos={};
  for(const name of [...Object.keys(CATALOG.pets),'组合']){
    if(builtinOptions(name).some(o=>o.id===v.builtinSkins?.[name]))builtinSkins[name]=v.builtinSkins[name];
    if(Number.isSafeInteger(v.skinChangedAt?.[name])&&v.skinChangedAt[name]>=0)skinChangedAt[name]=v.skinChangedAt[name];
    if(name!=='组合')for(const key of CATALOG.combos)if(key.split('_')[0].split('-').includes(name)){
      const source=validSource(v.skinCombos?.[name]?.[key]);if(source)(skinCombos[name]??={})[key]=source;
    }
  }
  return {skins,behaviorMap,actionSizes,builtinSkins,skinChangedAt,skinCombos};
}
export function behaviorAction(settings,name,event){
  const saved=settings.behaviorMap?.[name]?.[event];
  if(saved==='__none__')return '';
  if(saved&&actionsFor(name).includes(saved))return saved;
  if(event==='reading'&&name!=='灰鸮g老师')return '';
  if(name==='陈野'){
    if(event==='typing')return '聊天中';
    if(event==='wake')return '惊醒';
    if(event==='fall'||event==='land')return ''; // 没有掉落／摔趴素材，物理移动期间保持待机。
    return resolvePetAction(name,BEHAVIORS[event]?.[1]);
  }
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
