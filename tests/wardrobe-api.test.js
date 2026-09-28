import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWardrobeApi} from '../wardrobe-api.js';
import {normalize} from '../core.js';
import {CATALOG} from '../catalog.js';

test('workbench edits share settings, refresh and image storage with wardrobe',async()=>{
 const state=normalize(),removed=[];let saves=0,refreshes=0;
 const api=createWardrobeApi({settings:()=>state,save:()=>saves++,refresh:async()=>refreshes++,costumes:{put:async()=> 'local:test',remove:async source=>removed.push(source)}});
 await api.setImage('梨梨兔兔','待机',new Blob(['fixture'],{type:'image/png'}));
 assert.equal(state.skins['梨梨兔兔']['待机'],'local:test');
 await api.setImage('梨梨兔兔','待机','https://example.com/pet.gif');
 assert.deepEqual(removed,['local:test']);assert.equal(api.get('梨梨兔兔').actions.find(a=>a.action==='待机').custom,true);
 await api.reset('梨梨兔兔','待机');assert.equal(state.skins['梨梨兔兔']['待机'],undefined);assert.equal(saves,3);assert.equal(refreshes,3);
 await assert.rejects(api.setImage('梨梨兔兔','待机','javascript:alert(1)'));
 await assert.rejects(api.setImage('梨梨兔兔','待机','local:someone-else'));
 assert.equal(saves,3);
});
test('sizes preserve inheritance and combo keys used by existing outfits',async()=>{
 const state=normalize({petSizes:{'梨梨兔兔':140}}),api=createWardrobeApi({settings:()=>state,save(){},refresh:async()=>{},costumes:{}});
 await api.setSize('梨梨兔兔','通用皮肤',180);assert.equal(api.get('梨梨兔兔').actions.find(a=>a.action==='待机').base,180);
 await api.setSize('梨梨兔兔','待机',999);assert.equal(state.actionSizes['梨梨兔兔']['待机'],360);
 await api.setSize('梨梨兔兔','待机',null);assert.equal(api.get('梨梨兔兔').actions.find(a=>a.action==='待机').size,null);
 const combo=CATALOG.combos[0];await api.setSize('组合',combo,120);assert.equal(state.actionSizes['组合'][combo],120);assert.ok(api.get('组合').actions.find(a=>a.action===combo).label);
 await assert.rejects(api.setSize('组合','unknown',120));await assert.rejects(api.setSize('梨梨兔兔','待机',NaN));
});
