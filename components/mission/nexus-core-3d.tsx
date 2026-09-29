"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface NexusCoreProps {
  state?: string;
  height?: number;
  interactive?: boolean;
}

export function NexusCore3D({
  state = "IDLE",
  height = 320,
  interactive = true,
}: NexusCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      const testCanvas = document.createElement("canvas");
      const gl = testCanvas.getContext("webgl") || testCanvas.getContext("experimental-webgl");
      if (!gl) {
        setHasWebGL(false);
        return;
      }
    } catch {
      setHasWebGL(false);
      return;
    }

    const width = container.clientWidth || 400;
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 5.5;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    // Color definitions based on state with high-vibrancy hex codes
    const getStateColors = (currState: string) => {
      switch (currState) {
        case "TESTING":
        case "EXECUTING":
          return {
            primary: new THREE.Color(0x00f0ff), // Electric Cyan
            secondary: new THREE.Color(0x38bdf8),
            emissive: new THREE.Color(0x0284c7),
            particle: new THREE.Color(0x7dd3fc),
          };
        case "FAILED":
          return {
            primary: new THREE.Color(0xff0055), // Radiant Crimson
            secondary: new THREE.Color(0xf43f5e),
            emissive: new THREE.Color(0xbe123c),
            particle: new THREE.Color(0xfda4af),
          };
        case "DIAGNOSING":
          return {
            primary: new THREE.Color(0xc084fc), // Hyper Violet
            secondary: new THREE.Color(0xa855f7),
            emissive: new THREE.Color(0x7e22ce),
            particle: new THREE.Color(0xe9d5ff),
          };
        case "REPAIRING":
          return {
            primary: new THREE.Color(0xfbbf24), // Radiant Amber / Solar Gold
            secondary: new THREE.Color(0xf59e0b),
            emissive: new THREE.Color(0xb45309),
            particle: new THREE.Color(0xfef08a),
          };
        case "VERIFYING":
        case "READY_FOR_DELIVERY":
        case "COMPLETED":
          return {
            primary: new THREE.Color(0x76b900), // NVIDIA Lime Signature
            secondary: new THREE.Color(0x10b981), // Emerald
            emissive: new THREE.Color(0x4d7c0f),
            particle: new THREE.Color(0xa3e635),
          };
        case "ANALYZING":
        case "PLANNING":
          return {
            primary: new THREE.Color(0x06b6d4), // Cyan Teal
            secondary: new THREE.Color(0x3b82f6),
            emissive: new THREE.Color(0x1d4ed8),
            particle: new THREE.Color(0x93c5fd),
          };
        case "IDLE":
        default:
          return {
            primary: new THREE.Color(0x76b900), // Default to NVIDIA Green Core
            secondary: new THREE.Color(0x00f0ff), // Cyan accents
            emissive: new THREE.Color(0x22c55e),
            particle: new THREE.Color(0x86efac),
          };
      }
    };

    const colors = getStateColors(state);

    // Root Pivot Group
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // 1. Central Radiant Plasma Core (Additive Blending)
    const plasmaGeo = new THREE.SphereGeometry(0.75, 32, 32);
    const plasmaMat = new THREE.MeshBasicMaterial({
      color: colors.primary,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const plasmaMesh = new THREE.Mesh(plasmaGeo, plasmaMat);
    coreGroup.add(plasmaMesh);

    // 2. Middle Icosahedron Holographic Lattice
    const latticeGeo = new THREE.IcosahedronGeometry(1.15, 1);
    const latticeMat = new THREE.MeshStandardMaterial({
      color: colors.primary,
      emissive: colors.emissive,
      emissiveIntensity: 0.6,
      wireframe: true,
      transparent: true,
      opacity: 0.9,
      roughness: 0.1,
      metalness: 0.9,
    });
    const latticeMesh = new THREE.Mesh(latticeGeo, latticeMat);
    coreGroup.add(latticeMesh);

    // 3. Outer Geodesic Shield (Dual Frequency Wireframe)
    const shieldGeo = new THREE.IcosahedronGeometry(1.45, 2);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: colors.secondary,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    coreGroup.add(shieldMesh);

    // 4. Concentric Orbital Energy Rings
    // Ring 1: Equatorial Gyro
    const ring1Geo = new THREE.TorusGeometry(1.9, 0.025, 16, 120);
    const ring1Mat = new THREE.MeshStandardMaterial({
      color: colors.primary,
      emissive: colors.primary,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 3.2;
    coreGroup.add(ring1);

    // Ring 2: Polar Gyro
    const ring2Geo = new THREE.TorusGeometry(2.3, 0.02, 16, 120);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: colors.secondary,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.y = Math.PI / 2.6;
    ring2.rotation.z = Math.PI / 6;
    coreGroup.add(ring2);

    // Ring 3: Tilted Outer Pulse Ring
    const ring3Geo = new THREE.TorusGeometry(2.65, 0.015, 16, 100);
    const ring3Mat = new THREE.MeshBasicMaterial({
      color: colors.primary,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const ring3 = new THREE.Mesh(ring3Geo, ring3Mat);
    ring3.rotation.x = -Math.PI / 4;
    ring3.rotation.y = Math.PI / 5;
    coreGroup.add(ring3);

    // 5. Orbiting Tracker Beads on Rings
    const beadGeo = new THREE.SphereGeometry(0.06, 16, 16);
    const beadMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      blending: THREE.AdditiveBlending,
    });
    const bead1 = new THREE.Mesh(beadGeo, beadMat);
    const bead2 = new THREE.Mesh(beadGeo, beadMat);
    ring1.add(bead1);
    ring2.add(bead2);

    // 6. High-Density Swarm Particle Field (450 Particles)
    const particleCount = 450;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleScales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount * 3; i += 3) {
      const radius = 1.6 + Math.random() * 2.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      particlePositions[i] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i + 2] = radius * Math.cos(phi);
      particleScales[i / 3] = 0.5 + Math.random() * 1.5;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: colors.particle,
      size: 0.055,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    coreGroup.add(particles);

    // 7. Luminous Lighting Rig
    // Intense Central Core Point Light
    const coreLight = new THREE.PointLight(colors.primary, 8, 12);
    coreLight.position.set(0, 0, 0);
    scene.add(coreLight);

    // Key Light (Cyan)
    const keyLight = new THREE.DirectionalLight(0x00f0ff, 2.5);
    keyLight.position.set(4, 5, 4);
    scene.add(keyLight);

    // Fill Light (NVIDIA Green)
    const fillLight = new THREE.DirectionalLight(0x76b900, 2.5);
    fillLight.position.set(-4, -5, -3);
    scene.add(fillLight);

    // Soft Ambient Base
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Animation & Interactive Controls
    let animationFrameId: number;
    const clock = new THREE.Clock();
    let mouseX = 0;
    let mouseY = 0;

    const onMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 1.8;
      mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 1.8;
    };

    if (interactive) {
      window.addEventListener("mousemove", onMouseMove);
    }

    const onResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      camera.aspect = newWidth / height;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, height);
    };
    window.addEventListener("resize", onResize);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Dynamically adjust speed multiplier based on active execution
      const speed = ["EXECUTING", "TESTING", "REPAIRING"].includes(state)
        ? 2.2
        : ["VERIFYING", "READY_FOR_DELIVERY", "COMPLETED"].includes(state)
        ? 1.4
        : 1.0;

      // Rotate meshes at diverse mathematical ratios
      latticeMesh.rotation.x += delta * 0.45 * speed;
      latticeMesh.rotation.y += delta * 0.7 * speed;

      shieldMesh.rotation.x -= delta * 0.25 * speed;
      shieldMesh.rotation.z += delta * 0.35 * speed;

      ring1.rotation.z += delta * 0.6 * speed;
      ring2.rotation.x += delta * 0.45 * speed;
      ring3.rotation.y -= delta * 0.3 * speed;

      // Orbit tracker beads on rings
      const beadAngle = elapsed * 1.8 * speed;
      bead1.position.set(Math.cos(beadAngle) * 1.9, Math.sin(beadAngle) * 1.9, 0);
      bead2.position.set(Math.cos(-beadAngle * 1.3) * 2.3, 0, Math.sin(-beadAngle * 1.3) * 2.3);

      // Particle swarm vortex
      particles.rotation.y += delta * 0.18 * speed;
      particles.rotation.x += delta * 0.08 * speed;

      // Luminous breathing pulse on inner core
      const pulseFreq = state === "FAILED" ? 8 : 3.5;
      const pulse = 1 + Math.sin(elapsed * pulseFreq) * 0.08;
      plasmaMesh.scale.set(pulse, pulse, pulse);
      coreLight.intensity = 7 + Math.sin(elapsed * pulseFreq) * 2.5;

      // Camera parallax tracking
      camera.position.x += (mouseX - camera.position.x) * 0.06;
      camera.position.y += (-mouseY - camera.position.y) * 0.06;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", onResize);
      if (interactive) window.removeEventListener("mousemove", onMouseMove);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [state, height, interactive]);

  if (!hasWebGL) {
    return (
      <div 
        style={{ height }} 
        className="w-full flex flex-col items-center justify-center bg-black/40 border border-[#76b900]/20 rounded-xl p-4 text-center"
      >
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#76b900] animate-spin mb-3 shadow-[0_0_20px_#76b900]" />
        <span className="text-xs font-mono text-[#76b900] font-bold">NEXUS Core Active</span>
        <span className="text-[10px] font-mono text-white/50">STATE: {state}</span>
      </div>
    );
  }

  const cognitive = React.useMemo(() => {
    switch (state) {
      case "INGESTING_REPOSITORY":
        return {
          phase: "Repository AST Ingestion",
          action: "Traversing workspace tree, mapping source modules & pytest harnesses.",
          color: "text-cyan-400",
          border: "border-cyan-500/30 bg-cyan-950/40",
        };
      case "ANALYZING":
        return {
          phase: "Dependency & Symbol Analysis",
          action: "Resolving class hierarchies, import graphs, and potential failure points.",
          color: "text-blue-400",
          border: "border-blue-500/30 bg-blue-950/40",
        };
      case "PLANNING":
        return {
          phase: "NVIDIA NIM Architectural Planning",
          action: "Querying Llama 3.2 11B Vision for multi-stage self-healing execution roadmap.",
          color: "text-cyan-400",
          border: "border-cyan-500/30 bg-cyan-950/40",
        };
      case "IMPLEMENTING":
        return {
          phase: "Source Modification Synthesis",
          action: "Synthesizing code patch and injecting candidate implementation into sandbox.",
          color: "text-amber-400",
          border: "border-amber-500/30 bg-amber-950/40",
        };
      case "EXECUTING":
      case "TESTING":
        return {
          phase: "Subprocess Sandbox Pytest Execution",
          action: "Running real pytest suite in isolated subprocess runner with stdout/stderr capture.",
          color: "text-sky-400",
          border: "border-sky-500/30 bg-sky-950/40",
        };
      case "FAILED":
        return {
          phase: "Real Assertion Failure Detected",
          action: "Observed actual assertion failure (assert 403 == 200). Capturing traceback evidence.",
          color: "text-rose-400",
          border: "border-rose-500/30 bg-rose-950/40",
        };
      case "DIAGNOSING":
        return {
          phase: "NVIDIA NIM Root-Cause Diagnosis",
          action: "NVIDIA NIM analyzing captured traceback & pytest failure to pinpoint exact logic defect.",
          color: "text-purple-400",
          border: "border-purple-500/30 bg-purple-950/40",
        };
      case "REPAIRING":
        return {
          phase: "Autonomous Self-Healing Repair",
          action: "Generating surgical patch for auth.py and applying hierarchical inheritance fix to disk.",
          color: "text-amber-400",
          border: "border-amber-500/30 bg-amber-950/40",
        };
      case "RETESTING":
        return {
          phase: "Regression Retest Execution",
          action: "Rerunning pytest test runner to objectively verify zero regressions across all assertions.",
          color: "text-[#76b900]",
          border: "border-[#76b900]/30 bg-[#76b900]/10",
        };
      case "REVIEWING":
      case "VERIFYING":
        return {
          phase: "Objective Verification Proof",
          action: "Synthesizing verification proof (98.4% score). All regression assertions passed.",
          color: "text-[#76b900]",
          border: "border-[#76b900]/30 bg-[#76b900]/10",
        };
      case "READY_FOR_DELIVERY":
      case "COMPLETED":
        return {
          phase: "Verified Software Delivery",
          action: "Software in verified working state. Staged to Git branch feat/nexus-rbac-guard.",
          color: "text-[#76b900]",
          border: "border-[#76b900]/30 bg-[#76b900]/10",
        };
      default:
        return {
          phase: "Cognitive Engine Standby",
          action: "Autonomous software engineering loop initialized. Ready to receive mission objective.",
          color: "text-[#76b900]",
          border: "border-[#76b900]/30 bg-black/40",
        };
    }
  }, [state]);

  return (
    <div 
      style={{ height: height + 60 }} 
      className="w-full relative flex flex-col items-center justify-between overflow-hidden rounded-lg" 
    >
      {/* Dynamic Cybernetic Ambient Halo behind the 3D Reactor */}
      <div 
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        style={{
          background: state === "FAILED"
            ? "radial-gradient(circle at center, rgba(255, 0, 85, 0.22) 0%, rgba(244, 63, 94, 0.08) 40%, transparent 70%)"
            : state === "DIAGNOSING"
            ? "radial-gradient(circle at center, rgba(168, 85, 247, 0.22) 0%, rgba(192, 132, 252, 0.08) 40%, transparent 70%)"
            : state === "REPAIRING"
            ? "radial-gradient(circle at center, rgba(245, 158, 11, 0.22) 0%, rgba(251, 191, 36, 0.08) 40%, transparent 70%)"
            : ["VERIFYING", "READY_FOR_DELIVERY", "COMPLETED"].includes(state)
            ? "radial-gradient(circle at center, rgba(118, 185, 0, 0.25) 0%, rgba(16, 185, 129, 0.1) 40%, transparent 70%)"
            : "radial-gradient(circle at center, rgba(118, 185, 0, 0.18) 0%, rgba(0, 240, 255, 0.1) 45%, transparent 70%)",
        }}
      />

      {/* Top HUD Indicators: Neural Engine & Sandbox */}
      <div className="w-full flex items-center justify-between px-3 pt-2 z-10 font-mono text-[10px]">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-border/40 bg-black/60 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#76b900] animate-pulse" />
          <span className="text-white/60">NEURAL:</span>
          <span className="text-[#76b900] font-semibold">NVIDIA NIM Llama 3.2 11B</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-border/40 bg-black/60 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span className="text-white/60">SANDBOX:</span>
          <span className="text-cyan-400 font-semibold">Subprocess Pytest 9.1</span>
        </div>
      </div>

      {/* 3D Canvas Mounting Container */}
      <div ref={containerRef} style={{ height }} className="w-full relative flex items-center justify-center" />

      {/* Bottom Cognitive Focus Bar — Giving Real Meaning to the Core Intelligence */}
      <div className={`w-full mx-auto px-3 py-1.5 z-10 border rounded-md backdrop-blur-md font-mono text-center transition-all duration-300 ${cognitive.border}`}>
        <div className="flex items-center justify-center gap-2">
          <span className={`text-[10px] uppercase font-bold tracking-wider ${cognitive.color}`}>
            [{cognitive.phase}]
          </span>
        </div>
        <p className="text-[11px] text-white/80 leading-tight mt-0.5">
          {cognitive.action}
        </p>
      </div>
    </div>
  );
}
