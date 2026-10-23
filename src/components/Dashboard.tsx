import React from 'react';
import { StockPosition, ActiveTab, DividendRecord } from '../types/portfolio';
import { formatEUR, formatPercent } from '../utils/formatters';
import { TrendingUp, ArrowUpRight, ArrowDownRight, DollarSign, Layers, ArrowRight, Plus, ExternalLink } from 'lucide-react';
import { PortfolioLineChart, DonutChart } from './charts/PortfolioCharts';
import { HISTORICAL_CHART_DATA, SECTOR_DATA } from '../data/initialData';

interface DashboardProps {
  positions: StockPosition[];
  dividends?: DividendRecord[];
  onNavigate: (tab: ActiveTab) => void;
  onOpenNewOperation: () => void;
  onSelectStock: (stock: StockPosition) => void;
  closedPositionsCount: number;
  cashEUR?: number;
}

export function Dashboard({
  positions,
  dividends,
  onNavigate,
  onOpenNewOperation,
  onSelectStock,
  closedPositionsCount,
  cashEUR = 18450.00,
}: DashboardProps) {
  // Aggregate portfolio totals
  const totalValueEUR = positions.reduce((acc, p) => acc + p.currentValueEUR, 0);
  const totalGainEUR = positions.reduce((acc, p) => acc + p.gainLossEUR, 0);
  const totalCostEUR = totalValueEUR - totalGainEUR;
  const totalReturnPercent = totalCostEUR > 0 ? (totalGainEUR / totalCostEUR) * 100 : 0;
  const annualDividendsEUR = dividends
    ? dividends.reduce((acc, d) => acc + (d.netEUR || 0), 0)
    : (positions.length > 0 ? 4892.30 : 0);
  const annualDividendsPercent = totalValueEUR > 0 ? (annualDividendsEUR / totalValueEUR) * 100 : 0;
  const totalPositionsCount = positions.length + closedPositionsCount;

  const sectorColors: Record<string, string> = {
    Tecnología: '#3b82f6',
    Salud: '#10b981',
    Consumo: '#f59e0b',
    Energía: '#ef4444',
    Finanzas: '#06b6d4',
    Telecom: '#8b5cf6',
    Otros: '#64748b'
  };

  const dynamicSectorData = React.useMemo(() => {
    if (positions.length === 0) return [];
    const map = new Map<string, number>();
    positions.forEach(p => {
      const sec = p.sector || 'Otros';
      map.set(sec, (map.get(sec) || 0) + (p.currentValueEUR || 0));
    });
    return Array.from(map.entries())
      .map(([name, val]) => ({
        name,
        valueEUR: val,
        percentage: totalValueEUR > 0 ? Math.round((val / totalValueEUR) * 100) : 0,
        color: sectorColors[name] || '#3b82f6'
      }))
      .sort((a, b) => b.valueEUR - a.valueEUR);
  }, [positions, totalValueEUR]);

  const dynamicHistoricalData = React.useMemo(() => {
    if (totalValueEUR === 0) return [];
    const current = totalValueEUR;
    const base = current * 0.82;
    return [
      { label: 'Ene', value: Math.round(base * 0.94) },
      { label: 'Feb', value: Math.round(base * 1.01) },
      { label: 'Mar', value: Math.round(base * 1.06) },
      { label: 'Abr', value: Math.round(base * 1.03) },
      { label: 'May', value: Math.round(base * 1.12) },
      { label: 'Jun', value: Math.round(base * 1.17) },
      { label: 'Jul', value: Math.round(base * 1.15) },
      { label: 'Ago', value: Math.round(current) },
    ];
  }, [totalValueEUR]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Title & Subtitle bar */}
      <div className="sticky top-0 z-10 bg-[#12233f] border border-slate-700/80 p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 backdrop-blur-md">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Resumen de la cartera
          </h2>
          <p className="text-xs text-slate-400">
            Seguimiento en tiempo real de inversiones globales valoradas en euros · Método FIFO
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Cash badge from PDF spec */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300">
            <span className="text-emerald-400 font-bold">💶 Efectivo disponible:</span>
            <span className="font-mono font-bold text-white">{formatEUR(cashEUR)}</span>
          </div>

          <button
            onClick={onOpenNewOperation}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nueva operación
          </button>
        </div>
      </div>

      {/* 4 Cards from Screen 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Valor actual */}
        <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-blue-500/50 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>Valor actual</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {formatEUR(totalValueEUR)}
          </div>
          <div
            className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${
              totalGainEUR >= 0 ? 'text-emerald-400' : 'text-red-500'
            }`}
          >
            <span>{formatPercent(totalReturnPercent)}</span>
            <span>{totalGainEUR >= 0 ? `+${formatEUR(totalGainEUR)}` : formatEUR(totalGainEUR)}</span>
          </div>
        </div>

        {/* Card 2: Rentabilidad total */}
        <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>Rentabilidad total</span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                totalReturnPercent >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-500'
              }`}
            >
              {totalReturnPercent >= 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
            </div>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
              totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-red-500'
            }`}
          >
            {formatPercent(totalReturnPercent)}
          </div>
          <div
            className={`mt-2 flex items-center gap-1 text-xs font-semibold ${
              totalGainEUR >= 0 ? 'text-emerald-400' : 'text-red-500'
            }`}
          >
            <span>({totalGainEUR >= 0 ? `+${formatEUR(totalGainEUR)}` : formatEUR(totalGainEUR)})</span>
          </div>
        </div>

        {/* Card 3: Dividendos anuales */}
        <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-blue-400/50 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>Dividendos anuales</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-400 tracking-tight">
            {formatEUR(annualDividendsEUR)}
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-400">
            <span>(+{annualDividendsPercent}%)</span>
          </div>
        </div>

        {/* Card 4: Posiciones */}
        <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-indigo-500/50 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
            <span>Posiciones</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {totalPositionsCount}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span className="text-slate-300">Abiertas: {positions.length}</span>
            <span>·</span>
            <span>Cerradas: {closedPositionsCount}</span>
          </div>
        </div>
      </div>

      {/* 2 Main Charts from Screen 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Evolución de la cartera */}
        <div className="lg:col-span-2 bg-[#12233f] border border-slate-700/70 rounded-2xl p-5 sm:p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Evolución de la cartera</h3>
              <p className="text-xs text-slate-400">Crecimiento del capital acumulado en 2026</p>
            </div>
            <button
              onClick={() => onNavigate('analytics')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
            >
              Ver análisis completo <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <PortfolioLineChart data={dynamicHistoricalData.length > 0 ? dynamicHistoricalData : HISTORICAL_CHART_DATA} height={210} />
        </div>

        {/* Right 1 Col: Por sectores */}
        <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl p-5 sm:p-6 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-white">Por sectores</h3>
            <span className="text-xs text-slate-400 font-medium">Diversificación</span>
          </div>
          <div className="py-2">
            <DonutChart
              sectors={dynamicSectorData.length > 0 ? dynamicSectorData : SECTOR_DATA}
              centerTitle="Total"
              centerValue={formatEUR(totalValueEUR)}
              size={170}
            />
          </div>
          <button
            onClick={() => onNavigate('current')}
            className="w-full mt-3 py-2 text-center text-xs text-blue-400 hover:text-blue-300 font-semibold border-t border-slate-800/80 transition-colors"
          >
            Explorar todas las posiciones →
          </button>
        </div>
      </div>

      {/* Top Positions Quick Table preview */}
      <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Principales Valores en Cartera</h3>
            <p className="text-xs text-slate-400">Haz clic en cualquier acción para ver su ficha completa interactiva</p>
          </div>
          <button
            onClick={() => onNavigate('current')}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            Ver tabla completa ({positions.length}) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-slate-400 font-semibold border-b border-slate-800 bg-slate-900/40">
              <tr>
                <th className="py-3 px-3">Símbolo</th>
                <th className="py-3 px-3">Empresa</th>
                <th className="py-3 px-3">País</th>
                <th className="py-3 px-3 text-right">Cantidad</th>
                <th className="py-3 px-3 text-right">Precio Actual</th>
                <th className="py-3 px-3 text-right">Valor (€)</th>
                <th className="py-3 px-3 text-right">Plusvalía %</th>
                <th className="py-3 px-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="font-semibold text-slate-300">Cartera vacía (0 posiciones)</p>
                      <p className="text-xs text-slate-500">Pulsa en «Nueva operación» para registrar tus compras e inversiones.</p>
                      <button
                        onClick={onOpenNewOperation}
                        className="mt-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Registrar Primera Compra
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                positions.slice(0, 6).map(pos => (
                  <tr
                    key={pos.id}
                    onClick={() => onSelectStock(pos)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: pos.color || '#3b82f6' }}
                      />
                      <span>{pos.symbol}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-200">{pos.company}</td>
                    <td className="py-3 px-3 text-slate-400 font-medium">{pos.country}</td>
                    <td className="py-3 px-3 text-right font-medium text-white">{pos.shares}</td>
                    <td className="py-3 px-3 text-right text-slate-300 font-mono">
                      {pos.currentPrice} {pos.currency}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-white font-mono">
                      {formatEUR(pos.currentValueEUR)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-bold font-mono ${
                        pos.gainLossPercent >= 0 ? 'text-emerald-400' : 'text-red-500'
                      }`}
                    >
                      {formatPercent(pos.gainLossPercent)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onSelectStock(pos);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white transition-all text-[11px] font-semibold"
                      >
                        Detalle
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
