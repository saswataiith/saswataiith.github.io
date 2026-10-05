/* VPython's GlowScript JavaScript API. Coordinates are voxel centres.
   A periodic step is interpolated in the lifted domain, then reduced mod n.
   Thus it reaches a face and resumes at its partner, never across the box. */
(async function () {
  const el = id => document.getElementById(id), status = el('status');
  try {
    const base = new URL('../../../assets/examples/bicontinuity-3d/', location.href);
    const fetchJSON = async name => { const r = await fetch(new URL(name, base)); if (!r.ok) throw Error(`${name}: ${r.status}`); return r.json(); };
    const [data, report] = await Promise.all([fetchJSON('viewer.json'), fetchJSON('report.json')]);
    window.__context = {glowscript_container: $('#glowscript')};
    const n = data.n, scene = canvas({width:Math.min(760,innerWidth-40),height:480,background:vec(0.98,0.98,0.96),center:vec(n/2,n/2,n/2),range:n*.8});
    scene.forward = vec(-1,-.7,-1);
    const colors = {red:vec(.85,.14,.12),blue:vec(.12,.38,.85)}, phases = {};
    for (const phase of ['red','blue']) {
      // A display-only surface extracted from the 256^3 simulation offline.
      // No PDE, voxel downsampling or connectivity calculation runs here.
      phases[phase]=[];const mesh=data.meshes[phase];
      for(let start=0;start<mesh.triangles.length;start+=1500){
        const triangles=mesh.triangles.slice(start,start+1500),vertices=new Map();
        const point=i=>{if(!vertices.has(i))vertices.set(i,vertex({pos:vec(...mesh.vertices[i]),normal:vec(...mesh.normals[i]),color:colors[phase]}));return vertices.get(i);};
        const faces=triangles.map(t=>triangle({v0:point(t[0]),v1:point(t[1]),v2:point(t[2])}));
        const surface=compound(faces);surface.opacity=.15;surface.visible=false;phases[phase].push(surface);
        status.textContent=`Loading saved 256³ surface: ${phase}, ${Math.min(start+1500,mesh.triangles.length)} / ${mesh.triangles.length} triangles…`;
        // Yield between meshes so the page stays responsive while loading.
        await new Promise(resolve=>setTimeout(resolve,0));
      }
    }
    for(let axis=0;axis<3;axis++)for(const u of [0,n])for(const v of [0,n]){
      const p=[0,0,0],q=[0,0,0],others=[0,1,2].filter(a=>a!==axis);p[others[0]]=q[others[0]]=u;p[others[1]]=q[others[1]]=v;q[axis]=n;
      curve({pos:[vec(...p),vec(...q)],radius:n/1000,color:vec(.5,.5,.5)});
    }
    for (let a=0;a<3;a++) {
      const start=[0,0,0], end=[0,0,0];end[a]=n;
      arrow({pos:vec(...start),axis:vec(...end),shaftwidth:n/200,color:vec(.2,.2,.2)});
      label({pos:vec(...end),text:'xyz'[a],box:false,height:16,color:vec(0,0,0)});
    }
    const marker=n/32;
    const turtle = [ellipsoid({size:vec(.85*marker,.65*marker,1.1*marker),color:vec(.2,.65,.22)}),sphere({radius:.23*marker,color:vec(.35,.8,.3)})];
    const offsets=[[0,0,0],[0,0,.65]];
    for(const x of [-.38,.38]) for(const z of [-.32,.32]){turtle.push(sphere({radius:.16*marker,color:vec(.35,.8,.3)}));offsets.push([x,-.18,z]);}
    let lines=[];
    let route, progress=0, running=false, last=performance.now(), crossings=0;
    const updateVisibility = () => {for(const phase of ['red','blue']){for(const mesh of phases[phase]){mesh.visible=phase===el('phase').value || el('other').checked; mesh.opacity=phase===el('phase').value ? Number(el('opacity').value):.08;}}};
    function drawRoute(){
      for(const line of lines)line.visible=false;lines=[];
      let points=[route[0].map(x=>x+.5)];
      function flush(){if(points.length>1)lines.push(curve({pos:points.map(p=>vec(...p)),radius:n/1100,color:vec(.2,.1,.35)}));}
      for(let i=0;i<route.length-1;i++){
        const a=route[i].map(x=>x+.5),b=route[i+1].map(x=>x+.5);
        const axis=b.findIndex((x,j)=>Math.abs(x-a[j])>1);
        if(axis>=0){const sign=b[axis]<a[axis]?1:-1,face=[...a];face[axis]=sign>0?n:0;points.push(face);flush();const partner=[...face];partner[axis]=sign>0?0:n;points=[partner,b];}
        else points.push(b);
      }
      flush();
    }
    function reset(){running=false;progress=0;crossings=0;route=data.routes[el('phase').value][el('direction').value];updateVisibility();drawRoute();draw();}
    function draw(){
      const i=Math.min(Math.floor(progress),route.length-2), t=progress>=route.length-1?1:progress-i;
      const a=route[i], b=route[i+1];
      const delta=b.map((x,j)=>((x-a[j]+n+n/2)%n)-n/2);
      const p=a.map((x,j)=>((x+.5+delta[j]*t)%n+n)%n);
      for(let j=0;j<turtle.length;j++) turtle[j].pos=vec(...p.map((x,k)=>x+marker*offsets[j][k]));
      status.textContent=`${el('phase').value} · ${el('direction').value} loop · step ${Math.floor(progress)} / ${route.length-1} · ${crossings} periodic face crossings · ${progress>=route.length-1?'Complete: winding +1 in '+el('direction').value:running?'Running':'Paused'}`;
      window.bicontinuityState={phase:el('phase').value,direction:el('direction').value,progress,running,crossings,position:p};
    }
    el('start').onclick=()=>{if(progress>=route.length-1) reset();running=true;last=performance.now();};
    el('pause').onclick=()=>{running=false;draw();};el('reset').onclick=reset;
    el('phase').onchange=reset;el('direction').onchange=reset;el('opacity').oninput=updateVisibility;el('other').onchange=updateVisibility;
    let html='<h2>Measured periodic connectivity</h2><table><tr><th>Threshold</th><th>Phase</th><th>Fraction</th><th>Components</th><th>Largest / phase</th><th>Winding rank</th></tr>';
    for(const [threshold,ph] of Object.entries(report.thresholds)) for(const [name,r] of Object.entries(ph))html+=`<tr><td>${threshold}</td><td>${name}</td><td>${(100*r.phase_fraction).toFixed(2)}%</td><td>${r.components}</td><td>${(100*r.largest_fraction_of_phase).toFixed(0)}%</td><td>${r.winding_rank} (x,y,z)</td></tr>`;
    el('measurements').innerHTML=html+'</table><p>Six face-sharing neighbours with periodic indexing. Winding is obtained from closed loops in a lifted graph; opposite-face contact alone is insufficient. Maximum mass drift: '+report.max_mass_drift.toExponential(2)+'. Energy: '+report.energy_initial.toFixed(3)+' → '+report.energy_final.toFixed(3)+'. Fixed 256³ field: the viewer does not evolve the simulation.</p>';
    reset();
    function frame(now){const dt=Math.min((now-last)/1000,.1);last=now;if(running){const old=Math.floor(progress);progress=Math.min(route.length-1,progress+dt*Number(el('speed').value));for(let i=old;i<Math.floor(progress);i++) if(route[i].some((x,j)=>Math.abs(route[i+1][j]-x)>1))crossings++;if(progress>=route.length-1)running=false;draw();}requestAnimationFrame(frame);}
    requestAnimationFrame(frame);
  } catch(error){status.textContent='Viewer could not load: '+error.message+'. Use the source downloads or try a browser with WebGL enabled.';console.error(error);}
})();
