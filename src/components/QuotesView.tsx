import React, { useState, useEffect, useMemo } from 'react';
import { MarketQuote, StockPosition, WatchlistItem } from '../types/portfolio';
import { formatNumber, formatPercent, formatEUR } from '../utils/formatters';
import {
  fetchLiveIndices,
  searchMarketQuotes,
  fetchBatchQuotes,
  MarketIndex,
} from '../services/quotesService';
import {
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Globe,
  Briefcase,
  Star,
  Plus,
  Check,
  ExternalLink,
  Sparkles,
  ArrowUpDown,
  SlidersHorizontal,
  Info,
} from 'lucide-react';

interface QuotesViewProps {
  positions: StockPosition[];
  watchlist: WatchlistItem[];
  onUpdatePortfolioPrices: (quotesMap: Record<string, { currentPriceEUR: number; priceUSD?: number; dayChangePercent?: number }>) => void;
  onUpdateWatchlistPrices: (quotesMap: Record<string, { currentPrice: number }>) => void;
  onOpenNewOperation: (symbol?: string, type?: 'Compra' | 'Venta', company?: string, price?: number) => void;
  onAddToWatchlist: (item: Omit<WatchlistItem, 'id'>) => void;
}

export function QuotesView({
  positions,
  watchlist,
  onUpdatePortfolioPrices,
  onUpdateWatchlistPrices,
  onOpenNewOperation,
  onAddToWatchlist,
}: QuotesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<'TODOS' | 'EEUU' | 'ESPAÑA' | 'EUROPA' | 'CARTERA' | 'SEGUIMIENTO'>('TODOS');
  const [quotes, setQuotes] = useState<MarketQuote[]>([]);
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingPortfolio, setIsUpdatingPortfolio] = useState(false);
  const [isUpdatingWatchlist, setIsUpdatingWatchlist] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'changePercent' | 'price' | 'company'>('changePercent');
  const [sortAsc, setSortAsc] = useState(false);

  // Cargar índices y cotizaciones en vivo al iniciar
  useEffect(() => {
    loadIndices();
    refreshTopQuotes();
  }, []);

  const loadIndices = async () => {
    const data = await fetchLiveIndices();
    setIndices(data);
  };

  const refreshTopQuotes = async () => {
    try {
      const topSymbols = ['SAN', 'ITX', 'IBE', 'BBVA', 'CABK', 'REP', 'TEF', 'RED', 'NTGY', 'GRF', 'BKT', 'VIS', 'AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'GOOGL'];
      const batch = await fetchBatchQuotes(topSymbols);
      if (batch && Object.keys(batch).length > 0) {
        setQuotes(prev =>
          prev.map(q => {
            const clean = (q.displaySymbol || q.symbol).replace(/\.[A-Z]+$/, '').toUpperCase();
            const live = batch[clean] || batch[q.symbol.toUpperCase()];
            if (live && live.price > 0) {
              const livePriceEUR = live.priceEUR > 0 ? live.priceEUR : live.price;
              const chg = livePriceEUR - (livePriceEUR / (1 + (live.changePercent || 0) / 100));
              return {
                ...q,
                price: live.price,
                priceEUR: livePriceEUR,
                changePercent: live.changePercent,
                change: Number(chg.toFixed(2)),
              };
            }
            return q;
          })
        );
      }
    } catch (err) {
      console.warn('Error refreshing top quotes in QuotesView:', err);
    }
  };

  const performSearch = async (query: string) => {
    setIsLoading(true);
    try {
      const results = await searchMarketQuotes(query);
      setQuotes(results);
      if (!query.trim()) {
        refreshTopQuotes();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Búsqueda en tiempo real con debounce de 280ms
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedRegion('TODOS');
    performSearch(searchQuery);
  };

  // Conjunto de tickers en cartera y en seguimiento para badges
  const portfolioSymbolsSet = useMemo(() => {
    return new Set(positions.map(p => p.symbol.toUpperCase()));
  }, [positions]);

  const watchlistSymbolsSet = useMemo(() => {
    return new Set(watchlist.map(w => w.symbol.toUpperCase()));
  }, [watchlist]);

  // Actualizar toda la cartera abierta con cotizaciones reales de Internet
  const handleUpdateAllPortfolio = async () => {
    if (positions.length === 0) {
      showToast('No tienes valores en tu cartera abierta para actualizar.');
      return;
    }

    setIsUpdatingPortfolio(true);
    try {
      const symbols = positions.map(p => p.symbol);
      const quotesMap = await fetchBatchQuotes(symbols);

      const updateData: Record<string, { currentPriceEUR: number; priceUSD?: number; dayChangePercent?: number }> = {};
      let updatedCount = 0;

      for (const pos of positions) {
        const live = quotesMap[pos.symbol.toUpperCase()];
        if (live && (live.priceEUR > 0 || live.price > 0)) {
          const finalPriceEUR = live.priceEUR > 0 ? live.priceEUR : live.price;
          const isUSD = live.currency === 'USD' || pos.currency === 'USD' || !pos.symbol.includes('.MC');
          updateData[pos.symbol.toUpperCase()] = {
            currentPriceEUR: finalPriceEUR,
            priceUSD: isUSD ? live.price : undefined,
            dayChangePercent: live.changePercent,
          };
          updatedCount++;
        }
      }

      onUpdatePortfolioPrices(updateData);
      showToast(`¡Cartera actualizada! Se han actualizado ${updatedCount} de ${positions.length} valores con las cotizaciones más recientes.`);
      // Refrescar también los índices
      loadIndices();
    } catch (err) {
      console.error(err);
      showToast('Error al conectar con el servicio de cotizaciones.');
    } finally {
      setIsUpdatingPortfolio(false);
    }
  };

  // Actualizar toda la lista de seguimiento con cotizaciones reales
  const handleUpdateAllWatchlist = async () => {
    if (watchlist.length === 0) {
      showToast('No tienes valores en tu lista de seguimiento.');
      return;
    }

    setIsUpdatingWatchlist(true);
    try {
      const symbols = watchlist.map(w => w.symbol);
      const quotesMap = await fetchBatchQuotes(symbols);

      const updateData: Record<string, { currentPrice: number }> = {};
      let updatedCount = 0;

      for (const item of watchlist) {
        const live = quotesMap[item.symbol.toUpperCase()];
        if (live && live.price > 0) {
          updateData[item.symbol.toUpperCase()] = {
            currentPrice: live.price,
          };
          updatedCount++;
        }
      }

      onUpdateWatchlistPrices(updateData);
      showToast(`¡Lista de seguimiento actualizada! Se han actualizado ${updatedCount} valores en radar.`);
    } catch (err) {
      console.error(err);
      showToast('Error al actualizar la lista de seguimiento.');
    } finally {
      setIsUpdatingWatchlist(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Añadir un valor individual a la lista de seguimiento
  const handleQuickAddWatchlist = (q: MarketQuote) => {
    const cleanSym = (q.displaySymbol || q.symbol).replace(/\.[A-Z]+$/, '').toUpperCase();
    if (watchlistSymbolsSet.has(cleanSym) || watchlistSymbolsSet.has(q.symbol.toUpperCase())) {
      showToast(`${q.company} ya está en tu lista de seguimiento.`);
      return;
    }

    onAddToWatchlist({
      symbol: cleanSym,
      company: q.company,
      currentPrice: q.price,
      targetPrice: Number((q.price * 1.20).toFixed(2)),
      interestedBuyPrice: Number((q.price * 0.90).toFixed(2)),
      currency: q.currency,
      notes: `Añadido desde Cotizaciones de Mercado (${q.country}).`,
    });

    showToast(`★ ${q.company} (${cleanSym}) añadido a tu Lista de Seguimiento.`);
  };

  // Actualizar precio de una sola acción en la cartera
  const handleUpdateSingleStock = (q: MarketQuote) => {
    const cleanSym = (q.displaySymbol || q.symbol).replace(/\.[A-Z]+$/, '').toUpperCase();
    const isUSD = q.currency === 'USD';
    onUpdatePortfolioPrices({
      [cleanSym]: {
        currentPriceEUR: q.priceEUR,
        priceUSD: isUSD ? q.price : undefined,
        dayChangePercent: q.changePercent,
      },
      [q.symbol.toUpperCase()]: {
        currentPriceEUR: q.priceEUR,
        priceUSD: isUSD ? q.price : undefined,
        dayChangePercent: q.changePercent,
      },
    });
    showToast(`Precio de ${q.company} actualizado a ${formatNumber(q.priceEUR)} € en tu Cartera${isUSD ? ` (${formatNumber(q.price)} $ a título informativo)` : ''}.`);
  };

  // Filtrado y ordenación
  const filteredQuotes = useMemo(() => {
    return quotes.filter(q => {
      const cleanSym = (q.displaySymbol || q.symbol).replace(/\.[A-Z]+$/, '').toUpperCase();
      const inPortfolio = portfolioSymbolsSet.has(cleanSym) || portfolioSymbolsSet.has(q.symbol.toUpperCase());
      const inWatchlist = watchlistSymbolsSet.has(cleanSym) || watchlistSymbolsSet.has(q.symbol.toUpperCase());

      // Filtro por región o cartera/seguimiento
      if (selectedRegion === 'EEUU') return q.region === 'EEUU';
      if (selectedRegion === 'ESPAÑA') return q.region === 'ESPAÑA';
      if (selectedRegion === 'EUROPA') return q.region === 'EUROPA' || q.region === 'ESPAÑA';
      if (selectedRegion === 'CARTERA') return inPortfolio;
      if (selectedRegion === 'SEGUIMIENTO') return inWatchlist;
      return true;
    }).sort((a, b) => {
      if (sortField === 'changePercent') {
        return sortAsc ? a.changePercent - b.changePercent : b.changePercent - a.changePercent;
      }
      if (sortField === 'price') {
        return sortAsc ? a.price - b.price : b.price - a.price;
      }
      if (sortField === 'company') {
        return sortAsc ? a.company.localeCompare(b.company) : b.company.localeCompare(a.company);
      }
      return 0;
    });
  }, [quotes, selectedRegion, portfolioSymbolsSet, watchlistSymbolsSet, sortField, sortAsc]);

  // Filtrar índices para excluir EUR/GBP y mantener una sola fila de 5 columnas limpias
  const displayIndices = useMemo(() => {
    return indices.filter(idx => idx.symbol !== 'EURGBP=X' && !idx.name.includes('GBP'));
  }, [indices]);

  return (
    <div className="h-full flex flex-col min-h-0 space-y-2.5 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-blue-500/50 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 max-w-md">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-slate-200">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white text-xs ml-auto font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Cabecera Fija de la captura (Título + 5 Índices + Búsqueda y Filtros) */}
      <div className="shrink-0 space-y-2.5">
        {/* Main Header Card - Compacto */}
        <div className="bg-[#12233f] border border-slate-700/70 p-3.5 sm:p-4 rounded-xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-inner shrink-0">
                <Globe className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  Cotizaciones de Mercado (EE.UU. y Europa)
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    En vivo
                  </span>
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-400">
                  Consulta cotizaciones en tiempo real por ticker o empresa y sincroniza automáticamente tu cartera de valores y lista de seguimiento.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={handleUpdateAllPortfolio}
              disabled={isUpdatingPortfolio}
              className="flex-1 md:flex-none px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Actualiza los precios actuales de todas las acciones de tu cartera abierta"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUpdatingPortfolio ? 'animate-spin' : ''}`} />
              <span>{isUpdatingPortfolio ? 'Actualizando Cartera...' : 'Actualizar mi Cartera'}</span>
            </button>

            <button
              onClick={handleUpdateAllWatchlist}
              disabled={isUpdatingWatchlist}
              className="flex-1 md:flex-none px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs rounded-lg shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Actualiza los precios de todos los valores de tu lista de seguimiento"
            >
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
              <span>{isUpdatingWatchlist ? 'Actualizando...' : 'Actualizar Seguimiento'}</span>
            </button>
          </div>
        </div>

        {/* Indices Bar - Exactamente 5 índices en 1 sola fila limpia */}
        {displayIndices.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {displayIndices.map(idx => (
              <div
                key={idx.symbol}
                className="bg-[#0e1b30] border border-slate-800 py-2 px-3 rounded-xl shadow flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-xs text-slate-400 mb-0.5">
                  <span className="font-semibold text-slate-300">{idx.name}</span>
                  <span
                    className={`text-[11px] font-bold flex items-center gap-0.5 ${
                      idx.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {idx.changePercent >= 0 ? '+' : ''}{idx.changePercent.toFixed(2)}%
                  </span>
                </div>
                <div className="text-base font-bold text-white font-mono">
                  {idx.symbol === 'EURUSD=X' ? idx.price.toFixed(4) : formatNumber(idx.price)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search and Filters Toolbar - Compacto */}
        <div className="bg-[#12233f] border border-slate-700/80 p-3 sm:p-3.5 rounded-xl shadow-lg space-y-2.5">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  if (val.trim() && selectedRegion !== 'TODOS') {
                    setSelectedRegion('TODOS');
                  }
                }}
                placeholder="Buscar por ticker o empresa (ej: SAN, Inditex, AAPL, Oracle, Nvidia, LVMH, Repsol, SAP, Iberdrola...)"
                className="w-full bg-[#0a1324] border border-slate-700 rounded-lg pl-10 pr-16 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    performSearch('');
                  }}
                  className="absolute right-9 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white px-1 text-xs font-bold cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
              {isLoading && (
                <RefreshCw className="w-4 h-4 text-blue-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
              )}
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Buscar en Internet</span>
            </button>
          </form>

          {/* Feedback de búsqueda activa */}
          {searchQuery.trim() !== '' && (
            <div className="flex items-center justify-between text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg">
              <span className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                {isLoading
                  ? `Buscando «${searchQuery}» en los mercados de España, Europa y EE.UU....`
                  : `Resultados para «${searchQuery}»: ${filteredQuotes.length} empresas encontradas`}
              </span>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedRegion('TODOS');
                  performSearch('');
                }}
                className="text-slate-400 hover:text-white underline text-[11px] cursor-pointer"
              >
                Ver todas las empresas
              </button>
            </div>
          )}

          {/* Filter Pills and Sorting */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'TODOS', label: 'Todos los mercados' },
                { id: 'ESPAÑA', label: '🇪🇸 España (IBEX 35 completo)' },
                { id: 'EUROPA', label: '🇪🇺 Europa (DAX, CAC, EuroStoxx)' },
                { id: 'EEUU', label: '🇺🇸 EE.UU. (NYSE / NASDAQ)' },
                { id: 'CARTERA', label: `💼 En mi Cartera (${positions.length})` },
                { id: 'SEGUIMIENTO', label: `⭐ En Seguimiento (${watchlist.length})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedRegion(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedRegion === tab.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Ordenar por:</span>
              <select
                value={sortField}
                onChange={e => setSortField(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none"
              >
                <option value="changePercent">Variación (%)</option>
                <option value="price">Precio</option>
                <option value="company">Empresa</option>
              </select>
              <button
                onClick={() => setSortAsc(!sortAsc)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
                title="Cambiar orden ascendente/descendente"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quotes Results Table - Ocupa el resto del alto disponible y hace scroll sin barra desplazadora */}
      <div className="flex-1 min-h-0 bg-[#12233f] border border-slate-700/70 rounded-xl shadow-xl flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto no-scrollbar">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#0e1b30] text-slate-400 font-semibold border-b border-slate-700/80 select-none sticky top-0 z-10 shadow-md">
              <tr>
                <th className="py-2.5 px-3.5 sticky top-0 bg-[#0e1b30]">Tícker</th>
                <th className="py-2.5 px-3.5 sticky top-0 bg-[#0e1b30]">Empresa</th>
                <th className="py-2.5 px-3 sticky top-0 bg-[#0e1b30]">Mercado / País</th>
                <th className="py-2.5 px-3.5 text-right sticky top-0 bg-[#0e1b30]">Cotización</th>
                <th className="py-2.5 px-3.5 text-right sticky top-0 bg-[#0e1b30]">Variación Día</th>
                <th className="py-2.5 px-3.5 text-center sticky top-0 bg-[#0e1b30]">Rango 52 Semanas</th>
                <th className="py-2.5 px-3 text-center sticky top-0 bg-[#0e1b30]">Estado</th>
                <th className="py-2.5 px-3.5 text-right sticky top-0 bg-[#0e1b30]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Globe className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-slate-300">No se encontraron cotizaciones</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Prueba con otro tícker o haz clic en «Buscar en Internet» para consultar valores globales.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredQuotes.map(q => {
                  const cleanSym = (q.displaySymbol || q.symbol).replace(/\.[A-Z]+$/, '').toUpperCase();
                  const inPortfolio = portfolioSymbolsSet.has(cleanSym) || portfolioSymbolsSet.has(q.symbol.toUpperCase());
                  const inWatchlist = watchlistSymbolsSet.has(cleanSym) || watchlistSymbolsSet.has(q.symbol.toUpperCase());
                  const matchingPos = positions.find(
                    p => p.symbol.toUpperCase() === cleanSym || p.symbol.toUpperCase() === q.symbol.toUpperCase()
                  );

                  return (
                    <tr key={q.symbol} className="hover:bg-slate-800/50 transition-colors group">
                      {/* Ticker */}
                      <td className="py-2.5 px-3.5 font-bold text-white font-mono">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 shadow-sm" />
                          <span className="text-sm tracking-wide">{cleanSym}</span>
                          {q.symbol !== cleanSym && (
                            <span className="text-[10px] text-slate-500 font-mono">({q.symbol})</span>
                          )}
                        </div>
                      </td>

                      {/* Empresa */}
                      <td className="py-2.5 px-3.5 text-slate-200 font-medium">
                        <div className="font-semibold text-white">{q.company}</div>
                        {q.sector && (
                          <div className="text-[10px] text-slate-400">{q.sector}</div>
                        )}
                      </td>

                      {/* Mercado / País */}
                      <td className="py-2.5 px-3 text-slate-300">
                        <div className="flex items-center gap-1.5 font-medium">
                          <span>
                            {q.country === 'España' ? '🇪🇸' : q.country === 'USA' ? '🇺🇸' : q.country === 'Alemania' ? '🇩🇪' : q.country === 'Francia' ? '🇫🇷' : '🇪🇺'}
                          </span>
                          <span>{q.country}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">{q.exchange}</div>
                      </td>

                      {/* Cotización */}
                      <td className="py-2.5 px-3.5 text-right font-mono">
                        <div className="text-sm font-bold text-white">
                          {formatNumber(q.price)} {q.currency === 'USD' ? '$' : '€'}
                        </div>
                        {q.currency === 'USD' && q.priceEUR && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            ≈ {formatEUR(q.priceEUR)}
                          </div>
                        )}
                      </td>

                      {/* Variación */}
                      <td className="py-2.5 px-3.5 text-right font-mono">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${
                            q.changePercent >= 0
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {q.changePercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {formatPercent(q.changePercent)}
                        </span>
                        {q.change !== undefined && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {q.change >= 0 ? `+${formatNumber(q.change)}` : formatNumber(q.change)} {q.currency === 'USD' ? '$' : '€'}
                          </div>
                        )}
                      </td>

                      {/* Rango 52 Semanas */}
                      <td className="py-2.5 px-3.5 text-center">
                        {q.low52 && q.high52 ? (
                          <div className="max-w-[130px] mx-auto text-[10px] font-mono text-slate-400">
                            <div className="flex justify-between text-[9px] text-slate-500 mb-1">
                              <span>{formatNumber(q.low52)}</span>
                              <span>{formatNumber(q.high52)}</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-blue-500 h-1.5 rounded-full"
                                style={{
                                  width: `${Math.min(100, Math.max(0, ((q.price - q.low52) / (q.high52 - q.low52)) * 100))}%`,
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      {/* Estado: En Cartera / En Seguimiento */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {inPortfolio && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                              <Briefcase className="w-2.5 h-2.5" />
                              Cartera ({matchingPos?.shares || 0} acc)
                            </span>
                          )}
                          {inWatchlist && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-amber-300" />
                              En Seguimiento
                            </span>
                          )}
                          {!inPortfolio && !inWatchlist && (
                            <span className="text-slate-500 text-[10px]">—</span>
                          )}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-2.5 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {inPortfolio ? (
                            <button
                              onClick={() => handleUpdateSingleStock(q)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer flex items-center gap-1"
                              title="Actualizar precio de este valor en tu cartera"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Actualizar</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onOpenNewOperation(cleanSym, 'Compra', q.company, q.priceEUR || q.price)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-all cursor-pointer flex items-center gap-1"
                              title="Registrar operación de compra con esta cotización"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Comprar</span>
                            </button>
                          )}

                          {!inWatchlist && (
                            <button
                              onClick={() => handleQuickAddWatchlist(q)}
                              className="p-1 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 border border-slate-700/60 transition-colors cursor-pointer"
                              title="Añadir a lista de seguimiento"
                            >
                              <Star className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info fijo */}
        <div className="shrink-0 py-2.5 px-4 bg-[#0e1b30] border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              Mostrando {filteredQuotes.length} valores de EE.UU. y Europa. Haz clic en <strong>«Actualizar mi Cartera»</strong> para sincronizar los precios con tu cartera automáticamente.
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Última comprobación: {new Date().toLocaleTimeString('es-ES')}
          </div>
        </div>
      </div>
    </div>
  );
}
