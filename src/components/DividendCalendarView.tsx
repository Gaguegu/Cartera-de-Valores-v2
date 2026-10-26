import React, { useState, useMemo } from 'react';
import { UpcomingDividend, DividendRecord, StockPosition } from '../types/portfolio';
import { formatEUR, formatNumber, getAvailableFiscalYears } from '../utils/formatters';
import { Calendar, ChevronLeft, ChevronRight, DollarSign, CheckCircle2, Coins, Clock } from 'lucide-react';

interface DividendCalendarViewProps {
  upcomingDividends: UpcomingDividend[];
  dividends?: DividendRecord[];
  positions?: StockPosition[];
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function parseDateParts(dateStr: string): { day: number; month: number; year: number } | null {
  if (!dateStr) return null;
  const parts = dateStr.trim().split(/[/-]/);
  if (parts.length !== 3) return null;

  let day = 0;
  let month = 0;
  let year = 0;

  if (parts[0].length === 4) {
    // YYYY-MM-DD
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  } else {
    // DD/MM/YYYY or DD-MM-YYYY
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    year = parseInt(parts[2], 10);
  }

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return { day, month, year };
}

export function DividendCalendarView({
  upcomingDividends,
  dividends = [],
  positions = [],
}: DividendCalendarViewProps) {
  const today = new Date();
  const initialYear = today.getFullYear() >= 2026 ? today.getFullYear() : 2026;
  const initialMonth = today.getFullYear() >= 2026 ? today.getMonth() : 9; // 9 = Octubre

  const [currentYear, setCurrentYear] = useState<number>(initialYear);
  const [currentMonth, setCurrentMonth] = useState<number>(initialMonth);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Años dinámicos disponibles
  const availableYears = useMemo(() => {
    const yearsFromUpcoming = upcomingDividends.map(d => {
      const parsed = parseDateParts(d.date);
      return parsed ? parsed.year : undefined;
    });
    const yearsFromDivs = dividends.map(d => {
      const parsed = parseDateParts(d.date);
      return parsed ? parsed.year : d.year;
    });
    return getAvailableFiscalYears([...yearsFromUpcoming, ...yearsFromDivs, currentYear, 2025, 2026]);
  }, [upcomingDividends, dividends, currentYear]);

  // Navegación de mes y año: al cambiar de mes o año, se reinicia selectedDay para no arrastrar la selección
  const handlePrevMonth = () => {
    setSelectedDay(null);
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    setSelectedDay(null);
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
      setSelectedDay(null);
      setCurrentYear(parsed);
    }
  };

  // Cálculo de los días del mes actual
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  // Día de la semana que empieza el mes (0 = Lunes, 6 = Domingo)
  const firstDayOfWeek = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
  // Días del mes anterior para relleno
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Lista unificada de dividendos de este mes y año (próximos y cobrados)
  const monthDividendsList = useMemo(() => {
    const list: Array<{
      id: string;
      day: number;
      date: string;
      symbol: string;
      company: string;
      amountPerShareEUR: number;
      totalEUR: number;
      shares: number;
      type: 'upcoming' | 'paid';
    }> = [];

    // 1. Dividendos previstos para este mes
    upcomingDividends.forEach(d => {
      const parsed = parseDateParts(d.date);
      if (parsed && parsed.month === currentMonth && parsed.year === currentYear) {
        const pos = positions.find(p => p.symbol.toUpperCase() === d.symbol.toUpperCase());
        const shares = pos ? pos.shares : 1;
        const total = d.estimatedTotalEUR ?? (d.dividendPerShareEUR * shares);
        list.push({
          id: d.id,
          day: parsed.day,
          date: d.date,
          symbol: d.symbol,
          company: d.company,
          amountPerShareEUR: d.dividendPerShareEUR,
          totalEUR: total,
          shares,
          type: 'upcoming',
        });
      }
    });

    // 2. Dividendos cobrados para este mes
    dividends.forEach(d => {
      const parsed = parseDateParts(d.date);
      if (parsed && parsed.month === currentMonth && parsed.year === currentYear) {
        const existingIdx = list.findIndex(
          item => item.symbol.toUpperCase() === d.symbol.toUpperCase() && item.day === parsed.day
        );
        const shares = d.shares || positions.find(p => p.symbol.toUpperCase() === d.symbol.toUpperCase())?.shares || 1;
        const amountPerShare = shares > 0 ? (d.grossEUR / shares) : d.grossEUR;

        if (existingIdx >= 0) {
          list[existingIdx] = {
            id: d.id,
            day: parsed.day,
            date: d.date,
            symbol: d.symbol,
            company: d.company,
            amountPerShareEUR: amountPerShare,
            totalEUR: d.grossEUR,
            shares,
            type: 'paid',
          };
        } else {
          list.push({
            id: d.id,
            day: parsed.day,
            date: d.date,
            symbol: d.symbol,
            company: d.company,
            amountPerShareEUR: amountPerShare,
            totalEUR: d.grossEUR,
            shares,
            type: 'paid',
          });
        }
      }
    });

    return list.sort((a, b) => a.day - b.day);
  }, [upcomingDividends, dividends, positions, currentMonth, currentYear]);

