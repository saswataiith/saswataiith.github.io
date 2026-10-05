/* Plotly views use the measured volume. The editable pattern is a separate toy. */
(function(){
 const el=id=>document.getElementById(id),config={responsive:true,displaylogo:false};
 window.mountConnectivityPlayground=({volume,analysis,n,histograms})=>{
  if(typeof Plotly==='undefined'){el('plotly-status').textContent='Plotly could not load. The full-resolution slice explorer remains available.';return;}
  let latest,mesh=null,busy=false,last=0,pending=null,clickBound=false;
  const layout={height:570,margin:{l:0,r:0,t:30,b:0},paper_bgcolor:'#fafbf7',uirevision:'keep-camera',scene:{aspectmode:'cube',xaxis:{range:[0,n-1],title:'x'},yaxis:{range:[0,n-1],title:'y'},zaxis:{range:[0,n-1],title:'z'},camera:{eye:{x:1.5,y:1.4,z:1.1}}}};
  const scale=phase=>[[0,'#f4f3ed'],[.24,'#f4f3ed'],[.25,phase==='red'?'#f9dadd':'#d5e5fa'],[.49,phase==='red'?'#f9dadd':'#d5e5fa'],[.5,phase==='red'?'#bc244b':'#167dcc'],[.74,phase==='red'?'#bc244b':'#167dcc'],[.75,'#ffd329'],[1,'#ffd329']];
  function traces(state){
   const out=[],stride=4,selected=state.phase==='red';
   if(el('plotly-sections').checked)for(let axis=0;axis<3;axis++){
    const coords=[[],[],[]],colour=[],others=[0,1,2].filter(a=>a!==axis),position=Number(el('position-'+axis).value);
    for(let v=0;v<n;v+=stride){const rows=[[],[],[]],c=[];for(let u=0;u<n;u+=stride){const p=[0,0,0];p[axis]=position;p[others[0]]=u;p[others[1]]=v;const word=volume[(p[0]*n+p[1])*n+p[2]],d=word&32767;
      p.forEach((x,a)=>rows[a].push(x));c.push(Boolean(word&32768)!==selected?0:d>state.step?1:d===state.step&&state.step<analysis.flood[state.phase].maximum_distance?3:2);
    }rows.forEach((row,a)=>coords[a].push(row));colour.push(c);}
    out.push({type:'surface',x:coords[0],y:coords[1],z:coords[2],surfacecolor:colour,cmin:0,cmax:3,colorscale:scale(state.phase),showscale:false,opacity:.94,lighting:{ambient:.95,diffuse:.15},name:'xyz'[axis]+' section',hovertemplate:'x %{x}<br>y %{y}<br>z %{z}<extra>Display-sampled section</extra>'});
   }
   const root=analysis.flood[state.phase].root;out.push({type:'scatter3d',mode:'markers',x:[root[0]],y:[root[1]],z:[root[2]],marker:{size:5,color:'#191932',symbol:'diamond'},name:'Seed',hovertemplate:'Flood seed<extra></extra>'});
   if(mesh&&el('plotly-interface').checked)out.push({...mesh,color:state.phase==='red'?'#c42656':'#1579c1',opacity:Number(el('interface-opacity').value)});
   return out;
  }
  async function paint(){if(busy||!latest)return;busy=true;const source=latest,state={...latest};try{await Plotly.react(el('plotly-volume'),traces(state),layout,config);if(!clickBound&&el('plotly-volume').on){el('plotly-volume').on('plotly_click',event=>{const p=event.points?.[0];if(!p||p.data.type!=='surface')return;[p.x,p.y,p.z].forEach((v,a)=>el('position-'+a).value=Math.max(0,Math.min(n-1,Math.round(v))));el('position-0').oninput();});clickBound=true;}await Plotly.restyle(el('plotly-growth'),{x:[[state.step]],y:[[100*histograms[state.phase][state.step]/analysis.flood[state.phase].reached_voxels]]},[2]);}catch(e){el('plotly-status').textContent='Plotly rendering failed: '+e.message;}finally{busy=false;if(latest!==source)setTimeout(paint,0);}}
  const growth=['red','blue'].map(phase=>{const max=analysis.flood[phase].maximum_distance;return{type:'scatter',mode:'lines',x:Array.from({length:max+1},(_,i)=>i),y:Array.from({length:max+1},(_,i)=>100*histograms[phase][i]/analysis.flood[phase].reached_voxels),line:{color:phase==='red'?'#bc244b':'#167dcc',width:3},name:phase+' reached'};});
  growth.push({type:'scatter',mode:'markers',x:[0],y:[0],marker:{color:'#d59b00',size:12},name:'Now'});
  Plotly.newPlot(el('plotly-growth'),growth,{height:250,margin:{l:55,r:20,t:20,b:50},paper_bgcolor:'#fafbf7',plot_bgcolor:'#fafbf7',xaxis:{title:'Face-sharing steps from seed'},yaxis:{title:'Phase reached (%)',range:[0,101]},legend:{orientation:'h'},uirevision:'growth'},config);
  window.playgroundUpdate=state=>{latest=state;const now=performance.now();if(now-last>180||!state.playing){last=now;paint();}else if(!pending)pending=setTimeout(()=>{pending=null;paint();},180);};
  el('plotly-interface').onchange=async()=>{if(el('plotly-interface').checked&&!mesh){el('plotly-status').textContent='Loading the shared 0.5 interface…';try{const r=await fetch(new URL('../../../assets/examples/bicontinuity-3d/viewer.json',location.href));if(!r.ok)throw Error('Mesh unavailable');const m=(await r.json()).meshes.red;mesh={type:'mesh3d',x:m.vertices.map(p=>p[0]),y:m.vertices.map(p=>p[1]),z:m.vertices.map(p=>p[2]),i:m.triangles.map(t=>t[0]),j:m.triangles.map(t=>t[1]),k:m.triangles.map(t=>t[2]),name:'c = 0.5',hoverinfo:'skip',lighting:{ambient:.35,diffuse:.8,specular:.3,roughness:.6},lightposition:{x:400,y:300,z:500}};}catch(e){el('plotly-status').textContent=e.message;return;}}el('plotly-status').textContent='Drag to rotate, scroll to zoom; camera stays fixed while the flood grows.';paint();};
  el('interface-opacity').oninput=paint;
  el('plotly-sections').onchange=paint;
  el('plotly-reset').onclick=()=>Plotly.relayout(el('plotly-volume'),{'scene.camera':layout.scene.camera});
  if(el('plotly-interface').checked)el('plotly-interface').onchange();

  el('plotly-status').textContent='Drag to rotate, scroll to zoom. The same flood animates here and in the exact sections below.';
 };
 // An editable 2D pattern makes scan-and-merge labeling visible cell by cell.
 const canvas=el('hk-pattern');if(!canvas)return;const ctx=canvas.getContext('2d'),size=24,cell=canvas.width/size;let mask=[],cursor=0,playing=false,epoch=0;
 function pattern(){const f=Number(el('pattern-frequency').value),shift=Number(el('pattern-shift').value);mask=Array.from({length:size*size},(_,i)=>Math.sin(i%size/size*2*Math.PI*f+shift)+Math.cos(Math.floor(i/size)/size*2*Math.PI*f)+.45*Math.sin((i%size+Math.floor(i/size))/size*2*Math.PI*f)>0);reset();}
 function draw(){const parent=Array.from({length:size*size},(_,i)=>i),seen=new Set();let unions=0;const find=a=>{while(parent[a]!==a){parent[a]=parent[parent[a]];a=parent[a];}return a;},join=(a,b)=>{a=find(a);b=find(b);if(a!==b){parent[Math.max(a,b)]=Math.min(a,b);unions++;}};
  for(let i=0;i<Math.min(cursor,mask.length);i++){if(!mask[i])continue;seen.add(i);const x=i%size,y=Math.floor(i/size);if(x>0&&seen.has(i-1))join(i,i-1);if(y>0&&seen.has(i-size))join(i,i-size);}
  if(cursor>mask.length&&el('hk-periodic').checked){for(let y=0;y<size;y++)if(seen.has(y*size)&&seen.has(y*size+size-1))join(y*size,y*size+size-1);for(let x=0;x<size;x++)if(seen.has(x)&&seen.has((size-1)*size+x))join(x,(size-1)*size+x);}
  const roots=[...new Set([...seen].map(find))];ctx.clearRect(0,0,canvas.width,canvas.height);mask.forEach((occupied,i)=>{ctx.fillStyle=!occupied?'#fbfaf5':!seen.has(i)?'#d8dee4':`hsl(${(roots.indexOf(find(i))*137.508+185)%360} 65% 52%)`;ctx.fillRect(i%size*cell,Math.floor(i/size)*cell,cell-1,cell-1);});
  if(cursor<mask.length){ctx.strokeStyle='#f2af00';ctx.lineWidth=3;ctx.strokeRect(cursor%size*cell,Math.floor(cursor/size)*cell,cell,cell);}
  el('hk-status').textContent=cursor>mask.length?`${roots.length} final components; ${unions} label merges. ${el('hk-periodic').checked?'Opposite edges joined in the final step.':'Bounded edges.'}`:`Scanned ${cursor} / ${mask.length} cells; ${roots.length} current components; ${unions} label merges. Equal colours share one root label.`;
  window.hkPlaygroundState={cursor,components:roots.length,merges:unions,mask:[...mask]};
 }
 function reset(){playing=false;epoch++;cursor=0;draw();}
 function frame(token){if(!playing||token!==epoch)return;cursor=Math.min(mask.length+1,cursor+4);draw();if(cursor<=mask.length)setTimeout(()=>frame(token),Number(el('hk-speed').value));else playing=false;}
 el('hk-play').onclick=()=>{if(cursor>mask.length)cursor=0;playing=true;frame(++epoch);};el('hk-pause').onclick=()=>{playing=false;epoch++;};el('hk-step').onclick=()=>{playing=false;epoch++;cursor=Math.min(mask.length+1,cursor+1);draw();};el('hk-reset').onclick=reset;el('hk-finish').onclick=()=>{playing=false;epoch++;cursor=mask.length+1;draw();};
 el('pattern-frequency').oninput=pattern;el('pattern-shift').oninput=pattern;el('hk-periodic').onchange=draw;
 canvas.onclick=event=>{const box=canvas.getBoundingClientRect(),x=Math.floor((event.clientX-box.left)/box.width*size),y=Math.floor((event.clientY-box.top)/box.height*size);if(x>=0&&x<size&&y>=0&&y<size){mask[y*size+x]=!mask[y*size+x];reset();}};pattern();
})();
