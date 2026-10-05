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
test('each branched percolation witness is connected, phase-valid and has winding rank three',()=>{
 for(const phase of ['red','blue']){
  const net=data.networks[phase],adj=net.nodes.map(()=>[]);assert.equal(net.targets.length,125);
  for(const p of net.nodes)assert(phase==='red'?value(p)>=.75:value(p)<=.25);
  for(const [u,v] of net.edges){const a=net.nodes[u],b=net.nodes[v],delta=b.map((x,j)=>((x-a[j]+384)%256)-128);assert.equal(delta.reduce((s,x)=>s+Math.abs(x),0),1);adj[u].push(v);adj[v].push(u);}
  const lift=new Map([[0,[0,0,0]]]),queue=[0],vectors=[];
  for(let head=0;head<queue.length;head++){
   const u=queue[head];for(const v of adj[u]){
    const step=net.nodes[v].map((x,j)=>((x-net.nodes[u][j]+384)%256)-128),proposed=lift.get(u).map((x,j)=>x+step[j]);
    if(!lift.has(v)){lift.set(v,proposed);queue.push(v);}else{
     const winding=proposed.map((x,j)=>(x-lift.get(v)[j])/256);assert(winding.every(Number.isInteger));
     if(winding.some(x=>x!==0)&&!vectors.some(v=>v.every((x,j)=>x===winding[j])))vectors.push(winding);
    }
   }
  }
  assert.equal(lift.size,net.nodes.length);
  let rank3=false;for(const a of vectors)for(const b of vectors)for(const c of vectors){
   const det=a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]);if(det!==0)rank3=true;
  }
  assert(rank3);assert(adj.some(a=>a.length>=3));
 }
});
test('focused VPython view loads on demand and shows only one wrapping loop',async()=>{
 const ids=['phase','show-loop','loop-axis','open-three','three-panel','camera-reset','surface-status'];
 const els=Object.fromEntries(ids.map(id=>[id,{value:id==='phase'?'red':'x',checked:false,addEventListener(name,fn){this[name]=fn;}}]));
 const objects=[],object=opts=>{const o={...opts};objects.push(o);return o;};
 const ctx={document:{getElementById:id=>els[id]},location:{href:'https://example.com/files/mesoscale/examples/bicontinuity-3d.html'},innerWidth:900,window:{},URL,console,$:()=>({}),setTimeout,
 fetch:async()=>({ok:true,json:async()=>data}),vec:(...p)=>p,canvas:object,vertex:object,triangle:object,compound:object,curve:object,sphere:object,distant_light:object};
 vm.runInNewContext(readFileSync('assets/js/bicontinuity-3d.js','utf8'),ctx);
 assert.equal(objects.length,0,'3D geometry is lazy');await els['open-three'].onclick();
 assert(ctx.window.focusedSurfaceReady,els['surface-status'].textContent);assert.equal(ctx.window.focusedSurfaceState.loop,null);
 els['show-loop'].checked=true;els['show-loop'].onchange();assert.equal(ctx.window.focusedSurfaceState.loop,'x');
 els.phase.value='blue';els.phase.change();assert.equal(ctx.window.focusedSurfaceState.phase,'blue');
 els['loop-axis'].value='z';els['loop-axis'].onchange();assert.equal(ctx.window.focusedSurfaceState.loop,'z');
 els['camera-reset'].onclick();assert(!objects.some(o=>'make_trail' in o));
});
