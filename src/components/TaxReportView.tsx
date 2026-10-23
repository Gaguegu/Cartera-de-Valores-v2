import React, { useState, useMemo } from 'react';
import { formatEUR, formatNumber, getAvailableFiscalYears } from '../utils/formatters';
import { FileText, CheckCircle2, Download, Printer, ShieldAlert, Info } from 'lucide-react';
import { ClosedPosition, DividendRecord } from '../types/portfolio';

interface TaxReportViewProps {
  onOpenPrintReport: (
    type: 'tax' | 'full' | 'annual',
    options?: { charts?: boolean; dividends?: boolean; closed?: boolean; year?: number | string }
  ) => void;
  closedPositions?: ClosedPosition[];
  dividends?: DividendRecord[];
}

export function TaxReportView({ onOpenPrintReport, closedPositions = [], dividends = [] }: TaxReportViewProps) {
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Años dinámicos que se expanden automáticamente para 2027, 2028 y futuros
  const availableYears = useMemo(
    () => getAvailableFiscalYears([
      ...closedPositions.map(c => c.year),
      ...dividends.map(d => d.year),
    ]),
    [closedPositions, dividends]
  );

  const isAll = selectedYear === 'all';
  const yearNum = parseInt(selectedYear, 10);

  const yearClosed = isAll
    ? closedPositions
    : closedPositions.filter(c => c.year === yearNum);

  const yearDividends = isAll
    ? dividends
    : dividends.filter(d => d.year === yearNum);

  const capitalGains = yearClosed.reduce((acc, c) => acc + (c.resultEUR || 0), 0);
  const grossDividends = yearDividends.reduce((acc, d) => acc + (d.grossEUR || 0), 0);
  const totalWithholdings = yearDividends.reduce((acc, d) => acc + (d.withholdingEUR || 0), 0);
  const netResult = capitalGains + (grossDividends - totalWithholdings);

  // Breakdown matching Screen 8
  const dividendDetails = {
    gross: grossDividends,
    withholdings: totalWithholdings,
    net: grossDividends - totalWithholdings,
  };

  const salesDetails = {
    gross: capitalGains,
    withholdings: 0,
    net: capitalGains,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Year Filter Header */}
      <div className="sticky top-0 z-20 bg-[#12233f] border border-slate-700/80 p-4 rounded-2xl shadow-xl backdrop-blur-md flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Fiscal / IRPF (Declaración de la Renta)
          </h2>
          <p className="text-xs text-slate-400">
            Cálculo conforme a la normativa española de la AEAT (Método FIFO y retenciones en origen)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3.5 py-2 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">Todos los años</option>
            {availableYears.map(yr => (
              <option key={yr} value={String(yr)}>
                Año: {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2 Main Panels from Screen 8 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Box: Resumen fiscal */}
        <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl p-5 sm:p-6 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2.5">
            Resumen fiscal ({selectedYear})
          </h3>

          <div className="space-y-3 font-mono text-sm">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-300 text-xs font-sans">Ganancias / pérdidas</span>
              <span
                className={`font-extrabold ${
                  capitalGains >= 0 ? 'text-emerald-400' : 'text-red-500'
                }`}
              >
                {capitalGains >= 0 ? `+${formatNumber(capitalGains)} €` : `${formatNumber(capitalGains)} €`}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-300 text-xs font-sans">Dividendos brutos</span>
              <span className="font-extrabold text-emerald-400">
                {formatNumber(grossDividends)} €
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-300 text-xs font-sans">Retenciones aplicadas</span>
              <span className="font-extrabold text-rose-400">
                {formatNumber(totalWithholdings)} €
              </span>
            </div>

            <div
              className={`flex items-center justify-between p-3 rounded-xl border ${
                netResult >= 0
                  ? 'bg-emerald-950/20 border-emerald-900/40'
                  : 'bg-red-950/20 border-red-900/40'
              }`}
            >
              <span className="text-slate-200 text-xs font-sans font-bold">Resultado neto</span>
              <span
                className={`font-black text-base ${
                  netResult >= 0 ? 'text-emerald-400' : 'text-red-500'
                }`}
              >
                {netResult >= 0 ? `+${formatNumber(netResult)} €` : `${formatNumber(netResult)} €`}
              </span>
            </div>
          </div>
        </div>

        {/* Right Box: Informe para Hacienda (Checklist and Button) */}
        <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl p-5 sm:p-6 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2.5">
              Informe para Hacienda
            </h3>

            <div className="py-3 space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Listado de operaciones de compra/venta</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Dividendos desglosados por empresa</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Resumen por país y doble imposición</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Retenciones aplicadas en origen y destino</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Listado oficial de pérdidas y ganancias FIFO</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onOpenPrintReport('tax', { year: selectedYear })}
            className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Generar PDF/Imprimir ({selectedYear === 'all' ? 'Todos los años' : `Año ${selectedYear}`})</span>
          </button>
        </div>
      </div>

      {/* Bottom Table: Detalle por tipo - Screen 8 */}
      <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 bg-[#0e1b30] border-b border-slate-700/80">
          <h3 className="text-sm font-bold text-white">Detalle por tipo ({selectedYear})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900/60 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4 text-right">Bruto (€)</th>
                <th className="py-3 px-4 text-right">Retenciones (€)</th>
                <th className="py-3 px-4 text-right">Neto (€)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-sans font-bold text-white">Dividendos</td>
                <td className="py-3 px-4 text-right text-slate-200">{formatNumber(dividendDetails.gross)} €</td>
                <td className="py-3 px-4 text-right text-rose-400">
                  {dividendDetails.withholdings > 0 ? `-${formatNumber(dividendDetails.withholdings)} €` : '0,00 €'}
                </td>
                <td
                  className={`py-3 px-4 text-right font-bold ${
                    dividendDetails.net > 0
                      ? 'text-emerald-400'
                      : dividendDetails.net < 0
                      ? 'text-red-500'
                      : 'text-slate-400'
                  }`}
                >
                  {dividendDetails.net > 0 ? `+${formatNumber(dividendDetails.net)} €` : `${formatNumber(dividendDetails.net)} €`}
                </td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-sans font-bold text-white">Ventas</td>
                <td
                  className={`py-3 px-4 text-right ${
                    salesDetails.gross > 0
                      ? 'text-emerald-400/90'
                      : salesDetails.gross < 0
                      ? 'text-red-400'
                      : 'text-slate-200'
                  }`}
                >
                  {salesDetails.gross > 0 ? `+${formatNumber(salesDetails.gross)} €` : `${formatNumber(salesDetails.gross)} €`}
                </td>
                <td className="py-3 px-4 text-right text-rose-400">
                  {salesDetails.withholdings > 0 ? `-${formatNumber(salesDetails.withholdings)} €` : '0,00 €'}
                </td>
                <td
                  className={`py-3 px-4 text-right font-bold ${
                    salesDetails.net > 0
                      ? 'text-emerald-400'
                      : salesDetails.net < 0
                      ? 'text-red-500 font-extrabold'
                      : 'text-slate-400'
                  }`}
                >
                  {salesDetails.net > 0 ? `+${formatNumber(salesDetails.net)} €` : `${formatNumber(salesDetails.net)} €`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Explanatory Tax Note */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 space-y-1">
        <span className="font-bold text-slate-300 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-400" /> Tramos de la Base Liquidable del Ahorro en España:
        </span>
        <p>
          Hasta 6.000 €: <strong>19%</strong> · De 6.000 a 50.000 €: <strong>21%</strong> · De 50.000 a 200.000 €: <strong>23%</strong> · De 200.000 a 300.000 €: <strong>27%</strong> · Más de 300.000 €: <strong>28%</strong>.
          Las retenciones practicadas en dividendos internacionales (formulario W-8BEN USA 15%) son deducibles por doble imposición internacional.
        </p>
      </div>
    </div>
  );
}
