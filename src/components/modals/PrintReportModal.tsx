import React, { useState, useEffect, useMemo } from 'react';
import { X, Printer, Calendar, Filter, Info, RotateCcw } from 'lucide-react';
import { StockPosition, Operation, ClosedPosition, DividendRecord } from '../../types/portfolio';
import {
  formatEUR,
  formatNumber,
  formatPercent,
  getAvailableFiscalYears,
  parseDateToTimestamp,
  getDividendCountry,
  COUNTRY_WITHHOLDINGS,
} from '../../utils/formatters';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: 'operations' | 'portfolio' | 'closed' | 'dividends' | 'tax' | 'full' | 'annual';
  positions: StockPosition[];
  operations: Operation[];
  closedPositions: ClosedPosition[];
  dividends: DividendRecord[];
  initialYear?: number | string;
  options?: {
    charts: boolean;
    dividends: boolean;
    closed: boolean;
    country?: string;
    withholdingType?: string;
  };
}

export function PrintReportModal({
  isOpen,
  onClose,
  reportType,
  positions,
  operations,
  closedPositions,
  dividends,
  initialYear,
  options = { charts: true, dividends: true, closed: true },
}: PrintReportModalProps) {
  // Helper para extraer el año numérico de forma robusta de cualquier registro
  const getRecordYear = (rec: { year?: number | string; saleDate?: string; date?: string }) => {
    if (rec.year !== undefined && rec.year !== null) {
      const y = Number(rec.year);
      if (!isNaN(y)) return y;
    }
    const dStr = rec.saleDate || rec.date;
    if (dStr) {
      const parts = dStr.split(/[/-]/);
      if (parts.length === 3) {
        const y = Number(parts[2]);
        if (!isNaN(y)) return y;
      }
    }
    return undefined;
  };

  // Lista limpia y dinámica de ejercicios fiscales disponibles (incluye operaciones, cerradas y dividendos)
  const availableYears = useMemo(() => {
    return getAvailableFiscalYears([
      ...operations.map(o => getRecordYear(o)),
      ...closedPositions.map(c => getRecordYear(c)),
      ...dividends.map(d => getRecordYear(d)),
    ]);
  }, [operations, closedPositions, dividends]);

  const [selectedYear, setSelectedYear] = useState<string>(() => {
    if (initialYear !== undefined) return String(initialYear);
    return 'all';
  });

  const [selectedCountry, setSelectedCountry] = useState<string>(options?.country || 'all');
  const [selectedWithholdingType, setSelectedWithholdingType] = useState<string>(options?.withholdingType || 'all');
  const [activeReportType, setActiveReportType] = useState<PrintReportModalProps['reportType']>(reportType);

  // Lista única de países para filtrar dividendos
  const availableCountries = useMemo(() => {
    const countrySet = new Set<string>();
    dividends.forEach(d => {
      const c = getDividendCountry(d, positions);
      if (c) countrySet.add(c);
    });
    ['EE.UU.', 'España', 'Alemania'].forEach(c => countrySet.add(c));
    return Array.from(countrySet).sort((a, b) => {
      if (a === 'España') return -1;
      if (b === 'España') return 1;
      if (a === 'EE.UU.') return -1;
      if (b === 'EE.UU.') return 1;
      return a.localeCompare(b);
    });
  }, [dividends, positions]);

  useEffect(() => {
    if (isOpen) {
      setActiveReportType(reportType);
      if (initialYear !== undefined) {
        setSelectedYear(String(initialYear));
      } else if (!selectedYear) {
        setSelectedYear('all');
      }
      if (options?.country !== undefined) {
        setSelectedCountry(options.country);
      }
      if (options?.withholdingType !== undefined) {
        setSelectedWithholdingType(options.withholdingType);
      }
    }
  }, [isOpen, initialYear, reportType, options]);

  if (!isOpen) return null;

  const isAllYears = selectedYear === 'all';
  const yearNum = parseInt(selectedYear, 10);
  const yearLabel = isAllYears ? 'Histórico Completo (Todos los años)' : `Año ${selectedYear}`;
  const yearExerciseLabel = isAllYears ? 'Histórico Completo' : `Ejercicio ${selectedYear}`;

  const totalValue = positions.reduce((acc, p) => acc + (p.currentValueEUR || 0), 0);
  const totalGain = positions.reduce((acc, p) => acc + (p.gainLossEUR || 0), 0);

  // Filtrado robusto de operaciones, posiciones cerradas y dividendos por el año seleccionado (ordenadas por fecha cronológica)
  const filteredOperations = operations
    .filter(op => {
      const y = getRecordYear(op);
      if (isAllYears) return true;
      return y === yearNum;
    })
    .sort((a, b) => parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date));

  const totalBuysEUR = filteredOperations
    .filter(op => op.type === 'Compra')
    .reduce((acc, op) => acc + (op.totalEUR || 0), 0);

  const totalSellsEUR = filteredOperations
    .filter(op => op.type === 'Venta')
    .reduce((acc, op) => acc + (op.totalEUR || 0), 0);

  const totalVolumeEUR = filteredOperations.reduce((acc, op) => acc + (op.totalEUR || 0), 0);
  const totalCommissionsEUR = filteredOperations.reduce((acc, op) => acc + (op.commissionEUR || 0), 0);
  const totalSharesTraded = filteredOperations.reduce((acc, op) => acc + (op.shares || 0), 0);

  const filteredClosed = closedPositions.filter(c => {
    const y = getRecordYear(c);
    if (isAllYears) return true;
    return y === yearNum;
  });

  // Helper para verificar el tipo de retención en dividendos
  const checkWithholdingType = (d: DividendRecord) => {
    const hasOrigin = Boolean(d.withholdingOriginEUR && d.withholdingOriginEUR > 0);
    const hasDest = Boolean(d.withholdingDestinationEUR && d.withholdingDestinationEUR > 0);
    const isDouble = Boolean(d.hasDoubleWithholding) || (hasOrigin && hasDest);

    if (isDouble) return 'double';
    if (d.withholdingEUR === 0) return 'exempt';

    const c = getDividendCountry(d, positions);
    if (hasOrigin && !hasDest) return 'origin';
    if (hasDest && !hasOrigin) return 'destination';

    if (c === 'España') return 'destination';
    return 'origin';
  };

  // Filtrado de dividendos según Año, País y Tipo de Retención
  const filteredDividends = dividends.filter(d => {
    const y = getRecordYear(d);
    if (!isAllYears && y !== yearNum) return false;

    if (selectedCountry !== 'all') {
      const c = getDividendCountry(d, positions);
      if (c !== selectedCountry) return false;
    }

    if (selectedWithholdingType !== 'all') {
      const type = checkWithholdingType(d);
      if (selectedWithholdingType === 'double' && type !== 'double') return false;
      if (selectedWithholdingType === 'origin' && type !== 'origin') return false;
      if (selectedWithholdingType === 'destination' && type !== 'destination') return false;
      if (selectedWithholdingType === 'exempt' && type !== 'exempt') return false;
    }

    return true;
  });

  const totalDividends = filteredDividends.reduce((acc, d) => acc + (d.grossEUR || 0), 0);
  const totalWithholding = filteredDividends.reduce((acc, d) => acc + (d.withholdingEUR || 0), 0);
  const totalOriginWithholding = filteredDividends.reduce((acc, d) => {
    if (d.withholdingOriginEUR != null) return acc + d.withholdingOriginEUR;
    if (!d.hasDoubleWithholding && getDividendCountry(d, positions) !== 'España') {
      return acc + (d.withholdingEUR || 0);
    }
    return acc;
  }, 0);
  const totalDestWithholding = filteredDividends.reduce((acc, d) => {
    if (d.withholdingDestinationEUR != null) return acc + d.withholdingDestinationEUR;
    if (!d.hasDoubleWithholding && getDividendCountry(d, positions) === 'España') {
      return acc + (d.withholdingEUR || 0);
    }
    return acc;
  }, 0);

  const closedGains = filteredClosed.reduce((acc, c) => acc + (c.resultEUR || 0), 0);
  const netDividends = totalDividends - totalWithholding;

  const totalSaleValue = filteredClosed.reduce((acc, c) => acc + (c.salePrice * c.shares), 0);
  const totalAcquisitionValue = filteredClosed.reduce((acc, c) => acc + (c.buyPrice !== undefined ? c.buyPrice * c.shares : Math.max(0, (c.salePrice * c.shares) - (c.resultEUR || 0))), 0);
  // Coste real invertido en euros en la cartera (exacto valor actual - plusvalía)
  const totalInvested = positions.reduce((acc, p) => acc + (p.currentValueEUR - (p.gainLossEUR || 0)), 0);

  const handlePrint = () => {
    window.print();
  };

  const getTitle = () => {
    switch (activeReportType) {
      case 'operations':
        return `LIBRO OFICIAL DE OPERACIONES — HISTORIAL DE TRANSACCIONES (${yearLabel.toUpperCase()})`;
      case 'portfolio':
        return `INFORME OFICIAL DE CARTERA ACTUAL — ACTIVOS EN CUSTODIA (${yearLabel.toUpperCase()})`;
      case 'closed':
        return `INFORME DE PLUSVALÍAS Y PÉRDIDAS PATRIMONIALES FIFO (${yearLabel.toUpperCase()})`;
      case 'dividends':
        return `INFORME DE RENDIMIENTOS DEL CAPITAL MOBILIARIO — DIVIDENDOS (${yearLabel.toUpperCase()})`;
      case 'tax':
        return `INFORME FISCAL OFICIAL IRPF (MODELO D-100) — ${yearLabel.toUpperCase()}`;
      case 'annual':
        return `INFORME FINANCIERO ANUAL DE RENDIMIENTOS — ${yearLabel.toUpperCase()}`;
      case 'full':
      default:
        return `INFORME INTEGRAL DE CARTERA DE INVERSIÓN — ${yearLabel.toUpperCase()}`;
    }
  };

  const getSubtitle = () => {
    switch (activeReportType) {
      case 'operations':
        return 'Registro Cronológico de Compras, Ventas y Comisiones';
      case 'portfolio':
        return 'Estado Consolidado de Activos y Valoración a Mercado';
      case 'closed':
        return 'Transmisiones Realizadas y Ganancias Computables';
      case 'dividends':
        return 'Detalle de Cobros, Rendimientos Íntegros y Retenciones IRPF';
      case 'tax':
        return 'Informe Fiscal Conforme al Modelo D-100 de la AEAT';
      default:
        return 'Informe Contable y Fiscal de Inversiones Patrimoniales';
    }
  };

  return (
    <div className="report-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 print:bg-white print:p-0 print:m-0 print:static print:inset-auto print:backdrop-blur-none print:shadow-none print:w-full print:min-h-0 print:h-auto print:block">
      <div className="report-modal-card bg-white text-slate-900 rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 print:bg-white print:border-none print:shadow-none print:rounded-none print:max-w-none print:w-full print:min-h-0 print:h-auto print:max-h-none print:overflow-visible print:m-0 print:static print:block">
        {/* Top Control Bar (Oculto al imprimir o guardar en PDF) */}
        <div className="no-print p-4 bg-slate-900 text-white flex flex-col gap-3 border-b border-slate-800 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-400 shrink-0" />
              <div>
                <h3 className="font-bold text-sm">
                  {activeReportType === 'operations'
                    ? 'Libro Oficial de Operaciones para Impresión y PDF'
                    : activeReportType === 'portfolio'
                    ? 'Informe de Cartera Actual para Impresión y PDF'
                    : 'Informe Oficial para Impresión y PDF'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Ejercicio: <strong className="text-white">{yearLabel}</strong> · Formato vector A4 listo para guardar en PDF
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Selector interactivo de ejercicio en la cabecera */}
              <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
                <span className="text-slate-400 text-[11px] font-medium">Ejercicio:</span>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(e.target.value)}
                  className="bg-slate-900 border border-slate-600 text-white rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none focus:border-blue-400 cursor-pointer"
                >
                  <option value="all">Todos los años</option>
                  {availableYears.map(yr => (
                    <option key={yr} value={String(yr)}>
                      Año {yr}
                    </option>
                  ))}
                </select>
              </div>

              {activeReportType === 'dividends' && (
                <>
                  {/* Selector interactivo de País */}
                  <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
                    <span className="text-slate-400 text-[11px] font-medium">País:</span>
                    <select
                      value={selectedCountry}
                      onChange={e => setSelectedCountry(e.target.value)}
                      className="bg-slate-900 border border-slate-600 text-white rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none focus:border-blue-400 cursor-pointer max-w-[170px]"
                    >
                      <option value="all">Todos los países</option>
                      {availableCountries.map(c => {
                        const prof = COUNTRY_WITHHOLDINGS[c];
                        return (
                          <option key={c} value={c}>
                            {prof ? `${prof.flag} ${c}` : c}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Selector interactivo de Retenciones */}
                  <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
                    <span className="text-slate-400 text-[11px] font-medium">Retención:</span>
                    <select
                      value={selectedWithholdingType}
                      onChange={e => setSelectedWithholdingType(e.target.value)}
                      className="bg-slate-900 border border-slate-600 text-white rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none focus:border-blue-400 cursor-pointer"
                    >
                      <option value="all">Todas</option>
                      <option value="double">Doble Retención</option>
                      <option value="origin">Solo Origen</option>
                      <option value="destination">Solo Destino (IRPF)</option>
                      <option value="exempt">Sin Retención</option>
                    </select>
                  </div>
                </>
              )}

              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Generar PDF/Imprimir</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Selector de Tipo de Informe para cambiar al vuelo sin salir */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-800 text-[11px]">
            <span className="text-slate-400 mr-1 font-semibold">Tipo de informe:</span>
            <button
              onClick={() => setActiveReportType('operations')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeReportType === 'operations'
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              Operaciones (Compras/Ventas)
            </button>
            <button
              onClick={() => setActiveReportType('portfolio')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeReportType === 'portfolio'
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              Cartera Actual (Activos Vivos)
            </button>
            <button
              onClick={() => setActiveReportType('closed')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeReportType === 'closed'
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              Cerradas (FIFO)
            </button>
            <button
              onClick={() => setActiveReportType('dividends')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeReportType === 'dividends'
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              Dividendos
            </button>
            <button
              onClick={() => setActiveReportType('tax')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeReportType === 'tax'
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              Fiscal IRPF
            </button>
            <button
              onClick={() => setActiveReportType('full')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeReportType === 'full'
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              Completo
            </button>
          </div>

          {/* Aviso práctico para quitar el enlace web y la fecha del navegador al imprimir */}
          <div className="flex items-start sm:items-center gap-2 text-[11px] text-amber-200 bg-amber-950/60 border border-amber-500/40 px-3.5 py-2 rounded-xl">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <p className="leading-snug">
              <strong>Para que no salga el enlace web abajo en el PDF:</strong> En la ventana de impresión de tu navegador (en <em>«Más ajustes / Opciones»</em>), desmarca la casilla <strong>«Encabezados y pies de página»</strong> y marca <strong>«Gráficos de fondo»</strong>.
            </p>
          </div>
        </div>

        {/* Document Content - Optimizado al 100% como Informe Oficial en A4 */}
        <div className="report-document-body bg-white p-6 sm:p-10 overflow-y-auto space-y-5 flex-1 text-xs text-slate-800 font-sans print:bg-white print:p-0 print:m-0 print:w-full print:max-w-none print:overflow-visible print:min-h-0 print:h-auto print:block">
          {/* Header Oficial */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 report-avoid-break">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-slate-900 text-white text-[10px] font-black px-1.5 py-0.5 tracking-wider uppercase">OFICIAL</span>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">CARTERA DE VALORES</h1>
              </div>
              <p className="text-[11px] text-slate-600 font-semibold uppercase tracking-wider mt-0.5">
                {getSubtitle()}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Ref. Cartera: <strong className="text-slate-800 font-mono">ES-CARTERA-{isAllYears ? 'GLOBAL' : selectedYear}</strong> · Moneda Base: <strong className="text-slate-800">EUR (€)</strong>
              </p>
            </div>

            <div className="text-right text-[11px] text-slate-600 space-y-0.5">
              <p className="font-bold text-slate-900 text-xs font-mono">
                {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-[10px] text-slate-500">Documento Oficial Certificado</p>
              <p className="text-[10px] text-emerald-800 font-bold bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 inline-block">
                Criterio FIFO Conforme a la AEAT
              </p>
            </div>
          </div>

          {/* Banner de Título */}
          <div className="text-center py-2 bg-slate-100 border border-slate-300 report-avoid-break">
            <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide">
              {getTitle()}
            </h2>
            {activeReportType === 'dividends' && (
              <div className="mt-1 flex items-center justify-center gap-1.5 flex-wrap text-[10px] text-slate-600 font-medium">
                <span className="bg-white border border-slate-300 px-2 py-0.5 rounded font-mono font-bold text-slate-800">
                  {yearExerciseLabel}
                </span>
                <span className="bg-white border border-slate-300 px-2 py-0.5 rounded font-bold text-slate-800">
                  País: {selectedCountry === 'all' ? 'Todos los países' : `${COUNTRY_WITHHOLDINGS[selectedCountry]?.flag || ''} ${selectedCountry}`}
                </span>
                <span className="bg-white border border-slate-300 px-2 py-0.5 rounded font-bold text-slate-800">
                  Retención:{' '}
                  {selectedWithholdingType === 'all'
                    ? 'Todas las retenciones'
                    : selectedWithholdingType === 'double'
                    ? 'Doble Retención (Origen + Destino)'
                    : selectedWithholdingType === 'origin'
                    ? 'Solo Retención en Origen'
                    : selectedWithholdingType === 'destination'
                    ? 'Solo Retención en Destino (IRPF)'
                    : 'Sin Retención (Exento)'}
                </span>
                <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold font-mono">
                  {filteredDividends.length} {filteredDividends.length === 1 ? 'cobro' : 'cobros'}
                </span>
              </div>
            )}
          </div>

          {/* Resumen Ejecutivo de Métricas (Strip Específico según la pantalla) */}
          {activeReportType === 'operations' ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center border border-slate-300 p-2.5 bg-slate-50 report-avoid-break">
              <div className="border-r border-slate-200 last:border-none p-1">
                <span className="text-[9px] text-slate-500 uppercase block font-bold">Total Operaciones</span>
                <span className="text-sm font-extrabold text-slate-900 font-mono">{filteredOperations.length}</span>
                <span className="text-[9px] text-slate-500 block font-mono">{totalSharesTraded} títulos operados</span>
              </div>
              <div className="border-r border-slate-200 last:border-none p-1">
                <span className="text-[9px] text-slate-500 uppercase block font-bold">Total Compras</span>
                <span className="text-sm font-extrabold text-emerald-700 font-mono">{formatEUR(totalBuysEUR)}</span>
                <span className="text-[9px] text-slate-400 block font-mono">
                  {filteredOperations.filter(o => o.type === 'Compra').length} compras registradas
                </span>
              </div>
              <div className="border-r border-slate-200 last:border-none p-1">
                <span className="text-[9px] text-slate-500 uppercase block font-bold">Total Ventas</span>
                <span className="text-sm font-extrabold text-amber-800 font-mono">{formatEUR(totalSellsEUR)}</span>
                <span className="text-[9px] text-slate-400 block font-mono">
                  {filteredOperations.filter(o => o.type === 'Venta').length} ventas registradas
                </span>
              </div>
              <div className="p-1">
                <span className="text-[9px] text-slate-500 uppercase block font-bold">Volumen y Comisiones</span>
                <span className="text-sm font-extrabold text-slate-900 font-mono">{formatEUR(totalVolumeEUR)}</span>
                <span className="text-[9px] text-rose-700 block font-mono font-bold">
                  Comisiones: {formatEUR(totalCommissionsEUR)}
                </span>
              </div>
            </div>
          ) : activeReportType === 'closed' ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center border border-slate-300 p-2.5 bg-slate-50 report-avoid-break">
              <div className="border-r border-slate-200 last:border-none p-1">
                <span className="text-[9px] text-slate-500 uppercase block font-bold">Transmisiones Cerradas</span>
                <span className="text-sm font-extrabold text-slate-900 font-mono">{filteredClosed.length}</span>
                <span className="text-[9px] text-slate-500 block font-mono">Ventas liquidadas FIFO</span>
              </div>
              <div className="border-r border-slate-200 last:border-none p-1">
                <span className="text-[9px] text-slate-500 uppercase block font-bold">Valor Total Ventas</span>
                <span className="text-sm font-extrabold text-slate-900 font-mono">{formatEUR(totalSaleValue)}</span>
                <span className="text-[9px] text-slate-400 block font-mono">Coste FIFO: {formatEUR(totalAcquisitionValue)}</span>
              </div>
              <div className="border-r border-slate-200 last:border-none p-1">
                <span className="text-[9px] text-slate-500 uppercase block font-bold">Ganancias Realizadas</span>
                <span className="text-sm font-extrabold text-emerald-700 font-mono">
                  +{formatEUR(filteredClosed.filter(c => c.resultEUR > 0).reduce((acc, c) => acc + c.resultEUR, 0))}
                </span>
              </div>
              <div className="p-1">
                <span className="text-[9px] text-slate-500 uppercase block font-bold">Resultado Neto ({selectedYear})</span>
                <span className={`text-sm font-extrabold font-mono ${closedGains < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  {closedGains > 0 ? `+${formatEUR(closedGains)}` : formatEUR(closedGains)}
                </span>
              </div>
            </div>
          ) : activeReportType === 'dividends' ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center border border-slate-300 p-2.5 bg-slate-50 report-avoid-break">
              <div className="border-r border-slate-200 last:border-none p-1">
                <span className="text-[9px] text-slate-500 uppercase block font-bold">Cobros de Dividendos</span>
                <span className="text-sm font-extrabold text-slate-900 font-mono">{filteredDividends.length}</span>
                <span className="text-[9px] text-slate-500 block font-mono">
                  {selectedCountry !== 'all' ? selectedCountry : 'Global'}
                </span>
              </div>
              <div className="border-r border-slate-200 last:border-none p-1">
                <span className="text-[9px] text-slate-500 uppercase block font-bold">Importe Bruto</span>
                <span className="text-sm font-extrabold text-blue-800 font-mono">{formatEUR(totalDividends)}</span>
              </div>
              <div className="border-r border-slate-200 last:border-none p-1">
                <span className="text-[9px] text-slate-500 uppercase block font-bold">Retenciones Fiscales</span>
                <span className="text-sm font-extrabold text-rose-700 font-mono">-{formatEUR(totalWithholding)}</span>
                {(totalOriginWithholding > 0 || totalDestWithholding > 0) && (
                  <span className="text-[9px] text-slate-500 block font-sans">
                    {totalOriginWithholding > 0 && `Orig: ${formatEUR(totalOriginWithholding)}`}
                    {totalOriginWithholding > 0 && totalDestWithholding > 0 && ' · '}
                    {totalDestWithholding > 0 && `Dest: ${formatEUR(totalDestWithholding)}`}
                  </span>
                )}
              </div>
              <div className="p-1">
                <span className="text-[9px] text-slate-500 uppercase block font-bold">Neto Cobrado</span>
                <span className="text-sm font-extrabold text-emerald-700 font-mono">+{formatEUR(netDividends)}</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center border border-slate-300 p-2.5 bg-slate-50 report-avoid-break">
              <div className="border-r border-slate-200 last:border-none p-1">
                <span className="text-[9px] text-slate-500 uppercase block font-bold">Valoración Actual Cartera</span>
                <span className="text-sm font-extrabold text-slate-900 font-mono">{formatEUR(totalValue)}</span>
                <span className="text-[9px] text-slate-400 block font-mono">Coste: {formatEUR(totalInvested)}</span>
              </div>
              <div className="border-r border-slate-200 last:border-none p-1">
                <span className="text-[9px] text-slate-500 uppercase block font-bold">Plusvalía Latente</span>
                <span
                  className={`text-sm font-extrabold font-mono ${
                    totalGain < 0 ? 'text-red-700 font-bold' : totalGain > 0 ? 'text-emerald-700' : 'text-slate-700'
                  }`}
                >
                  {totalGain > 0 ? `+${formatEUR(totalGain)}` : formatEUR(totalGain)}
                </span>
                <span className="text-[9px] text-slate-400 block font-mono">
                  {totalInvested > 0 ? formatPercent((totalGain / totalInvested) * 100) : '0%'}
                </span>
              </div>
              <div className="border-r border-slate-200 last:border-none p-1">
                <span className="text-[9px] text-slate-500 uppercase block font-bold">
                  {closedGains < 0 ? `Pérdidas Cerradas (${isAllYears ? 'Total' : selectedYear})` : `Ganancias Cerradas (${isAllYears ? 'Total' : selectedYear})`}
                </span>
                <span
                  className={`text-sm font-extrabold font-mono ${
                    closedGains < 0 ? 'text-red-700 font-bold' : closedGains > 0 ? 'text-emerald-700' : 'text-slate-700'
                  }`}
                >
                  {closedGains > 0 ? `+${formatEUR(closedGains)}` : formatEUR(closedGains)}
                </span>
                <span className="text-[9px] text-slate-400 block">
                  {filteredClosed.length} transmisiones
                </span>
              </div>
              <div className="p-1">
                <span className="text-[9px] text-slate-500 uppercase block font-bold">
                  Dividendos Brutos ({isAllYears ? 'Total' : selectedYear})
                </span>
                <span className="text-sm font-extrabold text-blue-800 font-mono">{formatEUR(totalDividends)}</span>
                <span className="text-[9px] text-rose-700 block font-mono">
                  Retención: -{formatEUR(totalWithholding)}
                </span>
              </div>
            </div>
          )}

          {/* CUADRO ESPECIAL AEAT: Si es informe fiscal o tipo tax */}
          {(activeReportType === 'tax') && (
            <div className="space-y-2 report-avoid-break">
              <div className="flex items-center justify-between border-b-2 border-slate-800 pb-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Resumen Oficial para Declaración IRPF (Modelo D-100 — Renta)
                </h3>
                <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 border border-slate-300">
                  Casillas AEAT
                </span>
              </div>
              <table className="w-full text-[11px] text-left border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="p-1.5 border border-slate-300 w-28">Casilla Renta</th>
                    <th className="p-1.5 border border-slate-300">Concepto Fiscal</th>
                    <th className="p-1.5 border border-slate-300 text-right">Importe Bruto</th>
                    <th className="p-1.5 border border-slate-300 text-right">Retenciones Soportadas</th>
                    <th className="p-1.5 border border-slate-300 text-right">Rendimiento Neto Computable</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-1.5 font-bold font-mono border border-slate-300 bg-slate-50">Casilla 0029</td>
                    <td className="p-1.5 border border-slate-300">
                      <span className="font-semibold block text-slate-900">Rendimientos del Capital Mobiliario: Dividendos</span>
                      <span className="text-[10px] text-slate-500">Cobros íntegros por participaciones en fondos propios</span>
                    </td>
                    <td className="p-1.5 text-right font-mono border border-slate-300">{formatEUR(totalDividends)}</td>
                    <td className="p-1.5 text-right font-mono text-rose-700 border border-slate-300">
                      {totalWithholding > 0 ? `-${formatEUR(totalWithholding)}` : '0,00 €'}
                    </td>
                    <td className="p-1.5 text-right font-mono font-bold border border-slate-300 text-slate-900">
                      {formatEUR(netDividends)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-bold font-mono border border-slate-300 bg-slate-50">Casilla 0588</td>
                    <td className="p-1.5 border border-slate-300">
                      <span className="font-semibold block text-slate-900">Doble Imposición Internacional / Retenciones Deducibles</span>
                      <span className="text-[10px] text-slate-500">Retención en origen y España a deducir de la cuota líquida</span>
                    </td>
                    <td className="p-1.5 text-right font-mono border border-slate-300">—</td>
                    <td className="p-1.5 text-right font-mono text-rose-700 border border-slate-300 font-bold">
                      {formatEUR(totalWithholding)}
                    </td>
                    <td className="p-1.5 text-right font-mono border border-slate-300 text-slate-500">—</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-bold font-mono border border-slate-300 bg-slate-50">Casillas 0326 - 0338</td>
                    <td className="p-1.5 border border-slate-300">
                      <span className="font-semibold block text-slate-900">Ganancias y Pérdidas Patrimoniales: Transmisiones</span>
                      <span className="text-[10px] text-slate-500">Cálculo FIFO homogéneo (Transmisión: {formatEUR(totalSaleValue)} · Adquisición: {formatEUR(totalAcquisitionValue)})</span>
                    </td>
                    <td className="p-1.5 text-right font-mono border border-slate-300">{formatEUR(totalSaleValue)}</td>
                    <td className="p-1.5 text-right font-mono border border-slate-300 text-slate-500">—</td>
                    <td className={`p-1.5 text-right font-mono font-bold border border-slate-300 ${closedGains < 0 ? 'text-red-700' : 'text-emerald-800'}`}>
                      {closedGains > 0 ? `+${formatEUR(closedGains)}` : formatEUR(closedGains)}
                    </td>
                  </tr>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                    <td colSpan={2} className="p-1.5 border border-slate-300 text-right uppercase">
                      Total Saldo Neto Rentas del Ahorro ({yearLabel}):
                    </td>
                    <td className="p-1.5 border border-slate-300 text-right font-mono">
                      {formatEUR(totalDividends + totalSaleValue)}
                    </td>
                    <td className="p-1.5 border border-slate-300 text-right font-mono text-rose-700">
                      -{formatEUR(totalWithholding)}
                    </td>
                    <td className={`p-1.5 border border-slate-300 text-right font-mono text-xs ${
                      (closedGains + netDividends) < 0 ? 'text-red-700' : 'text-emerald-800'
                    }`}>
                      {(closedGains + netDividends) > 0 ? `+${formatEUR(closedGains + netDividends)}` : formatEUR(closedGains + netDividends)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Section: Posiciones Abiertas */}
          {(activeReportType === 'portfolio' || activeReportType === 'full' || activeReportType === 'annual') && (
            <div className="space-y-1.5 report-avoid-break">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                {activeReportType === 'full' ? '1. ' : ''}Posiciones Vivas en Cartera ({positions.length} Activos en Custodia)
              </h3>
              <table className="w-full text-[11px] text-left border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold">
                    <th className="p-1.5 border border-slate-300">Ticker</th>
                    <th className="p-1.5 border border-slate-300">Empresa / Activo</th>
                    <th className="p-1.5 border border-slate-300">País</th>
                    <th className="p-1.5 border border-slate-300 text-right">Títulos</th>
                    <th className="p-1.5 border border-slate-300 text-right">P. Compra (PMC)</th>
                    <th className="p-1.5 border border-slate-300 text-right">P. Mercado</th>
                    <th className="p-1.5 border border-slate-300 text-right">Valoración Total (€)</th>
                    <th className="p-1.5 border border-slate-300 text-right">Plusvalía Latente</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-3 text-center text-slate-500 italic border border-slate-300">
                        No hay posiciones abiertas registradas en la cartera actualmente.
                      </td>
                    </tr>
                  ) : (
                    positions.map((p, idx) => {
                      const isLoss = (p.gainLossEUR !== undefined && p.gainLossEUR < 0) || p.gainLossPercent < 0;
                      const effectiveBuyPrice = p.pmcWithCommission || (p.totalInvestedEUR && p.shares > 0 ? Number((p.totalInvestedEUR / p.shares).toFixed(2)) : p.buyPrice);
                      return (
                        <tr key={idx} className="border-b border-slate-300 even:bg-slate-50">
                          <td className="p-1.5 font-bold font-mono border border-slate-300">{p.symbol}</td>
                          <td className="p-1.5 border border-slate-300 font-medium">{p.company}</td>
                          <td className="p-1.5 border border-slate-300 text-slate-600">{p.country}</td>
                          <td className="p-1.5 text-right font-mono border border-slate-300">{p.shares}</td>
                          <td className="p-1.5 text-right font-mono border border-slate-300" title={`Precio puro: ${formatNumber(p.buyPrice)} €`}>
                            {formatNumber(effectiveBuyPrice)} €
                          </td>
                          <td className="p-1.5 text-right font-mono border border-slate-300">{formatNumber(p.currentPrice)} €</td>
                          <td className="p-1.5 text-right font-mono font-bold border border-slate-300">{formatEUR(p.currentValueEUR)}</td>
                          <td
                            className={`p-1.5 text-right font-mono font-bold border border-slate-300 ${
                              isLoss ? 'text-red-700' : p.gainLossPercent > 0 ? 'text-emerald-700' : 'text-slate-700'
                            }`}
                          >
                            {formatPercent(p.gainLossPercent)}
                            {typeof p.gainLossEUR === 'number' && (
                              <span className="block text-[10px]">
                                {p.gainLossEUR > 0 ? `+${formatEUR(p.gainLossEUR)}` : formatEUR(p.gainLossEUR)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {positions.length > 0 && (
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                      <td colSpan={6} className="p-1.5 border border-slate-300 text-right uppercase">
                        TOTALES CARTERA ACTUAL:
                      </td>
                      <td className="p-1.5 border border-slate-300 text-right font-mono">{formatEUR(totalValue)}</td>
                      <td
                        className={`p-1.5 border border-slate-300 text-right font-mono ${
                          totalGain < 0 ? 'text-red-700' : totalGain > 0 ? 'text-emerald-800' : 'text-slate-700'
                        }`}
                      >
                        {totalGain > 0 ? `+${formatEUR(totalGain)}` : formatEUR(totalGain)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Section: Registro de Operaciones de Compra y Venta (Específico para pantalla Operaciones y full) */}
          {(activeReportType === 'operations' || activeReportType === 'full') && (
            <div className="space-y-1.5 report-avoid-break">
              <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  {activeReportType === 'full' ? '2. ' : ''}Registro de Operaciones de Compra y Venta ({filteredOperations.length} Transacciones)
                </h3>
                <span className="text-[10px] text-slate-600 font-mono">
                  Volumen: <strong className="text-slate-900">{formatEUR(totalVolumeEUR)}</strong> · Comisiones: <strong className="text-rose-700">{formatEUR(totalCommissionsEUR)}</strong>
                </span>
              </div>
              <table className="w-full text-[11px] text-left border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold">
                    <th className="p-1.5 border border-slate-300 w-24">Fecha</th>
                    <th className="p-1.5 border border-slate-300 w-20 text-center">Tipo</th>
                    <th className="p-1.5 border border-slate-300 w-20">Ticker</th>
                    <th className="p-1.5 border border-slate-300">Empresa / Activo</th>
                    <th className="p-1.5 border border-slate-300 text-right">Cantidad</th>
                    <th className="p-1.5 border border-slate-300 text-right">Precio (€)</th>
                    <th className="p-1.5 border border-slate-300 text-right">Total (€)</th>
                    <th className="p-1.5 border border-slate-300 text-right">Comisión (€)</th>
                    <th className="p-1.5 border border-slate-300">Broker</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOperations.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-3 text-center text-slate-500 italic border border-slate-300">
                        No hay operaciones registradas para {yearLabel.toLowerCase()}.
                      </td>
                    </tr>
                  ) : (
                    filteredOperations.map((op, idx) => {
                      const isBuy = op.type === 'Compra';
                      return (
                        <tr key={op.id || idx} className="border-b border-slate-300 even:bg-slate-50">
                          <td className="p-1.5 border border-slate-300 font-mono">{op.date}</td>
                          <td className="p-1.5 border border-slate-300 text-center">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isBuy
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}
                            >
                              {op.type}
                            </span>
                          </td>
                          <td className="p-1.5 font-bold font-mono border border-slate-300">{op.symbol}</td>
                          <td className="p-1.5 border border-slate-300 font-medium">{op.company}</td>
                          <td className="p-1.5 text-right font-mono border border-slate-300">{op.shares}</td>
                          <td className="p-1.5 text-right font-mono border border-slate-300">{formatNumber(op.price)} €</td>
                          <td
                            className={`p-1.5 text-right font-mono font-bold border border-slate-300 ${
                              isBuy ? 'text-slate-900' : 'text-amber-800'
                            }`}
                          >
                            {formatEUR(op.totalEUR)}
                          </td>
                          <td className="p-1.5 text-right font-mono text-slate-600 border border-slate-300">
                            {formatNumber(op.commissionEUR)} €
                          </td>
                          <td className="p-1.5 border border-slate-300 text-slate-600 text-[10px]">{op.broker || '—'}</td>
                        </tr>
                      );
                    })
                  )}
                  {filteredOperations.length > 0 && (
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                      <td colSpan={4} className="p-1.5 border border-slate-300 text-right uppercase">
                        TOTALES OPERACIONES ({yearLabel.toUpperCase()}):
                      </td>
                      <td className="p-1.5 border border-slate-300 text-right font-mono">
                        {totalSharesTraded}
                      </td>
                      <td className="p-1.5 border border-slate-300 text-right font-mono text-slate-500">—</td>
                      <td className="p-1.5 border border-slate-300 text-right font-mono font-bold text-slate-900">
                        {formatEUR(totalVolumeEUR)}
                      </td>
                      <td className="p-1.5 border border-slate-300 text-right font-mono text-rose-700">
                        {formatEUR(totalCommissionsEUR)}
                      </td>
                      <td className="p-1.5 border border-slate-300 text-slate-500 text-[10px]">—</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Section: Operaciones Cerradas / Transmisiones FIFO */}
          {(activeReportType === 'closed' || activeReportType === 'full' || activeReportType === 'annual' || activeReportType === 'tax') && options.closed && (
            <div className="space-y-1.5 report-avoid-break">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                {activeReportType === 'full' ? '3. ' : activeReportType === 'tax' ? '1. ' : ''}Transmisiones Realizadas y Ganancias/Pérdidas FIFO ({yearLabel})
              </h3>
              <table className="w-full text-[11px] text-left border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold">
                    <th className="p-1.5 border border-slate-300">Ticker</th>
                    <th className="p-1.5 border border-slate-300">Empresa</th>
                    <th className="p-1.5 border border-slate-300">Fecha Venta</th>
                    <th className="p-1.5 border border-slate-300 text-right">Títulos</th>
                    <th className="p-1.5 border border-slate-300 text-right">P. Venta</th>
                    <th className="p-1.5 border border-slate-300 text-right">Valor Venta (€)</th>
                    <th className="p-1.5 border border-slate-300 text-right">Rendimiento FIFO (€)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClosed.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-3 text-center text-slate-500 italic border border-slate-300">
                        No hay operaciones de venta cerradas registradas para {yearLabel.toLowerCase()}.
                      </td>
                    </tr>
                  ) : (
                    filteredClosed.map((c, idx) => (
                      <tr key={idx} className="border-b border-slate-300 even:bg-slate-50">
                        <td className="p-1.5 font-bold font-mono border border-slate-300">{c.symbol}</td>
                        <td className="p-1.5 border border-slate-300 font-medium">{c.company}</td>
                        <td className="p-1.5 border border-slate-300">{c.saleDate}</td>
                        <td className="p-1.5 text-right font-mono border border-slate-300">{c.shares}</td>
                        <td className="p-1.5 text-right font-mono border border-slate-300">{formatNumber(c.salePrice)} €</td>
                        <td className="p-1.5 text-right font-mono border border-slate-300">{formatEUR(c.salePrice * c.shares)}</td>
                        <td
                          className={`p-1.5 text-right font-mono font-bold border border-slate-300 ${
                            c.resultEUR < 0 ? 'text-red-700' : c.resultEUR > 0 ? 'text-emerald-700' : 'text-slate-700'
                          }`}
                        >
                          {c.resultEUR > 0 ? `+${formatEUR(c.resultEUR)}` : formatEUR(c.resultEUR)}
                        </td>
                      </tr>
                    ))
                  )}
                  {filteredClosed.length > 0 && (
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                      <td colSpan={5} className="p-1.5 border border-slate-300 text-right uppercase">
                        TOTAL TRANSMISIONES ({yearLabel.toUpperCase()}):
                      </td>
                      <td className="p-1.5 border border-slate-300 text-right font-mono">{formatEUR(totalSaleValue)}</td>
                      <td
                        className={`p-1.5 border border-slate-300 text-right font-mono font-bold ${
                          closedGains < 0 ? 'text-red-700' : closedGains > 0 ? 'text-emerald-800' : 'text-slate-700'
                        }`}
                      >
                        {closedGains > 0 ? `+${formatEUR(closedGains)}` : formatEUR(closedGains)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Section: Dividendos Cobrados */}
          {(activeReportType === 'dividends' || activeReportType === 'full' || activeReportType === 'annual' || activeReportType === 'tax') && options.dividends && (
            <div className="space-y-1.5 report-avoid-break">
              <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  {activeReportType === 'full' ? '4. ' : activeReportType === 'tax' ? '2. ' : ''}Rendimientos de Dividendos y Retenciones Fiscales ({yearExerciseLabel})
                </h3>
                {activeReportType === 'dividends' && (
                  <span className="text-[10px] text-slate-600 font-mono">
                    Filtro: {selectedCountry === 'all' ? 'Todos los países' : selectedCountry} · {selectedWithholdingType === 'all' ? 'Todas las retenciones' : selectedWithholdingType === 'double' ? 'Doble Retención' : selectedWithholdingType === 'origin' ? 'Solo Origen' : selectedWithholdingType === 'destination' ? 'Solo Destino (IRPF)' : 'Exento'}
                  </span>
                )}
              </div>
              <table className="w-full text-[11px] text-left border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold">
                    <th className="p-1.5 border border-slate-300">Fecha</th>
                    <th className="p-1.5 border border-slate-300">Empresa</th>
                    <th className="p-1.5 border border-slate-300">Ticker</th>
                    <th className="p-1.5 border border-slate-300">País / Régimen</th>
                    <th className="p-1.5 border border-slate-300 text-right">Bruto (€)</th>
                    <th className="p-1.5 border border-slate-300 text-right">Ret. Origen (€)</th>
                    <th className="p-1.5 border border-slate-300 text-right">Ret. Destino (€)</th>
                    <th className="p-1.5 border border-slate-300 text-right">Retención Total (€)</th>
                    <th className="p-1.5 border border-slate-300 text-right">Neto Percibido (€)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDividends.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-3 text-center text-slate-500 italic border border-slate-300">
                        No hay cobros de dividendos registrados que coincidan con los filtros aplicados ({yearExerciseLabel.toLowerCase()}, país: {selectedCountry === 'all' ? 'todos' : selectedCountry}, retención: {selectedWithholdingType}).
                      </td>
                    </tr>
                  ) : (
                    filteredDividends.map((d, idx) => {
                      const country = getDividendCountry(d, positions);
                      const profile = COUNTRY_WITHHOLDINGS[country];
                      const origEUR = d.withholdingOriginEUR != null ? d.withholdingOriginEUR : (!d.hasDoubleWithholding && country !== 'España' ? d.withholdingEUR : 0);
                      const destEUR = d.withholdingDestinationEUR != null ? d.withholdingDestinationEUR : (!d.hasDoubleWithholding && country === 'España' ? d.withholdingEUR : 0);

                      return (
                        <tr key={idx} className="border-b border-slate-300 even:bg-slate-50">
                          <td className="p-1.5 border border-slate-300 font-mono">{d.date}</td>
                          <td className="p-1.5 border border-slate-300 font-medium">{d.company}</td>
                          <td className="p-1.5 font-bold font-mono border border-slate-300">{d.symbol}</td>
                          <td className="p-1.5 border border-slate-300 text-slate-700">
                            <span className="inline-flex items-center gap-1">
                              <span>{profile?.flag || '🌐'}</span>
                              <span className="font-medium">{country}</span>
                            </span>
                          </td>
                          <td className="p-1.5 text-right font-mono border border-slate-300">{formatEUR(d.grossEUR)}</td>
                          <td className="p-1.5 text-right font-mono text-amber-800 border border-slate-300">
                            {origEUR > 0 ? (
                              <span>
                                {formatEUR(origEUR)}
                                {d.withholdingOriginPercent ? <span className="text-[9px] text-slate-500 block">({d.withholdingOriginPercent}%)</span> : null}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="p-1.5 text-right font-mono text-rose-700 border border-slate-300">
                            {destEUR > 0 ? (
                              <span>
                                {formatEUR(destEUR)}
                                {d.withholdingDestinationPercent ? <span className="text-[9px] text-slate-500 block">({d.withholdingDestinationPercent}%)</span> : null}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="p-1.5 text-right font-mono text-rose-700 font-bold border border-slate-300">
                            {d.withholdingEUR > 0 ? `-${formatEUR(d.withholdingEUR)}` : '0,00 €'}
                          </td>
                          <td
                            className={`p-1.5 text-right font-mono font-bold border border-slate-300 ${
                              d.netEUR < 0 ? 'text-red-700' : d.netEUR > 0 ? 'text-emerald-700' : 'text-slate-700'
                            }`}
                          >
                            {d.netEUR > 0 ? `+${formatEUR(d.netEUR)}` : formatEUR(d.netEUR)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {filteredDividends.length > 0 && (
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                      <td colSpan={4} className="p-1.5 border border-slate-300 text-right uppercase">
                        TOTALES DIVIDENDOS ({yearLabel.toUpperCase()}):
                      </td>
                      <td className="p-1.5 border border-slate-300 text-right font-mono">{formatEUR(totalDividends)}</td>
                      <td className="p-1.5 border border-slate-300 text-right text-amber-800 font-mono">
                        {totalOriginWithholding > 0 ? formatEUR(totalOriginWithholding) : '—'}
                      </td>
                      <td className="p-1.5 border border-slate-300 text-right text-rose-700 font-mono">
                        {totalDestWithholding > 0 ? formatEUR(totalDestWithholding) : '—'}
                      </td>
                      <td className="p-1.5 border border-slate-300 text-right text-rose-700 font-mono font-bold">
                        {totalWithholding > 0 ? `-${formatEUR(totalWithholding)}` : '0,00 €'}
                      </td>
                      <td
                        className={`p-1.5 border border-slate-300 text-right font-mono font-bold ${
                          netDividends < 0 ? 'text-red-700' : netDividends > 0 ? 'text-emerald-800' : 'text-slate-700'
                        }`}
                      >
                        {netDividends > 0 ? `+${formatEUR(netDividends)}` : formatEUR(netDividends)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer de Certificación y Firma Oficial */}
          <div className="pt-5 border-t-2 border-slate-900 text-[10px] text-slate-600 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 report-avoid-break">
            <div className="max-w-xl space-y-1">
              <p className="font-bold text-slate-900 uppercase">Certificación Contable y Fiscal Conforme a la AEAT</p>
              <p className="leading-tight text-slate-600">
                Documento emitido conforme a la Ley 35/2006 del IRPF (artículo 37) y Real Decreto 439/2007. Criterio de imputación contable FIFO homogéneo (First In, First Out). Todos los importes están expresados en euros (€). Válido como justificante documental ante la Administración Tributaria.
              </p>
              <p className="text-[9px] text-slate-400 font-mono">
                Generado automáticamente el {new Date().toLocaleString('es-ES')} · Código de verificación: ES-IRPF-{selectedYear === 'all' ? 'HIST' : selectedYear}-OK
              </p>
            </div>
            <div className="text-right shrink-0 min-w-44 self-end">
              <div className="w-40 border-b border-slate-700 mb-1 ml-auto"></div>
              <p className="font-bold text-slate-900 text-[11px]">Firma del Titular / Gestor</p>
              <p className="text-[9px] text-slate-500">Conforme y verificado</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
