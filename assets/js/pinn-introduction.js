(()=>{
const a=document.getElementById('pinn-amplitude'),b=document.getElementById('pinn-offset');if(!a)return;
const ctx=document.getElementById('pinn-canvas').getContext('2d');ctx.scale(2,2);
function draw(){const aa=+a.value,bb=+b.value;ctx.fillStyle='#f3f5eb';ctx.fillRect(0,0,700,460);ctx.font='14px sans-serif';ctx.textAlign='left';ctx.fillStyle='#234444';ctx.fillText('FIELD: blue trial / dashed gray reference',65,24);ctx.fillText('EQUATION RESIDUAL: orange',65,310);
const xx=x=>65+575*x,yy=u=>265-(u+.45)/2.75*215,rr=r=>380-r*5;
ctx.strokeStyle='#cbd3c9';ctx.lineWidth=1;for(const u of [0,1,2]){ctx.beginPath();ctx.moveTo(65,yy(u));ctx.lineTo(640,yy(u));ctx.stroke();ctx.fillText(String(u),32,yy(u)+4);}ctx.beginPath();ctx.moveTo(65,rr(0));ctx.lineTo(640,rr(0));ctx.stroke();ctx.fillText('0',32,rr(0)+4);
function curve(fn,y,color,dash=[]){ctx.strokeStyle=color;ctx.lineWidth=3;ctx.setLineDash(dash);ctx.beginPath();for(let i=0;i<=200;i++){const x=i/200;i?ctx.lineTo(xx(x),y(fn(x))):ctx.moveTo(xx(x),y(fn(x)));}ctx.stroke();ctx.setLineDash([]);}
curve(x=>Math.sin(Math.PI*x),yy,'#87918b',[7,5]);curve(x=>aa*Math.sin(Math.PI*x)+bb,yy,'#176da4');curve(x=>Math.PI**2*(aa-1)*Math.sin(Math.PI*x),rr,'#bc5323');
for(const x of [0,.5,1]){ctx.fillStyle='#234444';ctx.fillText('x = '+x,xx(x)-12,285);ctx.fillText(String(x),xx(x)-4,449);}for(const x of [0,1]){ctx.fillStyle='#176da4';ctx.beginPath();ctx.arc(xx(x),yy(bb),5,0,7);ctx.fill();}
let equation=0;for(let i=1;i<=64;i++)equation+=(Math.PI**2*(aa-1)*Math.sin(Math.PI*i/65))**2/64;
document.getElementById('pinn-amplitude-value').textContent=aa.toFixed(2);document.getElementById('pinn-offset-value').textContent=bb.toFixed(2);document.getElementById('pinn-equation-loss').textContent=equation.toFixed(5);document.getElementById('pinn-boundary-loss').textContent=(bb*bb).toFixed(5);
document.getElementById('pinn-feedback').textContent=aa===1&&bb===0?'Both tests pass: this trial curve is the exact solution.':aa===1?'The equation passes, but the endpoints are wrong. Physics residual alone has not fixed the offset.':bb===0?'The endpoints pass, but the curvature is wrong. Boundary values alone do not solve the equation.':'Both tests still need work: change the curvature and the endpoint values.';
}
a.oninput=b.oninput=draw;document.getElementById('pinn-equation').onclick=()=>{a.value=1;draw();};document.getElementById('pinn-boundary').onclick=()=>{b.value=0;draw();};document.getElementById('pinn-both').onclick=()=>{a.value=1;b.value=0;draw();};document.getElementById('pinn-reset').onclick=()=>{a.value=.55;b.value=.2;draw();};draw();
})();
