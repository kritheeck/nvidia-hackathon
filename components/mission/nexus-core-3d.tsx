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
    } catch (e) {
      setHasWebGL(false);
      return;
    }

    const width = container.clientWidth || 400;
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    // Color definitions based on state
    const getStateColor = (currState: string): THREE.Color => {
      switch (currState) {
        case "TESTING":
        case "EXECUTING":
          return new THREE.Color(0x38bdf8); // Cyan
        case "FAILED":
          return new THREE.Color(0xf43f5e); // Crimson warning
        case "DIAGNOSING":
          return new THREE.Color(0xa855f7); // Deep Purple
        case "REPAIRING":
          return new THREE.Color(0xf59e0b); // Gold / Amber
        case "VERIFYING":
        case "READY_FOR_DELIVERY":
        case "COMPLETED":
          return new THREE.Color(0x76b900); // NVIDIA Emerald Green
        case "ANALYZING":
        case "PLANNING":
          return new THREE.Color(0x06b6d4); // Cyan Blue
        case "IDLE":
        default:
          return new THREE.Color(0x6366f1); // Indigo / Violet
      }
    };

    const coreColor = getStateColor(state);

    // 1. Central Icosahedron Core
    const coreGeometry = new THREE.IcosahedronGeometry(1.2, 1);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: coreColor,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
      roughness: 0.2,
      metalness: 0.8,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(coreMesh);

    // 2. Inner Glow Sphere
    const innerGeometry = new THREE.SphereGeometry(0.8, 24, 24);
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: coreColor,
      transparent: true,
      opacity: 0.25,
      wireframe: false,
    });
    const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
    scene.add(innerMesh);

    // 3. Dual Concentric Orbital Rings
    const ring1Geo = new THREE.TorusGeometry(1.8, 0.02, 16, 100);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: coreColor,
      transparent: true,
      opacity: 0.6,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 3;
    scene.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(2.2, 0.015, 16, 100);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: coreColor,
      transparent: true,
      opacity: 0.35,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.y = Math.PI / 4;
    scene.add(ring2);

    // 4. Surrounding Particle Swarm
    const particleCount = 200;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      const radius = 2.0 + Math.random() * 2.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      particlePositions[i] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i + 2] = radius * Math.cos(phi);
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: coreColor,
      size: 0.04,
      transparent: true,
      opacity: 0.7,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Lighting
    const pointLight = new THREE.PointLight(coreColor, 3, 20);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Animation & Resize Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();
    let mouseX = 0;
    let mouseY = 0;

    const onMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 1.5;
      mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 1.5;
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
      const elapsedTime = clock.getElapsedTime();

      // Adjust rotation speed based on active execution state
      const speedMultiplier = (state === "EXECUTING" || state === "TESTING" || state === "REPAIRING") ? 2.5 : 1.0;

      coreMesh.rotation.x += delta * 0.4 * speedMultiplier;
      coreMesh.rotation.y += delta * 0.6 * speedMultiplier;

      ring1.rotation.z += delta * 0.5 * speedMultiplier;
      ring2.rotation.x += delta * 0.3 * speedMultiplier;

      particles.rotation.y += delta * 0.15 * speedMultiplier;

      // Pulse effect
      const pulse = 1 + Math.sin(elapsedTime * 3) * 0.05;
      innerMesh.scale.set(pulse, pulse, pulse);

      // Subtle mouse tracking
      camera.position.x += (mouseX - camera.position.x) * 0.05;
      camera.position.y += (-mouseY - camera.position.y) * 0.05;
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
        className="w-full flex flex-col items-center justify-center bg-black/40 border border-white/10 rounded-xl p-4 text-center"
      >
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#76b900] animate-spin mb-3" />
        <span className="text-xs font-mono text-white/70">NEXUS Core Active</span>
        <span className="text-[10px] font-mono text-white/40">STATE: {state}</span>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      style={{ height }} 
      className="w-full relative flex items-center justify-center overflow-hidden" 
    />
  );
}
