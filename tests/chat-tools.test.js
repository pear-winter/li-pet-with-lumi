import test from 'node:test';
import assert from 'node:assert/strict';
import {findMatches,replaceText} from '../chat-tools.js';
test('search enumerates every literal occurrence in every floor, including unmounted messages',()=>{
 const chat=[{mes:'梨梨。梨梨',name:'梨梨'},{mes:'x [a].* y [a].*'},{mes:''}];
 assert.deepEqual(findMatches(chat,'梨梨').map(({id,offset})=>[id,offset]),[[0,0],[0,3]]);
 assert.deepEqual(findMatches(chat,'[a].*').map(({id,offset})=>[id,offset]),[[1,2],[1,10]]);
 assert.deepEqual(findMatches(chat,''),[]);
});
test('replace one occurrence, all occurrences, empty deletion and literal replacement tokens',()=>{
 assert.equal(replaceText('猫猫猫','猫','狗',1),'猫狗猫');
 assert.equal(replaceText('猫猫猫','猫',''),'');
 assert.equal(replaceText('a.a','a','$&'),'$&.$&');
 assert.throws(()=>replaceText('changed','old','new',0));
 assert.throws(()=>replaceText('abc','',''));
});
