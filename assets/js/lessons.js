(() => {
  document.querySelectorAll('.code-switch').forEach(group => {
    group.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => {
      group.querySelectorAll('[data-language]').forEach(b => b.setAttribute('aria-pressed',String(b === button)));
      group.querySelectorAll('[data-code]').forEach(p => p.hidden = p.dataset.code !== button.dataset.language);
    }));
  });
  document.querySelectorAll('.lesson-viewer').forEach(async viewer => {
    const canvas=viewer.querySelector('canvas'),ctx=canvas.getContext('2d'),slider=viewer.querySelector('input'),play=viewer.querySelector('[data-play]');
    canvas.width=1400; canvas.height=1080; ctx.setTransform(2,0,0,2,0,0);
    let timer=null, generation=0;
    try {
      const response=await fetch(`/assets/examples/${viewer.dataset.lesson}/data.json`);
      if(!response.ok) throw new Error('Result data unavailable');
      const data=await response.json();
      function render(){
        const version=++generation,index=Number(slider.value),frame=data.frames[index],d=data.diagnostics[index];
        viewer.querySelector('[data-time]').textContent=frame.time.toFixed(2);
        viewer.querySelector('[data-caption]').textContent=data.slug==='walkers'?`Mean-square displacement: ${d[1].toFixed(2)} · Expected: ${d[2].toFixed(2)}`:data.slug==='diffusion'?`Mean concentration: ${d[1].toFixed(6)} · Maximum error against exact solution: ${d[2].toExponential(2)}`:`Mean composition: ${d[1].toFixed(6)} · Total energy density: ${d[2].toFixed(6)}`;
        ctx.fillStyle='#f5f7f2';ctx.fillRect(0,0,700,540);ctx.fillStyle='#173d40';ctx.font='18px sans-serif';
        if(data.kind==='line'){
          ctx.strokeStyle='#ccd8d4';ctx.lineWidth=1;
          for(let c=.4;c<=1.61;c+=.2){const y=460-(c-.4)/1.2*380;ctx.beginPath();ctx.moveTo(65,y);ctx.lineTo(650,y);ctx.stroke();ctx.fillText(c.toFixed(1),22,y+6);}
          ctx.strokeStyle='#147e79';ctx.lineWidth=4;ctx.beginPath();frame.points.forEach(([x,c],i)=>{const px=65+x/(2*Math.PI)*585,py=460-(c-.4)/1.2*380;i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.stroke();ctx.fillText('x: 0',65,500);ctx.fillText('2π',620,500);ctx.fillText('Concentration c(x)',65,40);
        }else{
          const img=new Image();img.onload=()=>{if(version!==generation)return;ctx.drawImage(img,100,10,500,500);ctx.fillText('x →',320,535);ctx.fillText('y ↑',35,270);};img.src=frame.image;
        }
      }
      slider.addEventListener('input',render);
      play.addEventListener('click',()=>{if(timer){clearInterval(timer);timer=null;play.textContent='Play';return;}play.textContent='Pause';timer=setInterval(()=>{slider.value=(Number(slider.value)+1)%data.frames.length;render();},350);});
      render();
    }catch(e){viewer.querySelector('[data-caption]').textContent='The visual result could not load. Download the code and diagnostics below.';play.disabled=true;}
  });
})();
