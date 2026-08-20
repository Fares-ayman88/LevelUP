"use client";

import { useEffect, useMemo, useState } from "react";
import { GlassCard, StatusBadge, Button } from "@/components/ui";
import { Sun, Moon, Sparkles, LayoutGrid, MonitorSmartphone } from "lucide-react";

export default function PreviewPage() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const saved = window.localStorage.getItem("levelup-theme") as "light" | "dark" | null;
    return saved === "dark" ? "dark" : "light";
  });
  const [sheen, setSheen] = useState(18);
  const [glassOpacity, setGlassOpacity] = useState(72);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("levelup-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty("--sheen-opacity", String(sheen / 100));
    document.documentElement.style.setProperty("--glass-opacity", String(glassOpacity / 100));
  }, [sheen, glassOpacity]);

  const sections = useMemo(() => [
    { label: "Dashboard", icon: LayoutGrid },
    { label: "Mobile", icon: MonitorSmartphone },
    { label: "Hero", icon: Sparkles },
  ], []);

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 rounded-[32px] glass-cta p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.32em] text-sky-600">Liquid Glass Preview</p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">System-wide visual direction</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">A premium, frosted-glass UI system with light and dark themes, subtle highlights, and layered depth.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="rounded-full glass-muted px-3 py-2 text-sm font-semibold">
              Sheen {sheen}%
              <input type="range" min="6" max="40" value={sheen} onChange={(e) => setSheen(Number(e.target.value))} className="ml-3 accent-sky-500" />
            </label>
            <label className="rounded-full glass-muted px-3 py-2 text-sm font-semibold">
              Glass {glassOpacity}%
              <input type="range" min="40" max="96" value={glassOpacity} onChange={(e) => setGlassOpacity(Number(e.target.value))} className="ml-3 accent-sky-500" />
            </label>
            <button onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} className="inline-flex items-center gap-2 rounded-full glass-cta px-3 py-2 text-sm font-semibold">
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />} {theme === "dark" ? "Light" : "Dark"}
            </button>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-600">Overview</p>
                <h2 className="mt-2 text-2xl font-black">Premium tutoring operations</h2>
              </div>
              <StatusBadge status="Live preview" />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {sections.map(({ label, icon: Icon }) => (
                <div key={label} className="rounded-[20px] glass-muted p-4">
                  <Icon size={18} className="text-sky-600" />
                  <p className="mt-3 text-sm font-black">{label}</p>
                  <p className="text-xs text-slate-500">Layered depth and soft sheen</p>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-600">Primary CTA</p>
            <h2 className="mt-2 text-2xl font-black">Book a session in one tap</h2>
            <div className="mt-5 rounded-[24px] glass-contrast p-4 text-white">
              <p className="text-sm font-semibold text-slate-300">Physics · Group A</p>
              <p className="mt-2 text-2xl font-black">Today · 5:00 PM</p>
            </div>
            <div className="mt-4 flex gap-3">
              <Button className="flex-1">Confirm</Button>
              <Button variant="secondary" className="flex-1">Preview</Button>
            </div>
          </GlassCard>
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-3">
          <GlassCard className="p-6">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-600">Timeline</p>
            <div className="mt-4 rounded-[20px] glass-muted p-4 text-sm font-semibold text-slate-600">09:00 Welcome · 10:00 Lessons · 11:30 Review</div>
          </GlassCard>
          <GlassCard className="p-6">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-600">Attendance</p>
            <div className="mt-4 rounded-[20px] glass-muted p-4 text-sm font-semibold text-slate-600">QR scan ready · 24 students checked in</div>
          </GlassCard>
          <GlassCard className="p-6">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-600">Payments</p>
            <div className="mt-4 rounded-[20px] glass-muted p-4 text-sm font-semibold text-slate-600">October dues · 2 pending approvals</div>
          </GlassCard>
        </section>
      </div>
    </main>
  );
}
