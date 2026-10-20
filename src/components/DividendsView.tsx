import React, { useState, useMemo } from 'react';
import { DividendRecord } from '../types/portfolio';
import { formatEUR, formatNumber, downloadCSV, getAvailableFiscalYears, parseDateToTimestamp } from '../utils/formatters';
import { Download, Plus, DollarSign, Calendar, Printer, ArrowUpDown } from 'lucide-react';

interface DividendsViewProps {
  dividends: DividendRecord[];
  onOpenNewDividend: () => void;
  onOpenPrintReport?: (
    type: 'dividends' | 'full' | 'annual' | 'tax',
    options?: { charts?: boolean; dividends?: boolean; closed?: boolean; year?: number | string }
  ) => void;
}

export function DividendsView({ dividends, onOpenNewDividend, onOpenPrintReport }: DividendsViewProps) {
  const [selectedYear, setSelectedYear] = useState<string>('Todos los años');

  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

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
    const headers = ['Fecha', 'Empresa', 'Símbolo', 'Bruto (€)', 'Retención (€)', 'Neto (€)', 'Año'];
    const rows = sorted.map(d => [
      d.date,
      d.company,
      d.symbol,
      d.grossEUR,
      d.withholdingEUR,
      d.netEUR,
      d.year,
    ]);
    downloadCSV(`Dividendos_${selectedYear}.csv`, rows, headers);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top Controls - Screen 6 Header */}
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
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No hay dividendos registrados para el periodo seleccionado.
                  </td>
                </tr>
              ) : (
                sorted.map(div => (
                  <tr key={div.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4 text-slate-300 font-mono">{div.date}</td>
                    <td className="py-3.5 px-4 text-white font-medium">{div.company}</td>
                    <td className="py-3.5 px-4 font-bold text-blue-400 font-mono">{div.symbol}</td>
                    <td className="py-3.5 px-4 text-right font-medium text-white font-mono">
                      {formatNumber(div.grossEUR)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-rose-400 font-mono font-medium">
                      {formatNumber(div.withholdingEUR)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400 font-mono">
                      {formatNumber(div.netEUR)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary - Screen 6: Total 2024: 980,80 | 147,13 | 833,67 */}
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
