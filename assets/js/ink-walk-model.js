/* Two-dimensional independent cardinal random walks; all positions are unwrapped.
   One sweep updates every molecule once. Length: micrometres; time: seconds. */
(() => {
  class InkWalkModel {
    constructor({count=5000,length=1,seed=7}={}) {
      this.count=count; this.length=length; this.seed=seed>>>0;
      this.x=new Float64Array(count); this.y=new Float64Array(count);
      this.steps=0; this.msd=0; this.history=[0]; this.path=[[0,0]];
      this.state=this.seed;
    }
    random() {
      this.state=(this.state+0x6D2B79F5)>>>0;
      let t=this.state;
      t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
      return ((t^(t>>>14))>>>0)/4294967296;
    }
    step() {
      let sum=0;
      for(let i=0;i<this.count;i++) {
        const direction=Math.floor(this.random()*4);
        if(direction===0)this.x[i]+=this.length;
        else if(direction===1)this.x[i]-=this.length;
        else if(direction===2)this.y[i]+=this.length;
        else this.y[i]-=this.length;
        sum+=this.x[i]**2+this.y[i]**2;
      }
      this.steps++; this.msd=sum/this.count; this.history.push(this.msd);
      this.path.push([this.x[0],this.y[0]]);
    }
    get diffusivity(){return this.length**2/4;} // delta t = 1 s
    get expectedMSD(){return this.length**2*this.steps;}
  }
  globalThis.InkWalkModel=InkWalkModel;
})();
