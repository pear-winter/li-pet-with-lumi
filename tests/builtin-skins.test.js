import {test} from 'node:test';
import assert from 'node:assert/strict';
import {access} from 'node:fs/promises';
import {CATALOG, REMOVED_COMBOS} from '../catalog.js';
import {HOME_ORDER, normalize, petLabel, petAsset, comboAsset, comboNames, combosFor} from '../core.js';
import {HUMAN_FILES, HUMAN_COMBOS, builtinId, selectBuiltin} from '../builtin-skins.js';
import {createWardrobeApi} from '../wardrobe-api.js';
import {packOutfit, applyOutfit} from '../outfits.js';

test('default labels and ordering migrate old defaults without losing custom ordering or names',()=>{
  const expected=['祈梨','白川','陈野','lumi','lumi哥哥','酒酒','砂金','小黑猫','g老师'];
  const s=normalize();assert.deepEqual(s.homeOrder.map(n=>petLabel(s,n)),expected);
  const old=normalize({homeOrder:['梨梨兔兔','千千猫猫','千千哥哥','梨梨哥哥','煤球猫猫','灰鸮g老师','酒酒狐狸','陈野'],petNames:{'梨梨哥哥':'我的白川'}});
  assert.deepEqual(old.homeOrder,HOME_ORDER);assert.equal(petLabel(old,'梨梨哥哥'),'我的白川');
  assert.equal(normalize({homeOrder:['煤球猫猫','梨梨哥哥']}).homeOrder[0],'煤球猫猫');
});

test('all five human skins are bundled defaults and original skins remain locally usable',async()=>{
  const s=normalize();assert.equal(Object.keys(HUMAN_FILES).length,5);
  for(const [name,files] of Object.entries(HUMAN_FILES)){
    assert.equal(builtinId(s,name),'human');
    for(const [action,file] of Object.entries(files)){
      const url=petAsset(name,action,s);assert.ok(decodeURI(url).endsWith(file));await access(new URL(url));
    }
    if(name!=='砂金'){
      selectBuiltin(s,name,'original');
      for(const action of CATALOG.pets[name])await access(new URL(petAsset(name,action,s)));
      assert.ok(!petAsset(name,'待机',s).includes('/skins/human/'));
    }
  }
  assert.ok(decodeURI(petAsset('梨梨哥哥','待机')).endsWith('baichuan/默认待机.gif'));
  assert.ok(decodeURI(petAsset('梨梨兔兔','待机')).endsWith('qili/默认待机.gif'));
  assert.ok(decodeURI(petAsset('千千哥哥','听音乐')).endsWith('21-听音乐.gif'));
  assert.deepEqual(combosFor('砂金'),[]);
});

test('pair skins follow both participants, while only the exact Chenye trio survives',async()=>{
  for(const [key,path] of Object.entries(HUMAN_COMBOS)){
    const s=normalize();assert.ok(decodeURI(comboAsset(key,s)).endsWith(path));
    selectBuiltin(s,comboNames(key)[0],'original');assert.ok(!comboAsset(key,s).includes('/skins/human/'));
    await access(new URL(comboAsset(key,s)));
  }
  assert.deepEqual(CATALOG.combos.filter(key=>comboNames(key).length>=3),['梨梨兔兔-梨梨哥哥-陈野_举高高','梨梨兔兔-梨梨哥哥-陈野_牵手手']);
  assert.equal(REMOVED_COMBOS.length,50);
  for(const key of REMOVED_COMBOS){
    assert.equal(CATALOG.combos.includes(key),false);
    await assert.rejects(access(new URL(comboAsset(key))));
  }
  const old=normalize({skins:{'组合':{[REMOVED_COMBOS[0]]:'https://example.com/old.gif'}},actionSizes:{'组合':{[REMOVED_COMBOS[0]]:200}}});
  assert.equal(old.skins['组合'],undefined);assert.equal(old.actionSizes['组合'],undefined);
});

test('wardrobe exposes builtins, preserves individual overrides, and rejects unavailable skins',async()=>{
  const s=normalize({skins:{'梨梨兔兔':{'待机':'https://example.com/custom.gif'}}}),changes=[];
  const api=createWardrobeApi({settings:()=>s,save(){},refresh:async options=>changes.push(options),costumes:{}});
  assert.equal(api.get('梨梨兔兔').builtinSkin,'human');
  await api.setBuiltin('梨梨兔兔','original');assert.equal(api.get('梨梨兔兔').builtinSkin,'original');
  assert.equal(s.skins['梨梨兔兔']['待机'],'https://example.com/custom.gif');
  assert.deepEqual(changes,[{builtinChanged:'梨梨兔兔'}]);
  await assert.rejects(api.setBuiltin('砂金','original'));await assert.rejects(api.setBuiltin('组合','human'));
});

test('outfits roundtrip builtin selections and ignore only explicitly removed scenes in old bundles',async()=>{
  const s=normalize();selectBuiltin(s,'梨梨兔兔','original');
  const blob=await packOutfit(s,{},'内置皮肤');const bundle=JSON.parse(await blob.text());
  assert.equal(bundle.builtinSkins['梨梨兔兔'],'original');
  const restored=normalize();await applyOutfit(blob,{settings:restored,costumes:{remove:async()=>{}},save(){},refresh:async()=>{}});
  assert.equal(builtinId(restored,'梨梨兔兔'),'original');
  const legacy={format:'li-pet-outfit',version:1,images:{'组合':{[REMOVED_COMBOS[0]]:{type:'image/gif',data:'R0lG'}}}};
  let writes=0;await applyOutfit(new Blob([JSON.stringify(legacy)]),{settings:restored,costumes:{put:async()=>{writes++;return 'local:test';},remove:async()=>{}},save(){},refresh:async()=>{}});
  assert.equal(writes,0);assert.equal(builtinId(restored,'梨梨兔兔'),'human');
  legacy.images['组合']={'not-a-real-action':{type:'image/gif',data:'R0lG'}};
  await assert.rejects(applyOutfit(new Blob([JSON.stringify(legacy)]),{settings:restored,costumes:{},save(){},refresh:async()=>{}}));
});
