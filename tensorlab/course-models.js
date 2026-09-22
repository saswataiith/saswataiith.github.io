/* Cartesian coordinates, tensile-positive stress; no material-specific data. */
const TensorCourse = {
  dot(a,b){return a.reduce((sum,value,index)=>sum+value*b[index],0);},
  cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];},
  mv(A,v){return A.map(row=>this.dot(row,v));},
  Q(angle,mirror=false){const c=Math.cos(angle),s=Math.sin(angle);return [[(mirror?-1:1)*c,(mirror?-1:1)*s,0],[-s,c,0],[0,0,1]];},
  rotate2(A,Q){return Q.map(row=>Q.map(other=>this.dot(row,this.mv(A,other))));},
  rotate4(C,Q){const out=Array(81).fill(0);for(let i=0;i<3;i++)for(let j=0;j<3;j++)for(let k=0;k<3;k++)for(let l=0;l<3;l++)for(let p=0;p<3;p++)for(let q=0;q<3;q++)for(let r=0;r<3;r++)for(let s=0;s<3;s++)out[27*i+9*j+3*k+l]+=Q[i][p]*Q[j][q]*Q[k][r]*Q[l][s]*C[27*p+9*q+3*r+s];return out;},
  cubic(K,G,az){const c11=K+4*G/3,c12=K-2*G/3,c44=az*G;const C=Array(81).fill(0);for(let i=0;i<3;i++)for(let j=0;j<3;j++)for(let k=0;k<3;k++)for(let l=0;l<3;l++){C[27*i+9*j+3*k+l]=(i===j&&k===l?c12:0)+(i===k&&j===l?c44:0)+(i===l&&j===k?c44:0)+(i===j&&j===k&&k===l?c11-c12-2*c44:0);}return {C,c11,c12,c44};},
  stress(C,e){return Array.from({length:3},(rowValue,row)=>Array.from({length:3},(colValue,col)=>{let result=0;for(let k=0;k<3;k++)for(let l=0;l<3;l++)result+=C[27*row+9*col+3*k+l]*e[k][l];return result;}));},
  contract(A,B){let sum=0;for(let i=0;i<3;i++)for(let j=0;j<3;j++)sum+=A[i][j]*B[i][j];return sum;},
  symmetryKey(i,j,k,l,stage){let a=[i,j],b=[k,l];if(stage>=1){a.sort();b.sort();}let keys=[a.join(''),b.join('')];if(stage>=2)keys.sort();return keys.join(':');},
  particle(t,U,gradient,local){const x=U*t;return {x,fixed:100+local*t,moving:100+gradient*x+local*t,rate:local+U*gradient};},
  stream(kind,x,y){
    if(kind===0)return {u:y,v:x,psi:(y*y-x*x)/2,potential:x*y,vorticity:0};
    if(kind===1)return {u:-y,v:x,psi:-(x*x+y*y)/2,potential:null,vorticity:2};
    return {u:y,v:0,psi:y*y/2,potential:null,vorticity:-1};
  },
  // Unsteady uniform flow v=(1,t); particle released at the origin at release time.
  steadyTrajectory(kind,t,x=.6,y=.3){if(kind===0)return [x*Math.cosh(t)+y*Math.sinh(t),y*Math.cosh(t)+x*Math.sinh(t)];if(kind===1)return [x*Math.cos(t)-y*Math.sin(t),x*Math.sin(t)+y*Math.cos(t)];return [x+y*t,y];},
  trajectory(time,release){return [time-release,(time*time-release*release)/2];},
  channel(y,H,drive,eta){return {u:drive*(H*H-y*y)/(2*eta),du:-drive*y/eta,stress:-drive*y,flow:2*drive*H**3/(3*eta),maximum:drive*H*H/(2*eta)};},
  film(y,h,theta,eta,rho=1,g=1){const drive=rho*g*Math.sin(theta);return {u:drive*(h*y-y*y/2)/eta,du:drive*(h-y)/eta,stress:drive*(h-y),flow:drive*h**3/(3*eta),maximum:drive*h*h/(2*eta),pressure:rho*g*Math.cos(theta)*(h-y)};}
};
if(typeof module!=='undefined')module.exports=TensorCourse;
