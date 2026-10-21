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
  DollarSign
} from 'lucide-react';

export interface PrefilledDividendInfo {
  symbol: string;
  company: string;
  shares?: number;
  totalPortfolioShares?: number;
  purchasesCount?: number;
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

  // Tab: 'foreign' (Trade Republic, IBKR, Degiro) or 'directEUR' (Spanish / Direct EUR)
  const [activeTab, setActiveTab] = useState<'foreign' | 'directEUR'>('foreign');

  const [symbol, setSymbol] = useState(availablePositions[0]?.symbol || 'MSFT');
  const [company, setCompany] = useState(availablePositions[0]?.company || 'Microsoft');
  const [date, setDate] = useState<string>(new Date().toLocaleDateString('es-ES'));

  // Shares management
  const [sharesCount, setSharesCount] = useState<number>(0);
  const [sharesSource, setSharesSource] = useState<'portfolio' | 'single' | 'custom'>('portfolio');

  // ==========================================
  // TAB 1: EXTRACTO EN DIVISA EXTRANJERA (TRADE REPUBLIC / DEGIRO / IBKR)
  // ==========================================
  const [fxCurrency, setFxCurrency] = useState<string>('USD');
  const [fxPerShareUSD, setFxPerShareUSD] = useState<string>('');
  const [fxGrossUSD, setFxGrossUSD] = useState<number>(0);
  const [fxOriginRateUSD, setFxOriginRateUSD] = useState<number>(15);
  const [fxOriginUSD, setFxOriginUSD] = useState<number>(0);
  const [fxRate, setFxRate] = useState<number>(0);
  const [fxDestRate, setFxDestRate] = useState<number>(19);
  const [fxDestEUR, setFxDestEUR] = useState<number>(0);
  const [fxAccountingMethod, setFxAccountingMethod] = useState<'integral' | 'subtotal'>('subtotal');

  // ==========================================
  // TAB 2: EXTRACTO DIRECTO EN EUROS (€)
  // ==========================================
  const [calcMode, setCalcMode] = useState<'perShare' | 'total'>('perShare');
  const [perShareEUR, setPerShareEUR] = useState<string>('');
  const [directGrossEUR, setDirectGrossEUR] = useState<number>(0);

  // Direct EUR Withholding configuration
  const [hasDoubleWithholding, setHasDoubleWithholding] = useState<boolean>(false);
  const [singleWithholdingPercent, setSingleWithholdingPercent] = useState<number>(19);
  const [singleWithholdingEUR, setSingleWithholdingEUR] = useState<number>(0);

  const [originCountry, setOriginCountry] = useState<string>('Estados Unidos (USA)');
  const [originPercent, setOriginPercent] = useState<number>(15);
  const [originEUR, setOriginEUR] = useState<number>(0);

  const [destCountry, setDestCountry] = useState<string>('España (IRPF)');
  const [destPercent, setDestPercent] = useState<number>(19);
  const [destEUR, setDestEUR] = useState<number>(0);

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

  // Reset or populate state when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (dividendToEdit) {
      // MODE EDIT: load the saved data of this specific dividend
      setSymbol(dividendToEdit.symbol);
      setCompany(dividendToEdit.company);
      setDate(dividendToEdit.date);
      const shares = dividendToEdit.shares || 54;
      setSharesCount(shares);
      setSharesSource('custom');

      const isForeign =
        dividendToEdit.symbol.toUpperCase() === 'MSFT' ||
        dividendToEdit.grossForeign != null ||
        dividendToEdit.foreignCurrency != null ||
        dividendToEdit.hasDoubleWithholding;

