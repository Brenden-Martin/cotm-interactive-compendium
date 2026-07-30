"use client";
import Link from "next/link";
import { useEffect,useRef,useState } from "react";

type Distribution="uniform"|"gaussian"|"rayleigh"|"salt + pepper"|"constant";
type Fade="perlin"|"linear"|"tension"|"hermite"|"wobble";
const hash=(x:number,y:number,seed:number)=>{let h=Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(seed,144269);h=(h^(h>>>13))*1274126177;return ((h^(h>>>16))>>>0)/4294967295};
function fade(t:number,mode:Fade,k:number){if(mode==="linear")return t;if(mode==="tension"){const a=Math.pow(Math.max(t,1e-5),k),b=Math.pow(Math.max(1-t,1e-5),k);return a/(a+b)}if(mode==="hermite")return(3-k*.12)*t*t-(2-k*.12)*t*t*t;if(mode==="wobble")return Math.sin(Math.PI*.5*Math.pow(t,k));return t*t*t*(t*(t*6-15)+10)}
function gradient(ix:number,iy:number,seed:number,dist:Distribution,corr:number){
  const r=hash(ix,iy,seed), angle=(corr?hash(Math.floor(ix/(1+corr)),Math.floor(iy/(1+corr)),seed):r)*Math.PI*2;
  if(dist==="salt + pepper"){const q=Math.floor(r*4);return q===0?[1,0]:q===1?[-1,0]:q===2?[0,1]:[0,-1]}
  let mag=1;if(dist==="rayleigh")mag=Math.sqrt(-2*Math.log(Math.max(.0001,hash(ix+91,iy-43,seed))));if(dist==="gaussian")mag=.45+hash(ix-17,iy+63,seed)*1.1;if(dist==="constant")mag=1.45;
  return [Math.cos(angle)*mag,Math.sin(angle)*mag];
}
function noise(x:number,y:number,seed:number,dist:Distribution,fadeMode:Fade,tension:number,corr:number){
  const x0=Math.floor(x),y0=Math.floor(y),xf=x-x0,yf=y-y0,u=fade(xf,fadeMode,tension),v=fade(yf,fadeMode,tension);
  const d=(ix:number,iy:number,dx:number,dy:number)=>{const g=gradient(ix,iy,seed,dist,corr);return g[0]*dx+g[1]*dy};
  const a=d(x0,y0,xf,yf),b=d(x0+1,y0,xf-1,yf),c=d(x0,y0+1,xf,yf-1),e=d(x0+1,y0+1,xf-1,yf-1);
  return (a+(b-a)*u)+((c+(e-c)*u)-(a+(b-a)*u))*v;
}
function Slider({label,value,set,min,max,step}:any){return <label className="noise-slider"><span>{label}<input type="number" value={value} min={min} max={max} step={step} onChange={e=>set(Number(e.target.value))}/></span><input aria-label={label} type="range" value={value} min={min} max={max} step={step} onChange={e=>set(Number(e.target.value))}/></label>}
const palettes={
  magma:(v:number)=>[Math.round(20+235*Math.pow(v,1.8)),Math.round(8+145*Math.pow(v,3)),Math.round(30+85*v)],
  mineral:(v:number)=>[Math.round(19+205*v),Math.round(41+185*Math.pow(v,.8)),Math.round(48+150*Math.pow(1-v,1.5))],
  mono:(v:number)=>[v*255,v*255,v*255],
  topographic:(v:number)=>v<.45?[20+v*70,60+v*210,78+v*180]:v<.72?[50+v*120,120+v*120,65]:[185+v*65,175+v*75,145+v*105]
};
export function PerlinLab(){
  const canvas=useRef<HTMLCanvasElement>(null);const [octaves,setOctaves]=useState(5),[roughness,setRoughness]=useState(.7),[scale,setScale]=useState(44),[dist,setDist]=useState<Distribution>("uniform"),[fadeMode,setFadeMode]=useState<Fade>("perlin"),[tension,setTension]=useState(1),[corr,setCorr]=useState(0),[seed,setSeed]=useState(42),[palette,setPalette]=useState<keyof typeof palettes>("magma"),[animate,setAnimate]=useState(false);
  useEffect(()=>{let frame=0,raf=0;const render=()=>{const c=canvas.current;if(!c)return;c.width=240;c.height=160;const ctx=c.getContext("2d")!,img=ctx.createImageData(c.width,c.height),values=new Float32Array(c.width*c.height);let lo=Infinity,hi=-Infinity;const drift=animate?frame*.007:0;
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){let total=0,norm=0;for(let o=0;o<octaves;o++){const freq=Math.pow(2,o),amp=Math.pow(.5,roughness*o);total+=noise((x/scale+drift)*freq,(y/scale+drift*.63)*freq,seed+o*97,dist,fadeMode,tension,corr)*amp;norm+=amp}const v=total/norm;values[y*c.width+x]=v;lo=Math.min(lo,v);hi=Math.max(hi,v)}
    const color=palettes[palette];for(let i=0;i<values.length;i++){let v=(values[i]-lo)/(hi-lo||1);const rgb=color(v);img.data[i*4]=rgb[0];img.data[i*4+1]=rgb[1];img.data[i*4+2]=rgb[2];img.data[i*4+3]=255}ctx.putImageData(img,0,0);if(animate){frame++;raf=requestAnimationFrame(render)}};render();return()=>cancelAnimationFrame(raf)},[octaves,roughness,scale,dist,fadeMode,tension,corr,seed,palette,animate]);
  return <main className="noise-page"><canvas ref={canvas} className="noise-canvas"/>
    <header className="noise-header"><Link className="back" href="/gallery">Gallery</Link><div><span className="eyebrow">Interactive Exhibit 11 · Procedural Fields</span><h1>Perlin<br/>Noise</h1></div><Link href="/compendium/perlin-noise">Read the field note →</Link></header>
    <aside className="noise-controls">
      <div className="noise-status"><b>FIELD GENERATOR</b><span>SEED {seed}</span></div>
      <Slider label="Harmonics" value={octaves} set={setOctaves} min={1} max={9} step={1}/><Slider label="Roughness" value={roughness} set={setRoughness} min={.05} max={2.5} step={.05}/><Slider label="Scale / zoom" value={scale} set={setScale} min={8} max={220} step={1}/><Slider label="Fade tension" value={tension} set={setTension} min={.1} max={8} step={.1}/><Slider label="Correlation" value={corr} set={setCorr} min={0} max={6} step={.1}/>
      <label className="noise-select">Gradient distribution<select value={dist} onChange={e=>setDist(e.target.value as Distribution)}>{["uniform","gaussian","rayleigh","salt + pepper","constant"].map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="noise-select">Interpolation<select value={fadeMode} onChange={e=>setFadeMode(e.target.value as Fade)}>{["perlin","linear","tension","hermite","wobble"].map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="noise-select">Palette<select value={palette} onChange={e=>setPalette(e.target.value as keyof typeof palettes)}>{Object.keys(palettes).map(x=><option key={x}>{x}</option>)}</select></label>
      <div className="noise-actions"><button onClick={()=>setSeed(Math.floor(Math.random()*99999))}>New field</button><button className={animate?"active":""} onClick={()=>setAnimate(v=>!v)}>{animate?"Pause drift":"Drift field"}</button></div>
      <p>Coherent randomness assembled from gradients, interpolation, and stacked spatial octaves.</p>
    </aside>
    <div className="noise-key"><span>0</span><i/><span>1</span></div>
  </main>
}
