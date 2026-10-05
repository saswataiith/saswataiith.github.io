import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const data=JSON.parse(readFileSync('assets/examples/bicontinuity-3d/viewer.json'));
const field=readFileSync('assets/examples/bicontinuity-3d/composition.npy');
const fieldOffset=10+field.readUInt16LE(8);
const value=p=>field.readFloatLE(fieldOffset+4*((p[0]*data.n+p[1])*data.n+p[2]));
const report=JSON.parse(readFileSync('assets/examples/bicontinuity-3d/report.json'));
test('all saved routes and rendered centre interpolation stay in their selected phase',()=>{
 const n=data.n;assert.equal(n,256);assert.equal(field.length-fieldOffset,256**3*4);
 for(const phase of ['red','blue']){
  const belongs=p=>phase==='red'?value(p)>=.5:value(p)<.5;
  for(const [axis,route] of Object.entries(data.routes[phase])){
   assert.deepEqual(route[0],route.at(-1));const winding=[0,0,0];
   for(let i=0;i<route.length-1;i++){
    const a=route[i],b=route[i+1];assert(belongs(a));assert(belongs(b));
    const d=b.map((v,j)=>((v-a[j]+n+n/2)%n)-n/2);assert.equal(d.reduce((s,v)=>s+Math.abs(v),0),1);
    d.forEach((v,j)=>winding[j]+=v);
    for(let tick=0;tick<=20;tick++){
     const p=a.map((v,j)=>Math.floor(((v+.5+d[j]*tick/20)%n+n)%n));
     assert(belongs(p),`${phase}/${axis}: interpolation left phase`);
    }
   }
   assert.deepEqual(winding,[...'xyz'].map(a=>a===axis?n:0));
  }
 }
});
test('routes start near the centre and stay in the phase core away from transverse faces',()=>{
 const n=data.n;
 for(const phase of ['red','blue'])for(const [axisName,route] of Object.entries(data.routes[phase])){
  const axis='xyz'.indexOf(axisName);
  assert(route[0].every(x=>Math.abs(x-n/2)<=24));
  for(const p of route){
   assert(phase==='red'?value(p)>=.75:value(p)<=.25);
   for(let j=0;j<3;j++)if(j!==axis)assert(p[j]>=32&&p[j]<n-32);
   for(let x=-2;x<=2;x++)for(let y=-2;y<=2;y++)for(let z=-2;z<=2;z++){
    if(Math.abs(x)+Math.abs(y)+Math.abs(z)>2)continue;
    const q=p.map((v,j)=>(v+[x,y,z][j]+n)%n);
    assert(phase==='red'?value(q)>=.5:value(q)<.5);
   }
  }
 }
});
test('display meshes have finite bounded geometry and recorded full-resolution provenance',()=>{
 for(const [phase,m] of Object.entries(data.meshes)){
  assert.equal(m.vertices.length,m.normals.length);assert.equal(m.isovalue,.5);assert.equal(m.box_caps,false);
  assert(m.triangles.length<=60000&&m.triangles.length>50000);
  assert(m.full_resolution_triangles>1000000);
  for(const point of m.vertices)for(const x of point)assert(Number.isFinite(x)&&x>=.5&&x<=255.5);
  for(const normal of m.normals)for(const x of normal)assert(Number.isFinite(x));
  for(const face of m.triangles)for(const i of face)assert(Number.isInteger(i)&&i>=0&&i<m.vertices.length);
 }
});
test('red and blue share one c=0.5 interface with opposite normals',()=>{
 const red=data.meshes.red,blue=data.meshes.blue;
 assert.deepEqual(red.vertices,blue.vertices);
 for(let i=0;i<red.normals.length;i++)for(let j=0;j<3;j++)assert(Math.abs(red.normals[i][j]+blue.normals[i][j])<1e-8);
 for(let i=0;i<red.triangles.length;i++)assert.deepEqual(blue.triangles[i],[red.triangles[i][0],red.triangles[i][2],red.triangles[i][1]]);
});
test('browser control and animation logic completes all six loops (mock graphics, not WebGL)',async()=>{
 const ids=['phase','direction','speed','opacity','other','planned','start','pause','reset','status','measurements'];
 const els=Object.fromEntries(ids.map(id=>[id,{value:({phase:'red',direction:'x',speed:200,opacity:.1})[id],checked:id==='other'}]));
 let callback, now=0;const object=opts=>({...opts});const curves=[];
 const curve=opts=>{const c={...opts,points:[...(opts.pos||[])],push(p){this.points.push(p);},clear(){this.points=[];}};curves.push(c);return c;};
 const context={document:{getElementById:id=>els[id]},location:{href:'https://example.com/files/mesoscale/examples/bicontinuity-3d.html'},innerWidth:800,window:{},URL,console,
  $:()=>({}),setTimeout,performance:{now:()=>now},requestAnimationFrame:fn=>callback=fn,
  fetch:async url=>({ok:true,json:async()=>url.pathname.endsWith('viewer.json')?data:report}),
  distant_light:object,vertex:object,triangle:object,curve,vec:(...a)=>a,canvas:object,box:object,compound:object,arrow:object,label:object,ellipsoid:object,sphere:object};
 vm.runInNewContext(readFileSync('assets/js/bicontinuity-3d.js','utf8'),context);
 for(let i=0;i<1000&&!callback;i++)await new Promise(resolve=>setTimeout(resolve,5));
 assert(callback,els.status.textContent);
 for(const phase of ['red','blue'])for(const axis of 'xyz'){
  els.phase.value=phase;els.direction.value=axis;els.phase.onchange();
  assert.equal(context.window.bicontinuityState.executedProgress,0);
  assert.equal(curves.filter(c=>c.emissive&&c.visible!==false).reduce((s,c)=>s+c.points.length,0),1);
  els.start.onclick();
  for(let i=0;i<300&&context.window.bicontinuityState.progress<data.routes[phase][axis].length-1;i++){now+=100;callback(now);}
  const state=context.window.bicontinuityState;assert.equal(state.progress,data.routes[phase][axis].length-1);assert.equal(state.running,false);assert(state.crossings>0);assert.equal(state.executedProgress,state.progress);assert.equal(state.trailSegments,state.crossings+1);
  const active=curves.filter(c=>c.emissive&&c.visible!==false);
  assert.equal(active.length,state.trailSegments);
  for(const curve of active)for(let i=1;i<curve.points.length;i++){
   const a=curve.points[i-1],b=curve.points[i];assert(a.every((x,j)=>Math.abs(x-b[j])<=1.00001),'trail bridged a periodic face or skipped a voxel');
  }
  els.reset.onclick();assert.equal(context.window.bicontinuityState.progress,0);assert.equal(context.window.bicontinuityState.executedProgress,0);
  els.start.onclick();now+=100;callback(now);els.pause.onclick();const paused=context.window.bicontinuityState.progress;now+=100;callback(now);assert.equal(context.window.bicontinuityState.progress,paused);
 }
});
