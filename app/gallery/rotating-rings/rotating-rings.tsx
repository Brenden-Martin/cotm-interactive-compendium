"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Controls = { count: number; stiffness: number; damping: number; impulse: number; inertia: number; speed: number };

const COLORS = ["#f2d83d", "#45c9cc", "#f46348", "#8f79d6", "#ef9b42", "#77d278", "#ed7f9b", "#9cd7ee", "#d6ee79", "#efb7e9", "#8da2ff", "#ffcf85"];

export function RotatingRings() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const defaults: Controls = { count: 6, stiffness: 2.4, damping: .025, impulse: 3.6, inertia: .18, speed: 1 };
  const controlsRef = useRef(defaults);
  const [controls, setControls] = useState(defaults);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const resetRef = useRef(0);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  const set = (key: keyof Controls, value: number) => {
    const next = { ...controlsRef.current, [key]: value };
    controlsRef.current = next; setControls(next);
    if (key === "count") resetRef.current++;
  };

  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let w = 0, h = 0, raf = 0, last = performance.now(), seen = -1;
    let angle: number[] = [], velocity: number[] = [], history: number[][] = [];
    let yaw = -.35, pitch = .58, dragging = false, px = 0, py = 0;
    const resize = () => {
      const d = Math.min(devicePixelRatio, 2); w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w*d; canvas.height = h*d; ctx.setTransform(d,0,0,d,0,0);
    };
    const restart = () => {
      const n = controlsRef.current.count;
      angle = Array(n).fill(0); velocity = Array(n).fill(0); velocity[0] = controlsRef.current.impulse;
      history = Array.from({ length: n }, () => []); seen = resetRef.current;
    };
    const project = (x:number,y:number,z:number):[number,number] => {
      const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
      const x1=cy*x+sy*z,z1=-sy*x+cy*z,y1=cp*y-sp*z1,z2=sp*y+cp*z1;
      const s=Math.min(w,h)*.31*(4/(4+z2));
      return [w*.48+x1*s,h*.48+y1*s];
    };
    const step = (dt:number) => {
      const c=controlsRef.current,n=c.count,acc=Array(n).fill(0);
      for(let i=0;i<n;i++){
        const inertia=1+c.inertia*i;
        let torque=-c.damping*velocity[i];
        if(i>0) torque+=c.stiffness*(angle[i-1]-angle[i]);
        if(i<n-1) torque+=c.stiffness*(angle[i+1]-angle[i]);
        acc[i]=torque/inertia;
      }
      for(let i=0;i<n;i++){velocity[i]+=acc[i]*dt;angle[i]+=velocity[i]*dt;history[i].push(velocity[i]);if(history[i].length>210)history[i].shift();}
    };
    const drawCoil = (r1:number,r2:number,a1:number,a2:number,z:number) => {
      ctx.beginPath();
      for(let j=0;j<=44;j++){const t=j/44,rr=r1+(r2-r1)*t+.025*Math.sin(t*Math.PI*12),a=a1+(a2-a1)*t;const p=project(Math.cos(a)*rr,Math.sin(a)*rr,z);j?ctx.lineTo(...p):ctx.moveTo(...p);}
      ctx.strokeStyle="rgba(231,243,232,.56)";ctx.lineWidth=1.5;ctx.stroke();
    };
    const draw=(now:number)=>{
      if(seen!==resetRef.current)restart();
      const dt=Math.min(.026,(now-last)/1000)*controlsRef.current.speed;last=now;
      if(!pausedRef.current)for(let k=0;k<4;k++)step(dt/4);
      ctx.fillStyle="#07121b";ctx.fillRect(0,0,w,h);
      const n=controlsRef.current.count,maxR=1.45;
      for(let g=-5;g<=5;g++){const p1=project(-1.8,g*.3,-.12),p2=project(1.8,g*.3,-.12);ctx.beginPath();ctx.moveTo(...p1);ctx.lineTo(...p2);ctx.strokeStyle="rgba(69,201,204,.07)";ctx.stroke();}
      const axle1=project(0,0,-.7),axle2=project(0,0,.7);ctx.beginPath();ctx.moveTo(...axle1);ctx.lineTo(...axle2);ctx.strokeStyle="#d9ded4";ctx.lineWidth=7;ctx.stroke();
      for(let i=n-1;i>=0;i--){
        const r=maxR-(i/(Math.max(1,n-1)))*.92,z=(i-(n-1)/2)*.035,a=angle[i];
        if(i<n-1){const prev=maxR-((i+1)/(Math.max(1,n-1)))*.92;drawCoil(prev,r,angle[i+1],a,z);}
        ctx.beginPath();for(let j=0;j<=128;j++){const t=j/128*Math.PI*2,p=project(Math.cos(t)*r,Math.sin(t)*r,z);j?ctx.lineTo(...p):ctx.moveTo(...p);}ctx.closePath();
        ctx.strokeStyle=COLORS[i];ctx.lineWidth=Math.max(3,7-i*.3);ctx.stroke();
        const hub=project(0,0,z),mark=project(Math.cos(a)*r,Math.sin(a)*r,z);ctx.beginPath();ctx.moveTo(...hub);ctx.lineTo(...mark);ctx.strokeStyle=COLORS[i];ctx.lineWidth=2;ctx.stroke();
        ctx.beginPath();ctx.arc(mark[0],mark[1],6,0,Math.PI*2);ctx.fillStyle="#f7f2dc";ctx.fill();
      }
      const gx=22,gy=h-126,gw=Math.min(390,w*.43),gh=88;ctx.strokeStyle="rgba(255,255,255,.2)";ctx.strokeRect(gx,gy,gw,gh);
      for(let i=0;i<n;i++){ctx.beginPath();history[i].forEach((v,j)=>{const xx=gx+j/209*gw,yy=gy+gh/2-v*10;j?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)});ctx.strokeStyle=COLORS[i];ctx.lineWidth=1.4;ctx.stroke();}
      ctx.fillStyle="#e7f3e8";ctx.font="700 10px monospace";ctx.fillText("ANGULAR VELOCITY / EACH RING",gx,gy-9);
      const energy=velocity.reduce((sum,v,i)=>sum+.5*(1+controlsRef.current.inertia*i)*v*v,0);
      ctx.fillText(`KINETIC ENERGY  ${energy.toFixed(3)}`,gx,gy+gh+19);
      raf=requestAnimationFrame(draw);
    };
    const down=(e:PointerEvent)=>{dragging=true;px=e.clientX;py=e.clientY;canvas.setPointerCapture(e.pointerId);};
    const move=(e:PointerEvent)=>{if(!dragging)return;yaw+=(e.clientX-px)*.008;pitch+=(e.clientY-py)*.008;px=e.clientX;py=e.clientY;};
    const up=()=>{dragging=false;};
    resize();restart();addEventListener("resize",resize);canvas.addEventListener("pointerdown",down);canvas.addEventListener("pointermove",move);canvas.addEventListener("pointerup",up);canvas.addEventListener("pointercancel",up);raf=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(raf);removeEventListener("resize",resize);canvas.removeEventListener("pointerdown",down);canvas.removeEventListener("pointermove",move);canvas.removeEventListener("pointerup",up);canvas.removeEventListener("pointercancel",up);};
  },[]);

  const sliders:Array<[keyof Controls,string,number,number,number]>=[
    ["count","Nested rings",2,12,1],["stiffness","Torsion stiffness",.1,8,.05],["damping","Bearing damping",0,.2,.002],
    ["impulse","Initial impulse",-7,7,.05],["inertia","Inertia gradient",0,.65,.01],["speed","Time scale",.1,3,.05],
  ];
  return <main className="rings-page">
    <header className="rings-header"><Link className="back" href="/gallery">Gallery</Link><div><span className="eyebrow">Interactive Exhibit 07 · Kinetic Sculpture</span><h1>Rotating Rings</h1></div><span className="folio">Iθ̈ = Στ</span></header>
    <section className="rings-lab">
      <div className="rings-stage"><canvas ref={canvasRef} className="rings-canvas"/><p>Drag to orbit the sculpture. Each bright spoke reveals its ring’s angular position.</p></div>
      <aside className="rings-controls">
        <div className="rings-transport"><button onClick={()=>setPaused(v=>!v)}>{paused?"Resume":"Pause"}</button><button onClick={()=>resetRef.current++}>Release impulse</button></div>
        {sliders.map(([key,label,min,max,step])=><label key={key}><span>{label}</span><output>{key==="count"?controls[key]:controls[key].toFixed(2)}</output><input aria-label={label} type="range" min={min} max={max} step={step} value={controls[key]} onChange={e=>set(key,+e.target.value)}/></label>)}
        <p>The outer ring receives the initial impulse. Torsion springs resist differences in angle, carrying angular momentum through the nested rotors and eventually returning it.</p>
      </aside>
    </section>
  </main>;
}
