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
      // Render only exposed voxel faces, avoiding opaque stacks of internal faces.
      const occupied=new Set(data[phase].map(p=>p.join(',')));
      phases[phase]=[];let faces=[];
      function flush(){if(faces.length){const mesh=compound(faces);mesh.opacity=.15;phases[phase].push(mesh);faces=[];}}
      for(const p of data[phase])for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
        const neighbour=[...p];neighbour[axis]+=sign;
        if(occupied.has(neighbour.join(',')))continue;
        const others=[0,1,2].filter(a=>a!==axis),normal=[0,0,0];normal[axis]=sign;
        const corners=[[0,0],[1,0],[1,1],[0,1]].map(c=>{const v=[...p];v[axis]+=sign>0?1:0;v[others[0]]+=c[0];v[others[1]]+=c[1];return vertex({pos:vec(...v),normal:vec(...normal),color:colors[phase]});});
        if((axis===1?-1:1)!==sign)corners.reverse();
        faces.push(quad({v0:corners[0],v1:corners[1],v2:corners[2],v3:corners[3]}));
        // Stay below GlowScript's 65536-vertex limit per compound mesh.
        if(faces.length===1500)flush();
      }
      flush();
    }
    for(let axis=0;axis<3;axis++)for(const u of [0,n])for(const v of [0,n]){
      const p=[0,0,0],q=[0,0,0],others=[0,1,2].filter(a=>a!==axis);p[others[0]]=q[others[0]]=u;p[others[1]]=q[others[1]]=v;q[axis]=n;
      curve({pos:[vec(...p),vec(...q)],radius:.035,color:vec(.5,.5,.5)});
    }
    for (let a=0;a<3;a++) {
      const start=[0,0,0], end=[0,0,0];end[a]=n;
      arrow({pos:vec(...start),axis:vec(...end),shaftwidth:.12,color:vec(.2,.2,.2)});
      label({pos:vec(...end),text:'xyz'[a],box:false,height:16,color:vec(0,0,0)});
    }
    const turtle = [ellipsoid({size:vec(.85,.65,1.1),color:vec(.2,.65,.22)}),sphere({radius:.23,color:vec(.35,.8,.3)})];
    const offsets=[[0,0,0],[0,0,.65]];
    for(const x of [-.38,.38]) for(const z of [-.32,.32]){turtle.push(sphere({radius:.16,color:vec(.35,.8,.3)}));offsets.push([x,-.18,z]);}
    let route, progress=0, running=false, last=performance.now(), crossings=0;
    const updateVisibility = () => {for(const phase of ['red','blue']){for(const mesh of phases[phase]){mesh.visible=phase===el('phase').value || el('other').checked; mesh.opacity=phase===el('phase').value ? Number(el('opacity').value):.08;}}};
    function reset(){running=false;progress=0;crossings=0;route=data.routes[el('phase').value][el('direction').value];updateVisibility();draw();}
    function draw(){
      const i=Math.min(Math.floor(progress),route.length-2), t=progress>=route.length-1?1:progress-i;
      const a=route[i], b=route[i+1];
      const delta=b.map((x,j)=>((x-a[j]+n+n/2)%n)-n/2);
      const p=a.map((x,j)=>((x+.5+delta[j]*t)%n+n)%n);
      for(let j=0;j<turtle.length;j++) turtle[j].pos=vec(...p.map((x,k)=>x+offsets[j][k]));
      status.textContent=`${el('phase').value} · ${el('direction').value} loop · step ${Math.floor(progress)} / ${route.length-1} · ${crossings} periodic face crossings · ${progress>=route.length-1?'Complete: winding +1 in '+el('direction').value:running?'Running':'Paused'}`;
      window.bicontinuityState={phase:el('phase').value,direction:el('direction').value,progress,running,crossings,position:p};
    }
    el('start').onclick=()=>{if(progress>=route.length-1) reset();running=true;last=performance.now();};
    el('pause').onclick=()=>{running=false;draw();};el('reset').onclick=reset;
    el('phase').onchange=reset;el('direction').onchange=reset;el('opacity').oninput=updateVisibility;el('other').onchange=updateVisibility;
    let html='<h2>Measured periodic connectivity</h2><table><tr><th>Threshold</th><th>Phase</th><th>Fraction</th><th>Components</th><th>Largest / phase</th><th>Winding rank</th></tr>';
    for(const [threshold,ph] of Object.entries(report.thresholds)) for(const [name,r] of Object.entries(ph))html+=`<tr><td>${threshold}</td><td>${name}</td><td>${(100*r.phase_fraction).toFixed(2)}%</td><td>${r.components}</td><td>${(100*r.largest_fraction_of_phase).toFixed(0)}%</td><td>${r.component_details[0].winding_rank} (x,y,z)</td></tr>`;
    el('measurements').innerHTML=html+'</table><p>Six face-sharing neighbours with periodic indexing. Winding is obtained from closed loops in a lifted graph; opposite-face contact alone is insufficient. Maximum mass drift: '+report.max_mass_drift.toExponential(2)+'. Energy: '+report.energy_initial.toFixed(3)+' → '+report.energy_final.toFixed(3)+'.</p>';
    reset();
    function frame(now){const dt=Math.min((now-last)/1000,.1);last=now;if(running){const old=Math.floor(progress);progress=Math.min(route.length-1,progress+dt*Number(el('speed').value));for(let i=old;i<Math.floor(progress);i++) if(route[i].some((x,j)=>Math.abs(route[i+1][j]-x)>1))crossings++;if(progress>=route.length-1)running=false;draw();}requestAnimationFrame(frame);}
    requestAnimationFrame(frame);
  } catch(error){status.textContent='Viewer could not load: '+error.message+'. Use the source downloads or try a browser with WebGL enabled.';console.error(error);}
})();
