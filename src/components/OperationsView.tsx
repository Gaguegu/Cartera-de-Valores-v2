import React, { useState, useMemo } from 'react';
import { Operation } from '../types/portfolio';
import { formatEUR, formatNumber, downloadCSV, getAvailableFiscalYears, parseYearFromDate, parseDateToTimestamp } from '../utils/formatters';
import { Plus, Search, Filter, Download, Trash2, ArrowUpDown, Pencil, Coins, Printer, ArrowDownUp } from 'lucide-react';

interface OperationsViewProps {
  operations: Operation[];
  onOpenNewOperation: () => void;
  onEditOperation: (op: Operation) => void;
  onDeleteOperation: (id: string) => void;
  onRegisterDividend?: (op: Operation) => void;
  onOpenNewDividend?: () => void;
  onOpenPrintReport?: (
    type: 'operations' | 'full' | 'annual' | 'tax',
    options?: { charts?: boolean; dividends?: boolean; closed?: boolean; year?: number | string }
  ) => void;
}

export function OperationsView({
  operations,
  onOpenNewOperation,
  onEditOperation,
  onDeleteOperation,
  onRegisterDividend,
  onOpenNewDividend,
  onOpenPrintReport,
}: OperationsViewProps) {
  const [filterType, setFilterType] = useState<string>('Todos');
  const [filterYear, setFilterYear] = useState<string>('Todos los años');
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileView, setMobileView] = useState<'cards' | 'table'>('cards');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => {
    const saved = localStorage.getItem('cartera_operations_sort_dir');
    return saved === 'desc' ? 'desc' : 'asc';
  });

  const handleToggleSortDirection = (newDir?: 'asc' | 'desc') => {
    const next = newDir || (sortDirection === 'asc' ? 'desc' : 'asc');
    setSortDirection(next);
    localStorage.setItem('cartera_operations_sort_dir', next);
  };

  // Años dinámicos que se expanden automáticamente para 2027 y futuros
  const availableYears = useMemo(() => {
    const yearsFromOps = operations.map(o => parseYearFromDate(o.date));
    return getAvailableFiscalYears(yearsFromOps);
  }, [operations]);

  const filtered = operations.filter(op => {
    const matchesType = filterType === 'Todos' || op.type === filterType;
    const matchesYear =
      filterYear === 'Todos los años' ||
      parseYearFromDate(op.date) === parseInt(filterYear, 10);
    const matchesSearch =
      op.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.company.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesYear && matchesSearch;
  });

  // Ordenar cronológicamente por fecha exacta (asc: 2025 -> 2026, desc: 2026 -> 2025)
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const timeA = parseDateToTimestamp(a.date);
      const timeB = parseDateToTimestamp(b.date);
      if (timeA !== timeB) {
        return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
      }
      return (a.symbol || '').localeCompare(b.symbol || '');
    });
  }, [filtered, sortDirection]);

  const totalCommissions = sorted.reduce((acc, op) => acc + (op.commissionEUR || 0), 0);
  const totalVolume = sorted.reduce((acc, op) => acc + op.totalEUR, 0);

  const handleExportCSV = () => {
    const headers = ['Fecha', 'Tipo', 'Símbolo', 'Empresa', 'Cantidad', 'Precio (€)', 'Total (€)', 'Comisión (€)', 'Broker'];
    const rows = sorted.map(op => [
      op.date,
      op.type,
      op.symbol,
      op.company,
      op.shares,
      op.price,
      op.totalEUR,
      op.commissionEUR,
      op.broker || '',
    ]);
    downloadCSV('Cartera_Valores_Operaciones.csv', rows, headers);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top Bar - Screen 4 Header (Fijo en la parte superior, sin huecos en móvil) */}
      <div className="sticky top-[56px] sm:top-0 z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 bg-[#0e1b30] sm:bg-[#12233f] p-2.5 sm:p-4 -mx-2 sm:mx-0 rounded-none sm:rounded-2xl border-b sm:border border-slate-700/80 shadow-md sm:shadow-xl backdrop-blur-md">
        {/* Identificador de pantalla para móvil y escritorio */}
        <div className="flex items-center justify-between gap-2 pb-1.5 sm:pb-0 border-b border-slate-700/60 sm:border-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              📝 Operaciones
            </h2>
          </div>
          <span className="text-[11px] font-bold text-cyan-300 bg-cyan-950/60 px-2.5 py-0.5 rounded-lg border border-cyan-500/40 font-mono">
            {filtered.length} {filtered.length === 1 ? 'operación' : 'operaciones'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Type */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="Todos">Todos</option>
            <option value="Compra">Compras</option>
            <option value="Venta">Ventas</option>
          </select>

          <select
            value={filterYear}
            onChange={e => setFilterYear(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
          >
            <option value="Todos los años">Todos los años</option>
            {availableYears.map(yr => (
              <option key={yr} value={String(yr)}>
                {yr}
              </option>
            ))}
          </select>



          <button
            onClick={() => {
              if (onOpenPrintReport) {
                onOpenPrintReport('operations', {
                  year: filterYear === 'Todos los años' ? 'all' : filterYear,
                });
              } else {
                window.print();
              }
            }}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
            title="Generar PDF o imprimir las operaciones"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            <span>Generar PDF/Imprimir</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
            title="Exportar operaciones filtradas a CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Exportar CSV</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Operations Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenNewOperation}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva operación</span>
            </button>

            {onOpenNewDividend && (
              <button
                onClick={onOpenNewDividend}
                className="px-3.5 py-2 bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-500/40 text-emerald-200 hover:text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Registrar cobro de dividendo"
              >
                <Coins className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Registrar dividendo</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Selector de visualización en móvil: Tarjetas vs Tabla */}
      <div className="sm:hidden flex items-center justify-between bg-[#12233f] p-2.5 rounded-xl border border-slate-700/70 text-xs">
        <span className="text-slate-400 font-medium">Vista en móvil:</span>
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setMobileView('cards')}
            className={`px-3 py-1 rounded-md font-semibold transition-all ${
              mobileView === 'cards'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📱 Tarjetas
          </button>
          <button
            type="button"
            onClick={() => setMobileView('table')}
            className={`px-3 py-1 rounded-md font-semibold transition-all ${
              mobileView === 'table'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📄 Tabla
          </button>
        </div>
      </div>

      {/* Vista de Tarjetas para Móvil (sm:hidden) */}
      <div className={`sm:hidden space-y-3 ${mobileView === 'table' ? 'hidden' : 'block'}`}>
        {sorted.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-[#12233f] rounded-2xl border border-slate-700/70">
            <p className="font-semibold text-sm text-slate-300 mb-1">No hay operaciones</p>
            <p className="text-xs text-slate-500">
              {operations.length === 0
                ? 'No hay operaciones registradas aún.'
                : 'No se encontraron operaciones con los filtros seleccionados.'}
            </p>
          </div>
        ) : (
          sorted.map(op => {
            const isBuy = op.type === 'Compra';
            return (
              <div
                key={op.id}
                className="p-3.5 bg-[#12233f] rounded-2xl border border-slate-700/70 shadow-lg space-y-2.5"
              >
                {/* Cabecera de tarjeta: Badge Tipo + Fecha + Total */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold inline-block shadow-sm ${
                        isBuy
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {op.type}
                    </span>
                    <span className="font-mono text-xs text-slate-300">{op.date}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-medium">Total</span>
                    <span className="font-mono font-bold text-sm text-emerald-400">
                      {formatEUR(op.totalEUR)}
                    </span>
                  </div>
                </div>

                {/* Símbolo y Empresa */}
                <div>
                  <span className="font-mono font-bold text-base text-white">{op.symbol}</span>
                  <p className="text-xs text-slate-300 font-medium truncate">{op.company}</p>
                </div>

                {/* Grid métricas */}
                <div className="grid grid-cols-2 gap-2 bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/60 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Cantidad y Precio</span>
                    <span className="font-mono text-white text-xs font-semibold">
                      {op.shares} títulos · {formatNumber(op.price)} €
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-medium">Comisión / Broker</span>
                    <span className="font-mono text-slate-300 text-xs">
                      {formatNumber(op.commissionEUR)} € {op.broker ? `(${op.broker})` : ''}
                    </span>
                  </div>
                </div>

                {/* Acciones para móvil */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/60">
                  {isBuy && onRegisterDividend && (
                    <button
                      onClick={() => onRegisterDividend(op)}
                      className="flex-1 py-1.5 px-2 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>Dividendo</span>
                    </button>
                  )}
                  <button
                    onClick={() => onEditOperation(op)}
                    className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => onDeleteOperation(op.id)}
                    className="py-1.5 px-3 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors"
                    title="Eliminar operación"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Operations Table */}
      <div className={`bg-[#12233f] border border-slate-700/70 rounded-2xl shadow-xl overflow-hidden ${mobileView === 'table' ? 'block' : 'hidden sm:block'}`}>
        <div className="overflow-x-auto max-h-[calc(100vh-270px)] overflow-y-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-[#0e1b30] text-slate-400 font-semibold border-b border-slate-700/80 shadow-md">
              <tr>
                <th
                  onClick={() => handleToggleSortDirection()}
                  className="sticky top-0 z-10 bg-[#0e1b30] py-3.5 px-4 cursor-pointer hover:text-white select-none transition-colors group border-b border-slate-700/80"
                  title="Haz clic para alternar orden: más recientes primero o cronológico"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Fecha</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-300" />
                    <span className="text-[10px] text-blue-400/90 font-mono font-normal">
                      {sortDirection === 'asc' ? '▲' : '▼'}
                    </span>
                  </div>
                </th>
                <th className="sticky top-0 z-10 bg-[#0e1b30] py-3.5 px-4 border-b border-slate-700/80">Tipo</th>
                <th className="sticky top-0 z-10 bg-[#0e1b30] py-3.5 px-4 border-b border-slate-700/80">Símbolo</th>
                <th className="sticky top-0 z-10 bg-[#0e1b30] py-3.5 px-4 border-b border-slate-700/80">Empresa</th>
                <th className="sticky top-0 z-10 bg-[#0e1b30] py-3.5 px-4 text-right border-b border-slate-700/80">Cantidad</th>
                <th className="sticky top-0 z-10 bg-[#0e1b30] py-3.5 px-4 text-right border-b border-slate-700/80">Precio</th>
                <th className="sticky top-0 z-10 bg-[#0e1b30] py-3.5 px-4 text-right border-b border-slate-700/80">Total (€)</th>
                <th className="sticky top-0 z-10 bg-[#0e1b30] py-3.5 px-4 text-right border-b border-slate-700/80">Comisión</th>
                <th className="sticky top-0 z-10 bg-[#0e1b30] py-3.5 px-3 text-center border-b border-slate-700/80">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-sm text-slate-300 mb-1">No hay operaciones registradas</p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      {operations.length === 0
                        ? 'Tu registro de operaciones está vacío. Añade tus operaciones reales usando el botón «Nueva operación».'
                        : 'No se encontraron operaciones con los filtros seleccionados.'}
                    </p>
                  </td>
                </tr>
              ) : (
                sorted.map(op => (
                  <tr key={op.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4 text-slate-300 font-mono">{op.date}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold inline-block shadow-sm ${
                          op.type === 'Compra'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {op.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white font-mono">{op.symbol}</td>
                    <td className="py-3.5 px-4 text-slate-200 font-medium">{op.company}</td>
                    <td className="py-3.5 px-4 text-right font-medium text-white">{op.shares}</td>
                    <td className="py-3.5 px-4 text-right text-slate-300 font-mono">
                      {formatNumber(op.price)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400 font-mono">
                      {formatNumber(op.totalEUR)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-400 font-mono">
                      {formatNumber(op.commissionEUR)}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {op.type === 'Compra' && onRegisterDividend && (
                          <button
                            onClick={() => onRegisterDividend(op)}
                            className="px-2 py-1 text-emerald-300 hover:text-white bg-emerald-500/15 hover:bg-emerald-600 border border-emerald-500/30 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[11px] font-semibold shadow-sm"
                            title={`Registrar dividendo cobrado de ${op.company} (${op.shares} acc.)`}
                          >
                            <Coins className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="hidden sm:inline">Dividendo</span>
                          </button>
                        )}
                        <button
                          onClick={() => onEditOperation(op)}
                          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Editar operación"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteOperation(op.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar operación"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer info - Visible en móvil y escritorio */}
      <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 bg-[#0e1b30] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-400">
            Total operaciones listadas: <span className="text-white font-bold">{filtered.length}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-slate-400">
              Comisiones acumuladas: <span className="text-white font-bold font-mono">{formatEUR(totalCommissions)}</span>
            </div>
            <div className="text-slate-400">
              Volumen total transaccionado: <span className="text-emerald-400 font-bold font-mono">{formatEUR(totalVolume)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
