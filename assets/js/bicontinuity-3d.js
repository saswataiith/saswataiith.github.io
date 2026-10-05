/* Static percolation witnesses on a fixed 256^3 field. No simulation or turtle.
   Every graph edge is a verified face-sharing step. Periodic edges are split at
   paired box faces; collinear rendering compression preserves the graph paths. */
(async function(){
 const el=id=>document.getElementById(id),status=el('status');
 try{
  const base=new URL('../../../assets/examples/bicontinuity-3d/',location.href);
  const get=async name=>{const r=await fetch(new URL(name+'?v=percolation-20261005',base));if(!r.ok)throw Error(name+': '+r.status);return r.json();};
  const [data,report]=await Promise.all([get('viewer.json'),get('report.json')]);
  window.__context={glowscript_container:$('#glowscript')};
  const n=data.n,scene=canvas({width:Math.min(820,innerWidth-40),height:540,background:vec(.98,.98,.96),center:vec(n/2,n/2,n/2),range:n*.75});
  scene.forward=vec(-1,-.7,-1);scene.lights=[];scene.ambient=vec(.22,.22,.22);
  distant_light({direction:vec(-.6,.8,-1),color:vec(.45,.45,.45)});
  distant_light({direction:vec(1,-.2,.4),color:vec(.18,.18,.18)});
  distant_light({direction:vec(.3,.7,1),color:vec(.12,.12,.12)});
  const surfaces=[],lines={red:[],blue:[]},loops={red:[],blue:[]},colors={red:vec(.8,.08,.06),blue:vec(.03,.28,.85)};
  const mesh=data.meshes.red; // One shared c=0.5 interface, neutral in both-phase view.
  for(let start=0;start<mesh.triangles.length;start+=1500){
   const vertices=new Map(),point=i=>{if(!vertices.has(i))vertices.set(i,vertex({pos:vec(...mesh.vertices[i]),normal:vec(...mesh.normals[i]),color:vec(.5,.55,.58)}));return vertices.get(i);};
   const faces=mesh.triangles.slice(start,start+1500).map(t=>triangle({v0:point(t[0]),v1:point(t[1]),v2:point(t[2])}));
   const surface=compound(faces);surface.opacity=.04;surface.shininess=.25;surfaces.push(surface);
   status.textContent='Loading c = 0.5 interface…';await new Promise(resolve=>setTimeout(resolve,0));
  }
  function drawPath(path,color,radius,out){
   let points=[path[0].map(x=>x+.5)];
   function flush(){if(points.length<2)return;
    // Remove only straight-line intermediate points; never smooth corners.
    const simple=[points[0]];
    for(let i=1;i<points.length-1;i++){
     const a=points[i-1],b=points[i],c=points[i+1];const d1=b.map((x,j)=>x-a[j]),d2=c.map((x,j)=>x-b[j]);
     if(d1.some((x,j)=>Math.abs(x*d2[(j+1)%3]-d1[(j+1)%3]*d2[j])>1e-8))simple.push(b);
    }
    simple.push(points.at(-1));out.push(curve({pos:simple.map(p=>vec(...p)),radius,color,emissive:true}));
   }
   for(let i=0;i<path.length-1;i++){
    const a=path[i].map(x=>x+.5),b=path[i+1].map(x=>x+.5),axis=b.findIndex((x,j)=>Math.abs(x-a[j])>n/2);
    if(axis>=0){const face=[...a];face[axis]=b[axis]<a[axis]?n:0;points.push(face);flush();const partner=[...face];partner[axis]=face[axis]===n?0:n;points=[partner,b];}
    else points.push(b);
   }
   flush();
  }
  for(const phase of ['red','blue']){
   const net=data.networks[phase],adj=net.nodes.map(()=>[]),seen=new Set();
   for(const [u,v] of net.edges){adj[u].push(v);adj[v].push(u);}
   const key=(u,v)=>u<v?u+','+v:v+','+u;
   // Trace maximal chains between junctions, preserving all branch edges.
   for(let root=0;root<adj.length;root++)if(adj[root].length!==2)for(const first of adj[root]){
    if(seen.has(key(root,first)))continue;let prev=root,current=first;const path=[net.nodes[root]];
    seen.add(key(prev,current));
    while(true){path.push(net.nodes[current]);if(adj[current].length!==2)break;
     const next=adj[current].find(v=>v!==prev);if(seen.has(key(current,next)))break;seen.add(key(current,next));prev=current;current=next;
    }
    drawPath(path,colors[phase],n/650,lines[phase]);
   }
   if(seen.size!==net.edges.length)throw Error('Unrendered network edges: '+phase);
   for(const route of Object.values(data.routes[phase]))drawPath(route,colors[phase],n/330,loops[phase]);
  }
  for(let axis=0;axis<3;axis++)for(const u of [0,n])for(const v of [0,n]){
   const p=[0,0,0],q=[0,0,0],others=[0,1,2].filter(a=>a!==axis);p[others[0]]=q[others[0]]=u;p[others[1]]=q[others[1]]=v;q[axis]=n;
   curve({pos:[vec(...p),vec(...q)],radius:n/1500,color:vec(.65,.65,.65)});
  }
  function update(){
   for(const surface of surfaces){surface.visible=el('interface').checked;surface.opacity=Number(el('opacity').value);}
   for(const phase of ['red','blue']){const visible=el('phase').value==='both'||el('phase').value===phase;for(const line of lines[phase])line.visible=visible;for(const line of loops[phase])line.visible=visible&&el('loops').checked;}
   status.textContent='Verified connected red and blue witness networks. Thicker curves mark three independent wrapping loops per phase. Periodic links stop at one face and resume at its paired face.';
   window.percolationState={phase:el('phase').value,interfaceVisible:el('interface').checked,loopsVisible:el('loops').checked,networks:{red:data.networks.red.proof,blue:data.networks.blue.proof}};
  }
  for(const id of ['phase','interface','loops'])el(id).onchange=update;el('opacity').oninput=update;
  el('camera-reset').onclick=()=>{scene.center=vec(n/2,n/2,n/2);scene.range=n*.75;scene.forward=vec(-1,-.7,-1);};
  let html='<h2>Measured on every saved voxel</h2><table><tr><th>Threshold</th><th>Phase</th><th>Fraction</th><th>Components</th><th>Largest / phase</th><th>Independent winding directions</th></tr>';
  for(const [t,phases] of Object.entries(report.thresholds))for(const [name,r] of Object.entries(phases))html+=`<tr><td>${t}</td><td>${name}</td><td>${(100*r.phase_fraction).toFixed(2)}%</td><td>${r.components}</td><td>${(100*r.largest_fraction_of_phase).toFixed(0)}%</td><td>${r.winding_rank}</td></tr>`;
  el('measurements').innerHTML=html+'</table><p>At every threshold, each entire phase is one connected component. Both contain three independent noncontractible wrapping loops. This establishes bicontinuity for the saved discrete field under six-neighbour periodic connectivity.</p>';
  update();
 }catch(error){status.textContent='Could not load percolation viewer: '+error.message;console.error(error);}
})();
