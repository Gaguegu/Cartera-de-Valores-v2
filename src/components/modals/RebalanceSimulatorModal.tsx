import React, { useState, useMemo } from 'react';
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
  const [appliedToast, setAppliedToast] = useState(false);

  // Target weights by symbol
  const [targetWeights, setTargetWeights] = useState<Record<string, number>>(() => {
    if (positions.length === 0) return {};
    const equal = Number((100 / positions.length).toFixed(1));
    const init: Record<string, number> = {};
    positions.forEach(p => {
      init[p.symbol.toUpperCase()] = equal;
    });
    return init;
  });

  const totalCurrentValue = useMemo(() => {
    return positions.reduce((acc, p) => acc + p.currentValueEUR, 0);
  }, [positions]);

  // Set equal weighting
  const handleSetEqualWeights = () => {
    if (positions.length === 0) return;
    const equal = Number((100 / positions.length).toFixed(1));
    const newWeights: Record<string, number> = {};
    positions.forEach(p => {
      newWeights[p.symbol.toUpperCase()] = equal;
    });
    setTargetWeights(newWeights);
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
  };

  const totalTargetWeight = useMemo(() => {
    return Object.values(targetWeights).reduce((a, b) => a + (Number(b) || 0), 0);
  }, [targetWeights]);

  // Simulation algorithm
  const simulationResults = useMemo(() => {
    if (positions.length === 0 || totalCurrentValue <= 0) {
      return { orders: [], totalInvested: 0, cashRemaining: contributionAmount };
    }

    const simTotalPortfolio = totalCurrentValue + (contributionAmount > 0 ? contributionAmount : 0);
    const weightSum = totalTargetWeight > 0 ? totalTargetWeight : 100;

    // 1. Calculate ideal EUR for each position based on normalized target weights
    const candidates = positions.map(p => {
      const sym = p.symbol.toUpperCase();
      const rawTargetPct = targetWeights[sym] || 0;
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
      // ONLY BUYS: Distribute the new cash contribution among underweighted assets
      const underweighted = candidates.filter(c => c.deficiencyEUR > 0);
      const totalDeficiency = underweighted.reduce((acc, c) => acc + c.deficiencyEUR, 0);

      const orders: RebalanceOrder[] = [];
      let totalInvested = 0;

      if (totalDeficiency > 0 && contributionAmount > 0) {
        // Proportionate allocation
        underweighted.forEach(c => {
          const proportion = c.deficiencyEUR / totalDeficiency;
          const budgetForStock = contributionAmount * proportion;
          const price = c.stock.currentPrice;
          if (price > 0) {
            const sharesToBuy = Math.floor(budgetForStock / price);
            if (sharesToBuy > 0) {
              const cost = sharesToBuy * price;
              totalInvested += cost;
              const newTotalVal = c.stock.currentValueEUR + cost;
              const newWeight = (newTotalVal / simTotalPortfolio) * 100;

              orders.push({
                symbol: c.stock.symbol,
                company: c.stock.company,
                shares: sharesToBuy,
                price,
                totalEUR: Number(cost.toFixed(2)),
                currentShares: c.stock.shares,
                currentWeight: c.currentPct,
                targetWeight: c.normalizedTargetPct,
                newWeight,
              });
            }
          }
        });
      }

      const cashRemaining = Number((contributionAmount - totalInvested).toFixed(2));
      return { orders, totalInvested: Number(totalInvested.toFixed(2)), cashRemaining };
    } else {
      // FULL REBALANCE (Both buys and sells)
      const orders: RebalanceOrder[] = [];
      let totalInvested = 0;

      candidates.forEach(c => {
        const price = c.stock.currentPrice;
        if (price > 0) {
          const deltaEUR = c.idealTargetEUR - c.stock.currentValueEUR;
          const deltaShares = Math.round(deltaEUR / price);

          if (deltaShares !== 0) {
            const cost = Math.abs(deltaShares) * price;
            totalInvested += deltaShares > 0 ? cost : -cost;
            const newTotalVal = Math.max(0, c.stock.currentValueEUR + deltaShares * price);
            const newWeight = (newTotalVal / simTotalPortfolio) * 100;

            orders.push({
              symbol: c.stock.symbol,
              company: c.stock.company,
              shares: deltaShares,
              price,
              totalEUR: Number(cost.toFixed(2)),
              currentShares: c.stock.shares,
              currentWeight: c.currentPct,
              targetWeight: c.normalizedTargetPct,
              newWeight,
            });
          }
        }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f1e36] border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#12233f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
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

        {/* Controls Bar */}
        <div className="p-4 bg-slate-900/70 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Mode Switch */}
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setRebalanceMode('dca_only')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                rebalanceMode === 'dca_only'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Modo DCA (Solo Compras)
            </button>
            <button
              onClick={() => setRebalanceMode('full')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                rebalanceMode === 'full'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Rebalanceo Total (Compras/Ventas)
            </button>
          </div>

          {/* Quick presets for weights */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-slate-400 font-medium">Asignación:</span>
            <button
              onClick={handleSetEqualWeights}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
              title="Asignar el mismo porcentaje a todas las acciones"
            >
              Equiponderar
            </button>
            <button
              onClick={handleSetCurrentWeights}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
              title="Copiar los porcentajes actuales de la cartera"
            >
              Pesos actuales
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Contribution input block */}
          {rebalanceMode === 'dca_only' && (
            <div className="bg-[#12233f] p-4 rounded-xl border border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <label className="block text-xs font-bold text-white mb-1">
                  Importe de aportación periódica a invertir (€)
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[300, 500, 1000, 2000, 5000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setContributionAmount(amt)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        contributionAmount === amt
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
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

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {positions.map(p => {
                const sym = p.symbol.toUpperCase();
                const curPct = totalCurrentValue > 0 ? (p.currentValueEUR / totalCurrentValue) * 100 : 0;
                const targetPct = targetWeights[sym] ?? 0;

                return (
                  <div key={p.id} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-white">{p.symbol}</span>
                        <span className="text-[11px] text-slate-400 truncate max-w-[100px]">{p.company}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
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
                        onChange={e =>
                          setTargetWeights(prev => ({
                            ...prev,
                            [sym]: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="flex-1 accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                      <div className="w-14 relative shrink-0">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={targetPct}
                          onChange={e =>
                            setTargetWeights(prev => ({
                              ...prev,
                              [sym]: parseFloat(e.target.value) || 0,
                            }))
                          }
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

          {/* Simulation Output Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Propuesta de Órdenes Calculada</span>
              </h4>
              {simulationResults.orders.length > 0 && (
                <span className="text-xs text-slate-300">
                  Inversión calculada:{' '}
                  <strong className="text-emerald-400 font-mono">{formatEUR(simulationResults.totalInvested)}</strong>
                  {simulationResults.cashRemaining > 0 && (
                    <span className="text-slate-400 text-[11px] ml-1.5">
                      (Sobrante efectivo: {formatEUR(simulationResults.cashRemaining)})
                    </span>
                  )}
                </span>
              )}
            </div>

            {simulationResults.orders.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-slate-900/40 border border-slate-800">
                <p className="text-xs text-slate-400">
                  Introduce una cantidad a aportar superior a la cotización de los títulos infraponderados para generar recomendaciones de compra.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#12233f] text-slate-300 font-bold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Acción</th>
                      <th className="py-2.5 px-3">Precio</th>
                      <th className="py-2.5 px-3 text-center">Peso Actual → Ideal</th>
                      <th className="py-2.5 px-3 text-right">Recomendación</th>
                      <th className="py-2.5 px-3 text-right">Importe (€)</th>
                      <th className="py-2.5 px-3 text-center">Nuevo Peso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                    {simulationResults.orders.map(order => (
                      <tr key={order.symbol} className="hover:bg-slate-800/40 transition-colors">
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
                            <span className="px-2 py-0.5 rounded font-black bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                              +{order.shares} acc.
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded font-black bg-rose-950/60 text-rose-400 border border-rose-500/30">
                              {order.shares} acc.
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                          {formatEUR(order.totalEUR)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-cyan-300">
                          {order.newWeight.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#12233f] flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>El modo DCA optimiza tus compras mensuales para equilibrar la cartera sin impacto fiscal por ventas.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            {onExecutePurchases && simulationResults.orders.some(o => o.shares > 0) && (
              <button
                onClick={handleApplyPurchases}
                className="px-5 py-2 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{appliedToast ? '¡Órdenes registradas!' : 'Registrar compras calculadas'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
