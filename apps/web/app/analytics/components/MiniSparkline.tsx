"use client";

import { useId } from "react";

interface MiniSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function MiniSparkline({
  data,
  width = 80,
  height = 24,
  color = "#22c55e",
}: MiniSparklineProps) {
  const gradientId = useId();

  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const padding = 2;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const points = data.map((value, i) => {
    const x = padding + (i / (data.length - 1)) * innerWidth;
    const y = padding + innerHeight - ((value - min) / range) * innerHeight;
    return `${x},${y}`;
  });

  const polyline = points.join(" ");

  // Create area fill path
  const firstX = padding;
  const lastX = padding + innerWidth;
  const areaPath = `M ${firstX},${height} L ${points.join(" L ")} L ${lastX},${height} Z`;

  return (
    <svg width={width} height={height} className="shrink-0">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
