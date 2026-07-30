"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type C = { re:number; im:number };
type J = [C,C];
type Order = "QH" | "HQ" | "QHQ";
const mul=(a:C,b:C):C=>({re:a.re*b.re-a.im*b.im,im:a.re*b.im+a.im*b.re});
const add=(a:C,b:C):C=>({re:a.re+b.re,im:a.im+b.im});
const scale=(a:C,s:number):C=>({re:a.re*s,im:a.im*s});
const plate=(j:J,angle:number,delay:number):J=>{
  const a=angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),u=add(scale(j[0],c),scale(j[1],s)),v=add(scale(j[0],-s),scale(j[1],c));
  const vd=mul(v,{re:Math.cos(delay),im:Math.sin(delay)});
  return [add(scale(u,c),scale(vd,-s)),add(scale(u,s),scale(vd,c))];
};
const normalize=(j:J):J=>{const n=Math.sqrt(j[0].re**2+j[0].im**2+j[1].re**2+j[1].im**2)||1;return [scale(j[0],1/n),scale(j[1],1/n)];};
const stokes=(j:J)=>{
  const [x,y]=normalize(j),cross=mul(x,{re:y.re,im:-y.im});
  return [x.re*x.re+x.im*x.im-y.re*y.re-y.im*y.im,2*cross.re,-2*cross.im];
};

