"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type P = { drive: number; amplitude: number; damping: number; a2: number; a3: number; a4: number; a5: number; a6: number };
type Mode = "mechanical" | "audio";
type SpectrumScale = "linear" | "db";

const mechanicalInitial: P = { drive: 1.15, amplitude: 1, damping: .08, a2: 1, a3: 0, a4: .18, a5: 0, a6: 0 };
const audioInitial: P = { drive: 220, amplitude: .72, damping: .08, a2: 1, a3: 0, a4: .18, a5: 0, a6: 0 };

export function OscillatorLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ref = useRef<P>(mechanicalInitial);
  const [p, setP] = useState(mechanicalInitial);
  const [mode, setMode] = useState<Mode>("mechanical");
  const modeRef = useRef<Mode>("mechanical");
  const [spectrumScale, setSpectrumScale] = useState<SpectrumScale>("linear");
  const scaleRef = useRef<SpectrumScale>("linear");
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [audioOn, setAudioOn] = useState(false);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioNodesRef = useRef<{ context: AudioContext; oscillator: OscillatorNode; shaper: WaveShaperNode; filter: BiquadFilterNode; gain: GainNode } | null>(null);
  const resetRef = useRef(0);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { scaleRef.current = spectrumScale; }, [spectrumScale]);
  const set = (key: keyof P, value: number) => {
    const next = { ...ref.current, [key]: value };
    ref.current = next;
    setP(next);
  };

  const makeCurve = (q: P) => {
    const curve = new Float32Array(8192);
    let peak = 0;
    for (let i = 0; i < curve.length; i++) {
      const x = i / (curve.length - 1) * 2 - 1;
      const y = q.a2*x + q.a3*x**2 + q.a4*x**3 + q.a5*x**4 + q.a6*x**5;
      curve[i] = y;
      peak = Math.max(peak, Math.abs(y));
    }
    const normalizer = Math.max(1, peak);
    for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(curve[i] / normalizer * 1.7);
    return curve;
  };

  useEffect(() => {
    const nodes = audioNodesRef.current;
    if (!nodes) return;
    const q = ref.current;
    nodes.oscillator.frequency.setTargetAtTime(q.drive, nodes.context.currentTime, .015);
    nodes.gain.gain.setTargetAtTime(audioOn ? .16 : 0, nodes.context.currentTime, .02);
    nodes.filter.frequency.setTargetAtTime(18000 - q.damping * 15000, nodes.context.currentTime, .025);
    nodes.shaper.curve = makeCurve(q);
  }, [p, audioOn]);

  useEffect(() => () => {
    const nodes = audioNodesRef.current;
    if (nodes) void nodes.context.close();
  }, []);

  const toggleAudio = async () => {
    if (!audioNodesRef.current) {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const shaper = context.createWaveShaper();
      const filter = context.createBiquadFilter();
      const analyser = context.createAnalyser();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = ref.current.drive;
      shaper.oversample = "4x";
      shaper.curve = makeCurve(ref.current);
      filter.type = "lowpass";
      filter.frequency.value = 18000 - ref.current.damping * 15000;
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = .72;
      gain.gain.value = 0;
      oscillator.connect(shaper).connect(filter).connect(analyser).connect(gain).connect(context.destination);
      oscillator.start();
      audioAnalyserRef.current = analyser;
      audioNodesRef.current = { context, oscillator, shaper, filter, gain };
    }
    const nodes = audioNodesRef.current;
    await nodes.context.resume();
    const next = !audioOn;
    nodes.gain.gain.setTargetAtTime(next ? .16 : 0, nodes.context.currentTime, .02);
    setAudioOn(next);
  };

  const changeMode = (next: Mode) => {
    if (next === mode) return;
    if (audioNodesRef.current) audioNodesRef.current.gain.gain.setTargetAtTime(0, audioNodesRef.current.context.currentTime, .01);
    setAudioOn(false);
    modeRef.current = next;
    setMode(next);
    const initial = next === "audio" ? audioInitial : mechanicalInitial;
    ref.current = initial;
    setP(initial);
    setPaused(false);
    resetRef.current++;
  };

  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let w = 0, h = 0, raf = 0, last = performance.now(), seen = -1, time = 0, x = .7, v = 0, spectrumFrame = 0;
    const visibleSamples: number[] = [], drives: number[] = [], spectrumHistory: number[][] = [];
    let mechanicalSpectrum: number[] = [];
    let averagedSpectrum: number[] = [];
    const audioWave = new Uint8Array(2048), audioSpectrum = new Float32Array(2048);
    const resize = () => { const d = Math.min(devicePixelRatio, 2); w = canvas.clientWidth; h = canvas.clientHeight; canvas.width = w*d; canvas.height = h*d; ctx.setTransform(d,0,0,d,0,0); };
    const force = (z: number, q: P) => -(2*q.a2*z + 3*q.a3*z*z + 4*q.a4*z**3 + 5*q.a5*z**4 + 6*q.a6*z**5);
    const potential = (z: number, q: P) => q.a2*z*z + q.a3*z**3 + q.a4*z**4 + q.a5*z**5 + q.a6*z**6;
    const transfer = (z: number, q: P) => Math.tanh((q.a2*z + q.a3*z**2 + q.a4*z**3 + q.a5*z**4 + q.a6*z**5) * 1.4);
    const restart = () => { time = 0; x = .7; v = 0; spectrumFrame = 0; visibleSamples.length = 0; drives.length = 0; spectrumHistory.length = 0; mechanicalSpectrum = []; averagedSpectrum = []; seen = resetRef.current; };
    const panel = (x0:number,y0:number,pw:number,ph:number,title:string) => { ctx.strokeStyle="rgba(240,238,220,.25)";ctx.lineWidth=1;ctx.strokeRect(x0,y0,pw,ph);ctx.fillStyle="#eeecd8";ctx.font="700 10px monospace";ctx.fillText(title,x0+10,y0+17); };
    const curve = (values:number[], x0:number,y0:number,pw:number,ph:number,color:string,scale:number) => { if(values.length<2)return;ctx.beginPath();values.forEach((n,i)=>{const xx=x0+i/(values.length-1)*pw,yy=y0+ph/2-n*scale;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)});ctx.strokeStyle=color;ctx.lineWidth=1.8;ctx.stroke(); };
    const drawSpectrum = (spec: number[], frequencyAtBin: (index: number) => number, q: P, left: number, top: number, right: number) => {
      const usable = spec.slice(1);
      const values = scaleRef.current === "db"
        ? usable.map(n => Math.max(0, (20 * Math.log10(Math.max(n, 1e-7)) + 72) / 72))
        : (() => { const max = Math.max(...usable, .001); return usable.map(n => n / max); })();
      const bw = (right-30)/values.length;
      values.forEach((n,i)=>{
        const frequency = frequencyAtBin(i + 1), nextFrequency = frequencyAtBin(i + 2);
        const isDrive = q.drive >= frequency - (nextFrequency-frequency)/2 && q.drive < nextFrequency + (nextFrequency-frequency)/2;
        ctx.fillStyle=isDrive?"#f36b4f":"#48d3cf";
        ctx.fillRect(left+15+i*bw,h-18,Math.max(1,bw-2),-n*(h-top-48));
      });
      ctx.fillStyle="rgba(238,236,216,.6)";ctx.font="700 8px monospace";ctx.fillText(scaleRef.current === "db" ? "dB" : "LINEAR", left+right-44, top+17);
    };
    const drawMechanicalSpectrum = (q: P, left: number, top: number, right: number) => {
      if(++spectrumFrame%6===0||mechanicalSpectrum.length===0){
        const bins=36,windowSize=300,padding=windowSize-visibleSamples.length,spec:number[]=[];
        for(let k=0;k<bins;k++){let re=0,im=0;for(let n=0;n<windowSize;n++){const sample=n<padding?0:visibleSamples[n-padding],a=2*Math.PI*k*n/windowSize;re+=sample*Math.cos(a);im-=sample*Math.sin(a)}spec.push(Math.hypot(re,im)/windowSize);}
        mechanicalSpectrum=spec;
        spectrumHistory.push(spec);
        if(spectrumHistory.length>100)spectrumHistory.shift();
        averagedSpectrum=spec.map((_,index)=>spectrumHistory.reduce((sum,item)=>sum+item[index],0)/spectrumHistory.length);
      }
      const reference=Math.max(...mechanicalSpectrum,...averagedSpectrum,.001);
      const normalize=(value:number)=>scaleRef.current==="db"?Math.max(0,(20*Math.log10(Math.max(value/reference,1e-7))+72)/72):value/reference;
      const live=mechanicalSpectrum.map(normalize),average=averagedSpectrum.map(normalize),bw=(right-30)/live.length,plotHeight=h-top-48;
      if(average.length>1){ctx.beginPath();average.forEach((value,index)=>{const xx=left+15+(index+.5)*bw,yy=h-18-value*plotHeight;index?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)});ctx.strokeStyle="rgba(210,213,211,.66)";ctx.lineWidth=2;ctx.stroke();}
      live.forEach((value,index)=>{ctx.fillStyle=index===Math.round(q.drive*5)?"#f36b4f":"#48d3cf";ctx.fillRect(left+15+index*bw,h-18,bw-2,-value*plotHeight);});
      ctx.fillStyle="rgba(238,236,216,.6)";ctx.font="700 8px monospace";ctx.fillText(`${scaleRef.current==="db"?"dB":"LINEAR"} · GREY 10s AVG`,left+right-108,top+17);
    };
    const draw = (now: number) => {
      if (seen !== resetRef.current) restart();
      const dt = Math.min(.025,(now-last)/1000); last=now; const q=ref.current;
      const isAudio = modeRef.current === "audio";
      if(!isAudio && !pausedRef.current){
        for(let i=0;i<4;i++){const d=dt/4,drive=q.amplitude*Math.sin(2*Math.PI*q.drive*time);v+=(force(x,q)+drive-q.damping*v)*d;x+=v*d;time+=d;}
        visibleSamples.push(x);drives.push(Math.sin(2*Math.PI*q.drive*time));
        if(visibleSamples.length>300){visibleSamples.shift();drives.shift();}
      }
      ctx.fillStyle="#11151b";ctx.fillRect(0,0,w,h);
      const gap=12,left=Math.max(280,w*.58),right=w-left-gap,top=h*.53;
      panel(0,0,left-gap,top-gap,isAudio?"OSCILLOSCOPE / LIVE SIGNAL":"MOTION / POTENTIAL WELL");
      panel(left,0,right,top-gap,isAudio?"TRANSFER CURVE":"FORCE + POTENTIAL");
      panel(0,top,left-gap,h-top,"TIME DOMAIN");
      panel(left,top,right,h-top,"FREQUENCY DOMAIN");
      if(isAudio){
        const analyser=audioAnalyserRef.current,waveform:number[]=[];
        if(analyser&&audioOn){analyser.getByteTimeDomainData(audioWave);for(let i=0;i<audioWave.length;i+=5)waveform.push((audioWave[i]-128)/128);}
        else for(let i=0;i<360;i++)waveform.push(Math.sin(i/360*Math.PI*10)*.42);
        curve(waveform,18,35,left-gap-36,top-gap-50,"#f2dc43",Math.min(110,(top-gap-50)*.38));
        const rx=left+12,ry=30,rw=right-24,rh=top-gap-42;
        ctx.beginPath();for(let i=0;i<=160;i++){const z=-1+i/80,xx=rx+i/160*rw,yy=ry+rh/2-transfer(z*q.amplitude,q)*rh*.38;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)}ctx.strokeStyle="#48d3cf";ctx.lineWidth=2;ctx.stroke();
        curve(waveform.slice(-300),12,top+20,left-gap-24,h-top-30,"#f2dc43",32);
        if(analyser&&audioOn){analyser.getFloatFrequencyData(audioSpectrum);const binHz=analyser.context.sampleRate/analyser.fftSize,limit=Math.min(audioSpectrum.length,Math.ceil(5000/binHz));const spec=Array.from(audioSpectrum.slice(0,limit),db=>10**(db/20));drawSpectrum(spec,i=>i*binHz,q,left,top,right);}
      }else{
        const ground=top-gap-48,cx=(left-gap)/2,span=Math.min(left*.38,260);
        ctx.beginPath();for(let i=0;i<=180;i++){const z=-2+i/45,xx=cx+z*span/2,yy=ground-Math.min(180,potential(z,q)*35);i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)}ctx.strokeStyle="#48d3cf";ctx.lineWidth=3;ctx.stroke();
        const bx=cx+x*span/2,by=ground-Math.min(180,potential(x,q)*35);ctx.beginPath();ctx.arc(bx,by-13,13,0,Math.PI*2);ctx.fillStyle="#f2dc43";ctx.fill();ctx.strokeStyle="#f36b4f";ctx.lineWidth=3;ctx.stroke();
        const rx=left+12,ry=30,rw=right-24,rh=top-gap-42;
        ctx.strokeStyle="rgba(255,255,255,.12)";ctx.beginPath();ctx.moveTo(rx,ry+rh/2);ctx.lineTo(rx+rw,ry+rh/2);ctx.stroke();
        ctx.beginPath();for(let i=0;i<=160;i++){const z=-2+i/40,xx=rx+i/160*rw,yy=ry+rh*.72-force(z,q)*10;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)}ctx.strokeStyle="#f36b4f";ctx.stroke();
        ctx.beginPath();for(let i=0;i<=160;i++){const z=-2+i/40,xx=rx+i/160*rw,yy=ry+rh*.72-Math.min(120,potential(z,q)*14);i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)}ctx.strokeStyle="#48d3cf";ctx.stroke();
        curve(visibleSamples,12,top+20,left-gap-24,h-top-30,"#f2dc43",32);curve(drives,12,top+20,left-gap-24,h-top-30,"rgba(72,211,207,.55)",24);
        drawMechanicalSpectrum(q,left,top,right);
      }
      raf=requestAnimationFrame(draw);
    };
    resize();restart();addEventListener("resize",resize);raf=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(raf);removeEventListener("resize",resize);};
  },[mode,audioOn]);

  const mechanicalControls:Array<[keyof P,string,number,number,number]> = [
    ["drive","Drive frequency",.05,5,.01],["amplitude","Drive amplitude",0,4,.01],["damping","Damping",0,1,.005],
    ["a2","a₂ · quadratic",-3,4,.01],["a3","a₃ · cubic",-2,2,.01],["a4","a₄ · quartic",-1,2,.01],["a5","a₅ · quintic",-1,1,.01],["a6","a₆ · sextic",0,1,.005],
  ];
  const audioControls:Array<[keyof P,string,number,number,number]> = [
    ["drive","Tone frequency · Hz",40,1200,1],["amplitude","Input level",.05,1,.01],["damping","High-frequency damping",0,1,.005],
    ["a2","a₂ · fundamental",-3,4,.01],["a3","a₃ · 2nd harmonic",-2,2,.01],["a4","a₄ · 3rd harmonic",-1,2,.01],["a5","a₅ · 4th harmonic",-1,1,.01],["a6","a₆ · 5th harmonic",-1,1,.005],
  ];
  const controls=mode==="audio"?audioControls:mechanicalControls;

  return <main className="osc-page">
    <header className="osc-header"><Link className="back" href="/gallery">Gallery</Link><div><span className="eyebrow">Interactive Exhibit 08</span><h1>Nonlinear Oscillator</h1></div><Link className="osc-read" href="/compendium/nonlinear-oscillations">Read the theory →</Link></header>
    <nav className="osc-mode-tabs" aria-label="Oscillator laboratory mode"><button className={mode==="mechanical"?"active":""} onClick={()=>changeMode("mechanical")}>Mechanical rate</button><button className={mode==="audio"?"active":""} onClick={()=>changeMode("audio")}>Audio rate</button></nav>
    <section className="osc-lab"><div className="osc-stage"><canvas ref={canvasRef} className="osc-canvas"/></div><aside className="osc-controls">
      <div className="osc-transport">{mode==="mechanical"?<><button onClick={()=>setPaused(value=>!value)}>{paused?"Resume":"Pause"}</button><button onClick={()=>resetRef.current++}>Restart</button></>:<button className={audioOn?"active":""} onClick={toggleAudio}>{audioOn?"Mute audio":"Start audio"}</button>}</div>
      <div className="osc-scale" aria-label="Spectrum amplitude scale"><span>FFT scale</span><button className={spectrumScale==="linear"?"active":""} onClick={()=>setSpectrumScale("linear")}>Linear</button><button className={spectrumScale==="db"?"active":""} onClick={()=>setSpectrumScale("db")}>dB</button></div>
      {controls.map(([key,label,min,max,step])=><label key={key}><span>{label}</span><output>{key==="drive"&&mode==="audio"?p[key].toFixed(0):p[key].toFixed(2)}</output><input aria-label={label} type="range" min={min} max={max} step={step} value={p[key]} onChange={event=>set(key,+event.target.value)}/></label>)}
      <p>{mode==="audio"?"Begin with a near-pure tone, then reshape the transfer curve. New harmonics become visible—and audible—as nonlinearity enters the signal path.":"Higher-order terms reshape the well. Watch a pure driving tone bloom into harmonics as the restoring force becomes nonlinear."}</p>
    </aside></section>
  </main>;
}
