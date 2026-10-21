import React, { useState, useEffect } from 'react';
import { StockPosition, Operation, DividendRecord } from '../../types/portfolio';
import { formatEUR, formatNumber, parseYearFromDate } from '../../utils/formatters';
import {
  X,
  Lock,
  CheckCircle2,
  Coins,
  Layers,
  Globe,
  Sparkles,
  ArrowRight,
  Info,
  Building2,
  DollarSign
} from 'lucide-react';

export interface PrefilledDividendInfo {
  symbol: string;
  company: string;
  shares?: number; // Títulos de la compra seleccionada (si viene de una compra)
  totalPortfolioShares?: number; // Total acumulado en cartera (todas las compras)
  purchasesCount?: number; // Número de compras registradas de esa empresa
  isLocked?: boolean;
}

export type DividendSubmitData = {
  id?: string;
  symbol: string;
  company: string;
  grossEUR: number;
  withholdingEUR: number;
  netEUR: number;
  date: string;
  year: number;
  shares?: number;
  hasDoubleWithholding?: boolean;
  withholdingOriginEUR?: number;
  withholdingOriginPercent?: number;
  withholdingOriginCountry?: string;
  withholdingDestinationEUR?: number;
  withholdingDestinationPercent?: number;
  withholdingDestinationCountry?: string;
  foreignCurrency?: string;
  grossForeign?: number;
  withholdingOriginForeign?: number;
  fxRate?: number;
};

interface NewDividendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dividendData: DividendSubmitData) => void;
  availablePositions: StockPosition[];
  operations?: Operation[];
  prefilledData?: PrefilledDividendInfo | null;
  dividendToEdit?: DividendRecord | null;
}

