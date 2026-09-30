import { normalizeCustomization, actionsFor, resolvePetAction } from './customization.js';
import { BUILTIN_SKINS, builtinURL } from './builtins.js';
import { CATALOG, CHENYE_FILES, COMBO_FILES, DEFAULT_LABELS } from './catalog.js';

export const PETS = Object.keys(CATALOG.pets);
export const HOME_ORDER=['梨梨兔兔','梨梨哥哥','陈野','千千猫猫','千千哥哥','酒酒狐狸','砂金','煤球猫猫','灰鸮g老师'];
export const DEFAULTS = Object.freeze({enabled:true,pets:['梨梨兔兔','千千猫猫'],size:100,speed:18,wander:true,bubbles:true,react:true,name:'梨梨',positions:{},petNames:{},gravity:false,theme:"tavern",customCss:"",music:true,playful:true,actionMode:'timed',actionSeconds:120});
const forbidden = [['梨梨哥哥','千千猫猫'],['梨梨兔兔','千千哥哥'],['梨梨哥哥','煤球猫猫'],['梨梨哥哥','酒酒狐狸']];
export const clamp = (n, min, max) => Math.min(Math.max(Number.isFinite(Number(n)) ? Number(n) : min,min),Math.max(min,max));
export function normalize(value = {}) {
  const v = value && typeof value === 'object' ? value : {};
  const pets = Array.isArray(v.pets) ? [...new Set(v.pets.map(p=>p==='哥哥狗狗'?'千千哥哥':p).filter(p=>PETS.includes(p)))] : [...DEFAULTS.pets];
  const oldDefault=['梨梨兔兔','千千猫猫','千千哥哥','梨梨哥哥','煤球猫猫','酒酒狐狸','灰鸮g老师','陈野'];
  const storedOrder=JSON.stringify(v.homeOrder)===JSON.stringify(oldDefault)?[]:v.homeOrder;
  const homeOrder=[...new Set([...(Array.isArray(storedOrder)?storedOrder:[]),...HOME_ORDER])].filter(n=>PETS.includes(n));
  const showcase={};for(const name of PETS)if(actionsFor(name).includes(v.showcase?.[name]))showcase[name]=v.showcase[name];
  const petSizes={};for(const name of PETS)if(Number.isFinite(v.petSizes?.[name]))petSizes[name]=clamp(v.petSizes[name],48,240);
  const positions={},petNames={};
  for(const name of PETS){const value=v.petNames?.[name];if(typeof value==='string'&&value.trim())petNames[name]=value.trim().slice(0,32);}
  const storedPositions={...v.positions};if(!storedPositions['千千哥哥']&&storedPositions['哥哥狗狗'])storedPositions['千千哥哥']=storedPositions['哥哥狗狗'];
  for (const p of PETS) if (storedPositions[p] && Number.isFinite(storedPositions[p].x) && Number.isFinite(storedPositions[p].y)) positions[p]={x:clamp(storedPositions[p].x,0,1),y:clamp(storedPositions[p].y,0,1)};
  return {...DEFAULTS,...normalizeCustomization(v),actionMode:['once','timed','until-cancel'].includes(v.actionMode)?v.actionMode:'timed',actionSeconds:clamp(v.actionSeconds??120,1,86400),...Object.fromEntries(['enabled','wander','bubbles','react','gravity','music','playful'].map(k=>[k,typeof v[k]==='boolean'?v[k]:DEFAULTS[k]])),pets,size:clamp(v.size??100,64,160),speed:clamp(v.speed??18,0,40),name:typeof v.name==='string'?v.name.slice(0,24):'梨梨',positions,petNames,petSizes,homeOrder,showcase,theme:['tavern','mono','pink'].includes(v.theme)?v.theme:'tavern',customCss:typeof v.customCss==='string'?v.customCss.slice(0,50000):''};
}
export const petLabel=(settings,name)=>settings.petNames?.[name]||DEFAULT_LABELS[name]||name;
// Special scenes have explicit names and never enter automatic hugs/stacks.
export function comboNames(key){return CATALOG.combos.includes(key)?key.split('_')[0].split('-'):[];}
export function comboKind(key){const suffix=key.slice(key.indexOf('_')+1);return key.includes('_')?(suffix==='2'?'叠叠乐':suffix):comboNames(key).includes('灰鸮g老师')?'一起看书':'贴贴';}
export function combosFor(name,available=PETS){return CATALOG.combos.filter(key=>{const names=comboNames(key);return names.includes(name)&&names.every(n=>available.includes(n));});}
export function comboFor(names, stack=false) {
  const unique=[...new Set(names)];
  if(unique.length<2 || unique.some(n=>!PETS.includes(n)))return null;
  if(unique.includes('灰鸮g老师') && (stack || unique.length>2))return null;
  if(unique.length===2 && forbidden.some(pair=>pair.every(p=>unique.includes(p))))return null;
  const key=unique.sort((a,b)=>PETS.indexOf(a)-PETS.indexOf(b)).join('-')+(stack?'_2':'');
  return CATALOG.combos.includes(key)?key:null;
}
export function chooseState({manual='',busy=false,music=false,idle=0,walking=false,direction=1}={}) {
  if(manual)return manual;
  if(music)return '听音乐';
  if(busy)return '敲代码';
  if(idle>60000)return '睡觉';
  if(walking)return direction<0?'向左走':'向右走';
  return '待机';
}
export function petAsset(name,action,classic=false) {
  const skin=BUILTIN_SKINS[name];
  if(skin&&!classic)return builtinURL(skin.actions[action]||skin.actions['待机']);
  action=resolvePetAction(name,action);
  if(name==='陈野')return new URL(`assets/${encodeURIComponent(name)}/${encodeURIComponent(CHENYE_FILES[action])}`,import.meta.url).href;
  if(action==='听音乐')action='跳舞';
  if(action==='摸摸头'&&!CATALOG.pets[name]?.includes(action))action=name==='灰鸮g老师'?'互动_扶眼镜1':'害羞';
  const safeAction=CATALOG.pets[name]?.includes(action)?action:'待机';
  return new URL(`assets/${encodeURIComponent(name.replace("千千哥哥","哥哥狗狗").replace('酒酒狐狸','99狐狐'))}/${encodeURIComponent(safeAction)}.gif`,import.meta.url).href;
}
export const comboAsset = key => key==='酒酒狐狸-砂金'?builtinURL('assets/skins/aventurine/with-jiujiu.svg'):new URL(`assets/${COMBO_FILES[key]?COMBO_FILES[key].split('/').map(encodeURIComponent).join('/'):`${encodeURIComponent('贴贴')}/${encodeURIComponent(key.replaceAll('千千哥哥','哥哥狗狗').replaceAll('酒酒狐狸','99狐狐'))}.gif`}`,import.meta.url).href;
