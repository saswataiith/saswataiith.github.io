/* Canvas geometry is separate from the analytic models in foundations.js. */
const TensorExperiments = {
  modes: ['potential','fluxbalance','forces'],
  defaults: {potentialA:1,rotationB:0,through:1,slope:1,source:0,kx:3,ky:1,force1:0,force2:1,cross:.5},
  controls(mode,tab,slider) {
    if(mode==='potential') return `<h2>Work along two paths</h2>${slider('potentialA','Potential curvature a',-2,2,.1)}${slider('rotationB','Rotational part b',-2,2,.1)}<p class="help">Both paths run A → B. Gold: lower path. Pink: upper path. Field arrows use a common compressed scale.</p>`;
    if(mode==='fluxbalance') return `<h2>Flux through a slab</h2>${slider('through','Left flux J₀',-2,2,.1)}${slider('slope','Flux slope g',-2,2,.1)}${slider('source','Source s',-2,2,.1)}<p class="help">J(x) = J₀ + gx. Width and face area are one. Negative flux points to the left.</p>`;
    return tab===0?`<h2>A material redirects the flux</h2>${slider('kx','Principal coefficient kₓ',.2,4,.1)}${slider('ky','Principal coefficient kᵧ',.2,4,.1)}<p class="help">Potential φ = xy. Teal: force −∇φ. Gold: flux J. Both vector sets use the same linear scale.</p>`:`<h2>Two coupled processes</h2>${slider('force1','Driving force X₁',-2,2,.1)}${slider('force2','Driving force X₂',-2,2,.1)}${slider('cross','Cross coefficient r',-.95,.95,.05)}<p class="help">L₁₁ = L₂₂ = 1; L₁₂ = L₂₁ = r. Dimensionless conjugate variables. The chosen range keeps L positive definite.</p>`;
  },
  results(mode,tab,s,fmt) {
    if(mode==='potential') {const v=TensorPhysics.work(s.potentialA,s.rotationB);return {name:'Does the path change the work?',caption:'A = (0,0), B = (1,1) · gold and pink paths have the same endpoints',metrics:[['WORK, LOWER PATH',fmt(v.lower),'A → (1,0) → B'],['WORK, UPPER PATH',fmt(v.upper),'A → (0,1) → B'],['CLOSED-LOOP WORK',fmt(v.circulation),s.rotationB===0?'Conservative: U = a(x² + y²)/2':'Nonconservative: curl z = 2b']]};}
    if(mode==='fluxbalance') {const v=TensorPhysics.balance(s.through,s.slope,s.source);return {name:'What enters, leaves and accumulates?',caption:'Outward normal: −x on the left, +x on the right · accumulation = source − divergence',metrics:[['LEFT / RIGHT FLUX',`${fmt(v.left)} / ${fmt(v.right)}`,'Both measured along positive x'],['DIVERGENCE',fmt(v.outward),'Net outflow per unit volume'],['ACCUMULATION',fmt(v.accumulation),Math.abs(v.accumulation)<1e-8?'Steady storage':v.accumulation>0?'Stored amount increases':'Stored amount decreases']]};}
    if(tab===0){const v=TensorPhysics.anisotropic(s.kx,s.ky,1,1);return {name:'Curl-free force, but what about the flux?',caption:'φ = xy · arrows drawn at the same positions · x,y ∈ [−1.5,1.5]',metrics:[['FORCE CURL','0','A smooth negative gradient'],['FLUX CURL',fmt(v.curl),'kₓ − kᵧ'],['FLUX DIVERGENCE','0','Steady source-free balance']]};}
    const v=TensorPhysics.coupled(s.force1,s.force2,s.cross);return {name:'A force can drive more than one flux',caption:'Teal: uncoupled response · pink: cross contribution · gold: total · signed bars share one scale',metrics:[['FLUX J₁',fmt(v.j1),'X₁ + rX₂'],['FLUX J₂',fmt(v.j2),'rX₁ + X₂'],['ENTROPY PRODUCTION',fmt(v.production),'X₁J₁ + X₂J₂ ≥ 0']]};
  },
  draw(ctx,w,h,mode,tab,s) {
    const teal='#55ddc0',gold='#ffcf86',pink='#f09cbc',white='#e5eef5';
    const line=(x,y,u,v,color,width=2)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(u,v);ctx.stroke();};
    const label=(text,x,y,color=white,align='center')=>{ctx.font='14px system-ui';ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(text,x,y);};
    const arrow=(x,y,u,v,color,width=2)=>{if(Math.hypot(u-x,v-y)<.2)return;line(x,y,u,v,color,width);const a=Math.atan2(v-y,u-x);line(u,v,u-7*Math.cos(a-.45),v-7*Math.sin(a-.45),color,width);line(u,v,u-7*Math.cos(a+.45),v-7*Math.sin(a+.45),color,width);};
    if(mode==='fluxbalance') {
      const left=w*.27,right=w*.73,top=h*.26,bottom=h*.65,mid=(top+bottom)/2;
      ctx.fillStyle='#244252';ctx.fillRect(left,top,right-left,bottom-top);ctx.strokeStyle=teal;ctx.strokeRect(left,top,right-left,bottom-top);
      const v=TensorPhysics.balance(s.through,s.slope,s.source),scale=Math.min(w*.047,25);
      for(const [x,j] of [[left,v.left],[right,v.right]]) {arrow(x-j*scale/2,mid,x+j*scale/2,mid,gold,3);label(`J = ${j.toFixed(1)}`,x,top-20,gold);}
      label(`source ${s.source.toFixed(1)}`,w/2,top+30);label(`accumulation ${v.accumulation.toFixed(1)}`,w/2,bottom-20,teal);
      arrow(left,bottom+30,left-30,bottom+30,pink);arrow(right,bottom+30,right+30,bottom+30,pink);label('outward normals',w/2,bottom+65,pink);return;
    }
    if(mode==='forces'&&tab===1){
      const values=[[s.force1,s.cross*s.force2],[s.force2,s.cross*s.force1]],zero=w/2,scale=w*.085;
      line(zero,40,zero,h-30,'#657787');
      values.forEach((values,row)=>{const y=80+row*(h-110)/2;label(`J${row+1}`,22,y+13,white,'left');[...values,values[0]+values[1]].forEach((v,index)=>{const yy=y+index*23;line(zero,yy,zero+v*scale,yy,[teal,pink,gold][index],9);label(v.toFixed(2),zero+v*scale+(v<0?-8:8),yy+4,white,v<0?'right':'left');});});return;
    }
    const span=Math.min(w-90,h-85),scale=span/(mode==='potential'?1.8:3.8),cx=mode==='potential'?w/2-scale*.5:w/2,cy=mode==='potential'?h/2+scale*.5:h/2;
    const xy=(x,y)=>[cx+x*scale,cy-y*scale];
    if(mode==='potential') {
      for(let ix=-1;ix<=5;ix++)for(let iy=-1;iy<=5;iy++) {const x=ix/4,y=iy/4,fx=-s.potentialA*x-s.rotationB*y,fy=-s.potentialA*y+s.rotationB*x,factor=.12/(1+Math.hypot(fx,fy)*.25);arrow(...xy(x,y),...xy(x+factor*fx,y+factor*fy),teal,1);}
      [[0,0,1,0,gold],[1,0,1,1,gold],[0,0,0,1,pink],[0,1,1,1,pink]].forEach(([x,y,u,v,c])=>{line(...xy(x,y),...xy(u,v),c,3);arrow(...xy((x+u)/2,(y+v)/2),...xy((x+u)/2+(u-x)*.13,(y+v)/2+(v-y)*.13),c,3);});
      const a=xy(0,0),b=xy(1,1);label('A (0,0)',a[0],a[1]+30);label('B (1,1)',b[0],b[1]-20);return;
    }
    line(...xy(-1.6,0),...xy(1.6,0),'#344960');line(...xy(0,-1.6),...xy(0,1.6),'#344960');
    for(let ix=-3;ix<=3;ix++)for(let iy=-3;iy<=3;iy++){const x=ix*.5,y=iy*.5,v=TensorPhysics.anisotropic(s.kx,s.ky,x,y),factor=.065;arrow(...xy(x,y),...xy(x+factor*v.flux[0],y+factor*v.flux[1]),gold,2.5);arrow(...xy(x,y),...xy(x+factor*v.force[0],y+factor*v.force[1]),teal,1.5);}
    label('x',...xy(1.7,-.2));label('y',...xy(.2,1.7));
  }
};
