import React, { useState, useMemo } from 'react';
import { DividendRecord, StockPosition } from '../types/portfolio';
import {
  formatNumber,
  downloadCSV,
  getAvailableFiscalYears,
  parseDateToTimestamp,
  getDividendCountry,
  COUNTRY_WITHHOLDINGS,
} from '../utils/formatters';
import { Download, Plus, Printer, ArrowUpDown, Pencil, Trash2, Filter, RotateCcw, Info } from 'lucide-react';

interface DividendsViewProps {
  dividends: DividendRecord[];
  positions?: StockPosition[];
  onOpenNewDividend: () => void;
  onEditDividend?: (dividend: DividendRecord) => void;
  onDeleteDividend?: (dividendId: string) => void;
  onOpenPrintReport?: (
    type: 'dividends' | 'full' | 'annual' | 'tax',
    options?: {
      charts?: boolean;
      dividends?: boolean;
      closed?: boolean;
      year?: number | string;
      country?: string;
      withholdingType?: string;
    }
  ) => void;
}

export function DividendsView({
  dividends,
  positions = [],
  onOpenNewDividend,
  onEditDividend,
  onDeleteDividend,
  onOpenPrintReport,
}: DividendsViewProps) {
  const [selectedYear, setSelectedYear] = useState<string>('Todos los años');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedWithholdingType, setSelectedWithholdingType] = useState<string>('all');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Años dinámicos que se expanden automáticamente para 2027 y futuros
  const availableYears = useMemo(
    () => getAvailableFiscalYears(dividends.map(d => d.year)),
    [dividends]
  );

  // Extraer lista única de países presentes en los dividendos
  const availableCountries = useMemo(() => {
    const countrySet = new Set<string>();
    dividends.forEach(d => {
      const c = getDividendCountry(d, positions);
      if (c) countrySet.add(c);
    });
    // Añadir países estándar si no están
    ['EE.UU.', 'España', 'Alemania'].forEach(c => countrySet.add(c));
    return Array.from(countrySet).sort((a, b) => {
      if (a === 'España') return -1;
      if (b === 'España') return 1;
      if (a === 'EE.UU.') return -1;
      if (b === 'EE.UU.') return 1;
      return a.localeCompare(b);
    });
  }, [dividends, positions]);

  // Helper para verificar el tipo de retención de un dividendo
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

  // Filtrado compuesto por Año, País y Tipo de Retención
  const filtered = useMemo(() => {
    return dividends.filter(d => {
      // 1. Filtro por año
      if (selectedYear !== 'Todos los años' && d.year !== parseInt(selectedYear, 10)) {
        return false;
      }

      // 2. Filtro por país
      if (selectedCountry !== 'all') {
        const c = getDividendCountry(d, positions);
        if (c !== selectedCountry) return false;
      }

      // 3. Filtro por tipo de retención
      if (selectedWithholdingType !== 'all') {
        const type = checkWithholdingType(d);
        if (selectedWithholdingType === 'double' && type !== 'double') return false;
        if (selectedWithholdingType === 'origin' && type !== 'origin') return false;
        if (selectedWithholdingType === 'destination' && type !== 'destination') return false;
        if (selectedWithholdingType === 'exempt' && type !== 'exempt') return false;
      }

      return true;
    });
  }, [dividends, selectedYear, selectedCountry, selectedWithholdingType, positions]);

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

  // Cálculos de totales agregados y desglose de retenciones
  const totalGross = sorted.reduce((acc, d) => acc + (d.grossEUR || 0), 0);
  const totalWithholding = sorted.reduce((acc, d) => acc + (d.withholdingEUR || 0), 0);
  const totalNet = sorted.reduce((acc, d) => acc + (d.netEUR || 0), 0);

  const totalOriginWithholding = sorted.reduce((acc, d) => {
    if (d.withholdingOriginEUR != null) return acc + d.withholdingOriginEUR;
    if (!d.hasDoubleWithholding && getDividendCountry(d, positions) !== 'España') {
      return acc + (d.withholdingEUR || 0);
    }
    return acc;
  }, 0);

  const totalDestWithholding = sorted.reduce((acc, d) => {
    if (d.withholdingDestinationEUR != null) return acc + d.withholdingDestinationEUR;
    if (!d.hasDoubleWithholding && getDividendCountry(d, positions) === 'España') {
      return acc + (d.withholdingEUR || 0);
    }
    return acc;
  }, 0);

  const isAnyFilterActive =
    selectedYear !== 'Todos los años' ||
    selectedCountry !== 'all' ||
    selectedWithholdingType !== 'all';

  const handleResetFilters = () => {
    setSelectedYear('Todos los años');
    setSelectedCountry('all');
    setSelectedWithholdingType('all');
  };

  const handleExportCSV = () => {
    const headers = [
      'Fecha',
      'Empresa',
      'Símbolo',
      'País',
      'Bruto (€)',
      'Retención Total (€)',
      'Retención Origen (€)',
      '% Ret. Origen',
      'Retención Destino (€)',
      '% Ret. Destino',
      'Neto (€)',
      'Año',
    ];
    const rows = sorted.map(d => {
      const country = getDividendCountry(d, positions);
      return [
        d.date,
        d.company,
        d.symbol,
        country,
        d.grossEUR,
        d.withholdingEUR,
        d.withholdingOriginEUR ?? '',
        d.withholdingOriginPercent ? `${d.withholdingOriginPercent}%` : '',
        d.withholdingDestinationEUR ?? '',
        d.withholdingDestinationPercent ? `${d.withholdingDestinationPercent}%` : '',
        d.netEUR,
        d.year,
      ];
    });
    const filterSuffix = `${selectedYear !== 'Todos los años' ? `_${selectedYear}` : ''}${selectedCountry !== 'all' ? `_${selectedCountry}` : ''}`;
    downloadCSV(`Dividendos${filterSuffix}.csv`, rows, headers);
  };

  const activeCountryProfile = selectedCountry !== 'all' ? COUNTRY_WITHHOLDINGS[selectedCountry] : null;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top Controls: Filtros por Año, País con sus respectivas retenciones y Tipo de Retención */}
      <div className="bg-[#12233f] border border-slate-700/70 p-4 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector de Año */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-slate-400 font-medium">Año:</label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-blue-500 cursor-pointer shadow-inner"
              title="Filtrar por ejercicio fiscal"
            >
              <option value="Todos los años">Todos los años</option>
              {availableYears.map(yr => (
                <option key={yr} value={String(yr)}>
                  Año {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de País con sus respectivas retenciones */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-slate-400 font-medium">País:</label>
            <select
              value={selectedCountry}
              onChange={e => setSelectedCountry(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-blue-500 cursor-pointer shadow-inner max-w-[230px]"
              title="Filtrar por país de cotización y origen"
            >
              <option value="all">Todos los países</option>
              {availableCountries.map(country => {
                const profile = COUNTRY_WITHHOLDINGS[country];
                const label = profile
                  ? `${profile.flag} ${country} (${profile.summary})`
                  : country;
                return (
                  <option key={country} value={country}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Selector de Tipo de Retención */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-slate-400 font-medium">Retenciones:</label>
            <select
              value={selectedWithholdingType}
              onChange={e => setSelectedWithholdingType(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-blue-500 cursor-pointer shadow-inner"
              title="Filtrar por tipo de retención fiscal"
            >
              <option value="all">Todas las retenciones</option>
              <option value="double">Doble Retención (Origen + Destino)</option>
              <option value="origin">Solo Retención en Origen (Internacional)</option>
              <option value="destination">Solo Retención en Destino (IRPF España)</option>
              <option value="exempt">Sin Retención (Exento 0%)</option>
            </select>
          </div>

          {/* Botón para resetear filtros si hay alguno activo */}
          {isAnyFilterActive && (
            <button
              onClick={handleResetFilters}
              className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 hover:text-white flex items-center gap-1 transition-all cursor-pointer"
              title="Restablecer todos los filtros"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar</span>
            </button>
          )}

          {/* Botón Generar PDF / Imprimir con los filtros aplicados */}
          <button
            onClick={() => {
              if (onOpenPrintReport) {
                onOpenPrintReport('dividends', {
                  year: selectedYear === 'Todos los años' ? 'all' : selectedYear,
                  country: selectedCountry,
                  withholdingType: selectedWithholdingType,
                  dividends: true,
                  closed: false,
                  charts: false,
                });
              } else {
                window.print();
              }
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Generar PDF o imprimir dividendos según los filtros seleccionados"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            <span>Generar PDF/Imprimir</span>
          </button>

          {/* Botón Exportar CSV */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Exportar listado filtrado a CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>

        {/* Botón Registrar dividendo */}
        <button
          onClick={onOpenNewDividend}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.01]"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar dividendo</span>
        </button>
      </div>

      {/* Banner Informativo Fiscal si hay un país seleccionado */}
      {selectedCountry !== 'all' && (
        <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl px-4 py-2.5 flex items-center gap-3 text-xs text-blue-200">
          <Info className="w-4 h-4 text-blue-400 shrink-0" />
          <div className="flex-1">
            <span className="font-bold text-white">
              {activeCountryProfile?.flag || '🌐'} Régimen fiscal de dividendos en {selectedCountry}:
            </span>{' '}
            {selectedCountry === 'EE.UU.' && (
              <span>
                Retención en origen del <strong>15%</strong> (Convenio de doble imposición con formulario W-8BEN) +{' '}
                <strong>19%</strong> en destino (IRPF España). La retención en origen es deducible en el IRPF en la casilla de Doble Imposición Internacional.
              </span>
            )}
            {selectedCountry === 'España' && (
              <span>
                Retención a cuenta en destino del <strong>19%</strong> (IRPF nacional). Sin retención en origen al ser emisor residente en territorio español.
              </span>
            )}
            {selectedCountry === 'Alemania' && (
              <span>
                Retención en origen del <strong>26,38%</strong> (25% Kapitalertragsteuer + 5,5% impuesto de solidaridad). El convenio limita la tributación al 15%; el exceso (11,38%) es recuperable ante el Bundeszentralamt für Steuern (BZSt).
              </span>
            )}
            {selectedCountry === 'Reino Unido' && (
              <span>
                Retención en origen del <strong>0%</strong> (exento para dividendos de acciones ordinarias británicas) + <strong>19%</strong> en destino a cuenta del IRPF.
              </span>
            )}
            {selectedCountry === 'Países Bajos' && (
              <span>
                Retención en origen del <strong>15%</strong> (Convenio bilateral) + <strong>19%</strong> en destino (IRPF España).
              </span>
            )}
            {selectedCountry === 'Francia' && (
              <span>
                Retención en origen del <strong>12,8%</strong> (para personas físicas no residentes de la UE) o 25% general + <strong>19%</strong> en destino (IRPF España).
              </span>
            )}
            {selectedCountry === 'Suiza' && (
              <span>
                Retención en origen del <strong>35%</strong> (Verrechnungssteuer). Reducible al 15% mediante solicitud de devolución a la Administración Federal de Contribuciones Suiza (ESTV).
              </span>
            )}
          </div>
        </div>
      )}

      {/* Dividends Table */}
      <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#0e1b30] text-slate-400 font-semibold border-b border-slate-700/80">
              <tr>
                <th
                  onClick={() => setSortDirection(prev => (prev === 'desc' ? 'asc' : 'desc'))}
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
                <th className="py-3.5 px-3">País</th>
                <th className="py-3.5 px-4 text-right">Bruto (€)</th>
                <th className="py-3.5 px-4 text-right">Retenciones (€)</th>
                <th className="py-3.5 px-4 text-right">Neto (€)</th>
                <th className="py-3.5 px-3 text-center w-24">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Filter className="w-7 h-7 text-slate-600" />
                      <p className="font-medium text-slate-300">
                        No hay cobros de dividendos que coincidan con los filtros seleccionados.
                      </p>
                      {isAnyFilterActive && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Restablecer filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                sorted.map(div => {
                  const country = getDividendCountry(div, positions);
                  const profile = COUNTRY_WITHHOLDINGS[country];
                  const hasDbl =
                    div.hasDoubleWithholding ||
                    (div.withholdingOriginEUR != null &&
                      div.withholdingDestinationEUR != null &&
                      div.withholdingOriginEUR > 0 &&
                      div.withholdingDestinationEUR > 0);

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
                      <td className="py-3.5 px-3">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-[11px] text-slate-300"
                          title={profile?.summary || country}
                        >
                          <span>{profile?.flag || '🌐'}</span>
                          <span className="font-medium">{country}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-white font-mono">
                        {formatNumber(div.grossEUR)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-rose-400 font-mono font-medium">
                        <span>{formatNumber(div.withholdingEUR)}</span>
                        {hasDbl && div.withholdingOriginEUR != null && div.withholdingDestinationEUR != null ? (
                          <div className="text-[10px] text-slate-400 font-sans tracking-tight mt-0.5">
                            Orig:{' '}
                            <span className="text-amber-300 font-mono font-semibold">
                              {formatNumber(div.withholdingOriginEUR)} €
                            </span>
                            {div.withholdingOriginPercent ? ` (${div.withholdingOriginPercent}%)` : ''} · Dest:{' '}
                            <span className="text-rose-300 font-mono font-semibold">
                              {formatNumber(div.withholdingDestinationEUR)} €
                            </span>
                            {div.withholdingDestinationPercent ? ` (${div.withholdingDestinationPercent}%)` : ''}
                          </div>
                        ) : div.withholdingOriginEUR != null && div.withholdingOriginEUR > 0 ? (
                          <div className="text-[10px] text-amber-300/90 font-sans tracking-tight mt-0.5">
                            Origen:{' '}
                            <span className="font-mono font-semibold">
                              {formatNumber(div.withholdingOriginEUR)} €
                            </span>
                            {div.withholdingOriginPercent ? ` (${div.withholdingOriginPercent}%)` : ''}
                          </div>
                        ) : div.withholdingDestinationEUR != null && div.withholdingDestinationEUR > 0 ? (
                          <div className="text-[10px] text-rose-300/90 font-sans tracking-tight mt-0.5">
                            Destino IRPF:{' '}
                            <span className="font-mono font-semibold">
                              {formatNumber(div.withholdingDestinationEUR)} €
                            </span>
                            {div.withholdingDestinationPercent ? ` (${div.withholdingDestinationPercent}%)` : ''}
                          </div>
                        ) : null}
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

        {/* Footer Summary con desglose completo y reactivo al filtro */}
        <div className="p-4 bg-[#0e1b30] border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-bold text-sm">
              Total {selectedYear === 'Todos los años' ? 'General' : selectedYear}
            </span>
            {selectedCountry !== 'all' && (
              <span className="px-2 py-0.5 bg-blue-900/60 text-blue-300 rounded text-[11px] font-sans font-medium border border-blue-700/60">
                {activeCountryProfile?.flag || ''} {selectedCountry}
              </span>
            )}
            {selectedWithholdingType !== 'all' && (
              <span className="px-2 py-0.5 bg-amber-900/60 text-amber-300 rounded text-[11px] font-sans font-medium border border-amber-700/60">
                {selectedWithholdingType === 'double' && 'Doble Retención'}
                {selectedWithholdingType === 'origin' && 'Solo Origen'}
                {selectedWithholdingType === 'destination' && 'Solo Destino (IRPF)'}
                {selectedWithholdingType === 'exempt' && 'Sin Retención'}
              </span>
            )}
            <span className="text-[11px] text-slate-400 font-sans">
              ({sorted.length} {sorted.length === 1 ? 'cobro' : 'cobros'})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="text-slate-400">
              Bruto: <span className="text-white font-bold text-sm">{formatNumber(totalGross)} €</span>
            </div>
            {totalOriginWithholding > 0 && (
              <div className="text-slate-400">
                Ret. Origen: <span className="text-amber-400 font-bold text-sm">{formatNumber(totalOriginWithholding)} €</span>
              </div>
            )}
            {totalDestWithholding > 0 && (
              <div className="text-slate-400">
                Ret. Destino: <span className="text-rose-400 font-bold text-sm">{formatNumber(totalDestWithholding)} €</span>
              </div>
            )}
            <div className="text-slate-400">
              Retención Total: <span className="text-rose-400 font-bold text-sm">{formatNumber(totalWithholding)} €</span>
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
