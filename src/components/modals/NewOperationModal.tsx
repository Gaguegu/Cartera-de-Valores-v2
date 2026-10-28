import React, { useState, useEffect } from 'react';
import { Operation, StockPosition, Broker } from '../../types/portfolio';
import { formatEUR, formatNumber } from '../../utils/formatters';
import { POPULAR_MARKET_STOCKS } from '../../data/marketDatabase';
import {
  X,
  PlusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
  Coins,
  AlertCircle,
  Briefcase,
  RotateCcw,
  Percent,
} from 'lucide-react';

interface NewOperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (operationData: {
    id?: string;
    type: 'Compra' | 'Venta';
    symbol: string;
    company: string;
    shares: number;
    price: number;
    totalEUR: number;
    commissionEUR: number;
    date: string;
    broker: string;
  }) => void;
  availablePositions: StockPosition[];
  brokers: Broker[];
  prefilledSymbol?: string;
  prefilledCompany?: string;
  prefilledPrice?: number;
  initialType?: 'Compra' | 'Venta';
  operationToEdit?: Operation | null;
  onRegisterDividend?: (op: Operation) => void;
  allOperations?: Operation[];
}

export function NewOperationModal({
  isOpen,
  onClose,
  onSubmit,
  availablePositions,
  brokers,
  prefilledSymbol,
  prefilledCompany,
  prefilledPrice,
  initialType = 'Compra',
  operationToEdit,
  onRegisterDividend,
  allOperations = [],
}: NewOperationModalProps) {
  const isEditing = Boolean(operationToEdit);

  // Helper para obtener siempre el broker ACTIVO del usuario
  const getActiveBrokerName = () => {
    const active = brokers.find(b => b.active);
    return active ? active.name : (brokers[0]?.name || 'Trade Republic');
  };

  const [type, setType] = useState<'Compra' | 'Venta'>(initialType);
  const [symbol, setSymbol] = useState('');
  const [company, setCompany] = useState('');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [commissionEUR, setCommissionEUR] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('es-ES'));
  const [broker, setBroker] = useState(getActiveBrokerName());

  // Función para limpiar completamente el formulario y dejarlo sin datos
  const handleClearForm = () => {
    setSymbol('');
    setCompany('');
    setShares('');
    setPrice('');
    setCommissionEUR('');
    setDate(new Date().toLocaleDateString('es-ES'));
    setBroker(getActiveBrokerName());
  };

  // Helper para admitir decimales libres con coma o punto sin bloqueos del navegador
  const handleDecimalChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    // Permite solo dígitos, comas y puntos
    val = val.replace(/[^0-9.,]/g, '');
    setter(val);
  };

  // Inicialización limpia al abrir o cambiar de modo
  useEffect(() => {
    if (isOpen) {
      if (operationToEdit) {
        setType(operationToEdit.type);
        setSymbol(operationToEdit.symbol);
        setCompany(operationToEdit.company);
        setShares(operationToEdit.shares !== undefined ? String(operationToEdit.shares) : '');
        setPrice(operationToEdit.price !== undefined ? String(operationToEdit.price) : '');
        setCommissionEUR(
          operationToEdit.commissionEUR !== undefined ? String(operationToEdit.commissionEUR) : ''
        );
        setDate(operationToEdit.date || new Date().toLocaleDateString('es-ES'));
        setBroker(operationToEdit.broker || getActiveBrokerName());
      } else if (prefilledSymbol) {
        const cleanSym = prefilledSymbol.trim().toUpperCase();
        setType(initialType || 'Compra');
        setSymbol(cleanSym);

        // Buscar primero en cartera, y si es nueva compra buscar en catálogo de cotizaciones
        const posMatch = availablePositions.find(p => p.symbol.toUpperCase() === cleanSym);
        const marketMatch = POPULAR_MARKET_STOCKS.find(
          m => (m.displaySymbol || m.symbol).toUpperCase() === cleanSym ||
               m.symbol.toUpperCase().startsWith(`${cleanSym}.`)
        );

        const resolvedCompany = prefilledCompany || posMatch?.company || marketMatch?.company || '';
        const resolvedPrice = prefilledPrice !== undefined && prefilledPrice > 0
          ? String(prefilledPrice)
          : (posMatch ? String(posMatch.currentPrice) : marketMatch ? String(marketMatch.priceEUR || marketMatch.price) : '');

        setCompany(resolvedCompany);
        setPrice(resolvedPrice);
        setShares('');
        setCommissionEUR('');
        setDate(new Date().toLocaleDateString('es-ES'));
        setBroker(getActiveBrokerName());
      } else {
        // SIN DATOS: Pantalla limpia sin datos de sesiones anteriores
        handleClearForm();
        setType(initialType || 'Compra');
      }
    }
  }, [isOpen, operationToEdit, prefilledSymbol, prefilledCompany, prefilledPrice, initialType, availablePositions, brokers]);

  if (!isOpen) return null;

  // Conversión numérica segura admitiendo comas (ej. 8,50 -> 8.50)
  const numShares = shares === '' ? 0 : parseFloat(shares.replace(',', '.')) || 0;
  const numPrice = price === '' ? 0 : parseFloat(price.replace(',', '.')) || 0;
  const numCommission = commissionEUR === '' ? 0 : parseFloat(commissionEUR.replace(',', '.')) || 0;
  const totalEUR = Number((numShares * numPrice).toFixed(2));

  // Posición actual en cartera si existe para esta empresa
  const currentHolding = availablePositions.find(
    p => p.symbol.toUpperCase() === symbol.trim().toUpperCase()
  );

  // Estimación de plusvalía / minusvalía si es venta
  const buyRefPrice = currentHolding?.buyPrice || 0;
  const costBasis = numShares * buyRefPrice;
  const netProceeds = numShares * numPrice - numCommission;
  const estimatedGainEUR = costBasis > 0 ? netProceeds - costBasis : (numPrice - buyRefPrice) * numShares - numCommission;
  const estimatedGainPercent = costBasis > 0 ? (estimatedGainEUR / costBasis) * 100 : 0;
  const isOverSelling = type === 'Venta' && currentHolding && numShares > currentHolding.shares;

  const handleSymbolChange = (sym: string) => {
    setSymbol(sym);
    const clean = sym.trim().toUpperCase();
    const posMatch = availablePositions.find(p => p.symbol.toUpperCase() === clean);
    const marketMatch = POPULAR_MARKET_STOCKS.find(
      m => (m.displaySymbol || m.symbol).toUpperCase() === clean ||
           m.symbol.toUpperCase().startsWith(`${clean}.`)
    );

    if (posMatch) {
      setCompany(posMatch.company);
      if (!price) {
        setPrice(String(posMatch.currentPrice));
      }
    } else if (marketMatch) {
      setCompany(marketMatch.company);
      if (!price) {
        setPrice(String(marketMatch.priceEUR || marketMatch.price));
      }
    }
  };

  const handleSelectPortfolioStock = (stockSymbol: string) => {
    const match = availablePositions.find(p => p.symbol.toUpperCase() === stockSymbol.toUpperCase());
    if (match) {
      setSymbol(match.symbol);
      setCompany(match.company);
      setPrice(String(match.currentPrice));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim() || numShares <= 0 || numPrice <= 0) return;

    if (isOverSelling) {
      return;
    }

    onSubmit({
      id: operationToEdit?.id,
      type,
      symbol: symbol.trim().toUpperCase(),
      company: company.trim() || symbol.trim().toUpperCase(),
      shares: numShares,
      price: numPrice,
      totalEUR,
      commissionEUR: numCommission,
      date,
      broker,
    });
    // Limpiar formulario tras guardar para que la próxima vez salga sin datos anteriores
    handleClearForm();
    onClose();
  };

  const handleModalClose = () => {
    handleClearForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Pencil className="w-5 h-5 text-cyan-400" />
            ) : type === 'Compra' ? (
              <PlusCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <ArrowUpRight className="w-5 h-5 text-amber-400" />
            )}
            <h3 className="text-lg font-bold text-white">
              {isEditing
                ? 'Editar Operación de Bolsa'
                : type === 'Compra'
                ? 'Nueva Compra de Acciones'
                : 'Venta de Acciones en Cartera'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearForm}
              className="text-[11px] text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
              title="Borrar todos los campos y empezar con el formulario en blanco"
            >
              <RotateCcw className="w-3 h-3 text-cyan-400" />
              <span>Limpiar datos</span>
            </button>
            <button onClick={handleModalClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Operation Type Switch */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setType('Compra')}
              className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                type === 'Compra'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" /> COMPRA
            </button>
            <button
              type="button"
              onClick={() => setType('Venta')}
              className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                type === 'Venta'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" /> VENTA
            </button>
          </div>

          {/* Selector rápido para Venta si hay acciones en cartera */}
          {type === 'Venta' && availablePositions.length > 0 && !isEditing && (
            <div className="p-3 bg-amber-950/25 border border-amber-500/30 rounded-xl space-y-1.5">
              <label className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                Seleccionar acción que tienes en cartera para vender:
              </label>
              <select
                value={symbol}
                onChange={e => handleSelectPortfolioStock(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">-- Elige una acción de tu cartera --</option>
                {availablePositions.map(pos => (
                  <option key={pos.id} value={pos.symbol}>
                    {pos.company} ({pos.symbol}) — {pos.shares} títulos disponibles (Coste medio: {formatNumber(pos.buyPrice)} €)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tarjeta de Asistente de Venta (Total o Parcial) */}
          {type === 'Venta' && currentHolding && (
            <div className="p-3.5 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 border border-amber-500/40 rounded-xl space-y-2.5 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span className="text-slate-300 font-semibold">{currentHolding.company} ({currentHolding.symbol}):</span>
                  <span className="text-amber-300 font-bold font-mono">{currentHolding.shares} títulos en cartera</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Precio medio compra: <strong className="text-white font-mono">{formatNumber(currentHolding.buyPrice)} €</strong>
                </span>
              </div>

              {/* Botones de Venta Rápida: Total o Parcial */}
              <div>
                <span className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                  ¿Cuántos títulos vas a vender? (Venta Total o Parcial)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShares(String(currentHolding.shares))}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      numShares === currentHolding.shares
                        ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/50'
                        : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    Venta Total (100% · {currentHolding.shares} acc.)
                  </button>
                  {currentHolding.shares >= 2 && (
                    <button
                      type="button"
                      onClick={() => setShares(String(Math.round(currentHolding.shares * 0.75)))}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        numShares === Math.round(currentHolding.shares * 0.75)
                          ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/50'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      Venta 75% ({Math.round(currentHolding.shares * 0.75)} acc.)
                    </button>
                  )}
                  {currentHolding.shares >= 2 && (
                    <button
                      type="button"
                      onClick={() => setShares(String(Math.floor(currentHolding.shares / 2)))}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        numShares === Math.floor(currentHolding.shares / 2)
                          ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/50'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      Venta 50% ({Math.floor(currentHolding.shares / 2)} acc.)
                    </button>
                  )}
                  {currentHolding.shares >= 4 && (
                    <button
                      type="button"
                      onClick={() => setShares(String(Math.floor(currentHolding.shares / 4)))}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        numShares === Math.floor(currentHolding.shares / 4)
                          ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/50'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      Venta 25% ({Math.floor(currentHolding.shares / 4)} acc.)
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-tight">
                  💡 Pulsa un botón de porcentaje o escribe en la casilla de abajo el <strong>número exacto de títulos</strong> que deseas vender.
                </p>
              </div>

              {/* Aviso si excede los títulos en cartera */}
              {isOverSelling && (
                <div className="p-2 rounded-lg bg-red-950/80 border border-red-500/50 text-red-300 text-xs flex items-center gap-1.5 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>No puedes vender más de los {currentHolding.shares} títulos que tienes en cartera.</span>
                </div>
              )}

              {/* Plusvalía / Minusvalía estimada en tiempo real */}
              {numShares > 0 && numPrice > 0 && !isOverSelling && (
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Resultado fiscal estimado:</span>
                  <span className={`font-mono font-bold text-sm ${estimatedGainEUR >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {estimatedGainEUR >= 0 ? `+${formatEUR(estimatedGainEUR)}` : formatEUR(estimatedGainEUR)}
                    {' '}({estimatedGainPercent >= 0 ? `+${estimatedGainPercent.toFixed(2)}` : estimatedGainPercent.toFixed(2)}%)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Symbol & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Símbolo (Ticker)
              </label>
              <input
                type="text"
                value={symbol}
                onChange={e => handleSymbolChange(e.target.value.toUpperCase())}
                placeholder="Ej. NTGY, MSFT, SAN"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 uppercase font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nombre de la Empresa
              </label>
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="Ej. Naturgy, Microsoft"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Shares & Price (Permite cualquier número de decimales sin bloqueo) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Cantidad de Acciones
                </label>
                {currentHolding && type === 'Venta' && (
                  <span className="text-[11px] text-amber-400/90 font-mono">
                    Máx: {currentHolding.shares}
                  </span>
                )}
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={shares}
                onChange={handleDecimalChange(setShares)}
                placeholder={currentHolding && type === 'Venta' ? `Máx. ${currentHolding.shares}` : 'Ej. 50'}
                required
                className={`w-full bg-slate-950 border rounded-xl px-3 py-2 text-sm text-white focus:outline-none font-mono ${
                  isOverSelling ? 'border-red-500 focus:border-red-400' : 'border-slate-700 focus:border-blue-500'
                }`}
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Número entero o con decimales
              </span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {type === 'Compra' ? 'Precio de Compra por Acción (€)' : 'Precio de Venta por Acción (€)'}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={price}
                onChange={handleDecimalChange(setPrice)}
                placeholder="0.00"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Permite 2, 3 o 4 decimales (ej. 25,60 €)
              </span>
            </div>
          </div>

          {/* Commission & Broker (Permite mínimo 2 decimales y cualquier número libre) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Comisión del Broker (€)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={commissionEUR}
                onChange={handleDecimalChange(setCommissionEUR)}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              />
              <span className="text-[10px] text-cyan-400 block mt-0.5">
                Mínimo 2 decimales (usa coma o punto, ej. 8,50 o 8.50 €)
              </span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Broker utilizado
              </label>
              <select
                value={broker}
                onChange={e => setBroker(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-medium"
              >
                {[...brokers].sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0)).map(b => (
                  <option key={b.id} value={b.name}>
                    {b.name} ({b.type}){b.active ? ' — [ACTIVO]' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Fecha de Ejecución (DD/MM/AAAA)
            </label>
            <input
              type="text"
              value={date}
              onChange={e => setDate(e.target.value)}
              placeholder="DD/MM/AAAA"
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {/* Total Preview */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">
              {type === 'Compra' ? 'Importe Total de Compra Estimado:' : 'Importe Bruto de Venta Estimado:'}
            </span>
            <span className={`font-bold text-base font-mono ${type === 'Compra' ? 'text-emerald-400' : 'text-amber-400'}`}>
              {formatEUR(totalEUR)}
            </span>
          </div>

          {/* Acción directa: Registrar dividendo de esta empresa */}
          {isEditing && type === 'Compra' && onRegisterDividend && (() => {
            const symbolPurchases = allOperations.filter(
              o => o.symbol.toUpperCase() === symbol.toUpperCase() && o.type === 'Compra'
            );
            const matchingPos = availablePositions.find(
              p => p.symbol.toUpperCase() === symbol.toUpperCase()
            );
            const totalPortfolioShares = matchingPos ? matchingPos.shares : numShares;
            const hasMultiple = symbolPurchases.length > 1;

            return (
              <div className="p-4 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/80 border border-emerald-500/50 rounded-xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5 shadow-sm">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span className="text-emerald-300">Cobro de dividendos de esta empresa</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-200 border border-emerald-700 font-mono font-bold">
                        {symbol} · {company}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      {hasMultiple ? (
                        <>
                          Tienes <strong className="text-white font-mono">{symbolPurchases.length} compras</strong> de {company} que suman <strong className="text-emerald-300 font-mono">{totalPortfolioShares} títulos</strong> en cartera (esta compra concreta tiene {numShares} títulos).
                          <span className="block text-cyan-300 font-semibold mt-0.5">
                            ✓ Al pulsar podrás elegir calcular el dividendo sobre los {totalPortfolioShares} títulos totales de la cartera o solo sobre esta compra.
                          </span>
                        </>
                      ) : (
                        <>
                          Abre el registro con la empresa <strong>{company}</strong> fijada con candado y sus {numShares} títulos listos para calcular el importe neto.
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (operationToEdit) {
                      onRegisterDividend({
                        ...operationToEdit,
                        symbol,
                        company,
                        shares: numShares,
                      });
                    }
                  }}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shrink-0 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <Coins className="w-4 h-4" />
                  <span>Registrar dividendo</span>
                </button>
              </div>
            );
          })()}

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={handleModalClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={Boolean(isOverSelling)}
              className={`px-5 py-2 text-white rounded-xl text-xs font-bold transition-colors shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                type === 'Compra' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'
              }`}
            >
              {isEditing ? (
                <>
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Guardar Cambios</span>
                </>
              ) : type === 'Compra' ? (
                <>
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Registrar Compra</span>
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Registrar Venta</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

