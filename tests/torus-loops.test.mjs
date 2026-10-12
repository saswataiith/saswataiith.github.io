import test from 'node:test';
import assert from 'node:assert/strict';
import {torusLoops,tubeFillingDisk,openedSurface} from '../assets/js/topology-shapes-model.js';
function boundaryTopology(mesh) {
  const edges=new Map();
  for(const face of mesh.faces) for(let n=0;n<3;n++) {
    const edge=[face[n],face[(n+1)%3]].sort((a,b)=>a-b).join(',');
    edges.set(edge,(edges.get(edge)||0)+1);
  }
  const neighbors=new Map();
  for(const [edge,count] of edges) {
    assert.ok(count===1||count===2);
    if(count!==1) continue;
    const [a,b]=edge.split(',').map(Number);
    for(const [u,v] of [[a,b],[b,a]]) {if(!neighbors.has(u)) neighbors.set(u,[]);neighbors.get(u).push(v);}
  }
  const seen=new Set();let components=0;
  for(const vertex of neighbors.keys()) {
    assert.equal(neighbors.get(vertex).length,2);
    if(seen.has(vertex)) continue;
    components++;const queue=[vertex];seen.add(vertex);
    for(const u of queue) for(const v of neighbors.get(u)) if(!seen.has(v)) {seen.add(v);queue.push(v);}
  }
  return {chi:mesh.vertices.length-edges.size+mesh.faces.length,boundaries:components};
}
test('Both loops close on the smooth torus boundary',()=>{
  for(const points of Object.values(torusLoops())) {
    for(let axis=0;axis<3;axis++) assert.ok(Math.abs(points[0][axis]-points.at(-1)[axis])<1e-12);
    for(const [x,y,z] of points) assert.ok(Math.abs((Math.hypot(x,y)-.8)**2+z*z-.3**2)<1e-12);
  }
});
test('The filling disk belongs to the solid and has one boundary',()=>{
  const disk=tubeFillingDisk();
  for(const [x,y,z] of disk.vertices) assert.ok((Math.hypot(x,y)-.8)**2+z*z<=.3**2+1e-12);
  assert.deepEqual(boundaryTopology(disk),{chi:1,boundaries:1});
});
test('The cut cylinder and rectangle have the stated boundary topology',()=>{
  assert.deepEqual(boundaryTopology(openedSurface()),{chi:0,boundaries:2});
  assert.deepEqual(boundaryTopology(openedSurface(true)),{chi:1,boundaries:1});
});
