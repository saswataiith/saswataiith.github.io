(async()=>{
 const select=document.getElementById('topology-threshold');if(!select)return;
 try{
  const response=await fetch('/assets/examples/bicontinuity/connectivity.json');if(!response.ok)throw Error();const data=await response.json();
  function render(){
   const threshold=select.value;let rows='';const summaries=[];
   for(const mean of ['0.5','0.4']){
    const results=data[mean].thresholds[threshold];const wrapBoth=[];
    for(const key of ['high','low']){
     const d=results[key],wx=d.wrapping_components.some(c=>c.wrap_x),wy=d.wrapping_components.some(c=>c.wrap_y);
     wrapBoth.push(wx||wy);
     rows+=`<tr><td>${mean}</td><td>c ${key==='high'?'≥':'<'} ${threshold}</td><td>${(100*d.area_fraction).toFixed(1)}%</td><td>${d.components}</td><td>${(100*d.largest_fraction_of_phase).toFixed(1)}%</td><td>${wx&&wy?'x and y':wx?'x only':wy?'y only':'none'}</td></tr>`;
    }
    summaries.push(`At mean c = ${mean}, ${wrapBoth.every(Boolean)?'both regions have a periodic wrapping component':wrapBoth.some(Boolean)?'only one region has a periodic wrapping component':'neither region has a periodic wrapping component'}.`);
   }
   document.getElementById('topology-results').innerHTML=rows;document.getElementById('topology-summary').textContent=summaries.join(' ')+' Inspect directions and isolated components before calling this bicontinuous.';
  }
  select.addEventListener('change',render);render();
 }catch(e){document.getElementById('topology-summary').textContent='Measurements could not load. The downloadable report is available below.';}
})();
