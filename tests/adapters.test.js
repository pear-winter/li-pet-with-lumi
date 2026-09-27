import {test} from 'node:test';
import assert from 'node:assert/strict';
import {toolStatus,openTool,readActivity} from '../adapters.js';
function doc(nodes={}){return {querySelector:q=>nodes[q]||null,getElementById:id=>nodes['#'+id]||null};}
test('missing tools are explicit, and never invoke generation',()=>{
  assert.deepEqual(toolStatus({},doc()),{workbench:false,atelier:false,meow:false});
  for(const id of ['workbench','atelier','meow'])assert.equal(openTool(id,{},doc()),false);
});
test('workbench launcher toggles only when closed',()=>{
  let clicks=0;const nodes={'#cw-hub':{hidden:false},'#cw-top, #cw-fab':{click:()=>clicks++}};
  assert.equal(openTool('workbench',{},doc(nodes)),true);assert.equal(clicks,0);
  nodes['#cw-hub'].hidden=true;assert.equal(openTool('workbench',{},doc(nodes)),true);assert.equal(clicks,1);
});
test('atelier uses the actual existing API',()=>{
  let opens=0,text='';const win={__pear_nai_studio_v1:{open:()=>opens++},__pearBookExcerpt:{excerpt:t=>text=t}};
  assert.equal(openTool('atelier',win,doc()),true);assert.equal(opens,1);
});
test('meow busy state comes from aria-busy, not presence of stop button',()=>{
  assert.equal(readActivity(doc({'#meow-stop':{}})).meow,false);
  assert.equal(readActivity(doc({'#meow-panel[aria-busy="true"]':{}})).meow,true);
});

test('magic door targets the workbench public API, not native pages',async()=>{let tab;const win={__cyll_pear_hub_v1__:{open:async t=>{tab=t}}};for(const id of ['preset','api','worldbook','archive','history','sttheme','tools','beauty']){assert.equal(await openTool(id,win,doc()),true);assert.equal(tab,id);}});
