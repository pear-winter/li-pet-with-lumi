import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalize} from '../core.js';
import {validSource,behaviorAction,actionsFor} from '../customization.js';
test('costume URLs reject script, credentials, oversized and temporary blob URLs',()=>{
 for(const url of ['javascript:alert(1)','data:text/html,a','blob:http://a/b','https://name:secret@example.com/a.png','https://a/'+ 'a'.repeat(4096)])assert.equal(validSource(url),'');
 assert.equal(validSource('https://example.com/a.gif'),'https://example.com/a.gif');
});
test('custom actions and per-pet behavior selections survive normalize',()=>{
 const s=normalize({skins:{'梨梨兔兔':{'敲代码':'https://example.com/type.gif','bad':'https://a/b'}},behaviorMap:{'梨梨兔兔':{generation:'跳舞',music:'__none__',fake:'待机'},'千千猫猫':{generation:'bad'}}});
 assert.equal(s.skins['梨梨兔兔']['敲代码'],'https://example.com/type.gif');assert.equal(s.skins['梨梨兔兔'].bad,undefined);
 assert.equal(behaviorAction(s,'梨梨兔兔','generation'),'跳舞');assert.equal(behaviorAction(s,'梨梨兔兔','music'),'');assert.equal(behaviorAction(s,'千千猫猫','generation'),'敲代码');
 assert.ok(actionsFor('煤球猫猫').includes('摸摸头'));
});
