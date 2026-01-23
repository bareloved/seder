"use client";

import * as React from "react";

interface SpotlightOverlayProps {
  targetRect: DOMRect | null;
  isVisible: boolean;
  padding?: number;
  borderRadius?: number;
}

export function SpotlightOverlay({
  targetRect,
  isVisible,
  padding = 8,
  borderRadius = 12,
}: SpotlightOverlayProps) {
  if (!isVisible) return null;

  // If no target, show full dark overlay (for modal steps)
  if (!targetRect) {
    return (
      <div
        className="fixed inset-0 bg-black/60 z-[60] transition-opacity duration-300"
        aria-hidden="true"
      />
    );
  }

  // Calculate spotlight hole dimensions with padding
  const hole = {
    x: targetRect.left - padding,
    y: targetRect.top - padding,
    width: targetRect.width + padding * 2,
    height: targetRect.height + padding * 2,
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[60] pointer-events-auto transition-opacity duration-300"
        aria-hidden="true"
        style={{
          background: "rgba(0, 0, 0, 0.6)",
          // Use CSS mask for the spotlight effect
          maskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Cdefs%3E%3Cmask id='hole'%3E%3Crect width='100%25' height='100%25' fill='white'/%3E%3Crect x='${hole.x}' y='${hole.y}' width='${hole.width}' height='${hole.height}' rx='${borderRadius}' fill='black'/%3E%3C/mask%3E%3C/defs%3E%3Crect width='100%25' height='100%25' mask='url(%23hole)'/%3E%3C/svg%3E")`,
          WebkitMaskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Cdefs%3E%3Cmask id='hole'%3E%3Crect width='100%25' height='100%25' fill='white'/%3E%3Crect x='${hole.x}' y='${hole.y}' width='${hole.width}' height='${hole.height}' rx='${borderRadius}' fill='black'/%3E%3C/mask%3E%3C/defs%3E%3Crect width='100%25' height='100%25' mask='url(%23hole)'/%3E%3C/svg%3E")`,
        }}
      />
      {/* Highlight ring around target */}
      <div
        className="fixed z-[61] pointer-events-none transition-all duration-300 ring-2 ring-emerald-400 ring-offset-2 ring-offset-transparent"
        style={{
          left: hole.x,
          top: hole.y,
          width: hole.width,
          height: hole.height,
          borderRadius: borderRadius,
          boxShadow: "0 0 0 4px rgba(52, 211, 153, 0.3)",
        }}
      />
    </>
  );
}
