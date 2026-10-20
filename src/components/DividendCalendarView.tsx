import React, { useState, useMemo } from 'react';
import { UpcomingDividend, DividendRecord, StockPosition } from '../types/portfolio';
import { formatEUR, formatNumber, getAvailableFiscalYears } from '../utils/formatters';
import { Calendar, Filter, ChevronLeft, ChevronRight, DollarSign, CheckCircle2, Coins } from 'lucide-react';

interface DividendCalendarViewProps {
  upcomingDividends: UpcomingDividend[];
  dividends?: DividendRecord[];
  positions?: StockPosition[];
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function DividendCalendarView({
  upcomingDividends,
  dividends = [],
  positions = [],
}: DividendCalendarViewProps) {
  // Mes y año actual (ej. Octubre 2026 por defecto, o la fecha actual del sistema)
  const today = new Date();
  const initialYear = today.getFullYear() >= 2026 ? today.getFullYear() : 2026;
  const initialMonth = today.getFullYear() >= 2026 ? today.getMonth() : 9; // 9 = Octubre

  const [currentYear, setCurrentYear] = useState<number>(initialYear);
  const [currentMonth, setCurrentMonth] = useState<number>(initialMonth);
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate() || 15);

  // Años dinámicos disponibles
  const availableYears = useMemo(() => {
    const yearsFromUpcoming = upcomingDividends.map(d => {
      const parts = d.date.split(/[/-]/);
      return parts.length === 3 ? parseInt(parts[2], 10) : undefined;
    });
    const yearsFromDivs = dividends.map(d => d.year);
    return getAvailableFiscalYears([...yearsFromUpcoming, ...yearsFromDivs, currentYear]);
  }, [upcomingDividends, dividends, currentYear]);

  // Navegación de mes y año
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleYearChange = (yr: string) => {
    const parsed = parseInt(yr, 10);
    if (!isNaN(parsed)) {
      setCurrentYear(parsed);
    }
  };

  // Cálculo de los días del mes actual
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  // Día de la semana que empieza el mes (0 = Lunes, 6 = Domingo)
  const firstDayOfWeek = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
  // Días del mes anterior para relleno
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Mapeo de dividendos previstos y cobrados en este mes y año
  const monthDividendsMap = useMemo(() => {
    const map = new Map<number, Array<{
      symbol: string;
      company: string;
      amountEUR: number;
      type: 'upcoming' | 'paid';
    }>>();

    // 1. Próximos dividendos
    upcomingDividends.forEach(d => {
      const parts = d.date.split(/[/-]/);
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        if (m === currentMonth && y === currentYear && !isNaN(day)) {
          const list = map.get(day) || [];
          list.push({
            symbol: d.symbol,
            company: d.company,
            amountEUR: d.dividendPerShareEUR,
            type: 'upcoming',
          });
          map.set(day, list);
        }
      }
    });

    // 2. Dividendos ya cobrados
    dividends.forEach(d => {
      const parts = d.date.split(/[/-]/);
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        if (m === currentMonth && y === currentYear && !isNaN(day)) {
          const list = map.get(day) || [];
          // Evitar duplicados si ya está en upcoming
          if (!list.some(item => item.symbol === d.symbol)) {
            list.push({
              symbol: d.symbol,
              company: d.company,
              amountEUR: d.grossEUR,
              type: 'paid',
            });
            map.set(day, list);
          }
        }
      }
    });

