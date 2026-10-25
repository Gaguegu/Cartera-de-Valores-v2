import React, { useState } from 'react';
import { StockPosition, Operation, DividendRecord } from '../../types/portfolio';
import { formatEUR, formatNumber, formatPercent } from '../../utils/formatters';
import { Star, X, TrendingUp, TrendingDown, DollarSign, Calendar, Layers, Newspaper, ArrowUpRight, Coins } from 'lucide-react';
import { PortfolioLineChart } from '../charts/PortfolioCharts';

interface StockDetailModalProps {
  stock: StockPosition | null;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  operations: Operation[];
  dividends: DividendRecord[];
  onOpenNewOperation: (symbol: string) => void;
  onRegisterDividendForStock?: (stock: StockPosition) => void;
  onSellStock?: (stock: StockPosition) => void;
}

export function StockDetailModal({
  stock,
  onClose,
  onToggleFavorite,
  operations,
  dividends,
  onOpenNewOperation,
  onRegisterDividendForStock,
  onSellStock,
}: StockDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'resumen' | 'grafico' | 'operaciones' | 'dividendos' | 'noticias' | 'estrategia'>('resumen');

  if (!stock) return null;

  const stockOps = operations.filter(op => op.symbol.toUpperCase() === stock.symbol.toUpperCase());
  const stockDivs = dividends.filter(d => d.symbol.toUpperCase() === stock.symbol.toUpperCase());

  // Historical mini price simulation
  const basePrice = stock.currentPrice;
  const historyData = [
    { label: 'Ene', value: Math.round(basePrice * 0.85) },
    { label: 'Feb', value: Math.round(basePrice * 0.88) },
    { label: 'Mar', value: Math.round(basePrice * 0.86) },
    { label: 'Abr', value: Math.round(basePrice * 0.91) },
    { label: 'May', value: Math.round(basePrice * 0.94) },
    { label: 'Jun', value: Math.round(basePrice * 0.98) },
    { label: 'Jul', value: Math.round(basePrice * 0.97) },
    { label: 'Ago', value: Math.round(basePrice) },
  ];

  const simulatedNews = [
    {
      title: `${stock.company} presenta sólidos resultados trimestrales impulsados por su división clave`,
      date: 'Hace 2 días',
      source: 'Expansión / Financial Times',
      sentiment: 'Positivo',
    },
    {
      title: `Consenso de analistas eleva el precio objetivo de ${stock.symbol} un +14% para los próximos 12 meses`,
      date: 'Hace 5 días',
      source: 'Bloomberg Markets',
      sentiment: 'Favorable',
    },
    {
      title: `Estrategia de recompra de acciones y distribución de dividendos confirmada para el ejercicio`,
      date: 'Hace 2 semanas',
      source: 'Reuters Finance',
      sentiment: 'Neutral',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header - Screen 3 Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0"
              style={{ backgroundColor: stock.color || '#3b82f6' }}
            >
              {stock.symbol.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {stock.company} ({stock.symbol})
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {stock.country} · {stock.currency}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Sector: <span className="text-slate-300 font-medium">{stock.sector}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-slate-400 font-medium">Precio actual</div>
              <div className="text-lg sm:text-xl font-bold text-white flex items-center gap-1.5 justify-end font-mono">
                <span>{formatNumber(stock.currentPrice)} €</span>
                {(() => {
                  const chg = stock.dayChangePercent !== undefined ? stock.dayChangePercent : 0;
                  const isNegative = chg < 0;
                  return (
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-semibold flex items-center ${
                        isNegative ? 'bg-red-500/20 text-red-400' : chg > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/40 text-slate-300'
                      }`}
                    >
                      {isNegative ? (
                        <TrendingDown className="w-3 h-3 mr-0.5" />
                      ) : (
                        <TrendingUp className="w-3 h-3 mr-0.5" />
                      )}
                      {chg > 0 ? `+${chg}%` : `${chg}%`}
                    </span>
                  );
                })()}
              </div>
              {stock.priceUSD && (
                <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                  ({formatNumber(stock.priceUSD)} $ a título informativo)
                </div>
              )}
            </div>

            {onSellStock && (
              <button
                onClick={() => onSellStock(stock)}
                className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow cursor-pointer"
                title={`Vender títulos de ${stock.company} (${stock.shares} títulos en cartera)`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span className="hidden sm:inline">Vender</span>
              </button>
            )}

            {onRegisterDividendForStock && (
              <button
                onClick={() => onRegisterDividendForStock(stock)}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow cursor-pointer"
                title={`Registrar dividendo cobrado de ${stock.company}`}
              >
                <Coins className="w-4 h-4" />
                <span className="hidden sm:inline">Cobrar dividendo</span>
              </button>
            )}

            <button
              onClick={() => onToggleFavorite(stock.id)}
              className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold ${
                stock.isFavorite
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <Star className={`w-4 h-4 ${stock.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
              <span className="hidden sm:inline">
                {stock.isFavorite ? 'En favoritos' : 'Añadir a favoritos'}
              </span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs - Screen 3 Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/90 px-6 gap-2 sm:gap-6 overflow-x-auto text-sm font-medium">
          {(['resumen', 'grafico', 'operaciones', 'dividendos', 'noticias', 'estrategia'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-2 sm:px-3 border-b-2 font-semibold capitalize transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'grafico' ? 'Gráfico' : tab === 'estrategia' ? '🟢 Mi Estrategia' : tab}
            </button>
          ))}
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Main 4 Metric Cards (Identical to screen 3) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
              <span className="text-xs text-slate-400 block font-medium">Cantidad</span>
              <span className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1 block">
                {stock.shares}
              </span>
              <span className="text-[11px] text-slate-500">títulos en cartera</span>
            </div>

            {(() => {
              const effectivePmc = stock.pmcWithCommission || (stock.totalInvestedEUR && stock.shares > 0 ? Number((stock.totalInvestedEUR / stock.shares).toFixed(2)) : stock.buyPrice);
              const hasComm = Boolean(stock.totalCommissionEUR && stock.totalCommissionEUR > 0);
              return (
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
                  <span className="text-xs text-slate-400 block font-medium">Precio compra (PMC)</span>
                  <span className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1 block">
                    {formatNumber(effectivePmc)} €
                  </span>
                  <span className="text-[11px] text-slate-400" title={`Precio de ejecución: ${formatNumber(stock.buyPrice)} € · Comisión de compra: +${formatNumber(stock.totalCommissionEUR || 0)} €`}>
                    {hasComm ? `Incluye +${formatNumber(stock.totalCommissionEUR || 0)} € comisiones` : 'PMC con comisiones'}
                  </span>
                </div>
              );
            })()}

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
              <span className="text-xs text-slate-400 block font-medium">Valor actual</span>
              <span className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1 block">
                {formatEUR(stock.currentValueEUR)}
              </span>
              <span className="text-[11px] text-slate-500">valoración en euros</span>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
              <span className="text-xs text-slate-400 block font-medium">Rentabilidad</span>
              <span
                className={`text-xl sm:text-2xl font-bold tracking-tight mt-1 block flex items-center gap-1 ${
                  stock.gainLossPercent >= 0 ? 'text-emerald-400' : 'text-red-500'
                }`}
              >
                {formatPercent(stock.gainLossPercent)}
              </span>
              <span
                className={`text-[11px] font-medium ${
                  stock.gainLossEUR >= 0 ? 'text-emerald-400/90' : 'text-red-400'
                }`}
              >
                {stock.gainLossEUR >= 0 ? `+${formatEUR(stock.gainLossEUR)}` : formatEUR(stock.gainLossEUR)}
              </span>
            </div>
          </div>

          {/* TAB 1: RESUMEN */}
          {activeTab === 'resumen' && (
            <div className="space-y-6">
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-200">Evolución del precio (EUR)</h3>
                  <span className="text-xs text-slate-400">Últimos 8 meses</span>
                </div>
                <PortfolioLineChart data={historyData} height={160} />
              </div>

              {/* Ratios & Key Data */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-800/30 p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-xs text-slate-400">PER (P/E Ratio)</span>
                  <p className="text-base font-semibold text-white">{stock.peRatio || '34,2'}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Rentabilidad Div.</span>
                  <p className="text-base font-semibold text-emerald-400">{stock.dividendYield || '0,72'}%</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Máx. 52 semanas</span>
                  <p className="text-base font-semibold text-white">{stock.high52 ? `${stock.high52} ${stock.currency}` : '512,40 USD'}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Mín. 52 semanas</span>
                  <p className="text-base font-semibold text-white">{stock.low52 ? `${stock.low52} ${stock.currency}` : '388,10 USD'}</p>
                </div>
              </div>

              {stock.notes && (
                <div className="bg-blue-950/20 border border-blue-900/40 rounded-xl p-4 text-xs text-blue-200">
                  <span className="font-semibold block mb-1 text-blue-300">Notas de inversión:</span>
                  {stock.notes}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GRAFICO */}
          {activeTab === 'grafico' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-300">Gráfico técnico y tendencia histórica</h3>
                <div className="flex gap-1.5 text-xs">
                  {['1M', '6M', '1A', 'TODOS'].map((r, i) => (
                    <button
                      key={r}
                      className={`px-2.5 py-1 rounded font-medium ${
                        i === 2 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5">
                <PortfolioLineChart data={historyData} height={220} />
              </div>
            </div>
          )}

          {/* TAB 3: OPERACIONES */}
          {activeTab === 'operaciones' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-300">
                  Operaciones realizadas en {stock.symbol} ({stockOps.length})
                </h3>
                <button
                  onClick={() => onOpenNewOperation(stock.symbol)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" /> Nueva operación
                </button>
              </div>

              {stockOps.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No hay operaciones registradas para este valor.</p>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Fecha</th>
                        <th className="py-2.5 px-3">Tipo</th>
                        <th className="py-2.5 px-3">Cantidad</th>
                        <th className="py-2.5 px-3">Precio</th>
                        <th className="py-2.5 px-3">Total (€)</th>
                        <th className="py-2.5 px-3">Comisión</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {stockOps.map(op => (
                        <tr key={op.id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 text-slate-300">{op.date}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                op.type === 'Compra'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              {op.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-white">{op.shares}</td>
                          <td className="py-2.5 px-3 text-slate-300">{formatNumber(op.price)} €</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-100 font-mono">{formatEUR(op.totalEUR)}</td>
                          <td className="py-2.5 px-3 text-slate-400">{formatNumber(op.commissionEUR)} €</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DIVIDENDOS */}
          {activeTab === 'dividendos' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Coins className="w-4 h-4 text-emerald-400" />
                    <span>Historial de dividendos cobrados ({stockDivs.length})</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Actualmente tienes <strong className="text-white font-mono">{stock.shares} títulos</strong> de {stock.company} en cartera.
                  </p>
                </div>
                {onRegisterDividendForStock && (
                  <button
                    onClick={() => onRegisterDividendForStock(stock)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow transition-colors cursor-pointer shrink-0"
                  >
                    <Coins className="w-4 h-4" />
                    <span>+ Registrar dividendo ({stock.shares} acc.)</span>
                  </button>
                )}
              </div>
              {stockDivs.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No hay dividendos registrados para este valor.</p>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Fecha</th>
                        <th className="py-2.5 px-3">Bruto (€)</th>
                        <th className="py-2.5 px-3">Retención (€)</th>
                        <th className="py-2.5 px-3">Neto cobrado (€)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {stockDivs.map(d => (
                        <tr key={d.id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 text-slate-300">{d.date}</td>
                          <td className="py-2.5 px-3 font-medium text-white">{formatEUR(d.grossEUR)}</td>
                          <td className="py-2.5 px-3 text-rose-400">-{formatEUR(d.withholdingEUR)}</td>
                          <td className="py-2.5 px-3 font-bold text-emerald-400">{formatEUR(d.netEUR)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: NOTICIAS */}
          {activeTab === 'noticias' && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-300">Titulares y análisis de mercado</h3>
              <div className="space-y-3">
                {simulatedNews.map((news, idx) => (
                  <div key={idx} className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>{news.source} · {news.date}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400">
                        {news.sentiment}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-100 hover:text-blue-400 cursor-pointer">
                      {news.title}
                    </h4>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: MI ESTRATEGIA / DIARIO DE INVERSIÓN (PDF Page 10) */}
          {activeTab === 'estrategia' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Mi Estrategia & Diario de Inversión ({stock.symbol})
                </h3>
                <span className="text-xs text-slate-400">Tesis personal del inversor</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/40 border border-slate-700/60 p-4 rounded-xl space-y-1.5">
                  <span className="text-xs text-slate-400 font-semibold block">Motivo de compra</span>
                  <p className="text-sm font-medium text-emerald-300">
                    {stock.strategyReason || '"Empresa que quiero mantener a largo plazo por su liderazgo y foso económico."'}
                  </p>
                </div>

                <div className="bg-slate-800/40 border border-slate-700/60 p-4 rounded-xl space-y-1.5">
                  <span className="text-xs text-slate-400 font-semibold block">Precio objetivo de venta</span>
                  <p className="text-lg font-bold text-white font-mono">
                    {stock.targetPrice ? `${formatNumber(stock.targetPrice)} €` : stock.currentPrice > 0 ? `${formatNumber(stock.currentPrice * 1.25)} €` : 'No definido'}
                  </p>
                  <span className="text-[11px] text-emerald-400 font-semibold">
                    {stock.targetPrice && stock.currentPrice > 0
                      ? `Objetivo estimado: +${(((stock.targetPrice - stock.currentPrice) / stock.currentPrice) * 100).toFixed(1)}%`
                      : 'Objetivo estimado: +25%'}
                  </span>
                </div>

                <div className="bg-slate-800/40 border border-slate-700/60 p-4 rounded-xl space-y-1.5">
                  <span className="text-xs text-slate-400 font-semibold block">Precio máximo para aumentar posición</span>
                  <p className="text-lg font-bold text-white font-mono">
                    {stock.maxBuyPrice ? `${formatNumber(stock.maxBuyPrice)} €` : stock.currentPrice > 0 ? `${formatNumber(stock.currentPrice * 0.95)} €` : 'No definido'}
                  </p>
                  <span className="text-[11px] text-slate-400">Límite para no empeorar el precio medio</span>
                </div>

                <div className="bg-slate-800/40 border border-slate-700/60 p-4 rounded-xl space-y-1.5">
                  <span className="text-xs text-slate-400 font-semibold block">Comentario y seguimiento</span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {stock.strategyComment || '"Esperar resultados trimestrales y próximos anuncios de dividendos."'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => onOpenNewOperation(stock.symbol)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5"
          >
            <TrendingUp className="w-4 h-4" /> Comprar / Vender este valor
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
