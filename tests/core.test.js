import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { CATALOG } from '../catalog.js';
import { PETS, normalize, comboFor, chooseState, petLabel, petAsset, comboAsset } from '../core.js';

test('invalid settings and screen positions are normalized; all hidden stays hidden',()=>{
  const s=normalize({pets:[],size:900,speed:-10,positions:{'梨梨兔兔':{x:-2,y:20}},diary:[null,{day:'2026-09-28',pets:-1}],enabled:false});
  assert.equal(s.size,160);assert.equal(s.speed,0);assert.deepEqual(s.pets,[]);assert.equal(s.enabled,false);
  assert.deepEqual(s.positions['梨梨兔兔'],{x:0,y:1});assert.equal('diary' in s,false);
  assert.deepEqual(normalize(null).pets,['梨梨兔兔','千千猫猫']);
  assert.deepEqual(normalize({pets:['梨梨兔兔','千千猫猫','梨梨兔兔']}).pets,['梨梨兔兔','千千猫猫']);
});
test('Lumi pair exclusions, g-teacher and stack rules remain intact',()=>{
  assert.equal(comboFor(['梨梨兔兔','千千猫猫']),'千千猫猫-梨梨兔兔');
  assert.equal(comboFor(['梨梨兔兔','千千猫猫'],true),'千千猫猫-梨梨兔兔_2');
  for(const names of [['梨梨哥哥','千千猫猫'],['梨梨兔兔','千千哥哥'],['梨梨哥哥','煤球猫猫']])assert.equal(comboFor(names),null);
  assert.equal(comboFor(['灰鸮g老师','千千猫猫'],true),null);
  assert.equal(comboFor(['灰鸮g老师','千千猫猫','梨梨兔兔']),null);
  assert.equal(comboFor(['灰鸮g老师','千千猫猫']),null);
  assert.equal(comboFor(['梨梨兔兔','梨梨兔兔']),null);
});
test('temporary interaction takes priority over music and generation, then settles',()=>{
  assert.equal(chooseState({manual:'吃饭',busy:true}),'吃饭');
  assert.equal(chooseState({busy:true,idle:90000}),'敲代码');
  assert.equal(chooseState({music:true,idle:90000}),'听音乐');
  assert.equal(chooseState({idle:90000}),'睡觉');
  assert.equal(chooseState({walking:true,direction:-1}),'向左走');
  assert.equal(chooseState({}),'待机');
});
test('every bundled animation and combination exists locally',async()=>{
  for(const name of PETS)for(const action of CATALOG.pets[name])await access(new URL(petAsset(name,action)));
  for(const key of CATALOG.combos)await access(new URL(comboAsset(key)));
  assert.equal(petAsset('灰鸮g老师','不存在的动作'),petAsset('灰鸮g老师','待机'));
});

test('old dog name and position migrate; focus is removed',()=>{const s=normalize({pets:['哥哥狗狗','千千哥哥'],positions:{'哥哥狗狗':{x:.4,y:.7}},focusEnd:9999999999999});assert.deepEqual(s.pets,['千千哥哥']);assert.deepEqual(s.positions['千千哥哥'],{x:.4,y:.7});assert.equal('focusEnd' in s,false);assert.equal(s.theme,'tavern');assert.equal(s.gravity,false);});

test('custom names preserve stable pet identity and old diary is dropped',()=>{const s=normalize({petNames:{'梨梨兔兔':'  小梨  ','千千猫猫':'','bad':'none'},diary:[{day:'2026-09-28'}],firstDay:'2026-09-28'});assert.equal(petLabel(s,'梨梨兔兔'),'小梨');assert.equal(petLabel(s,'千千猫猫'),'lumi');assert.deepEqual(s.pets,['梨梨兔兔','千千猫猫']);assert.equal('diary' in s,false);assert.equal('firstDay' in s,false);});

test('home order and showcase normalize without changing combo identity',()=>{
  assert.equal(normalize().homeOrder[0],'梨梨兔兔');
  const s=normalize({homeOrder:['煤球猫猫','煤球猫猫','bad'],showcase:{'梨梨兔兔':'跳舞','千千猫猫':'bad'}});
  assert.equal(s.homeOrder[0],'煤球猫猫');assert.equal(new Set(s.homeOrder).size,PETS.length);assert.equal(s.showcase['梨梨兔兔'],'跳舞');assert.equal(s.showcase['千千猫猫'],undefined);
  assert.equal(comboFor(['梨梨兔兔','千千猫猫']),'千千猫猫-梨梨兔兔');
});
