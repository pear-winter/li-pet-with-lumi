import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG, CHENYE_FILES, COMBO_FILES } from '../catalog.js';
import { PETS, comboFor, comboNames, comboKind, combosFor, normalize, petAsset } from '../core.js';
import { actionsFor, behaviorAction, skinSource } from '../customization.js';
import { createWardrobeApi } from '../wardrobe-api.js';

test('Chenye exposes exactly supplied solo actions and four partner-specific interactions', () => {
  assert.equal(actionsFor('陈野').length, 22);
  assert.deepEqual(actionsFor('陈野'), Object.keys(CHENYE_FILES));
  assert.deepEqual(combosFor('陈野'), Object.keys(COMBO_FILES));
  assert.deepEqual(combosFor('陈野', ['陈野', '梨梨哥哥']), ['梨梨哥哥-陈野_打架']);
  assert.deepEqual(combosFor('陈野', ['陈野', '梨梨兔兔']), ['梨梨兔兔-陈野']);
  assert.deepEqual(combosFor('陈野', ['陈野', '千千猫猫', '酒酒狐狸']), []);
  for (const other of PETS.filter(n => n !== '陈野')) {
    assert.equal(comboFor(['陈野', other], true), null);
    assert.equal(comboFor(['陈野', other]), other === '梨梨兔兔' ? '梨梨兔兔-陈野' : null);
  }
  assert.equal(comboFor(['陈野', '梨梨哥哥', '梨梨兔兔']), null);
  assert.equal(comboKind('梨梨哥哥-陈野_打架'), '打架');
  assert.deepEqual(comboNames('梨梨兔兔-梨梨哥哥-陈野_举高高'), ['梨梨兔兔', '梨梨哥哥', '陈野']);
});

test('Chenye automatic behaviors and fallback skins use real supplied assets', () => {
  const settings = normalize({skins:{'陈野':{'发呆':'https://example.com/idle.gif'}},behaviorMap:{'陈野':{generation:'被敲头'}}});
  assert.equal(behaviorAction(settings,'陈野','generation'),'被敲头');
  for (const [event, action] of Object.entries({typing:'聊天中',feed:'吃饭团',pet:'摸摸头',music:'听歌',sleep:'趴着睡',wake:'惊醒',walkLeft:'爬爬_向左',walkRight:'爬爬_向右'})) {
    assert.equal(behaviorAction(settings,'陈野',event),action);
    assert.ok(decodeURI(petAsset('陈野',action)).endsWith(CHENYE_FILES[action]));
  }
  for (const event of ['fall','land','reading']) assert.equal(behaviorAction(settings,'陈野',event),'');
  assert.equal(petAsset('陈野','掉落'),petAsset('陈野','发呆'));
  assert.equal(skinSource(settings,'陈野','待机'),'https://example.com/idle.gif');
  assert.equal(skinSource(settings,'陈野','听歌'),'https://example.com/idle.gif');
});

test('fox keeps upstream exclusions and special scenes out of automatic combinations', () => {
  assert.equal(CATALOG.pets['酒酒狐狸'].length,50);
  for (const stack of [false,true]) {
    assert.equal(comboFor(['梨梨哥哥','酒酒狐狸'],stack),null);
    assert.equal(comboFor(['梨梨兔兔','酒酒狐狸'],stack),'梨梨兔兔-酒酒狐狸'+(stack?'_2':''));
  }
  assert.equal(comboFor(['酒酒狐狸','灰鸮g老师']),null);
  assert.equal(comboFor(['酒酒狐狸','灰鸮g老师'],true),null);
  assert.equal(comboFor(['酒酒狐狸','灰鸮g老师','千千猫猫']),null);
  assert.equal(comboFor(['千千哥哥','酒酒狐狸']),null);
  assert.ok(!combosFor('酒酒狐狸').includes('千千哥哥-酒酒狐狸_扶起来'));
});

test('three-person scenes preserve custom names, sizes and wardrobe settings', async () => {
  const key='梨梨兔兔-梨梨哥哥-陈野_牵手手';
  const settings=normalize({petNames:{'梨梨兔兔':'梨梨','梨梨哥哥':'白川'},petSizes:{'陈野':180},actionSizes:{'组合':{[key]:220}},skins:{'组合':{[key]:'https://example.com/hands.gif'}}});
  const api=createWardrobeApi({settings:()=>settings,save(){},costumes:{},refresh:async()=>{}});
  const scene=api.get('组合').actions.find(a=>a.action===key);
  assert.equal(scene.label,'梨梨、白川、陈野 · 牵手手');
  assert.equal(scene.base,180);assert.equal(scene.size,220);assert.equal(scene.custom,true);
  assert.equal(api.get('陈野').actions.some(a=>a.action==='跳舞'),false);
  await api.setSize('组合',key,240);assert.equal(settings.actionSizes['组合'][key],240);
});
