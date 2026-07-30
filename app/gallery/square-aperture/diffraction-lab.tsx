"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Envelope = "constant" | "linear" | "binary";
type Axis = "x" | "y";

function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = -2 * Math.PI / len;
    for (let i = 0; i < n; i += len) for (let j = 0; j < len / 2; j++) {
      const c = Math.cos(angle * j), s = Math.sin(angle * j), k = i + j + len / 2;
      const tr = re[k] * c - im[k] * s, ti = re[k] * s + im[k] * c;
      re[k] = re[i + j] - tr; im[k] = im[i + j] - ti; re[i + j] += tr; im[i + j] += ti;
    }
  }
}

function Control({ label, value, set, min, max, step }: { label: string; value: number; set: (n:number)=>void; min:number; max:number; step:number }) {
  return <label className="diff-slider"><span>{label}<input type="number" value={value} min={min} max={max} step={step} onChange={e=>set(Number(e.target.value))}/></span><input aria-label={label} type="range" value={value} min={min} max={max} step={step} onChange={e=>set(Number(e.target.value))}/></label>;
}

function Selector<T extends string>({ label, value, set, options }: { label:string; value:T; set:(v:T)=>void; options:T[] }) {
  return <fieldset className="diff-selector"><legend>{label}</legend>{options.map(o=><button type="button" className={value===o?"active":""} onClick={()=>set(o)} key={o}>{o}</button>)}</fieldset>;
}

function drawMap(canvas: HTMLCanvasElement, data: Float64Array, palette: "amplitude"|"phase"|"intensity", log = false) {
  const n = Math.round(Math.sqrt(data.length)); canvas.width=n; canvas.height=n;
  const ctx=canvas.getContext("2d")!, img=ctx.createImageData(n,n);
  let max=0; for(const v of data) if(v>max) max=v;
  for(let y=0;y<n;y++) for(let x=0;x<n;x++){
    const source=((y+n/2)%n)*n+((x+n/2)%n); let v=data[source]/(max||1);
    if(log) v=Math.max(0,(Math.log10(v+1e-7)+7)/7);
    const p=(y*n+x)*4;
    if(palette==="phase"){
      const a=data[source];
      if(a<0){img.data[p+3]=255;continue;}
      img.data[p]=40+Math.round(210*(.5+.5*Math.cos(a))); img.data[p+1]=40+Math.round(180*(.5+.5*Math.cos(a-2.094))); img.data[p+2]=60+Math.round(195*(.5+.5*Math.cos(a-4.188)));
    } else if(palette==="amplitude"){
      img.data[p]=Math.round(238*v); img.data[p+1]=Math.round(216*v); img.data[p+2]=Math.round(61*v);
    } else {
      img.data[p]=Math.round(35+220*v); img.data[p+1]=Math.round(18+205*Math.pow(v,.72)); img.data[p+2]=Math.round(10+130*Math.pow(v,1.8));
    }
    img.data[p+3]=255;
  }
  ctx.putImageData(img,0,0);
}

