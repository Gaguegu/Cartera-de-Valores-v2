import React, { useState, useMemo } from 'react';
import { StockPosition, Operation } from '../types/portfolio';
import { formatEUR, formatNumber, formatPercent, downloadCSV, parseYearFromDate, getAvailableFiscalYears } from '../utils/formatters';
import { Search, Download, Filter, MoreVertical, Plus, ArrowUpDown, ExternalLink, Coins, ArrowUpRight, Printer, Calendar, RefreshCw, Scale, Globe, Bell, Sparkles } from 'lucide-react';

interface CurrentPortfolioProps {
  positions: StockPosition[];
  operations?: Operation[];
  onSelectStock: (stock: StockPosition) => void;
  onOpenNewOperation: (symbol?: string) => void;
  onOpenNewDividend?: () => void;
  onRegisterDividendForStock?: (stock: StockPosition) => void;
  onSellStock?: (stock: StockPosition) => void;
  onOpenPrintReport?: (
    type: 'portfolio' | 'full' | 'annual' | 'tax',
    options?: { charts?: boolean; dividends?: boolean; closed?: boolean; year?: number | string }
  ) => void;
  onRefreshQuotesOnline?: () => Promise<void>;
  isRefreshingQuotes?: boolean;
  lastQuotesUpdatedAt?: string;
  onOpenRebalanceModal?: () => void;
  onOpenAlertsModal?: (symbol?: string) => void;
  onOpenCurrencyModal?: () => void;
}

