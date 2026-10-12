import {torus,torusLoops,tubeFillingDisk,openedSurface} from './topology-shapes-model.js?v=loops-1';
const root=document.getElementById('torus-loops');
const stage=root.querySelector('#torus-loop-stage'),plot=root.querySelector('#torus-loop-plot');
const gold='#986400',purple='#703bb1';let revision=0;
function line(points,color,dash='solid') {
  return {type:'scatter3d',mode:'lines',x:points.map(p=>p[0]),y:points.map(p=>p[1]),z:points.map(p=>p[2]),line:{color,width:8,dash},hoverinfo:'skip',showlegend:false};
}
function mesh(data,color='#b8d3d6',opacity=1) {
  return {type:'mesh3d',x:data.vertices.map(p=>p[0]),y:data.vertices.map(p=>p[1]),z:data.vertices.map(p=>p[2]),i:data.faces.map(f=>f[0]),j:data.faces.map(f=>f[1]),k:data.faces.map(f=>f[2]),color,opacity,flatshading:false,hoverinfo:'skip',lighting:{ambient:.7,diffuse:.7,specular:.1},showscale:false};
}
async function draw() {
  const current=Number(stage.value),id=++revision,loops=torusLoops();let traces,description,formula;
  if(current<2) {
    const boundary=torus(.3,.8);
    if(current===1) boundary.faces=boundary.faces.filter(face=>face.every(vertex=>boundary.vertices[vertex][0]<=1e-12));
    traces=[mesh(boundary),line(loops.aroundOpening,gold),line(loops.aroundTube,purple)];
    if(current===1) traces.push(mesh(tubeFillingDisk(),'#ba9bde',.9));
    description=current===0?'Gold runs around the central opening. Purple runs around the tube. On the boundary surface, neither loop bounds a filled surface patch. These two loop types generate its two independent one-dimensional homology features.':'Part of the boundary is hidden to reveal the interior. The purple loop bounds the shaded disk inside the filled tube. It can shrink across that disk to its center while staying in the solid. That disk is not part of the boundary surface. The gold loop still surrounds the central opening and cannot be filled within the solid.';
    formula='\\begin{aligned}\\beta_1(\\text{surface})&=2\\\\\\beta_1(\\text{solid})&=1\\end{aligned}';
  } else if(current===2) {
    traces=[mesh(openedSurface())];
    for(const x of [-1,1]) traces.push(line(Array.from({length:129},(_,n)=>[x,.45*Math.cos(2*Math.PI*n/128),.45*Math.sin(2*Math.PI*n/128)]),purple));
    traces.push(line([[-1,0,.455],[1,0,.455]],gold));
    description='I cut the boundary surface along the purple loop, then deform the opened surface into a cylinder. The two purple circles are the two copies of that cut. The surface remains in one piece. The gold loop has become an open path between those edges. One independent loop remains around the cylinder.';
    formula='\\begin{aligned}\\beta_0(\\text{cylinder})&=1\\\\\\beta_1(\\text{cylinder})&=1\\end{aligned}';
  } else {
    traces=[mesh(openedSurface(true))];
    for(const x of [-1,1]) traces.push(line([[x,-1,.01],[x,1,.01]],purple));
    for(const y of [-1,1]) traces.push(line([[-1,y,.01],[1,y,.01]],gold));
    description='I cut the cylinder along the gold path joining its two boundary edges, then flatten it into a rectangle. The two gold edges are copies of the second cut. The surface is still one connected piece, but it now has no independent loop. Joining corresponding gold edges gives the cylinder again; joining the purple edges restores the torus surface.';
    formula='\\begin{aligned}\\beta_0(\\text{rectangle})&=1\\\\\\beta_1(\\text{rectangle})&=0\\end{aligned}';
  }
  root.querySelector('#torus-loop-description').textContent=description;
  const equation=root.querySelector('#torus-loop-equation');equation.textContent='';
  root.querySelector('#torus-loop-previous').disabled=current===0;root.querySelector('#torus-loop-next').disabled=current===3;
  if(window.MathJax?.startup?.promise) {
    await MathJax.startup.promise;
    if(id!==revision) return;
    MathJax.typesetClear([equation]);
    equation.textContent='\\['+formula+'\\]';
    await MathJax.typesetPromise([equation]);
    if(id!==revision) return;
  }
  if(!window.Plotly) {root.querySelector('#torus-loop-description').textContent+=' The 3D renderer could not load.';return;}
  await Plotly.react(plot,traces,{margin:{l:0,r:0,t:0,b:0},paper_bgcolor:'#fff',scene:{aspectmode:'cube',xaxis:{visible:false,range:[-1.3,1.3]},yaxis:{visible:false,range:[-1.3,1.3]},zaxis:{visible:false,range:[-1.3,1.3]},camera:{eye:{x:.9,y:-1.1,z:.7}}},uirevision:'torus-loop-camera'},{responsive:true,displayModeBar:false});
}
stage.addEventListener('change',draw);
for(const [button,change] of [['#torus-loop-previous',-1],['#torus-loop-next',1]]) root.querySelector(button).addEventListener('click',()=>{stage.value=String(Number(stage.value)+change);draw();});
root.querySelector('#torus-loop-reset').addEventListener('click',()=>{stage.value='0';Plotly.relayout(plot,{'scene.camera.eye':{x:.9,y:-1.1,z:.7}});draw();});
draw();
