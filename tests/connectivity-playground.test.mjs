import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('editable scan merges match independent four-neighbour components; Plotly sections use saved phase distances',async()=>{
 const nodes=new Map(),element=id=>{if(!nodes.has(id))nodes.set(id,{value:({ 'pattern-frequency':2,'pattern-shift':.7,'hk-speed':25,'position-0':4,'position-1':4,'position-2':4,'interface-opacity':.2})[id]??0,checked:id==='hk-periodic'||id==='plotly-sections',events:{},on(k,f){this.events[k]=f;}});return nodes.get(id);};
 const canvas=element('hk-pattern');canvas.width=480;canvas.getContext=()=>({clearRect(){},fillRect(){},strokeRect(){}});
 const calls=[],window={},ctx={window,document:{getElementById:element},console,performance:{now:()=>1000},URL,fetch:async()=>({ok:true,json:async()=>({meshes:{red:{vertices:[[0,0,0],[1,0,0],[0,1,0]],triangles:[[0,1,2]]}}})}),location:{href:'https://example.com/files/mesoscale/examples/bicontinuity-3d.html'},setTimeout(){},Plotly:{newPlot:async(...a)=>calls.push(['new',...a]),react:async(...a)=>calls.push(['react',...a]),restyle:async(...a)=>calls.push(['restyle',...a])}};
 vm.runInNewContext(fs.readFileSync('assets/js/connectivity-playground.js','utf8'),ctx);
 for(const periodic of [false,true]){
  element('hk-periodic').checked=periodic;element('hk-finish').onclick();const mask=window.hkPlaygroundState.mask,visited=new Set();let count=0;
  for(let i=0;i<mask.length;i++)if(mask[i]&&!visited.has(i)){count++;const stack=[i];visited.add(i);while(stack.length){const u=stack.pop(),x=u%24,y=Math.floor(u/24);for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){let a=x+dx,b=y+dy;if(periodic){a=(a+24)%24;b=(b+24)%24;}if(a<0||a>=24||b<0||b>=24)continue;const v=b*24+a;if(mask[v]&&!visited.has(v)){visited.add(v);stack.push(v);}}}}
  assert.equal(window.hkPlaygroundState.components,count);
 }
 const n=8,volume=new Uint16Array(n**3).fill(32768|2),analysis={flood:{red:{root:[4,4,4],maximum_distance:2,reached_voxels:512},blue:{root:[0,0,0],maximum_distance:2,reached_voxels:1}}},histograms={red:[1,100,512],blue:[0,0,1]};
 window.mountConnectivityPlayground({volume,analysis,n,histograms});window.playgroundUpdate({phase:'red',step:1,playing:false});await new Promise(setImmediate);
 const traces=calls.find(c=>c[0]==='react')[2];assert.equal(traces.length,4);assert.equal(traces[0].x[0][0],4);assert.equal(traces[0].surfacecolor[0][0],1);
 window.playgroundUpdate({phase:'red',step:2,playing:false});await new Promise(setImmediate);
 assert.equal(calls.filter(c=>c[0]==='react').at(-1)[2][0].surfacecolor[0][0],2);
 assert(element('plotly-volume').events.plotly_click);
 element('plotly-interface').checked=true;await element('plotly-interface').onchange();await new Promise(setImmediate);
 assert.equal(calls.filter(c=>c[0]==='react').at(-1)[2].at(-1).type,'mesh3d');
 element('plotly-sections').checked=false;element('plotly-sections').onchange();await new Promise(setImmediate);
 assert.equal(calls.filter(c=>c[0]==='react').at(-1)[2].filter(t=>t.type==='surface').length,0);
 assert.equal(calls.filter(c=>c[0]==='react').at(-1)[2].at(-1).type,'mesh3d');
});
