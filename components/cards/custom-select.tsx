"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

/**
 * Form-friendly dropdown that matches the cards-screen filter visual style:
 * - Trigger: full-width, input-height border, bg-background
 * - Panel: bg-card, border-border, rounded-lg, shadow-xl, p-1.5
 * - Items: active → bg-primary text-primary-foreground, hover → bg-muted text-foreground
 */
export function CustomSelect({
  name,
  value,
  onChange,
  options,
  placeholder = "Select…",
  className = "",
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const activeLabel = options.find((o) => o.value === value)?.label ?? placeholder;

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    function onScroll() { setOpen(false); }
    function onResize() { updatePosition(); }
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const dropdown = open ? (
    <div
      ref={ref}
      style={dropdownStyle}
      className="bg-card border border-border rounded-lg shadow-xl p-1.5 flex flex-col"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => {
              onChange(o.value);
              setOpen(false);
            }}
            className={`flex items-center justify-between px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-left whitespace-nowrap ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {o.label}
            {active && <CheckIcon className="h-3.5 w-3.5 ml-3 shrink-0" />}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 h-9 px-3 rounded-md border border-border bg-background text-sm font-medium text-foreground transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {activeLabel}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {typeof window !== "undefined" && dropdown && createPortal(dropdown, document.body)}
    </div>
  );
}
