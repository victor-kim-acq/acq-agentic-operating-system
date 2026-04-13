'use client';

import React from 'react';

/**
 * Custom Recharts bar shape with gradient fill + solid top accent line.
 * Use as: <Bar shape={<GradientBar />} ... />
 */
export default function GradientBar(
  props: React.SVGProps<SVGRectElement> & {
    fill?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    dataKey?: string;
    index?: number;
  }
) {
  const { fill, x, y, width, height, dataKey, index } = props;
  if (!x || !y || !width || !height || height <= 0) return null;

  const gradientId = `gradient-${dataKey}-${index}`;

  return (
    <>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity={0.6} />
          <stop offset="100%" stopColor={fill} stopOpacity={0.05} />
        </linearGradient>
      </defs>
      {/* Gradient body */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={`url(#${gradientId})`}
        rx={0}
      />
      {/* Solid accent line at top */}
      <rect
        x={x}
        y={y}
        width={width}
        height={2.5}
        fill={fill}
        rx={1}
      />
    </>
  );
}
