import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalize} from '../core.js';
import {skinSource,normalizeCustomization,actionsFor,costumeActionsFor} from '../customization.js';
test('individual sizes migrate and clamp independently',()=>{const s=normalize({size:120,petSizes:{'梨梨兔兔':220,'千千猫猫':3,bad:150}});assert.deepEqual(s.petSizes,{'梨梨兔兔':220,'千千猫猫':48});assert.equal(s.size,120);assert.deepEqual(normalize().petSizes,{});});
test('unassigned automatic actions keep custom appearance and explicit costumes win',()=>{const settings=normalize({showcase:{'梨梨兔兔':'跳舞'},skins:{'梨梨兔兔':{'跳舞':'https://example.org/show.gif','待机':'https://example.org/idle.gif','通用皮肤':'https://example.org/base.gif','掉落':'https://example.org/fall.gif'}}});assert.equal(skinSource(settings,'梨梨兔兔','掉落'),'https://example.org/fall.gif');assert.equal(skinSource(settings,'梨梨兔兔','向左看'),'https://example.org/base.gif');delete settings.skins['梨梨兔兔']['通用皮肤'];assert.equal(skinSource(settings,'梨梨兔兔','向左看'),'https://example.org/show.gif');assert.ok(costumeActionsFor('梨梨兔兔').includes('通用皮肤'));assert.ok(!actionsFor('梨梨兔兔').includes('通用皮肤'));assert.equal(normalizeCustomization(settings).skins['梨梨兔兔']['掉落'],'https://example.org/fall.gif');});

test('action sizes keep valid solo and combo overrides and reject unknown keys',()=>{const s=normalize({actionSizes:{'梨梨兔兔':{'跳舞':170,'掉落':999,'bad':100},'组合':{'千千猫猫-梨梨兔兔':140},bad:{'待机':90}}});assert.deepEqual(s.actionSizes,{'梨梨兔兔':{'跳舞':170,'掉落':360},'组合':{'千千猫猫-梨梨兔兔':140}});assert.deepEqual(normalize().actionSizes,{});});
