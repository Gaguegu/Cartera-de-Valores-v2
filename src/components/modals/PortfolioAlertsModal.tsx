import React, { useState } from 'react';
import { StockPosition, WatchlistItem, PortfolioAlert, AlertType } from '../../types/portfolio';
import { formatEUR, formatPercent } from '../../utils/formatters';
import {
  Bell,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  ArrowRight,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';

interface PortfolioAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  positions: StockPosition[];
  watchlist: WatchlistItem[];
  alerts: PortfolioAlert[];
  onAddAlert: (alert: Omit<PortfolioAlert, 'id' | 'createdDate'>) => void;
  onDeleteAlert: (id: string) => void;
  onToggleAlert: (id: string) => void;
  onTriggerCheck?: () => void;
  preselectedSymbol?: string;
}

export function PortfolioAlertsModal({
  isOpen,
  onClose,
  positions,
  watchlist,
  alerts,
  onAddAlert,
  onDeleteAlert,
  onToggleAlert,
  onTriggerCheck,
  preselectedSymbol,
}: PortfolioAlertsModalProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');

  // Form state
  const [selectedSymbol, setSelectedSymbol] = useState<string>(preselectedSymbol || (positions[0]?.symbol || ''));
  const [alertType, setAlertType] = useState<AlertType>('take_profit');
  const [targetPrice, setTargetPrice] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  // Combine available symbols from positions and watchlist
  const allSymbols = [
    ...positions.map(p => ({ symbol: p.symbol, company: p.company, currentPrice: p.currentPrice, source: 'Cartera' })),
    ...watchlist
      .filter(w => !positions.some(p => p.symbol.toUpperCase() === w.symbol.toUpperCase()))
      .map(w => ({ symbol: w.symbol, company: w.company, currentPrice: w.currentPrice, source: 'Seguimiento' })),
  ];

  const currentSelectedStock = allSymbols.find(s => s.symbol.toUpperCase() === selectedSymbol.toUpperCase()) || allSymbols[0];

  // Helper to prefill price based on percentage
  const handleQuickPercent = (pct: number) => {
    if (!currentSelectedStock) return;
    const base = currentSelectedStock.currentPrice;
    const newPrice = Number((base * (1 + pct / 100)).toFixed(2));
    setTargetPrice(newPrice);
    if (pct > 0) {
      setAlertType('take_profit');
    } else {
      setAlertType('stop_loss');
    }
  };

  const handleStockChange = (sym: string) => {
    setSelectedSymbol(sym);
    const stock = allSymbols.find(s => s.symbol.toUpperCase() === sym.toUpperCase());
    if (stock && targetPrice === 0) {
      setTargetPrice(Number((stock.currentPrice * 1.15).toFixed(2))); // Default +15%
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSelectedStock || targetPrice <= 0) return;

    const condition: 'above' | 'below' =
      alertType === 'take_profit' || alertType === 'custom_high'
        ? 'above'
        : alertType === 'stop_loss' || alertType === 'custom_low'
        ? 'below'
        : targetPrice >= currentSelectedStock.currentPrice
        ? 'above'
        : 'below';

    onAddAlert({
      symbol: currentSelectedStock.symbol.toUpperCase(),
      company: currentSelectedStock.company,
      type: alertType,
      targetPriceEUR: targetPrice,
      condition,
      notes: notes.trim() || undefined,
      active: true,
      triggered: false,
    });

    setNotes('');
    setActiveTab('list');
    if (onTriggerCheck) onTriggerCheck();
  };

  const getStockCurrentPrice = (symbol: string): number => {
    const s = allSymbols.find(item => item.symbol.toUpperCase() === symbol.toUpperCase());
    return s?.currentPrice || 0;
  };

  const triggeredCount = alerts.filter(a => a.triggered && a.active).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f1e36] border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#12233f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">Centro de Alertas de Precios</h3>
                {triggeredCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                    {triggeredCount} {triggeredCount === 1 ? 'activada' : 'activadas'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Stop-Loss, Take-Profit y precios objetivo de compra o venta en euros
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

        {/* Tab switch */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'list'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Mis Alertas ({alerts.length})</span>
          </button>
          <button
            onClick={() => {
              if (currentSelectedStock && targetPrice === 0) {
                setTargetPrice(Number((currentSelectedStock.currentPrice * 1.15).toFixed(2)));
              }
              setActiveTab('create');
            }}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'create'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear Nueva Alerta</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'list' && (
            <>
              {alerts.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/30">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3">
                    <Target className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">No tienes alertas configuradas</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                    Establece precios objetivo de recogida de beneficios (Take-Profit) o límites de pérdidas (Stop-Loss) para vigilar tu cartera automáticamente.
                  </p>
                  <button
                    onClick={() => {
                      if (currentSelectedStock && targetPrice === 0) {
                        setTargetPrice(Number((currentSelectedStock.currentPrice * 1.15).toFixed(2)));
                      }
                      setActiveTab('create');
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Crear mi primera alerta</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {alerts.map(alert => {
                    const curPrice = getStockCurrentPrice(alert.symbol);
                    const diffEUR = curPrice - alert.targetPriceEUR;
                    const diffPct = curPrice > 0 ? ((alert.targetPriceEUR - curPrice) / curPrice) * 100 : 0;
                    const isTriggered = alert.condition === 'above' ? curPrice >= alert.targetPriceEUR : curPrice <= alert.targetPriceEUR;

                    return (
                      <div
                        key={alert.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isTriggered && alert.active
                            ? 'bg-rose-950/30 border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                            : alert.active
                            ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                            : 'bg-slate-950/40 border-slate-900 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                alert.type === 'stop_loss'
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : alert.type === 'take_profit'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              }`}
                            >
                              {alert.type === 'stop_loss' ? (
                                <ShieldAlert className="w-4 h-4" />
                              ) : alert.type === 'take_profit' ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : (
                                <Target className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-white">{alert.symbol}</span>
                                <span className="text-xs text-slate-400 hidden sm:inline">{alert.company}</span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    alert.type === 'stop_loss'
                                      ? 'bg-rose-500/20 text-rose-300'
                                      : alert.type === 'take_profit'
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : 'bg-blue-500/20 text-blue-300'
                                  }`}
                                >
                                  {alert.type === 'stop_loss'
                                    ? 'Stop-Loss'
                                    : alert.type === 'take_profit'
                                    ? 'Take-Profit'
                                    : 'Objetivo'}
                                </span>
                                {isTriggered && alert.active && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                                    ¡Activada!
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                                <span>
                                  Precio actual:{' '}
                                  <strong className="text-white font-mono">{formatEUR(curPrice)}</strong>
                                </span>
                                <span>
                                  Disparo:{' '}
                                  <strong className="text-amber-300 font-mono">
                                    {alert.condition === 'above' ? '≥' : '≤'} {formatEUR(alert.targetPriceEUR)}
                                  </strong>
                                </span>
                                <span className="font-medium text-slate-400">
                                  Distancia:{' '}
                                  <span className={diffPct > 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                                    {diffPct > 0 ? `+${diffPct.toFixed(1)}%` : `${diffPct.toFixed(1)}%`}
                                  </span>
                                </span>
                              </div>
                              {alert.notes && (
                                <p className="text-[11px] text-slate-400 italic mt-1 bg-slate-950/40 px-2 py-0.5 rounded">
                                  "{alert.notes}"
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => onToggleAlert(alert.id)}
                              className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                alert.active
                                  ? 'bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900 border border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400 hover:text-white'
                              }`}
                              title={alert.active ? 'Desactivar alerta' : 'Activar alerta'}
                            >
                              {alert.active ? 'Activa' : 'Pausada'}
                            </button>
                            <button
                              onClick={() => onDeleteAlert(alert.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Eliminar alerta"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === 'create' && (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Select Stock */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Seleccionar valor de la cartera o lista de seguimiento
                </label>
                <select
                  value={selectedSymbol}
                  onChange={e => handleStockChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-amber-400"
                >
                  {allSymbols.map(s => (
                    <option key={s.symbol} value={s.symbol}>
                      {s.symbol} - {s.company} ({formatEUR(s.currentPrice)}) [{s.source}]
                    </option>
                  ))}
                </select>
                {currentSelectedStock && (
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <Info className="w-3 h-3 text-cyan-400 inline" />
                    Cotización actual de referencia:{' '}
                    <strong className="text-white font-mono">{formatEUR(currentSelectedStock.currentPrice)}</strong>
                  </p>
                )}
              </div>

              {/* Alert Type */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Tipo de alerta
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAlertType('take_profit');
                      handleQuickPercent(15);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      alertType === 'take_profit'
                        ? 'bg-emerald-950/40 border-emerald-500 text-white shadow'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold">Take-Profit</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block">Venta con beneficios al subir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAlertType('stop_loss');
                      handleQuickPercent(-10);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      alertType === 'stop_loss'
                        ? 'bg-rose-950/40 border-rose-500 text-white shadow'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      <span className="text-xs font-bold">Stop-Loss</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block">Límite preventivo de pérdidas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAlertType('target_price')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      alertType === 'target_price'
                        ? 'bg-amber-950/40 border-amber-500 text-white shadow'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold">Personalizada</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block">Precio libre fijado a mano</span>
                  </button>
                </div>
              </div>

              {/* Quick Percentage Presets */}
              <div>
                <span className="text-[11px] text-slate-400 block mb-1 font-medium">Ajuste rápido por porcentaje sobre cotización:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleQuickPercent(10)}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900 transition-colors cursor-pointer"
                  >
                    +10%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPercent(20)}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900 transition-colors cursor-pointer"
                  >
                    +20%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPercent(30)}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900 transition-colors cursor-pointer"
                  >
                    +30%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPercent(-8)}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:bg-rose-900 transition-colors cursor-pointer"
                  >
                    -8% Stop
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPercent(-15)}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:bg-rose-900 transition-colors cursor-pointer"
                  >
                    -15% Stop
                  </button>
                </div>
              </div>

              {/* Target Price input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Precio de disparo en euros (€)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={targetPrice || ''}
                    onChange={e => setTargetPrice(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold focus:outline-none focus:border-amber-400 pl-8"
                    required
                  />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Nota o motivo de la alerta (opcional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ej: Tomar beneficios parciales, recomprar si baja a soporte, etc."
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar Alerta</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
