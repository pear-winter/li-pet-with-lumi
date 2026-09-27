import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gifDuration,actionDeadline} from '../playback.js';
import {normalize} from '../core.js';
test('playback defaults, invalid settings, finite and infinite deadlines',()=>{
  assert.equal(normalize({}).actionMode,'timed');assert.equal(normalize({}).actionSeconds,120);
  assert.equal(normalize({actionMode:'bad',actionSeconds:-1}).actionSeconds,1);
  assert.equal(normalize({actionMode:'until-cancel'}).actionMode,'until-cancel');
  assert.equal(actionDeadline('until-cancel',120,4000,10),Infinity);
  assert.equal(actionDeadline('timed',120,4000,10),120010);
  assert.equal(actionDeadline('timed',1,4000,10),4010);
  assert.equal(actionDeadline('once',120,4000,10),4010);
});
test('GIF first cycle uses actual frame delays and rejects incomplete or static input',async()=>{
  const gif=await readFile(new URL('../assets/梨梨兔兔/敲代码.gif',import.meta.url));
  assert.equal(gifDuration(gif),4160);
  assert.throws(()=>gifDuration(gif.slice(0,30)));
  assert.throws(()=>gifDuration(new Uint8Array(30)));
});
