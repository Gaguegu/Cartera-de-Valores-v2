import React, { useState, useMemo, useEffect } from 'react';
import { StockPosition } from '../../types/portfolio';
import { formatEUR, formatPercent } from '../../utils/formatters';
import {
  Scale,
  X,
  Coins,
  ArrowRight,
  TrendingUp,
  SlidersHorizontal,
  CheckCircle2,
  RefreshCw,
  Plus,
  AlertCircle,
  Sparkles,
  PieChart,
  Check,
} from 'lucide-react';

interface RebalanceOrder {
  symbol: string;
  company: string;
  shares: number;
  price: number;
  totalEUR: number;
  currentShares: number;
  currentWeight: number;
  targetWeight: number;
  newWeight: number;
}

interface RebalanceSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  positions: StockPosition[];
  onExecutePurchases?: (orders: { symbol: string; company: string; shares: number; price: number; totalEUR: number }[]) => void;
}

export function RebalanceSimulatorModal({
  isOpen,
  onClose,
  positions,
  onExecutePurchases,
}: RebalanceSimulatorModalProps) {
  const [contributionAmount, setContributionAmount] = useState<number>(1000);
  const [rebalanceMode, setRebalanceMode] = useState<'dca_only' | 'full'>('dca_only');
  const [allocationPreset, setAllocationPreset] = useState<'equal' | 'current' | 'custom'>('current');
  const [appliedToast, setAppliedToast] = useState(false);

  const totalCurrentValue = useMemo(() => {
    return positions.reduce((acc, p) => acc + (p.currentValueEUR || 0), 0);
  }, [positions]);

  // Target weights by symbol: por defecto inicializado con los pesos actuales de la cartera
  const [targetWeights, setTargetWeights] = useState<Record<string, number>>(() => {
    if (positions.length === 0 || totalCurrentValue <= 0) return {};
    const init: Record<string, number> = {};
    positions.forEach(p => {
      const currentPct = Number(((p.currentValueEUR / totalCurrentValue) * 100).toFixed(1));
      init[p.symbol.toUpperCase()] = currentPct;
    });
    return init;
  });

  // Mantener actualizados los pesos iniciales si cambian las posiciones
  useEffect(() => {
    if (positions.length > 0 && totalCurrentValue > 0 && allocationPreset === 'current') {
      const init: Record<string, number> = {};
      positions.forEach(p => {
        const currentPct = Number(((p.currentValueEUR / totalCurrentValue) * 100).toFixed(1));
        init[p.symbol.toUpperCase()] = currentPct;
      });
      setTargetWeights(init);
    }
  }, [positions, totalCurrentValue]);

  // Set equal weighting
  const handleSetEqualWeights = () => {
    if (positions.length === 0) return;
    const equal = Number((100 / positions.length).toFixed(1));
    const newWeights: Record<string, number> = {};
    positions.forEach(p => {
      newWeights[p.symbol.toUpperCase()] = equal;
    });
    setTargetWeights(newWeights);
    setAllocationPreset('equal');
  };

  // Set current weights
  const handleSetCurrentWeights = () => {
    if (totalCurrentValue <= 0) return;
    const newWeights: Record<string, number> = {};
    positions.forEach(p => {
      const currentPct = Number(((p.currentValueEUR / totalCurrentValue) * 100).toFixed(1));
      newWeights[p.symbol.toUpperCase()] = currentPct;
    });
    setTargetWeights(newWeights);
    setAllocationPreset('current');
  };

  const handleCustomWeightChange = (sym: string, val: number) => {
    setAllocationPreset('custom');
    setTargetWeights(prev => ({
      ...prev,
      [sym]: val,
    }));
  };

  const totalTargetWeight = useMemo(() => {
    return Object.values(targetWeights).reduce((a, b) => a + (Number(b) || 0), 0);
  }, [targetWeights]);

  // Simulation algorithm: SIEMPRE INCLUYE TODOS LOS VALORES DE LA CARTERA ACTUAL
  const simulationResults = useMemo(() => {
    if (positions.length === 0 || totalCurrentValue <= 0) {
      return { orders: [], totalInvested: 0, cashRemaining: contributionAmount };
    }

    const simTotalPortfolio = totalCurrentValue + (contributionAmount > 0 ? contributionAmount : 0);
    const weightSum = totalTargetWeight > 0 ? totalTargetWeight : 100;

    // 1. Calculate ideal EUR for each position based on normalized target weights
    const candidates = positions.map(p => {
      const sym = p.symbol.toUpperCase();
      const rawTargetPct = targetWeights[sym] ?? 0;
      const normalizedTargetPct = (rawTargetPct / weightSum) * 100;
      const currentPct = (p.currentValueEUR / totalCurrentValue) * 100;
      const idealTargetEUR = (normalizedTargetPct / 100) * simTotalPortfolio;
      const deficiencyEUR = idealTargetEUR - p.currentValueEUR;

      return {
        stock: p,
        currentPct,
        normalizedTargetPct,
        idealTargetEUR,
        deficiencyEUR,
      };
    });

    if (rebalanceMode === 'dca_only') {
      // SOLO COMPRAS: Distribuir aportación entre infraponderados
      const underweighted = candidates.filter(c => c.deficiencyEUR > 0);
      const totalDeficiency = underweighted.reduce((acc, c) => acc + c.deficiencyEUR, 0);

      const buysMap: Record<string, { shares: number; cost: number }> = {};
      let totalInvested = 0;

      if (totalDeficiency > 0 && contributionAmount > 0) {
        underweighted.forEach(c => {
          const proportion = c.deficiencyEUR / totalDeficiency;
          const budgetForStock = contributionAmount * proportion;
          const price = c.stock.currentPrice;
          if (price > 0) {
            const sharesToBuy = Math.floor(budgetForStock / price);
            if (sharesToBuy > 0) {
              const cost = sharesToBuy * price;
              totalInvested += cost;
              buysMap[c.stock.symbol.toUpperCase()] = { shares: sharesToBuy, cost };
            }
          }
        });
      }

      // Generar orden para TODOS los valores de la cartera actual (con 0 si no requiere compras)
      const orders: RebalanceOrder[] = candidates.map(c => {
        const sym = c.stock.symbol.toUpperCase();
        const buy = buysMap[sym] || { shares: 0, cost: 0 };
        const newTotalVal = c.stock.currentValueEUR + buy.cost;
        const newWeight = (newTotalVal / simTotalPortfolio) * 100;

        return {
          symbol: c.stock.symbol,
          company: c.stock.company,
          shares: buy.shares,
          price: c.stock.currentPrice,
          totalEUR: Number(buy.cost.toFixed(2)),
          currentShares: c.stock.shares,
          currentWeight: c.currentPct,
          targetWeight: c.normalizedTargetPct,
          newWeight,
        };
      });

      const cashRemaining = Number((contributionAmount - totalInvested).toFixed(2));
      return { orders, totalInvested: Number(totalInvested.toFixed(2)), cashRemaining };
    } else {
      // REBALANCEO TOTAL (Compras y Ventas): Generar orden para TODOS los valores de la cartera actual
      let totalInvested = 0;

      const orders: RebalanceOrder[] = candidates.map(c => {
        const price = c.stock.currentPrice;
        let deltaShares = 0;
        let cost = 0;

        if (price > 0) {
          const deltaEUR = c.idealTargetEUR - c.stock.currentValueEUR;
          deltaShares = Math.round(deltaEUR / price);
          cost = Math.abs(deltaShares) * price;
          totalInvested += deltaShares > 0 ? cost : -cost;
        }

        const newTotalVal = Math.max(0, c.stock.currentValueEUR + deltaShares * price);
        const newWeight = (newTotalVal / simTotalPortfolio) * 100;

        return {
          symbol: c.stock.symbol,
          company: c.stock.company,
          shares: deltaShares,
          price,
          totalEUR: Number(cost.toFixed(2)),
          currentShares: c.stock.shares,
          currentWeight: c.currentPct,
          targetWeight: c.normalizedTargetPct,
          newWeight,
        };
      });

      return { orders, totalInvested: Number(totalInvested.toFixed(2)), cashRemaining: 0 };
    }
  }, [positions, totalCurrentValue, contributionAmount, targetWeights, totalTargetWeight, rebalanceMode]);

  const handleApplyPurchases = () => {
    const buyOrders = simulationResults.orders.filter(o => o.shares > 0);
    if (buyOrders.length === 0) return;

    if (onExecutePurchases) {
      onExecutePurchases(
        buyOrders.map(o => ({
          symbol: o.symbol,
          company: o.company,
          shares: o.shares,
          price: o.price,
          totalEUR: o.totalEUR,
        }))
      );
      setAppliedToast(true);
      setTimeout(() => {
        setAppliedToast(false);
        onClose();
      }, 1600);
    }
  };

  if (!isOpen) return null;

  const buyOrdersCount = simulationResults.orders.filter(o => o.shares > 0).length;
  const sellOrdersCount = simulationResults.orders.filter(o => o.shares < 0).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f1e36] border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-[#12233f] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-sm">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">Simulador de Rebalanceo de Cartera & DCA</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                  Fase 3
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Calcula cuántas acciones comprar con tus aportaciones periódicas para alcanzar tus pesos ideales sin vender
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

        {/* Controls Bar con iluminación activa de los botones seleccionados */}
        <div className="p-3.5 bg-slate-900/90 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {/* Mode Switch iluminado */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
            <button
              onClick={() => setRebalanceMode('dca_only')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                rebalanceMode === 'dca_only'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/40 border-2 border-indigo-400 ring-2 ring-indigo-400/40 font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {rebalanceMode === 'dca_only' && (
                <span className="w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.9)]" />
              )}
              <span>Modo DCA (Solo Compras)</span>
            </button>
            <button
              onClick={() => setRebalanceMode('full')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                rebalanceMode === 'full'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/40 border-2 border-purple-400 ring-2 ring-purple-400/40 font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {rebalanceMode === 'full' && (
                <span className="w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.9)]" />
              )}
              <span>Rebalanceo Total (Compras/Ventas)</span>
            </button>
          </div>

          {/* Quick presets for weights con iluminación activa del botón seleccionado */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-slate-400 font-semibold">Asignación:</span>
            <button
              onClick={handleSetEqualWeights}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                allocationPreset === 'equal'
                  ? 'bg-indigo-600 text-white border-2 border-indigo-400 shadow-md shadow-indigo-600/50 ring-2 ring-indigo-400/50 font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
              }`}
              title="Asignar el mismo porcentaje a todas las acciones de forma equitativa"
            >
              {allocationPreset === 'equal' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
              )}
              <span>Equiponderar</span>
            </button>
            <button
              onClick={handleSetCurrentWeights}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                allocationPreset === 'current'
                  ? 'bg-indigo-600 text-white border-2 border-indigo-400 shadow-md shadow-indigo-600/50 ring-2 ring-indigo-400/50 font-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
              }`}
              title="Copiar los porcentajes y pesos actuales de la cartera"
            >
              {allocationPreset === 'current' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
              )}
              <span>Pesos actuales</span>
            </button>
            {allocationPreset === 'custom' && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Personalizado
              </span>
            )}
          </div>
        </div>

        {/* Body scrollable con espacio optimizado */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Contribution input block (DCA) con botones de importe iluminados */}
          {rebalanceMode === 'dca_only' && (
            <div className="bg-[#12233f] p-3.5 rounded-xl border border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
              <div>
                <label className="block text-xs font-bold text-white mb-1.5">
                  Importe de aportación periódica a invertir (€)
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[300, 500, 1000, 2000, 5000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setContributionAmount(amt)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        contributionAmount === amt
                          ? 'bg-indigo-600 text-white border-2 border-indigo-400 shadow-md shadow-indigo-600/40 ring-1 ring-indigo-400 font-black'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700/80 hover:text-white'
                      }`}
                    >
                      {amt.toLocaleString('es-ES')} €
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative w-full sm:w-44">
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={contributionAmount || ''}
                  onChange={e => setContributionAmount(parseFloat(e.target.value) || 0)}
                  placeholder="1000"
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-sm font-mono font-bold focus:outline-none focus:border-indigo-400 pl-8"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span>
              </div>
            </div>
          )}

          {/* Allocation sliders / weight config table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-indigo-400" />
                <span>Ponderación objetivo por valor (%)</span>
              </h4>
              <span
                className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                  Math.abs(totalTargetWeight - 100) < 0.5
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                }`}
              >
                Suma: {totalTargetWeight.toFixed(1)}% {Math.abs(totalTargetWeight - 100) >= 0.5 && '(se normaliza al 100%)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {positions.map(p => {
                const sym = p.symbol.toUpperCase();
                const curPct = totalCurrentValue > 0 ? (p.currentValueEUR / totalCurrentValue) * 100 : 0;
                const targetPct = targetWeights[sym] ?? 0;

                return (
                  <div key={p.id} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1 hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-extrabold text-xs text-white shrink-0">{p.symbol}</span>
                        <span className="text-[11px] text-slate-400 truncate">{p.company}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-1">
                        Actual: <strong>{curPct.toFixed(1)}%</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="0.5"
                        value={targetPct}
                        onChange={e => handleCustomWeightChange(sym, parseFloat(e.target.value) || 0)}
                        className="flex-1 accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                      <div className="w-14 relative shrink-0">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={targetPct}
                          onChange={e => handleCustomWeightChange(sym, parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-1.5 py-0.5 text-xs font-mono font-bold text-center focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                      <span className="text-xs text-slate-400 font-bold">%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Simulation Output Table - TODOS LOS VALORES DE LA CARTERA ACTUAL */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Propuesta de Órdenes Calculada ({simulationResults.orders.length} valores en cartera)</span>
              </h4>
              <span className="text-xs text-slate-300">
                Inversión calculada:{' '}
                <strong className="text-emerald-400 font-mono">{formatEUR(simulationResults.totalInvested)}</strong>
                {rebalanceMode === 'dca_only' && simulationResults.cashRemaining > 0 && (
                  <span className="text-slate-400 text-[11px] ml-1.5">
                    (Sobrante efectivo: {formatEUR(simulationResults.cashRemaining)})
                  </span>
                )}
              </span>
            </div>

            {/* Contenedor de la tabla con scroll vertical suave y cabecera pegajosa para ver todos los valores sin perderse */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-inner">
              <div className="max-h-72 overflow-y-auto overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#12233f] text-slate-300 font-bold border-b border-slate-800 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="py-2 px-3">Acción</th>
                      <th className="py-2 px-3">Precio</th>
                      <th className="py-2 px-3 text-center">Peso Actual → Ideal</th>
                      <th className="py-2 px-3 text-right">Recomendación</th>
                      <th className="py-2 px-3 text-right">Importe (€)</th>
                      <th className="py-2 px-3 text-center">Nuevo Peso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                    {simulationResults.orders.map(order => {
                      const hasAction = order.shares !== 0;
                      return (
                        <tr
                          key={order.symbol}
                          className={`transition-colors ${
                            hasAction ? 'bg-slate-800/30 hover:bg-slate-800/50' : 'hover:bg-slate-800/20 opacity-80 hover:opacity-100'
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <span className="font-extrabold text-white mr-1.5">{order.symbol}</span>
                            <span className="text-slate-400 text-[11px]">{order.company}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">{formatEUR(order.price)}</td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            <span className="text-slate-400">{order.currentWeight.toFixed(1)}%</span>
                            <ArrowRight className="w-3 h-3 text-indigo-400 inline mx-1" />
                            <span className="text-indigo-300 font-bold">{order.targetWeight.toFixed(1)}%</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            {order.shares > 0 ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-black bg-emerald-950/70 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/10">
                                +{order.shares} acc.
                              </span>
                            ) : order.shares < 0 ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-black bg-rose-950/70 text-rose-400 border border-rose-500/40 shadow-sm shadow-rose-500/10">
                                {order.shares} acc.
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700/60">
                                Mantener (0)
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                            {order.shares !== 0 ? (
                              formatEUR(order.totalEUR)
                            ) : (
                              <span className="text-slate-500 font-normal">0,00 €</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-cyan-300">
                            {order.newWeight.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer con botón de acción iluminado y adaptado al modo activo */}
        <div className="p-3.5 border-t border-slate-800 bg-[#12233f] flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {rebalanceMode === 'dca_only'
                ? 'El modo DCA optimiza tus compras mensuales para equilibrar la cartera sin impacto fiscal por ventas.'
                : 'El modo Rebalanceo Total calcula compras y ventas para ajustar la cartera con precisión matemática.'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            {onExecutePurchases && buyOrdersCount > 0 && (
              <button
                onClick={handleApplyPurchases}
                className={`px-5 py-2 rounded-xl text-xs font-extrabold text-white transition-all shadow-lg flex items-center gap-1.5 cursor-pointer ${
                  rebalanceMode === 'dca_only'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-indigo-400/50 shadow-indigo-600/30'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-purple-400/50 shadow-purple-600/30'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>
                  {appliedToast
                    ? '¡Órdenes registradas!'
                    : rebalanceMode === 'dca_only'
                    ? `Registrar compras calculadas (${buyOrdersCount})`
                    : `Registrar compras calculadas (${buyOrdersCount})`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
