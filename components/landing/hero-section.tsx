"use client";

import { useEffect, useState, useRef } from "react";
import { Play, Layers, Sparkles, Cpu, Zap, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

const words = ["understand", "diagnose", "repair", "verify"];

function BlurWord({ word, trigger }: { word: string; trigger: number }) {
  const letters = word.split("");
  const STAGGER = 45;      // ms between each letter
  const DURATION = 500;    // blur+opacity fade duration per letter
  const GRADIENT_HOLD = STAGGER * letters.length + DURATION + 200;

  const [letterStates, setLetterStates] = useState<{ opacity: number; blur: number }[]>(
    letters.map(() => ({ opacity: 0, blur: 20 }))
  );
  const [showGradient, setShowGradient] = useState(true);
  const framesRef = useRef<number[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // reset
    framesRef.current.forEach(cancelAnimationFrame);
    timersRef.current.forEach(clearTimeout);
    framesRef.current = [];
    timersRef.current = [];

    setLetterStates(letters.map(() => ({ opacity: 0, blur: 20 })));
    setShowGradient(true);

    // stagger each letter
    letters.forEach((_, i) => {
      const t = setTimeout(() => {
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / DURATION, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setLetterStates(prev => {
            const next = [...prev];
            next[i] = { opacity: eased, blur: 20 * (1 - eased) };
            return next;
          });
          if (progress < 1) {
            const id = requestAnimationFrame(tick);
            framesRef.current.push(id);
          }
        };
        const id = requestAnimationFrame(tick);
        framesRef.current.push(id);
      }, i * STAGGER);
      timersRef.current.push(t);
    });

    const gt = setTimeout(() => setShowGradient(false), GRADIENT_HOLD);
    timersRef.current.push(gt);

    return () => {
      framesRef.current.forEach(cancelAnimationFrame);
      timersRef.current.forEach(clearTimeout);
    };
  }, [trigger]);

  const gradientColors = ["#76b900", "#00d8f6", "#a855f7", "#fbbf24", "#76b900"];

  return (
    <>
      {letters.map((char, i) => {
        const colorIndex = (i / Math.max(letters.length - 1, 1)) * (gradientColors.length - 1);
        const lower = Math.floor(colorIndex);
        const upper = Math.min(lower + 1, gradientColors.length - 1);
        const t = colorIndex - lower;

        const hex2rgb = (hex: string) => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return [r, g, b];
        };
        const [r1, g1, b1] = hex2rgb(gradientColors[lower]);
        const [r2, g2, b2] = hex2rgb(gradientColors[upper]);
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: letterStates[i]?.opacity ?? 0,
              filter: `blur(${letterStates[i]?.blur ?? 20}px)`,
              color: showGradient ? `rgb(${r},${g},${b})` : "white",
              transition: "color 0.4s ease",
            }}
          >
            {char}
          </span>
        );
      })}
    </>
  );
}

interface HeroProps {
  onStartMission?: () => void;
  onOpenRepositories?: () => void;
  telemetry?: any;
}

export function HeroSection({
  onStartMission,
  onOpenRepositories,
  telemetry
}: HeroProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col justify-center items-start overflow-hidden bg-black">
      {/* Background video */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          className="w-full h-full object-cover object-center opacity-70"
        >
          <source src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/bg-hero-0BnFGdr81Ifnj3WbBZoNt1KE4D5DMT.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 z-[2] overflow-hidden pointer-events-none opacity-20">
        {[...Array(8)].map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute h-px bg-white/10"
            style={{
              top: `${12.5 * (i + 1)}%`,
              left: 0,
              right: 0,
            }}
          />
        ))}
        {[...Array(12)].map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute w-px bg-white/10"
            style={{
              left: `${8.33 * (i + 1)}%`,
              top: 0,
              bottom: 0,
            }}
          />
        ))}
      </div>
      
      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 lg:px-12 py-32 lg:py-40">
        <div className="lg:max-w-[62%]">
          {/* Eyebrow */}
          <div 
            className={`mb-6 transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <span className="inline-flex items-center gap-3 text-xs md:text-sm font-mono text-[#76b900]">
              <span className="w-8 h-px bg-[#76b900]/50" />
              NEXUS • AUTONOMOUS SOFTWARE ENGINEERING INTELLIGENCE PLATFORM
            </span>
          </div>
          
          {/* Main Headline */}
          <div className="mb-6">
            <h1 
              className={`text-left text-[clamp(2.2rem,5.5vw,6.5rem)] font-display leading-[0.95] tracking-tight text-white transition-all duration-1000 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <span className="block">Give software an outcome,</span>
              <span className="block">
                NEXUS will{" "}
                <span className="relative inline-block">
                  <BlurWord word={words[wordIndex]} trigger={wordIndex} />
                </span>
              </span>
            </h1>
          </div>

          {/* Value Prop Subtext */}
          <p 
            className={`text-sm md:text-base text-white/70 max-w-xl leading-relaxed mb-8 transition-all duration-1000 delay-200 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            Software agents shouldn't stop at generating code. NEXUS operates inside real codebases, executes software in controlled environments, observes failures, diagnoses root causes, and autonomously repairs implementation until the requested outcome is verified.
          </p>

          {/* Action CTAs */}
          <div 
            className={`flex flex-wrap items-center gap-4 transition-all duration-1000 delay-300 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <Button
              onClick={onStartMission}
              size="lg"
              className="rounded-full bg-gradient-to-r from-[#76b900] to-[#5a8d00] hover:from-[#85cf00] hover:to-[#68a300] text-black font-bold font-mono text-xs uppercase tracking-wider h-12 px-8 shadow-xl shadow-[#76b900]/25 transition hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="w-4 h-4 mr-2 fill-black" />
              Start New Mission
            </Button>

            <Button
              onClick={onOpenRepositories}
              variant="outline"
              size="lg"
              className="rounded-full border-white/20 hover:bg-white/10 text-white font-mono text-xs uppercase tracking-wider h-12 px-6"
            >
              <Layers className="w-4 h-4 mr-2 text-cyan-400" />
              Connect Repository
            </Button>
          </div>
        </div>
      </div>
      
      {/* Real Infrastructure Proof Metrics Footer */}
      <div 
        className={`absolute bottom-10 left-0 right-0 px-6 lg:px-12 transition-all duration-700 delay-500 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-start gap-8 lg:gap-20 border-t border-white/10 pt-6">
          <div className="flex flex-col gap-1 font-mono">
            <span className="text-2xl lg:text-3xl font-display text-white">100%</span>
            <span className="text-xs text-[#76b900] leading-tight">
              Verified Self-Healing Loop
            </span>
          </div>

          <div className="flex flex-col gap-1 font-mono">
            <span className="text-2xl lg:text-3xl font-display text-white">NVIDIA NIM</span>
            <span className="text-xs text-cyan-400 leading-tight">
              Nemotron & Llama 3.2 Reasoning
            </span>
          </div>

          <div className="flex flex-col gap-1 font-mono">
            <span className="text-2xl lg:text-3xl font-display text-white">Nebius GPU</span>
            <span className="text-xs text-purple-400 leading-tight">
              Cloud Infrastructure
            </span>
          </div>

          <div className="flex flex-col gap-1 font-mono">
            <span className="text-2xl lg:text-3xl font-display text-white">Pytest Sandbox</span>
            <span className="text-xs text-amber-400 leading-tight">
              Subprocess Process-Isolated Runner
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
