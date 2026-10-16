import React, { useState } from 'react';
import { WatchlistItem } from '../types/portfolio';
import { formatNumber, formatEUR } from '../utils/formatters';
import { Star, Plus, Trash2, Bell, TrendingUp, AlertCircle } from 'lucide-react';

interface WatchlistViewProps {
  watchlist: WatchlistItem[];
  onAddWatchlist: (item: Omit<WatchlistItem, 'id'>) => void;
  onRemoveWatchlist: (id: string) => void;
  onOpenBuyOperation: (symbol: string) => void;
}

export function WatchlistView({
  watchlist,
  onAddWatchlist,
  onRemoveWatchlist,
  onOpenBuyOperation,
}: WatchlistViewProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [company, setCompany] = useState('');
  const [currentPrice, setCurrentPrice] = useState<number>(100);
  const [targetPrice, setTargetPrice] = useState<number>(120);
  const [interestedBuyPrice, setInterestedBuyPrice] = useState<number>(90);
  const [currency, setCurrency] = useState<'EUR' | 'USD'>('EUR');
  const [notes, setNotes] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim() || !company.trim()) return;

    onAddWatchlist({
      symbol: symbol.trim().toUpperCase(),
      company: company.trim(),
      currentPrice,
      targetPrice,
      interestedBuyPrice,
      currency,
      notes,
    });

    setSymbol('');
    setCompany('');
    setNotes('');
    setCurrency('EUR');
    setIsAdding(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-[#12233f] border border-slate-700/70 p-4 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            Lista de Seguimiento (Valores en Radar)
          </h2>
          <p className="text-xs text-slate-400">
            Valores que estás monitorizando antes de abrir posición, con precios objetivos de compra y venta
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Añadir valor a seguir</span>
        </button>
      </div>

      {/* Add form drawer */}
      {isAdding && (
        <form onSubmit={handleAdd} className="bg-[#12233f] border border-slate-700/70 p-5 rounded-2xl shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white">Nuevo Valor en Seguimiento</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Símbolo (Ticker)</label>
              <input
                type="text"
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                placeholder="Ej. NVDA"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white uppercase font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Empresa</label>
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="Ej. Nvidia"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Divisa</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value as 'EUR' | 'USD')}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Precio actual</label>
              <input
                type="number"
                step="0.01"
                value={currentPrice}
                onChange={e => setCurrentPrice(Number(e.target.value))}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Compra deseada</label>
              <input
                type="number"
                step="0.01"
                value={interestedBuyPrice}
                onChange={e => setInterestedBuyPrice(Number(e.target.value))}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-emerald-400 font-bold"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-300 font-semibold text-xs mb-1">Tesis de inversión / Notas</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej. Esperar corrección a soporte clave o resultados trimestrales"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs"
            >
              Guardar en radar
            </button>
          </div>
        </form>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {watchlist.map(item => {
          const discountPercent =
            item.currentPrice > 0
              ? (((item.currentPrice - item.interestedBuyPrice) / item.currentPrice) * 100).toFixed(1)
              : '0';

          return (
            <div
              key={item.id}
              className="bg-[#12233f] border border-slate-700/70 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-blue-500/50 transition-all space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="font-bold text-white font-mono text-base">{item.symbol}</span>
                    <span className="text-slate-300 text-xs font-semibold">{item.company}</span>
                  </div>
                  <button
                    onClick={() => onRemoveWatchlist(item.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                    title="Eliminar de seguimiento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Price metrics */}
                <div className="grid grid-cols-3 gap-2 mt-4 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Precio actual</span>
                    <span className="font-bold text-white font-mono text-sm">
                      {formatNumber(item.currentPrice)} {item.currency}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Mi precio objetivo</span>
                    <span className="font-bold text-blue-400 font-mono text-sm">
                      {formatNumber(item.targetPrice)} {item.currency}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Compra deseada</span>
                    <span className="font-bold text-emerald-400 font-mono text-sm">
                      {formatNumber(item.interestedBuyPrice)} {item.currency}
                    </span>
                  </div>
                </div>

                {item.notes && (
                  <p className="text-xs text-slate-400 mt-3 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
                    💡 <em>{item.notes}</em>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                <span className="text-slate-400 text-[11px]">
                  Distancia a precio de compra: <strong className="text-amber-400">{discountPercent}%</strong>
                </span>
                <button
                  onClick={() => onOpenBuyOperation(item.symbol)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Comprar ahora</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
