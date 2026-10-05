import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const analysis=JSON.parse(fs.readFileSync('assets/examples/bicontinuity-3d/analysis.json'));
const compressed=fs.readFileSync('assets/examples/bicontinuity-3d/phase-flood.bin.gz');
test('full-volume slice explorer decompresses data, switches phases and completes both floods',async()=>{
 const elements=new Map(),element=id=>{if(!elements.has(id))elements.set(id,{value:id==='phase'?'red':128,checked:false,events:{},addEventListener(k,fn){this.events[k]=fn;}});return elements.get(id);};
 let images=0;
 for(const axis of 'xyz')element('slice-'+axis).getContext=()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){images++;},beginPath(){},arc(){},stroke(){}});
 const frames=[],ctx={document:{getElementById:element},location:{href:'https://example.com/files/mesoscale/examples/bicontinuity-3d.html'},window:{},console,URL,Response,DecompressionStream,Uint16Array,Uint32Array,performance:{now:()=>0},requestAnimationFrame:fn=>frames.push(fn),fetch:async url=>url.pathname.endsWith('analysis.json')?{ok:true,json:async()=>analysis}:new Response(compressed)};
 vm.runInNewContext(fs.readFileSync('assets/js/connectivity-explorer.js','utf8'),ctx);
 for(let i=0;i<1000&&!ctx.window.connectivityExplorerState;i++)await new Promise(resolve=>setTimeout(resolve,5));
 assert(ctx.window.connectivityExplorerState,element('load-status').textContent);
 for(const phase of ['red','blue']){
  element('phase').value=phase;element('phase').events.change();
  assert.equal(ctx.window.connectivityExplorerState.reached,analysis.flood[phase].reached_voxels);
  element('grow').onclick();assert.equal(ctx.window.connectivityExplorerState.reached,1);
  frames.pop()(8000);assert.equal(ctx.window.connectivityExplorerState.reached,analysis.flood[phase].reached_voxels);
  element('flood-step').value=20;element('flood-step').oninput();assert.equal(ctx.window.connectivityExplorerState.step,20);
  element('complete').onclick();assert.equal(element('reached').textContent,'100.0%');
 }
 assert(images>=18);assert.match(element('morphology').innerHTML,/107/);
});