export function NewDividendModal({
  isOpen,
  onClose,
  onSubmit,
  availablePositions,
  operations = [],
  prefilledData,
  dividendToEdit,
}: NewDividendModalProps) {
  const isEditing = Boolean(dividendToEdit);

  const [symbol, setSymbol] = useState(availablePositions[0]?.symbol || 'MSFT');
  const [company, setCompany] = useState(availablePositions[0]?.company || 'Microsoft');
  const [grossEUR, setGrossEUR] = useState<number>(150.0);
  const [date, setDate] = useState<string>(new Date().toLocaleDateString('es-ES'));
  const [perShareAmount, setPerShareAmount] = useState<string>('0.50');
  const [calcMode, setCalcMode] = useState<'perShare' | 'total'>('perShare');

  // Shares management
  const [sharesCount, setSharesCount] = useState<number>(100);
  const [sharesSource, setSharesSource] = useState<'portfolio' | 'single' | 'custom'>('portfolio');

  // Withholding mode: Single vs Double
  const [hasDoubleWithholding, setHasDoubleWithholding] = useState<boolean>(false);

  // Single withholding state
  const [singleWithholdingPercent, setSingleWithholdingPercent] = useState<number>(19);
  const [singleWithholdingEUR, setSingleWithholdingEUR] = useState<number>(28.5);

  // Double withholding state (e.g., USA 15% + Spain 19%)
  const [originCountry, setOriginCountry] = useState<string>('Estados Unidos (USA)');
  const [originPercent, setOriginPercent] = useState<number>(15);
  const [originEUR, setOriginEUR] = useState<number>(0);

  const [destCountry, setDestCountry] = useState<string>('España (IRPF)');
  const [destPercent, setDestPercent] = useState<number>(19);
  const [destEUR, setDestEUR] = useState<number>(0);

  // Foreign Currency Assistant (for brokers like Trade Republic, Degiro, IBKR)
  const [showFxAssistant, setShowFxAssistant] = useState<boolean>(false);
  const [fxCurrency, setFxCurrency] = useState<string>('USD');
  const [fxPerShareUSD, setFxPerShareUSD] = useState<string>('0.91');
  const [fxGrossUSD, setFxGrossUSD] = useState<number>(49.14);
  const [fxOriginRateUSD, setFxOriginRateUSD] = useState<number>(15);
  const [fxOriginUSD, setFxOriginUSD] = useState<number>(7.37);
  const [fxRate, setFxRate] = useState<number>(1.1539);
  const [fxDestRate, setFxDestRate] = useState<number>(19);

  const isLocked = Boolean(prefilledData?.isLocked) && !isEditing;

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

  // Sync state when modal opens or editing item changes
  useEffect(() => {
    if (!isOpen) return;

    if (dividendToEdit) {
      // Editing existing dividend
      setSymbol(dividendToEdit.symbol);
      setCompany(dividendToEdit.company);
      setDate(dividendToEdit.date);
      setGrossEUR(dividendToEdit.grossEUR);
      const shares = dividendToEdit.shares || 100;
      setSharesCount(shares);
      setSharesSource('custom');
      setPerShareAmount((dividendToEdit.grossEUR / (shares || 1)).toFixed(4));
      setCalcMode('total');

      const isDouble = Boolean(
        dividendToEdit.hasDoubleWithholding ||
        (dividendToEdit.withholdingOriginEUR && dividendToEdit.withholdingOriginEUR > 0)
      );
      setHasDoubleWithholding(isDouble);

      if (isDouble) {
        const origEUR = dividendToEdit.withholdingOriginEUR || 0;
        const destAmountEUR = dividendToEdit.withholdingDestinationEUR || 0;
        setOriginEUR(origEUR);
        setOriginPercent(dividendToEdit.withholdingOriginPercent ?? 15);
        setOriginCountry(dividendToEdit.withholdingOriginCountry || 'Estados Unidos (USA)');
        setDestEUR(destAmountEUR);
        setDestPercent(dividendToEdit.withholdingDestinationPercent ?? 19);
        setDestCountry(dividendToEdit.withholdingDestinationCountry || 'España (IRPF)');
      } else {
        const withEUR = dividendToEdit.withholdingEUR;
        setSingleWithholdingEUR(withEUR);
        const calcPct = dividendToEdit.grossEUR > 0
          ? Number(((withEUR / dividendToEdit.grossEUR) * 100).toFixed(2))
          : 19;
        setSingleWithholdingPercent(calcPct);
      }

      if (dividendToEdit.grossForeign) {
        setShowFxAssistant(true);
        setFxCurrency(dividendToEdit.foreignCurrency || 'USD');
        setFxGrossUSD(dividendToEdit.grossForeign);
        setFxOriginUSD(dividendToEdit.withholdingOriginForeign || 0);
        setFxRate(dividendToEdit.fxRate || 1.1539);
      }
      return;
    }

    // New Dividend Mode
    const targetSymbol = prefilledData?.symbol || availablePositions[0]?.symbol || 'MSFT';
    const targetCompany = prefilledData?.company || availablePositions[0]?.company || 'Microsoft';
    setSymbol(targetSymbol);
    setCompany(targetCompany);

    const meta = getSymbolMeta(targetSymbol);
    const isForeign = meta.matchPos ? meta.matchPos.country !== 'ES' : targetSymbol !== 'TEF' && targetSymbol !== 'SAN';

    // Shares
    const totalPortfolioShares = prefilledData?.totalPortfolioShares ?? meta.totalSharesInPortfolio;
    const singleOpShares = prefilledData?.shares ?? 0;
    const purchasesCount = prefilledData?.purchasesCount ?? meta.purchasesCount;

    let initialShares = 100;
    let initialSource: 'portfolio' | 'single' | 'custom' = 'portfolio';

    if (totalPortfolioShares > 0) {
      if (singleOpShares > 0 && totalPortfolioShares > singleOpShares && purchasesCount > 1) {
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

    const defaultPerShare = 0.50;
    setPerShareAmount(defaultPerShare.toString());
    setCalcMode('perShare');
    const calculatedGross = Number((initialShares * defaultPerShare).toFixed(2));
    setGrossEUR(calculatedGross);
    setDate(new Date().toLocaleDateString('es-ES'));

    // Configure withholding according to country
    if (isForeign) {
      setHasDoubleWithholding(true);
      const isUSA = !meta.matchPos || meta.matchPos.country === 'USA';
      const isDE = meta.matchPos?.country === 'DE';
      const origPct = isDE ? 26.37 : isUSA ? 15 : 15;
      const origCountryName = isDE ? 'Alemania (26,37%)' : isUSA ? 'Estados Unidos (USA)' : 'Extranjero';
      setOriginCountry(origCountryName);
      setOriginPercent(origPct);
      const origE = Number(((calculatedGross * origPct) / 100).toFixed(2));
      setOriginEUR(origE);

      setDestCountry('España (IRPF)');
      setDestPercent(19);
      const baseDest = Math.max(0, calculatedGross - origE);
      const destE = Number(((baseDest * 19) / 100).toFixed(2));
      setDestEUR(destE);

      setShowFxAssistant(isUSA);
      if (isUSA) {
        setFxCurrency('USD');
        setFxPerShareUSD('0.91');
        const grossU = Number((initialShares * 0.91).toFixed(2));
        setFxGrossUSD(grossU);
        setFxOriginUSD(Number((grossU * 0.15).toFixed(2)));
        setFxRate(1.1539);
        setFxDestRate(19);
      }
    } else {
      setHasDoubleWithholding(false);
      setSingleWithholdingPercent(19);
      setSingleWithholdingEUR(Number(((calculatedGross * 19) / 100).toFixed(2)));
      setShowFxAssistant(false);
    }
  }, [isOpen, prefilledData, dividendToEdit]);

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
      const newGross = Number((val * sharesCount).toFixed(2));
      setGrossEUR(newGross);
      recalcWithholdings(newGross, hasDoubleWithholding, originPercent, destPercent, singleWithholdingPercent);
    }
  };

  const handleSharesCountChange = (newCount: number, source: 'portfolio' | 'single' | 'custom') => {
    setSharesCount(newCount);
    setSharesSource(source);
    if (calcMode === 'perShare') {
      const val = parseFloat(perShareAmount.replace(',', '.'));
      if (!isNaN(val) && newCount > 0) {
        const newGross = Number((val * newCount).toFixed(2));
        setGrossEUR(newGross);
        recalcWithholdings(newGross, hasDoubleWithholding, originPercent, destPercent, singleWithholdingPercent);
      }
    } else {
      if (newCount > 0 && grossEUR > 0) {
        setPerShareAmount((grossEUR / newCount).toFixed(4));
      }
    }

    // Sync FX assistant shares if open
    if (showFxAssistant) {
      const perU = parseFloat(fxPerShareUSD.replace(',', '.')) || 0.91;
      const gUSD = Number((newCount * perU).toFixed(2));
      setFxGrossUSD(gUSD);
      setFxOriginUSD(Number(((gUSD * fxOriginRateUSD) / 100).toFixed(2)));
    }
  };

  const recalcWithholdings = (
    gross: number,
    isDouble: boolean,
    origPct: number,
    dPct: number,
    singlePct: number
  ) => {
    if (!isDouble) {
      const singleE = Number(((gross * singlePct) / 100).toFixed(2));
      setSingleWithholdingEUR(singleE);
    } else {
      const oE = Number(((gross * origPct) / 100).toFixed(2));
      setOriginEUR(oE);
      // Spanish withholding is 19% on the remaining base after foreign withholding or gross
      const baseAfterOrigin = Math.max(0, gross - oE);
      const dE = Number(((baseAfterOrigin * dPct) / 100).toFixed(2));
      setDestEUR(dE);
    }
  };

  const handleGrossChange = (newGross: number) => {
    setGrossEUR(newGross);
    if (sharesCount > 0) {
      setPerShareAmount((newGross / sharesCount).toFixed(4));
    }
    recalcWithholdings(newGross, hasDoubleWithholding, originPercent, destPercent, singleWithholdingPercent);
  };

  const handleToggleDoubleWithholding = (targetDouble: boolean) => {
    setHasDoubleWithholding(targetDouble);
    recalcWithholdings(grossEUR, targetDouble, originPercent, destPercent, singleWithholdingPercent);
  };

  // Total Withholdings & Net Calculation
  const totalWithholdingEUR = hasDoubleWithholding
    ? Number((originEUR + destEUR).toFixed(2))
    : Number(singleWithholdingEUR.toFixed(2));

  const netEUR = Number((grossEUR - totalWithholdingEUR).toFixed(2));

  const handleSymbolChange = (sym: string) => {
    setSymbol(sym);
    const meta = getSymbolMeta(sym);
    if (meta.matchPos) {
      setCompany(meta.matchPos.company);
      const isForeign = meta.matchPos.country !== 'ES';
      setHasDoubleWithholding(isForeign);
      if (isForeign) {
        const isUSA = meta.matchPos.country === 'USA';
        const isDE = meta.matchPos.country === 'DE';
        const p = isDE ? 26.37 : 15;
        setOriginPercent(p);
        setOriginCountry(isDE ? 'Alemania' : isUSA ? 'Estados Unidos (USA)' : 'Extranjero');
      } else {
        setSingleWithholdingPercent(19);
      }
    }
    const shares = meta.totalSharesInPortfolio > 0 ? meta.totalSharesInPortfolio : 100;
    setSharesCount(shares);
    setSharesSource('portfolio');
    const perShareVal = parseFloat(perShareAmount.replace(',', '.')) || 0.50;
    const newG = Number((shares * perShareVal).toFixed(2));
    setGrossEUR(newG);
    recalcWithholdings(newG, meta.matchPos ? meta.matchPos.country !== 'ES' : false, originPercent, destPercent, singleWithholdingPercent);
  };

  // FX Assistant Calculations & Apply
  const handleApplyFxAssistant = () => {
    if (fxRate <= 0) return;
    // As shown in Trade Republic slip:
    // e.g. 49.14 USD / 1.1539 = 42.59 EUR Gross
    // US Withholding 7.37 USD / 1.1539 = 6.39 EUR
    // Subtotal after US = 41.77 USD / 1.1539 = 36.20 EUR
    // Spanish IRPF = 19% of 36.20 EUR = 6.88 EUR
    // Total Withholdings: 6.39 + 6.88 = 13.27 EUR
    // Net: 42.59 - 13.27 = 29.32 EUR (or 36.20 - 6.88 = 29.32 EUR)
    const grossInEUR = Number((fxGrossUSD / fxRate).toFixed(2));
    const origWithholdingInEUR = Number((fxOriginUSD / fxRate).toFixed(2));
    const subtotalInEUR = Number(((fxGrossUSD - fxOriginUSD) / fxRate).toFixed(2));
    const destWithholdingInEUR = Number(((subtotalInEUR * fxDestRate) / 100).toFixed(2));

    setHasDoubleWithholding(true);
    setGrossEUR(grossInEUR);
    setOriginEUR(origWithholdingInEUR);
    setOriginPercent(fxOriginRateUSD);
    setDestEUR(destWithholdingInEUR);
    setDestPercent(fxDestRate);
    if (sharesCount > 0) {
      setPerShareAmount((grossInEUR / sharesCount).toFixed(4));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || grossEUR <= 0) return;

    const year = parseYearFromDate(date);

    onSubmit({
      id: dividendToEdit?.id,
      symbol: symbol.toUpperCase(),
      company,
      grossEUR,
      withholdingEUR: totalWithholdingEUR,
      netEUR,
      date,
      year,
      shares: sharesCount,
      hasDoubleWithholding,
      withholdingOriginEUR: hasDoubleWithholding ? originEUR : undefined,
      withholdingOriginPercent: hasDoubleWithholding ? originPercent : undefined,
      withholdingOriginCountry: hasDoubleWithholding ? originCountry : undefined,
      withholdingDestinationEUR: hasDoubleWithholding ? destEUR : undefined,
      withholdingDestinationPercent: hasDoubleWithholding ? destPercent : undefined,
      withholdingDestinationCountry: hasDoubleWithholding ? destCountry : undefined,
      foreignCurrency: showFxAssistant ? fxCurrency : undefined,
      grossForeign: showFxAssistant ? fxGrossUSD : undefined,
      withholdingOriginForeign: showFxAssistant ? fxOriginUSD : undefined,
      fxRate: showFxAssistant ? fxRate : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{isEditing ? 'Editar Dividendo' : 'Registrar Cobro de Dividendo'}</span>
                {isEditing && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 font-medium">
                    Modo Edición
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                Soporta retención simple nacional y doble retención fiscal internacional (Origen + Destino)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Valor / Empresa */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Valor / Empresa
            </label>
            {isLocked ? (
              <div className="bg-slate-950 border border-emerald-500/50 rounded-xl p-3 flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" />
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
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {availablePositions.map(p => (
                  <option key={p.id} value={p.symbol}>
                    {p.symbol} - {p.company} ({p.shares} acc. · {p.country})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Títulos / Acciones que cobran dividendo */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Títulos que cobran dividendo:</span>
              </span>

              {hasMultiplePurchases && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800 font-semibold inline-flex items-center gap-1">
                  💡 {purchasesCount} compras registradas en cartera
                </span>
              )}
            </div>

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
                  Número de títulos con derecho a dividendo:
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
                  Modo de cálculo bruto:
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

          {/* ASISTENTE OPCIONAL EN MONEDA EXTRANJERA (Trade Republic, IBKR, Degiro) */}
          <div className="border border-indigo-500/30 bg-indigo-950/20 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowFxAssistant(!showFxAssistant)}
                className="flex items-center gap-2 text-indigo-300 hover:text-indigo-200 font-bold text-xs cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>¿Tu justificante viene en dólares o divisa extranjera (USD/EUR)?</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/60 border border-indigo-700 text-indigo-200">
                  {showFxAssistant ? 'Ocultar asistente' : 'Abrir asistente (ej. Trade Republic)'}
                </span>
              </button>
            </div>

            {showFxAssistant && (
              <div className="pt-2 border-t border-indigo-800/40 space-y-3 text-xs">
                <p className="text-[11px] text-slate-300">
                  Introduce los datos tal cual aparecen en el extracto del broker (como Microsoft: 54 acc. a 0,91 USD, retención 15% USA, tipo de cambio 1,1539 y retención España 19%):
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Divisa & Rend/acc
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-indigo-300 font-bold font-mono">$</span>
                      <input
                        type="number"
                        step="0.0001"
                        value={fxPerShareUSD}
                        onChange={e => {
                          setFxPerShareUSD(e.target.value);
                          const perU = parseFloat(e.target.value.replace(',', '.')) || 0;
                          const gU = Number((sharesCount * perU).toFixed(2));
                          setFxGrossUSD(gU);
                          setFxOriginUSD(Number(((gU * fxOriginRateUSD) / 100).toFixed(2)));
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs"
                        placeholder="0.91"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Total Bruto en USD
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={fxGrossUSD || ''}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setFxGrossUSD(val);
                        setFxOriginUSD(Number(((val * fxOriginRateUSD) / 100).toFixed(2)));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-emerald-400 font-mono font-bold text-xs"
                      placeholder="49.14"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Retención USA (15%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={fxOriginUSD || ''}
                      onChange={e => setFxOriginUSD(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-rose-400 font-mono text-xs"
                      placeholder="7.37"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Tipo de cambio (USD/EUR)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={fxRate || ''}
                      onChange={e => setFxRate(parseFloat(e.target.value) || 1.1539)}
                      className="w-full bg-slate-900 border border-indigo-500/50 rounded-lg px-2 py-1 text-white font-mono text-xs"
                      placeholder="1.1539"
                    />
                  </div>
                </div>

                {/* Vista previa y botón aplicar */}
                <div className="bg-slate-950/80 p-2.5 rounded-lg border border-indigo-800/50 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-300">
                    Subtotal EUR: <span className="text-white font-bold font-mono">{formatNumber((fxGrossUSD - fxOriginUSD) / (fxRate || 1))} €</span> · 
                    Ret. España (19%): <span className="text-rose-400 font-bold font-mono">-{formatNumber(((fxGrossUSD - fxOriginUSD) / (fxRate || 1)) * 0.19)} €</span> · 
                    Neto final: <span className="text-emerald-400 font-bold font-mono text-xs">{formatNumber(((fxGrossUSD - fxOriginUSD) / (fxRate || 1)) * 0.81)} €</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyFxAssistant}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Aplicar importes al dividendo</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SELECCIÓN DE RÉGIMEN FISCAL: SIMPLE vs DOBLE RETENCIÓN */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <div>
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span>Régimen de Retención Fiscal</span>
                </label>
                <p className="text-[11px] text-slate-400">
                  {hasDoubleWithholding
                    ? 'Doble retención: País de origen (EEUU/Alemania) + País de destino (España)'
                    : 'Retención simple nacional: Un solo país (ej. España 19%)'}
                </p>
              </div>

              {/* Selector de modo */}
              <div className="flex bg-slate-900 border border-slate-700 rounded-xl p-0.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleToggleDoubleWithholding(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    !hasDoubleWithholding
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Retención simple (1 país)
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleDoubleWithholding(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    hasDoubleWithholding
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Doble retención (2 países)
                </button>
              </div>
            </div>

            {/* MODO 1: RETENCIÓN SIMPLE */}
            {!hasDoubleWithholding ? (
              <div className="space-y-3 pt-1">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'España IRPF (19%)', val: 19 },
                    { label: 'Tramo Ahorro (21%)', val: 21 },
                    { label: 'USA W-8BEN (15%)', val: 15 },
                    { label: 'Sin retención (0%)', val: 0 },
                  ].map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setSingleWithholdingPercent(preset.val);
                        const valE = Number(((grossEUR * preset.val) / 100).toFixed(2));
                        setSingleWithholdingEUR(valE);
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        singleWithholdingPercent === preset.val
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Porcentaje de Retención (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        value={singleWithholdingPercent}
                        onChange={e => {
                          const pct = parseFloat(e.target.value) || 0;
                          setSingleWithholdingPercent(pct);
                          setSingleWithholdingEUR(Number(((grossEUR * pct) / 100).toFixed(2)));
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                        %
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Importe Retenido en Euros (€)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        value={singleWithholdingEUR || ''}
                        onChange={e => {
                          const valE = parseFloat(e.target.value) || 0;
                          setSingleWithholdingEUR(valE);
                          if (grossEUR > 0) {
                            setSingleWithholdingPercent(Number(((valE / grossEUR) * 100).toFixed(2)));
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-rose-400 font-mono font-bold focus:outline-none focus:border-blue-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                        €
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* MODO 2: DOBLE RETENCIÓN (ORIGEN + DESTINO) */
              <div className="space-y-4 pt-1">
                {/* 1. Retención en Origen (País Emisor, ej. USA / Alemania) */}
                <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      1. Retención en Origen (País emisor del valor)
                    </span>
                    <span className="text-[11px] text-amber-200/90 font-mono font-semibold">
                      -{formatEUR(originEUR)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'EEUU W-8BEN (15%)', country: 'Estados Unidos (USA)', val: 15 },
                      { label: 'Alemania (26,37%)', country: 'Alemania', val: 26.37 },
                      { label: 'Francia (12,8%)', country: 'Francia', val: 12.8 },
                      { label: 'Reino Unido (0%)', country: 'Reino Unido', val: 0 },
                    ].map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setOriginCountry(preset.country);
                          setOriginPercent(preset.val);
                          const oE = Number(((grossEUR * preset.val) / 100).toFixed(2));
                          setOriginEUR(oE);
                          // Recalculate Spanish destination tax
                          const baseDest = Math.max(0, grossEUR - oE);
                          setDestEUR(Number(((baseDest * destPercent) / 100).toFixed(2)));
                        }}
                        className={`text-[10px] px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                          originPercent === preset.val
                            ? 'bg-amber-600 text-white font-bold'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Porcentaje Origen (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          value={originPercent}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setOriginPercent(val);
                            const oE = Number(((grossEUR * val) / 100).toFixed(2));
                            setOriginEUR(oE);
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 pointer-events-none">%</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Importe retenido en Origen (€)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          value={originEUR || ''}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setOriginEUR(val);
                            if (grossEUR > 0) setOriginPercent(Number(((val / grossEUR) * 100).toFixed(2)));
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono font-bold"
                          placeholder="0.00"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 pointer-events-none">€</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Retención en Destino (España IRPF) */}
                <div className="bg-slate-900/90 border border-rose-500/30 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      2. Retención en Destino (España / IRPF AEAT)
                    </span>
                    <span className="text-[11px] text-rose-200/90 font-mono font-semibold">
                      -{formatEUR(destEUR)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'IRPF España (19%)', val: 19 },
                      { label: 'Tramo Ahorro (21%)', val: 21 },
                      { label: 'Sin retención destino (0%)', val: 0 },
                    ].map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setDestPercent(preset.val);
                          const baseDest = Math.max(0, grossEUR - originEUR);
                          setDestEUR(Number(((baseDest * preset.val) / 100).toFixed(2)));
                        }}
                        className={`text-[10px] px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                          destPercent === preset.val
                            ? 'bg-rose-600 text-white font-bold'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Porcentaje Destino (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          value={destPercent}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setDestPercent(val);
                            const baseDest = Math.max(0, grossEUR - originEUR);
                            setDestEUR(Number(((baseDest * val) / 100).toFixed(2)));
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 pointer-events-none">%</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Importe retenido en Destino (€)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          value={destEUR || ''}
                          onChange={e => setDestEUR(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-rose-300 font-mono font-bold"
                          placeholder="0.00"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 pointer-events-none">€</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Breakdown summary */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-2 text-xs shadow-inner">
            <div className="flex justify-between text-slate-300">
              <span>Dividendo Bruto Total ({sharesCount} títulos):</span>
              <span className="font-bold text-white font-mono">{formatEUR(grossEUR)}</span>
            </div>

            {hasDoubleWithholding ? (
              <>
                <div className="flex justify-between text-amber-300/90 pl-3">
                  <span>↳ Retención en Origen ({originPercent}% · {originCountry}):</span>
                  <span className="font-mono font-semibold">-{formatEUR(originEUR)}</span>
                </div>
                <div className="flex justify-between text-rose-400 pl-3">
                  <span>↳ Retención en Destino ({destPercent}% · {destCountry}):</span>
                  <span className="font-mono font-semibold">-{formatEUR(destEUR)}</span>
                </div>
                <div className="flex justify-between text-rose-400 font-bold border-t border-slate-800/80 pt-1">
                  <span>Total Retenciones Soportadas:</span>
                  <span className="font-mono">-{formatEUR(totalWithholdingEUR)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-rose-400">
                <span>Retención fiscal ({singleWithholdingPercent}%):</span>
                <span className="font-semibold font-mono">-{formatEUR(singleWithholdingEUR)}</span>
              </div>
            )}

            <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-emerald-400 font-bold text-sm">
              <div>
                <span>Neto a Ingresar en Cuenta:</span>
                <span className="block text-[10px] text-slate-400 font-normal">
                  {sharesCount} acc. × {((grossEUR - totalWithholdingEUR) / (sharesCount || 1)).toFixed(4)} € neto/acc.
                </span>
              </div>
              <span className="font-mono text-xl font-extrabold text-emerald-400">
                {formatEUR(netEUR)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 cursor-pointer hover:scale-[1.01] transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isEditing ? 'Guardar Cambios' : `Guardar Dividendo (${formatEUR(netEUR)})`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
