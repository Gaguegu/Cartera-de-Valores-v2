import React, { useState, useMemo } from 'react';
import { DividendRecord } from '../types/portfolio';
import { formatEUR, formatNumber, downloadCSV, getAvailableFiscalYears, parseDateToTimestamp } from '../utils/formatters';
import { Download, Plus, Printer, ArrowUpDown, Pencil, Trash2 } from 'lucide-react';

interface DividendsViewProps {
  dividends: DividendRecord[];
  onOpenNewDividend: () => void;
  onEditDividend?: (dividend: DividendRecord) => void;
  onDeleteDividend?: (dividendId: string) => void;
  onOpenPrintReport?: (
    type: 'dividends' | 'full' | 'annual' | 'tax',
    options?: { charts?: boolean; dividends?: boolean; closed?: boolean; year?: number | string }
  ) => void;
}

export function DividendsView({
  dividends,
  onOpenNewDividend,
  onEditDividend,
  onDeleteDividend,
  onOpenPrintReport,
}: DividendsViewProps) {
  const [selectedYear, setSelectedYear] = useState<string>('Todos los años');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Años dinámicos que se expanden automáticamente para 2027 y futuros
  const availableYears = useMemo(
    () => getAvailableFiscalYears(dividends.map(d => d.year)),
    [dividends]
  );

  const filtered = dividends.filter(d => {
    if (selectedYear === 'Todos los años') return true;
    return d.year === parseInt(selectedYear, 10);
  });

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const timeA = parseDateToTimestamp(a.date);
      const timeB = parseDateToTimestamp(b.date);
      if (timeA !== timeB) {
        return sortDirection === 'desc' ? timeB - timeA : timeA - timeB;
      }
      return (a.symbol || '').localeCompare(b.symbol || '');
    });
  }, [filtered, sortDirection]);

  const totalGross = sorted.reduce((acc, d) => acc + d.grossEUR, 0);
  const totalWithholding = sorted.reduce((acc, d) => acc + d.withholdingEUR, 0);
  const totalNet = sorted.reduce((acc, d) => acc + d.netEUR, 0);

  const handleExportCSV = () => {
    const headers = [
      'Fecha',
      'Empresa',
      'Símbolo',
      'Bruto (€)',
      'Retención Total (€)',
      'Retención Origen (€)',
      'Retención Destino (€)',
      'Neto (€)',
      'Año',
    ];
    const rows = sorted.map(d => [
      d.date,
      d.company,
      d.symbol,
      d.grossEUR,
      d.withholdingEUR,
      d.withholdingOriginEUR ?? '',
      d.withholdingDestinationEUR ?? '',
      d.netEUR,
      d.year,
    ]);
    downloadCSV(`Dividendos_${selectedYear}.csv`, rows, headers);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top Controls */}
      <div className="bg-[#12233f] border border-slate-700/70 p-4 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3.5 py-2 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="Todos los años">Todos los años</option>
            {availableYears.map(yr => (
              <option key={yr} value={String(yr)}>
                Año {yr}
              </option>
            ))}
          </select>

          {/* Selector de orden cronológico */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs font-medium text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <select
              value={sortDirection}
              onChange={e => setSortDirection(e.target.value as 'desc' | 'asc')}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-xs"
              title="Selecciona el orden de los dividendos por fecha"
            >
              <option value="desc" className="bg-slate-900 text-white">📅 Más recientes primero</option>
              <option value="asc" className="bg-slate-900 text-white">📅 Cronológico (antiguos primero)</option>
            </select>
          </div>

          <button
            onClick={() => {
              if (onOpenPrintReport) {
                onOpenPrintReport('dividends', {
                  year: selectedYear === 'Todos los años' ? 'all' : selectedYear,
                  dividends: true,
                  closed: false,
                  charts: false,
                });
              } else {
                window.print();
              }
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
            title="Generar PDF o imprimir dividendos"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            <span>Generar PDF/Imprimir</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
            title="Exportar dividendos a CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>

        <button
          onClick={onOpenNewDividend}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.01]"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar dividendo</span>
        </button>
      </div>

      {/* Dividends Table */}
      <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#0e1b30] text-slate-400 font-semibold border-b border-slate-700/80">
              <tr>
                <th
                  onClick={() => setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="py-3.5 px-4 cursor-pointer hover:text-white select-none transition-colors group"
                  title="Haz clic para alternar orden de fechas"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Fecha</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-300" />
                    <span className="text-[10px] text-blue-400/90 font-mono font-normal">
                      {sortDirection === 'desc' ? '▼' : '▲'}
                    </span>
                  </div>
                </th>
                <th className="py-3.5 px-4">Empresa</th>
                <th className="py-3.5 px-4">Símbolo</th>
                <th className="py-3.5 px-4 text-right">Bruto (€)</th>
                <th className="py-3.5 px-4 text-right">Retención (€)</th>
                <th className="py-3.5 px-4 text-right">Neto (€)</th>
                <th className="py-3.5 px-3 text-center w-24">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No hay dividendos registrados para el periodo seleccionado.
                  </td>
                </tr>
              ) : (
                sorted.map(div => {
                  const hasDbl =
                    div.hasDoubleWithholding ||
                    (div.withholdingOriginEUR != null &&
                      div.withholdingDestinationEUR != null &&
                      (div.withholdingOriginEUR > 0 || div.withholdingDestinationEUR > 0));

                  return (
                    <tr key={div.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4 text-slate-300 font-mono">{div.date}</td>
                      <td className="py-3.5 px-4 text-white font-medium">
                        <div className="flex items-center gap-1.5">
                          <span>{div.company}</span>
                          {hasDbl && (
                            <span
                              className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/80 font-bold"
                              title="Doble retención fiscal aplicada (Origen + Destino)"
                            >
                              Doble Ret.
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-blue-400 font-mono">{div.symbol}</td>
                      <td className="py-3.5 px-4 text-right font-medium text-white font-mono">
                        {formatNumber(div.grossEUR)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-rose-400 font-mono font-medium">
                        <span>{formatNumber(div.withholdingEUR)}</span>
                        {hasDbl && div.withholdingOriginEUR != null && div.withholdingDestinationEUR != null && (
                          <div className="text-[10px] text-slate-400 font-sans tracking-tight mt-0.5">
                            Orig: <span className="text-amber-300 font-mono font-semibold">{formatNumber(div.withholdingOriginEUR)} €</span> · Dest: <span className="text-rose-300 font-mono font-semibold">{formatNumber(div.withholdingDestinationEUR)} €</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400 font-mono">
                        {formatNumber(div.netEUR)}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {confirmDeleteId === div.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[10px] text-rose-300 font-bold">¿Borrar?</span>
                            <button
                              onClick={() => {
                                onDeleteDividend?.(div.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold cursor-pointer transition-colors shadow"
                              title="Confirmar eliminación"
                            >
                              Sí
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[10px] cursor-pointer transition-colors"
                              title="Cancelar"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onEditDividend?.(div)}
                              className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-600/30 rounded-lg transition-colors cursor-pointer"
                              title="Editar dividendo"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(div.id)}
                              className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-600/30 rounded-lg transition-colors cursor-pointer"
                              title="Borrar dividendo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="p-4 bg-[#0e1b30] border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="text-slate-300 font-bold text-sm">
            Total {selectedYear === 'Todos los años' ? 'General' : selectedYear}
          </div>
          <div className="flex items-center gap-6">
            <div className="text-slate-400">
              Bruto: <span className="text-white font-bold text-sm">{formatNumber(totalGross)} €</span>
            </div>
            <div className="text-slate-400">
              Retención: <span className="text-rose-400 font-bold text-sm">{formatNumber(totalWithholding)} €</span>
            </div>
            <div className="text-slate-400">
              Neto cobrado: <span className="text-emerald-400 font-bold text-base">{formatNumber(totalNet)} €</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
