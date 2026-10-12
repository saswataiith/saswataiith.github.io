/* Copyright (c) 2026 Saswata Bhattacharyya.
   I give my code-use terms at /using-my-resources/. */
/* I display notebook results without executing or rewriting the source code. */
(() => {
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function fieldCanvas(values, low, high, signed) {
    const canvas = element('canvas'); canvas.width = canvas.height = 256;
    canvas.setAttribute('role','img');
    const context = canvas.getContext('2d');
    const rows = values.length, columns = values[0].length;
    values.forEach((line,row) => line.forEach((value,column) => {
      const fraction = Math.max(0,Math.min(1,(value-low)/(high-low)));
      if (signed) {
        const strength = Math.abs(fraction-.5)*2;
        const end = fraction < .5 ? [43,111,177] : [190,65,49];
        context.fillStyle = `rgb(${end.map(channel => Math.round(255+(channel-255)*strength)).join(',')})`;
      } else context.fillStyle = `rgb(${[240,249,253].map((channel,index) => Math.round(channel+([25,82,137][index]-channel)*fraction)).join(',')})`;
      context.fillRect(column*256/columns,row*256/rows,256/columns,256/rows);
    }));
    return canvas;
  }
  function figure(values, low, high, signed, caption) {
    const fig = element('figure'), canvas = fieldCanvas(values,low,high,signed);
    canvas.setAttribute('aria-label',caption);
    fig.append(canvas,element('figcaption','',caption));return fig;
  }
  function correlationChart(demo, shift, radial) {
    const canvas = element('canvas','la-chart');canvas.width=500;canvas.height=250;
    canvas.setAttribute('role','img');canvas.setAttribute('aria-label',radial ? 'Directional and radially averaged normalized correlation, with the selected x displacement marked.' : 'Normalized x-direction correlation versus displacement, with the selected displacement marked.');
    const c=canvas.getContext('2d'), left=55,right=475,top=20,bottom=195;
    const px=x=>left+x/15*(right-left),py=y=>top+(1-y)/2*(bottom-top);
    c.fillStyle='white';c.fillRect(0,0,500,250);
    c.strokeStyle='#7a8b82';c.beginPath();c.moveTo(left,top);c.lineTo(left,bottom);c.lineTo(right,bottom);c.moveTo(left,py(0));c.lineTo(right,py(0));c.stroke();
    c.font='13px sans-serif';c.fillStyle='#234133';c.textAlign='center';
    for(const x of [0,4,8,12,15])c.fillText(x,px(x),bottom+20);
    c.fillText(radial ? 'Displacement or radius (length units)' : 'x displacement (length units)',265,240);
    c.textAlign='right';for(const y of [-1,0,1])c.fillText(y,left-9,py(y)+5);
    c.save();c.translate(17,110);c.rotate(-Math.PI/2);c.textAlign='center';c.fillText('Correlation (dimensionless)',0,0);c.restore();
    c.strokeStyle='#286fad';c.lineWidth=2;c.beginPath();demo.lags.forEach((lag,i)=>i?c.lineTo(px(i),py(lag.correlation)):c.moveTo(px(i),py(lag.correlation)));c.stroke();
    if(radial){
      c.strokeStyle='#408459';c.setLineDash([6,4]);c.beginPath();
      demo.radialR.forEach((r,i)=>i?c.lineTo(px(r),py(demo.radialC[i])):c.moveTo(px(r),py(demo.radialC[i])));c.stroke();c.setLineDash([]);
      c.textAlign='right';c.fillStyle='#286fad';c.fillText('x direction',470,18);c.fillStyle='#408459';c.fillText('radial average',470,36);
    }
    c.fillStyle='#bc492d';c.beginPath();c.arc(px(shift),py(demo.lags[shift].correlation),5,0,2*Math.PI);c.fill();return canvas;
  }
  function addCorrelationDemo(host, demo, index) {
    const view=element('div','la-demo'), fields=element('div','la-fields');
    view.append(element('h4','','The field used in this calculation'));
    if(index===0)fields.append(figure(demo.composition,.3,.7,true,'Composition c: blue 0.3, white 0.5, red 0.7. Values are dimensionless. Rows are x; columns are y.'));
    else if(index===1)fields.append(figure(demo.fluctuation,-.2,.2,true,'Fluctuation δc = c − mean(c): blue −0.2, white 0, red +0.2. Its variance is 0.02.'));
    else if(index===2)fields.append(figure(demo.spectrum,0,2.56,false,'Centered structure function S: light 0, dark 2.56. The peaks are at kx = ±2π/16 and ky = 0. Rows are kx; columns are ky, in inverse length units. S is dimensionless.'));
    else {
      view.append(element('p','','I shift the fluctuation field across the periodic boundary, multiply corresponding cells, and average all 256 products. Dividing by the variance gives normalized correlation. The slider changes displacement, not time.'));
      const label=element('label','la-slider','Displacement along x: '),value=element('span','','0 length units');
      const input=element('input');input.type='range';input.min=0;input.max=15;input.step=1;input.value=0;input.setAttribute('aria-label','Displacement along x');
      label.append(value,input);view.append(label);
      const answer=element('p'),chartHost=element('div');
      function update() {
        const shift=Number(input.value),lag=demo.lags[shift];value.textContent=`${shift} length units`;
        fields.replaceChildren(
          figure(demo.fluctuation,-.2,.2,true,'Original fluctuation δc. Blue −0.2; red +0.2.'),
          figure(lag.shifted,-.2,.2,true,'Shifted fluctuation. Rows wrap across the top and bottom boundaries.'),
          figure(lag.product,-.04,.04,true,'Cellwise product. Blue −0.04; white 0; red +0.04.'),
          figure(demo.correlation,-1,1,true,'Directional correlation map. Blue −1; white 0; red +1. Rows are x displacement; columns are y displacement.'));
        answer.textContent=`Mean product (covariance) = ${lag.covariance.toPrecision(5)}. Variance = ${demo.variance.toPrecision(5)}. Normalized correlation = ${lag.correlation.toPrecision(5)}. All three are dimensionless.`;
        chartHost.replaceChildren(correlationChart(demo,shift,index>=5));
      }
      input.addEventListener('input',update);update();view.append(fields,answer,chartHost);
      if(index>=5)view.append(element('p','','The blue curve follows x displacement. The dashed green curve averages all displacements in each radius bin. These differ because the wave is directional. Averaging by radius loses that directional detail.'));
      host.append(view);return;
    }
    view.append(fields);host.append(view);
  }
  async function start(panel) {
    try {
      const response=await fetch(panel.dataset.lessonSrc);
      if(!response.ok)throw Error(`HTTP ${response.status}`);
      const data=await response.json();
      if(!data.frames.length)throw Error('No lesson cells');
      panel.querySelector('.la-loading').remove();
      const controls=element('div','la-controls');
      const previous=element('button','','Previous'),next=element('button','','Next step'),play=element('button','','Play'),reset=element('button','','Reset');
      const select=element('select'),progress=element('span','la-progress');
      select.setAttribute('aria-label','Calculation step');
      data.frames.forEach((frame,index)=>{const option=element('option','',frame.title);option.value=index;select.append(option);});
      for(const button of [previous,next,play,reset])button.type='button';
      controls.append(previous,next,play,reset,select,progress);
      const columns=element('div','la-columns'),result=element('div','la-card'),codeCard=element('div','la-card');
      columns.append(result,codeCard);panel.append(controls,columns);
      let index=0,timer;
      function pause(){clearInterval(timer);timer=undefined;play.textContent='Play';}
      function render(){
        const frame=data.frames[index];select.value=index;
        progress.textContent=`Step ${index+1} / ${data.frames.length}`;
        previous.disabled=index===0;next.disabled=play.disabled=index===data.frames.length-1;
        result.replaceChildren(element('h3','','Logic and result'));
        const logic=element('p','',frame.logic.replace(/\$\$([\s\S]*?)\$\$/g,'\\[$1\\]').replace(/\$([^$\n]+)\$/g,'\\($1\\)').replace(/`/g,''));
        result.append(element('h4','',frame.title),logic);
        if(data.correlationDemo)addCorrelationDemo(result,data.correlationDemo,index);
        result.append(element('h4','','Recorded notebook result'));
        if(frame.output)result.append(element('pre','',frame.output));
        if(!frame.executed)result.append(element('p','la-result-note','This cell has no recorded execution result. Its code remains available in the notebook; I do not claim a new result here.'));
        else if(!frame.output&&!frame.images.length)result.append(element('p','la-result-note','This cell was executed without printed output or a figure. Its definitions or values are used by subsequent cells.'));
        frame.images.forEach(path=>{const image=element('img');image.src=path;image.alt='Recorded notebook figure for '+frame.title;result.append(image);});
        codeCard.replaceChildren(element('h3','','Active Python code'),element('p','la-result-note',`Notebook cell ${frame.cell}, numbered from 0. This is the unchanged code used for this step.`));
        const functions=[...frame.code.matchAll(/^def\s+([\w]+)\(/gm)].map(match=>match[1]);
        if(functions.length)codeCard.append(element('p','la-functions','Functions defined here: '+functions.join(', ')));
        const pre=element('pre','la-code'),code=element('code','',frame.code);pre.append(code);codeCard.append(pre);
        const link=element('a','','Download the source notebook ↓');link.href=data.notebook;link.setAttribute('download','');codeCard.append(link);
        if(window.MathJax?.typesetPromise)window.MathJax.typesetPromise([logic]).catch(()=>{});
        if(index===data.frames.length-1)pause();
      }
      previous.addEventListener('click',()=>{pause();index--;render();});next.addEventListener('click',()=>{pause();index++;render();});
      reset.addEventListener('click',()=>{pause();index=0;render();});select.addEventListener('change',()=>{pause();index=Number(select.value);render();});
      play.addEventListener('click',()=>{if(timer){pause();return;}play.textContent='Pause';timer=setInterval(()=>{index++;render();},2200);});
      render();
    } catch(error){
      let notice=panel.querySelector('.la-loading');
      if(!notice){notice=element('p','la-loading');panel.append(notice);}
      notice.textContent='The interactive results could not load. The complete code and explanations remain below. Please reload to try again.';}
  }
  document.querySelectorAll('.lesson-app').forEach(start);
})();
