import React, { useState, useEffect } from 'react';
import { StockPosition, Operation } from '../../types/portfolio';
import { formatEUR, parseYearFromDate } from '../../utils/formatters';
import { X, DollarSign, Lock, Calculator, CheckCircle2, Coins, Layers, Info } from 'lucide-react';

export interface PrefilledDividendInfo {
  symbol: string;
  company: string;
  shares?: number; // Títulos de la compra seleccionada (si viene de una compra)
  totalPortfolioShares?: number; // Total acumulado en cartera (todas las compras)
  purchasesCount?: number; // Número de compras registradas de esa empresa
  isLocked?: boolean;
}

interface NewDividendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dividendData: {
    symbol: string;
    company: string;
    grossEUR: number;
    withholdingEUR: number;
    netEUR: number;
    date: string;
    year: number;
  }) => void;
  availablePositions: StockPosition[];
  operations?: Operation[];
  prefilledData?: PrefilledDividendInfo | null;
}

export function NewDividendModal({
  isOpen,
  onClose,
  onSubmit,
  availablePositions,
  operations = [],
  prefilledData,
}: NewDividendModalProps) {
  const [symbol, setSymbol] = useState(availablePositions[0]?.symbol || 'MSFT');
  const [company, setCompany] = useState(availablePositions[0]?.company || 'Microsoft');
  const [grossEUR, setGrossEUR] = useState<number>(150.0);
  const [withholdingPercent, setWithholdingPercent] = useState<number>(19); // 19% España por defecto
  const [date, setDate] = useState<string>(new Date().toLocaleDateString('es-ES'));
  const [perShareAmount, setPerShareAmount] = useState<string>('0.50');
  const [calcMode, setCalcMode] = useState<'perShare' | 'total'>('perShare');

  // Multi-compra and shares management
  const [sharesCount, setSharesCount] = useState<number>(100);
  const [sharesSource, setSharesSource] = useState<'portfolio' | 'single' | 'custom'>('portfolio');

  const isLocked = Boolean(prefilledData?.isLocked);

  // Helper to find matching position & purchases
  const getSymbolMeta = (targetSymbol: string) => {
    const matchPos = availablePositions.find(
      p => p.symbol.toUpperCase() === targetSymbol.toUpperCase()
    );
    const purchases = operations.filter(
      op => op.symbol.toUpperCase() === targetSymbol.toUpperCase() && op.type === 'Compra'
    );
    const totalSharesInPortfolio = matchPos
      ? matchPos.shares
      : purchases.reduce((acc, p) => acc + (p.shares || 0), 0);
    const purchasesCount = purchases.length || (totalSharesInPortfolio > 0 ? 1 : 0);

    return {
      matchPos,
      purchases,
      totalSharesInPortfolio,
      purchasesCount,
    };
  };

  useEffect(() => {
    if (isOpen) {
      const targetSymbol = prefilledData?.symbol || availablePositions[0]?.symbol || 'MSFT';
      const targetCompany = prefilledData?.company || availablePositions[0]?.company || 'Microsoft';
      setSymbol(targetSymbol);
      setCompany(targetCompany);

      const meta = getSymbolMeta(targetSymbol);

      // Fiscal tax withholding by country
      if (meta.matchPos) {
        if (meta.matchPos.country === 'ES') setWithholdingPercent(19);
        else if (meta.matchPos.country === 'USA') setWithholdingPercent(15);
        else if (meta.matchPos.country === 'DE') setWithholdingPercent(26.37);
        else setWithholdingPercent(19);
      } else {
        setWithholdingPercent(19);
      }

      // Determine shares:
      const totalPortfolioShares = prefilledData?.totalPortfolioShares ?? meta.totalSharesInPortfolio;
      const singleOpShares = prefilledData?.shares ?? 0;
      const purchasesCount = prefilledData?.purchasesCount ?? meta.purchasesCount;

      let initialShares = 100;
      let initialSource: 'portfolio' | 'single' | 'custom' = 'portfolio';

      if (totalPortfolioShares > 0) {
        // If coming from a single operation and there are multiple purchases:
        if (singleOpShares > 0 && totalPortfolioShares > singleOpShares && purchasesCount > 1) {
          // Default to total in portfolio (since brokers pay dividend on all shares), but offer both!
          initialShares = totalPortfolioShares;
          initialSource = 'portfolio';
        } else if (singleOpShares > 0 && singleOpShares === totalPortfolioShares) {
          initialShares = singleOpShares;
          initialSource = 'single';
        } else {
          initialShares = totalPortfolioShares;
          initialSource = 'portfolio';
        }
      } else if (singleOpShares > 0) {
        initialShares = singleOpShares;
        initialSource = 'single';
      }

      setSharesCount(initialShares);
      setSharesSource(initialSource);

      // Initialize calculation: default 0.50 €/acc
      const defaultPerShare = 0.50;
      setPerShareAmount(defaultPerShare.toString());
      setCalcMode('perShare');
      setGrossEUR(Number((initialShares * defaultPerShare).toFixed(2)));
      setDate(new Date().toLocaleDateString('es-ES'));
    }
  }, [isOpen, prefilledData]);

  if (!isOpen) return null;

  const currentMeta = getSymbolMeta(symbol);
  const totalPortfolioShares = prefilledData?.totalPortfolioShares ?? currentMeta.totalSharesInPortfolio;
  const singleOpShares = prefilledData?.shares ?? 0;
  const purchasesCount = prefilledData?.purchasesCount ?? currentMeta.purchasesCount;
  const hasMultiplePurchases = purchasesCount > 1 && totalPortfolioShares > 0;

  // Recalculations
  const handlePerShareChange = (valStr: string) => {
    setPerShareAmount(valStr);
    const val = parseFloat(valStr.replace(',', '.'));
    if (!isNaN(val) && sharesCount > 0) {
      setGrossEUR(Number((val * sharesCount).toFixed(2)));
    }
  };

  const handleSharesCountChange = (newCount: number, source: 'portfolio' | 'single' | 'custom') => {
    setSharesCount(newCount);
    setSharesSource(source);
    if (calcMode === 'perShare') {
      const val = parseFloat(perShareAmount.replace(',', '.'));
      if (!isNaN(val) && newCount > 0) {
        setGrossEUR(Number((val * newCount).toFixed(2)));
      }
    } else {
      // In total mode, update per share price
      if (newCount > 0 && grossEUR > 0) {
        setPerShareAmount((grossEUR / newCount).toFixed(4));
      }
    }
  };

  const handleGrossChange = (newGross: number) => {
    setGrossEUR(newGross);
    if (sharesCount > 0) {
      setPerShareAmount((newGross / sharesCount).toFixed(4));
    }
  };

  const withholdingEUR = Number(((grossEUR * withholdingPercent) / 100).toFixed(2));
  const netEUR = Number((grossEUR - withholdingEUR).toFixed(2));

  const handleSymbolChange = (sym: string) => {
    setSymbol(sym);
    const meta = getSymbolMeta(sym);
    if (meta.matchPos) {
      setCompany(meta.matchPos.company);
      if (meta.matchPos.country === 'ES') setWithholdingPercent(19);
      else if (meta.matchPos.country === 'USA') setWithholdingPercent(15);
      else if (meta.matchPos.country === 'DE') setWithholdingPercent(26.37);
      else setWithholdingPercent(19);
    }
    const shares = meta.totalSharesInPortfolio > 0 ? meta.totalSharesInPortfolio : 100;
    setSharesCount(shares);
    setSharesSource('portfolio');
    const perShareVal = parseFloat(perShareAmount.replace(',', '.')) || 0.50;
    setGrossEUR(Number((shares * perShareVal).toFixed(2)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || grossEUR <= 0) return;

    const year = parseYearFromDate(date);

    onSubmit({
      symbol: symbol.toUpperCase(),
      company,
      grossEUR,
      withholdingEUR,
      netEUR,
      date,
      year,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {isLocked ? `Registrar Dividendo · ${company}` : 'Registrar Cobro de Dividendo'}
              </h3>
              {isLocked ? (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                  <Lock className="w-3 h-3" /> Empresa fijada con candado (sin equivocación de valor)
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">
                  Calcula el dividendo bruto, retención fiscal y neto cobrado
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Valor / Empresa */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Valor / Empresa
            </label>
            {isLocked ? (
              <div className="bg-slate-950 border border-emerald-500/50 rounded-xl p-3 flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" />
                  <div>
                    <span className="font-extrabold text-white font-mono text-sm">{symbol}</span>
                    <span className="text-slate-300 text-xs ml-2 font-medium">· {company}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                  <Lock className="w-3 h-3" /> Empresa Fijada
                </div>
              </div>
            ) : (
              <select
                value={symbol}
                onChange={e => handleSymbolChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {availablePositions.map(p => (
                  <option key={p.id} value={p.symbol}>
                    {p.symbol} - {p.company} ({p.shares} acc. en cartera · {p.country})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Solución al caso multi-compra (3 compras = total cartera vs compra individual) */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Títulos que cobran dividendo:</span>
              </span>

              {/* Multiple purchases badge / advice */}
              {hasMultiplePurchases && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800 font-semibold inline-flex items-center gap-1">
                  💡 {purchasesCount} compras registradas en cartera
                </span>
              )}
            </div>

            {/* Quick selector buttons if multiple purchases or single purchase origin */}
            {hasMultiplePurchases && (
              <div className="space-y-1.5">
                <p className="text-[11px] text-slate-300">
                  ¿Cómo te ha pagado el broker? Selecciona el origen de los títulos:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSharesCountChange(totalPortfolioShares, 'portfolio')}
                    className={`p-2 rounded-xl text-left border transition-all text-xs cursor-pointer ${
                      sharesSource === 'portfolio'
                        ? 'bg-cyan-950/90 border-cyan-500 text-white shadow-sm shadow-cyan-900/50'
                        : 'bg-slate-900/80 border-slate-700/80 text-slate-400 hover:text-white hover:border-slate-600'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${sharesSource === 'portfolio' ? 'bg-cyan-400' : 'bg-slate-500'}`} />
                        Total Cartera ({totalPortfolioShares} acc.)
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">Recomendado</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Suma las {purchasesCount} compras acumuladas
                    </div>
                  </button>

                  {singleOpShares > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSharesCountChange(singleOpShares, 'single')}
                      className={`p-2 rounded-xl text-left border transition-all text-xs cursor-pointer ${
                        sharesSource === 'single'
                          ? 'bg-cyan-950/90 border-cyan-500 text-white shadow-sm shadow-cyan-900/50'
                          : 'bg-slate-900/80 border-slate-700/80 text-slate-400 hover:text-white hover:border-slate-600'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${sharesSource === 'single' ? 'bg-cyan-400' : 'bg-slate-500'}`} />
                          Solo esta compra ({singleOpShares} acc.)
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Solo la compra seleccionada
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Editable input for shares count */}
            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Número exacto de títulos con derecho a dividendo:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={sharesCount || ''}
                    onChange={e => {
                      const count = Math.max(1, parseInt(e.target.value, 10) || 0);
                      handleSharesCountChange(count, 'custom');
                    }}
                    required
                    className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    títulos
                  </span>
                </div>
              </div>

              {/* Calc Mode Toggle */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Modo de cálculo:
                </label>
                <div className="flex bg-slate-900 border border-slate-700 rounded-xl p-0.5">
                  <button
                    type="button"
                    onClick={() => setCalcMode('perShare')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      calcMode === 'perShare'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    € / acción
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcMode('total')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      calcMode === 'total'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Total € directo
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Calculator Section */}
          {calcMode === 'perShare' ? (
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-cyan-500/30">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-cyan-300 mb-1">
                    Dividendo bruto por título (€/acc)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      value={perShareAmount}
                      onChange={e => handlePerShareChange(e.target.value)}
                      placeholder="Ej. 0.50"
                      required
                      className="w-full bg-slate-900 border border-cyan-500/50 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                      €
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Total Bruto ({sharesCount} acc × {perShareAmount || '0'} €)
                  </label>
                  <div className="h-10 px-3 flex items-center bg-slate-900 border border-slate-700 rounded-xl text-sm text-emerald-400 font-extrabold font-mono">
                    {formatEUR(grossEUR)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Dividendo Bruto Total (€)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0.0001"
                  step="any"
                  value={grossEUR || ''}
                  onChange={e => handleGrossChange(Number(e.target.value))}
                  required
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono font-bold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                  €
                </span>
              </div>
              {sharesCount > 0 && grossEUR > 0 && (
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Equivale a <strong className="text-cyan-300 font-mono">{(grossEUR / sharesCount).toFixed(4)} €</strong> brutos por cada una de las {sharesCount} acciones.
                </p>
              )}
            </div>
          )}

          {/* Retención fiscal */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Retención Fiscal (%)
              </label>
              <span className="text-[11px] text-slate-400">
                Retención calculada: <span className="text-rose-400 font-mono font-bold">-{formatEUR(withholdingEUR)}</span>
              </span>
            </div>

            {/* Quick Country Tax Buttons */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {[
                { label: 'España (19%)', val: 19 },
                { label: 'USA (15%)', val: 15 },
                { label: 'Alemania (26,37%)', val: 26.37 },
                { label: 'Sin retención (0%)', val: 0 },
              ].map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setWithholdingPercent(preset.val)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    withholdingPercent === preset.val
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                value={withholdingPercent}
                onChange={e => setWithholdingPercent(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                %
              </span>
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Fecha de Cobro (DD/MM/AAAA)
            </label>
            <input
              type="text"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              placeholder="DD/MM/AAAA"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {/* Breakdown summary */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1.5 text-xs shadow-inner">
            <div className="flex justify-between text-slate-300">
              <span>Dividendo Bruto Total ({sharesCount} títulos):</span>
              <span className="font-bold text-white font-mono">{formatEUR(grossEUR)}</span>
            </div>
            <div className="flex justify-between text-rose-400">
              <span>Retención fiscal ({withholdingPercent}%):</span>
              <span className="font-semibold font-mono">-{formatEUR(withholdingEUR)}</span>
            </div>
            <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-emerald-400 font-bold text-sm">
              <div>
                <span>Neto a Ingresar en Cuenta:</span>
                <span className="block text-[10px] text-slate-400 font-normal">
                  {sharesCount} acc. × {((grossEUR - withholdingEUR) / (sharesCount || 1)).toFixed(4)} € neto/acc.
                </span>
              </div>
              <span className="font-mono text-lg font-extrabold text-emerald-400">
                {formatEUR(netEUR)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 cursor-pointer hover:scale-[1.01] transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar Dividendo ({formatEUR(netEUR)})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
