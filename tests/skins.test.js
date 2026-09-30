import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalize,HOME_ORDER,petLabel,combosFor} from '../core.js';
import {CATALOG} from '../catalog.js';
import {skinSource,touchSkin,selectBuiltin} from '../customization.js';
test('default order, names, and complete relationship allowlist',()=>{
 const s=normalize();assert.deepEqual(HOME_ORDER.map(n=>petLabel(s,n)),['祈梨','白川','陈野','lumi','lumi哥哥','酒酒','砂金','小黑猫','g老师']);
 const sets=new Set(CATALOG.combos.map(k=>k.split('_')[0].split('-').sort().join('|')));
 assert.deepEqual([...sets].sort(),[
 ['梨梨兔兔','千千猫猫'],['梨梨兔兔','梨梨哥哥'],['梨梨兔兔','陈野'],['梨梨哥哥','陈野'],['千千猫猫','千千哥哥'],['梨梨兔兔','酒酒狐狸'],['酒酒狐狸','砂金'],['梨梨兔兔','梨梨哥哥','陈野'],['千千猫猫','梨梨兔兔','酒酒狐狸']
 ].map(g=>g.sort().join('|')).sort());
 assert.equal(combosFor('煤球猫猫').length,0);assert.equal(combosFor('灰鸮g老师').length,0);
 for(const group of ['千千猫猫-梨梨兔兔','梨梨兔兔-酒酒狐狸','千千猫猫-梨梨兔兔-酒酒狐狸'])assert.equal(CATALOG.combos.filter(k=>k.split('_')[0]===group).length,2);
});
test('latest character outfit wins shared interaction and survives reload',()=>{
 const s=normalize(),key='千千猫猫-梨梨兔兔';s.skinCombos={'梨梨兔兔':{[key]:'https://example.com/qili.gif'},'千千猫猫':{[key]:'https://example.com/lumi.gif'}};
 touchSkin(s,'梨梨兔兔');touchSkin(s,'千千猫猫');assert.equal(skinSource(s,'组合',key),'https://example.com/lumi.gif');
 touchSkin(s,'梨梨兔兔');assert.equal(skinSource(normalize(s),'组合',key),'https://example.com/qili.gif');
 selectBuiltin(s,'千千猫猫','human');assert.match(skinSource(s,'组合',key),/skins\/lumi/);
 assert.equal(s.skinCombos['梨梨兔兔'][key],'https://example.com/qili.gif');
});

test('character bundle exports all actions and applies only its owner',async()=>{
 const {packOutfit,applyOutfit}=await import('../outfits.js');
 const {readFile}=await import('node:fs/promises');
 const {randomUUID}=await import('node:crypto');
 const oldFetch=globalThis.fetch,stored=new Map();
 globalThis.fetch=async url=>new Response(await readFile(new URL(url)),{headers:{'Content-Type':String(url).endsWith('.svg')?'image/svg+xml':'image/gif'}});
 const costumes={load:async s=>s,put:async file=>{const id='local:'+randomUUID();stored.set(id,file);return id;},remove:async()=>{}};
 try{
  const initial=normalize();initial.actionSizes['梨梨兔兔']={'跳舞':180};
  const blob=await packOutfit(initial,costumes,'梨梨新衣服','梨梨兔兔');
  const bundle=JSON.parse(await blob.text());assert.equal(bundle.character,'梨梨兔兔');
  assert.ok(Object.keys(bundle.images['梨梨兔兔']).length>=20);assert.equal(bundle.images['千千猫猫'],undefined);
  assert.ok(bundle.images['组合']['千千猫猫-梨梨兔兔']);
  const settings=normalize({skins:{'千千猫猫':{'待机':'https://example.com/unchanged.gif'}}});
  let saved=0;await applyOutfit(blob,{settings,costumes,save:()=>saved++,refresh:async()=>{}});
  assert.equal(saved,1);assert.equal(settings.skins['千千猫猫']['待机'],'https://example.com/unchanged.gif');
  assert.equal(settings.actionSizes['梨梨兔兔']['跳舞'],180);
  assert.match(skinSource(settings,'组合','千千猫猫-梨梨兔兔'),/^local:/);
  assert.equal(skinSource(normalize(settings),'组合','千千猫猫-梨梨兔兔'),skinSource(settings,'组合','千千猫猫-梨梨兔兔'));
 }finally{globalThis.fetch=oldFetch;}
});

test('legacy custom combo remains visible until a newer outfit replaces it',()=>{
 const key='千千猫猫-梨梨兔兔',s=normalize({skins:{'组合':{[key]:'https://example.com/legacy.gif'}}});
 assert.equal(skinSource(s,'组合',key),'https://example.com/legacy.gif');
 selectBuiltin(s,'梨梨兔兔','human');assert.match(skinSource(s,'组合',key),/skins\/lumi/);
});
