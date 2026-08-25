"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Settings = { bpm:number; variability:number; depth:number; floor:number; correlation:number; range:number; angle:number; sourceOrder:number; detectorOrder:number; absorption:number; noise:number; bits:number; lock:number };
const defaults: Settings = { bpm:35, variability:.18, depth:9, floor:.32, correlation:14, range:15, angle:0, sourceOrder:2, detectorOrder:2, absorption:.16, noise:.02, bits:4, lock:.02 };
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));

function Slider({label,value,min,max,step,onChange,unit=""}:{label:string;value:number;min:number;max:number;step:number;onChange:(v:number)=>void;unit?:string}) {
  return <label className="resp-slider"><span>{label}<output>{value.toFixed(step < .1 ? 2 : step < 1 ? 1 : 0)}{unit}</output></span><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(+e.target.value)} /></label>;
}

export function RespirationMonitor() {
  const canvasRef=useRef<HTMLCanvasElement>(null); const settingsRef=useRef(defaults); const sensorRef=useRef({x:.2,y:.52}); const dragRef=useRef(false);
  const [settings,setSettings]=useState(defaults); const [paused,setPaused]=useState(false); const [preset,setPreset]=useState("resting"); const [readout,setReadout]=useState({motion:0,ideal:0,measured:0});
  useEffect(()=>{ settingsRef.current=settings; },[settings]);
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas)return; const ctx=canvas.getContext("2d"); if(!ctx)return;
    let frame=0,last=performance.now(),phase=0,ampNoise=0,freqNoise=0,filtered=0; const idealTrace:number[]=[]; const measuredTrace:number[]=[]; const motionTrace:number[]=[];
    const resize=()=>{ const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio,2); canvas.width=Math.max(1,Math.round(r.width*d));canvas.height=Math.max(1,Math.round(r.height*d));ctx.setTransform(d,0,0,d,0,0);}; resize(); addEventListener("resize",resize);
    const draw=(now:number)=>{ const dt=Math.min(.05,(now-last)/1000);last=now; const s=settingsRef.current,w=canvas.clientWidth,h=canvas.clientHeight;
      if(!paused){ const a=Math.exp(-dt/Math.max(.5,s.correlation)); ampNoise=a*ampNoise+Math.sqrt(1-a*a)*(Math.random()*2-1); freqNoise=a*freqNoise+Math.sqrt(1-a*a)*(Math.random()*2-1); phase+=Math.PI*(s.bpm/60)*(1+s.variability*.45*freqNoise)*dt; }
      const envelope=s.floor+(1-s.floor)*(.5+Math.atan(1.7*ampNoise)/Math.PI); const motion=(s.depth/100)*envelope*Math.pow(Math.max(0,Math.sin(phase)),6); const sensor=sensorRef.current;
      const chestX=.69-motion, chestY=.52; const dx=chestX-sensor.x,dy=chestY-sensor.y,range=Math.hypot(dx,dy); const bearing=Math.atan2(dy,dx); const alignment=Math.max(0,Math.cos(bearing-s.angle*Math.PI/180)); const torsoNormal=Math.max(0,Math.cos(bearing));
      const ideal=Math.pow(alignment,s.sourceOrder)*Math.pow(torsoNormal,s.detectorOrder)*Math.exp(-s.absorption)/(Math.pow(.17+range,4)); const normalized=clamp(ideal*0.008*s.range,0,1); let measured=normalized+(Math.random()*2-1)*s.noise; const levels=Math.pow(2,s.bits)-1; measured=Math.round(clamp(measured,0,1)*levels)/levels; const k=1-Math.exp(-dt/Math.max(.015,s.lock)); filtered+=k*(measured-filtered);
      if(!paused && frame%2===0){ idealTrace.push(normalized);measuredTrace.push(filtered);motionTrace.push(motion*8); if(idealTrace.length>300){idealTrace.shift();measuredTrace.shift();motionTrace.shift();}}
      ctx.clearRect(0,0,w,h); ctx.fillStyle="#071c2a";ctx.fillRect(0,0,w,h); ctx.strokeStyle="rgba(99,219,234,.12)";ctx.lineWidth=1; for(let x=0;x<w;x+=36){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}for(let y=0;y<h;y+=36){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
      const bodyX=chestX*w, bodyY=chestY*h; ctx.fillStyle="#e3a785";ctx.beginPath();ctx.moveTo(bodyX+70,40);ctx.bezierCurveTo(bodyX-25,75,bodyX-45,bodyY-100,bodyX-25,bodyY);ctx.bezierCurveTo(bodyX-12,bodyY+90,bodyX+24,h-30,bodyX+92,h);ctx.lineTo(w,h);ctx.lineTo(w,0);ctx.closePath();ctx.fill();
      ctx.strokeStyle="#ffd652";ctx.lineWidth=1.2;ctx.globalAlpha=.28; for(let i=-6;i<=6;i++){ctx.beginPath();ctx.moveTo(sensor.x*w,sensor.y*h);ctx.lineTo(bodyX,(sensor.y+i*.035)*h);ctx.stroke()}ctx.globalAlpha=1;
      ctx.save();ctx.translate(sensor.x*w,sensor.y*h);ctx.rotate(s.angle*Math.PI/180);ctx.fillStyle="#eff9f6";ctx.fillRect(-34,-22,68,44);ctx.fillStyle="#ef4b38";ctx.fillRect(12,-15,12,30);ctx.fillStyle="#ffd652";ctx.beginPath();ctx.arc(-15,0,8,0,Math.PI*2);ctx.fill();ctx.restore();
      const plotTop=h*.68,plotH=h*.29;ctx.fillStyle="rgba(3,12,19,.82)";ctx.fillRect(0,plotTop,w,plotH); const trace=(values:number[],color:string,scale=1)=>{ctx.strokeStyle=color;ctx.lineWidth=1.6;ctx.beginPath();values.forEach((v,i)=>{const x=i/299*w,y=plotTop+plotH*(.86-clamp(v*scale,0,.78));if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)});ctx.stroke()}; trace(motionTrace,"#ffd652",1);trace(idealTrace,"#38d3ea",.9);trace(measuredTrace,"#ff6e9d",.9);
      ctx.fillStyle="#eaf7ef";ctx.font="700 9px ui-monospace";ctx.fillText("MOTION",12,plotTop+16);ctx.fillStyle="#38d3ea";ctx.fillText("IDEAL",75,plotTop+16);ctx.fillStyle="#ff6e9d";ctx.fillText("MEASURED",126,plotTop+16);
      if(frame%10===0)setReadout({motion:motion*100,ideal:normalized,measured:filtered});frame++;requestAnimationFrame(draw);
    }; const id=requestAnimationFrame(draw);return()=>{cancelAnimationFrame(id);removeEventListener("resize",resize)};
  },[paused]);
  const pointer=(e:React.PointerEvent<HTMLCanvasElement>)=>{const r=e.currentTarget.getBoundingClientRect();sensorRef.current={x:clamp((e.clientX-r.left)/r.width,.05,.58),y:clamp((e.clientY-r.top)/r.height,.12,.62)}};
  const set=(key:keyof Settings,value:number)=>setSettings(v=>({...v,[key]:value}));
  const choose=(name:string)=>{setPreset(name);setSettings(name==="elevated"?{...defaults,bpm:27,variability:.28,depth:6}:name==="apnea"?{...defaults,bpm:8,variability:.72,depth:4,floor:.06,correlation:24}:defaults)};
  return <main className="resp-page">
    <header className="resp-head"><Link href="/gallery">Gallery</Link><div><span className="eyebrow">Exhibit 29 / Biomedical Optics</span><h1>Respiration Monitor</h1></div><Link href="/research/noncontact-respiration-monitoring">Research archive ↗</Link></header>
    <section className="resp-console"><div className="resp-stage"><canvas ref={canvasRef} onPointerDown={e=>{dragRef.current=true;e.currentTarget.setPointerCapture(e.pointerId);pointer(e)}} onPointerMove={e=>dragRef.current&&pointer(e)} onPointerUp={()=>dragRef.current=false} aria-label="Draggable light-wave sensing simulation"/><div className="resp-readout"><span>Chest <b>{readout.motion.toFixed(2)} cm</b></span><span>Ideal <b>{readout.ideal.toFixed(3)}</b></span><span>Filtered <b>{readout.measured.toFixed(3)}</b></span></div><p>Drag the white sensor through the field.</p></div>
      <aside className="resp-controls"><div className="resp-tabs">{["resting","elevated","apnea"].map(x=><button className={preset===x?"active":""} key={x} onClick={()=>choose(x)}>{x}</button>)}</div><div className="resp-actions"><button onClick={()=>setPaused(v=>!v)}>{paused?"Resume":"Pause"}</button><button onClick={()=>{setSettings({...defaults,bpm:8+Math.random()*25,variability:.1+Math.random()*.7,depth:3+Math.random()*12,noise:Math.random()*.05});setPreset("custom")}}>Randomize</button></div>
        <details open><summary>Breathing generator</summary><Slider label="Mean rate" value={settings.bpm} min={4} max={40} step={1} unit=" BPM" onChange={v=>set("bpm",v)}/><Slider label="Variability" value={settings.variability} min={0} max={1} step={.01} onChange={v=>set("variability",v)}/><Slider label="Excursion" value={settings.depth} min={1} max={18} step={.1} unit=" cm" onChange={v=>set("depth",v)}/><Slider label="Minimum depth" value={settings.floor} min={0} max={.9} step={.01} onChange={v=>set("floor",v)}/><Slider label="Correlation" value={settings.correlation} min={1} max={40} step={.5} unit=" s" onChange={v=>set("correlation",v)}/></details>
        <details><summary>Optical return</summary><Slider label="Receiver gain" value={settings.range} min={5} max={140} step={1} onChange={v=>set("range",v)}/><Slider label="Sensor angle" value={settings.angle} min={-80} max={80} step={1} unit="°" onChange={v=>set("angle",v)}/><Slider label="Source order" value={settings.sourceOrder} min={.5} max={8} step={.1} onChange={v=>set("sourceOrder",v)}/><Slider label="Detector order" value={settings.detectorOrder} min={.5} max={8} step={.1} onChange={v=>set("detectorOrder",v)}/><Slider label="Cloth absorption" value={settings.absorption} min={0} max={2} step={.01} onChange={v=>set("absorption",v)}/></details>
        <details><summary>Acquisition</summary><Slider label="Noise" value={settings.noise} min={0} max={.12} step={.001} onChange={v=>set("noise",v)}/><Slider label="ADC" value={settings.bits} min={4} max={16} step={1} unit=" bit" onChange={v=>set("bits",v)}/><Slider label="Lock-in time" value={settings.lock} min={.02} max={2} step={.01} unit=" s" onChange={v=>set("lock",v)}/></details>
        <p className="resp-note">The stochastic torso motion follows the paper’s correlated amplitude/frequency construction and sixth-power breath pulse. Optical return uses a Lambertian range-and-angle sketch for exploration, not a calibrated medical instrument.</p>
      </aside></section>
  </main>;
}
