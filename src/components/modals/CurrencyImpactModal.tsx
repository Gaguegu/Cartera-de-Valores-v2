import React, { useState, useMemo } from 'react';
import { StockPosition } from '../../types/portfolio';
import { formatEUR, formatPercent } from '../../utils/formatters';
import {
  Globe,
  X,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Info,
  DollarSign,
  ArrowRight,
  Calculator,
  ShieldCheck,
} from 'lucide-react';

interface CurrencyImpactModalProps {
  isOpen: boolean;
  onClose: () => void;
  positions: StockPosition[];
  currentEurUsd?: number;
  onRefreshRates?: () => Promise<void>;
}

export function CurrencyImpactModal({
  isOpen,
  onClose,
  positions,
  currentEurUsd = 1.1204,
  onRefreshRates,
}: CurrencyImpactModalProps) {
  const [simulatedRate, setSimulatedRate] = useState<number>(currentEurUsd);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filter foreign positions (USD or foreign countries)
  const usdPositions = useMemo(() => {
    return positions.filter(p => p.currency === 'USD' || p.country === 'USA');
  }, [positions]);

  const totalUsdValueEUR = useMemo(() => {
    return usdPositions.reduce((acc, p) => acc + p.currentValueEUR, 0);
  }, [usdPositions]);

  const totalUsdGainEUR = useMemo(() => {
    return usdPositions.reduce((acc, p) => acc + p.gainLossEUR, 0);
  }, [usdPositions]);

  // Calculations for each position
  const breakdownList = useMemo(() => {
    return usdPositions.map(p => {
      // Estimated buy USD price if priceUSD is provided or computed from default rate
      const currentPriceUSD = p.priceUSD || p.currentPrice * currentEurUsd;
      const buyPriceUSD = p.buyPrice * 1.08; // Estimated historical entry rate around 1.08
      const assetGainPctUSD = buyPriceUSD > 0 ? ((currentPriceUSD - buyPriceUSD) / buyPriceUSD) * 100 : 0;

      // FX currency impact: EUR vs USD movement
      // If USD strengthens against EUR (EUR/USD drops), EUR return increases
      const fxGainPct = ((1.08 / currentEurUsd) - 1) * 100;
      const totalGainEURPct = p.gainLossPercent;

      // Simulated value at new rate
      const simPriceEUR = currentPriceUSD / (simulatedRate > 0 ? simulatedRate : 1.12);
      const simTotalValEUR = simPriceEUR * p.shares;
      const simDiffEUR = simTotalValEUR - p.currentValueEUR;

      return {
        ...p,
        currentPriceUSD,
        buyPriceUSD,
        assetGainPctUSD,
        fxGainPct,
        simTotalValEUR,
        simDiffEUR,
      };
    });
  }, [usdPositions, currentEurUsd, simulatedRate]);

  const totalSimulatedDiffEUR = useMemo(() => {
    return breakdownList.reduce((acc, item) => acc + item.simDiffEUR, 0);
  }, [breakdownList]);

  const handleRefresh = async () => {
    if (!onRefreshRates) return;
    setIsRefreshing(true);
    try {
      await onRefreshRates();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f1e36] border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#12233f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">Análisis Multidivisa y Efecto Tipo de Cambio (FX)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/30 text-cyan-300 border border-cyan-500/40">
                  Fase 3
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Desglose entre la rentabilidad real de la acción en dólares y el impacto de la divisa frente al euro
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Summary Banner */}
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-0.5">Tipo de cambio actual</span>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-cyan-300 font-mono">1 EUR = {currentEurUsd.toFixed(4)} USD</span>
              {onRefreshRates && (
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Actualizar tipo de cambio oficial"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
                </button>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-0.5">Exposición en USD (€)</span>
            <span className="font-extrabold text-sm text-white font-mono">{formatEUR(totalUsdValueEUR)}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-0.5">Plusvalía en USD (€)</span>
            <span className={`font-extrabold text-sm font-mono ${totalUsdGainEUR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatEUR(totalUsdGainEUR)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-0.5">Posiciones en divisa</span>
            <span className="font-extrabold text-sm text-amber-300 font-mono">{usdPositions.length} acciones</span>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {usdPositions.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800">
              <Globe className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-xs text-slate-400">
                Actualmente no tienes posiciones abiertas en dólares o mercado estadounidense.
              </p>
            </div>
          ) : (
            <>
              {/* Detailed Table */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Desglose por Título: Ganancia de la Acción vs Ganancia por Divisa</span>
                </h4>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#12233f] text-slate-300 font-bold border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Título</th>
                        <th className="py-2.5 px-3">Precio USD</th>
                        <th className="py-2.5 px-3">Precio EUR</th>
                        <th className="py-2.5 px-3 text-right">Rentab. en USD</th>
                        <th className="py-2.5 px-3 text-right">Efecto Divisa</th>
                        <th className="py-2.5 px-3 text-right">Rentab. Total (€)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                      {breakdownList.map(item => (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3">
                            <span className="font-extrabold text-white mr-1.5">{item.symbol}</span>
                            <span className="text-slate-400 text-[11px]">{item.company}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">
                            ${item.currentPriceUSD.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">
                            {formatEUR(item.currentPrice)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-200">
                            {item.assetGainPctUSD >= 0 ? `+${item.assetGainPctUSD.toFixed(1)}%` : `${item.assetGainPctUSD.toFixed(1)}%`}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold">
                            <span className={item.fxGainPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {item.fxGainPct >= 0 ? `+${item.fxGainPct.toFixed(1)}%` : `${item.fxGainPct.toFixed(1)}%`}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-extrabold">
                            <span className={item.gainLossPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {formatPercent(item.gainLossPercent)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* FX Sensitivity Simulator */}
              <div className="bg-[#12233f] p-4 rounded-xl border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-bold text-white">Simulador de Sensibilidad EUR / USD</h4>
                  </div>
                  <span className="text-xs font-mono text-cyan-300 font-bold">
                    Simulado: {simulatedRate.toFixed(4)}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400">
                  Desplaza la barra para ver el impacto en tu cartera en euros si el dólar sube o baja frente al euro:
                </p>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400 font-bold font-mono">1.02</span>
                  <input
                    type="range"
                    min="1.00"
                    max="1.25"
                    step="0.005"
                    value={simulatedRate}
                    onChange={e => setSimulatedRate(parseFloat(e.target.value))}
                    className="flex-1 accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-400 font-bold font-mono">1.25</span>
                  <button
                    onClick={() => setSimulatedRate(currentEurUsd)}
                    className="px-2 py-1 rounded text-[11px] font-bold bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Restablecer
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-medium">Impacto estimado en tu cartera en euros:</span>
                  <span
                    className={`font-mono text-xs font-extrabold ${
                      totalSimulatedDiffEUR >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {totalSimulatedDiffEUR >= 0 ? `+${formatEUR(totalSimulatedDiffEUR)}` : formatEUR(totalSimulatedDiffEUR)}
                    {' '}({totalUsdValueEUR > 0 ? (((totalUsdValueEUR + totalSimulatedDiffEUR) / totalUsdValueEUR - 1) * 100).toFixed(2) : 0}%)
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#12233f] flex items-center justify-between">
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Todos los cálculos fiscales del IRPF se basan en el tipo de cambio oficial del BCE de cada operación.</span>
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