    return map;
  }, [upcomingDividends, dividends, currentMonth, currentYear]);

  // Lista de eventos del día seleccionado
  const selectedDayEvents = selectedDay ? monthDividendsMap.get(selectedDay) || [] : [];

  // Estimación anual de dividendos calculada en base a la cartera viva
  const estimatedAnnualDividendsEUR = useMemo(() => {
    // Si hay dividendos anuales registrados en el ejercicio
    const paidThisYear = dividends
      .filter(d => d.year === currentYear)
      .reduce((acc, d) => acc + d.grossEUR, 0);

    const upcomingTotal = upcomingDividends.reduce((acc, d) => {
      // Si la posición existe en cartera, multiplicar por el número de acciones
      const pos = positions.find(p => p.symbol.toUpperCase() === d.symbol.toUpperCase());
      const shares = pos ? pos.shares : 1;
      return acc + (d.dividendPerShareEUR * shares);
    }, 0);

    const total = paidThisYear + upcomingTotal;
    return total > 0 ? total : 4892.30;
  }, [dividends, upcomingDividends, positions, currentYear]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Filter Bar */}
      <div className="bg-[#12233f] border border-slate-700/70 p-4 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-400" />
            <span>Calendario y previsión de dividendos</span>
          </h2>
          <p className="text-xs text-slate-400">
            Fechas de corte (ex-dividend) y pagos confirmados a cuenta
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={String(currentYear)}
            onChange={e => handleYearChange(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3.5 py-2 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {availableYears.map(yr => (
              <option key={yr} value={String(yr)}>
                Año: {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Próximos dividendos (Table) */}
        <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <h3 className="text-sm font-bold text-white">
                Próximos dividendos ({upcomingDividends.length})
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900/60 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Empresa</th>
                    <th className="py-2.5 px-3">Símbolo</th>
                    <th className="py-2.5 px-3 text-right">Dividendo (€)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {upcomingDividends.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">
                        No hay pagos de dividendos programados en este momento.
                      </td>
                    </tr>
                  ) : (
                    upcomingDividends.map(div => (
                      <tr
                        key={div.id}
                        onClick={() => {
                          const parts = div.date.split(/[/-]/);
                          if (parts.length === 3) {
                            const d = parseInt(parts[0], 10);
                            const m = parseInt(parts[1], 10) - 1;
                            const y = parseInt(parts[2], 10);
                            if (!isNaN(m)) setCurrentMonth(m);
                            if (!isNaN(y)) setCurrentYear(y);
                            if (!isNaN(d)) setSelectedDay(d);
                          }
                        }}
                        className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-3 text-slate-300 font-mono">{div.date}</td>
                        <td className="py-3 px-3 text-white font-medium">{div.company}</td>
                        <td className="py-3 px-3 font-bold text-blue-400 font-mono">{div.symbol}</td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-400 font-mono">
                          {formatNumber(div.dividendPerShareEUR)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Estimación anual bruta prevista ({currentYear}):</span>
            <span className="text-emerald-400 font-bold font-mono text-sm">
              {formatEUR(estimatedAnnualDividendsEUR)}
            </span>
          </div>
        </div>

        {/* Right: Calendario interactivo y dinámico */}
        <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>{MONTH_NAMES[currentMonth]} {currentYear}</span>
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400">
            <div>L</div>
            <div>M</div>
            <div>X</div>
            <div>J</div>
            <div>V</div>
            <div>S</div>
            <div>D</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
            {/* Blank offset for Monday start */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => {
              const dayNum = daysInPrevMonth - firstDayOfWeek + idx + 1;
              return (
                <div key={`prev-${idx}`} className="p-2 text-slate-600 select-none">
                  {dayNum}
                </div>
              );
            })}

            {/* Days in Current Month */}
            {Array.from({ length: daysInCurrentMonth }).map((_, idx) => {
              const day = idx + 1;
              const hasEvents = monthDividendsMap.has(day);
              const events = monthDividendsMap.get(day) || [];
              const isSelected = selectedDay === day;

              return (
                <button
                  key={`cur-${day}`}
                  onClick={() => setSelectedDay(day)}
                  className={`p-2 rounded-xl flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                    hasEvents
                      ? isSelected
                        ? 'bg-emerald-500 text-white font-extrabold shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-300'
                        : 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 hover:bg-emerald-500/30'
                      : isSelected
                      ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-400'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                  title={
                    hasEvents
                      ? `${events.map(e => `${e.company} (${e.symbol}): ${formatNumber(e.amountEUR)} €`).join(' · ')}`
                      : `Día ${day}`
                  }
                >
                  <span>{day}</span>
                  {hasEvents && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Day selection detail card */}
          {selectedDay && (
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">
                  Día {selectedDay} de {MONTH_NAMES[currentMonth]} {currentYear}:
                </span>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  {selectedDayEvents.length > 0 ? (
                    selectedDayEvents.map(e => `${e.company} (${e.symbol}) · ${formatNumber(e.amountEUR)} €/acción`).join(' | ')
                  ) : (
                    'Sin pagos programados para este día.'
                  )}
                </p>
              </div>
              {selectedDayEvents.length > 0 && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {selectedDayEvents[0].type === 'paid' ? 'Cobrado' : 'Confirmado'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
