import React, { useState, useMemo } from 'react';
import { Printer, Download, Eye, CheckSquare, Square, Layers, Sparkles } from 'lucide-react';
import { downloadCSV, getAvailableFiscalYears } from '../utils/formatters';
import { StockPosition, Operation, ClosedPosition, DividendRecord } from '../types/portfolio';

interface ReportsViewProps {
  positions: StockPosition[];
  operations: Operation[];
  closedPositions: ClosedPosition[];
  dividends: DividendRecord[];
  onOpenPrintReport: (
    type: 'full' | 'annual' | 'tax' | 'operations' | 'portfolio' | 'closed' | 'dividends',
    options?: {
      charts?: boolean;
      dividends?: boolean;
      closed?: boolean;
      portfolio?: boolean;
      operations?: boolean;
      year?: number | string;
    }
  ) => void;
}

export function ReportsView({
  positions,
  operations,
  closedPositions,
  dividends,
  onOpenPrintReport,
}: ReportsViewProps) {
  const [selectedReportType, setSelectedReportType] = useState<
    'full' | 'annual' | 'tax' | 'portfolio' | 'operations' | 'dividends' | 'closed'
  >('full');

  // Opciones de secciones individuales a incluir en el informe generado
  const [includePortfolio, setIncludePortfolio] = useState(true);
  const [includeOperations, setIncludeOperations] = useState(true);
  const [includeClosed, setIncludeClosed] = useState(true);
  const [includeDividends, setIncludeDividends] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [reportYear, setReportYear] = useState<string>('all');

  // Años dinámicos que se expanden automáticamente para 2026, 2027, etc.
  const availableYears = useMemo(
    () => getAvailableFiscalYears([
      ...operations.map(o => {
        const parts = o.date?.split(/[/-]/);
        return parts?.length === 3 ? Number(parts[2]) : undefined;
      }),
      ...closedPositions.map(c => c.year),
      ...dividends.map(d => d.year),
    ]),
    [operations, closedPositions, dividends]
  );

  const handleExportAllCSV = () => {
    const headers = [
      'Tipo de Registro',
      'Símbolo',
      'Empresa',
      'Detalle/Fecha',
      'Cantidad',
      'Precio (€)',
      'Total/Resultado (€)',
    ];

    const rows: (string | number)[][] = [
      ...positions.map(p => ['Posición Abierta', p.symbol, p.company, p.country, p.shares, p.buyPrice, p.currentValueEUR]),
      ...operations.map(o => [`Operación (${o.type})`, o.symbol, o.company, o.date, o.shares, o.price, o.totalEUR]),
      ...closedPositions.map(c => ['Posición Cerrada', c.symbol, c.company, c.saleDate, c.shares, c.salePrice, c.resultEUR]),
      ...dividends.map(d => ['Dividendo Cobrado', d.symbol, d.company, d.date, 1, d.grossEUR, d.netEUR]),
    ];

    downloadCSV('Cartera_Valores_Completa.csv', rows, headers);
  };

  const handleTriggerPrint = (
    type: 'full' | 'annual' | 'tax' | 'portfolio' | 'operations' | 'dividends' | 'closed'
  ) => {
    onOpenPrintReport(type, {
      portfolio: includePortfolio,
      operations: includeOperations,
      closed: includeClosed,
      dividends: includeDividends,
      charts: includeCharts,
      year: reportYear,
    });
  };

  const setAllSections = (val: boolean) => {
    setIncludePortfolio(val);
    setIncludeOperations(val);
    setIncludeClosed(val);
    setIncludeDividends(val);
    setIncludeCharts(val);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 3 Top Cards from Screen 9 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Informe completo */}
        <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl p-5 sm:p-6 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-base font-bold text-white">Informe completo</h3>
              <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold">
                Integral
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Cartera actual, dividendos, operaciones y análisis gráfico.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenPrintReport('full', {
                portfolio: includePortfolio,
                operations: includeOperations,
                closed: includeClosed,
                dividends: includeDividends,
                charts: includeCharts,
                year: reportYear,
              })}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="Ver vista previa en pantalla"
            >
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>Vista previa</span>
            </button>
            <button
              onClick={() => onOpenPrintReport('full', {
                portfolio: includePortfolio,
                operations: includeOperations,
                closed: includeClosed,
                dividends: includeDividends,
                charts: includeCharts,
                year: reportYear,
              })}
              className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Generar PDF</span>
            </button>
          </div>
        </div>

        {/* Card 2: Resumen anual */}
        <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl p-5 sm:p-6 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-base font-bold text-white">Resumen anual</h3>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                Anual
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Por años y empresas (ventas cerradas y cobros del ejercicio).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenPrintReport('annual', {
                portfolio: includePortfolio,
                operations: includeOperations,
                closed: includeClosed,
                dividends: includeDividends,
                charts: includeCharts,
                year: reportYear,
              })}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="Ver vista previa en pantalla"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>Vista previa</span>
            </button>
            <button
              onClick={() => onOpenPrintReport('annual', {
                portfolio: includePortfolio,
                operations: includeOperations,
                closed: includeClosed,
                dividends: includeDividends,
                charts: includeCharts,
                year: reportYear,
              })}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Generar PDF</span>
            </button>
          </div>
        </div>

        {/* Card 3: Listado para Hacienda */}
        <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl p-5 sm:p-6 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-base font-bold text-white">Listado para Hacienda</h3>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
                Fiscal D-100
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Modelo IRPF oficial con casillas AEAT y método FIFO.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenPrintReport('tax', {
                portfolio: includePortfolio,
                operations: includeOperations,
                closed: includeClosed,
                dividends: includeDividends,
                charts: includeCharts,
                year: reportYear,
              })}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="Ver vista previa en pantalla"
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>Vista previa</span>
            </button>
            <button
              onClick={() => onOpenPrintReport('tax', {
                portfolio: includePortfolio,
                operations: includeOperations,
                closed: includeClosed,
                dividends: includeDividends,
                charts: includeCharts,
                year: reportYear,
              })}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Generar PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Middle: Descarga a CSV/Excel */}
      <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl p-5 sm:p-6 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white mb-1">Descarga de datos a CSV/Excel</h3>
          <p className="text-xs text-slate-400">
            Descarga de datos completos (posiciones, operaciones, plusvalías y dividendos)
          </p>
        </div>

        <button
          onClick={handleExportAllCSV}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Descargar Excel / CSV</span>
        </button>
      </div>

      {/* Bottom: Opciones de impresión y configuración del informe */}
      <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl p-5 sm:p-6 shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              Opciones de impresión y configuración del informe
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Personaliza exactamente qué tipo de informe y qué secciones se mostrarán en la vista previa y en el PDF.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-400 font-medium">Ejercicio fiscal:</span>
            <select
              value={reportYear}
              onChange={e => setReportYear(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Todos los años</option>
              {availableYears.map(yr => (
                <option key={yr} value={String(yr)}>
                  Año {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 1. Selector de Tipo de Informe */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">
            1. Tipo de informe a generar:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {[
              { id: 'full', label: 'Completo', desc: 'Personalizado' },
              { id: 'annual', label: 'Resumen Anual', desc: 'Ventas y cobros' },
              { id: 'tax', label: 'Fiscal IRPF', desc: 'Modelo D-100' },
              { id: 'portfolio', label: 'Cartera Actual', desc: 'Activos vivos' },
              { id: 'operations', label: 'Operaciones', desc: 'Compras/Ventas' },
              { id: 'closed', label: 'Cerradas', desc: 'Plusvalías FIFO' },
              { id: 'dividends', label: 'Dividendos', desc: 'Cobros y ret.' },
            ].map(t => {
              const isActive = selectedReportType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedReportType(t.id as any)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isActive
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/50'
                      : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                  }`}
                >
                  <span className={`text-xs font-bold ${isActive ? 'text-blue-400' : 'text-slate-200'}`}>
                    {t.label}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                    {t.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Secciones a incluir en el informe */}
        <div className="space-y-2.5 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-xs font-semibold text-slate-300">
              2. Secciones incluidas (marca o desmarca para añadir o quitar secciones del documento):
            </label>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setAllSections(true)}
                className="text-blue-400 hover:text-blue-300 transition-colors text-[11px] font-medium cursor-pointer"
              >
                Marcar todas
              </button>
              <span className="text-slate-600">·</span>
              <button
                type="button"
                onClick={() => setAllSections(false)}
                className="text-slate-400 hover:text-slate-300 transition-colors text-[11px] font-medium cursor-pointer"
              >
                Desmarcar todas
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {/* Checkbox 1: Cartera Actual */}
            <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer select-none transition-all ${
              includePortfolio ? 'bg-slate-900/80 border-blue-500/50 text-white' : 'bg-slate-900/30 border-slate-800 text-slate-400'
            }`}>
              <input
                type="checkbox"
                checked={includePortfolio}
                onChange={e => setIncludePortfolio(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold block">Cartera actual</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Activos vivos en custodia</span>
              </div>
            </label>

            {/* Checkbox 2: Operaciones */}
            <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer select-none transition-all ${
              includeOperations ? 'bg-slate-900/80 border-blue-500/50 text-white' : 'bg-slate-900/30 border-slate-800 text-slate-400'
            }`}>
              <input
                type="checkbox"
                checked={includeOperations}
                onChange={e => setIncludeOperations(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold block">Operaciones</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Compras y ventas</span>
              </div>
            </label>

            {/* Checkbox 3: Operaciones Cerradas */}
            <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer select-none transition-all ${
              includeClosed ? 'bg-slate-900/80 border-blue-500/50 text-white' : 'bg-slate-900/30 border-slate-800 text-slate-400'
            }`}>
              <input
                type="checkbox"
                checked={includeClosed}
                onChange={e => setIncludeClosed(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold block">Operaciones cerradas</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Transmisiones FIFO</span>
              </div>
            </label>

            {/* Checkbox 4: Dividendos */}
            <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer select-none transition-all ${
              includeDividends ? 'bg-slate-900/80 border-blue-500/50 text-white' : 'bg-slate-900/30 border-slate-800 text-slate-400'
            }`}>
              <input
                type="checkbox"
                checked={includeDividends}
                onChange={e => setIncludeDividends(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold block">Dividendos</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Cobros y retenciones</span>
              </div>
            </label>

            {/* Checkbox 5: Gráficos */}
            <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer select-none transition-all ${
              includeCharts ? 'bg-slate-900/80 border-blue-500/50 text-white' : 'bg-slate-900/30 border-slate-800 text-slate-400'
            }`}>
              <input
                type="checkbox"
                checked={includeCharts}
                onChange={e => setIncludeCharts(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold block">Gráficos</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Análisis y distribución</span>
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons: Vista previa y Generar PDF */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <p className="text-[11px] text-slate-400 mr-auto">
            La vista previa reflejará exactamente el tipo seleccionado ({selectedReportType}) y las secciones activadas.
          </p>

          <button
            onClick={() => handleTriggerPrint(selectedReportType)}
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Vista previa</span>
          </button>

          <button
            onClick={() => handleTriggerPrint(selectedReportType)}
            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Generar PDF/Imprimir</span>
          </button>
        </div>
      </div>
    </div>
  );
}
