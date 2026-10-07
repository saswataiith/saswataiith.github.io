/* Full-volume flood distances: high bit=red; low 15 bits=shortest graph distance.
   Every slice uses all 256 x 256 original voxels. No simulation evolves here. */
(async function(){
 const el=id=>document.getElementById(id),state={phase:'red',step:0,playing:false,loaded:false};
 let volume,analysis,n,histograms,stageStart=0,generation=0;
 const canvases=['x','y','z'].map(a=>el('slice-'+a));
 const colours={red:[194,40,54],blue:[25,97,195]};
 function render(){
  if(!state.loaded)return;
  const selected=state.phase==='red',max=analysis.flood[state.phase].maximum_distance;
  const step=Math.min(max,Math.round(state.step));el('flood-step').value=step;el('flood-step').max=max;
  for(let axis=0;axis<3;axis++){
   const context=canvases[axis].getContext('2d'),image=context.createImageData(n,n),position=Number(el('position-'+axis).value),others=[0,1,2].filter(a=>a!==axis);
   for(let v=0;v<n;v++)for(let u=0;u<n;u++){
    const p=[0,0,0];p[axis]=position;p[others[0]]=u;p[others[1]]=v;
    const encoded=volume[(p[0]*n+p[1])*n+p[2]],red=(encoded&32768)!==0,distance=encoded&32767,index=4*(v*n+u);
    let colour=[247,247,242];
    if(red===selected){colour=distance<=step?colours[state.phase]:(selected?[249,218,222]:[214,229,250]);if(distance===step&&step<max)colour=[255,196,0];}
    if(el('show-both').checked&&red!==selected)colour=red?[229,164,174]:[150,185,229];
    image.data.set([...colour,255],index);
   }
   context.putImageData(image,0,0);
   const root=analysis.flood[state.phase].root;
   if(root[axis]===position){context.strokeStyle='#1b172d';context.lineWidth=1;context.beginPath();context.arc(root[others[0]]+.5,root[others[1]]+.5,4,0,2*Math.PI);context.stroke();}
   el('plane-'+axis).textContent='xyz'[axis]+' = '+position+'; horizontal '+ 'xyz'[others[0]]+', vertical '+ 'xyz'[others[1]];
  }
  const reached=histograms[state.phase][step],total=analysis.flood[state.phase].reached_voxels,percent=100*reached/total;
  el('reached').textContent=percent.toFixed(1)+'%';el('reached-count').textContent=reached.toLocaleString()+' / '+total.toLocaleString()+' voxels';
  el('wave-label').textContent='Shortest-path distance: '+step+' face-sharing steps from seed ('+analysis.flood[state.phase].root.join(', ')+').';
  el('flood-status').textContent=step===max?'Every voxel of this phase is reached from one seed. The entire phase is connected.':'The color front travels only through the selected phase, including periodic links. Apparent separate patches in a slice can join outside that plane.';
  window.connectivityExplorerState={...state,step,reached,total};
  if(window.playgroundUpdate)window.playgroundUpdate(window.connectivityExplorerState);
 }
 function frame(time,token){if(!state.playing||token!==generation)return;state.step=(time-stageStart)/(8000/Number(el('flood-speed').value||1))*analysis.flood[state.phase].maximum_distance;render();if(state.step>=analysis.flood[state.phase].maximum_distance){state.playing=false;generation++;el('grow').textContent='Flood again';}else requestAnimationFrame(t=>frame(t,token));}
 function phaseChanged(){state.phase=el('phase').value;state.playing=false;generation++;state.step=analysis.flood[state.phase].maximum_distance;el('grow').textContent='Flood from one seed';analysis.flood[state.phase].root.forEach((v,a)=>el('position-'+a).value=v);render();}
 try{
  const base=new URL('../../../assets/examples/bicontinuity-3d/',location.href);
  const r=await fetch(new URL('analysis.json?v=clear-connectivity-1',base));if(!r.ok)throw Error('Measurements unavailable');analysis=await r.json();n=analysis.grid[0];
  const response=await fetch(new URL('phase-flood.bin.gz?v=clear-connectivity-1',base));if(!response.ok)throw Error('Volume unavailable');
  if(typeof DecompressionStream==='undefined')throw Error('This browser lacks gzip support. Use a current browser or the Python source.');
  const buffer=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  if(buffer.byteLength!==n**3*2)throw Error('Incorrect volume length');volume=new Uint16Array(buffer);
  histograms={red:new Uint32Array(32768),blue:new Uint32Array(32768)};
  for(const encoded of volume)histograms[(encoded&32768)?'red':'blue'][encoded&32767]++;
  for(const phase of ['red','blue']){const h=histograms[phase];for(let i=1;i<h.length;i++)h[i]+=h[i-1];}
  if(window.mountConnectivityPlayground)window.mountConnectivityPlayground({volume,analysis,n,histograms});
  state.loaded=true;phaseChanged();
  for(let axis=0;axis<3;axis++){el('position-'+axis).oninput=render;canvases[axis].width=canvases[axis].height=n;}
  el('phase').addEventListener('change',phaseChanged);el('show-both').onchange=render;
  el('flood-step').oninput=()=>{state.playing=false;generation++;state.step=Number(el('flood-step').value);render();};
  el('grow').onclick=()=>{const token=++generation;state.step=0;state.playing=true;stageStart=performance.now();el('grow').textContent='Growing…';render();requestAnimationFrame(t=>frame(t,token));};
  el('pause').onclick=()=>{state.playing=false;generation++;el('grow').textContent='Flood from one seed';};
  el('complete').onclick=()=>{state.playing=false;generation++;state.step=analysis.flood[state.phase].maximum_distance;render();};
  el('seed-slices').onclick=()=>{analysis.flood[state.phase].root.forEach((v,a)=>el('position-'+a).value=v);render();};
  let html='<table><caption>Independent label-and-merge measurements on the original voxels</caption><thead><tr><th>Threshold</th><th>Phase</th><th>Components</th><th>Largest / phase</th><th>Winding rank</th><th>Digital Euler (6-neighbour)</th></tr></thead><tbody>';
  for(const [threshold,phases] of Object.entries(analysis.thresholds))for(const [phase,m] of Object.entries(phases))html+=`<tr><td>${threshold}</td><td>${phase}</td><td>${m.components}</td><td>${(100*m.largest_fraction_of_phase).toFixed(0)}%</td><td>${m.clusters[0].winding_rank}</td><td>${m.digital_euler_6}</td></tr>`;
  el('measurements').innerHTML=html+'</tbody></table>';
  const m=analysis.morphology;
  el('morphology').innerHTML=`<p>Full periodic c = 0.5 interface area: <strong>${m.surface_area.toFixed(2)}</strong> dimensionless area units.</p>`+(m.edge_incidence_two&&m.coherent_orientation?`<p>Surface components: <strong>${m.surface_components}</strong>; surface Euler characteristic: <strong>${m.surface_euler}</strong>; sum of surface genera: <strong>${m.sum_surface_genera}</strong>.</p><p>Integrated mean curvature (normal out of high-c phase): <strong>${m.integrated_mean_curvature_high_c_outward.toFixed(3)}</strong>. Integrated Gaussian curvature: <strong>${m.integrated_gaussian_curvature.toFixed(3)}</strong>.</p>`:'<p>Mesh closure/orientation checks did not pass, so surface genus and curvature are not inferred.</p>');
  el('load-status').textContent='Full-resolution field loaded. Choose red or blue, then flood from one seed.';render();
 }catch(error){el('load-status').textContent='Could not load the explorer: '+error.message;console.error(error);}
})();
