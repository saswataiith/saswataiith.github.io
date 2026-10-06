(() => {
  const root=document.getElementById('ink-playground'); if(!root)return;
  const pick=id=>root.querySelector('#'+id);
  const field=pick('ink-field'), chart=pick('ink-msd'),ctx=field.getContext('2d'),g=chart.getContext('2d');
  const count=pick('ink-count'),length=pick('ink-length'),seed=pick('ink-seed'),speed=pick('ink-speed');
  const play=pick('ink-play'),advance=pick('ink-step'),reset=pick('ink-reset'),mode=pick('ink-mode'),track=pick('ink-track');
  const MAX=400,RANGE=80,BINS=80; let model,playing=false,last=null,carry=0,lastDraw=0;
  const colors=Array.from({length:256},(_,i)=>{const t=i/255;return [Math.round(244-211*t),Math.round(248-164*t),Math.round(252-102*t)];});
  const density=document.createElement('canvas');density.width=density.height=BINS;
  const dc=density.getContext('2d'),hist=new Float64Array(BINS*BINS),blur=new Float64Array(BINS*BINS),pixels=dc.createImageData(BINS,BINS);
  function status(){
    pick('ink-count-value').textContent=Number(count.value).toLocaleString();
    pick('ink-speed-value').textContent=speed.value;
    pick('ink-time').textContent=model.steps+' s';
    pick('ink-d').textContent=model.diffusivity.toFixed(4)+' \xb5m\xb2/s';
    pick('ink-measured').textContent=model.msd.toFixed(2)+' \xb5m\xb2';
    pick('ink-expected').textContent=model.expectedMSD.toFixed(2)+' \xb5m\xb2';
    play.textContent=playing?'Pause':'Start';play.disabled=model.steps>=MAX;advance.disabled=playing||model.steps>=MAX;
    pick('ink-progress').value=model.steps;
  }
  const plot={x:62,y:28,w:560,h:560};
  function position(x,y){return [plot.x+(x+RANGE)/(2*RANGE)*plot.w,plot.y+(RANGE-y)/(2*RANGE)*plot.h];}
  function drawField(){
    ctx.fillStyle='#f4f8fc';ctx.fillRect(0,0,700,650);ctx.fillRect(plot.x,plot.y,plot.w,plot.h);
    let outside=0;
    if(mode.value==='density') {
      hist.fill(0);
      for(let i=0;i<model.count;i++){
        const x=Math.floor((model.x[i]+RANGE)/(2*RANGE)*BINS),y=Math.floor((RANGE-model.y[i])/(2*RANGE)*BINS);
        if(x>=0&&x<BINS&&y>=0&&y<BINS)hist[y*BINS+x]++;else outside++;
      }
      // A separable [1,2,1] display kernel reduces lattice-parity flicker.
      // All measurements use the original unsmoothed positions.
      for(let y=0;y<BINS;y++)for(let x=0;x<BINS;x++){
        const i=y*BINS+x;blur[i]=(2*hist[i]+(x>0?hist[i-1]:0)+(x<BINS-1?hist[i+1]:0))/4;
      }
      for(let y=0;y<BINS;y++)for(let x=0;x<BINS;x++){
        const i=y*BINS+x,v=(2*blur[i]+(y>0?blur[i-BINS]:0)+(y<BINS-1?blur[i+BINS]:0))/4;
        const c=colors[Math.min(255,Math.round(255*Math.sqrt(v/model.count/0.01)))];
        const j=i*4;pixels.data[j]=c[0];pixels.data[j+1]=c[1];pixels.data[j+2]=c[2];pixels.data[j+3]=255;
      }
      dc.putImageData(pixels,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(density,plot.x,plot.y,plot.w,plot.h);
    }else{
      ctx.save();ctx.beginPath();ctx.rect(plot.x,plot.y,plot.w,plot.h);ctx.clip();ctx.fillStyle='rgba(32,92,155,0.22)';
      for(let i=0;i<model.count;i++){
        const [x,y]=position(model.x[i],model.y[i]);ctx.fillRect(x-1.5,y-1.5,3,3);
        if(Math.abs(model.x[i])>=RANGE||Math.abs(model.y[i])>=RANGE)outside++;
      }ctx.restore();
    }
    if(track.checked){
      ctx.save();ctx.beginPath();ctx.rect(plot.x,plot.y,plot.w,plot.h);ctx.clip();
      ctx.strokeStyle='#df7420';ctx.lineWidth=2.8;ctx.beginPath();
      model.path.forEach(([x,y],i)=>{const p=position(x,y);i?ctx.lineTo(...p):ctx.moveTo(...p);});ctx.stroke();
      const [x,y]=position(model.x[0],model.y[0]);ctx.beginPath();ctx.arc(x,y,5,0,2*Math.PI);ctx.fillStyle='#a34208';ctx.fill();ctx.restore();
    }
    ctx.strokeStyle='#8babc9';ctx.lineWidth=1;ctx.strokeRect(plot.x,plot.y,plot.w,plot.h);ctx.font='16px sans-serif';ctx.fillStyle='#173b63';
    for(const t of [-80,-40,0,40,80]){
      const [x,y]=position(t,t);ctx.fillText(String(t),x-12,plot.y+plot.h+23);ctx.fillText(String(t),20,y+5);
    }
    ctx.fillText('x (\xb5m)',plot.x+plot.w/2-20,640);ctx.save();ctx.translate(15,320);ctx.rotate(-Math.PI/2);ctx.fillText('y (\xb5m)',0,0);ctx.restore();
    pick('ink-window').textContent=outside?outside.toLocaleString()+(outside===1?' molecule is':' molecules are')+' outside the displayed window. All molecules remain in the calculation.':'All molecules are inside the displayed window. The edges are not walls.';
  }
  function drawChart(){
    const p={x:70,y:35,w:540,h:330},tmax=Math.max(50,model.steps),ymax=Math.max(1,model.length**2*tmax*1.12,...model.history);
    g.fillStyle='#fff';g.fillRect(0,0,700,450);g.font='16px sans-serif';
    for(let i=0;i<=4;i++){
      const y=p.y+p.h-i*p.h/4;g.strokeStyle='#dce7f2';g.beginPath();g.moveTo(p.x,y);g.lineTo(p.x+p.w,y);g.stroke();g.fillStyle='#173b63';g.fillText((ymax*i/4).toFixed(0),8,y+5);
      g.fillText((tmax*i/4).toFixed(0),p.x+i*p.w/4-8,p.y+p.h+24);
    }
    const xy=(t,v)=>[p.x+t/tmax*p.w,p.y+p.h-v/ymax*p.h];
    g.strokeStyle='#7b93a9';g.setLineDash([6,5]);g.lineWidth=2;g.beginPath();g.moveTo(...xy(0,0));g.lineTo(...xy(tmax,model.length**2*tmax));g.stroke();g.setLineDash([]);
    g.strokeStyle='#267c70';g.lineWidth=3;g.beginPath();model.history.forEach((v,t)=>{t?g.lineTo(...xy(t,v)):g.moveTo(...xy(t,v));});g.stroke();
    g.fillStyle='#173b63';g.fillText('Time t (s)',280,425);g.fillText('Mean-square displacement (\xb5m\xb2)',70,20);
  }
  function render(){status();drawField();drawChart();}
  function restart(){
    playing=false;carry=0;last=null;
    const n=Math.max(0,Math.min(4294967295,Math.floor(Number(seed.value)||0)));seed.value=n;
    model=new InkWalkModel({count:Number(count.value),length:Number(length.value),seed:n});render();
    pick('ink-notice').textContent='New run ready. The same seed and parameters reproduce the same paths.';
  }
  play.addEventListener('click',()=>{playing=!playing;last=null;status();pick('ink-notice').textContent=playing?'Simulation running. Each sweep updates every molecule once.':'Paused. Use One step to examine the next update.';});
  advance.addEventListener('click',()=>{model.step();render();});reset.addEventListener('click',restart);
  [count,length,seed].forEach(el=>el.addEventListener('change',restart));
  count.addEventListener('input',()=>pick('ink-count-value').textContent=Number(count.value).toLocaleString());
  speed.addEventListener('input',()=>pick('ink-speed-value').textContent=speed.value);
  [mode,track].forEach(el=>el.addEventListener('change',render));
  document.addEventListener('visibilitychange',()=>{last=null;carry=0;});
  pick('ink-save').addEventListener('click',()=>{
    const rows=['time_s,measured_msd_um2,expected_msd_um2,count,step_length_um,seed'];
    model.history.forEach((v,t)=>rows.push([t,v,t*model.length**2,model.count,model.length,model.seed].join(',')));
    const url=URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv'})),a=document.createElement('a');a.href=url;a.download='ink-drop-diagnostics.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  function tick(now){
    if(playing&&!document.hidden){
      if(last!==null)carry+=Math.min((now-last)/1000,.2)*Number(speed.value);
      while(carry>=1&&model.steps<MAX){model.step();carry--;}
      if(model.steps>=MAX){playing=false;pick('ink-notice').textContent='400 steps complete. Reset to repeat the run or change a parameter.';render();lastDraw=now;}
      if(now-lastDraw>=33){render();lastDraw=now;}
    }
    last=now;requestAnimationFrame(tick);
  }
  restart();requestAnimationFrame(tick);
})();
