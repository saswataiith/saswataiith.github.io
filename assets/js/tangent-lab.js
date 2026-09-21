(()=>{
 const slider=document.getElementById('tangent-slope');if(!slider)return;
 const canvas=document.getElementById('tangent-canvas'),ctx=canvas.getContext('2d');ctx.scale(2,2);
 function draw(){
  const m=Number(slider.value),colors=['#176da4','#bb4b1e'],centers=[.2,.8],xpos=x=>70+560*x,ypos=y=>390-(y+.32)/1.02*320;
  ctx.fillStyle='#f5f7f2';ctx.fillRect(0,0,700,450);ctx.font='14px sans-serif';
  ctx.strokeStyle='#c5cec8';ctx.lineWidth=1;
  for(const y of [-.2,0,.2,.4,.6]){ctx.beginPath();ctx.moveTo(70,ypos(y));ctx.lineTo(630,ypos(y));ctx.stroke();ctx.fillStyle='#263d42';ctx.fillText(y.toFixed(1),25,ypos(y)+5);}
  for(const x of [0,.2,.4,.6,.8,1]){ctx.fillText(x.toFixed(1),xpos(x)-10,427);}
  ctx.fillText('Molar free energy g',70,23);ctx.fillText('Mole fraction xB',280,447);let rows='';
  centers.forEach((a,i)=>{
   const x=a+m/2,b=-a*m-m*m/4;ctx.strokeStyle=colors[i];ctx.lineWidth=3;ctx.setLineDash([]);ctx.beginPath();
   for(let j=0;j<=200;j++){const xx=j/200,yy=(xx-a)**2;j?ctx.lineTo(xpos(xx),ypos(yy)):ctx.moveTo(xpos(xx),ypos(yy));}ctx.stroke();
   ctx.setLineDash(i===0?[8,5]:[3,4]);ctx.beginPath();ctx.moveTo(xpos(0),ypos(b));ctx.lineTo(xpos(1),ypos(m+b));ctx.stroke();ctx.setLineDash([]);
   ctx.fillStyle=colors[i];ctx.beginPath();ctx.arc(xpos(x),ypos((x-a)**2),5,0,2*Math.PI);ctx.fill();
   for(const xx of [0,1])ctx.fillRect(xpos(xx)-4,ypos(m*xx+b)-4,8,8);
   ctx.fillText(i===0?'α (blue)':'β (orange)',i===0?180:450,48);
   rows+=`<tr><td>${i===0?'α':'β'}</td><td>${x.toFixed(3)}</td><td>${b.toFixed(3)}</td><td>${(m+b).toFixed(3)}</td></tr>`;
  });
  document.getElementById('tangent-values').innerHTML=rows;document.getElementById('tangent-slope-value').textContent=m.toFixed(2);
  document.getElementById('tangent-reading').textContent=m===0?'Common tangent: both slopes and both chemical potentials match.':'Parallel tangents: slopes match, but the intercepts differ. The individual chemical potentials do not match.';
 }
 slider.addEventListener('input',draw);document.getElementById('common-tangent').onclick=()=>{slider.value=0;draw();};document.getElementById('parallel-tangent').onclick=()=>{slider.value=.25;draw();};draw();
})();
