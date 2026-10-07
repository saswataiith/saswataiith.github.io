// Copyright (c) 2026 Saswata Bhattacharyya.
// I permit free noncommercial teaching and demonstrations with acknowledgment.
// I require written permission for research or commercial use.
// I retain permissions granted by earlier licenses; dependencies keep their licenses.
// I give the full terms at https://saswataiith.github.io/files/CODE-USE-TERMS.txt.
/* Small periodic graph lesson. Array axes: x=column, y=row. */
(function () {
  const n=8, grid=Array.from({length:n},()=>Array(n).fill(false));
  const canvas=document.getElementById('topology-grid'),ctx=canvas.getContext('2d');
  const periodic=document.getElementById('periodic'),diagonal=document.getElementById('diagonal');
  function measure() {
    const visited=new Map(),groups=[];
    const steps=[[1,0],[-1,0],[0,1],[0,-1]];
    if(diagonal.checked)steps.push([1,1],[1,-1],[-1,1],[-1,-1]);
    for(let y=0;y<n;y++)for(let x=0;x<n;x++) {
      const key=x+','+y;if(!grid[y][x]||visited.has(key))continue;
      const q=[[x,y]],basis=[];visited.set(key,[0,0]);let count=0;
      for(let head=0;head<q.length;head++) {
        const [a,b]=q[head],lift=visited.get(a+','+b);count++;
        for(const [dx,dy] of steps) {
          let u=a+dx,v=b+dy;
          if(periodic.checked){u=(u+n)%n;v=(v+n)%n;}
          else if(u<0||v<0||u>=n||v>=n)continue;
          if(!grid[v][u])continue;
          const k=u+','+v,p=[lift[0]+dx,lift[1]+dy];
          if(!visited.has(k)){visited.set(k,p);q.push([u,v]);}
          else {
            const old=visited.get(k),w=[(p[0]-old[0])/n,(p[1]-old[1])/n];
            if((w[0]||w[1])&&(!basis.length||(basis.length===1&&basis[0][0]*w[1]-basis[0][1]*w[0])))basis.push(w);
          }
        }
      }
      groups.push({count,basis});
    }
    ctx.clearRect(0,0,400,400);
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){ctx.fillStyle=grid[y][x]?'#b52c35':'#edf3f4';ctx.fillRect(x*50+2,y*50+2,46,46);}
    const total=groups.reduce((s,g)=>s+g.count,0),largest=Math.max(0,...groups.map(g=>g.count));
    document.getElementById('grid-results').textContent=`Red pixels: ${total}. Components: ${groups.length}. Largest component: ${total?(100*largest/total).toFixed(1):'0'}% of red. `+groups.map((g,i)=>`Component ${i+1}: winding rank ${g.basis.length}; independent vectors ${JSON.stringify(g.basis)}.`).join(' ');
  }
  function preset(name) {
    grid.forEach(row=>row.fill(false));
    if(name==='seam'){for(const x of [0,7])for(const y of [3,4])grid[y][x]=true;}
    if(name==='stripe'){for(let x=0;x<n;x++)grid[3][x]=grid[4][x]=true;}
    if(name==='ring'){for(let y=2;y<=5;y++)for(let x=2;x<=5;x++)grid[y][x]=x===2||x===5||y===2||y===5;}
    if(name==='staircase')for(let i=0;i<n;i++){grid[i][i]=true;grid[i][(i+1)%n]=true;}
    if(name==='corner'){grid[3][3]=grid[4][4]=true;}
    measure();
  }
  canvas.addEventListener('click',event=>{const r=canvas.getBoundingClientRect(),x=Math.floor((event.clientX-r.left)/r.width*n),y=Math.floor((event.clientY-r.top)/r.height*n);if(x>=0&&x<n&&y>=0&&y<n){grid[y][x]=!grid[y][x];measure();}});
  for(const b of document.querySelectorAll('[data-preset]'))b.addEventListener('click',()=>preset(b.dataset.preset));
  periodic.addEventListener('change',measure);diagonal.addEventListener('change',measure);
  preset('seam');
})();
