import React, { useState } from 'react';
import { formatEUR, formatPercent } from '../../utils/formatters';

interface LineChartPoint {
  label: string;
  value: number;
}

export function PortfolioLineChart({ data, height = 200, unit = '€' }: { data: LineChartPoint[]; height?: number; unit?: string }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const values = data.map(d => d.value);
  const minVal = Math.min(...values) * 0.92;
  const maxVal = Math.max(...values) * 1.05;
  const range = maxVal - minVal || 1;

  const width = 600;
  const paddingX = 40;
  const paddingY = 24;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * chartW;
    const y = height - paddingY - ((d.value - minVal) / range) * chartH;
    return { x, y, label: d.label, value: d.value };
  });

  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    // smooth curve using bezier
    const prev = points[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  // Grid ticks
  const yTicks = [
    { label: '300.000 €', val: 300000 },
    { label: '250.000 €', val: 250000 },
    { label: '200.000 €', val: 200000 },
    { label: '150.000 €', val: 150000 },
    { label: '100.000 €', val: 100000 },
  ];

  return (
    <div className="relative w-full overflow-hidden select-none">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10b981" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Horizontal grid lines */}
        {yTicks.map((tick, i) => {
          const y = height - paddingY - ((tick.val - minVal) / range) * chartH;
          if (y < paddingY - 10 || y > height - paddingY + 10) return null;
          return (
            <g key={i}>
              <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#1e293b" strokeDasharray="3 3" />
              <text x={paddingX - 6} y={y + 3} textAnchor="end" fill="#64748b" fontSize="9" fontFamily="sans-serif">
                {tick.label}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill="url(#areaGradient)" />

        {/* Line */}
        <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" filter="url(#glow)" />

        {/* Points */}
        {points.map((p, i) => (
          <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIdx === i ? 6 : 4}
              fill="#0f172a"
              stroke="#10b981"
              strokeWidth={hoveredIdx === i ? 3 : 2}
              className="transition-all duration-150"
            />
            {/* X-axis labels */}
            <text x={p.x} y={height - 6} textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="500">
              {p.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Floating tooltip */}
      {hoveredIdx !== null && (
        <div
          className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full bg-slate-800 text-white border border-slate-700 px-3 py-1.5 rounded-lg shadow-xl text-xs z-10"
          style={{
            left: `${(points[hoveredIdx].x / width) * 100}%`,
            top: `${(points[hoveredIdx].y / height) * 100 - 8}%`
          }}
        >
          <div className="font-semibold text-slate-300">{points[hoveredIdx].label}</div>
          <div className="text-emerald-400 font-bold text-sm">{formatEUR(points[hoveredIdx].value)}</div>
        </div>
      )}
    </div>
  );
}

interface SectorItem {
  name: string;
  percentage: number;
  color: string;
  valueEUR?: number;
}

export function DonutChart({
  sectors,
  centerTitle = "Total",
  centerValue = "248.533 €",
  size = 180
}: {
  sectors: SectorItem[];
  centerTitle?: string;
  centerValue?: string;
  size?: number;
}) {
  const [activeSector, setActiveSector] = useState<SectorItem | null>(null);

  const radius = 68;
  const strokeWidth = 26;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
          />
          {sectors.map((sec, i) => {
            const strokeDashoffset = circumference - (sec.percentage / 100) * circumference;
            const rotation = accumulatedPercent * 3.6;
            accumulatedPercent += sec.percentage;

            return (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={sec.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform={`rotate(${rotation} ${center} ${center})`}
                className="transition-all duration-300 hover:opacity-85 cursor-pointer"
                onMouseEnter={() => setActiveSector(sec)}
                onMouseLeave={() => setActiveSector(null)}
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
          {activeSector ? (
            <>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold truncate max-w-[90px]">
                {activeSector.name}
              </span>
              <span className="text-base font-bold text-white">
                {activeSector.percentage}%
              </span>
              {activeSector.valueEUR && (
                <span className="text-[10px] text-emerald-400">
                  {formatEUR(activeSector.valueEUR)}
                </span>
              )}
            </>
          ) : (
            <>
              <span className="text-[11px] text-slate-400 font-medium">
                {centerTitle}
              </span>
              <span className="text-sm sm:text-base font-bold text-white tracking-tight">
                {centerValue}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-1 gap-2.5 text-xs">
        {sectors.map((s, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 px-2 py-1 rounded transition-colors cursor-pointer ${
              activeSector?.name === s.name ? 'bg-slate-800' : 'hover:bg-slate-800/40'
            }`}
            onMouseEnter={() => setActiveSector(s)}
            onMouseLeave={() => setActiveSector(null)}
          >
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-slate-300 font-medium truncate max-w-[100px]">{s.name}</span>
            <span className="text-slate-400 ml-auto font-semibold">{s.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CountryBarChart({
  countries
}: {
  countries: { name: string; performance: number; weight: number; color: string }[];
}) {
  const maxVal = Math.max(...countries.map(c => c.performance)) * 1.25 || 30;

  return (
    <div className="w-full space-y-3">
      {/* Visual bars */}
      <div className="h-44 flex items-end justify-around gap-3 pt-6 pb-2 px-2 border-b border-slate-700/60">
        {countries.map((c, i) => {
          const heightPercent = Math.min(100, (c.performance / maxVal) * 100);
          return (
            <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group">
              <span className="text-xs font-semibold text-emerald-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                +{c.performance}%
              </span>
              <div
                className="w-full max-w-[42px] rounded-t-md transition-all duration-300 hover:brightness-110 shadow-lg"
                style={{
                  height: `${heightPercent}%`,
                  backgroundColor: c.color
                }}
              />
              <span className="text-xs text-slate-300 font-medium mt-2">{c.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TopPositionsHorizontalBar({
  positions
}: {
  positions: { symbol: string; percentage: number; color: string; valueEUR?: number }[];
}) {
  const maxPercent = Math.max(...positions.map(p => p.percentage), 1);

  return (
    <div className="space-y-3 py-1">
      {positions.map((pos, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-bold text-slate-200">{pos.symbol}</span>
            <span className="font-semibold text-emerald-400">{pos.percentage}%</span>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(6, (pos.percentage / maxPercent) * 100))}%`,
                backgroundColor: pos.color
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