export function CurrentPortfolio({
  positions,
  operations = [],
  onSelectStock,
  onOpenNewOperation,
  onOpenNewDividend,
  onRegisterDividendForStock,
  onSellStock,
  onOpenPrintReport,
  onRefreshQuotesOnline,
  isRefreshingQuotes = false,
  lastQuotesUpdatedAt,
  onOpenRebalanceModal,
  onOpenAlertsModal,
  onOpenCurrencyModal,
}: CurrentPortfolioProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('TODOS');
  const [selectedCountry, setSelectedCountry] = useState<string>('TODOS');
  const [selectedSector, setSelectedSector] = useState<string>('TODOS');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<keyof StockPosition>('currentValueEUR');
  const [sortAsc, setSortAsc] = useState(false);

  // Años dinámicos disponibles en compras de la cartera (2026, 2025, etc.)
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(2026);
    yearsSet.add(2025);
    (operations || []).forEach(o => {
      if (o.type === 'Compra') {
        const y = parseYearFromDate(o.date);
        if (y > 1900) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [operations]);

  // Helper para obtener los años de compra de un valor
  const getPositionYearsInfo = (symbol: string) => {
    const symbolPurchases = (operations || []).filter(
      o => o.symbol.toUpperCase() === symbol.toUpperCase() && o.type === 'Compra'
    );
    if (symbolPurchases.length === 0) {
      return { years: [2026], dates: [] };
    }
    const years = Array.from(new Set(symbolPurchases.map(o => parseYearFromDate(o.date)))).sort();
    const dates = symbolPurchases.map(o => o.date);
    return { years, dates };
  };

  // Filtering
  const filtered = positions.filter(pos => {
    const matchesSearch =
      pos.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pos.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCountry = selectedCountry === 'TODOS' || pos.country === selectedCountry;
    const matchesSector = selectedSector === 'TODOS' || pos.sector === selectedSector;

    // Filtro por año de compra
    let matchesYear = true;
    if (selectedYear !== 'TODOS') {
      const yearNum = parseInt(selectedYear, 10);
      const symbolPurchases = (operations || []).filter(
        o => o.symbol.toUpperCase() === pos.symbol.toUpperCase() && o.type === 'Compra'
      );
      if (symbolPurchases.length > 0) {
        matchesYear = symbolPurchases.some(o => parseYearFromDate(o.date) === yearNum);
      } else {
        // Posiciones demo iniciales sin apunte explícito se consideran del ejercicio actual (2026)
        matchesYear = yearNum === 2026;
      }
    }

    return matchesSearch && matchesCountry && matchesSector && matchesYear;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortAsc ? aVal - bVal : bVal - aVal;
    }
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return 0;
  });

  const totalValueEUR = filtered.reduce((acc, p) => acc + p.currentValueEUR, 0);
  const totalGainEUR = filtered.reduce((acc, p) => acc + p.gainLossEUR, 0);
  const totalCost = totalValueEUR - totalGainEUR;
  const totalPercent = totalCost > 0 ? (totalGainEUR / totalCost) * 100 : 0;

  // Helper para calcular el coste invertido total en compras de una posición incluyendo comisiones de compra
  const getPositionInvestedCost = (pos: StockPosition) => {
    const symbolPurchases = (operations || []).filter(
      o => o.symbol.toUpperCase() === pos.symbol.toUpperCase() && o.type === 'Compra'
    );
    if (symbolPurchases.length > 0) {
      const totalBoughtShares = symbolPurchases.reduce((acc, o) => acc + (o.shares || 0), 0);
      const totalCostWithComm = symbolPurchases.reduce(
        (acc, o) => acc + (o.shares || 0) * (o.price || 0) + (o.commissionEUR || 0),
        0
      );
      if (totalBoughtShares > 0) {
        return Number(((totalCostWithComm / totalBoughtShares) * pos.shares).toFixed(2));
      }
    }
    const unitPrice = pos.pmcWithCommission && pos.pmcWithCommission > 0 ? pos.pmcWithCommission : pos.buyPrice;
    const base = pos.shares * unitPrice;
    const comm = (!pos.pmcWithCommission && pos.totalCommissionEUR) ? pos.totalCommissionEUR : 0;
    return Number((base + comm).toFixed(2));
  };

  // Dinero total invertido en la cartera (compras con comisiones de compra incluidas)
  const totalInvestedWithCommission = useMemo(() => {
    return filtered.reduce((acc, p) => acc + getPositionInvestedCost(p), 0);
  }, [filtered, operations]);

  const totalPortfolioInvestedWithCommission = useMemo(() => {
    return positions.reduce((acc, p) => acc + getPositionInvestedCost(p), 0);
  }, [positions, operations]);

  const handleExportCSV = () => {
    const headers = [
      'Símbolo',
      'Empresa',
      'País',
      'Divisa',
      'Cantidad',
      'Precio Compra (€)',
      'Precio Actual',
      'Valor Total (€)',
      'Plusvalía (€)',
      'Plusvalía (%)',
      'Sector',
    ];
    const rows = sorted.map(p => [
      p.symbol,
      p.company,
      p.country,
      p.currency,
      p.shares,
      p.buyPrice,
      p.currentPrice,
      p.currentValueEUR,
      p.gainLossEUR,
      p.gainLossPercent,
      p.sector,
    ]);
    downloadCSV('Cartera_Valores_Actual.csv', rows, headers);
  };

  const countries = Array.from(new Set(positions.map(p => p.country)));
  const sectors = Array.from(new Set(positions.map(p => p.sector)));

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Action and Filter Bar - Screen 2 Header (Fijo en la parte superior) */}
      <div className="sticky top-0 z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#12233f] p-4 rounded-2xl border border-slate-700/80 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Selector rápido de ejercicio / año de compra */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs shadow-inner">
            <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-slate-400 font-medium hidden sm:inline">Año compra:</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-xs"
              title="Filtrar cartera por año de compra de las acciones"
            >
              <option value="TODOS" className="bg-slate-900 text-white">Todos los años</option>
              {availableYears.map(yr => (
                <option key={yr} value={String(yr)} className="bg-slate-900 text-white">
                  Año {yr}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
              showFilters
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros</span>
          </button>

          <button
            onClick={() => {
              if (onOpenPrintReport) {
                onOpenPrintReport('portfolio');
              } else {
                window.print();
              }
            }}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
            title="Generar informe en PDF o imprimir la cartera"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            <span>Generar PDF/Imprimir</span>
          </button>

          <button
            onClick={() => onOpenNewOperation()}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nueva compra</span>
          </button>

          {onOpenNewDividend && (
            <button
              onClick={onOpenNewDividend}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-500/40 text-emerald-200 hover:text-white flex items-center gap-1.5 transition-all shadow cursor-pointer"
              title="Registrar cobro de dividendo"
            >
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Registrar dividendo</span>
            </button>
          )}

          {onRefreshQuotesOnline && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onRefreshQuotesOnline()}
                disabled={isRefreshingQuotes}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-200 hover:text-white flex items-center gap-1.5 transition-all shadow cursor-pointer active:scale-95 disabled:opacity-60"
                title={lastQuotesUpdatedAt ? `Actualizar precios en vivo (Última sincronización: ${lastQuotesUpdatedAt})` : 'Actualizar todas las cotizaciones de la cartera en tiempo real'}
              >
                <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshingQuotes ? 'animate-spin' : ''}`} />
                <span>{isRefreshingQuotes ? 'Actualizando...' : 'Actualizar Cotizaciones'}</span>
              </button>
              {lastQuotesUpdatedAt && (
                <span className="hidden xl:inline-flex items-center px-2 py-1 rounded-lg bg-slate-900/90 border border-slate-700/60 text-[10px] text-slate-400 font-mono" title={`Última actualización de cotizaciones: ${lastQuotesUpdatedAt}`}>
                  {lastQuotesUpdatedAt}
                </span>
              )}
            </div>
          )}

          {onOpenRebalanceModal && (
            <button
              onClick={onOpenRebalanceModal}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-200 hover:text-white flex items-center gap-1.5 transition-all shadow cursor-pointer"
              title="Simulador de rebalanceo y cálculo de compras periódicas (DCA)"
            >
              <Scale className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline">Rebalanceo DCA</span>
            </button>
          )}

          {onOpenCurrencyModal && (
            <button
              onClick={onOpenCurrencyModal}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition-all shadow cursor-pointer"
              title="Análisis del efecto divisa EUR/USD y tipos de cambio"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden lg:inline">Efecto Divisa</span>
            </button>
          )}

          {onOpenAlertsModal && (
            <button
              onClick={() => onOpenAlertsModal()}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-200 hover:text-white flex items-center gap-1.5 transition-all shadow cursor-pointer"
              title="Centro de alertas de precio, stop-loss y take-profit"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Alertas</span>
            </button>
          )}
        </div>

        {/* Search bar */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar valor..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Expandable Filter drawer */}
      {showFilters && (
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs animate-in slide-in-from-top-2">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Filtrar por País:</label>
            <select
              value={selectedCountry}
              onChange={e => setSelectedCountry(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
            >
              <option value="TODOS">Todos los países</option>
              {countries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Filtrar por Sector:</label>
            <select
              value={selectedSector}
              onChange={e => setSelectedSector(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
            >
              <option value="TODOS">Todos los sectores</option>
              {sectors.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Main Table - Screen 2 */}
      <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-270px)] overflow-y-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-[#0e1b30] text-slate-400 font-semibold border-b border-slate-700/80 select-none shadow-md">
              <tr>
                <th
                  onClick={() => {
                    setSortField('symbol');
                    setSortAsc(!sortAsc);
                  }}
                  className="sticky top-0 z-10 bg-[#0e1b30] py-3.5 px-4 cursor-pointer hover:text-white border-b border-slate-700/80"
                >
                  <div className="flex items-center gap-1">
                    <span>Símbolo</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField('company');
                    setSortAsc(!sortAsc);
                  }}
                  className="sticky top-0 z-10 bg-[#0e1b30] py-3.5 px-4 cursor-pointer hover:text-white border-b border-slate-700/80"
                >
                  <div className="flex items-center gap-1">
                    <span>Empresa</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="sticky top-0 z-10 bg-[#0e1b30] py-3.5 px-3 border-b border-slate-700/80">País</th>
                <th className="sticky top-0 z-10 bg-[#0e1b30] py-3.5 px-3 border-b border-slate-700/80">Divisa</th>
                <th className="sticky top-0 z-10 bg-[#0e1b30] py-3.5 px-4 text-right border-b border-slate-700/80">Cantidad</th>
                <th className="sticky top-0 z-10 bg-[#0e1b30] py-3.5 px-4 text-right border-b border-slate-700/80">Precio compra (€)</th>
                <th className="sticky top-0 z-10 bg-[#0e1b30] py-3.5 px-4 text-right border-b border-slate-700/80">Precio actual (€)</th>
                <th
                  onClick={() => {
                    setSortField('currentValueEUR');
                    setSortAsc(!sortAsc);
                  }}
                  className="sticky top-0 z-10 bg-[#0e1b30] py-3.5 px-4 text-right cursor-pointer hover:text-white border-b border-slate-700/80"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Valor (€)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField('gainLossPercent');
                    setSortAsc(!sortAsc);
                  }}
                  className="sticky top-0 z-10 bg-[#0e1b30] py-3.5 px-4 text-right cursor-pointer hover:text-white border-b border-slate-700/80"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Plusvalía %</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="sticky top-0 z-10 bg-[#0e1b30] py-3.5 px-3 text-center border-b border-slate-700/80">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sorted.map(pos => (
                <tr
                  key={pos.id}
                  onClick={() => onSelectStock(pos)}
                  className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                >
                  {/* Símbolo */}
                  <td className="py-3.5 px-4 font-bold text-white">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: pos.color || '#3b82f6' }}
                      />
                      <span className="font-mono tracking-wide">{pos.symbol}</span>
                    </div>
                  </td>

                  {/* Empresa */}
                  <td className="py-3.5 px-4 text-slate-200 font-medium">
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-semibold text-white">{pos.company}</span>
                      {(() => {
                        const posCost = getPositionInvestedCost(pos);
                        const pctOfTotal = totalPortfolioInvestedWithCommission > 0
                          ? (posCost / totalPortfolioInvestedWithCommission) * 100
                          : 0;
                        return (
                          <span
                            className="text-[10px] inline-flex items-center gap-1 font-mono rounded px-1.5 py-0.5 font-bold bg-blue-950/70 text-blue-300 border border-blue-500/30"
                            title={`Coste de compra con comisiones: ${formatEUR(posCost)} (${formatNumber(pctOfTotal, 2)}% del total invertido en compras)`}
                          >
                            <span>{formatNumber(pctOfTotal, 2)}% de compras</span>
                          </span>
                        );
                      })()}
                    </div>
                  </td>

                  {/* País */}
                  <td className="py-3.5 px-3 text-slate-400 font-semibold">
                    {pos.country}
                  </td>

                  {/* Divisa */}
                  <td className="py-3.5 px-3 text-slate-400 font-mono">
                    {pos.currency}
                  </td>

                  {/* Cantidad */}
                  <td className="py-3.5 px-4 text-right font-medium text-white">
                    {pos.shares}
                  </td>

                  {/* Precio compra (€) */}
                  <td className="py-3.5 px-4 text-right text-slate-300 font-mono">
                    {formatNumber(pos.buyPrice)} €
                  </td>

                  {/* Precio actual (€) y dólares solo a título informativo */}
                  <td className="py-3.5 px-4 text-right text-slate-200 font-mono font-medium">
                    <div>{formatNumber(pos.currentPrice)} €</div>
                    {pos.dayChangePercent !== undefined && pos.dayChangePercent !== 0 && (
                      <div className="mt-0.5">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            pos.dayChangePercent > 0
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                          }`}
                          title="Variación hoy de la cotización en mercado"
                        >
                          {pos.dayChangePercent > 0 ? `+${pos.dayChangePercent.toFixed(2)}% hoy` : `${pos.dayChangePercent.toFixed(2)}% hoy`}
                        </span>
                      </div>
                    )}
                    {pos.priceUSD && Math.abs(pos.priceUSD - pos.currentPrice) > 0.05 && (
                      <div className="text-[10px] text-slate-400 font-normal" title="Cotización original en dólares (a título informativo)">
                        ({formatNumber(pos.priceUSD)} $)
                      </div>
                    )}
                  </td>

                  {/* Valor (€) - Color neutro blanco (no verde, para no confundir con plusvalías) */}
                  <td className="py-3.5 px-4 text-right font-bold text-white font-mono">
                    {formatEUR(pos.currentValueEUR)}
                  </td>

                  {/* Plusvalía % y € (Pérdidas estrictamente en rojo, ganancias en verde) */}
                  <td
                    className={`py-3.5 px-4 text-right font-bold font-mono ${
                      (pos.gainLossEUR !== undefined && pos.gainLossEUR < 0) || pos.gainLossPercent < 0
                        ? 'text-red-500'
                        : pos.gainLossPercent > 0
                        ? 'text-emerald-400'
                        : 'text-slate-300'
                    }`}
                  >
                    <div>{formatPercent(pos.gainLossPercent)}</div>
                    {typeof pos.gainLossEUR === 'number' && (
                      <div
                        className={`text-[11px] font-semibold ${
                          pos.gainLossEUR < 0
                            ? 'text-red-400'
                            : pos.gainLossEUR > 0
                            ? 'text-emerald-400/90'
                            : 'text-slate-400'
                        }`}
                      >
                        {pos.gainLossEUR > 0 ? `+${formatEUR(pos.gainLossEUR)}` : formatEUR(pos.gainLossEUR)}
                      </div>
                    )}
                  </td>

                  {/* Options */}
                  <td className="py-3.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {onOpenAlertsModal && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onOpenAlertsModal(pos.symbol);
                          }}
                          className="p-1.5 rounded-lg text-amber-400 hover:text-white hover:bg-amber-500/20 transition-colors cursor-pointer"
                          title={`Fijar alerta de precio / stop-loss para ${pos.symbol}`}
                        >
                          <Bell className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onSellStock && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onSellStock(pos);
                          }}
                          className="px-2 py-1 rounded-lg text-amber-400 hover:text-white bg-amber-500/10 hover:bg-amber-600/80 border border-amber-500/30 flex items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer shadow-sm"
                          title={`Vender acciones de ${pos.company} (${pos.shares} títulos disponibles)`}
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Vender</span>
                        </button>
                      )}
                      {onRegisterDividendForStock && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onRegisterDividendForStock(pos);
                          }}
                          className="px-2 py-1 rounded-lg text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-600/80 border border-emerald-500/30 flex items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer shadow-sm"
                          title={`Registrar dividendo cobrado de ${pos.company} (${pos.shares} títulos)`}
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Dividendo</span>
                        </button>
                      )}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onSelectStock(pos);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/80 transition-colors cursor-pointer"
                        title="Ver detalle"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {sorted.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold text-slate-300">
                      No hay posiciones abiertas para los filtros seleccionados
                      {selectedYear !== 'TODOS' ? ` (Año de compra ${selectedYear})` : ''}.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Selecciona "Todos los años" en el filtro de arriba para ver toda tu cartera abierta.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary - Screen 2 Footer: Total compras con comisiones y Total cartera */}
        <div className="p-4 bg-[#0e1b30] border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="text-slate-400">
            Mostrando <span className="text-white font-bold">{sorted.length}</span> de{' '}
            <span className="text-white font-bold">{positions.length}</span> posiciones abiertas
            {selectedYear !== 'TODOS' && (
              <span className="ml-1.5 text-cyan-400 font-semibold">(Filtrado por compras de {selectedYear})</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm">
            {/* Total Invertido en Compras (con comisiones de compra) */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">
                Total compras (con comisiones):
              </span>
              <span className="text-base font-extrabold text-blue-300 font-mono">
                {formatEUR(totalInvestedWithCommission)}
              </span>
            </div>

            {/* Total Valoración Actual Cartera */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">
                {selectedYear !== 'TODOS' ? `Valor actual (${selectedYear}):` : 'Valor actual cartera:'}
              </span>
              <span className="text-xl font-extrabold text-white font-mono">
                {formatEUR(totalValueEUR)}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-md font-bold text-xs font-mono ${
                  totalPercent >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-500'
                }`}
                title={`Plusvalía latente total: ${totalGainEUR > 0 ? `+${formatEUR(totalGainEUR)}` : formatEUR(totalGainEUR)}`}
              >
                {formatPercent(totalPercent)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
