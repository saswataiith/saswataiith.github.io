const assert=require('node:assert/strict');
const m=require('./course-models.js');
let checks=0;
function close(a,b,tol=1e-8){checks++;assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);}
function integrate(fn,a,b){const n=4000,dx=(b-a)/n;let sum=0;for(let iterator=0;iterator<n;iterator++)sum+=fn(a+(iterator+.5)*dx)*dx;return sum;}
function derivative(fn,x,step=1e-5){return (fn(x+step)-fn(x-step))/(2*step);}
function second(fn,x,step=1e-3){return (fn(x+step)-2*fn(x)+fn(x-step))/(step*step);}
const A=[[2,1,0],[0,3,1],[1,0,1]],a=[1,2,-1],b=[2,-1,.5];
for(const angle of [0,.23,Math.PI/2,Math.PI])for(const mirror of [false,true]){
 const Q=m.Q(angle,mirror),ap=m.mv(Q,a),bp=m.mv(Q,b),Ap=m.rotate2(A,Q);
 close(m.dot(ap,m.mv(Ap,bp)),-4.5);
 const cross=m.cross(ap,bp),expected=m.mv(Q,m.cross(a,b)).map(v=>v*(mirror?-1:1));
 cross.forEach((v,index)=>close(v,expected[index]));
 const inverse=Q[0].map((value,index)=>Q.map(row=>row[index]));
 m.mv(inverse,ap).forEach((v,index)=>close(v,a[index]));
}
// Enumerate index orbits instead of assuming the component counts.
for(const [stage,expected] of [[0,81],[1,36],[2,21]]){const keys=new Set();for(let i=0;i<3;i++)for(let j=0;j<3;j++)for(let k=0;k<3;k++)for(let l=0;l<3;l++)keys.add(m.symmetryKey(i,j,k,l,stage));close(keys.size,expected);}
for(const az of [.25,1,3])for(const angle of [0,.37,Math.PI/4,Math.PI/2]){
 const K=80,G=40,{C,c11,c12,c44}=m.cubic(K,G,az),Q=m.Q(angle),Cp=m.rotate4(C,Q),e=[[.01,.004,.003],[.004,-.002,.001],[.003,.001,.005]],stress=m.stress(C,e),ep=m.rotate2(e,Q),sp=m.stress(Cp,ep),expected=m.rotate2(stress,Q);
 for(let i=0;i<3;i++)for(let j=0;j<3;j++)close(sp[i][j],expected[i][j]);
 close(m.contract(ep,sp),m.contract(e,stress));assert.ok(m.contract(e,stress)>0);
 const tr=e[0][0]+e[1][1]+e[2][2];for(let i=0;i<3;i++)for(let j=0;j<3;j++)close(stress[i][j],i===j?c12*tr+(c11-c12)*e[i][i]:2*c44*e[i][j]);
 if(az===1)for(let i=0;i<81;i++)close(Cp[i],C[i]);
 // Numerical derivative of energy with respect to engineering shear γ12.
 const energy=gamma=>{const ee=e.map(row=>row.slice());ee[0][1]=ee[1][0]=gamma/2;return .5*m.contract(ee,m.stress(C,ee));};
 close(derivative(energy,.008),stress[0][1]);
 const other=[[.001,.003,0],[.003,.002,0],[0,0,-.004]];close(m.contract(other,stress),m.contract(e,m.stress(C,other)));
}
// A fully 3D proper rotation and a noncubic anisotropic stiffness.
{
 const Q=[[1/3,2/3,2/3],[2/3,1/3,-2/3],[-2/3,2/3,-1/3]],E=[[1,.3,.4],[.3,-.5,.2],[.4,.2,.8]],e=[[.01,.003,-.002],[.003,.007,.004],[-.002,.004,-.001]],C=m.cubic(80,40,1).C;
 for(let i=0;i<3;i++)for(let j=0;j<3;j++)for(let k=0;k<3;k++)for(let l=0;l<3;l++)C[27*i+9*j+3*k+l]+=17*E[i][j]*E[k][l];
 const expected=m.rotate2(m.stress(C,e),Q),actual=m.stress(m.rotate4(C,Q),m.rotate2(e,Q));
 for(let i=0;i<3;i++)for(let j=0;j<3;j++)close(expected[i][j],actual[i][j]);
 close(m.contract(e,m.stress(C,e)),m.contract(m.rotate2(e,Q),actual));
 const kelvin=[e[0][0],e[1][1],e[2][2],Math.SQRT2*e[1][2],Math.SQRT2*e[0][2],Math.SQRT2*e[0][1]];close(m.dot(kelvin,kelvin),m.contract(e,e));
}
const base=m.cubic(80,40,1),uniaxial=[[.01,0,0],[0,0,0],[0,0,0]];
close(.5*m.contract(uniaxial,m.stress(base.C,uniaxial))*1000,6.666666666666667);
// Pure shear has W = μ γ²/2, not μ γ² or μ γ²/4.
close(.5*m.contract([[0,.01,0],[.01,0,0],[0,0,0]],m.stress(base.C,[[0,.01,0],[.01,0,0],[0,0,0]])),.5*40*.02**2);
for(const U of [-2,0,2])for(const G of [-30,0,20])for(const local of [-5,0,10]){
 const fn=t=>100+G*U*t+local*t;
 close(derivative(fn,.7),m.particle(.7,U,G,local).rate);
}
close(m.particle(1,2,20,-5).moving,135);close(m.particle(1,2,20,-5).fixed,95);
for(const kind of [0,1,2])for(const [x,y] of [[.7,.3],[-.4,1.1]]){
 const v=m.stream(kind,x,y),psi=(xx,yy)=>m.stream(kind,xx,yy).psi;
 close(v.u,derivative(yy=>psi(x,yy),y));close(v.v,-derivative(xx=>psi(xx,y),x));
 close(0,derivative(xx=>m.stream(kind,xx,y).u,x)+derivative(yy=>m.stream(kind,x,yy).v,y));
 close(v.vorticity,-second(xx=>psi(xx,y),x)-second(yy=>psi(x,yy),y),1e-6);
}
for(const kind of [0,1,2])for(const time of [0,.4,1.2]){const p=m.steadyTrajectory(kind,time),v=m.stream(kind,...p),initial=m.stream(kind,.6,.3);close(v.psi,initial.psi);close(derivative(t=>m.steadyTrajectory(kind,t)[0],time),v.u);close(derivative(t=>m.steadyTrajectory(kind,t)[1],time),v.v);}
for(const release of [0,.3,1]){const t=1.8,p=m.trajectory(t,release);close(derivative(tt=>m.trajectory(tt,release)[0],t),1);close(derivative(tt=>m.trajectory(tt,release)[1],t),t);close(p[1],t*p[0]-p[0]*p[0]/2);close(m.trajectory(release,release)[0],0);close(m.trajectory(release,release)[1],0);}
for(const H of [.5,1,2])for(const eta of [.5,1,3])for(const drive of [0,.7,2]){
 const v=y=>m.channel(y,H,drive,eta),u=y=>v(y).u;
 close(u(-H),0);close(u(H),0);close(eta*second(u,.17*H)+drive,0,1e-6);
 close(integrate(u,-H,H),v(0).flow,1e-6);
 close(integrate(y=>eta*v(y).du**2,-H,H),drive*v(0).flow,1e-6);
 close(v(0).maximum,m.channel(0,H*2,drive,eta).maximum/4);
 close(v(0).flow,m.channel(0,H*2,drive,eta).flow/8);
}
for(const h of [.5,1,2])for(const eta of [.5,1,3])for(const angle of [0,Math.PI/6,Math.PI/2]){
 const v=y=>m.film(y,h,angle,eta),u=y=>v(y).u,F=Math.sin(angle);
 close(u(0),0);close(derivative(u,h),0);close(eta*second(u,h*.37)+F,0,1e-6);
 close(v(h).pressure,0);close(derivative(y=>v(y).pressure,h*.4),-Math.cos(angle));
 close(integrate(u,0,h),v(0).flow,1e-6);close(integrate(y=>eta*v(y).du**2,0,h),F*v(0).flow,1e-6);
 close(m.film(h*2,h*2,angle,eta).maximum,4*v(h).maximum);close(m.film(0,h*2,angle,eta).flow,8*v(0).flow);
}
// Density and material volume satisfy continuity together for v = a x in 3D.
for(const rate of [-.4,0,.4]){const rho=t=>2*Math.exp(-3*rate*t),volume=t=>.8*Math.exp(3*rate*t);close(derivative(rho,.7)+3*rate*rho(.7),0);close(rho(.7)*volume(.7),1.6);}
console.log(`PASS: ${checks} numerical checks: rotations, reflection parity, 81/36/21 enumeration, fourth-order covariance, energy/shear factors, material derivative, stream functions, trajectories, ODE residuals, boundary values, flux integrals, dissipation and thickness scaling.`);
