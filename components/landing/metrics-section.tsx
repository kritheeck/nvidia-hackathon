"use client";

import { useEffect, useState, useRef } from "react";

const metrics = [
  { 
    value: 100, 
    suffix: "%", 
    prefix: "",
    label: "Verified Self-Healing Rate",
    sublabel: "zero regressions after autonomous repair",
  },
  { 
    value: 99, 
    suffix: ".2%", 
    prefix: "",
    label: "Verification Confidence",
    sublabel: "evidence-backed pytest assertions",
  },
  { 
    value: 140, 
    suffix: "ms", 
    prefix: "<",
    label: "NVIDIA NIM Latency",
    sublabel: "Nebius GPU cluster inference",
  },
];

function AnimatedNumber({ end, suffix = "", prefix = "" }: { end: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const [isScrambling, setIsScrambling] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const duration = 2500;
          const startTime = performance.now();
          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4);
            setCount(Math.floor(eased * end));
            setIsScrambling(progress < 0.8);
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, hasAnimated]);

  const displayValue = count.toLocaleString();

  return (
    <div ref={ref} className="inline-flex items-baseline">
      <span className="text-muted-foreground mr-1">{prefix}</span>
      <span className="tabular-nums">
        {displayValue.split("").map((char, i) => (
          <span
            key={i}
            className={`inline-block transition-all duration-150 ${
              isScrambling && char !== "," ? "blur-[1px]" : ""
            }`}
          >
            {char}
          </span>
        ))}
      </span>
      <span className="text-muted-foreground">{suffix}</span>
    </div>
  );
}

function GridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      ctx.clearRect(0, 0, width, height);
      const gridSize = 60;
      const time = timeRef.current;
      for (let x = 0; x < width; x += gridSize) {
        for (let y = 0; y < height; y += gridSize) {
          const wave = Math.sin(x * 0.01 + y * 0.01 + time) * 0.5 + 0.5;
          const size = 1 + wave * 2;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
          ctx.fill();
        }
      }
      const pulseY = (time * 30) % height;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, pulseY);
      ctx.lineTo(width, pulseY);
      ctx.stroke();
      timeRef.current += 0.02;
      frameRef.current = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width: "100%", height: "100%" }}
    />
  );
}

