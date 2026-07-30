"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type P = { drive: number; amplitude: number; damping: number; a2: number; a3: number; a4: number; a5: number; a6: number };

export function OscillatorLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initial: P = { drive: 1.15, amplitude: 1, damping: .08, a2: 1, a3: 0, a4: .18, a5: 0, a6: 0 };
  const ref = useRef<P>(initial);
  const [p, setP] = useState(initial);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const resetRef = useRef(0);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  const set = (key: keyof P, value: number) => { const n = { ...ref.current, [key]: value }; ref.current = n; setP(n); };

  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let w = 0, h = 0, raf = 0, last = performance.now(), seen = -1, time = 0, x = .7, v = 0;
    const samples: number[] = [], drives: number[] = [];
    const resize = () => { const d = Math.min(devicePixelRatio, 2); w = canvas.clientWidth; h = canvas.clientHeight; canvas.width = w*d; canvas.height = h*d; ctx.setTransform(d,0,0,d,0,0); };
    const force = (z: number, q: P) => -(2*q.a2*z + 3*q.a3*z*z + 4*q.a4*z**3 + 5*q.a5*z**4 + 6*q.a6*z**5);
    const potential = (z: number, q: P) => q.a2*z*z + q.a3*z**3 + q.a4*z**4 + q.a5*z**5 + q.a6*z**6;
    const restart = () => { time = 0; x = .7; v = 0; samples.length = 0; drives.length = 0; seen = resetRef.current; };
    const panel = (x0:number,y0:number,pw:number,ph:number,title:string) => { ctx.strokeStyle="rgba(240,238,220,.25)";ctx.lineWidth=1;ctx.strokeRect(x0,y0,pw,ph);ctx.fillStyle="#eeecd8";ctx.font="700 10px monospace";ctx.fillText(title,x0+10,y0+17); };
    const curve = (values:number[], x0:number,y0:number,pw:number,ph:number,color:string,scale:number) => { if(values.length<2)return;ctx.beginPath();values.forEach((n,i)=>{const xx=x0+i/(values.length-1)*pw,yy=y0+ph/2-n*scale;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)});ctx.strokeStyle=color;ctx.lineWidth=1.8;ctx.stroke(); };
    const draw = (now: number) => {
      if (seen !== resetRef.current) restart();
      const dt = Math.min(.025,(now-last)/1000); last=now; const q=ref.current;
      if(!pausedRef.current){ for(let i=0;i<4;i++){const d=dt/4;const drive=q.amplitude*Math.sin(2*Math.PI*q.drive*time);v+=(force(x,q)+drive-q.damping*v)*d;x+=v*d;time+=d;} samples.push(x);drives.push(Math.sin(2*Math.PI*q.drive*time));if(samples.length>300){samples.shift();drives.shift();}}
      ctx.fillStyle="#11151b";ctx.fillRect(0,0,w,h);
      const gap=12, left=Math.max(280,w*.58), right=w-left-gap, top=h*.53;
      panel(0,0,left-gap,top-gap,"MOTION / POTENTIAL WELL");
      panel(left,0,right,top-gap,"FORCE + POTENTIAL");
      panel(0,top,left-gap,h-top,"TIME DOMAIN");
      panel(left,top,right,h-top,"FREQUENCY DOMAIN");
      const ground=top-gap-48,cx=(left-gap)/2,span=Math.min(left*.38,260);
      ctx.beginPath();for(let i=0;i<=180;i++){const z=-2+i/45;const xx=cx+z*span/2;const yy=ground-Math.min(180,potential(z,q)*35);i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)}ctx.strokeStyle="#48d3cf";ctx.lineWidth=3;ctx.stroke();
      const bx=cx+x*span/2,by=ground-Math.min(180,potential(x,q)*35);ctx.beginPath();ctx.arc(bx,by-13,13,0,Math.PI*2);ctx.fillStyle="#f2dc43";ctx.fill();ctx.strokeStyle="#f36b4f";ctx.lineWidth=3;ctx.stroke();
      const rx=left+12,ry=30,rw=right-24,rh=top-gap-42;
      ctx.strokeStyle="rgba(255,255,255,.12)";ctx.beginPath();ctx.moveTo(rx,ry+rh/2);ctx.lineTo(rx+rw,ry+rh/2);ctx.stroke();
      ctx.beginPath();for(let i=0;i<=160;i++){const z=-2+i/40,xx=rx+i/160*rw,yy=ry+rh*.72-force(z,q)*10;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)}ctx.strokeStyle="#f36b4f";ctx.stroke();
      ctx.beginPath();for(let i=0;i<=160;i++){const z=-2+i/40,xx=rx+i/160*rw,yy=ry+rh*.72-Math.min(120,potential(z,q)*14);i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)}ctx.strokeStyle="#48d3cf";ctx.stroke();
      curve(samples,12,top+20,left-gap-24,h-top-30,"#f2dc43",32);curve(drives,12,top+20,left-gap-24,h-top-30,"rgba(72,211,207,.55)",24);
      const bins=36,spec=[];for(let k=0;k<bins;k++){let re=0,im=0;for(let n=0;n<samples.length;n++){const a=2*Math.PI*k*n/samples.length;re+=samples[n]*Math.cos(a);im-=samples[n]*Math.sin(a)}spec.push(Math.hypot(re,im)/(samples.length||1));}
      const max=Math.max(...spec,.001);spec.forEach((n,i)=>{const bw=(right-30)/bins;ctx.fillStyle=i===Math.round(q.drive*5)?"#f36b4f":"#48d3cf";ctx.fillRect(left+15+i*bw,h-18,(bw-2),-n/max*(h-top-48));});
      raf=requestAnimationFrame(draw);
    };
    resize();restart();addEventListener("resize",resize);raf=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(raf);removeEventListener("resize",resize);};
  },[]);

  const controls:Array<[keyof P,string,number,number,number]> = [
    ["drive","Drive frequency",.05,5,.01],["amplitude","Drive amplitude",0,4,.01],["damping","Damping",0,1,.005],
    ["a2","a₂ · quadratic",-3,4,.01],["a3","a₃ · cubic",-2,2,.01],["a4","a₄ · quartic",-1,2,.01],["a5","a₅ · quintic",-1,1,.01],["a6","a₆ · sextic",0,1,.005],
  ];
  return <main className="osc-page">
    <header className="osc-header"><Link className="back" href="/gallery">Gallery</Link><div><span className="eyebrow">Interactive Exhibit 08</span><h1>Nonlinear Oscillator</h1></div><Link className="osc-read" href="/compendium/nonlinear-oscillations">Read the theory →</Link></header>
    <section className="osc-lab"><div className="osc-stage"><canvas ref={canvasRef} className="osc-canvas"/></div><aside className="osc-controls">
      <div className="osc-transport"><button onClick={()=>setPaused(v=>!v)}>{paused?"Resume":"Pause"}</button><button onClick={()=>resetRef.current++}>Restart</button></div>
      {controls.map(([key,label,min,max,step])=><label key={key}><span>{label}</span><output>{p[key].toFixed(2)}</output><input aria-label={label} type="range" min={min} max={max} step={step} value={p[key]} onChange={e=>set(key,+e.target.value)}/></label>)}
      <p>Higher-order terms reshape the well. Watch a pure driving tone bloom into harmonics as the restoring force becomes nonlinear.</p>
    </aside></section>
  </main>;
}
