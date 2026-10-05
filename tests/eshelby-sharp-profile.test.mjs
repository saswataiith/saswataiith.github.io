import {test} from 'node:test';
import assert from 'node:assert/strict';
import {interior,exterior,boundaryPoint,interfaceJump,frame,sharpProfile} from '../assets/js/elastic-lab/eshelby.mjs';
const close=(a,b,tol=1e-10)=>assert(Math.abs(a-b)<tol,`${a} != ${b}`);
test('exterior circular dilatation agrees with the independent radial solution',()=>{
 const c={c11:3,c12:1,c44:1},e=[[.01,0],[0,.01]],a=.16,I=interior(c,e,a,a,0);
 close(I.strain[0][0],.01*2/3);
 for(const r of [.17,.32,.8]){const E=exterior(c,e,I,a,a,0,r,0),v=.01*2/3*a*a/(r*r);close(E.strain[0][0],-v);close(E.strain[1][1],v);close(E.strain[0][1],0);}
});
test('one-sided interface limits obey compatibility and traction continuity for rotated anisotropic ellipses',()=>{
 for(const ratio of [1,.5,.08,.01])for(const psi of [.2,1.1,2.4]){
  const c={c11:3,c12:1,c44:.6},e=[[.01,.002],[.002,-.005]],a=.16,b=a*ratio,phi=.4,I=interior(c,e,a,b,phi),p=boundaryPoint(a,b,phi,psi),J=interfaceJump(c,e,I,p),E=exterior(c,e,I,a,b,phi,p.x,p.y);
  for(const kind of ['strain','stress']){const values=frame(E[kind],p.s,p.m);for(const k of ['ss','sm','mm'])close(values[k],J[kind].outside[k]);}
  close(J.strain.inside.ss,J.strain.outside.ss);close(J.stress.inside.sm,J.stress.outside.sm);close(J.stress.inside.mm,J.stress.outside.mm);
 }
});
test('exterior field satisfies equilibrium away from the boundary and profile branches end at exact jumps',()=>{
 const c={c11:3,c12:1,c44:.6},e=[[.01,0],[0,-.005]],a=.16,b=.08,phi=.4,I=interior(c,e,a,b,phi),h=1e-5,x=.25,y=.18;
 const at=(x,y)=>exterior(c,e,I,a,b,phi,x,y).stress,xp=at(x+h,y),xm=at(x-h,y),yp=at(x,y+h),ym=at(x,y-h);
 close((xp[0][0]-xm[0][0]+yp[0][1]-ym[0][1])/(2*h),0,1e-8);
 close((xp[1][0]-xm[1][0]+yp[1][1]-ym[1][1])/(2*h),0,1e-8);
 const P=sharpProfile(c,e,a,b,phi,1.1,{count:25});
 for(const kind of ['strain','stress'])for(const k of ['ss','sm','mm']){const branch=P.rows[kind][k];assert(branch.inside.every(p=>p[0]<=0));assert(branch.outside.every(p=>p[0]>=0));close(branch.inside.at(-1)[1],P.J[kind].inside[k]);close(branch.outside[0][1],P.J[kind].outside[k]);assert(branch.outside.every(p=>Number.isFinite(p[1])));}
});
