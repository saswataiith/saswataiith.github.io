(()=>{
 const canvas=document.getElementById('turtle-canvas');if(!canvas)return;
 const ctx=canvas.getContext('2d');ctx.scale(2,2);
 const play=document.getElementById('turtle-play'),step=document.getElementById('turtle-step'),reset=document.getElementById('turtle-reset'),periodic=document.getElementById('turtle-periodic'),status=document.getElementById('turtle-status');
 const route=[[2,6],[2,5],[3,5],[4,5],[4,4],[4,3],[5,3],[6,3],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2],[0,2],[1,2],[1,1],[2,1]];
 const extras=[[1,6],[0,6],[3,6],[3,7],[5,5],[6,5],[6,6],[7,6],[8,6],[8,5],[8,4],[9,4],[10,4],[10,5],[11,5],[5,0],[6,0],[7,0],[7,1],[9,7],[10,7]];
 const cells=new Set([...route,...extras].map(p=>p.join(',')));
 const ox=36,oy=65,s=54;let progress=0,playing=false,last=0,frame=0;
 const point=p=>[ox+(p[0]+.5)*s,oy+(p[1]+.5)*s];
 function say(t){status.textContent=t;}
 function stop(){playing=false;cancelAnimationFrame(frame);play.textContent='Follow the turtle';}
 function turtle(x,y,angle){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle='#a6c665';ctx.strokeStyle='#254f3f';ctx.lineWidth=2;
  for(const [a,b] of [[-9,-14],[10,-14],[-9,14],[10,14]]){ctx.beginPath();ctx.ellipse(a,b,7,5,.4,0,Math.PI*2);ctx.fill();ctx.stroke();}
  ctx.beginPath();ctx.ellipse(21,0,9,8,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(24,-3,3,0,7);ctx.fill();ctx.fillStyle='#193b32';ctx.beginPath();ctx.arc(25,-3,1.6,0,7);ctx.fill();
  ctx.fillStyle='#468265';ctx.beginPath();ctx.ellipse(0,0,19,16,0,0,7);ctx.fill();ctx.stroke();ctx.strokeStyle='#c5df97';ctx.beginPath();ctx.moveTo(-9,-8);ctx.lineTo(5,-10);ctx.lineTo(12,0);ctx.lineTo(4,10);ctx.lineTo(-10,8);ctx.closePath();ctx.stroke();ctx.restore();}
 function draw(){ctx.clearRect(0,0,720,540);ctx.fillStyle='#f3f5eb';ctx.fillRect(0,0,720,540);ctx.font='bold 16px sans-serif';ctx.fillStyle='#65428c';ctx.textAlign='center';ctx.fillText(periodic.checked?'SAME WORLD · OPPOSITE EDGES JOIN':'EDGES CLOSED · NO WAY THROUGH',360,28);
  ctx.fillStyle='#326450';ctx.fillRect(ox,oy,12*s,8*s);
  for(let y=0;y<8;y++)for(let x=0;x<12;x++){ctx.fillStyle=cells.has(`${x},${y}`)?'#fff3cf':((x+y)%2?'#386e57':'#326450');ctx.fillRect(ox+x*s+1,oy+y*s+1,s-2,s-2);}
  ctx.fillStyle='#8056a5';for(const x of [ox,ox+12*s-7])ctx.fillRect(x,oy+2*s,7,s);
  ctx.fillStyle='#fff';ctx.font='bold 20px sans-serif';ctx.fillText(periodic.checked?'‹':'×',ox+12,oy+2.5*s+7);ctx.fillText(periodic.checked?'›':'×',ox+12*s-12,oy+2.5*s+7);
  ctx.strokeStyle='#d9a53d';ctx.lineWidth=5;ctx.lineCap='round';ctx.setLineDash([3,9]);ctx.beginPath();
  let index=Math.floor(progress),f=progress-index;
  for(let j=0;j<=index;j++){let p=point(route[j]);if(j===0||j===14)ctx.moveTo(...p);else ctx.lineTo(...p);}ctx.stroke();ctx.setLineDash([]);
  const start=point(route[0]),end=point(route[route.length-1]);ctx.fillStyle='#254f3f';ctx.font='bold 12px sans-serif';ctx.fillText('START',start[0],start[1]+25);ctx.fillText('END',end[0],end[1]+25);
  ctx.save();ctx.translate(...end);ctx.fillStyle='#ef8c31';ctx.beginPath();ctx.moveTo(-8,-10);ctx.lineTo(9,-4);ctx.lineTo(-7,14);ctx.closePath();ctx.fill();ctx.strokeStyle='#43854d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(8,-18);ctx.moveTo(0,-7);ctx.lineTo(-4,-20);ctx.stroke();ctx.restore();
  ctx.fillStyle='#fff3cf';ctx.font='12px sans-serif';ctx.fillText('ISOLATED ISLAND',ox+10*s,oy+7*s-8);
  let a=point(route[index]),b=point(route[Math.min(index+1,route.length-1)]),angle=Math.atan2(b[1]-a[1],b[0]-a[0]);
  if(index===13){let xx=a[0]+f*s;angle=0;if(xx>ox+12*s)xx-=12*s;turtle(xx,a[1],angle);}else turtle(a[0]+f*(b[0]-a[0]),a[1]+f*(b[1]-a[1]),angle);
 }
 function advance(amount){const prev=progress;progress=Math.min(route.length-1,progress+amount);
  if(!periodic.checked&&progress>13){progress=13;stop();say('Bonk! With closed edges, the turtle cannot reach the carrot. Turn on periodic boundaries to join the purple gates.');}
  else if(progress===route.length-1){stop();say('Carrot reached! The start and end belong to the same connected path on this periodic domain. What about the isolated island?');}
  else if(prev<13&&progress>=13)say('Here comes the wrap: leave on the right, enter at the matching height on the left!');
  draw();}
 function tick(now){if(!playing)return;const dt=Math.min((now-last)/1000,.08);last=now;advance(dt*2.4);if(playing)frame=requestAnimationFrame(tick);}
 play.onclick=()=>{if(playing){stop();return;}if(progress>=route.length-1)progress=0;playing=true;play.textContent='Pause turtle';say('Follow the dotted trail. The turtle stays inside one phase.');last=performance.now();frame=requestAnimationFrame(tick);};
 step.onclick=()=>{stop();advance(Math.floor(progress)+1-progress);};reset.onclick=()=>{stop();progress=0;say('Ready? A connected path lets us travel without crossing a wall.');draw();};
 periodic.onchange=()=>{stop();progress=0;say(periodic.checked?'Purple gates joined. A boundary crossing is a continuation of the path.':'Edges closed. Can the turtle still reach the carrot?');draw();};draw();
})();
