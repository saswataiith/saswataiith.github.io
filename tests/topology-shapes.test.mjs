import test from 'node:test';
import assert from 'node:assert/strict';
import {shapes,euler,shapeMeshes,sphere,torus,torusCurvatureIntegral} from '../assets/js/topology-shapes-model.js';

test('Ideal bounded shapes retain their known topology',()=>{
  for(const [key,chi] of Object.entries({disk:1,annulus:0,holes:-1,disks:2,ball:1,torus:0,shell:2,balls:2})) assert.equal(euler(shapes[key].betti),chi,key);
});
test('Closed display meshes match the boundary Euler characteristics throughout the size range',()=>{
  for(const key of ['ball','torus','shell','balls']) for(const size of [0,.4,1]) {
    let chi=0;
    for(const mesh of shapeMeshes(key,size)) {
      const edges=new Map();
      for(const face of mesh.faces) {
        assert.equal(new Set(face).size,3);
        for(let n=0;n<3;n++) {
          const a=face[n],b=face[(n+1)%3],edge=[a,b].sort((x,y)=>x-y).join(',');
          assert.ok(a>=0&&a<mesh.vertices.length);
          const record=edges.get(edge)||{count:0,orientation:0};
          record.count++;record.orientation+=a<b?1:-1;edges.set(edge,record);
        }
      }
      for(const record of edges.values()) {assert.equal(record.count,2);assert.equal(record.orientation,0);}
      for(const vertex of mesh.vertices) for(const coordinate of vertex) assert.ok(Number.isFinite(coordinate));
      chi+=mesh.vertices.length-edges.size+mesh.faces.length;
    }
    assert.equal(chi,shapes[key].surfaceEuler,`${key} at size ${size}`);
  }
});

test('Sphere curvature is positive and follows inverse radius squared',()=>{
  for(const radius of [.4,1,2]) {
    const mesh=sphere(radius);
    assert.equal(mesh.gaussianCurvature.length,mesh.vertices.length);
    for(const value of mesh.gaussianCurvature) assert.equal(value,1/(radius*radius));
    assert.ok(Math.abs(mesh.gaussianCurvature[0]*4*Math.PI*radius*radius-4*Math.PI)<1e-12);
  }
});
test('Torus curvature has both signs and its area-weighted contributions cancel',()=>{
  for(const radius of [.15,.29,.5]) {
    const mesh=torus(radius,.8);
    assert.ok(mesh.gaussianCurvature.some(value=>value<0));
    assert.ok(mesh.gaussianCurvature.some(value=>value>0));
    assert.ok(Math.abs(mesh.gaussianCurvature[8])<1e-14);
    const integral=torusCurvatureIntegral(radius,.8);
    assert.ok(Math.abs(integral.total)<1e-12);
    assert.ok(Math.abs(integral.positive-4*Math.PI)<3e-5);
    assert.ok(Math.abs(integral.negative+4*Math.PI)<3e-5);
  }
});
