import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nearbyCombos,petAsset} from '../core.js';
import {HUMAN_COMBOS,BUILTIN_SKINS} from '../builtins.js';
import {readFile} from 'node:fs/promises';
const pet=(name,x,y,size=100)=>({name,x,y,size});
test('nearby scenes include named pairs and fully assembled trios, reject absent or distant members',()=>{
 const a=pet('千千猫猫',0,0),b=pet('梨梨兔兔',95,30),c=pet('酒酒狐狸',50,60);
 assert.ok(nearbyCombos([a,b,c]).includes('千千猫猫-梨梨兔兔-酒酒狐狸_传星星'));
 assert.ok(nearbyCombos([b,c]).includes('梨梨兔兔-酒酒狐狸_击掌'));
 assert.ok(!nearbyCombos([a,b]).some(k=>k.includes('酒酒狐狸')));
 assert.equal(nearbyCombos([a,{...b,y:400}]).length,0);
 assert.equal(nearbyCombos([a,pet('梨梨哥哥',0,0)]).length,0);
 assert.ok(nearbyCombos([pet('梨梨兔兔',0,0,200),pet('陈野',170,100,80)]).includes('梨梨兔兔-陈野_逗猫棒'));
});
test('all 28 supplied animations are real GIFs and Jiujiu classic remains available',async()=>{
 const paths=[...Object.values(HUMAN_COMBOS),...Object.values(BUILTIN_SKINS['酒酒狐狸'].actions)];
 assert.equal(paths.length,28);
 for(const path of paths)assert.match((await readFile(new URL('../'+path,import.meta.url))).subarray(0,6).toString(),/^GIF8[79]a$/);
 assert.match(petAsset('酒酒狐狸','待机'),/skins\/jiujiu/);
 assert.ok(decodeURI(petAsset('酒酒狐狸','待机',true)).includes('99狐狐'));
});
