import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
test('saved image viewer retains the last image while the next image loads and ignores stale requests',async()=>{
 const events={},images=[],draws=[];let clears=0;
 const canvas={getContext:()=>({setTransform(){},fillRect(){clears++;},drawImage(img){draws.push(img.src);},fillText(){}})};
 const slider={value:0,addEventListener:(t,f)=>events[t]=f};const play={addEventListener(){}};const time={},caption={};
 const viewer={dataset:{lesson:'walkers'},querySelector:q=>({'canvas':canvas,'input':slider,'[data-play]':play,'[data-time]':time,'[data-caption]':caption})[q]};
 const data={slug:'walkers',kind:'field',frames:[0,1,2].map(i=>({time:i*10,image:`frame-${i}.png`})),diagnostics:[[0,0,0],[10,10,10],[20,20,20]]};
 class Image {constructor(){images.push(this);}}
 const context={document:{querySelectorAll:q=>q==='.lesson-viewer'?[viewer]:[]},fetch:async()=>({ok:true,json:async()=>data}),Image,setInterval(){},clearInterval(){}};
 vm.runInNewContext(fs.readFileSync('assets/js/lessons.js','utf8'),context);await new Promise(setImmediate);
 assert.equal(clears,0);images.find(i=>i.src==='frame-0.png').onload();await new Promise(setImmediate);assert.equal(clears,1);assert.deepEqual(draws,['frame-0.png']);
 slider.value=1;events.input();assert.equal(clears,1);
 slider.value=2;events.input();images.find(i=>i.src==='frame-1.png').onload();await new Promise(setImmediate);assert.equal(clears,1);
 images.find(i=>i.src==='frame-2.png').onload();await new Promise(setImmediate);assert.equal(clears,2);assert.deepEqual(draws,['frame-0.png','frame-2.png']);
});
