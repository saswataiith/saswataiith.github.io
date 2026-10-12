// I use bounded ideal shapes here, separate from the periodic simulation.
export const shapes = {
  disk: {name:'Filled disk', dimension:2, betti:[1,0], contours:1, note:'One filled region, no hole, and one outer contour.'},
  annulus: {name:'Disk with one hole', dimension:2, betti:[1,1], contours:2, note:'The inner and outer contours enclose one connected region with one hole.'},
  holes: {name:'Disk with two holes', dimension:2, betti:[1,2], contours:3, note:'Both holes belong to the same connected region. There are three boundary contours.'},
  disks: {name:'Two separate disks', dimension:2, betti:[2,0], contours:2, note:'Two contours enclose two separate regions. Neither region has a hole.'},
  ball: {name:'Filled ball', dimension:3, betti:[1,0,0], surfaceComponents:1, surfaceEuler:2, note:'One filled solid, no tunnel, and no enclosed cavity. Its boundary is one spherical surface.'},
  torus: {name:'Solid doughnut', dimension:3, betti:[1,1,0], surfaceComponents:1, surfaceEuler:0, note:'The central opening is a through-tunnel. It connects to the outside, so it is not an enclosed cavity.'},
  shell: {name:'Thick spherical shell', dimension:3, betti:[1,0,1], surfaceComponents:2, surfaceEuler:4, note:'The empty interior is an enclosed cavity. Inner and outer spherical surfaces bound one connected shell.'},
  balls: {name:'Two separate balls', dimension:3, betti:[2,0,0], surfaceComponents:2, surfaceEuler:4, note:'Two separate solids, with no tunnels or cavities. Each has one spherical boundary.'}
};
export function euler(betti) {return betti.reduce((sum,value,index)=>sum+(index%2?-value:value),0);}
export function sphere(radius=1, center=[0,0,0], rings=22, sectors=48) {
  const vertices=[[center[0],center[1],center[2]+radius]], faces=[];
  for(let row=1;row<rings;row++) {
    const theta=Math.PI*row/rings;
    for(let col=0;col<sectors;col++) {
      const phi=2*Math.PI*col/sectors;
      vertices.push([center[0]+radius*Math.sin(theta)*Math.cos(phi),center[1]+radius*Math.sin(theta)*Math.sin(phi),center[2]+radius*Math.cos(theta)]);
    }
  }
  const bottom=vertices.length;vertices.push([center[0],center[1],center[2]-radius]);
  for(let col=0;col<sectors;col++) {
    const next=(col+1)%sectors;faces.push([0,1+col,1+next]);
    for(let row=0;row<rings-2;row++) {
      const a=1+row*sectors+col,b=1+row*sectors+next,c=a+sectors,d=b+sectors;
      faces.push([a,c,b],[b,c,d]);
    }
    faces.push([bottom,1+(rings-2)*sectors+next,1+(rings-2)*sectors+col]);
  }
  return {vertices,faces,gaussianCurvature:vertices.map(()=>1/(radius*radius))};
}
export function torus(tubeRadius=.3, majorRadius=.8, sectors=64, rings=32) {
  const vertices=[],faces=[],gaussianCurvature=[];
  for(let u=0;u<sectors;u++) for(let v=0;v<rings;v++) {
    const theta=2*Math.PI*u/sectors,phi=2*Math.PI*v/rings,r=majorRadius+tubeRadius*Math.cos(phi);
    vertices.push([r*Math.cos(theta),r*Math.sin(theta),tubeRadius*Math.sin(phi)]);
    gaussianCurvature.push(Math.cos(phi)/(tubeRadius*r));
  }
  for(let u=0;u<sectors;u++) for(let v=0;v<rings;v++) {
    const a=u*rings+v,b=((u+1)%sectors)*rings+v,c=u*rings+(v+1)%rings,d=((u+1)%sectors)*rings+(v+1)%rings;
    faces.push([a,b,c],[b,d,c]);
  }
  return {vertices,faces,gaussianCurvature};
}
export function shapeMeshes(key,size=.4) {
  if(key==='ball') return [sphere()];
  if(key==='torus') return [torus(.15+.35*size)];
  if(key==='shell') return [sphere(),sphere(.2+.6*size)];
  if(key==='balls') return [sphere(.55,[-.7,0,0]),sphere(.55,[.7,0,0])];
  return [];
}

// I integrate the smooth torus parameterization, independently of the display triangles.
export function torusCurvatureIntegral(tubeRadius,majorRadius=.8,samples=1024) {
  let positive=0,negative=0;
  const step=2*Math.PI/samples;
  for(let n=0;n<samples;n++) {
    const angle=(n+.5)*step;
    const curvature=Math.cos(angle)/(tubeRadius*(majorRadius+tubeRadius*Math.cos(angle)));
    const areaElement=tubeRadius*(majorRadius+tubeRadius*Math.cos(angle))*step*2*Math.PI;
    const contribution=curvature*areaElement;
    if(contribution>=0) positive+=contribution;else negative+=contribution;
  }
  return {positive,negative,total:positive+negative};
}

// I draw two generating loops on the torus boundary.
export function torusLoops(majorRadius=.8,tubeRadius=.3,samples=128) {
  const aroundOpening=[],aroundTube=[];
  for(let n=0;n<=samples;n++) {
    const angle=2*Math.PI*n/samples;
    aroundOpening.push([majorRadius*Math.cos(angle),majorRadius*Math.sin(angle),tubeRadius]);
    aroundTube.push([0,-majorRadius-tubeRadius*Math.cos(angle),tubeRadius*Math.sin(angle)]);
  }
  return {aroundOpening,aroundTube};
}
export function tubeFillingDisk(majorRadius=.8,tubeRadius=.3,sectors=64) {
  const vertices=[[0,-majorRadius,0]],faces=[];
  for(let n=0;n<sectors;n++) {
    const angle=2*Math.PI*n/sectors;
    vertices.push([0,-majorRadius-tubeRadius*Math.cos(angle),tubeRadius*Math.sin(angle)]);
  }
  for(let n=0;n<sectors;n++) faces.push([0,n+1,(n+1)%sectors+1]);
  return {vertices,faces};
}
export function openedSurface(flat=false,rows=24,sectors=64) {
  const vertices=[],faces=[],width=flat?sectors+1:sectors;
  for(let row=0;row<=rows;row++) for(let col=0;col<width;col++) {
    const x=-1+2*row/rows,angle=2*Math.PI*col/sectors;
    vertices.push(flat?[x,-1+2*col/sectors,0]:[x,.45*Math.cos(angle),.45*Math.sin(angle)]);
  }
  for(let row=0;row<rows;row++) for(let col=0;col<(flat?width-1:width);col++) {
    const next=flat?col+1:(col+1)%width;
    const a=row*width+col,b=(row+1)*width+col,c=row*width+next,d=(row+1)*width+next;
    faces.push([a,b,c],[b,d,c]);
  }
  return {vertices,faces};
}