export function PolarizationLab(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const [ampH,setAmpH]=useState(1),[ampV,setAmpV]=useState(1),[phase,setPhase]=useState(90);
  const [q1,setQ1]=useState(0),[hwp,setHwp]=useState(22.5),[q2,setQ2]=useState(45),[order,setOrder]=useState<Order>("QH");
  const input=useMemo<J>(()=>normalize([{re:ampH,im:0},{re:ampV*Math.cos(phase*Math.PI/180),im:ampV*Math.sin(phase*Math.PI/180)}]),[ampH,ampV,phase]);
  const output=useMemo<J>(()=>{let j=input;if(order==="QH"){j=plate(j,q1,Math.PI/2);j=plate(j,hwp,Math.PI);}else if(order==="HQ"){j=plate(j,hwp,Math.PI);j=plate(j,q1,Math.PI/2);}else{j=plate(j,q1,Math.PI/2);j=plate(j,hwp,Math.PI);j=plate(j,q2,Math.PI/2);}return normalize(j);},[input,q1,hwp,q2,order]);
  const outRef=useRef(output),inRef=useRef(input);useEffect(()=>{outRef.current=output;inRef.current=input;},[output,input]);
  const S=stokes(output);
  const preset=(name:string)=>{if(name==="H"){setAmpH(1);setAmpV(0);setPhase(0)}if(name==="D"){setAmpH(1);setAmpV(1);setPhase(0)}if(name==="R"){setAmpH(1);setAmpV(1);setPhase(-90)}if(name==="L"){setAmpH(1);setAmpV(1);setPhase(90)}};
  useEffect(()=>{
    const canvas=canvasRef.current,ctx=canvas?.getContext("2d");if(!canvas||!ctx)return;let w=0,h=0,raf=0,t=0,last=performance.now();
    const resize=()=>{const d=Math.min(devicePixelRatio,2);w=canvas.clientWidth;h=canvas.clientHeight;canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);};
    const ellipse=(j:J,cx:number,cy:number,r:number,color:string,label:string)=>{
      ctx.strokeStyle="rgba(225,247,243,.15)";ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(cx-r,cy);ctx.lineTo(cx+r,cy);ctx.moveTo(cx,cy-r);ctx.lineTo(cx,cy+r);ctx.stroke();
      ctx.beginPath();for(let i=0;i<=120;i++){const ph=i/120*Math.PI*2,x=j[0].re*Math.cos(ph)-j[0].im*Math.sin(ph),y=j[1].re*Math.cos(ph)-j[1].im*Math.sin(ph);i?ctx.lineTo(cx+x*r*.83,cy-y*r*.83):ctx.moveTo(cx+x*r*.83,cy-y*r*.83)}ctx.strokeStyle=color;ctx.lineWidth=3;ctx.stroke();
      const x=j[0].re*Math.cos(t)-j[0].im*Math.sin(t),y=j[1].re*Math.cos(t)-j[1].im*Math.sin(t);ctx.beginPath();ctx.arc(cx+x*r*.83,cy-y*r*.83,7,0,Math.PI*2);ctx.fillStyle="#efffbd";ctx.fill();
      ctx.fillStyle="#dff5ef";ctx.font="800 10px monospace";ctx.fillText(label,cx-r,cy-r-12);
    };
    const draw=(now:number)=>{t+=(now-last)/420;last=now;ctx.fillStyle="#071a1d";ctx.fillRect(0,0,w,h);const r=Math.min(w*.18,h*.24,145);
      ellipse(inRef.current,w*.2,h*.37,r,"#45c9cc","INPUT FIELD");ellipse(outRef.current,w*.53,h*.37,r,"#f2d83d","OUTPUT FIELD");
      const sx=w*.82,sy=h*.38,sr=Math.min(w*.14,h*.23,135);ctx.beginPath();ctx.arc(sx,sy,sr,0,Math.PI*2);ctx.fillStyle="rgba(44,88,91,.48)";ctx.fill();ctx.strokeStyle="#82dcd2";ctx.lineWidth=2;ctx.stroke();
      ctx.strokeStyle="rgba(130,220,210,.4)";ctx.beginPath();ctx.ellipse(sx,sy,sr,sr*.32,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.ellipse(sx,sy,sr*.35,sr,0,0,Math.PI*2);ctx.stroke();
      const s=stokes(outRef.current),px=sx+(s[0]*.82+s[1]*.28)*sr,py=sy+(-s[2]*.72+s[1]*.28)*sr;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(px,py);ctx.strokeStyle="#f2d83d";ctx.stroke();ctx.beginPath();ctx.arc(px,py,8,0,Math.PI*2);ctx.fillStyle="#f36b4f";ctx.fill();
      ctx.fillStyle="#dff5ef";ctx.font="800 10px monospace";ctx.fillText("POINCARÉ SPHERE",sx-sr,sy-sr-12);
      const y0=h*.73;ctx.strokeStyle="rgba(223,245,239,.3)";ctx.beginPath();ctx.moveTo(w*.1,y0);ctx.lineTo(w*.9,y0);ctx.stroke();
      const labels=order==="QH"?["INPUT","QWP","HWP","OUTPUT"]:order==="HQ"?["INPUT","HWP","QWP","OUTPUT"]:["INPUT","QWP","HWP","QWP","OUTPUT"];
      labels.forEach((label,i)=>{const x=w*.1+i/(labels.length-1)*w*.8;ctx.beginPath();ctx.arc(x,y0,18,0,Math.PI*2);ctx.fillStyle=label==="QWP"?"#45c9cc":label==="HWP"?"#8f79d6":"#f2d83d";ctx.fill();ctx.fillStyle="#dff5ef";ctx.textAlign="center";ctx.fillText(label,x,y0+36)});ctx.textAlign="left";
      raf=requestAnimationFrame(draw);};resize();addEventListener("resize",resize);raf=requestAnimationFrame(draw);return()=>{cancelAnimationFrame(raf);removeEventListener("resize",resize);};
  },[order]);
  return <main className="pol-page"><header className="pol-header"><Link className="back" href="/gallery">Gallery</Link><div><span className="eyebrow">Interactive Exhibit 09</span><h1>Polarization Space</h1></div><Link className="osc-read" href="/compendium/polarization-space">Read the theory →</Link></header>
    <section className="pol-lab"><div className="pol-stage"><canvas ref={canvasRef} className="pol-canvas"/><div className="pol-stokes"><b>S₁ {S[0].toFixed(3)}</b><b>S₂ {S[1].toFixed(3)}</b><b>S₃ {S[2].toFixed(3)}</b></div></div>
      <aside className="pol-controls"><div className="pol-presets">{["H","D","R","L"].map(n=><button key={n} onClick={()=>preset(n)}>{n}</button>)}</div>
        <label><span>H amplitude</span><output>{ampH.toFixed(2)}</output><input type="range" min="0" max="1" step=".01" value={ampH} onChange={e=>setAmpH(+e.target.value)}/></label>
        <label><span>V amplitude</span><output>{ampV.toFixed(2)}</output><input type="range" min="0" max="1" step=".01" value={ampV} onChange={e=>setAmpV(+e.target.value)}/></label>
        <label><span>Relative phase</span><output>{phase}°</output><input type="range" min="-180" max="180" step="1" value={phase} onChange={e=>setPhase(+e.target.value)}/></label>
        <span className="control-label">Optical train</span><select value={order} onChange={e=>setOrder(e.target.value as Order)}><option value="QH">QWP → HWP</option><option value="HQ">HWP → QWP</option><option value="QHQ">QWP → HWP → QWP</option></select>
        <label><span>QWP 1 angle</span><output>{q1}°</output><input type="range" min="0" max="180" value={q1} onChange={e=>setQ1(+e.target.value)}/></label>
        <label><span>HWP angle</span><output>{hwp}°</output><input type="range" min="0" max="180" step=".5" value={hwp} onChange={e=>setHwp(+e.target.value)}/></label>
        {order==="QHQ"&&<label><span>QWP 2 angle</span><output>{q2}°</output><input type="range" min="0" max="180" value={q2} onChange={e=>setQ2(+e.target.value)}/></label>}
        <p>Complex field components pass through rotated Jones operators. The output ellipse and its point on the Poincaré sphere update together.</p>
      </aside></section></main>;
}