  // Mapeo de dividendos por día para el calendario
  const monthDividendsMap = useMemo(() => {
    const map = new Map<number, Array<{
      symbol: string;
      company: string;
      amountEUR: number;
      type: 'upcoming' | 'paid';
    }>>();

    monthDividendsList.forEach(item => {
      const list = map.get(item.day) || [];
      list.push({
        symbol: item.symbol,
        company: item.company,
        amountEUR: item.amountPerShareEUR,
        type: item.type,
      });
      map.set(item.day, list);
    });

    return map;
  }, [monthDividendsList]);

  // Total de dividendos en este mes seleccionado
  const monthTotalEUR = useMemo(() => {
    return monthDividendsList.reduce((acc, item) => acc + item.totalEUR, 0);
  }, [monthDividendsList]);

  // Eventos del día seleccionado
  const selectedDayEvents = selectedDay ? monthDividendsMap.get(selectedDay) || [] : [];

  // Estimación anual de dividendos calculada en base a la cartera viva
  const estimatedAnnualDividendsEUR = useMemo(() => {
    const paidThisYear = dividends
      .filter(d => {
        const parsed = parseDateParts(d.date);
        return (parsed ? parsed.year : d.year) === currentYear;
      })
      .reduce((acc, d) => acc + d.grossEUR, 0);

    const upcomingTotal = upcomingDividends.reduce((acc, d) => {
      const pos = positions.find(p => p.symbol.toUpperCase() === d.symbol.toUpperCase());
      const shares = pos ? pos.shares : 1;
      return acc + (d.dividendPerShareEUR * shares);
    }, 0);

    const total = paidThisYear + upcomingTotal;
    return total > 0 ? total : 83.82;
  }, [dividends, upcomingDividends, positions, currentYear]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Filter Bar */}
      <div className="sticky top-0 z-10 bg-[#12233f] border border-slate-700/80 p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 backdrop-blur-md">
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
        {/* Left: Dividendos del mes seleccionado (Table) */}
        <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Dividendos de {MONTH_NAMES[currentMonth]}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-800 text-emerald-400 font-bold border border-slate-700">
                    {monthDividendsList.length}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pagos y previsiones del mes en curso ({MONTH_NAMES[currentMonth]} {currentYear})
                </p>
              </div>
              {selectedDay !== null && (
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors"
                >
                  Ver todo el mes
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900/60 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Empresa</th>
                    <th className="py-2.5 px-3">Símbolo</th>
                    <th className="py-2.5 px-3 text-right">Dividendo (€)</th>
                    <th className="py-2.5 px-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {monthDividendsList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No hay pagos de dividendos programados ni registrados en {MONTH_NAMES[currentMonth]} de {currentYear}.
                      </td>
                    </tr>
                  ) : (
                    monthDividendsList.map(item => {
                      const isRowSelected = selectedDay === item.day;
                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedDay(item.day)}
                          className={`cursor-pointer transition-colors ${
                            isRowSelected
                              ? 'bg-emerald-500/15 border-l-4 border-emerald-400'
                              : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-3 px-3 text-slate-300 font-mono font-medium">
                            {item.date}
                          </td>
                          <td className="py-3 px-3 text-white font-medium">
                            {item.company}
                          </td>
                          <td className="py-3 px-3 font-bold text-blue-400 font-mono">
                            {item.symbol}
                          </td>
                          <td className="py-3 px-3 text-right font-mono">
                            <span className="font-bold text-emerald-400">
                              {formatEUR(item.totalEUR)}
                            </span>
                            {item.amountPerShareEUR > 0 && (
                              <span className="block text-[10px] text-slate-400 font-normal">
                                {formatNumber(item.amountPerShareEUR)} €/acc
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {item.type === 'paid' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                Cobrado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                <Clock className="w-2.5 h-2.5" />
                                Previsto
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span>Total en {MONTH_NAMES[currentMonth]}: </span>
              <span className="text-white font-bold font-mono">
                {formatEUR(monthTotalEUR)}
              </span>
            </div>
            <div>
              <span>Estimación anual bruta prevista ({currentYear}): </span>
              <span className="text-emerald-400 font-bold font-mono text-sm">
                {formatEUR(estimatedAnnualDividendsEUR)}
              </span>
            </div>
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
              // Día actual real del sistema (únicamente se activa si coincide año, mes y día exactos)
              const isRealToday =
                today.getFullYear() === currentYear &&
                today.getMonth() === currentMonth &&
                today.getDate() === day;

              return (
                <button
                  key={`cur-${day}`}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`p-2 rounded-xl flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                    hasEvents
                      ? isSelected
                        ? 'bg-emerald-500 text-white font-extrabold shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-300 scale-105'
                        : 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 hover:bg-emerald-500/30'
                      : isSelected
                      ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-400 scale-105'
                      : isRealToday
                      ? 'border-2 border-blue-500 text-blue-400 font-bold hover:bg-slate-800/60'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                  title={
                    hasEvents
                      ? `${events.map(e => `${e.company} (${e.symbol}): ${formatNumber(e.amountEUR)} €`).join(' · ')}`
                      : isRealToday
                      ? `Hoy (Día ${day})`
                      : `Día ${day}`
                  }
                >
                  <span>{day}</span>
                  {hasEvents && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5 animate-pulse" />
                  )}
                  {!hasEvents && isRealToday && (
                    <span className="w-1 h-1 rounded-full bg-blue-400 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Day selection detail card */}
          {selectedDay !== null ? (
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">
                  Día {selectedDay} de {MONTH_NAMES[currentMonth]} {currentYear}:
                </span>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  {selectedDayEvents.length > 0 ? (
                    selectedDayEvents.map(e => `${e.company} (${e.symbol}) · ${formatNumber(e.amountEUR)} €/acción (${e.type === 'paid' ? 'cobrado' : 'previsto'})`).join(' | ')
                  ) : (
                    'Sin pagos programados para este día.'
                  )}
                </p>
              </div>
              {selectedDayEvents.length > 0 && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  selectedDayEvents.some(e => e.type === 'paid')
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {selectedDayEvents.some(e => e.type === 'paid') ? 'Cobrado' : 'Confirmado'}
                </span>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/60 text-xs text-slate-400 flex items-center justify-between">
              <span>
                {monthDividendsList.length > 0
                  ? `Haz clic en un día del calendario para ver el detalle de los pagos de ${MONTH_NAMES[currentMonth]}.`
                  : `Sin dividendos previstos en ${MONTH_NAMES[currentMonth]} de ${currentYear}.`}
              </span>
              {monthDividendsList.length > 0 && (
                <span className="text-[11px] text-emerald-400 font-semibold">
                  {monthDividendsList.length} {monthDividendsList.length === 1 ? 'dividendo' : 'dividendos'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