export function DiffractionLab(){
  const [mode,setMode]=useState<"square"|"draw">("square");
  const [halfWidth,setHalfWidth]=useState(.13), [amp,setAmp]=useState<Envelope>("constant"), [phase,setPhase]=useState<Envelope>("constant"), [axis,setAxis]=useState<Axis>("x");
  const [ampStrength,setAmpStrength]=useState(1), [cycles,setCycles]=useState(2), [log,setLog]=useState(true);
  const [brush,setBrush]=useState(7), [painting,setPainting]=useState(true), [drawRevision,setDrawRevision]=useState(0);
  const ampCanvas=useRef<HTMLCanvasElement>(null), phaseCanvas=useRef<HTMLCanvasElement>(null), farCanvas=useRef<HTMLCanvasElement>(null);
  const drawn=useRef(new Float64Array(128*128)); const dragging=useRef(false);

  useEffect(()=>{
    const n=128, size=Math.max(2,Math.round(n*halfWidth));
    const re=new Float64Array(n*n), im=new Float64Array(n*n), amps=new Float64Array(n*n), phases=new Float64Array(n*n); phases.fill(-1);
    if(mode==="draw"){
      for(let i=0;i<n*n;i++){re[i]=drawn.current[i];amps[i]=drawn.current[i];if(drawn.current[i]) phases[i]=0;}
    } else {
      for(let y=-size;y<=size;y++) for(let x=-size;x<=size;x++){
        const coord=axis==="x" ? x/size : y/size; let a=1;
        if(amp==="linear") a=Math.max(0,Math.min(1,.5+ampStrength*coord/2)); if(amp==="binary") a=coord>=0?1:0;
        let ph=0; if(phase==="linear") ph=Math.PI*cycles*(coord+1); if(phase==="binary") ph=coord>=0?Math.PI:0;
        const ix=(x+n)%n, iy=(y+n)%n, k=iy*n+ix; re[k]=a*Math.cos(ph); im[k]=a*Math.sin(ph); amps[k]=a; phases[k]=((ph%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
      }
    }
    const rr=new Float64Array(n), ii=new Float64Array(n);
    for(let y=0;y<n;y++){for(let x=0;x<n;x++){rr[x]=re[y*n+x];ii[x]=im[y*n+x];}fft(rr,ii);for(let x=0;x<n;x++){re[y*n+x]=rr[x];im[y*n+x]=ii[x];}}
    for(let x=0;x<n;x++){for(let y=0;y<n;y++){rr[y]=re[y*n+x];ii[y]=im[y*n+x];}fft(rr,ii);for(let y=0;y<n;y++){re[y*n+x]=rr[y];im[y*n+x]=ii[y];}}
    const intensity=new Float64Array(n*n); for(let i=0;i<intensity.length;i++) intensity[i]=re[i]*re[i]+im[i]*im[i];
    drawMap(ampCanvas.current!,amps,"amplitude"); drawMap(phaseCanvas.current!,phases,"phase"); drawMap(farCanvas.current!,intensity,"intensity",log);
  },[halfWidth,amp,phase,axis,ampStrength,cycles,log,mode,drawRevision]);

  function dab(e: React.PointerEvent<HTMLCanvasElement>){
    if(mode!=="draw") return;
    const rect=e.currentTarget.getBoundingClientRect(), dx=Math.floor((e.clientX-rect.left)/rect.width*128), dy=Math.floor((e.clientY-rect.top)/rect.height*128);
    const cx=(dx+64)%128, cy=(dy+64)%128;
    for(let y=-brush;y<=brush;y++) for(let x=-brush;x<=brush;x++) if(x*x+y*y<=brush*brush){
      const px=cx+x,py=cy+y;if(px>=0&&px<128&&py>=0&&py<128) drawn.current[py*128+px]=painting?1:0;
    }
    setDrawRevision(v=>v+1);
  }
  function clearDraw(){drawn.current.fill(0);setDrawRevision(v=>v+1);}
  function invertDraw(){for(let i=0;i<drawn.current.length;i++)drawn.current[i]=drawn.current[i]?0:1;setDrawRevision(v=>v+1);}

  return <main className="diff-page">
    <header className="diff-header"><Link className="back" href="/gallery">Gallery</Link><div><span className="eyebrow">Interactive Exhibit 10 · Wave Optics</span><h1>Square Aperture</h1></div><Link className="diff-read" href="/compendium/fraunhofer-diffraction">Read the field note →</Link></header>
    <nav className="diff-tabs" aria-label="Aperture modes"><button className={mode==="square"?"active":""} onClick={()=>setMode("square")}>Parametric square</button><button className={mode==="draw"?"active":""} onClick={()=>setMode("draw")}>Draw aperture</button></nav>
    <section className="diff-bench">
      <div className="diff-views">
        <figure><div className={"diff-canvas-wrap "+(mode==="draw"?"drawable":"")}><canvas ref={ampCanvas} onPointerDown={e=>{dragging.current=true;e.currentTarget.setPointerCapture(e.pointerId);dab(e)}} onPointerMove={e=>{if(dragging.current)dab(e)}} onPointerUp={()=>dragging.current=false}/><span className="reticle"/></div><figcaption><b>01</b> {mode==="draw"?"Draw transmission mask":"Aperture amplitude"}</figcaption></figure>
        <figure><div className="diff-canvas-wrap"><canvas ref={phaseCanvas}/><span className="reticle"/></div><figcaption><b>02</b> Wrapped phase</figcaption></figure>
        <figure className="far-field"><div className="diff-canvas-wrap"><canvas ref={farCanvas}/><span className="reticle"/></div><figcaption><b>03</b> Far-field intensity <em>{log?"log₁₀":"linear"}</em></figcaption></figure>
      </div>
      <aside className="diff-controls">
        {mode==="square"?<><p className="control-label">Illumination envelope</p>
        <Selector label="Amplitude" value={amp} set={setAmp} options={["constant","linear","binary"]}/><Selector label="Phase" value={phase} set={setPhase} options={["constant","linear","binary"]}/><Selector label="Envelope axis" value={axis} set={setAxis} options={["x","y"]}/>
        <Control label="Aperture half-width" value={halfWidth} set={setHalfWidth} min={.03} max={.46} step={.01}/><Control label="Amplitude contrast" value={ampStrength} set={setAmpStrength} min={0} max={6} step={.05}/><Control label="Phase cycles" value={cycles} set={setCycles} min={0} max={20} step={.1}/></>:<>
        <p className="control-label">Freehand aperture</p>
        <Selector label="Brush action" value={painting?"paint":"erase"} set={v=>setPainting(v==="paint")} options={["paint","erase"]}/>
        <Control label="Brush radius" value={brush} set={setBrush} min={1} max={24} step={1}/>
        <div className="diff-draw-actions"><button onClick={clearDraw}>Clear</button><button onClick={invertDraw}>Invert</button></div>
        <p className="diff-draw-hint">Draw directly in panel 01. The Fourier plane updates while the pointer moves.</p></>}
        <button type="button" className={"diff-log "+(log?"active":"")} onClick={()=>setLog(v=>!v)}><i/> Logarithmic intensity</button>
        <p className="diff-note">The observation plane is the squared magnitude of the aperture’s two-dimensional Fourier transform. Watch ramps steer the central order while edges throw sinc-like arms across the field.</p>
      </aside>
    </section>
  </main>;
}