      if (isForeign) {
        setActiveTab('foreign');
        setFxCurrency(dividendToEdit.foreignCurrency || 'USD');
        const gUSD = dividendToEdit.grossForeign || 0;
        setFxGrossUSD(gUSD);
        setFxPerShareUSD(gUSD > 0 ? (gUSD / (shares || 1)).toFixed(2) : '');
        setFxOriginUSD(dividendToEdit.withholdingOriginForeign || 0);
        setFxOriginRateUSD(dividendToEdit.withholdingOriginPercent ?? 15);
        setFxRate(dividendToEdit.fxRate || 1.1539);
        setFxDestRate(dividendToEdit.withholdingDestinationPercent ?? 19);
        setFxDestEUR(dividendToEdit.withholdingDestinationEUR ?? 0);
      } else {
        setActiveTab('directEUR');
        setDirectGrossEUR(dividendToEdit.grossEUR);
        setPerShareEUR((dividendToEdit.grossEUR / (shares || 1)).toFixed(4));
        setCalcMode('total');
        setSingleWithholdingEUR(dividendToEdit.withholdingEUR);
        setHasDoubleWithholding(false);
      }
      return;
    }

    // MODE NEW DIVIDEND: START COMPLETELY CLEAN / SIN DATOS
    const targetSymbol = prefilledData?.symbol || availablePositions[0]?.symbol || 'MSFT';
    const targetCompany = prefilledData?.company || availablePositions[0]?.company || 'Microsoft';
    setSymbol(targetSymbol);
    setCompany(targetCompany);

    const meta = getSymbolMeta(targetSymbol);
    const isForeignStock = meta.matchPos
      ? meta.matchPos.country !== 'ES'
      : targetSymbol !== 'TEF' && targetSymbol !== 'SAN' && targetSymbol !== 'IBE';

    const totalPortfolioShares = prefilledData?.totalPortfolioShares ?? meta.totalSharesInPortfolio;
    const singleOpShares = prefilledData?.shares ?? 0;
    const purchasesCount = prefilledData?.purchasesCount ?? meta.purchasesCount;

    let initialShares = totalPortfolioShares > 0 ? totalPortfolioShares : (meta.matchPos?.shares || 0);
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
    }

    setSharesCount(initialShares);
    setSharesSource(initialSource);
    setDate(new Date().toLocaleDateString('es-ES'));

    // CLEAN ALL FINANCIAL INPUTS FOR NEW DIVIDEND
    setFxCurrency('USD');
    setFxPerShareUSD('');
    setFxGrossUSD(0);
    setFxOriginRateUSD(15);
    setFxOriginUSD(0);
    setFxRate(0);
    setFxDestRate(19);
    setFxDestEUR(0);
    setFxAccountingMethod('subtotal');

    setCalcMode('perShare');
    setPerShareEUR('');
    setDirectGrossEUR(0);
    setSingleWithholdingPercent(19);
    setSingleWithholdingEUR(0);
    setOriginEUR(0);
    setDestEUR(0);

    if (isForeignStock) {
      setActiveTab('foreign');
    } else {
      setActiveTab('directEUR');
      setHasDoubleWithholding(false);
    }
  }, [isOpen, prefilledData, dividendToEdit]);

  if (!isOpen) return null;

  const currentMeta = getSymbolMeta(symbol);
  const totalPortfolioShares = prefilledData?.totalPortfolioShares ?? currentMeta.totalSharesInPortfolio;
  const singleOpShares = prefilledData?.shares ?? 0;
  const purchasesCount = prefilledData?.purchasesCount ?? currentMeta.purchasesCount;
  const hasMultiplePurchases = purchasesCount > 1 && totalPortfolioShares > 0;

  // ==========================================
  // TAB 1: FOREIGN CURRENCY CALCULATIONS
  // ==========================================
  const handleFxPerShareChange = (valStr: string) => {
    setFxPerShareUSD(valStr);
    if (!valStr.trim()) {
      setFxGrossUSD(0);
      setFxOriginUSD(0);
      setFxDestEUR(0);
      return;
    }
    const val = parseFloat(valStr.replace(',', '.'));
    if (!isNaN(val) && sharesCount > 0) {
      const gUSD = Number((val * sharesCount).toFixed(2));
      setFxGrossUSD(gUSD);
      const oUSD = Number(((gUSD * fxOriginRateUSD) / 100).toFixed(2));
      setFxOriginUSD(oUSD);
      if (fxRate > 0) {
        const subEUR = Number(((gUSD - oUSD) / fxRate).toFixed(2));
        setFxDestEUR(Number(((subEUR * fxDestRate) / 100).toFixed(2)));
      }
    }
  };

  const handleFxGrossChange = (valUSD: number) => {
    setFxGrossUSD(valUSD);
    if (sharesCount > 0 && valUSD > 0) {
      setFxPerShareUSD((valUSD / sharesCount).toFixed(4));
    }
    const oUSD = Number(((valUSD * fxOriginRateUSD) / 100).toFixed(2));
    setFxOriginUSD(oUSD);
    if (fxRate > 0) {
      const subEUR = Number(((valUSD - oUSD) / fxRate).toFixed(2));
      setFxDestEUR(Number(((subEUR * fxDestRate) / 100).toFixed(2)));
    }
  };

  const handleFxOriginRateChange = (pct: number) => {
    setFxOriginRateUSD(pct);
    const oUSD = Number(((fxGrossUSD * pct) / 100).toFixed(2));
    setFxOriginUSD(oUSD);
    if (fxRate > 0 && fxGrossUSD > 0) {
      const subEUR = Number(((fxGrossUSD - oUSD) / fxRate).toFixed(2));
      setFxDestEUR(Number(((subEUR * fxDestRate) / 100).toFixed(2)));
    }
  };

  const handleFxOriginUSDChange = (valUSD: number) => {
    setFxOriginUSD(valUSD);
    if (fxGrossUSD > 0) {
      setFxOriginRateUSD(Number(((valUSD / fxGrossUSD) * 100).toFixed(2)));
    }
    if (fxRate > 0 && fxGrossUSD > 0) {
      const subEUR = Number(((fxGrossUSD - valUSD) / fxRate).toFixed(2));
      setFxDestEUR(Number(((subEUR * fxDestRate) / 100).toFixed(2)));
    }
  };

  const handleFxRateChange = (r: number) => {
    setFxRate(r);
    if (r > 0 && fxGrossUSD > 0) {
      const subEUR = Number(((fxGrossUSD - fxOriginUSD) / r).toFixed(2));
      setFxDestEUR(Number(((subEUR * fxDestRate) / 100).toFixed(2)));
    }
  };

  const handleFxDestRateChange = (pct: number) => {
    setFxDestRate(pct);
    if (fxRate > 0 && fxGrossUSD > 0) {
      const subEUR = Number(((fxGrossUSD - fxOriginUSD) / fxRate).toFixed(2));
      setFxDestEUR(Number(((subEUR * pct) / 100).toFixed(2)));
    }
  };

  // Derived calculations for Tab 1 (Foreign):
  const tab1SubtotalUSD = fxGrossUSD > 0 ? Number((fxGrossUSD - fxOriginUSD).toFixed(2)) : 0;
  const tab1SubtotalEUR = fxRate > 0 && tab1SubtotalUSD > 0 ? Number((tab1SubtotalUSD / fxRate).toFixed(2)) : 0;
  const tab1DestEUR = fxDestEUR;
  const tab1NetEUR = tab1SubtotalEUR > 0 ? Number((tab1SubtotalEUR - tab1DestEUR).toFixed(2)) : 0;
  const tab1OriginEUR = fxRate > 0 && fxOriginUSD > 0 ? Number((fxOriginUSD / fxRate).toFixed(2)) : 0;
  const tab1FullGrossEUR = fxRate > 0 && fxGrossUSD > 0 ? Number((fxGrossUSD / fxRate).toFixed(2)) : 0;
  const tab1TotalWithholdingEUR = Number((tab1OriginEUR + tab1DestEUR).toFixed(2));

  // ==========================================
  // TAB 2: DIRECT EUR CALCULATIONS
  // ==========================================
  const handleDirectPerShareChange = (valStr: string) => {
    setPerShareEUR(valStr);
    if (!valStr.trim()) {
      setDirectGrossEUR(0);
      setSingleWithholdingEUR(0);
      setOriginEUR(0);
      setDestEUR(0);
      return;
    }
    const val = parseFloat(valStr.replace(',', '.'));
    if (!isNaN(val) && sharesCount > 0) {
      const g = Number((val * sharesCount).toFixed(2));
      setDirectGrossEUR(g);
      recalcDirectWithholdings(g, hasDoubleWithholding, originPercent, destPercent, singleWithholdingPercent);
    }
  };

  const handleDirectGrossChange = (newG: number) => {
    setDirectGrossEUR(newG);
    if (sharesCount > 0 && newG > 0) {
      setPerShareEUR((newG / sharesCount).toFixed(4));
    }
    recalcDirectWithholdings(newG, hasDoubleWithholding, originPercent, destPercent, singleWithholdingPercent);
  };

  const recalcDirectWithholdings = (
    gross: number,
    isDouble: boolean,
    origPct: number,
    dPct: number,
    singlePct: number
  ) => {
    if (!isDouble) {
      setSingleWithholdingEUR(Number(((gross * singlePct) / 100).toFixed(2)));
    } else {
      const oE = Number(((gross * origPct) / 100).toFixed(2));
      setOriginEUR(oE);
      const baseDest = Math.max(0, gross - oE);
      setDestEUR(Number(((baseDest * dPct) / 100).toFixed(2)));
    }
  };

  const tab2TotalWithholdingEUR = hasDoubleWithholding
    ? Number((originEUR + destEUR).toFixed(2))
    : Number(singleWithholdingEUR.toFixed(2));

  const tab2NetEUR = directGrossEUR > 0 ? Number((directGrossEUR - tab2TotalWithholdingEUR).toFixed(2)) : 0;

  // Handle shares count change
  const handleSharesCountChange = (newCount: number, source: 'portfolio' | 'single' | 'custom') => {
    setSharesCount(newCount);
    setSharesSource(source);

    // Sync Tab 1
    if (fxPerShareUSD) {
      const pU = parseFloat(fxPerShareUSD.replace(',', '.')) || 0;
      const gUSD = Number((newCount * pU).toFixed(2));
      setFxGrossUSD(gUSD);
      const oUSD = Number(((gUSD * fxOriginRateUSD) / 100).toFixed(2));
      setFxOriginUSD(oUSD);
      if (fxRate > 0) {
        const subEUR = Number(((gUSD - oUSD) / fxRate).toFixed(2));
        setFxDestEUR(Number(((subEUR * fxDestRate) / 100).toFixed(2)));
      }
    }

    // Sync Tab 2
    if (calcMode === 'perShare' && perShareEUR) {
      const pE = parseFloat(perShareEUR.replace(',', '.')) || 0;
      const gE = Number((newCount * pE).toFixed(2));
      setDirectGrossEUR(gE);
      recalcDirectWithholdings(gE, hasDoubleWithholding, originPercent, destPercent, singleWithholdingPercent);
    } else {
      if (newCount > 0 && directGrossEUR > 0) {
        setPerShareEUR((directGrossEUR / newCount).toFixed(4));
      }
    }
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol) return;

    const year = parseYearFromDate(date);

    if (activeTab === 'foreign') {
      const isIntegral = fxAccountingMethod === 'integral';
      const grossToSave = isIntegral ? tab1FullGrossEUR : tab1SubtotalEUR;
      const withToSave = isIntegral ? tab1TotalWithholdingEUR : tab1DestEUR;
      const netToSave = tab1NetEUR;

      onSubmit({
        id: dividendToEdit?.id,
        symbol: symbol.toUpperCase(),
        company,
        grossEUR: grossToSave,
        withholdingEUR: withToSave,
        netEUR: netToSave,
        date,
        year,
        shares: sharesCount,
        hasDoubleWithholding: true,
        withholdingOriginEUR: tab1OriginEUR,
        withholdingOriginPercent: fxOriginRateUSD,
        withholdingOriginCountry: 'Estados Unidos (USA)',
        withholdingDestinationEUR: tab1DestEUR,
        withholdingDestinationPercent: fxDestRate,
        withholdingDestinationCountry: 'España (IRPF)',
        foreignCurrency: fxCurrency,
        grossForeign: fxGrossUSD,
        withholdingOriginForeign: fxOriginUSD,
        fxRate,
      });
    } else {
      onSubmit({
        id: dividendToEdit?.id,
        symbol: symbol.toUpperCase(),
        company,
        grossEUR: directGrossEUR,
        withholdingEUR: tab2TotalWithholdingEUR,
        netEUR: tab2NetEUR,
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
      });
    }

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
                Introduce los datos limpios de tu justificante bancario de Trade Republic, Degiro o broker nacional
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

        {/* TABS DE MODO DE JUSTIFICANTE */}
        <div className="grid grid-cols-2 p-2 bg-slate-950/80 border-b border-slate-800 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('foreign')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'foreign'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50 border border-blue-400/30'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-300 shrink-0" />
            <div className="text-left">
              <div>Justificante en Dólares / Divisa (USD)</div>
              <div className="text-[10px] font-normal opacity-80">Trade Republic · Degiro · IBKR</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('directEUR')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'directEUR'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50 border border-blue-400/30'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-300 shrink-0" />
            <div className="text-left">
              <div>Justificante directo en Euros (€)</div>
              <div className="text-[10px] font-normal opacity-80">IBEX 35 · Renta 4 · Santander</div>
            </div>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Fila 1: Empresa y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Empresa / Activo
              </label>
              {isLocked ? (
                <div className="bg-slate-950 border border-emerald-500/50 rounded-xl p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="font-extrabold text-white font-mono text-sm">{symbol}</span>
                    <span className="text-slate-300 text-xs">· {company}</span>
                  </div>
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              ) : (
                <select
                  value={symbol}
                  onChange={e => {
                    const sym = e.target.value;
                    setSymbol(sym);
                    const meta = getSymbolMeta(sym);
                    if (meta.matchPos) {
                      setCompany(meta.matchPos.company);
                      const isForeign = meta.matchPos.country !== 'ES';
                      setActiveTab(isForeign ? 'foreign' : 'directEUR');
                      if (meta.totalSharesInPortfolio > 0) {
                        setSharesCount(meta.totalSharesInPortfolio);
                      }
                    }
                  }}
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

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Fecha de Pago / Liquidación
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
          </div>

          {/* Títulos / Acciones que cobran dividendo */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Número de acciones con derecho a dividendo (CANTIDAD):</span>
              </span>
              {hasMultiplePurchases && (
                <span className="text-[11px] text-cyan-300 font-medium">
                  {purchasesCount} compras registradas
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
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
                  placeholder="Número de acciones"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                  Acciones
                </span>
              </div>

              {hasMultiplePurchases && (
                <button
                  type="button"
                  onClick={() => handleSharesCountChange(totalPortfolioShares, 'portfolio')}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Usar todas ({totalPortfolioShares} acc.)
                </button>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: FORMULARIO EXACTO ESTILO JUSTIFICANTE TRADE REPUBLIC */}
          {/* ======================================================== */}
          {activeTab === 'foreign' ? (
            <div className="bg-slate-950/90 border border-indigo-500/40 rounded-xl p-4 space-y-3.5 shadow-inner">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-800/40">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                  <span className="font-bold text-white text-xs">
                    Datos del Justificante (Trade Republic / Extracto en USD)
                  </span>
                </div>
                <span className="text-[11px] text-emerald-400 font-mono font-bold">
                  {fxGrossUSD > 0
                    ? `${sharesCount} accs × ${fxPerShareUSD || '0'} $ = ${formatNumber(fxGrossUSD)} USD`
                    : 'Introduce los datos del extracto'}
                </span>
              </div>

              {/* Fila A: Rendimiento por acción y Bruto Total en USD */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-cyan-300 mb-1">
                    1. Rendimiento por acción (RENDIMIENTO)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.0001"
                      value={fxPerShareUSD}
                      onChange={e => handleFxPerShareChange(e.target.value)}
                      placeholder="0.00 (ej. 0.91)"
                      className="w-full bg-slate-900 border border-cyan-500/60 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-cyan-400 pointer-events-none">
                      USD ($)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Rendimiento por título según extracto
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    2. Total Rendimiento Bruto en USD (TOTAL)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={fxGrossUSD ? fxGrossUSD : ''}
                      onChange={e => handleFxGrossChange(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-emerald-400 font-mono font-bold focus:outline-none focus:border-blue-500"
                      placeholder="0.00"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                      USD ($)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {fxGrossUSD > 0
                      ? `${sharesCount} acc. × ${fxPerShareUSD || '0'} $ = ${formatNumber(fxGrossUSD)} USD`
                      : 'Total bruto en divisa (se calcula solo o introdúcelo)'}
                  </span>
                </div>
              </div>

              {/* Fila B: Retención USA y Subtotal en USD */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-amber-300 mb-1">
                    3. Retención USA W-8BEN (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={fxOriginRateUSD || ''}
                      onChange={e => handleFxOriginRateChange(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                      placeholder="15"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                      %
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">Estándar 15% con W-8BEN</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-amber-300 mb-1">
                    Retención USA en USD
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={fxOriginUSD ? fxOriginUSD : ''}
                      onChange={e => handleFxOriginUSDChange(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3 py-2 text-sm text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                      placeholder="0.00"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-400 pointer-events-none">
                      USD ($)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {fxOriginUSD > 0 ? `Retenido: -${formatNumber(fxOriginUSD)} USD` : 'Retención origen practicada'}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Subtotal tras retención USA
                  </label>
                  <div className="h-10 px-3 flex items-center bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white font-mono font-bold">
                    {tab1SubtotalUSD > 0 ? `${formatNumber(tab1SubtotalUSD)} USD` : '0.00 USD'}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Subtotal en divisa
                  </span>
                </div>
              </div>

              {/* Fila C: Conversión a Euros, Retención en España (IRPF) y TOTAL NETO */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-indigo-300 mb-1">
                    4. Tipo de cambio
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.0001"
                      value={fxRate ? fxRate : ''}
                      onChange={e => handleFxRateChange(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-indigo-500/50 rounded-xl px-2.5 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-indigo-400"
                      placeholder="Ej. 1.0850"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                      $/€
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {fxRate > 0 ? `Tipo: ${fxRate}` : 'Tipo de cambio broker'}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Subtotal en EUR
                  </label>
                  <div className="h-9 px-2.5 flex items-center bg-slate-950 border border-slate-800 rounded-xl text-xs text-cyan-300 font-mono font-extrabold">
                    {formatNumber(tab1SubtotalEUR)} €
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Base liquidable España
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-rose-300 mb-1">
                    5. IRPF España (19%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={fxDestEUR ? fxDestEUR : ''}
                      onChange={e => setFxDestEUR(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-rose-500/50 rounded-xl px-2.5 py-2 text-xs text-rose-400 font-mono font-bold focus:outline-none focus:border-rose-400"
                      placeholder="0.00"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-rose-400 pointer-events-none">
                      €
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {fxDestEUR > 0 ? `-${formatNumber(fxDestEUR)} €` : '19% IRPF'}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-emerald-300 mb-1">
                    6. TOTAL NETO (Arriba)
                  </label>
                  <div className="h-9 px-2.5 flex items-center bg-emerald-950/40 border border-emerald-500/60 rounded-xl text-sm text-emerald-400 font-mono font-black shadow-inner">
                    {formatEUR(tab1NetEUR)}
                  </div>
                  <span className="text-[10px] text-emerald-400 block mt-0.5 font-mono">
                    {tab1SubtotalEUR > 0 ? `${formatNumber(tab1SubtotalEUR)} - ${formatNumber(tab1DestEUR)} = ${formatNumber(tab1NetEUR)} €` : 'Neto a cobrar'}
                  </span>
                </div>
              </div>

              {/* Selector de modo de presentación del Bruto */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-bold text-white block">
                    Modo de contabilización del dividendo en cartera:
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Elige cómo quieres ver el bruto en la tabla de tu cartera:
                  </span>
                </div>

                <div className="flex bg-slate-900 border border-slate-700 rounded-xl p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setFxAccountingMethod('subtotal')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      fxAccountingMethod === 'subtotal'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Exacto Trade Republic {tab1SubtotalEUR > 0 ? `(${formatNumber(tab1SubtotalEUR)} €)` : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFxAccountingMethod('integral')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      fxAccountingMethod === 'integral'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Bruto Íntegro AEAT {tab1FullGrossEUR > 0 ? `(${formatNumber(tab1FullGrossEUR)} €)` : ''}
                  </button>
                </div>
              </div>

              {/* RESUMEN LIQUIDACIÓN: CUADRE 100% ENTRE ARRIBA Y ABAJO */}
              {tab1NetEUR === 0 && fxGrossUSD === 0 ? (
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-center space-y-1">
                  <span className="text-slate-400 text-xs">
                    Introduce el rendimiento por acción o el bruto de tu extracto arriba para calcular el neto.
                  </span>
                  <div className="text-emerald-400 font-mono font-bold text-lg">0,00 €</div>
                </div>
              ) : fxAccountingMethod === 'subtotal' ? (
                /* MODO 1: EXACTO TRADE REPUBLIC (SUBTOTAL - IRPF = NETO) */
                <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-3.5 space-y-2 shadow-inner">
                  <div className="flex justify-between text-slate-300">
                    <span>Dividendo Bruto Liquidado en España (Subtotal extracto):</span>
                    <span className="font-extrabold text-white font-mono text-sm">{formatNumber(tab1SubtotalEUR)} €</span>
                  </div>
                  <div className="flex justify-between text-rose-400 pl-3">
                    <span>↳ Retención IRPF España (19% sobre {formatNumber(tab1SubtotalEUR)} €):</span>
                    <span className="font-mono font-bold">-{formatNumber(tab1DestEUR)} €</span>
                  </div>
                  <div className="flex justify-between text-amber-300/80 pl-3 text-[11px] border-t border-slate-800/60 pt-1">
                    <span>↳ Retención soportada en origen USA (15% · {formatNumber(fxOriginUSD)} $):</span>
                    <span className="font-mono">-{formatNumber(tab1OriginEUR)} € (guardada para la deducción en la Renta)</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-400 font-bold text-sm border-t border-slate-800 pt-2">
                    <div>
                      <span className="text-white">TOTAL NETO INGRESADO EN CUENTA (Abajo):</span>
                      <span className="block text-[10px] text-emerald-300 font-normal">
                        {formatNumber(tab1SubtotalEUR)} € - {formatNumber(tab1DestEUR)} € = {formatNumber(tab1NetEUR)} € (¡Coincide 100% arriba y abajo!)
                      </span>
                    </div>
                    <span className="font-mono text-xl font-black text-emerald-400">
                      {formatEUR(tab1NetEUR)}
                    </span>
                  </div>
                </div>
              ) : (
                /* MODO 2: BRUTO ÍNTEGRO */
                <div className="bg-slate-950 border border-blue-500/40 rounded-xl p-3.5 space-y-2 shadow-inner">
                  <div className="flex justify-between text-slate-300">
                    <span>Rendimiento Bruto Íntegro ({sharesCount} accs × {fxPerShareUSD || '0'} $ / {fxRate || 1}):</span>
                    <span className="font-extrabold text-white font-mono text-sm">{formatNumber(tab1FullGrossEUR)} €</span>
                  </div>
                  <div className="flex justify-between text-amber-300/90 pl-3">
                    <span>↳ Retención en Origen USA (15% · {formatNumber(fxOriginUSD)} USD):</span>
                    <span className="font-mono font-semibold">-{formatNumber(tab1OriginEUR)} €</span>
                  </div>
                  <div className="flex justify-between text-slate-300 pl-3">
                    <span>↳ Subtotal en España antes de IRPF:</span>
                    <span className="font-mono text-cyan-300 font-semibold">{formatNumber(tab1SubtotalEUR)} €</span>
                  </div>
                  <div className="flex justify-between text-rose-400 pl-3">
                    <span>↳ Retención en Destino España (19% IRPF AEAT):</span>
                    <span className="font-mono font-semibold">-{formatNumber(tab1DestEUR)} €</span>
                  </div>
                  <div className="flex justify-between text-rose-400 font-bold border-t border-slate-800/80 pt-1">
                    <span>Total Retenciones Soportadas (USA + España):</span>
                    <span className="font-mono">-{formatNumber(tab1TotalWithholdingEUR)} €</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-400 font-bold text-sm border-t border-slate-800 pt-2">
                    <div>
                      <span className="text-white">TOTAL NETO INGRESADO EN CUENTA (Abajo):</span>
                      <span className="block text-[10px] text-emerald-300 font-normal">
                        {formatNumber(tab1FullGrossEUR)} € bruto - {formatNumber(tab1TotalWithholdingEUR)} € retenciones = {formatNumber(tab1NetEUR)} €
                      </span>
                    </div>
                    <span className="font-mono text-xl font-black text-emerald-400">
                      {formatEUR(tab1NetEUR)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ======================================================== */
            /* TAB 2: FORMULARIO DIRECTO EN EUROS (€)                     */
            /* ======================================================== */
            <div className="space-y-4">
              {/* Modo de cálculo en euros */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-300">
                  ¿Cómo quieres introducir el dividendo?
                </span>
                <div className="flex bg-slate-900 border border-slate-700 rounded-xl p-0.5">
                  <button
                    type="button"
                    onClick={() => setCalcMode('perShare')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      calcMode === 'perShare'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    € por acción
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcMode('total')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      calcMode === 'total'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Total bruto en €
                  </button>
                </div>
              </div>

              {calcMode === 'perShare' ? (
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-cyan-500/30 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-cyan-300 mb-1">
                      Dividendo bruto por título (€/acc)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.0001"
                        value={perShareEUR}
                        onChange={e => handleDirectPerShareChange(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-900 border border-cyan-500/50 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                        €
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Total Bruto ({sharesCount} acc × {perShareEUR || '0'} €)
                    </label>
                    <div className="h-10 px-3 flex items-center bg-slate-900 border border-slate-700 rounded-xl text-sm text-emerald-400 font-extrabold font-mono">
                      {formatEUR(directGrossEUR)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Dividendo Bruto Total en Euros (€)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={directGrossEUR ? directGrossEUR : ''}
                      onChange={e => handleDirectGrossChange(Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                      €
                    </span>
                  </div>
                </div>
              )}

              {/* Retención fiscal en euros */}
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Retención Fiscal</span>
                  <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setHasDoubleWithholding(false)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                        !hasDoubleWithholding ? 'bg-blue-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      1 País (España 19%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasDoubleWithholding(true)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                        hasDoubleWithholding ? 'bg-emerald-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Doble Retención
                    </button>
                  </div>
                </div>

                {!hasDoubleWithholding ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Porcentaje (%)
                      </label>
                      <input
                        type="number"
                        value={singleWithholdingPercent}
                        onChange={e => {
                          const p = parseFloat(e.target.value) || 0;
                          setSingleWithholdingPercent(p);
                          setSingleWithholdingEUR(Number(((directGrossEUR * p) / 100).toFixed(2)));
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Importe retenido (€)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={singleWithholdingEUR ? singleWithholdingEUR : ''}
                        onChange={e => setSingleWithholdingEUR(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-rose-400 font-mono font-bold"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-2.5 bg-slate-900 rounded-xl border border-amber-500/30">
                      <div className="text-amber-300 font-bold text-xs mb-1">Retención Origen (USA 15%):</div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={originPercent}
                          onChange={e => {
                            const p = parseFloat(e.target.value) || 0;
                            setOriginPercent(p);
                            setOriginEUR(Number(((directGrossEUR * p) / 100).toFixed(2)));
                          }}
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                        />
                        <input
                          type="number"
                          step="any"
                          value={originEUR ? originEUR : ''}
                          onChange={e => setOriginEUR(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-300 font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-900 rounded-xl border border-rose-500/30">
                      <div className="text-rose-300 font-bold text-xs mb-1">Retención Destino (España 19%):</div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={destPercent}
                          onChange={e => {
                            const p = parseFloat(e.target.value) || 0;
                            setDestPercent(p);
                            const base = Math.max(0, directGrossEUR - originEUR);
                            setDestEUR(Number(((base * p) / 100).toFixed(2)));
                          }}
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                        />
                        <input
                          type="number"
                          step="any"
                          value={destEUR ? destEUR : ''}
                          onChange={e => setDestEUR(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-rose-300 font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-300">Neto a percibir:</span>
                  <span className="text-emerald-400 font-mono text-base">{formatEUR(tab2NetEUR)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Botones de acción */}
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
              <span>
                {isEditing
                  ? 'Guardar Cambios'
                  : `Guardar Dividendo (${formatEUR(activeTab === 'foreign' ? tab1NetEUR : tab2NetEUR)})`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
