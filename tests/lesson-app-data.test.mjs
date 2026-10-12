import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const folder='assets/lesson-apps/';
const files=fs.readdirSync(folder).filter(name=>name.endsWith('.json'));
function text(value){return Array.isArray(value)?value.join(''):value;}
test('23 apps retain exact notebook code and recorded stream outputs',()=>{
 assert.equal(files.length,23);
 for(const file of files){
  const app=JSON.parse(fs.readFileSync(folder+file));
  const notebook=JSON.parse(fs.readFileSync(app.notebook.slice(1)));
  assert.equal(app.frames.length,notebook.cells.filter(c=>c.cell_type==='code').length);
  for(const frame of app.frames){
   const cell=notebook.cells[frame.cell];assert.equal(frame.code,text(cell.source));
   assert.equal(frame.executed,cell.execution_count!==null&&cell.execution_count!==undefined);
   for(const output of cell.outputs||[]){if(output.output_type==='stream')assert.ok(frame.output.includes(text(output.text)));}
   for(const image of frame.images)assert.ok(fs.existsSync(image.slice(1)),image);
  }
 }
});
test('the correlation diagram matches direct periodic products at every displacement',()=>{
 const app=JSON.parse(fs.readFileSync(folder+'short-structure-correlation.json'));
 const d=app.correlationDemo,n=d.fluctuation.length;
 let variance=0;for(const row of d.fluctuation)for(const v of row)variance+=v*v/(n*n);
 assert.ok(Math.abs(variance-d.variance)<1e-14);
 for(const lag of d.lags){
  let mean=0;
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
   const shifted=d.fluctuation[(r-lag.shift+n)%n][c];
   assert.equal(lag.shifted[r][c],shifted);
   assert.equal(lag.product[r][c],d.fluctuation[r][c]*shifted);
   mean+=lag.product[r][c]/(n*n);
  }
  assert.ok(Math.abs(mean-lag.covariance)<1e-14);
  assert.ok(Math.abs(mean/variance-d.correlation[lag.shift][0])<1e-12);
 }
 assert.ok(Math.abs(d.lags[0].correlation-1)<1e-12);
 assert.ok(Math.abs(d.lags[4].correlation)<1e-12);
 assert.ok(Math.abs(d.lags[8].correlation+1)<1e-12);
});
