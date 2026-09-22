// Independent quadrature and finite-difference checks, not just formula repetition.
const assert=require('node:assert/strict');
const p=require('./foundations.js');
const close=(actual,expected,tolerance=1e-8)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);
function segment(field,start,end){let sum=0;const count=400,dx=(end[0]-start[0])/count,dy=(end[1]-start[1])/count;for(let iterator=0;iterator<count;iterator++){const v=field(start[0]+(iterator+.5)*dx,start[1]+(iterator+.5)*dy);sum+=v[0]*dx+v[1]*dy;}return sum;}
for(const a of [-2,0,1,2])for(const b of [-2,0,.7,2]){
 const field=(x,y)=>[-a*x-b*y,-a*y+b*x],v=p.work(a,b);
 close(v.lower,segment(field,[0,0],[1,0])+segment(field,[1,0],[1,1]));
 close(v.upper,segment(field,[0,0],[0,1])+segment(field,[0,1],[1,1]));
 close(v.circulation,v.lower-v.upper);
}
const step=1e-5;
for(const kx of [.2,1,4])for(const ky of [.2,1,4]){
 const x=.6,y=-.8,v=p.anisotropic(kx,ky,x,y);
 const dx=p.anisotropic(kx,ky,x+step,y),mx=p.anisotropic(kx,ky,x-step,y),dy=p.anisotropic(kx,ky,x,y+step),my=p.anisotropic(kx,ky,x,y-step);
 close(v.curl,(dx.flux[1]-mx.flux[1]-dy.flux[0]+my.flux[0])/(2*step));
 close(v.divergence,(dx.flux[0]-mx.flux[0]+dy.flux[1]-my.flux[1])/(2*step));
 close(0,(dx.force[1]-mx.force[1]-dy.force[0]+my.force[0])/(2*step));
 assert.ok(v.dissipation>=0);
}
for(const j0 of [-2,0,2])for(const slope of [-2,0,2])for(const source of [-2,0,2]){
 const v=p.balance(j0,slope,source);close(v.accumulation,source-(v.right-v.left));
}
for(let iterator=0;iterator<=40;iterator++)for(const r of [-.95,0,.95]){
 const angle=iterator*Math.PI/20,x=Math.cos(angle),y=Math.sin(angle),v=p.coupled(x,y,r);
 assert.ok(v.production>=0);close(v.production,x*v.j1+y*v.j2);
}
close(p.coupled(0,1,.5).j1,.5);
console.log('PASS: independent path integrals; curl and divergence finite differences; control-volume balance; entropy production across the allowed parameter range.');