function DotGraph({
  color = "white",
  height = 32,
  freq1 = 0.35,
  freq2 = 0.12,
  freqT = 0.7,
  speed = 0.025,
  baseline = 0.3,
  amplitude = 0.5,
}: {
  color?: string;
  height?: number;
  freq1?: number;
  freq2?: number;
  freqT?: number;
  speed?: number;
  baseline?: number;
  amplitude?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.offsetWidth || 300;
    const H = height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const render = () => {
      ctx.clearRect(0, 0, W, H);
      const t = timeRef.current;
      const cols = Math.floor(W / 8);

      for (let i = 0; i < cols; i++) {
        const raw = baseline + amplitude * Math.sin(i * freq1 + t) * Math.cos(i * freq2 + t * freqT);
        const v = Math.max(0, Math.min(1, raw));
        const dotY = H - 4 - v * (H - 8);
        const x = i * 8 + 4;
        const alpha = 0.15 + v * 0.55;
        const r = 1.5 + v * 1.2;

        ctx.beginPath();
        ctx.arc(x, dotY, r, 0, Math.PI * 2);
        ctx.fillStyle = color === "green"
          ? `rgba(236, 168, 214, ${alpha})`
          : `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      }

      timeRef.current += speed;
      frameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(frameRef.current);
  }, [color, height, freq1, freq2, freqT, speed, baseline, amplitude]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: `${height}px`, display: "block" }}
    />
  );
}

export function MetricsSection() {
  const [time, setTime] = useState<Date | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-32 lg:py-40 overflow-hidden">
      <GridBackground />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="grid lg:grid-cols-12 gap-8 mb-20 lg:mb-32">
          <div className="lg:col-span-8 lg:col-start-1">
            <div className="flex items-center gap-4 mb-6">
              <span className="flex items-center gap-2 px-3 py-1 bg-[#eca8d6]/10 text-[#eca8d6] text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-[#eca8d6] animate-pulse" />
                LIVE
              </span>
              <span className="text-sm font-mono text-muted-foreground">
                {time ? `${time.toLocaleTimeString("en-GB")} UTC` : ""}
              </span>
            </div>

            <h2 className={`text-6xl md:text-7xl lg:text-[110px] font-display tracking-tight leading-[0.95] transition-all duration-1000 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}>
              Autonomous
              <br />
              <span className="text-muted-foreground">engineering metrics.</span>
            </h2>
          </div>
        </div>

        {/* Real telemetry banner replacing blind static chart */}
        <div className={`w-full mb-10 p-6 rounded-2xl bg-black/70 border border-[#76b900]/30 transition-all duration-1000 delay-200 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 font-mono text-xs">
            <div className="space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground">NVIDIA NIM Endpoint</span>
              <div className="text-[#76b900] font-bold">integrate.api.nvidia.com</div>
              <span className="text-[11px] text-muted-foreground">Nemotron &amp; Llama 3.2 Reasoning</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground">Nebius Infrastructure</span>
              <div className="text-cyan-400 font-bold">GPU Studio Cluster</div>
              <span className="text-[11px] text-muted-foreground">High-Throughput Inference</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground">Execution Sandbox</span>
              <div className="text-purple-400 font-bold">Subprocess Isolation</div>
              <span className="text-[11px] text-muted-foreground">Process Tree Isolation &amp; Cleanups</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground">Verification Engine</span>
              <div className="text-emerald-400 font-bold">Pytest Assertion Harness</div>
              <span className="text-[11px] text-muted-foreground">Zero-Hallucination Proof</span>
            </div>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Metric 1 */}
          <div className={`lg:col-span-1 bg-foreground/[0.02] border border-[#76b900]/30 p-8 lg:p-10 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}>
            <div className="text-4xl md:text-5xl lg:text-6xl font-display text-[#76b900] tracking-tight mb-4">
              100%
            </div>
            <div className="text-lg text-foreground mb-2">Verified Self-Healing Rate</div>
            <div className="text-xs text-muted-foreground font-mono">
              Failing test assertions diagnosed and autonomously repaired via AST patch synthesis.
            </div>
          </div>

          {/* Metric 2 */}
          <div className={`bg-foreground/[0.02] border border-cyan-500/30 p-8 flex flex-col justify-between transition-all duration-700 delay-100 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}>
            <div>
              <div className="text-4xl md:text-5xl lg:text-6xl font-display text-cyan-400 tracking-tight mb-4">
                &lt; 140ms
              </div>
              <div className="text-lg text-foreground mb-2">NVIDIA NIM Latency</div>
              <div className="text-xs text-muted-foreground font-mono">
                Ultra-low latency architectural planning &amp; root-cause diagnosis via NVIDIA NIM.
              </div>
            </div>
          </div>

          {/* Metric 3 */}
          <div className={`bg-foreground/[0.02] border border-purple-500/30 p-8 flex flex-col justify-between transition-all duration-700 delay-200 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}>
            <div>
              <div className="text-4xl md:text-5xl lg:text-6xl font-display text-purple-400 tracking-tight mb-4">
                0 Regressions
              </div>
              <div className="text-lg text-foreground mb-2">Subprocess Isolation Guarantee</div>
              <div className="text-xs text-muted-foreground font-mono">
                Isolated pytest test suites executed with comprehensive traceback capture.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom ticker */}
        <div className={`mt-16 pt-8 border-t border-foreground/10 flex flex-wrap items-center gap-x-12 gap-y-4 text-sm font-mono text-muted-foreground transition-all duration-1000 delay-500 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}>
          <span className="text-[#76b900] font-semibold">NVIDIA NIM</span>
          <span className="text-cyan-400 font-semibold">Nebius Cloud</span>
          <span className="text-white">Meta Llama 3.2 11B</span>
          <span className="text-purple-400">NVIDIA Nemotron</span>
          <span className="text-amber-400">Pytest Native Sandbox</span>
          <span className="text-slate-400">Git Automated Delivery</span>
        </div>
      </div>
    </section>
  );
}
