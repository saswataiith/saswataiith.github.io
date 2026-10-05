import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const data=JSON.parse(readFileSync('assets/examples/bicontinuity-3d/viewer.json'));
const report=JSON.parse(readFileSync('assets/examples/bicontinuity-3d/report.json'));
test('all saved routes and rendered centre interpolation stay in their selected phase',()=>{
 const n=data.n;
 for(const phase of ['red','blue']){
  const mask=new Set(data[phase].map(p=>p.join(',')));
  for(const [axis,route] of Object.entries(data.routes[phase])){
   assert.deepEqual(route[0],route.at(-1));const winding=[0,0,0];
   for(let i=0;i<route.length-1;i++){
    const a=route[i],b=route[i+1];assert(mask.has(a.join(',')));assert(mask.has(b.join(',')));
    const d=b.map((v,j)=>((v-a[j]+n+n/2)%n)-n/2);assert.equal(d.reduce((s,v)=>s+Math.abs(v),0),1);
    d.forEach((v,j)=>winding[j]+=v);
    for(let tick=0;tick<=20;tick++){
     const p=a.map((v,j)=>Math.floor(((v+.5+d[j]*tick/20)%n+n)%n));
     assert(mask.has(p.join(',')),`${phase}/${axis}: interpolation left phase`);
    }
   }
   assert.deepEqual(winding,[...'xyz'].map(a=>a===axis?n:0));
  }
 }
});
test('browser control and animation logic completes all six loops (mock graphics, not WebGL)',async()=>{
 const ids=['phase','direction','speed','opacity','other','start','pause','reset','status','measurements'];
 const els=Object.fromEntries(ids.map(id=>[id,{value:({phase:'red',direction:'x',speed:30,opacity:.15})[id],checked:false}]));
 let callback, now=0;const object=opts=>({...opts});
 const context={document:{getElementById:id=>els[id]},location:{href:'https://example.com/files/mesoscale/examples/bicontinuity-3d.html'},innerWidth:800,window:{},URL,console,
  $:()=>({}),performance:{now:()=>now},requestAnimationFrame:fn=>callback=fn,
  fetch:async url=>({ok:true,json:async()=>url.pathname.endsWith('viewer.json')?data:report}),
  vertex:object,quad:object,curve:object,vec:(...a)=>a,canvas:object,box:object,compound:object,arrow:object,label:object,ellipsoid:object,sphere:object};
 vm.runInNewContext(readFileSync('assets/js/bicontinuity-3d.js','utf8'),context);
 await new Promise(resolve=>setImmediate(resolve));assert(callback,els.status.textContent);
 for(const phase of ['red','blue'])for(const axis of 'xyz'){
  els.phase.value=phase;els.direction.value=axis;els.phase.onchange();els.start.onclick();
  for(let i=0;i<300&&context.window.bicontinuityState.progress<data.routes[phase][axis].length-1;i++){now+=100;callback(now);}
  const state=context.window.bicontinuityState;assert.equal(state.progress,data.routes[phase][axis].length-1);assert.equal(state.running,false);assert(state.crossings>0);
  els.reset.onclick();assert.equal(context.window.bicontinuityState.progress,0);
  els.start.onclick();now+=100;callback(now);els.pause.onclick();const paused=context.window.bicontinuityState.progress;now+=100;callback(now);assert.equal(context.window.bicontinuityState.progress,paused);
 }
});
