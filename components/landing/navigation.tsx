"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Play, Terminal, Layers, History, Settings, Sparkles } from "lucide-react";

interface NavProps {
  activeView?: string;
  onSelectView?: (view: string) => void;
  systemState?: string;
}

const navItems = [
  { id: "overview", name: "Overview" },
  { id: "mission_control", name: "Mission Control" },
  { id: "repositories", name: "Repositories" },
  { id: "runs", name: "Run History" },
  { id: "settings", name: "Infrastructure" },
];

export function Navigation({
  activeView = "overview",
  onSelectView,
  systemState = "IDLE"
}: NavProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNav = (id: string) => {
    if (onSelectView) {
      onSelectView(id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <header
      className={`fixed z-50 transition-all duration-500 ${
        isScrolled 
          ? "top-4 left-4 right-4" 
          : "top-0 left-0 right-0"
      }`}
    >
      <nav 
        className={`mx-auto transition-all duration-500 ${
          isScrolled || isMobileMenuOpen
            ? "bg-background/85 backdrop-blur-xl border border-foreground/15 rounded-2xl shadow-2xl max-w-[1300px]"
            : "bg-transparent max-w-[1400px]"
        }`}
      >
        <div 
          className={`flex items-center justify-between transition-all duration-500 px-6 lg:px-8 ${
            isScrolled ? "h-14" : "h-20"
          }`}
        >
          {/* Brand Logo */}
          <button 
            onClick={() => handleNav("overview")}
            className="flex items-center gap-2.5 group text-left"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#76b900] to-[#457000] flex items-center justify-center shadow-lg shadow-[#76b900]/25">
              <Sparkles className="w-4 h-4 text-black" />
            </div>
            <div className="flex flex-col">
              <span className={`font-display font-bold tracking-tight transition-all duration-500 ${isScrolled ? "text-xl text-foreground" : "text-2xl text-white"}`}>
                NEXUS
              </span>
              <span className="font-mono text-[9px] -mt-1 text-muted-foreground uppercase tracking-widest">
                Self-Healing OS
              </span>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`text-xs font-mono uppercase tracking-wider transition-colors duration-300 relative group py-1 ${
                    isActive
                      ? "text-foreground font-bold"
                      : isScrolled
                      ? "text-foreground/70 hover:text-foreground"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  {item.name}
                  <span 
                    className={`absolute -bottom-1 left-0 h-0.5 bg-[#76b900] transition-all duration-300 ${
                      isActive ? "w-full" : "w-0 group-hover:w-full"
                    }`} 
                  />
                </button>
              );
            })}
          </div>

          {/* Live Status Badge & Primary Launch CTA */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/40 border border-border/80 font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#76b900] animate-pulse" />
              <span className="text-muted-foreground">STATE:</span>
              <span className="text-foreground font-bold">{systemState}</span>
            </div>

            <Button
              size="sm"
              onClick={() => handleNav("mission_control")}
              className={`rounded-full font-mono text-xs uppercase tracking-wider transition-all duration-500 ${
                activeView === "mission_control"
                  ? "bg-[#76b900] text-black font-bold px-5 h-8 shadow-lg shadow-[#76b900]/25"
                  : "bg-white hover:bg-white/90 text-black px-5 h-8"
              }`}
            >
              <Play className="w-3 h-3 mr-1.5 fill-black" />
              Mission Control
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`md:hidden p-2 transition-colors duration-500 ${isScrolled || isMobileMenuOpen ? "text-foreground" : "text-white"}`}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </nav>
      
      {/* Mobile Menu Full Screen Overlay */}
      <div
        className={`md:hidden fixed inset-0 bg-background z-40 transition-all duration-500 ${
          isMobileMenuOpen 
            ? "opacity-100 pointer-events-auto" 
            : "opacity-0 pointer-events-none"
        }`}
        style={{ top: 0 }}
      >
        <div className="flex flex-col h-full px-8 pt-28 pb-8 font-mono">
          <div className="flex-1 flex flex-col justify-center gap-6">
            {navItems.map((item, i) => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`text-left text-3xl font-display text-foreground hover:text-[#76b900] transition-all duration-500 ${
                  activeView === item.id ? "text-[#76b900] font-bold" : ""
                }`}
                style={{ transitionDelay: isMobileMenuOpen ? `${i * 60}ms` : "0ms" }}
              >
                {item.name}
              </button>
            ))}
          </div>
          
          <div className="pt-6 border-t border-border">
            <Button 
              className="w-full bg-[#76b900] text-black font-bold rounded-xl h-12 text-sm uppercase font-mono"
              onClick={() => handleNav("mission_control")}
            >
              Launch Mission Control
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
