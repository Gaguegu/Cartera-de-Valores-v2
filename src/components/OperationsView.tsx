import React, { useState, useMemo } from 'react';
import { Operation } from '../types/portfolio';
import { formatEUR, formatNumber, downloadCSV, getAvailableFiscalYears, parseYearFromDate } from '../utils/formatters';
import { Plus, Search, Filter, Download, Trash2, ArrowUpDown, Pencil, Coins, Printer } from 'lucide-react';

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

  const totalCommissions = filtered.reduce((acc, op) => acc + (op.commissionEUR || 0), 0);
  const totalVolume = filtered.reduce((acc, op) => acc + op.totalEUR, 0);

  const handleExportCSV = () => {
    const headers = ['Fecha', 'Tipo', 'Símbolo', 'Empresa', 'Cantidad', 'Precio (€)', 'Total (€)', 'Comisión (€)', 'Broker'];
    const rows = filtered.map(op => [
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
      {/* Top Bar - Screen 4 Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#12233f] p-4 rounded-2xl border border-slate-700/70 shadow-md">
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

      {/* Operations Table */}
      <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#0e1b30] text-slate-400 font-semibold border-b border-slate-700/80">
              <tr>
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">Tipo</th>
                <th className="py-3.5 px-4">Símbolo</th>
                <th className="py-3.5 px-4">Empresa</th>
                <th className="py-3.5 px-4 text-right">Cantidad</th>
                <th className="py-3.5 px-4 text-right">Precio</th>
                <th className="py-3.5 px-4 text-right">Total (€)</th>
                <th className="py-3.5 px-4 text-right">Comisión</th>
                <th className="py-3.5 px-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
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
                filtered.map(op => (
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

        {/* Footer info */}
        <div className="p-4 bg-[#0e1b30] border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs">
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
