import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const scope={};vm.runInNewContext(fs.readFileSync('assets/js/ink-walk-model.js','utf8'),scope);
const Model=scope.InkWalkModel;
test('each sweep makes exactly one cardinal step per molecule; no walkers are lost',()=>{
  const m=new Model({count:200,length:.5,seed:7});
  for(let t=0;t<20;t++){
    const x=m.x.slice(),y=m.y.slice();m.step();
    for(let i=0;i<m.count;i++)assert.equal(Math.abs(m.x[i]-x[i])+Math.abs(m.y[i]-y[i]),.5);
    assert.equal(m.x.length,200);assert.equal(m.path.length,t+2);
  }
});
test('fixed seed is reproducible; doubling step length quadruples MSD and D',()=>{
  const a=new Model({count:500,length:1,seed:42}),b=new Model({count:500,length:2,seed:42}),repeat=new Model({count:500,length:1,seed:42});
  for(let t=0;t<100;t++){a.step();b.step();repeat.step();}
  assert.deepEqual(a.x,repeat.x);assert.deepEqual(a.y,repeat.y);
  assert.equal(b.msd,4*a.msd);assert.equal(b.diffusivity,4*a.diffusivity);
  assert.equal(a.expectedMSD,100);assert.equal(b.expectedMSD,400);
});
test('large ensemble follows 4Dt; measured MSD independently recomputed from unwrapped positions',()=>{
  const m=new Model({count:20000,length:1,seed:7});for(let t=0;t<400;t++)m.step();
  let msd=0;for(let i=0;i<m.count;i++)msd+=m.x[i]**2+m.y[i]**2;msd/=m.count;
  assert.equal(m.msd,msd);assert.ok(Math.abs(msd/400-1)<.035,`MSD ${msd}, expected 400`);
  assert.ok(m.state>=0&&m.state<=0xffffffff);
  assert.equal(m.history.length,401);assert.equal(m.history.at(-1),msd);
});
