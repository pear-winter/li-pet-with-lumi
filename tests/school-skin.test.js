import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalize, combosFor, comboFor} from '../core.js';
import {builtinOptions, selectBuiltin, skinSource} from '../customization.js';
import {QILI_SCHOOL_SKIN} from '../builtins.js';
import {packOutfit} from '../outfits.js';

test('school outfit persists, resolves every supplied action and interaction, and exports selected GIFs', async()=>{
 const name='梨梨兔兔',settings=normalize();
 assert.equal(builtinOptions(name).find(o=>o.id==='human').name,'骇客梨梨');
 assert.equal(builtinOptions(name).find(o=>o.id==='school').name,'校服梨梨');
 selectBuiltin(settings,name,'school');
 const restored=normalize(settings);
 assert.equal(restored.builtinSkins[name],'school');
 assert.equal(Object.keys(QILI_SCHOOL_SKIN.actions).length,20);
 assert.equal(Object.keys(QILI_SCHOOL_SKIN.combos).length,12);
 for(const [kind,entries] of Object.entries(QILI_SCHOOL_SKIN))for(const [action,path] of Object.entries(entries)){
  const source=skinSource(restored,kind==='actions'?name:'组合',action);
  assert.equal(decodeURI(source),decodeURI(new URL('../'+path,import.meta.url).href));
  assert.match((await readFile(new URL(source))).subarray(0,6).toString(),/^GIF8[79]a$/);
 }
 const previous=globalThis.fetch;
 globalThis.fetch=async url=>new Response(await readFile(new URL(url)),{headers:{'Content-Type':String(url).endsWith('.svg')?'image/svg+xml':'image/gif'}});
 try{
  const bundle=JSON.parse(await (await packOutfit(restored,{load:async s=>s},'校服梨梨',name)).text());
  for(const [action,path] of Object.entries(QILI_SCHOOL_SKIN.actions))assert.deepEqual(Buffer.from(bundle.images[name][action].data,'base64'),await readFile(new URL('../'+path,import.meta.url)));
  for(const [action,path] of Object.entries(QILI_SCHOOL_SKIN.combos))assert.deepEqual(Buffer.from(bundle.images['组合'][action].data,'base64'),await readFile(new URL('../'+path,import.meta.url)));
 }finally{globalThis.fetch=previous;}
 selectBuiltin(restored,name,'human');
 assert.equal(skinSource(restored,name,'待机'),undefined);
 assert.ok(!skinSource(restored,'组合','千千猫猫-梨梨兔兔').includes('qili-school'));
});

test('removed pair scenes cannot return through old saved settings',()=>{
 const deleted=['梨梨兔兔-酒酒狐狸','梨梨兔兔-酒酒狐狸_2'];
 const old=Object.fromEntries(deleted.map(k=>[k,'https://example.com/old.gif']));
 const settings=normalize({skins:{'组合':old},skinCombos:{'梨梨兔兔':old}});
 for(const key of deleted){assert.ok(!combosFor('梨梨兔兔').includes(key));assert.ok(!settings.skins['组合']?.[key]);assert.ok(!settings.skinCombos['梨梨兔兔']?.[key]);}
 assert.equal(comboFor(['梨梨兔兔','酒酒狐狸']),null);
 assert.equal(comboFor(['梨梨兔兔','酒酒狐狸'],true),null);
 for(const suffix of ['击掌','戴小花'])assert.ok(combosFor('梨梨兔兔').includes('梨梨兔兔-酒酒狐狸_'+suffix));
});
