import {shapes,euler,shapeMeshes} from './topology-shapes-model.js';
const root=document.getElementById('shape-playground');
const dimension=root.querySelector('#shape-dimension'),choice=root.querySelector('#shape-choice');
const size=root.querySelector('#shape-size'),cut=root.querySelector('#shape-cut'),boundary=root.querySelector('#shape-boundary');
const plot=root.querySelector('#shape-3d'),diagram=root.querySelector('#shape-2d');
const colors=['#c85838','#247a93'];let plotted=false;let mathRevision=0;
async function renderMath(three,shape) {
  const revision=++mathRevision;
  if(!window.MathJax?.startup?.promise) return;
  await MathJax.startup.promise;
  const labels=[...root.querySelectorAll('[data-shape-math]')];
  const nodes=await Promise.all(labels.map(label=>MathJax.tex2chtmlPromise(label.dataset.shapeMath,{display:false})));
  const equation=three?`\\chi=\\beta_0-\\beta_1+\\beta_2=${shape.betti[0]}-${shape.betti[1]}+${shape.betti[2]}=${euler(shape.betti)}`:`\\chi=\\beta_0-\\beta_1=${shape.betti[0]}-${shape.betti[1]}=${euler(shape.betti)}`;
  const equationNode=await MathJax.tex2chtmlPromise(equation,{display:false});
  if(revision!==mathRevision) return;
  labels.forEach((label,index)=>label.replaceChildren(nodes[index]));
  root.querySelector('#shape-equation').replaceChildren(document.createTextNode(three?'Solid: ':'Region: '),equationNode);
}
function options() {
  choice.replaceChildren(...Object.entries(shapes).filter(([,shape])=>shape.dimension===Number(dimension.value)).map(([key,shape])=>new Option(shape.name,key)));
  choice.value=dimension.value==='2'?'annulus':'torus';draw();
}
function draw2D(key,fraction) {
  const outer='M 200 50 A 150 150 0 1 0 200 350 A 150 150 0 1 0 200 50 Z';
  const circle=(x,y,r)=>`M ${x} ${y-r} A ${r} ${r} 0 1 0 ${x} ${y+r} A ${r} ${r} 0 1 0 ${x} ${y-r} Z`;
  let path=outer,labels='<text x="200" y="25">Outer contour</text>';
  if(key==='annulus') {path+=circle(200,200,35+65*fraction);labels+='<text x="200" y="204">Hole</text>';}
  if(key==='holes') {path+=circle(140,200,20+25*fraction)+circle(260,200,20+25*fraction);labels+='<text x="140" y="205">Hole 1</text><text x="260" y="205">Hole 2</text>';}
  if(key==='disks') {path=circle(105,200,70)+circle(295,200,70);labels='<text x="105" y="105">Region 1</text><text x="295" y="105">Region 2</text>';}
  diagram.innerHTML=`<svg viewBox="0 0 400 400" role="img" aria-label="${shapes[key].name}"><path d="${path}" fill="${boundary.checked?'none':colors[0]}" fill-rule="evenodd" stroke="#67382d" stroke-width="4"/><g fill="#243237" text-anchor="middle" font-size="15">${labels}</g></svg>`;
}
function trace(mesh,index) {
  // I remove front triangles only for the cutaway display, not for the topology values.
  const faces=cut.checked?mesh.faces.filter(face=>face.every(vertex=>mesh.vertices[vertex][1]>=0)):mesh.faces;
  return {type:'mesh3d',x:mesh.vertices.map(v=>v[0]),y:mesh.vertices.map(v=>v[1]),z:mesh.vertices.map(v=>v[2]),i:faces.map(f=>f[0]),j:faces.map(f=>f[1]),k:faces.map(f=>f[2]),color:colors[index%2],opacity:boundary.checked?.65:1,flatshading:false,hoverinfo:'skip',lighting:{ambient:.45,diffuse:.8,specular:.25,roughness:.6},name:index===0?'Outer surface':'Inner surface'};
}
async function draw() {
  const key=choice.value,shape=shapes[key],three=shape.dimension===3,fraction=Number(size.value)/100;
  diagram.hidden=three;plot.hidden=!three;root.querySelector('#shape-cut-label').hidden=!three;
  root.querySelector('#shape-reset-camera').hidden=!three;
  size.disabled=!['annulus','holes','torus','shell'].includes(key);
  root.querySelector('#shape-size-value').textContent=`${size.value}% of the adjustment range`;
  root.querySelector('#shape-note').textContent=shape.note;
  const names=three?['Components','Tunnels','Cavities']:['Components','Holes'];
  const cards=shape.betti.map((n,index)=>`<div><span>${names[index]} <span class="shape-math" data-shape-math="\\beta_${index}">beta ${index}</span></span><strong>${n}</strong></div>`);
  cards.push(`<div><span>Filled ${three?'solid':'region'} <span class="shape-math" data-shape-math="\\chi">chi</span></span><strong>${euler(shape.betti)}</strong></div>`);
  if(three) cards.push(`<div><span>Boundary surfaces</span><strong>${shape.surfaceComponents}</strong></div>`,`<div><span>Boundary surface <span class="shape-math" data-shape-math="\\chi">chi</span></span><strong>${shape.surfaceEuler}</strong></div>`);
  else cards.push(`<div><span>Boundary contours</span><strong>${shape.contours}</strong></div>`);
  root.querySelector('#shape-counts').innerHTML=cards.join('');
  root.querySelector('#shape-equation').textContent=three?'Solid: Euler characteristic':'Region: Euler characteristic';
  renderMath(three,shape);
  root.querySelector('#shape-view-note').textContent=three?(cut.checked?'Cutaway view: the front half of each boundary surface is hidden to reveal the interior. Counts refer to the complete, uncut solid.':'The surfaces bound the filled solid. Drag to rotate and scroll or pinch to zoom.'):(boundary.checked?'Only the boundary contours are drawn. Counts still refer to the filled region.':'Colored areas are filled regions. White openings inside them are holes.');
  if(key==='shell') root.querySelector('#shape-view-note').textContent+=' Terracotta marks the outer boundary; blue marks the inner boundary around the cavity.';
  if(!three) {draw2D(key,fraction);return;}
  if(!window.Plotly) {root.querySelector('#shape-view-note').textContent='The 3D renderer did not load. The shape descriptions and topology values remain available.';return;}
  await Plotly.react(plot,shapeMeshes(key,fraction).map(trace),{margin:{l:0,r:0,t:0,b:0},paper_bgcolor:'#fff',scene:{aspectmode:'cube',xaxis:{visible:false,range:[-1.4,1.4]},yaxis:{visible:false,range:[-1.4,1.4]},zaxis:{visible:false,range:[-1.4,1.4]},camera:{eye:{x:.9,y:-1.1,z:.7}}},uirevision:'shape-camera'}, {responsive:true,displayModeBar:false});plotted=true;
}
dimension.addEventListener('change',options);
for(const control of [choice,size,cut,boundary]) control.addEventListener('input',draw);
root.querySelector('#shape-reset-camera').addEventListener('click',()=>{if(plotted) Plotly.relayout(plot,{'scene.camera.eye':{x:.9,y:-1.1,z:.7}});});
root.querySelector('#shape-reset').addEventListener('click',()=>{size.value='40';cut.checked=false;boundary.checked=false;options();});
options();
