import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fieldSolve,boundaryPoint,sample,frame} from '../assets/js/elastic-lab/eshelby.mjs';
test('refining the default ellipse reduces interior profile variation while conserving zero mean strain',()=>{
 const c={c11:3,c12:1,c44:1},e0=[[.01,0],[0,-.005]],a=.16,ratio=10**(-.3),phi=Math.PI/6,p=boundaryPoint(a,a*ratio,phi,Math.PI/2),variation=[];
 for(const n of [256,512,1024]){
  const f=fieldSolve(c,e0,{n,a,ratio,phi});
  for(const field of [f.exx,f.eyy,f.exy]){assert(field.every(Number.isFinite));assert(Math.abs(field.reduce((sum,x)=>sum+x,0)/field.length)<1e-12);}
  const values=Array.from({length:101},(_,q)=>{const d=-.09+q*.0005,x=p.x+d*p.m[0],y=p.y+d*p.m[1],xy=sample(f.exy,n,x,y);return frame([[sample(f.exx,n,x,y),xy],[xy,sample(f.eyy,n,x,y)]],p.s,p.m).ss;});
  const mean=values.reduce((s,x)=>s+x,0)/values.length;variation.push(Math.sqrt(values.reduce((s,x)=>s+(x-mean)**2,0)/values.length));
 }
 assert(variation[1]<variation[0]);assert(variation[2]<variation[1]);assert(variation[2]<.4*variation[0]);
});
