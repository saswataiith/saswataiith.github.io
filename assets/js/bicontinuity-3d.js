// Copyright (c) 2026 Saswata Bhattacharyya.
// I permit free noncommercial teaching and demonstrations with acknowledgment.
// I require written permission for research or commercial use.
// I retain permissions granted by earlier licenses; dependencies keep their licenses.
// I give the full terms at https://saswataiith.github.io/files/CODE-USE-TERMS.txt.
/* Optional focused VPython view. One interface, one selected winding loop.
   The full connectivity demonstration is the linked flood-volume explorer. */
(function(){
 const el=id=>document.getElementById(id);let ready=false,loading=false,scene,data,surfaces=[],loops={red:{},blue:{}};
 async function open(){
  el('three-panel').hidden=false;if(ready){update();return;}if(loading)return;loading=true;
  try{
   const base=new URL('../../../assets/examples/bicontinuity-3d/viewer.json?v=clear-connectivity-1',location.href),response=await fetch(base);if(!response.ok)throw Error('Surface data unavailable');data=await response.json();
   window.__context={glowscript_container:$('#glowscript')};const n=data.n;
   scene=canvas({width:Math.min(880,innerWidth-50),height:560,background:vec(.98,.98,.96),center:vec(n/2,n/2,n/2),range:n*.75});scene.forward=vec(-1,-.7,-1);scene.lights=[];scene.ambient=vec(.25,.25,.25);
   for(const [direction,intensity] of [[[-.6,.8,-1],.65],[[1,-.2,.4],.25],[[.3,.7,1],.2]])distant_light({direction:vec(...direction),color:vec(intensity,intensity,intensity)});
   const mesh=data.meshes.red;
   for(let start=0;start<mesh.triangles.length;start+=1500){
    const vertices=new Map(),point=i=>{if(!vertices.has(i))vertices.set(i,vertex({pos:vec(...mesh.vertices[i]),normal:vec(...mesh.normals[i]),color:vec(1,1,1)}));return vertices.get(i);};
    const faces=mesh.triangles.slice(start,start+1500).map(t=>triangle({v0:point(t[0]),v1:point(t[1]),v2:point(t[2])}));const surface=compound(faces);surface.shininess=.35;surfaces.push(surface);await new Promise(resolve=>setTimeout(resolve,0));
   }
   function draw(route){const objects=[];let points=[route[0].map(x=>x+.5)];
    const flush=()=>{if(points.length>1)objects.push(curve({pos:points.map(p=>vec(...p)),radius:1,color:vec(1,.78,0),emissive:true}));};
    for(let i=1;i<route.length;i++){
     const a=route[i-1].map(x=>x+.5),b=route[i].map(x=>x+.5),axis=b.findIndex((x,j)=>Math.abs(x-a[j])>data.n/2);
     if(axis<0)points.push(b);else{const face=[...a];face[axis]=b[axis]<a[axis]?data.n:0;points.push(face);flush();const paired=[...face];paired[axis]=face[axis]===0?data.n:0;points=[paired,b];for(const p of [face,paired])objects.push(sphere({pos:vec(...p),radius:3,color:vec(1,.78,0),emissive:true}));}
    }flush();return objects;
   }
   for(const phase of ['red','blue'])for(const [axis,route] of Object.entries(data.routes[phase]))loops[phase][axis]=draw(route);
   ready=true;window.focusedSurfaceReady=true;update();el('surface-status').textContent='Rotate: right-drag / Ctrl-drag. Zoom: wheel. Gold paired dots mark the periodic face crossing.';
  }catch(error){el('surface-status').textContent='Could not load 3D view: '+error.message;console.error(error);}finally{loading=false;}
 }
 function update(){if(!ready)return;const phase=el('phase').value,show=el('show-loop').checked;
  for(const s of surfaces){s.color=phase==='red'?vec(.78,.15,.2):vec(.12,.35,.78);s.opacity=show?.15:1;}
  for(const p of ['red','blue'])for(const [axis,objects] of Object.entries(loops[p]))for(const o of objects)o.visible=show&&p===phase&&axis===el('loop-axis').value;
  window.focusedSurfaceState={phase,loop:show?el('loop-axis').value:null};
 }
 el('open-three').onclick=open;el('phase').addEventListener('change',update);el('show-loop').onchange=update;el('loop-axis').onchange=update;
 el('camera-reset').onclick=()=>{if(ready){scene.center=vec(data.n/2,data.n/2,data.n/2);scene.range=data.n*.75;scene.forward=vec(-1,-.7,-1);}};
})();
