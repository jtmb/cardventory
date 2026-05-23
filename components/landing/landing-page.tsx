"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { LandingNav } from "@/components/landing-nav";
import { AppLogo } from "@/components/app-logo";
import {
  ZapIcon,
  TrendingUpIcon,
  BarChart3Icon,
  LayersIcon,
  CheckIcon,
  ArrowRightIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  StarIcon,
  SparklesIcon,
} from "lucide-react";

interface LandingPageProps {
  isLoggedIn: boolean;
}

const FEATURES = [
  {
    icon: ZapIcon,
    title: "Live multi-source pricing",
    description:
      "Pull prices automatically from eBay, SportsCardInvestor, CardLadder, and SportsCardsPro. Always know the highest market value for every card.",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
  },
  {
    icon: TrendingUpIcon,
    title: "Portfolio gain & loss",
    description:
      "See exactly how much your collection has grown. Track purchase price against current market value across your entire portfolio.",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
  },
  {
    icon: BarChart3Icon,
    title: "Price history charts",
    description:
      "Visualize how card values trend over time. Make smarter buy and sell decisions backed by real historical price data.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
];

const FREE_FEATURES = [
  "Up to 50 cards",
  "Live price tracking",
  "Portfolio analytics",
  "Price history charts",
  "CSV import & export",
  "Watchlist",
];

const PRO_FEATURES = [
  "Unlimited cards",
  "Everything in Free",
  "Priority price refresh",
  "Advanced analytics",
  "Multi-collection support",
  "Early access to new features",
];

export function LandingPage({ isLoggedIn }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ─── Navbar ─────────────────────────────────────────── */}
      <LandingNav isLoggedIn={isLoggedIn} />

      {/* ─── Hero ───────────────────────────────────────────── */}
      <section className="relative pt-36 pb-28 px-6">
        {/* Ambient glow blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-primary/6 rounded-full blur-[120px]" />
          <div className="absolute top-32 right-1/4 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative">
          {/* Eyebrow */}
          <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-4">
            Trading card portfolio tracker
          </p>

          <h1 className="text-5xl md:text-[72px] font-bold tracking-tight leading-[1.05] mb-6">
            Track every card.
            <br />
            <span className="text-primary">Know its worth.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Cardventory connects your collection to live market data — so you always know
            what your cards are worth and how your portfolio is performing.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base transition-colors shadow-lg shadow-primary/20"
            >
              Get Started Free <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 h-12 px-7 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 font-medium text-base transition-colors"
            >
              Sign In
            </Link>
          </div>

          <p className="text-xs text-muted-foreground/50 mb-16 tracking-wide">
            Free forever · No credit card required
          </p>

          {/* Mock stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
            {[
              {
                label: "Portfolio Value",
                value: "$12,847",
                sub: "+$2,340 this month",
                color: "text-sky-400",
                subColor: "text-sky-400/60",
              },
              {
                label: "Cards Tracked",
                value: "47",
                sub: "across 6 sports",
                color: "text-primary",
                subColor: "text-primary/60",
              },
              {
                label: "Best Card",
                value: "$671",
                sub: "Charizard Base Set",
                color: "text-amber-400",
                subColor: "text-amber-400/60",
              },
              {
                label: "Total Gain",
                value: "+105%",
                sub: "since purchase",
                color: "text-violet-400",
                subColor: "text-violet-400/60",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-card/50 backdrop-blur-sm border border-border/60 rounded-2xl p-4 text-left"
              >
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                  {stat.label}
                </p>
                <p className={cn("text-xl font-bold", stat.color)}>{stat.value}</p>
                <p className={cn("text-[10px] mt-0.5 truncate", stat.subColor)}>{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Stats strip ────────────────────────────────────── */}
      <div className="border-y border-border/40 py-0 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border/30">
            {[
              { icon: ZapIcon,          value: "4",           label: "Live price sources" },
              { icon: RefreshCwIcon,    value: "On demand",   label: "Price refresh" },
              { icon: BarChart3Icon,    value: "Full history", label: "Per-card charts" },
              { icon: ShieldCheckIcon,  value: "Free",        label: "No credit card needed" },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-center gap-3 px-6 py-5">
                <Icon className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-semibold">{value}</p>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Features ───────────────────────────────────────── */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">
              Features
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Everything you need to manage
              <br className="hidden md:block" /> your collection
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Sports cards, Pokémon, Magic, Yu-Gi-Oh! — every card you collect, tracked in one place.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, description, color, bg, border }) => (
              <div
                key={title}
                className={cn(
                  "bg-card border rounded-2xl p-6 hover:border-opacity-60 transition-colors",
                  border
                )}
              >
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mb-5", bg)}>
                  <Icon className={cn("h-5 w-5", color)} />
                </div>
                <h3 className="font-semibold text-lg mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Feature deep-dive ──────────────────────────────── */}
      <section className="py-28 px-6 border-t border-border/40">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          {/* Copy */}
          <div>
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">
              Card detail
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-5">
              Know what every card is worth, right now
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Each card is automatically matched against live listings across multiple marketplaces.
              See the highest current price, full history, and exactly how it compares to what you paid.
            </p>
            <ul className="space-y-3">
              {[
                "Prices refreshed on demand from real listings",
                "Side-by-side comparison across all sources",
                "Gain / loss calculated automatically",
                "Full price history chart per card",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckIcon className="h-3 w-3 text-primary" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Mock card UI */}
          <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
            {/* Window chrome */}
            <div className="border-b border-border/60 px-4 py-3 flex items-center gap-2 bg-card/80">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/50" />
              <div className="h-2.5 w-2.5 rounded-full bg-primary/50" />
              <span className="text-xs text-muted-foreground ml-2 truncate">
                Charizard Holo — 1999 Base Set 1st Ed.
              </span>
            </div>

            <div className="p-5 space-y-4">
              {/* Price summary */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Market Value", value: "$671", color: "text-primary" },
                  { label: "Paid", value: "$300", color: "text-muted-foreground" },
                  { label: "Gain", value: "+123%", color: "text-primary" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-background/60 rounded-xl p-3">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1.5">
                      {label}
                    </p>
                    <p className={cn("text-lg font-bold", color)}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Source rows */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-widest">
                    Pricing by Source
                  </p>
                  <RefreshCwIcon className="h-3 w-3 text-muted-foreground/40" />
                </div>
                {[
                  { src: "eBay", price: "$671", highest: true },
                  { src: "SportsCardInvestor", price: "$589", highest: false },
                  { src: "CardLadder", price: "$541", highest: false },
                  { src: "SportsCardsPro", price: "$510", highest: false },
                ].map(({ src, price, highest }) => (
                  <div
                    key={src}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg border text-xs",
                      highest
                        ? "border-primary/30 bg-primary/8"
                        : "border-border/40 bg-background/30"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{src}</span>
                      {highest && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">
                          Highest
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "font-semibold",
                        highest ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {price}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ────────────────────────────────────────── */}
      <section className="relative py-28 px-6 border-t border-border/40 overflow-hidden">
        {/* Coming Soon overlay */}
        <div className="absolute inset-0 bg-background/75 backdrop-blur-[3px] flex flex-col items-center justify-center z-10 gap-4">
          <div className="relative inline-flex">
            <StarIcon className="sparkle-star absolute -top-3 -right-2 h-3.5 w-3.5 text-yellow-400 fill-yellow-400 pointer-events-none" />
            <StarIcon className="sparkle-star absolute -bottom-2.5 right-2 h-3 w-3 text-yellow-400 fill-yellow-400 pointer-events-none" />
            <StarIcon className="sparkle-star absolute top-0 -left-2.5 h-2.5 w-2.5 text-yellow-300 fill-yellow-300 pointer-events-none" />
            <StarIcon className="sparkle-star absolute -top-1 right-7 h-2 w-2 text-yellow-400 fill-yellow-400 pointer-events-none" />
            <span className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-yellow-400/40 bg-card ring-1 ring-yellow-400/30 text-sm font-semibold tour-btn-shimmer">
              <SparklesIcon className="h-4 w-4 text-yellow-400" />
              Pricing Coming Soon
            </span>
          </div>
          <p className="text-sm text-muted-foreground">We&apos;re working on plans — for now, everything is free.</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">
              Pricing
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Find a plan that&apos;s right for you
            </h2>
            <p className="text-muted-foreground text-lg">Start free, upgrade when you&apos;re ready.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Free */}
            <div className="bg-card border border-border/60 rounded-2xl p-8 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                  Free
                </p>
              </div>
              <div className="mb-3">
                <span className="text-5xl font-bold">$0</span>
                <span className="text-muted-foreground ml-2 text-sm">/ month</span>
              </div>
              <p className="text-sm text-muted-foreground mb-8">
                Everything you need to start tracking your collection.
              </p>
              <ul className="space-y-3 mb-8 flex-1">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <CheckIcon className="h-4 w-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="block text-center h-11 leading-[44px] rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-colors"
              >
                Get Started Free
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-card border border-primary/20 rounded-2xl p-8 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                  Pro
                </p>
              </div>
              <div className="mb-3">
                <span className="text-5xl font-bold">$9</span>
                <span className="text-muted-foreground ml-2 text-sm">/ month</span>
              </div>
              <p className="text-sm text-muted-foreground mb-8">
                For serious collectors who want unlimited power.
              </p>
              <ul className="space-y-3 mb-8 flex-1">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <CheckIcon className="h-4 w-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                disabled
                className="w-full h-11 rounded-xl bg-primary/10 text-primary/50 font-semibold cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ─────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-border/40">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl bg-primary/8 border border-primary/20 px-8 py-20 text-center overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-3xl" />
            </div>
            <div className="relative">
              <LayersIcon className="h-10 w-10 text-primary mx-auto mb-6" />
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                Start tracking your collection today
              </h2>
              <p className="text-muted-foreground text-lg max-w-md mx-auto mb-10">
                Free forever. No credit card required. Set up in minutes.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base transition-colors shadow-lg shadow-primary/25"
              >
                Get Started Free <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-border/40 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <AppLogo size="sm" className="opacity-60" />
            <span className="text-sm font-semibold text-muted-foreground">Cardventory</span>
          </Link>
          <p className="text-xs text-muted-foreground/60">Track your collection. Know its worth.</p>
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign Up
            </Link>
            <span className="text-xs text-muted-foreground/30">Privacy</span>
            <span className="text-xs text-muted-foreground/30">Terms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
