import { normalizeCustomization } from './customization.js';
import { CATALOG } from './catalog.js';

export const PETS = Object.keys(CATALOG.pets);
export const DEFAULTS = Object.freeze({enabled:true,pets:['梨梨兔兔','千千猫猫'],size:100,speed:18,wander:true,bubbles:true,react:true,name:'梨梨',positions:{},petNames:{},gravity:false,theme:"tavern",customCss:"",music:true,playful:true,actionMode:'timed',actionSeconds:120});
const forbidden = [['梨梨哥哥','千千猫猫'],['梨梨兔兔','千千哥哥'],['梨梨哥哥','煤球猫猫']];
export const clamp = (n, min, max) => Math.min(Math.max(Number.isFinite(Number(n)) ? Number(n) : min,min),Math.max(min,max));
export function normalize(value = {}) {
  const v = value && typeof value === 'object' ? value : {};
  const pets = Array.isArray(v.pets) ? [...new Set(v.pets.map(p=>p==='哥哥狗狗'?'千千哥哥':p).filter(p=>PETS.includes(p)))] : [...DEFAULTS.pets];
  const positions={},petNames={};
  for(const name of PETS){const value=v.petNames?.[name];if(typeof value==='string'&&value.trim())petNames[name]=value.trim().slice(0,32);}
  const storedPositions={...v.positions};if(!storedPositions['千千哥哥']&&storedPositions['哥哥狗狗'])storedPositions['千千哥哥']=storedPositions['哥哥狗狗'];
  for (const p of PETS) if (storedPositions[p] && Number.isFinite(storedPositions[p].x) && Number.isFinite(storedPositions[p].y)) positions[p]={x:clamp(storedPositions[p].x,0,1),y:clamp(storedPositions[p].y,0,1)};
  return {...DEFAULTS,...normalizeCustomization(v),actionMode:['once','timed','until-cancel'].includes(v.actionMode)?v.actionMode:'timed',actionSeconds:clamp(v.actionSeconds??120,1,86400),...Object.fromEntries(['enabled','wander','bubbles','react','gravity','music','playful'].map(k=>[k,typeof v[k]==='boolean'?v[k]:DEFAULTS[k]])),pets,size:clamp(v.size??100,64,160),speed:clamp(v.speed??18,0,40),name:typeof v.name==='string'?v.name.slice(0,24):'梨梨',positions,petNames,theme:['tavern','mono','pink'].includes(v.theme)?v.theme:'tavern',customCss:typeof v.customCss==='string'?v.customCss.slice(0,50000):''};
}
export const petLabel=(settings,name)=>settings.petNames?.[name]||name;
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
export function petAsset(name,action) {
  if(action==='听音乐')action='跳舞';
  if(action==='摸摸头'&&!CATALOG.pets[name]?.includes(action))action=name==='灰鸮g老师'?'互动_扶眼镜1':'害羞';
  const safeAction=CATALOG.pets[name]?.includes(action)?action:'待机';
  return new URL(`assets/${encodeURIComponent(name.replace("千千哥哥","哥哥狗狗"))}/${encodeURIComponent(safeAction)}.gif`,import.meta.url).href;
}
export const comboAsset = key => new URL(`assets/${encodeURIComponent('贴贴')}/${encodeURIComponent(key.replaceAll("千千哥哥","哥哥狗狗"))}.gif`,import.meta.url).href;
